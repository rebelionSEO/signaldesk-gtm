import test from 'node:test';
import assert from 'node:assert/strict';
import { example } from '../lib/gtm/example.ts';
import { contentSchema, referenceErrors } from '../lib/gtm/validation.ts';
import { validateAudit, filterAuditedCandidate, nextReviewStage, consumeRevision, initialSupervisor, type AuditResult } from '../lib/gtm/supervisor.ts';

const candidate=()=>contentSchema.parse(Object.fromEntries(Object.entries(structuredClone(example)).filter(([key])=>!['brief','mode','generatedAt','warnings'].includes(key))));
function passing():AuditResult{return {decisionBriefSupported:true,operatingPlanSupported:true,benchmarkProfileSupported:true,brandProfileSupported:true,commercialPlanSupported:true,summarySupported:true,marketContextSupported:true,assumptionsSupported:true,unknownsSupported:true,evidence:example.evidence.map(e=>({id:e.id,supported:true,reason:'Supported by notes',failure:'none'})),opportunities:example.opportunities.map(o=>({id:o.id,supported:true,reason:'Distinct mechanism',failure:'none'})),researchQuestions:[]};}
test('generic concept gets at most two revisions, including persisted failed attempts',()=>{
 const audit=passing();Object.assign(audit.opportunities[0],{supported:false,failure:'creative',reason:'Ordinary client review under a new name'});
 let state=initialSupervisor();
 for(let i=0;i<2;i++){assert.equal(nextReviewStage(audit,state),'creative-revision');state=consumeRevision(JSON.parse(JSON.stringify(state)),'creative-revision');}
 assert.equal(nextReviewStage(audit,state),'complete');assert.throws(()=>consumeRevision(state,'creative-revision'));
 assert.ok(!filterAuditedCandidate(candidate(),audit).opportunities.some(x=>x.id===audit.opportunities[0].id));
});
test('one targeted public research follow-up; private missing data does not trigger search',()=>{
 const audit=passing();Object.assign(audit.evidence[0],{supported:false,failure:'research',reason:'Claimed absence conflicts with existing work'});
 assert.equal(nextReviewStage(audit,initialSupervisor()),'complete');
 audit.researchQuestions=['Does the reviewed testimonial page already provide this proof?'];
 assert.equal(nextReviewStage(audit,initialSupervisor()),'research-revision');
 assert.equal(nextReviewStage(audit,consumeRevision(initialSupervisor(),'research-revision')),'complete');
});
test('malformed or incomplete reviews cannot publish or authorize loops',()=>{
 const a=passing();a.evidence.pop();assert.throws(()=>validateAudit(a,candidate()));
 const b=passing();b.evidence[0].failure='numbers';assert.throws(()=>validateAudit(b,candidate()));
 const c=passing();delete (c as Partial<AuditResult>).marketContextSupported;assert.throws(()=>validateAudit(c,candidate()));
 const d=passing();d.opportunities[1]=d.opportunities[0];assert.throws(()=>validateAudit(d,candidate()));
});
test('unsupported numbers are withheld with affected prose, not rewritten as facts',()=>{
 const c=candidate();const a=passing();
 c.summary='Conversion increased 50%';c.unknowns=['Revenue is $12M'];
 Object.assign(a,{summarySupported:false,unknownsSupported:false,marketContextSupported:false,assumptionsSupported:false,commercialPlanSupported:false,operatingPlanSupported:false,benchmarkProfileSupported:false});
 c.opportunities[0].hypothesis='This will create $50000 in revenue';
 Object.assign(a.opportunities[0],{supported:false,failure:'numbers',reason:'No revenue evidence'});
 const filtered=filterAuditedCandidate(c,validateAudit(a,c));
 assert.ok(!JSON.stringify(filtered).includes('$50000'));assert.ok(!JSON.stringify(filtered).includes('$12M'));
 assert.equal(filtered.marketContext,undefined);assert.equal(filtered.commercialPlan,undefined);assert.equal(filtered.operatingPlan,undefined);assert.equal(filtered.benchmarkProfile,undefined);assert.equal(filtered.assumptions,undefined);assert.equal(filtered.economics,undefined);
});
test('removing evidence also withholds dependent ideas and narrative sections',()=>{
 const c=candidate();const a=passing();const id=c.opportunities[0].evidenceIds[0];
 Object.assign(a.evidence.find(e=>e.id===id)!,{supported:false,failure:'research',reason:'Source does not support claim'});
 const filtered=filterAuditedCandidate(c,validateAudit(a,c));
 assert.ok(filtered.opportunities.every(o=>![...o.evidenceIds,...o.counterEvidenceIds].includes(id)));
 assert.deepEqual(referenceErrors(filtered),[]);
});
test('supported records remain and reviewer cannot secretly invent an ID',()=>{
 assert.equal(filterAuditedCandidate(candidate(),passing()).opportunities.length,example.opportunities.length);
 const a=passing();a.opportunities[0].id='O999';assert.throws(()=>validateAudit(a,candidate()));
});

test('follow-up preserves paid notes, counterevidence and sources across checkpoint reload',async()=>{
 const {mergeResearch}=await import('../lib/gtm/supervisor.ts');
 const original={notes:'Existing testimonials already cover this claim.',sources:[{url:'https://example.com/proof',title:'Proof'}]};
 const followup={notes:'Follow-up contradicts the proposed gap.',sources:[{url:'https://example.com/pricing',title:'Pricing'}]};
 const saved=JSON.parse(JSON.stringify({findings:mergeResearch(original,followup),supervisor:consumeRevision(initialSupervisor(),'research-revision'),crawl:{pending:[]}}));
 assert.ok(saved.findings.notes.includes(original.notes));assert.ok(saved.findings.notes.includes(followup.notes));assert.equal(saved.findings.sources.length,2);assert.equal(saved.supervisor.researchRetries,1);
});

test('oversized review reasons fail before they can poison saved checkpoints',()=>{
 const a=passing();a.opportunities[0].reason='x'.repeat(1501);assert.throws(()=>validateAudit(a,candidate()));
});
