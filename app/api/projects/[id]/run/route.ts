import { z } from 'zod';
import { identity, database, body, failure, owned, publicStudy, ApiError, config } from '@/lib/gtm/server';
import { research, strategize, review } from '@/lib/gtm/ai';
export async function POST(req: Request, ctx: {
    params: Promise<{
        id: string;
    }>;
}) { let token: string | undefined; let id: string | undefined; try {
    const owner = await identity(req);
    id = (await ctx.params).id;
    const input = z.object({ revision: z.number().int().nonnegative(), restart: z.boolean().optional() }).strict().parse(await body(req));
    if (!config().key)
        throw new ApiError(503, 'Live research is not connected yet. Create a brief and add evidence manually, or configure the server-side AI connection.');
    const row = await owned(id, owner);
    if (row.revision !== input.revision)
        throw new ApiError(409, 'The study changed. Reload it before continuing.');
    if (row.busy_until > Date.now())
        throw new ApiError(409, 'A research stage is already running.');
    const stage = input.restart ? 'draft' : row.stage;
    if (stage === 'complete' && !input.restart)
        throw new ApiError(409, 'This run is complete. Choose New run to research again.');
    token = crypto.randomUUID();
    const lease = await database().prepare('UPDATE studies SET lease = ?, busy_until = ? WHERE id = ? AND owner = ? AND revision = ? AND busy_until <= ?').bind(token, Date.now() + 180000, id, owner, input.revision, Date.now()).run();
    if (!lease.meta.changes)
        throw new ApiError(409, 'Another request started this study. Please reload.');
    const quota = await database().prepare('INSERT INTO run_calls (id, owner, created_at) SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM run_calls WHERE owner = ? AND created_at > ?) < 30').bind(token, owner, Date.now(), owner, Date.now() - 86400000).run();
    if (!quota.meta.changes)
        throw new ApiError(429, 'Daily research limit reached (30 AI stages). Try again tomorrow.');
    const brief = JSON.parse(row.brief);
    let nextStage: string;
    let researchData = row.research;
    let candidate = row.candidate;
    let report = row.report;
    if (stage === 'draft') {
        researchData = JSON.stringify(await research(brief, JSON.parse(row.report).evidence));
        candidate = null;
        nextStage = 'researched';
    }
    else if (stage === 'researched') {
        if (!researchData)
            throw new ApiError(409, 'Research notes are missing. Start a new run.');
        candidate = JSON.stringify(await strategize(brief, JSON.parse(researchData)));
        nextStage = 'planned';
    }
    else if (stage === 'planned') {
        if (!researchData || !candidate)
            throw new ApiError(409, 'The plan is missing. Start a new run.');
        report = JSON.stringify(await review(brief, JSON.parse(researchData), JSON.parse(candidate)));
        nextStage = 'complete';
    }
    else
        throw new ApiError(409, 'Unknown research stage. Start a new run.');
    const saved = await database().prepare('UPDATE studies SET research = ?, candidate = ?, report = ?, stage = ?, revision = revision + 1, lease = NULL, busy_until = 0, updated_at = ? WHERE id = ? AND owner = ? AND lease = ?').bind(researchData, candidate, report, nextStage, new Date().toISOString(), id, owner, token).run();
    if (!saved.meta.changes)
        throw new ApiError(409, 'This run was superseded. Reload the saved study.');
    return Response.json(publicStudy(await owned(id, owner)));
}
catch (e) {
    return failure(e);
}
finally {
    if (token && id) {
        try {
            await database().prepare('UPDATE studies SET lease = NULL, busy_until = 0 WHERE id = ? AND lease = ?').bind(id, token).run();
        }
        catch { }
    }
} }
