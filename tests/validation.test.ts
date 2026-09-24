import {calculateEconomics,illustrativeEconomics,emptyEconomics,economicsSchema} from '../lib/gtm/economics.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { briefSchema, reportSchema, referenceErrors, evidenceWarnings, canonicalUrl, safeUrl, toMarkdown } from '../lib/gtm/validation.ts';
import { example } from '../lib/gtm/example.ts';
import { channels, evaluateOutcome, planQuality, outcomeSchema } from '../lib/gtm/operating.ts';
import { evaluateReport, evaluationScenarios } from '../lib/gtm/evaluation.ts';
test('curated example satisfies schema and reference integrity', () => { assert.equal(reportSchema.safeParse(example).success, true); assert.deepEqual(referenceErrors(example), []); });
test('private or executable source URLs are rejected', () => { for (const u of ['javascript:alert(1)', 'http://example.com', 'https://localhost', 'https://127.0.0.1', 'https://10.0.0.1', 'https://[::1]', 'https://user:pass@example.com'])
    assert.equal(safeUrl(u), false, u); assert.equal(safeUrl('https://posthog.com/docs'), true); });
test('brief cannot omit an audience or misstate a URL', () => { assert.equal(briefSchema.safeParse({ ...example.brief, audience: '' }).success, false); assert.equal(briefSchema.safeParse({ ...example.brief, website: 'not-a-url' }).success, false); });
test('unretrieved URLs are rejected even when structurally valid', () => { assert.ok(referenceErrors(example, ['https://posthog.com']).some(e => e.includes('not returned'))); });
test('missing references and duplicate IDs are rejected', () => { const copy = structuredClone(example); copy.evidence.push(copy.evidence[0]); copy.opportunities[0].evidenceIds.push('E99'); const errors = referenceErrors(copy); assert.ok(errors.some(e => e.includes('Duplicate'))); assert.ok(errors.some(e => e.includes('missing evidence'))); });
test('same evidence cannot support and oppose an experiment', () => { const copy = structuredClone(example); copy.opportunities[0].counterEvidenceIds = [copy.opportunities[0].evidenceIds[0]]; assert.ok(referenceErrors(copy).some(e => e.includes('same record'))); });
test('invalid calendar and future dates are rejected', () => { for (const date of ['2026-02-31', '2099-01-01']) {
    const copy = structuredClone(example);
    copy.evidence[0].date = date;
    assert.ok(referenceErrors(copy).some(e => e.includes('date')));
} });
test('URL deduplication strips tracking and fragments, preserving thread IDs', () => { assert.equal(canonicalUrl('https://posthog.com/?utm_source=test#x'), canonicalUrl('https://posthog.com')); assert.notEqual(canonicalUrl('https://news.ycombinator.com/item?id=1'), canonicalUrl('https://news.ycombinator.com/item?id=2')); });
test('sparse evidence does not become confident output', () => { const copy = { ...example, evidence: [], opportunities: [] }; const warnings = evidenceWarnings(copy); assert.ok(warnings.some(w => w.includes('No evidence'))); assert.ok(warnings.some(w => w.includes('No positive'))); });
test('export retains provenance, limitations, and proposed status', () => { const md = toMarkdown(example); assert.ok(md.includes('Mode: example')); assert.ok(md.includes(example.evidence[0].url)); assert.ok(md.includes('Counterevidence: E4')); assert.ok(md.includes('proposed, not launched')); });
test('operating plan covers every GTM channel exactly once', () => { assert.deepEqual(example.operatingPlan?.channels.map(item => item.channel).sort(), [...channels].sort()); });
test('bold ideas carry a bounded test, stop rule and guardrail', () => { const quality = planQuality(example.opportunities); assert.ok(example.opportunities.some(item => item.design?.ambition === 'Wildcard')); assert.ok(quality.every(item => item.checks.every(check => check.pass))); });
test('default creative contract is brand-native and commercially varied', () => { assert.ok(example.brandProfile?.voiceTraits.every(item => item.evidenceIds.length)); assert.ok(example.brandProfile?.signatureAssets.every(item => item.evidenceIds.length)); assert.ok(example.opportunities.every(item => item.design?.categoryConvention && item.design.brandFit && item.design.commercialRole && item.design.assumptionToTest && item.design.proofRequired)); assert.ok(new Set(example.opportunities.map(item => item.design?.commercialRole)).size >= 3); assert.equal(evaluateReport(example).gates.find(item => item.name === 'Brand-native creativity')?.pass, true); });
test('V3 separates assumptions from facts and sequences one immediate bet', () => { assert.ok(example.marketContext?.facts.some(item => item.status === 'Public fact')); assert.ok(example.marketContext?.facts.some(item => item.status === 'Unknown')); assert.ok(example.assumptions?.some(item => item.impact === 'High' && item.confidence === 'Low')); assert.equal(example.opportunities.filter(item => item.priority === 'Now').length, 1); assert.equal(new Set(example.opportunities.map(item => item.territory)).size, example.opportunities.length); });
test('V3 export includes thesis, assumption map, benchmark cohort, brand brief, and creative territory', () => { const md = toMarkdown(example); assert.ok(md.includes('## Market context')); assert.ok(md.includes('## Assumption map')); assert.ok(md.includes('## Brand-native creative brief')); assert.ok(md.includes('## Benchmark cohort')); assert.ok(md.includes('Range unavailable') || md.includes('No defensible range')); assert.ok(md.includes('Territory: Product as proof')); assert.ok(md.includes('Category convention replaced:')); });
test('benchmark claims must retain valid evidence references', () => { const copy = structuredClone(example); copy.benchmarkProfile!.metrics[0].evidenceIds = ['E404']; assert.ok(referenceErrors(copy).some(error => error.includes('Benchmark metric'))); });
test('outcome evaluation stays descriptive and never auto-promotes', () => { const outcome = outcomeSchema.parse({ id: crypto.randomUUID(), taskId: crypto.randomUUID(), metric: 'qualified demo rate', baselineSuccess: 10, baselineTotal: 100, testSuccess: 18, testTotal: 100, minimumPerGroup: 80, targetLiftPp: 5, guardrailPassed: true, design: 'Randomized', source: 'Synthetic test fixture', notes: 'No inference test included.', recordedAt: new Date().toISOString() }); const result = evaluateOutcome(outcome); assert.equal(result.verdict, 'Observed target met'); assert.equal(result.eligibleForAutomaticPromotion, false); });
test('evaluation harness scores the curated fixture without inventing stability', () => { const result = evaluateReport(example); assert.ok(result.score >= 70); assert.equal(result.dimensions.find(item => item.id === 'stability')?.score, null); assert.equal(result.gates.find(item => item.name === 'Reference integrity')?.pass, true); });
test('evaluation harness blocks a sparse unsequenced strategy', () => { const sparse = structuredClone(example); sparse.evidence = []; sparse.opportunities = []; sparse.operatingPlan = undefined; sparse.benchmarkProfile = undefined; const result = evaluateReport(sparse); assert.equal(result.status, 'Blocked'); assert.ok(result.score < evaluateReport(example).score); });
test('regression suite covers five distinct GTM conditions', () => { assert.equal(evaluationScenarios.length, 5); assert.equal(new Set(evaluationScenarios.map(item => item.name)).size, 5); assert.equal(evaluationScenarios.filter(item => item.state === 'Fixture ready').length, 1); });
test('commercial plan connects KPIs, pipeline, competitive pressure, and roadmap', () => { assert.ok(example.commercialPlan); assert.equal(example.commercialPlan?.baseline, null); assert.equal(example.commercialPlan?.target, null); assert.equal(example.commercialPlan?.roadmap.length, 3); assert.ok(example.commercialPlan?.leadingIndicators.length); assert.ok(example.commercialPlan?.competitivePressures.every(item => item.evidenceIds.length)); assert.ok(example.commercialPlan?.costPrinciple.includes('not inferred CAC')); assert.deepEqual(referenceErrors(example), []); });
test('commercial roadmap and pressure references must resolve', () => { const copy = structuredClone(example); copy.commercialPlan!.roadmap[0].experimentIds = ['O404']; copy.commercialPlan!.competitivePressures[0].evidenceIds = ['E404']; const errors = referenceErrors(copy); assert.ok(errors.some(item => item.includes('Roadmap'))); assert.ok(errors.some(item => item.includes('C1'))); });
test('commercial measurement is retained in the case-study export', () => { const md = toMarkdown(example); assert.ok(md.includes('## Commercial measurement')); assert.ok(md.includes('## Commercial measurement') && md.includes('### Competitive pressure')); assert.ok(md.includes('A proposed cap is test cost')); });

test('economics computes incremental sales pipeline, bookings and cash separately',()=>{
 const m=illustrativeEconomics('O1');const r=calculateEconomics(m);const b=r.scenarios.find(s=>s.name==='Base')!;
 assert.equal(r.cash,3000);assert.equal(r.labor,3000);assert.equal(r.total,6000);
 assert.equal(b.baseline,40);assert.equal(b.treated,50);assert.equal(b.incremental,10);assert.equal(b.outcomes,3);assert.equal(b.pipeline,36000);assert.equal(b.bookings,9000);assert.equal(b.costPerOutcome,2000);
 assert.match(r.decision,/Illustration only/);
});
test('missing economics inputs stay unknown, while explicit zero costs remain zero',()=>{
 const m=emptyEconomics('O1');let r=calculateEconomics(m);assert.equal(r.total,null);assert.equal(r.scenarios[0].bookings,null);assert.match(r.decision,/Hold/);
 m.costs.forEach(c=>{c.quantity=0;c.unitCost=0;});r=calculateEconomics(m);assert.equal(r.total,0);assert.equal(r.scenarios[0].costPerOutcome,null);
});
test('nonpositive lift is preserved without invalid cost ratios',()=>{
 const m=illustrativeEconomics('O1');m.scenarios[0].activationRate=10;m.scenarios[1].activationRate=20;
 const r=calculateEconomics(m);assert.equal(r.scenarios[0].incremental,-20);assert.equal(r.scenarios[0].pipeline,-72000);assert.equal(r.scenarios[0].costPerOutcome,null);assert.equal(r.scenarios[1].outcomes,0);assert.equal(r.scenarios[1].costPerOutcome,null);
});
test('self-service uses paid conversion without a sales win-rate or opportunity pipeline',()=>{
 const m=illustrativeEconomics('O1');m.motion='Self-service';m.scenarios.forEach(s=>{s.winRate=null;s.value=1200;});const b=calculateEconomics(m).scenarios[1];assert.equal(b.pipeline,null);assert.equal(b.customers,3);assert.equal(b.bookings,3600);
});
test('economics validates rates, finite amounts, unique cases and experiment links',()=>{
 const m=illustrativeEconomics('O1');m.scenarios[0].winRate=101;assert.equal(economicsSchema.safeParse(m).success,false);m.scenarios[0].winRate=25;m.costs[0].unitCost=Infinity;assert.equal(economicsSchema.safeParse(m).success,false);
 const copy=structuredClone(example);copy.economics=[illustrativeEconomics('O999')];assert.ok(referenceErrors(copy).some(e=>e.includes('missing experiment')));copy.economics=[illustrativeEconomics('O1'),illustrativeEconomics('O1')];assert.ok(referenceErrors(copy).some(e=>e.includes('Duplicate economics')));
 const duplicate=illustrativeEconomics('O1');duplicate.scenarios[0].name='Base';assert.equal(economicsSchema.safeParse(duplicate).success,false);
});
test('cash availability never implies approval or company CAC',()=>{
 const m=illustrativeEconomics('O1');m.illustrative=false;m.availableBudget=2999;assert.match(calculateEconomics(m).decision,/Rescope/);m.availableBudget=3000;assert.match(calculateEconomics(m).decision,/Hold/);m.minimumPerGroup=100;assert.match(calculateEconomics(m).decision,/human funding review/);
 const md=toMarkdown({...example,economics:[m]});assert.match(md,/36000/);assert.match(md,/No portfolio summation, ROI or company CAC claim/);
});
