import test from 'node:test';
import assert from 'node:assert/strict';
import { briefSchema, reportSchema, referenceErrors, evidenceWarnings, canonicalUrl, safeUrl, toMarkdown } from '../lib/gtm/validation.ts';
import { example } from '../lib/gtm/example.ts';
test('curated example satisfies schema and reference integrity', () => { assert.equal(reportSchema.safeParse(example).success, true); assert.deepEqual(referenceErrors(example), []); });
test('private or executable source URLs are rejected', () => { for (const u of ['javascript:alert(1)', 'http://example.com', 'https://localhost', 'https://127.0.0.1', 'https://10.0.0.1', 'https://[::1]', 'https://user:pass@example.com'])
    assert.equal(safeUrl(u), false, u); assert.equal(safeUrl('https://posthog.com/docs'), true); });
test('brief cannot omit an audience or misstate a URL', () => { assert.equal(briefSchema.safeParse({ ...example.brief, audience: '' }).success, false); assert.equal(briefSchema.safeParse({ ...example.brief, website: 'not-a-url' }).success, false); });
test('unretrieved URLs are rejected even when structurally valid', () => { assert.ok(referenceErrors(example, ['https://posthog.com']).some(e => e.includes('not returned'))); });
test('missing references and duplicate IDs are rejected', () => { const copy = structuredClone(example); copy.evidence.push(copy.evidence[0]); copy.opportunities[0].evidenceIds.push('E99'); const errors = referenceErrors(copy); assert.ok(errors.some(e => e.includes('Duplicate'))); assert.ok(errors.some(e => e.includes('missing evidence'))); });
test('same evidence cannot support and oppose an experiment', () => { const copy = structuredClone(example); copy.opportunities[0].counterEvidenceIds = ['E1']; assert.ok(referenceErrors(copy).some(e => e.includes('same record'))); });
test('invalid calendar and future dates are rejected', () => { for (const date of ['2026-02-31', '2099-01-01']) {
    const copy = structuredClone(example);
    copy.evidence[0].date = date;
    assert.ok(referenceErrors(copy).some(e => e.includes('date')));
} });
test('URL deduplication strips tracking and fragments, preserving thread IDs', () => { assert.equal(canonicalUrl('https://posthog.com/?utm_source=test#x'), canonicalUrl('https://posthog.com')); assert.notEqual(canonicalUrl('https://news.ycombinator.com/item?id=1'), canonicalUrl('https://news.ycombinator.com/item?id=2')); });
test('sparse evidence does not become confident output', () => { const copy = { ...example, evidence: [], opportunities: [] }; const warnings = evidenceWarnings(copy); assert.ok(warnings.some(w => w.includes('No evidence'))); assert.ok(warnings.some(w => w.includes('No positive'))); });
test('export retains provenance, limitations, and proposed status', () => { const md = toMarkdown(example); assert.ok(md.includes('Mode: example')); assert.ok(md.includes(example.evidence[0].url)); assert.ok(md.includes('Counterevidence: E4')); assert.ok(md.includes('proposed, not launched')); });
