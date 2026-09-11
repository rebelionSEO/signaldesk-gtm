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
assert.equal((await call('/api/projects/'+id+'/run','POST',{revision:1})).status,503);
assert.equal((await call('/api/projects/'+crypto.randomUUID())).status,404);
assert.equal((await call('/api/projects/'+id)).data.revision,1);
console.log('PASS: authentication, create, idempotent create, reload, edit, persistence, stale edit protection, origin check, invalid reference rejection, missing AI configuration, and not-found behavior.');
