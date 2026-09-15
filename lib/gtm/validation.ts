import {designSchema,operatingPlanSchema,operatingErrors} from './operating.ts';
import { z } from 'zod';
export function safeUrl(value: string) { try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();
    return u.protocol === 'https:' && !u.username && !u.password && host.includes('.') && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/.test(host) && !host.endsWith('.local') && !/^172\.(1[6-9]|2\d|3[01])\./.test(host);
}
catch {
    return false;
} }
export function canonicalUrl(value: string) { const u = new URL(value); u.hash = ''; for (const key of [...u.searchParams.keys()])
    if (key.startsWith('utm_'))
        u.searchParams.delete(key); return u.toString().replace(/\/$/, ''); }
const text = z.string().trim().min(1).max(4000);
const optionalBriefText = z.string().trim().max(250).optional();
export const briefSchema = z.object({ company: text.max(150), website: z.string().max(2048).refine(safeUrl, 'Use a public HTTPS website.'), audience: text.max(1000), objective: text.max(1500), constraints: z.string().max(2000), industry: optionalBriefText, businessModel: optionalBriefText, gtmMotion: optionalBriefText, geography: optionalBriefText, companyStage: optionalBriefText }).strict();
export const evidenceSchema = z.object({ id: z.string().regex(/^E\d+$/), title: text.max(250), url: z.string().max(2048).refine(safeUrl, 'Use a public HTTPS source.'), summary: text, kind: z.enum(['complaint', 'positive', 'context']), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), limitation: text }).strict();
const factSchema=z.object({label:text.max(120),value:text,status:z.enum(['Public fact','Inference','Assumption','Unknown']),evidenceIds:z.array(z.string()).max(20)}).strict();
const marketContextSchema=z.object({thesis:text,facts:z.array(factSchema).max(20),funnel:z.array(z.object({name:z.enum(['Acquire','Evaluate','Activate','Expand','Retain']),signal:text,state:z.enum(['Known','Hypothesis','Missing data'])}).strict()).length(5)}).strict();
const assumptionSchema=z.object({id:z.string().regex(/^A\d+$/),title:text.max(180),statement:text,confidence:z.enum(['Low','Medium','High']),impact:z.enum(['Low','Medium','High']),evidenceIds:z.array(z.string()).max(20),whyItMatters:text,validation:text}).strict();
const benchmarkProfileSchema=z.object({category:text.max(180),businessModel:text.max(180),gtmMotion:text.max(180),companyStage:text.max(180),geography:text.max(180),peers:z.array(z.object({company:text.max(180),role:z.enum(['Direct competitor','Category leader','Motion leader','Creative reference']),rationale:text,evidenceIds:z.array(z.string()).max(20)}).strict()).max(12),metrics:z.array(z.object({name:text.max(180),definition:text,observedRange:text.nullable(),unit:text.max(80),evidenceIds:z.array(z.string()).max(20),freshness:text.max(180),limitation:text}).strict()).max(12),conventions:z.array(text).max(12),whitespace:z.array(text).max(12)}).strict();
const commercialPlanSchema=z.object({northStar:text.max(180),pipelineOutcome:text,baseline:text.nullable(),target:text.nullable(),attributionWindow:text.max(180),sourceOfTruth:text,pipelineLogic:text,costPrinciple:text,leadingIndicators:z.array(z.object({name:text.max(180),signal:text,source:text}).strict()).min(1).max(8),guardrails:z.array(text).min(1).max(8),competitivePressures:z.array(z.object({id:z.string().regex(/^C\d+$/),attacker:text.max(180),vulnerability:text,likelyMove:text,evidenceIds:z.array(z.string()).max(20),threat:z.enum(['High','Medium','Low']),leadingSignal:text,response:text}).strict()).max(6),defensibility:z.array(z.object({asset:text.max(180),whyHardToCopy:text,proofNeeded:text}).strict()).max(6),roadmap:z.array(z.object({horizon:z.enum(['0–30 days','31–60 days','61–90 days']),objective:text,decisionGate:text,experimentIds:z.array(z.string()).max(10)}).strict()).length(3)}).strict();
export const opportunitySchema = z.object({ design:designSchema.optional(), priority:z.enum(['Now','Next','Later']).optional(),territory:text.max(180).optional(),behavior:text.optional(), id: z.string().regex(/^O\d+$/), title: text.max(250), hypothesis: text, evidenceIds: z.array(z.string()).min(1).max(20), counterEvidenceIds: z.array(z.string()).max(20), stage: z.enum(['Discover', 'Evaluate', 'Activate', 'Retain']), effort: z.enum(['Low', 'Medium', 'High']), action: text, metric: text, validation: text, owner: text.max(150) }).strict();
export const contentSchema = z.object({ commercialPlan:commercialPlanSchema.optional(),operatingPlan:operatingPlanSchema.optional(),marketContext:marketContextSchema.optional(),benchmarkProfile:benchmarkProfileSchema.optional(),assumptions:z.array(assumptionSchema).max(15).optional(), summary: text, evidence: z.array(evidenceSchema).max(30), opportunities: z.array(opportunitySchema).max(7), unknowns: z.array(text).max(15) }).strict();
export const reportSchema = contentSchema.extend({ brief: briefSchema, generatedAt: z.string().datetime(), mode: z.enum(['example', 'live', 'manual']), warnings: z.array(text).max(30) }).strict();
export function referenceErrors(report: z.infer<typeof contentSchema>, allowedUrls?: string[]) {
    const errors: string[] = [];
    const ids = new Set<string>();
    const allowed = allowedUrls ? new Set(allowedUrls.map(canonicalUrl)) : null;
    for (const e of report.evidence) {
        if (ids.has(e.id))
            errors.push(`Duplicate evidence ID ${e.id}`);
        ids.add(e.id);
        if (allowed && !allowed.has(canonicalUrl(e.url)))
            errors.push(`${e.id} uses a source not returned by research`);
        if (e.date && (!Number.isFinite(Date.parse(e.date)) || new Date(e.date).toISOString().slice(0, 10) !== e.date || new Date(e.date) > new Date()))
            errors.push(`${e.id} has an invalid or future date`);
    }
    const opportunityIds = new Set<string>();
    for (const o of report.opportunities) {
        if (opportunityIds.has(o.id))
            errors.push(`Duplicate opportunity ID ${o.id}`);
        opportunityIds.add(o.id);
        for (const id of [...o.evidenceIds, ...o.counterEvidenceIds])
            if (!ids.has(id))
                errors.push(`${o.id} references missing evidence ${id}`);
        if (o.evidenceIds.some(id => o.counterEvidenceIds.includes(id)))
            errors.push(`${o.id} uses the same record as support and counterevidence`);
    }
    for(const item of report.marketContext?.facts??[])for(const id of item.evidenceIds)if(!ids.has(id))errors.push(`Market context references missing evidence ${id}`);
    for(const item of report.assumptions??[])for(const id of item.evidenceIds)if(!ids.has(id))errors.push(`${item.id} references missing evidence ${id}`);
    for(const peer of report.benchmarkProfile?.peers??[])for(const id of peer.evidenceIds)if(!ids.has(id))errors.push(`Benchmark peer ${peer.company} references missing evidence ${id}`);
    for(const metric of report.benchmarkProfile?.metrics??[])for(const id of metric.evidenceIds)if(!ids.has(id))errors.push(`Benchmark metric ${metric.name} references missing evidence ${id}`);
    for(const pressure of report.commercialPlan?.competitivePressures??[])for(const id of pressure.evidenceIds)if(!ids.has(id))errors.push(`${pressure.id} references missing evidence ${id}`);
    for(const step of report.commercialPlan?.roadmap??[])for(const id of step.experimentIds)if(!opportunityIds.has(id))errors.push(`Roadmap references missing experiment ${id}`);
    errors.push(...operatingErrors(report.operatingPlan,[...ids])); return errors;
}
export function evidenceWarnings(report: z.infer<typeof contentSchema>) { const warnings = ['Public discussions are a non-representative sample; no prevalence or business impact can be inferred.']; const urls = new Set(report.evidence.map(e => canonicalUrl(e.url))); if (urls.size < 3)
    warnings.push('Fewer than three unique source pages. Treat recommendations as exploratory.'); if (!report.evidence.some(e => e.kind === 'positive'))
    warnings.push('No positive counterevidence recorded. Seek opposing experiences before prioritizing.'); if (report.evidence.some(e => !e.date))
    warnings.push('Some publication dates are unknown. Check freshness before acting.'); if (!report.evidence.length)
    warnings.push('No evidence yet. Add sources before proposing experiments.'); return warnings; }
function legacyMarkdown(report: z.infer<typeof reportSchema>) { return `# ${report.brief.company} — GTM study\n\nMode: ${report.mode}. Created: ${report.generatedAt}\n\n## Brief\n${report.brief.objective}\n\nAudience: ${report.brief.audience}\n\nConstraints: ${report.brief.constraints}\n\n## Working strategy\n${report.summary}\n\n## Limitations\n${report.warnings.map(x => '- ' + x).join('\n')}\n\n## Evidence\n${report.evidence.map(e => `### ${e.id}: ${e.title}\n${e.kind} · ${e.date ?? 'Date unknown'}\n\n${e.summary}\n\nSource: ${e.url}\n\nLimitation: ${e.limitation}`).join('\n\n')}\n\n## Proposed experiments\n${report.opportunities.map(o => `### ${o.id}: ${o.title}\nHypothesis: ${o.hypothesis}\n\nAction: ${o.action}\n\nSupporting evidence: ${o.evidenceIds.join(', ')}\nCounterevidence: ${o.counterEvidenceIds.join(', ') || 'None recorded'}\n\nMetric: ${o.metric}\nValidation: ${o.validation}\nProposed owner: ${o.owner}\nEffort: ${o.effort}`).join('\n\n')}\n\n## Open questions\n${report.unknowns.map(x => '- ' + x).join('\n')}\n\nIndependent research. Experiments are proposed, not launched.\n`; }

export function toMarkdown(report:z.infer<typeof reportSchema>){let content=legacyMarkdown(report);if(report.marketContext){content+=`
## Market context
Portfolio thesis: ${report.marketContext.thesis}

${report.marketContext.facts.map(item=>`- ${item.label} [${item.status}]: ${item.value} Evidence: ${item.evidenceIds.join(', ')||'Needed'}`).join('\n')}

## Funnel diagnosis
${report.marketContext.funnel.map(item=>`- ${item.name} [${item.state}]: ${item.signal}`).join('\n')}
`;}
if(report.assumptions?.length){content+=`
## Assumption map
${report.assumptions.map(item=>`### ${item.id}: ${item.title}
${item.statement}

Impact: ${item.impact}. Confidence: ${item.confidence}. Evidence: ${item.evidenceIds.join(', ')||'Needed'}

Why it matters: ${item.whyItMatters}

Validation: ${item.validation}`).join('\n\n')}
`;}
if(report.operatingPlan){const p=report.operatingPlan;content+=`
## Decision brief
Problem: ${p.decision.problem}
Response: ${p.decision.intervention}
When: ${p.decision.horizon}
Goal: ${p.decision.desiredOutcome}
Metric: ${p.decision.successMetric}
Baseline: ${p.decision.baseline??'Unknown'}
Target: ${p.decision.target??'Not set'}

## Channel decisions
${p.channels.map(c=>`- ${c.channel}: ${c.decision}. ${c.rationale} Data needed: ${c.dataNeeded}`).join('\n')}
`;}for(const o of report.opportunities){if(o.design){const d=o.design;content+=`
### ${o.id} — Experiment design
Priority: ${o.priority??'Unsequenced'}
Territory: ${o.territory??'Not labeled'}
Behavior: ${o.behavior??'Not labeled'}
Channel: ${d.channel}
Ambition: ${d.ambition}
Mechanism: ${d.mechanism}
Distinctive because: ${d.differentBecause}
Smallest test: ${d.smallestTest}
Budget cap: ${d.budgetCap===null?'Not approved':d.budgetCap+' USD (proposed)'}
Duration: ${d.durationDays} days after approval
Stop rule: ${d.stopRule}
Guardrail: ${d.guardrail}
`;}}if(report.benchmarkProfile){const b=report.benchmarkProfile;content+=`
## Benchmark cohort
Category: ${b.category}
Business model: ${b.businessModel}
GTM motion: ${b.gtmMotion}
Company stage: ${b.companyStage}
Geography: ${b.geography}

### Peer roles
${b.peers.map(p=>`- ${p.company} — ${p.role}: ${p.rationale} Evidence: ${p.evidenceIds.join(', ')||'Needed'}`).join('\n')||'- No validated peers yet.'}

### Comparable metrics
${b.metrics.map(m=>`- ${m.name}: ${m.observedRange??'No defensible range yet'} ${m.unit}. ${m.definition} Freshness: ${m.freshness}. Evidence: ${m.evidenceIds.join(', ')||'Needed'}. Limitation: ${m.limitation}`).join('\n')||'- No defensible metric benchmarks yet.'}

### Category conventions
${b.conventions.map(x=>`- ${x}`).join('\n')||'- Not established.'}

### Strategic whitespace
${b.whitespace.map(x=>`- ${x}`).join('\n')||'- Not established.'}
`; }if(report.commercialPlan){const c=report.commercialPlan;content+=`
## Commercial measurement
North star: ${c.northStar}
Pipeline outcome: ${c.pipelineOutcome}
Baseline: ${c.baseline??'Required from connected data'}
Target: ${c.target??'Set after baseline review'}
Attribution window: ${c.attributionWindow}
Source of truth: ${c.sourceOfTruth}
Pipeline logic: ${c.pipelineLogic}
Cost principle: ${c.costPrinciple}

### Leading indicators
${c.leadingIndicators.map(k=>`- ${k.name}: ${k.signal}. Source: ${k.source}`).join('\n')}

### Competitive pressure
${c.competitivePressures.map(p=>`- ${p.id} [${p.threat}] ${p.attacker}: ${p.vulnerability}. Likely move: ${p.likelyMove}. Signal: ${p.leadingSignal}. Response: ${p.response}. Evidence: ${p.evidenceIds.join(', ')||'Needed'}`).join('\n')||'- No evidence-bound attack defined.'}

### Defensibility
${c.defensibility.map(d=>`- ${d.asset}: ${d.whyHardToCopy}. Proof needed: ${d.proofNeeded}`).join('\n')||'- No defensible asset established.'}

### 90-day roadmap
${c.roadmap.map(r=>`- ${r.horizon}: ${r.objective}. Decision gate: ${r.decisionGate}. Experiments: ${r.experimentIds.join(', ')||'None'}`).join('\n')}
`; }return content;}
