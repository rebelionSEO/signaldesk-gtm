import { z } from 'zod';
import type { contentSchema } from './validation';

type Candidate = z.infer<typeof contentSchema>;
const decision = z.object({id:z.string(),supported:z.boolean(),reason:z.string().max(1500),failure:z.enum(['none','research','creative','numbers'])}).strict();
export const auditResultSchema = z.object({
  decisionBriefSupported:z.boolean(), operatingPlanSupported:z.boolean(), benchmarkProfileSupported:z.boolean(),
  brandProfileSupported:z.boolean(), commercialPlanSupported:z.boolean(), summarySupported:z.boolean(),
  marketContextSupported:z.boolean(), assumptionsSupported:z.boolean(), unknownsSupported:z.boolean(),
  evidence:z.array(decision), opportunities:z.array(decision),
  researchQuestions:z.array(z.string().min(1).max(1000)).max(5),
}).strict();
export type AuditResult = z.infer<typeof auditResultSchema>;
export const supervisorSchema = z.object({
  researchRetries:z.number().int().min(0).max(1).default(0),
  creativeRetries:z.number().int().min(0).max(2).default(0),
  feedback:z.array(z.string().max(2000)).max(30).default([]),
  lastAudit:auditResultSchema.optional(),
}).strict();
export type Supervisor = z.infer<typeof supervisorSchema>;
export const initialSupervisor = ():Supervisor => supervisorSchema.parse({});

export function validateAudit(value:unknown, candidate:Candidate):AuditResult {
  const audit=auditResultSchema.parse(value);
  for(const key of ['evidence','opportunities'] as const){
    const expected=new Set(candidate[key].map(item=>item.id));
    const received=audit[key];
    if(expected.size!==candidate[key].length || received.length!==expected.size || new Set(received.map(item=>item.id)).size!==expected.size || received.some(item=>!expected.has(item.id))) throw new Error('Audit must cover every record exactly once');
    if(received.some(item=>item.supported ? item.failure!=='none' : item.failure==='none'||!item.reason.trim())) throw new Error('Audit decision and failure category disagree');
  }
  return audit;
}

export function nextReviewStage(audit:AuditResult, state:Supervisor):'research-revision'|'creative-revision'|'complete' {
  // Only public questions are eligible: missing CRM data is not a reason to repeat web search.
  if(audit.researchQuestions.length && [...audit.evidence,...audit.opportunities].some(x=>!x.supported&&x.failure==='research') && state.researchRetries<1) return 'research-revision';
  if(audit.opportunities.some(x=>!x.supported&&x.failure==='creative') && state.creativeRetries<2) return 'creative-revision';
  return 'complete';
}

export function consumeRevision(state:Supervisor, stage:string):Supervisor {
  const next=structuredClone(state);
  if(stage==='research-revision'){
    if(next.researchRetries>=1) throw new Error('Public research revision limit reached');
    next.researchRetries++;
  }
  if(stage==='creative-revision'){
    if(next.creativeRetries>=2) throw new Error('Creative revision limit reached');
    next.creativeRetries++;
  }
  return next;
}

export function auditFeedback(audit:AuditResult):string[]{
  return [...audit.evidence,...audit.opportunities].filter(x=>!x.supported).map(x=>`${x.id} [${x.failure}]: ${x.reason}`)
    .concat(audit.researchQuestions.map(x=>`Public research question: ${x}`)).slice(0,30).map(item=>item.slice(0,1800));
}

/** Fail closed at record/section boundaries, including prose containing unsupported numbers. */
export function filterAuditedCandidate(candidate:Candidate,audit:AuditResult):Candidate {
  const evidence=candidate.evidence.filter(e=>audit.evidence.find(a=>a.id===e.id)?.supported);
  const ids=new Set(evidence.map(e=>e.id));
  const supported=(refs:string[])=>refs.every(id=>ids.has(id));
  const opportunities=candidate.opportunities.filter(o=>audit.opportunities.find(a=>a.id===o.id)?.supported&&supported([...o.evidenceIds,...o.counterEvidenceIds]));
  const opIds=new Set(opportunities.map(o=>o.id));
  const decision=candidate.decisionBrief;
  const commercial=candidate.commercialPlan;
  const operating=candidate.operatingPlan;
  const market=candidate.marketContext;
  const brand=candidate.brandProfile;
  const benchmark=candidate.benchmarkProfile;
  return {
    ...candidate,evidence,opportunities,economics:undefined,
    summary:audit.summarySupported?candidate.summary:'Evidence reviewed. Unresolved claims and experiments have been withheld.',
    unknowns:audit.unknownsSupported?candidate.unknowns:['Additional verified company data is needed.'],
    decisionBrief:audit.decisionBriefSupported&&decision&&supported(decision.evidenceIds)&&(decision.recommendedExperimentId===null||opIds.has(decision.recommendedExperimentId))?decision:undefined,
    commercialPlan:audit.commercialPlanSupported&&commercial&&commercial.competitivePressures.every(p=>supported(p.evidenceIds))&&commercial.roadmap.every(r=>r.experimentIds.every(id=>opIds.has(id)))?commercial:undefined,
    operatingPlan:audit.operatingPlanSupported&&operating&&supported(operating.decision.evidenceIds)&&operating.channels.every(c=>supported(c.evidenceIds))?operating:undefined,
    marketContext:audit.marketContextSupported&&market&&market.facts.every(f=>supported(f.evidenceIds))?market:undefined,
    brandProfile:audit.brandProfileSupported&&brand&&brand.voiceTraits.every(v=>supported(v.evidenceIds))&&brand.signatureAssets.every(a=>supported(a.evidenceIds))?brand:undefined,
    benchmarkProfile:audit.benchmarkProfileSupported&&benchmark&&benchmark.peers.every(p=>supported(p.evidenceIds))&&benchmark.metrics.every(m=>supported(m.evidenceIds))?benchmark:undefined,
    assumptions:audit.assumptionsSupported&&candidate.assumptions?.every(a=>supported(a.evidenceIds))?candidate.assumptions:undefined,
  };
}

/** Keep paid findings separate from the mutable crawl checkpoint. */
export function mergeResearch<T extends {notes:string;sources:{url:string;title:string}[]}>(previous:T|undefined, updated:T):T {
  if(!previous)return updated;
  const sources=new Map([...previous.sources,...updated.sources].map(source=>[source.url,source]));
  return {...updated,sources:[...sources.values()],notes:`${previous.notes}\nFOLLOW-UP (preserve contradictions):\n${updated.notes}`};
}
