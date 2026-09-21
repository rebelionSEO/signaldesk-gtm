import { z } from 'zod';
const amount = z.number().finite().min(0).max(1e9).nullable();
const rate = z.number().finite().min(0).max(100).nullable();
const note = z.string().trim().max(2000);
export const scenarioNames = ['Conservative', 'Base', 'Optimistic'] as const;
const scenarioSchema = z.object({name:z.enum(scenarioNames),activationRate:rate,downstreamRate:rate,winRate:rate,value:amount}).strict();
export const economicsSchema = z.object({
    experimentId:z.string().regex(/^O\d+$/),motion:z.enum(['Sales-led','Self-service']),
    illustrative:z.boolean(),cohort:amount,baselineRate:rate,availableBudget:amount,
    costs:z.array(z.object({label:z.string().trim().min(1).max(180),kind:z.enum(['Cash','Internal time']),quantity:amount,unitCost:amount}).strict()).min(1).max(20),
    scenarios:z.array(scenarioSchema).length(3),assumptions:note,
    windowDays:z.number().int().min(1).max(730),minimumPerGroup:z.number().int().min(1).max(1e7).nullable(),
    measurementSource:note,successRule:note,stopRule:note,
}).strict().superRefine((v,c)=>{if(new Set(v.scenarios.map(s=>s.name)).size!==3)c.addIssue({code:'custom',message:'Include each scenario once.'});});
export type Economics = z.infer<typeof economicsSchema>;
export function emptyEconomics(experimentId:string):Economics{return {experimentId,motion:'Sales-led',illustrative:false,cohort:null,baselineRate:null,availableBudget:null,costs:[{label:'Production',kind:'Cash',quantity:null,unitCost:null},{label:'Distribution & recruitment',kind:'Cash',quantity:null,unitCost:null},{label:'Measurement & tooling',kind:'Cash',quantity:null,unitCost:null},{label:'Team hours',kind:'Internal time',quantity:null,unitCost:null}],scenarios:scenarioNames.map(name=>({name,activationRate:null,downstreamRate:null,winRate:null,value:null})),assumptions:'',windowDays:30,minimumPerGroup:null,measurementSource:'',successRule:'',stopRule:''};}
export function illustrativeEconomics(id:string):Economics{return {...emptyEconomics(id),illustrative:true,cohort:200,baselineRate:20,costs:[{label:'Build interactive prototype (hours)',kind:'Internal time',quantity:40,unitCost:75},{label:'Audience recruitment',kind:'Cash',quantity:1,unitCost:1500},{label:'Production & distribution',kind:'Cash',quantity:1,unitCost:1000},{label:'Instrumentation & measurement',kind:'Cash',quantity:1,unitCost:500}],scenarios:scenarioNames.map((name,i)=>({name,activationRate:[21,25,30][i],downstreamRate:30,winRate:25,value:12000})),assumptions:'Synthetic teaching example only. No company data or industry benchmark. Same cohort and downstream rates in baseline and treatment; only activation changes. Opportunity value is annual contract value.',measurementSource:'Proposed: experiment assignment + product events joined to CRM account IDs; exclude existing opportunities.',successRule:'Set a business threshold and uncertainty requirement before launch.',stopRule:'Pause on tracking failures, trust complaints, or cash cap exhaustion.'};}
export function calculateEconomics(input:Economics){
    const m=economicsSchema.parse(input);
    const subtotal=(kind?:string)=>{const rows=m.costs.filter(c=>!kind||c.kind===kind);return rows.some(c=>c.quantity===null||c.unitCost===null)?null:rows.reduce((sum,c)=>sum+c.quantity!*c.unitCost!,0);};
    const total=subtotal(),cash=subtotal('Cash'),labor=subtotal('Internal time');
    const scenarios=m.scenarios.map(s=>{
        const baseline=m.cohort!==null&&m.baselineRate!==null?m.cohort*m.baselineRate/100:null;
        const treated=m.cohort!==null&&s.activationRate!==null?m.cohort*s.activationRate/100:null;
        const incremental=baseline!==null&&treated!==null?treated-baseline:null;
        const outcomes=incremental!==null&&s.downstreamRate!==null?incremental*s.downstreamRate/100:null;
        const pipeline=m.motion==='Sales-led'&&outcomes!==null&&s.value!==null?outcomes*s.value:null;
        const customers=m.motion==='Sales-led'?(outcomes!==null&&s.winRate!==null?outcomes*s.winRate/100:null):outcomes;
        const bookings=customers!==null&&s.value!==null?customers*s.value:null;
        return {name:s.name,baseline,treated,incremental,outcomes,pipeline,customers,bookings,costPerOutcome:total!==null&&outcomes!==null&&outcomes>0?total/outcomes:null};
    });
    const missing=[...(total===null?['Complete the itemized cost estimate.']:[]),...(!m.assumptions.trim()?['Document assumption provenance and cohort definitions.']:[]),...(m.cohort===null||m.cohort===0||m.baselineRate===null?['Define cohort size and baseline activation.']:[]),...(scenarios.some(s=>s.bookings===null)?['Complete all scenario assumptions.']:[]),...(!m.measurementSource.trim()?['Define the attribution source and account join.']:[]),...(m.minimumPerGroup===null?['Set a justified minimum sample per group.']:[]),...(!m.successRule.trim()||!m.stopRule.trim()?['Define success and stop rules.']:[])];
    const overBudget=cash!==null&&m.availableBudget!==null&&cash>m.availableBudget;
    const decision=m.illustrative?'Illustration only — replace assumptions before funding':overBudget?'Rescope — cash estimate exceeds available budget':missing.length?'Hold — complete the measurement and cost plan':m.availableBudget===null?'Review — available cash budget is unknown':'Ready for human funding review';
    return {total,cash,labor,scenarios,missing,overBudget,decision};
}
export function economicsMarkdown(models:Economics[]){return models.map(m=>{const r=calculateEconomics(m);return `\n## Pipeline & budget: ${m.experimentId}\n${m.illustrative?'Synthetic illustration':'User-entered assumptions'}; ${m.motion}; USD; ${m.windowDays}-day measurement window.\n\nCash: ${r.cash??'Unknown'}; internal time: ${r.labor??'Unknown'}; total: ${r.total??'Unknown'}; available cash: ${m.availableBudget??'Unknown'}.\n${m.costs.map(c=>`- ${c.label} (${c.kind}): ${c.quantity??'?'} × $${c.unitCost??'?'}`).join('\n')}\n\nCohort: ${m.cohort??'Unknown'}; baseline activation: ${m.baselineRate??'Unknown'}%.\n${m.scenarios.map(s=>`- ${s.name} assumptions: activation ${s.activationRate??'?'}%; downstream ${s.downstreamRate??'?'}%; win ${s.winRate??'?'}%; value $${s.value??'?'}`).join('\n')}\n${r.scenarios.map(s=>`- ${s.name}: incremental activated ${s.incremental??'?'}; incremental outcomes ${s.outcomes??'?'}; pipeline ${s.pipeline??'N/A'}; expected bookings ${s.bookings??'?'}; cost per incremental outcome ${s.costPerOutcome??'N/A'}`).join('\n')}\n\n${r.decision}\nAssumptions: ${m.assumptions}\nMeasurement: ${m.measurementSource}\nMinimum sample per group: ${m.minimumPerGroup??'Not set'}\nSuccess: ${m.successRule}\nStop: ${m.stopRule}\n\nScenario arithmetic, not measured impact. Downstream rates held constant between control and treatment. No portfolio summation, ROI or company CAC claim.\n`;}).join('\n');}
