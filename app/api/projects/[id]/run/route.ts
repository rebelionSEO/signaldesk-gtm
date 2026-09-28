import { startCrawl, crawlBatch, crawlCanContinue, type CrawlState } from '@/lib/gtm/website-crawl';
import { coverageBlockers } from '@/lib/gtm/website-coverage';
import {promptVersion} from '@/lib/gtm/operating';
import { z } from 'zod';
import { identity, database, body, failure, owned, publicStudy, ApiError, config } from '@/lib/gtm/server';
import { plan,research, strategize, challenge,review,reviewWebsiteBatch } from '@/lib/gtm/ai';
export async function POST(req: Request, ctx: {
    params: Promise<{
        id: string;
    }>;
}) { let token: string | undefined; let id: string | undefined; const started=Date.now();let phase='validation';let signal='Stage completed';let passed=false; try {
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
    if (stage === 'coverage-blocked' && !input.restart) throw new ApiError(409, 'Website review is incomplete. Inspect the coverage gaps and start a new run after they are resolved.');
    if (stage === 'complete' && !input.restart)
        throw new ApiError(409, 'This run is complete. Choose New run to research again.');
    token = crypto.randomUUID();
    const lease = await database().prepare('UPDATE studies SET lease = ?, busy_until = ? WHERE id = ? AND owner = ? AND revision = ? AND busy_until <= ?').bind(token, Date.now() + 300000, id, owner, input.revision, Date.now()).run();
    if (!lease.meta.changes)
        throw new ApiError(409, 'Another request started this study. Please reload.');
    await database().prepare('DELETE FROM run_calls WHERE created_at <= ?').bind(Date.now() - 7 * 86400000).run();
    const quota = await database().prepare('INSERT INTO run_calls (id, owner, created_at) SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM run_calls WHERE owner = ? AND created_at > ?) < 100').bind(token, owner, Date.now(), owner, Date.now() - 86400000).run();
    if (!quota.meta.changes)
        throw new ApiError(429, 'Daily research limit reached (100 stages). Try again tomorrow.');
    const brief = JSON.parse(row.brief);const operations=JSON.parse(row.operations);let planner=row.planner;phase=stage;
    let nextStage: string;
    let researchData = row.research;
    let candidate = row.candidate;
    let report = row.report;
    if(stage==='draft' || stage==='crawling' || stage==='page-review') {
        const crawl: CrawlState = stage==='draft' ? startCrawl(brief.website) : JSON.parse(researchData!).crawl;
        if(stage==='page-review') await reviewWebsiteBatch(crawl);
        else await crawlBatch(crawl);
        const blockers=coverageBlockers(crawl.coverage);
        nextStage=crawl.pending.length?'page-review':crawlCanContinue(crawl)?'crawling':blockers.length?'coverage-blocked':'mapped';
        researchData=JSON.stringify({crawl}); candidate=null; planner=null;
        const previous=JSON.parse(report);
        report=JSON.stringify({...previous, websiteCoverage:crawl.coverage,
          marketContext:undefined, brandProfile:undefined, assumptions:undefined, benchmarkProfile:undefined, decisionBrief:undefined, opportunities:[], commercialPlan:undefined, operatingPlan:undefined, economics:undefined,
          summary:'Website review in progress. Recommendations are withheld until required pages are reviewed.',
          mode:'manual', warnings:[...blockers,...crawl.coverage.limitations].slice(0,30)});
        signal=`${crawl.coverage.pages.filter(p=>p.state==='Reviewed').length} pages reviewed; ${crawl.coverage.pages.filter(p=>p.required&&p.state!=='Reviewed').length} required pages outstanding.`;
    }
    else if(stage==='mapped') {
        const coverage=JSON.parse(researchData!).crawl.coverage;
        const blockers=coverageBlockers(coverage); if(blockers.length) throw new ApiError(409,blockers.join(' '));
        planner=JSON.stringify(await plan(brief,operations,coverage)); nextStage='scoped';
    }
    else if (stage === 'scoped') {
        const crawl: CrawlState | undefined = researchData ? JSON.parse(researchData).crawl : undefined;
        if(!crawl) throw new ApiError(409,'This older run has no website inventory. Start a new run.');
        const findings=await research(brief, JSON.parse(row.report).evidence,planner?JSON.parse(planner):undefined,crawl.coverage);
        candidate=null;
        if(coverageBlockers(findings.websiteCoverage).length){
            crawl.coverage=findings.websiteCoverage;
            researchData=JSON.stringify({crawl}); nextStage='crawling';
            report=JSON.stringify({...JSON.parse(report),websiteCoverage:crawl.coverage});
            signal='Search found additional company pages. Returning to website review before strategy.';
        } else { researchData=JSON.stringify(findings); nextStage='researched'; }

    }
    else if (stage === 'researched') {
        if (!researchData)
            throw new ApiError(409, 'Research notes are missing. Start a new run.');
        candidate = JSON.stringify(await strategize(brief, JSON.parse(researchData),planner?JSON.parse(planner):undefined,operations));
        nextStage = 'proposed';
    }
    else if(stage==='proposed'){if(!researchData||!candidate)throw new ApiError(409,'Research or plan is missing. Start a new run.');candidate=JSON.stringify(await challenge(brief,JSON.parse(researchData),JSON.parse(candidate),operations));nextStage='planned';}
    else if (stage === 'planned') {
        if (!researchData || !candidate)
            throw new ApiError(409, 'The plan is missing. Start a new run.');
        report = JSON.stringify(await review(brief, JSON.parse(researchData), JSON.parse(candidate),operations));
        nextStage = 'complete';
    }
    else
        throw new ApiError(409, 'Unknown research stage. Start a new run.');
    const saved = await database().prepare('UPDATE studies SET planner = ?, research = ?, candidate = ?, report = ?, stage = ?, revision = revision + 1, lease = NULL, busy_until = 0, updated_at = ? WHERE id = ? AND owner = ? AND lease = ?').bind(planner,researchData, candidate, report, nextStage, new Date().toISOString(), id, owner, token).run();
    if (!saved.meta.changes)
        throw new ApiError(409, 'This run was superseded. Reload the saved study.');
    passed=true; return Response.json(publicStudy(await owned(id, owner)));
}
catch (e) {
    signal=e instanceof ApiError?e.message:'Stage failed validation';return failure(e);
}
finally {
    if (token && id) {
        try {
            await database().prepare("UPDATE studies SET trace = json_insert(CASE WHEN json_array_length(trace) >= 500 THEN json_remove(trace, '$[0]') ELSE trace END, '$[#]', json(?)), lease = CASE WHEN lease = ? THEN NULL ELSE lease END, busy_until = CASE WHEN lease = ? THEN 0 ELSE busy_until END WHERE id = ?").bind(JSON.stringify({phase,status:passed?'passed':'failed',durationMs:Date.now()-started,at:new Date().toISOString(),promptVersion,signal}),token,token,id).run();
        }
        catch { }
    }
} }
