import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { reportSchema } from '@/lib/gtm/validation';
import { operationsSchema, plannerSchema, traceSchema } from '@/lib/gtm/operating';
export class ApiError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export function database() { if (!env.DB)
    throw new ApiError(503, 'Study storage is unavailable. Your unsaved input is still on screen.'); return env.DB; }
export async function identity(request?: Request) { if (request && request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin)
        throw new ApiError(403, 'Cross-origin writes are not allowed.');
} const user = await getChatGPTUser(); if (!user)
    throw new ApiError(401, 'Sign in to save or run research.'); return user.userId; }
export function failure(error: unknown) { if (error instanceof ApiError)
    return Response.json({ error: error.message }, { status: error.status }); if (error && typeof error === 'object' && 'issues' in error)
    return Response.json({ error: 'Some fields are invalid. Check URLs, required text, and field lengths.' }, { status: 400 }); console.error('Signaldesk request failed', error instanceof Error ? error.name : 'UnknownError'); return Response.json({ error: 'The request could not finish. Your existing study has been preserved. Please try again.' }, { status: 500 }); }
export async function body(request: Request) { if (Number(request.headers.get('content-length') ?? 0) > 150000)
    throw new ApiError(413, 'This study is too large. Limit the evidence to 30 concise records.'); const raw = await request.text(); if (raw.length > 150000)
    throw new ApiError(413, 'This study is too large.'); try {
    return JSON.parse(raw);
}
catch {
    throw new ApiError(400, 'Invalid request data.');
} }
export type StudyRow = {
    id: string; planner:string|null; operations:string; trace:string;
    owner: string;
    brief: string;
    report: string;
    research: string | null;
    candidate: string | null;
    stage: string;
    revision: number;
    lease: string | null;
    busy_until: number;
    created_at: string;
    updated_at: string;
};
export async function owned(id: string, owner: string) { const row = await database().prepare('SELECT * FROM studies WHERE id = ? AND owner = ?').bind(id, owner).first<StudyRow>(); if (!row)
    throw new ApiError(404, 'Study not found.'); return row; }
export function publicStudy(row: StudyRow) { return {planner:row.planner?plannerSchema.parse(JSON.parse(row.planner)):null,operations:operationsSchema.parse(JSON.parse(row.operations||'{"metrics":[],"tasks":[],"outcomes":[]}')),trace:traceSchema.parse(JSON.parse(row.trace||'[]')), id: row.id, report: reportSchema.parse(JSON.parse(row.report)), stage: row.stage, revision: row.revision, busy: row.busy_until > Date.now(), updatedAt: row.updated_at }; }
export function config() { const e = env as unknown as Record<string, string | undefined>; return { key: e.OPENAI_API_KEY || process.env.OPENAI_API_KEY, model: e.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini' }; }
