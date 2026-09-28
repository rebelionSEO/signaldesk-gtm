import { startCrawl, crawlBatch, crawlCanContinue, type CrawlState } from '@/lib/gtm/website-crawl';
import { initialSupervisor, supervisorSchema, consumeRevision, nextReviewStage, auditFeedback, mergeResearch } from '@/lib/gtm/supervisor';
import type { Research } from '@/lib/gtm/ai';
import { reserveModelCall, ModelBudgetError } from '@/lib/gtm/model-budget';
import { env } from 'cloudflare:workers';
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
    const savedResearch=researchData?JSON.parse(researchData):{};
    let findings:Research|undefined=savedResearch.findings??(savedResearch.notes?savedResearch:undefined);
    let crawl:CrawlState|undefined=savedResearch.crawl??findings?.crawl;
    let supervisor=stage==='draft'?initialSupervisor():supervisorSchema.parse(savedResearch.supervisor??initialSupervisor());
    const guard=async(requestBody:string)=>{
        const request=JSON.parse(requestBody);
        await reserveModelCall(database(),{studyId:id!,lease:token!,model:request.model,requestBytes:new TextEncoder().encode(requestBody).length,maxOutputTokens:request.max_output_tokens,maxToolCalls:request.max_tool_calls??0}, {...process.env,...env} as unknown as Record<string,string|undefined>);
    };
    if(stage==='draft'){findings=undefined;crawl=undefined;supervisor=initialSupervisor();}
    if(stage==='research-revision'||stage==='creative-revision'){
        try{supervisor=consumeRevision(supervisor,stage);}catch{
            const stopped=await database().prepare('UPDATE studies SET stage = ?, revision = revision + 1, lease = NULL, busy_until = 0 WHERE id = ? AND owner = ? AND lease = ?').bind('complete',id,owner,token).run();
            if(!stopped.meta.changes)throw new ApiError(409,'Run changed. Reload the study.');
            signal='Revision limit reached. Only previously audited content is retained.';passed=true;
            return Response.json(publicStudy(await owned(id,owner)));
        }
        // Persist attempts BEFORE paid work, so failed requests cannot reset retry limits.
        researchData=JSON.stringify({crawl,findings,supervisor});
        const checkpoint=await database().prepare('UPDATE studies SET research = ? WHERE id = ? AND owner = ? AND lease = ?').bind(researchData,id,owner,token).run();
        if(!checkpoint.meta.changes)throw new ApiError(409,'Run changed before revision.');
    }
    if(stage==='draft' || stage==='crawling' || stage==='page-review') {
        crawl = stage==='draft' ? startCrawl(brief.website) : crawl;
        if(!crawl)throw new ApiError(409,'Website checkpoint is missing. Start a new run.');
        if(stage==='page-review') await reviewWebsiteBatch(crawl,guard);
        else await crawlBatch(crawl);
        const blockers=coverageBlockers(crawl.coverage);
        nextStage=crawl.pending.length?'page-review':crawlCanContinue(crawl)?'crawling':blockers.length?'coverage-blocked':findings?'researched':'mapped';
        if(findings)findings={...findings,websiteCoverage:crawl.coverage};
        candidate=null; if(!findings)planner=null;
        const previous=JSON.parse(report);
        report=JSON.stringify({...previous, websiteCoverage:crawl.coverage,
          marketContext:undefined, brandProfile:undefined, assumptions:undefined, benchmarkProfile:undefined, decisionBrief:undefined, opportunities:[], commercialPlan:undefined, operatingPlan:undefined, economics:undefined,
          summary:'Website review in progress. Recommendations are withheld until required pages are reviewed.',
          mode:'manual', warnings:[...blockers,...crawl.coverage.limitations].slice(0,30)});
        signal=`${crawl.coverage.pages.filter(p=>p.state==='Reviewed').length} pages reviewed; ${crawl.coverage.pages.filter(p=>p.required&&p.state!=='Reviewed').length} required pages outstanding.`;
    }
    else if(stage==='mapped') {
        const coverage=crawl?.coverage; if(!coverage)throw new ApiError(409,'Website inventory missing.');
        const blockers=coverageBlockers(coverage); if(blockers.length) throw new ApiError(409,blockers.join(' '));
        planner=JSON.stringify(await plan(brief,operations,coverage,guard)); nextStage='scoped';
    }
    else if (stage === 'scoped' || stage === 'research-revision') {
        if(!crawl) throw new ApiError(409,'This older run has no website checkpoint. Start a new run.');
        const previous=findings;
        const updated=await research(brief,stage==='research-revision'?{questions:supervisor.feedback,previousNotes:previous?.notes}:JSON.parse(row.report).evidence,planner?JSON.parse(planner):undefined,crawl.coverage,guard,stage==='research-revision');
        findings=mergeResearch(previous,updated);
        crawl.coverage=findings.websiteCoverage;
        candidate=null;
        if(coverageBlockers(findings.websiteCoverage).length){
            nextStage='crawling';
            report=JSON.stringify({...JSON.parse(report),websiteCoverage:crawl.coverage,opportunities:[],decisionBrief:undefined,commercialPlan:undefined,operatingPlan:undefined,economics:undefined});
            signal='New company pages need review. Saved research and planner are retained.';
        } else nextStage='researched';
    }
    else if (stage === 'researched') {
        if (!findings) throw new ApiError(409, 'Research notes are missing. Start a new run.');
        candidate = JSON.stringify(await strategize(brief,{...findings,supervisor},planner?JSON.parse(planner):undefined,operations,guard));
        nextStage = 'proposed';
    }
    else if(stage==='proposed'||stage==='creative-revision'){
        if(!findings||!candidate)throw new ApiError(409,'Research or plan is missing. Start a new run.');
        const revised=await challenge(brief,{...findings,supervisor},JSON.parse(candidate),operations,guard);
        // Identical retries cannot earn another call merely by returning unchanged work.
        if(stage==='creative-revision'&&JSON.stringify(revised)===candidate){
            nextStage='complete';signal='Revision made no change. Unresolved ideas remain withheld.';
        }else{candidate=JSON.stringify(revised);nextStage='planned';}
    }
    else if (stage === 'planned') {
        if (!findings || !candidate) throw new ApiError(409, 'The plan is missing. Start a new run.');
        const checked=await review(brief,findings,JSON.parse(candidate),operations,guard);
        supervisor.feedback=auditFeedback(checked.audit);
        supervisor.lastAudit=checked.audit;
        nextStage=nextReviewStage(checked.audit,supervisor);
        report=JSON.stringify(checked.report);
        signal=nextStage==='complete'?'Review finished. Unsupported content withheld.':nextStage==='research-revision'?'Specific public evidence gaps returned for one follow-up.':'Generic concepts returned for targeted revision.';
    }
    else
        throw new ApiError(409, 'Unknown research stage. Start a new run.');
    researchData=JSON.stringify({crawl,findings,supervisor});
    const saved = await database().prepare('UPDATE studies SET planner = ?, research = ?, candidate = ?, report = ?, stage = ?, revision = revision + 1, lease = NULL, busy_until = 0, updated_at = ? WHERE id = ? AND owner = ? AND lease = ?').bind(planner,researchData, candidate, report, nextStage, new Date().toISOString(), id, owner, token).run();
    if (!saved.meta.changes)
        throw new ApiError(409, 'This run was superseded. Reload the saved study.');
    passed=true; return Response.json(publicStudy(await owned(id, owner)));
}
catch (e) {
    const error=e instanceof ModelBudgetError?new ApiError(e.status,e.message):e;
    signal=error instanceof ApiError?error.message:'Stage failed validation';return failure(error);
}
finally {
    if (token && id) {
        try {
            await database().prepare("UPDATE studies SET trace = json_insert(CASE WHEN json_array_length(trace) >= 500 THEN json_remove(trace, '$[0]') ELSE trace END, '$[#]', json(?)), lease = CASE WHEN lease = ? THEN NULL ELSE lease END, busy_until = CASE WHEN lease = ? THEN 0 ELSE busy_until END WHERE id = ?").bind(JSON.stringify({phase,status:passed?'passed':'failed',durationMs:Date.now()-started,at:new Date().toISOString(),promptVersion,signal}),token,token,id).run();
        }
        catch { }
    }
} }
