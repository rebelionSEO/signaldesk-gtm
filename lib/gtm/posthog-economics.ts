import {emptyEconomics,scenarioNames,type Economics} from './economics.ts';

// Deliberately synthetic portfolio scenarios, never inferred company performance.
export const posthogEconomics:Economics[] = [
 {id:'O1',cohort:100,hours:20,production:400,recruitment:400,measurement:200},
 {id:'O2',cohort:50,hours:30,production:1000,recruitment:1000,measurement:500},
 {id:'O3',cohort:150,hours:20,production:400,recruitment:200,measurement:150},
 {id:'O4',cohort:40,hours:15,production:800,recruitment:400,measurement:300},
].map(x=>({...emptyEconomics(x.id),illustrative:true,cohort:x.cohort,baselineRate:20,
 costs:[{label:'Prototype / content production',kind:'Cash',quantity:1,unitCost:x.production},{label:'Recruitment / distribution',kind:'Cash',quantity:1,unitCost:x.recruitment},{label:'Measurement / tooling',kind:'Cash',quantity:1,unitCost:x.measurement},{label:'Internal team hours',kind:'Internal time',quantity:x.hours,unitCost:50}],
 scenarios:scenarioNames.map((name,i)=>({name,activationRate:[20,25,30][i],downstreamRate:30,winRate:25,value:12000})),
 assumptions:`Illustrative planning case, not PostHog data or an industry benchmark. Assumes ${x.cohort} qualified exposed accounts, 20% baseline activation, 0/5/10 percentage-point lift, 30% activated-to-opportunity conversion, 25% win rate, and $12,000 annual opportunity value. This models only a hypothetical assisted-sales path; self-service revenue is excluded. Exposure is a later distribution assumption, not the small discovery-pilot sample. Costs are scoped placeholders, not supplier quotes.`,
 windowDays:90,measurementSource:'Proposed: join randomized experiment assignment and activation events to CRM account IDs. Exclude pre-existing opportunities and deduplicate accounts. Check activation at 30 days and opportunities/bookings at 90 days; allow longer if the sales cycle requires it.',
 successRule:'Discovery pilot: verify understanding and tracking first. Before distribution, agree a powered sample and a minimum worthwhile lift. The 5-point base-case lift is an assumption, not a validated success threshold.',
 stopRule:'Pause if tracking fails, the cash cap is reached, or developer trust worsens. No automatic scale decision from these projections.'}));
export function posthogEconomicsFor(id:string){const model=posthogEconomics.find(m=>m.experimentId===id);return model?structuredClone(model):undefined;}
