import type { Report } from './types.ts';
import { channels } from './operating.ts';
import { canonicalUrl, referenceErrors } from './validation.ts';

export type EvaluationStatus = 'Strong' | 'Review' | 'Fail' | 'Unmeasured';
export type EvaluationDimension = {
  id: 'evidence' | 'specificity' | 'originality' | 'benchmarks' | 'actionability' | 'stability';
  label: string; score: number | null; weight: number; status: EvaluationStatus; explanation: string; nextAction: string;
};
export type EvaluationGate = { name: string; pass: boolean; detail: string };
export type EvaluationResult = { score: number; status: 'Ready for review' | 'Needs revision' | 'Blocked'; dimensions: EvaluationDimension[]; gates: EvaluationGate[]; measuredWeight: number };
export type EvaluationScenario = { id: string; name: string; stress: string; expectedBehavior: string; state: 'Fixture ready' | 'Specification ready' };

export const evaluationScenarios: EvaluationScenario[] = [
  { id: 'S1', name: 'Developer-led PLG', stress: 'Rich public evidence and an unconventional brand.', expectedBehavior: 'Preserve self-service behavior, expose uncertainty, and produce a testable bold mechanism.', state: 'Fixture ready' },
  { id: 'S2', name: 'Crowded CRM', stress: 'Many category leaders and saturated playbooks.', expectedBehavior: 'Separate direct peers from creative references and find whitespace without copying category conventions.', state: 'Specification ready' },
  { id: 'S3', name: 'Sales-led enterprise', stress: 'Long cycle, multiple buyers, and assisted conversion.', expectedBehavior: 'Prioritize account progression and buying-group evidence over superficial lead volume.', state: 'Specification ready' },
  { id: 'S4', name: 'Sparse-evidence startup', stress: 'Little public discussion and no reliable benchmarks.', expectedBehavior: 'Withhold confident diagnosis, leave ranges blank, and recommend discovery before spend.', state: 'Specification ready' },
  { id: 'S5', name: 'Conflicting evidence', stress: 'Positive and negative signals support different decisions.', expectedBehavior: 'Show counterevidence, lower confidence, and design the cheapest discriminating test.', state: 'Specification ready' },
];

const complete = (value: string | null | undefined) => Boolean(value?.trim());
const cap = (score: number) => Math.max(0, Math.min(100, Math.round(score)));
const statusFor = (score: number): EvaluationStatus => score >= 80 ? 'Strong' : score >= 55 ? 'Review' : 'Fail';
const unique = (values: string[]) => new Set(values.map(value => value.trim().toLowerCase()).filter(Boolean)).size;
const genericPattern = /\b(webinar|ebook|landing page|case stud(?:y|ies)|thought leadership|email sequence|linkedin posts?|seo content)\b/i;

export function evaluateReport(report: Report, repeatedReports: Report[] = []): EvaluationResult {
  const errors = referenceErrors(report);
  const evidenceIds = new Set(report.evidence.map(item => item.id));
  const uniqueUrls = unique(report.evidence.map(item => canonicalUrl(item.url)));
  const linkedFacts = (report.marketContext?.facts ?? []).filter(item => item.status !== 'Unknown').every(item => item.evidenceIds.length > 0 && item.evidenceIds.every(id => evidenceIds.has(id)));
  const evidenceScore = cap(Math.min(report.evidence.length, 5) * 4 + Math.min(uniqueUrls, 3) * 7 + (report.evidence.some(item => item.kind === 'positive') ? 14 : 0) + (report.evidence.some(item => item.kind === 'complaint') ? 10 : 0) + (report.evidence.length > 0 && report.evidence.every(item => complete(item.limitation)) ? 15 : 0) + (errors.length === 0 ? 10 : 0) + (linkedFacts ? 10 : 0));

  const briefFields = [report.brief.industry, report.brief.businessModel, report.brief.gtmMotion, report.brief.companyStage, report.brief.geography].filter(complete).length;
  const designs = report.opportunities.filter(item => item.design);
  const decision = report.operatingPlan?.decision;
  const specificityScore = cap(briefFields * 4 + (decision && [decision.problem, decision.intervention, decision.desiredOutcome, decision.horizon, decision.successMetric].every(complete) ? 25 : 0) + (report.assumptions?.length ? 15 : 0) + (report.opportunities.length > 0 && report.opportunities.every(item => complete(item.behavior) && complete(item.territory)) ? 20 : 0) + (designs.length === report.opportunities.length && designs.every(item => complete(item.design?.smallestTest) && complete(item.design?.primaryMetric)) ? 20 : 0));

  const ambition = new Set(designs.map(item => item.design?.ambition));
  const territories = unique(report.opportunities.map(item => item.territory ?? ''));
  const distinctReasons = unique(designs.map(item => item.design?.differentBecause ?? ''));
  const genericOnly = designs.filter(item => genericPattern.test(`${item.title} ${item.action}`) && !complete(item.design?.differentBecause)).length;
  const originalityScore = cap(Math.min(ambition.size, 3) * 8 + Math.min(territories, Math.max(report.opportunities.length, 1)) / Math.max(report.opportunities.length, 1) * 22 + Math.min(distinctReasons, Math.max(designs.length, 1)) / Math.max(designs.length, 1) * 20 + (designs.length > 0 && designs.every(item => complete(item.design?.mechanism)) ? 18 : 0) + (designs.length > 0 && designs.every(item => complete(item.design?.smallestTest) && complete(item.design?.stopRule)) ? 16 : 0) - genericOnly * 12);

  const benchmark = report.benchmarkProfile;
  const peerRoles = new Set(benchmark?.peers.map(peer => peer.role) ?? []);
  const metricHonesty = benchmark?.metrics.every(metric => metric.observedRange === null || (metric.evidenceIds.length > 0 && complete(metric.definition) && complete(metric.freshness) && complete(metric.limitation))) ?? false;
  const benchmarkScore = cap((benchmark ? 10 : 0) + (benchmark && [benchmark.category, benchmark.businessModel, benchmark.gtmMotion, benchmark.companyStage, benchmark.geography].every(complete) ? 20 : 0) + Math.min(peerRoles.size, 4) * 5 + (benchmark?.metrics.length && benchmark.metrics.every(metric => complete(metric.definition) && complete(metric.unit)) ? 15 : 0) + (metricHonesty ? 20 : 0) + (benchmark?.conventions.length && benchmark.whitespace.length ? 15 : 0));

  const nowCount = report.opportunities.filter(item => item.priority === 'Now').length;
  const actionabilityScore = cap((decision ? 20 : 0) + (nowCount === 1 ? 15 : 0) + (report.opportunities.length > 0 && report.opportunities.every(item => complete(item.owner)) ? 10 : 0) + (designs.length === report.opportunities.length && designs.length > 0 ? 20 : 0) + (designs.length > 0 && designs.every(item => item.design?.budgetCap != null && complete(item.design?.guardrail) && complete(item.design?.stopRule)) ? 20 : 0) + (report.operatingPlan?.channels.length === channels.length ? 15 : 0));

  let stabilityScore: number | null = null;
  if (repeatedReports.length >= 2) {
    const runs = [report, ...repeatedReports];
    const allValid = runs.every(item => referenceErrors(item).length === 0);
    const nowTitles = runs.map(item => item.opportunities.find(opportunity => opportunity.priority === 'Now')?.title ?? '');
    const thesisPresent = runs.every(item => complete(item.marketContext?.thesis));
    stabilityScore = cap((allValid ? 45 : 0) + (thesisPresent ? 20 : 0) + (unique(nowTitles) <= Math.ceil(runs.length / 2) ? 35 : 10));
  }

  const dimensions: EvaluationDimension[] = [
    { id: 'evidence', label: 'Evidence integrity', score: evidenceScore, weight: 25, status: statusFor(evidenceScore), explanation: 'Checks source diversity, opposing evidence, limitations, references, and the link between claims and records.', nextAction: evidenceScore >= 80 ? 'Manually verify the most decision-critical source summaries.' : 'Add independent sources, counterevidence, and explicit limitations.' },
    { id: 'specificity', label: 'Strategic specificity', score: specificityScore, weight: 20, status: statusFor(specificityScore), explanation: 'Checks whether the brief, problem, behavior, mechanism, metric, and uncertainty are concrete.', nextAction: specificityScore >= 80 ? 'Replace outside-in assumptions with internal baselines.' : 'Name one behavior, baseline, target, audience, and decision window.' },
    { id: 'originality', label: 'Originality with a mechanism', score: originalityScore, weight: 20, status: statusFor(originalityScore), explanation: 'Rewards distinct territories, ambition range, a causal mechanism, and a cheap disproof rather than novelty alone.', nextAction: originalityScore >= 80 ? 'Test whether the unusual mechanism changes qualified behavior.' : 'Transform generic formats into audience-specific mechanisms with a stop rule.' },
    { id: 'benchmarks', label: 'Benchmark validity', score: benchmarkScore, weight: 15, status: statusFor(benchmarkScore), explanation: 'Checks cohort definition, peer roles, metric comparability, freshness, limitations, and honest missing ranges.', nextAction: benchmarkScore >= 80 ? 'Source peer ranges with matching definitions and reporting windows.' : 'Build a four-role peer set and avoid unsupported numeric ranges.' },
    { id: 'actionability', label: 'Execution readiness', score: actionabilityScore, weight: 20, status: statusFor(actionabilityScore), explanation: 'Checks prioritization, channel coverage, ownership, cap, duration, metric, guardrail, and stop rule.', nextAction: actionabilityScore >= 80 ? 'Approve only the current Now test after baseline review.' : 'Select one Now bet and complete its execution contract.' },
    { id: 'stability', label: 'Repeated-run stability', score: stabilityScore, weight: 0, status: stabilityScore === null ? 'Unmeasured' : statusFor(stabilityScore), explanation: 'Compares multiple live runs for structural validity and recommendation consistency.', nextAction: stabilityScore === null ? 'Run the same frozen brief at least three times after the AI connection is configured.' : 'Review material recommendation drift before promoting a prompt.' },
  ];
  const gates: EvaluationGate[] = [
    { name: 'Reference integrity', pass: errors.length === 0, detail: errors.length ? `${errors.length} broken or invalid reference${errors.length === 1 ? '' : 's'}.` : 'All internal evidence references resolve.' },
    { name: 'Counterevidence', pass: report.evidence.some(item => item.kind === 'positive') && report.evidence.some(item => item.kind === 'complaint'), detail: 'A directional strategy must include both supporting and opposing market signals.' },
    { name: 'Benchmark honesty', pass: Boolean(benchmark && metricHonesty), detail: 'Numeric ranges require evidence, definition, freshness, and limitations; unavailable ranges stay blank.' },
    { name: 'Controlled execution', pass: nowCount === 1 && designs.length === report.opportunities.length && designs.every(item => item.design?.budgetCap != null && complete(item.design?.stopRule) && complete(item.design?.guardrail)), detail: 'Exactly one Now bet must have a cap, stop rule, and guardrail before preparation.' },
  ];
  const measured = dimensions.filter(item => item.score !== null && item.weight > 0);
  const measuredWeight = measured.reduce((sum, item) => sum + item.weight, 0);
  const score = Math.round(measured.reduce((sum, item) => sum + (item.score ?? 0) * item.weight, 0) / Math.max(measuredWeight, 1));
  const failedGates = gates.filter(gate => !gate.pass).length;
  return { score, measuredWeight, dimensions, gates, status: failedGates > 1 ? 'Blocked' : failedGates === 1 || score < 80 ? 'Needs revision' : 'Ready for review' };
}
