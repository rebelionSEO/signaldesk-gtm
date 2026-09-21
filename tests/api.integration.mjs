// Run against a local development preview with migrations applied.
// Uses test records in the local database only; never target production.
import assert from 'node:assert/strict';
const origin='http://localhost:5173';
const login=await fetch(origin+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
assert.ok(cookie,'Local sign-in cookie required');
async function call(path,method='GET',body,headers={}){const r=await fetch(origin+path,{method,headers:{cookie,origin,'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={error:text}}return {status:r.status,data}}
const unauthorized=await fetch(origin+'/api/projects');assert.equal(unauthorized.status,401);
const status=await call('/api/status');assert.equal(status.status,200);assert.equal(status.data.aiConfigured,false);
const id=crypto.randomUUID();const brief={company:'Integration test company',website:'https://example.com',audience:'Developers',objective:'Investigate evaluation friction',constraints:'Local automated test; not a real company study.'};
const created=await call('/api/projects','POST',{id,brief});assert.equal(created.status,201,JSON.stringify(created.data));assert.equal(created.data.report.brief.company,brief.company);
const repeated=await call('/api/projects','POST',{id,brief});assert.equal(repeated.data.id,id);
const loaded=await call('/api/projects/'+id);assert.equal(loaded.status,200);assert.equal(loaded.data.revision,0);
const report=loaded.data.report;report.evidence.push({id:'E1',title:'Test observation',url:'https://example.com/feedback',summary:'A manually entered test observation.',kind:'complaint',date:null,limitation:'Synthetic fixture, not research.'});
const saved=await call('/api/projects/'+id,'PATCH',{revision:0,report});assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.revision,1);
const reopened=await call('/api/projects/'+id);assert.equal(reopened.data.report.evidence.length,1);
const stale=await call('/api/projects/'+id,'PATCH',{revision:0,report});assert.equal(stale.status,409);
const cross=await call('/api/projects/'+id,'PATCH',{revision:1,report},{origin:'https://attacker.example'});assert.equal(cross.status,403);
const invalid=structuredClone(report);invalid.opportunities=[{id:'O1',title:'Bad reference',hypothesis:'Maybe',evidenceIds:['E999'],counterEvidenceIds:[],stage:'Evaluate',effort:'Low',action:'Test',metric:'Completion',validation:'Check',owner:'Researcher'}];
assert.equal((await call('/api/projects/'+id,'PATCH',{revision:1,report:invalid})).status,400);
report.opportunities=[{id:'O1',priority:'Now',territory:'Product participation',behavior:'Complete a technical evaluation task',title:'Bounded developer challenge',hypothesis:'A hands-on task may reveal evaluation friction.',evidenceIds:['E1'],counterEvidenceIds:[],stage:'Evaluate',effort:'Low',action:'Prepare a five-person facilitated prototype.',metric:'Correct task completion',validation:'Verify evidence and define a baseline.',owner:'Developer marketing',design:{channel:'Community & developer relations',ambition:'Bold',mechanism:'Participants solve a synthetic problem using the product.',differentBecause:'The product is the tool used to complete the task.',smallestTest:'Five facilitated sessions.',budgetCap:500,durationDays:14,stopRule:'Stop after five sessions or if the task is unclear.',primaryMetric:'Correct task completion rate',guardrail:'Participant frustration must not worsen.'}}];
report.economics=[{experimentId:'O1',motion:'Sales-led',illustrative:false,cohort:null,baselineRate:null,availableBudget:null,costs:[{label:'Prototype',kind:'Cash',quantity:1,unitCost:400}],scenarios:['Conservative','Base','Optimistic'].map(name=>({name,activationRate:null,downstreamRate:null,winRate:null,value:null})),assumptions:'Integration fixture',windowDays:30,minimumPerGroup:null,measurementSource:'',successRule:'',stopRule:''}];
const planned=await call('/api/projects/'+id,'PATCH',{revision:1,report});assert.equal(planned.status,200,JSON.stringify(planned.data));assert.equal(planned.data.revision,2);
assert.deepEqual((await call('/api/projects/'+id)).data.report.economics,report.economics);
const taskId=crypto.randomUUID();const today=new Date().toISOString().slice(0,10);const overCap=await call('/api/projects/'+id+'/operations','POST',{action:'prepare',revision:2,id:crypto.randomUUID(),experimentId:'O1',owner:'Developer marketing',startDate:today,dueDate:today,budgetCap:501,approved:true});assert.equal(overCap.status,400);const prepared=await call('/api/projects/'+id+'/operations','POST',{action:'prepare',revision:2,id:taskId,experimentId:'O1',owner:'Developer marketing',startDate:today,dueDate:today,budgetCap:500,approved:true});assert.equal(prepared.status,200,JSON.stringify(prepared.data));assert.equal(prepared.data.operations.tasks.length,1);assert.ok(prepared.data.operations.tasks[0].approvedAt);assert.match(prepared.data.operations.tasks[0].artifact,/Pipeline & budget: O1/);assert.match(prepared.data.operations.tasks[0].artifact,/Nothing published, sent, booked or spent/);
assert.equal((await call('/api/projects/'+id+'/operations','POST',{action:'dispatch',revision:3,taskId})).status,409);
assert.equal((await call('/api/projects/'+id+'/run','POST',{revision:3})).status,503);
assert.equal((await call('/api/projects/'+crypto.randomUUID())).status,404);
assert.equal((await call('/api/projects/'+id)).data.revision,3);
console.log('PASS: authentication, persistence, stale-write protection, origin checks, report validation, execution-pack preparation, blocked unconfigured dispatch, missing AI configuration, and not-found behavior.');
