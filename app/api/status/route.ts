import { config, identity, failure } from '@/lib/gtm/server';
export async function GET() { try {
    await identity();
    return Response.json({ aiConfigured: !!config().key }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
