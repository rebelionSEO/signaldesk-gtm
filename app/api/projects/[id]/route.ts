import { z } from 'zod';
import { reportSchema, referenceErrors, evidenceWarnings } from '@/lib/gtm/validation';
import { identity, database, body, failure, owned, publicStudy, ApiError } from '@/lib/gtm/server';
type Context = {
    params: Promise<{
        id: string;
    }>;
};
export async function GET(_req: Request, ctx: Context) { try {
    return Response.json(publicStudy(await owned((await ctx.params).id, await identity())), { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
export async function PATCH(req: Request, ctx: Context) { try {
    const owner = await identity(req);
    const id = (await ctx.params).id;
    const data = z.object({ revision: z.number().int().nonnegative(), report: reportSchema }).strict().parse(await body(req));
    const row = await owned(id, owner);
    if (row.busy_until > Date.now())
        throw new ApiError(409, 'Research is running. Wait before editing.');
    const errors = referenceErrors(data.report);
    if (errors.length)
        throw new ApiError(400, errors.join('; '));
    const report = { ...data.report, mode: 'manual', warnings: ['Edited by the study owner. Source summaries require human verification.', ...evidenceWarnings(data.report)] };
    const result = await database().prepare('UPDATE studies SET brief = ?, report = ?, revision = revision + 1, stage = ?, research = NULL, candidate = NULL, planner = NULL, updated_at = ? WHERE id = ? AND owner = ? AND revision = ? AND busy_until <= ?').bind(JSON.stringify(report.brief), JSON.stringify(report), 'draft', new Date().toISOString(), id, owner, data.revision, Date.now()).run();
    if (!result.meta.changes)
        throw new ApiError(409, 'This study changed in another window. Reload it before saving.');
    return Response.json(publicStudy(await owned(id, owner)));
}
catch (e) {
    return failure(e);
} }
