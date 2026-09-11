import { z } from 'zod';
import { briefSchema } from '@/lib/gtm/validation';
import { example } from '@/lib/gtm/example';
import { identity, database, body, failure, publicStudy, owned } from '@/lib/gtm/server';
export async function GET() { try {
    const owner = await identity();
    const { results } = await database().prepare('SELECT id, brief, stage, updated_at FROM studies WHERE owner = ? ORDER BY updated_at DESC LIMIT 100').bind(owner).all<{
        id: string;
        brief: string;
        stage: string;
        updated_at: string;
    }>();
    return Response.json({ studies: results.map(r => ({ ...r, brief: JSON.parse(r.brief) })) }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
export async function POST(req: Request) { try {
    const owner = await identity(req);
    const data = z.object({ id: z.string().uuid(), brief: briefSchema, example: z.boolean().optional() }).strict().parse(await body(req));
    const now = new Date().toISOString();
    const report = data.example ? { ...example, generatedAt: now } : { brief: data.brief, summary: 'Research brief ready. Add evidence or run live research.', evidence: [], opportunities: [], unknowns: ['Which customer problems are supported by public evidence?'], generatedAt: now, mode: 'manual', warnings: ['No evidence yet. Add sources before proposing experiments.'] };
    await database().prepare('INSERT INTO studies (id, owner, brief, report, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING').bind(data.id, owner, JSON.stringify(report.brief), JSON.stringify(report), data.example ? 'complete' : 'draft', now, now).run();
    return Response.json(publicStudy(await owned(data.id, owner)), { status: 201 });
}
catch (e) {
    return failure(e);
} }
