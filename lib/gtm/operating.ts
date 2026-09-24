import { z } from 'zod';
export const channels=['Paid media','Organic & SEO','Email & lifecycle','Inbound & website','Community & developer relations','Partnerships & events','Sales & CRM'] as const;
export type Channel=typeof channels[number];
const text=z.string().trim().min(1).max(3000);
const ids=z.array(z.string()).max(30);
export const designSchema=z.object({
 channel:z.enum(channels),
 ambition:z.enum(['Core','Bold','Wildcard']),
 commercialRole:z.enum(['Acquire','Convert','Retain','Expand','Build authority']).optional(),
 categoryConvention:text.optional(),
 brandFit:text.optional(),
 mechanism:text,
 differentBecause:text,
 assumptionToTest:text.optional(),
 proofRequired:text.optional(),
 smallestTest:text,
 budgetCap:z.number().nonnegative().max(10000000).nullable(),
 durationDays:z.number().int().min(1).max(365),
 stopRule:text,
 primaryMetric:text,
 guardrail:text
}).strict();
export const decisionSchema=z.object({problem:text,evidenceIds:ids,intervention:text,desiredOutcome:text,horizon:text,successMetric:text,baseline:text.nullable(),target:text.nullable(),assumptions:z.array(text).max(12)}).strict();
export const channelPlanSchema=z.object({channel:z.enum(channels),decision:z.enum(['Test','Investigate','Hold']),rationale:text,evidenceIds:ids,dataNeeded:text}).strict();
export const operatingPlanSchema=z.object({decision:decisionSchema,channels:z.array(channelPlanSchema).length(7)}).strict().superRefine((p,c)=>{if(new Set(p.channels.map(x=>x.channel)).size!==7)c.addIssue({code:'custom',message:'Every channel must have exactly one decision.'})});
export const plannerSchema=z.object({objective:text,bottleneckHypothesis:text,questions:z.array(text).min(1).max(8),assignments:z.array(z.object({channel:z.enum(channels),task:text,priority:z.enum(['Now','Later','Needs data'])}).strict()).length(7),dataGaps:z.array(text).max(15)}).strict().superRefine((p,c)=>{if(new Set(p.assignments.map(x=>x.channel)).size!==7)c.addIssue({code:'custom',message:'Planner must cover every channel once.'})});
export type Design=z.infer<typeof designSchema>;
export type OperatingPlan=z.infer<typeof operatingPlanSchema>;
export type Planner=z.infer<typeof plannerSchema>;
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(x=>Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x,'Invalid calendar date');
export const metricSchema=z.object({id:z.string().uuid(),channel:z.enum(channels),name:text.max(150),value:z.number().finite().nonnegative(),unit:z.enum(['count','percent','USD']),windowStart:day,windowEnd:day,source:text.max(600),definition:text,capturedAt:z.string().datetime()}).strict().superRefine((m,c)=>{if(m.windowStart>m.windowEnd||m.windowEnd>new Date().toISOString().slice(0,10))c.addIssue({code:'custom',message:'Use a completed reporting window.'});if(m.unit==='percent'&&m.value>100)c.addIssue({code:'custom',message:'Percentage must be between 0 and 100.'})});
export type Metric=z.infer<typeof metricSchema>;
export const outcomeSchema=z.object({id:z.string().uuid(),taskId:z.string().uuid(),metric:text,baselineSuccess:z.number().int().nonnegative(),baselineTotal:z.number().int().positive(),testSuccess:z.number().int().nonnegative(),testTotal:z.number().int().positive(),minimumPerGroup:z.number().int().positive(),targetLiftPp:z.number().positive().max(100),guardrailPassed:z.boolean(),design:z.enum(['Randomized','Before/after','Other']),source:text,notes:text,recordedAt:z.string().datetime()}).strict().superRefine((o,c)=>{if(o.baselineSuccess>o.baselineTotal||o.testSuccess>o.testTotal)c.addIssue({code:'custom',message:'Successes cannot exceed the total.'})});
export type Outcome=z.infer<typeof outcomeSchema>;
export type ExecutionTask={id:string;experimentId:string;title:string;channel:Channel;owner:string;startDate:string;dueDate:string;budgetCap:number;status:'Prepared'|'Measured';artifact:string;createdAt:string;approvedAt?:string;approvalScope?:'Prepare only'};
export type Operations={metrics:Metric[];tasks:ExecutionTask[];outcomes:Outcome[]};
export const emptyOperations:Operations={metrics:[],tasks:[],outcomes:[]};
export type Trace={phase:string;status:'passed'|'failed';durationMs:number;at:string;promptVersion:string;signal:string};
const executionTaskSchema=z.object({id:z.string().uuid(),experimentId:z.string().regex(/^O\d+$/),title:text,channel:z.enum(channels),owner:text.max(150),startDate:day,dueDate:day,budgetCap:z.number().finite().nonnegative().max(10000000),status:z.enum(['Prepared','Measured']),artifact:z.string().max(100000),createdAt:z.string().datetime(),approvedAt:z.string().datetime().optional(),approvalScope:z.literal('Prepare only').optional()}).strict();
export const operationsSchema=z.object({metrics:z.array(metricSchema).max(100),tasks:z.array(executionTaskSchema).max(30),outcomes:z.array(outcomeSchema).max(100)}).strict();
export const traceSchema=z.array(z.object({phase:text.max(80),status:z.enum(['passed','failed']),durationMs:z.number().int().nonnegative(),at:z.string().datetime(),promptVersion:text.max(100),signal:text.max(1000)}).strict()).max(500);
export const promptVersion='signaldesk-v2.1-brand-native-creativity';
export function evaluateOutcome(o:Outcome){const baseline=100*o.baselineSuccess/o.baselineTotal,test=100*o.testSuccess/o.testTotal,liftPp=test-baseline;const verdict=!o.guardrailPassed?'Stop: guardrail failed':o.baselineTotal<o.minimumPerGroup||o.testTotal<o.minimumPerGroup?'Insufficient sample':liftPp>=o.targetLiftPp?'Observed target met':'Target not met';return {baseline,test,liftPp,verdict,eligibleForAutomaticPromotion:false,limitation:o.design==='Randomized'?'Descriptive comparison only. Check assignment, uncertainty and regressions before adopting.':'Non-randomized comparison. Seasonality and other changes can explain the difference.'}}
export function operatingErrors(plan:OperatingPlan|undefined,evidenceIds:string[]){if(!plan)return [];const valid=new Set(evidenceIds);return [...plan.decision.evidenceIds,...plan.channels.flatMap(c=>c.evidenceIds)].filter(id=>!valid.has(id)).map(id=>'Operating plan references missing evidence '+id)}
export function planQuality(opportunities:{id:string;design?:Design;evidenceIds:string[]}[]){return opportunities.map(o=>({id:o.id,checks:[{name:'Evidence linked',pass:o.evidenceIds.length>0},{name:'Category convention named',pass:!!o.design?.categoryConvention},{name:'Brand permission explained',pass:!!o.design?.brandFit},{name:'Commercial job assigned',pass:!!o.design?.commercialRole},{name:'Distinctive mechanism',pass:!!o.design?.mechanism&&!!o.design?.differentBecause},{name:'Assumption and proof named',pass:!!o.design?.assumptionToTest&&!!o.design?.proofRequired},{name:'Smallest test defined',pass:!!o.design?.smallestTest},{name:'Stop rule & guardrail',pass:!!o.design?.stopRule&&!!o.design?.guardrail},{name:'Budget set before execution',pass:o.design?.budgetCap!=null}],note:'Completeness checks, not proof of originality or effectiveness.'}))}
