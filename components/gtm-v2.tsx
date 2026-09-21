'use client';

import { Activity, ArrowRight, CheckCircle2, Crosshair, DollarSign, PlugZap, Route, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { caseCopy } from '@/lib/gtm/posthog-presentation';
import type { Opportunity, Report } from '@/lib/gtm/types';
import { adapters } from '@/lib/gtm/execution';
import { channels, evaluateOutcome, planQuality, type Operations, type Planner, type Trace } from '@/lib/gtm/operating';
import { evaluateReport, evaluationScenarios } from '@/lib/gtm/evaluation';

function EvidenceButton({ ids, onEvidence }: { ids: string[]; onEvidence: (ids: string[]) => void }) { return ids.length ? <button className="v3-evidence-link" onClick={() => onEvidence(ids)}>{ids.join(', ')} ↗</button> : <span className="v3-evidence-link muted">Evidence needed</span>; }

export function DecisionBrief({ report }: { report: Report }) {
  const decision = report.operatingPlan?.decision;
  if (!decision) return null;
  return <section className="decision-brief" aria-label="GTM decision brief">
    <div><span>Problem</span><strong>{decision.problem}</strong><small>{decision.evidenceIds.length ? `Grounded in ${decision.evidenceIds.join(', ')}` : 'Evidence link pending'}</small></div>
    <ArrowRight aria-hidden="true" />
    <div><span>Response</span><strong>{decision.intervention}</strong><small>Proposed intervention</small></div>
    <ArrowRight aria-hidden="true" />
    <div><span>When</span><strong>{decision.horizon}</strong><small>Starts after review and approval</small></div>
    <ArrowRight aria-hidden="true" />
    <div><span>Goal</span><strong>{decision.desiredOutcome}</strong><small>{decision.successMetric} · baseline {decision.baseline ?? 'needed'} · target {decision.target ?? 'needed'}</small></div>
  </section>;
}

export function ChannelBoard({ report }: { report: Report }) {
  const plans = report.operatingPlan?.channels ?? channels.map(channel => ({ channel, decision: 'Investigate' as const, rationale: 'Run research before allocating effort.', evidenceIds: [], dataNeeded: 'Channel performance and audience behavior.' }));
  return <div className="channel-board">{plans.map(plan => <article key={plan.channel} className="channel-row">
    <div><span className={`channel-decision ${plan.decision.toLowerCase()}`}>{plan.decision}</span><h3>{plan.channel}</h3></div>
    <p>{plan.rationale}</p>
    <small>{plan.dataNeeded}</small>
  </article>)}</div>;
}

export function ExperimentDesign({ opportunity }: { opportunity: Opportunity }) {
  const d = opportunity.design;
  if (!d) return <p className="muted">This manually authored experiment predates the V2 design rubric.</p>;
  return <div className="design-block">
    <div className="design-title"><span className={`ambition ${d.ambition.toLowerCase()}`}>{d.ambition}</span><span>{d.channel}</span>{d.budgetCap == null ? <span>Cap pending</span> : <span>Proposed cap ${d.budgetCap.toLocaleString()}</span>}</div>
    <div className="mechanism"><Sparkles size={18}/><div><b>The mechanism</b><p>{d.mechanism}</p><small>{d.differentBecause}</small></div></div>
    <dl className="experiment-spec"><div><dt>Smallest test</dt><dd>{d.smallestTest}</dd></div><div><dt>Run window</dt><dd>{d.durationDays} days</dd></div><div><dt>Stop rule</dt><dd>{d.stopRule}</dd></div><div><dt>Primary signal</dt><dd>{d.primaryMetric}</dd></div><div><dt>Guardrail</dt><dd>{d.guardrail}</dd></div></dl>
  </div>;
}

export function ExecutionBoard({ report, operations, canPrepare, onPrepare }: { report: Report; operations: Operations; canPrepare: boolean; onPrepare: (opportunity: Opportunity) => void }) {
  return <div className="execution-layout">
    <section>
      <div className="section-title"><div><h2>Execution queue</h2><p className="muted">Prepare the exact artifact, owner, window and cap before connecting a channel.</p></div></div>
      {report.opportunities.map(opportunity => {
        const task = operations.tasks.find(item => item.experimentId === opportunity.id);
        return <article className="panel execution-card" key={opportunity.id}><div><span className="eyebrow">{opportunity.id} · {opportunity.design?.channel ?? opportunity.stage}</span><h3>{opportunity.title}</h3><p>{task ? `${task.owner} · ${task.startDate} to ${task.dueDate} · cap $${task.budgetCap.toLocaleString()}` : 'No execution pack prepared.'}</p></div>{task ? <span className="ready"><CheckCircle2 size={16}/>{task.status}</span> : <button disabled={!canPrepare} onClick={() => onPrepare(opportunity)}>Prepare execution</button>}</article>;
      })}
      {!report.opportunities.length && <div className="empty-inline">A supported experiment is required before execution.</div>}
    </section>
    <aside className="panel connector-panel"><p className="eyebrow">DATA & ACTION ADAPTERS</p><h2>Connector contracts</h2><p className="muted">Read performance data first. Write actions require an approved audience, artifact, schedule and spend cap.</p>{adapters.map(adapter => <div className="adapter" key={adapter.id}><PlugZap size={16}/><div><b>{adapter.name}</b><small>{adapter.read}</small></div><span>{adapter.status}</span></div>)}</aside>
    {operations.outcomes.length > 0 && <section className="panel outcomes"><h2>Measured outcomes</h2>{operations.outcomes.map(outcome => { const result = evaluateOutcome(outcome); return <div key={outcome.id}><b>{outcome.metric}</b><span>{result.baseline.toFixed(1)}% → {result.test.toFixed(1)}% ({result.liftPp >= 0 ? '+' : ''}{result.liftPp.toFixed(1)} pp)</span><strong>{result.verdict}</strong><small>{result.limitation}</small></div>; })}</section>}
  </div>;
}

const roles = [
  ['Planner', 'Frames the bottleneck and assigns research across all channels.'],
  ['Researcher', 'Collects official sources, user signals and counterevidence.'],
  ['Strategist', 'Creates an evidence-linked channel portfolio and experiments.'],
  ['Creative critic', 'Challenges generic ideas and defines the cheapest disproof.'],
  ['Evidence auditor', 'Withholds unsupported claims before the plan is published.'],
] as const;

export function SystemBoard({ planner, traces, report }: { planner: Planner | null; traces: Trace[]; report: Report }) {
  const checks = planQuality(report.opportunities);
  return <div className="system-layout">
    <section className="panel system-map"><div className="system-heading"><div><p className="eyebrow">ORCHESTRATION</p><h2>5 specialized AI roles</h2></div><span><ShieldCheck size={16}/> Deterministic coordinator</span></div><p className="muted">The coordinator controls stage order, validation, checkpoints and retries. Roles run sequentially against saved state; they are not a free-form swarm.</p><div className="role-flow">{roles.map(([name, description], index) => <div key={name}><span>{index + 1}</span><b>{name}</b><small>{description}</small></div>)}</div></section>
    <section className="panel"><p className="eyebrow">PLANNER OUTPUT</p><h2>{planner?.bottleneckHypothesis ?? 'Planner runs at the start of a live study'}</h2>{planner ? <><p>{planner.objective}</p><h3>Data gaps</h3><ul>{planner.dataGaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul></> : <p className="muted">The example demonstrates the final operating plan. A live run stores the planner’s questions and seven-channel assignments here.</p>}</section>
    <section className="panel"><p className="eyebrow">QUALITY GATES</p><h2>Experiment completeness</h2>{checks.map(item => <div className="quality-row" key={item.id}><b>{item.id}</b><span>{item.checks.filter(check => check.pass).length}/{item.checks.length} checks passed</span></div>)}<small>These gates check structure. They do not prove originality, causality or market impact.</small></section>
    <section className="panel"><p className="eyebrow">RUN TRACE</p><h2>Observable stage history</h2>{traces.length ? traces.slice().reverse().map((trace, index) => <div className="trace-row" key={`${trace.at}-${index}`}><Activity size={15}/><div><b>{trace.phase}</b><small>{trace.signal}</small></div><span className={trace.status}>{trace.status} · {(trace.durationMs / 1000).toFixed(1)}s</span></div>) : <p className="muted">No live stages have run for this study.</p>}</section>
  </div>;
}

export function PressureTestBoard({ planner, traces, report, onEvidence }: { planner: Planner | null; traces: Trace[]; report: Report; onEvidence: (ids: string[]) => void }) {
  const plan = report.commercialPlan;
  const result = evaluateReport(report);
  const primaryAttack = plan?.competitivePressures.find(item => item.threat === 'High') ?? plan?.competitivePressures[0];
  if (!plan) return <div className="v3-stack"><section className="panel pressure-empty"><Crosshair size={26}/><h2>Commercial pressure test needs research</h2><p>Complete a live strategy run to map competitive attacks, defensible assets, KPIs, pipeline logic, test economics, and a 90-day roadmap.</p></section><details className="panel eval-architecture"><summary>Inspect system quality</summary><SystemBoard planner={planner} traces={traces} report={report}/></details></div>;
  return <div className="v3-stack pressure-workspace">
    <section className="pressure-hero panel"><div><p className="eyebrow">COMPETITIVE PRESSURE TEST</p><h2>{primaryAttack ? `${primaryAttack.attacker} could exploit this vulnerability` : 'No evidence-bound competitive attack yet'}</h2><p>{primaryAttack ? `${primaryAttack.vulnerability} Likely move: ${primaryAttack.likelyMove}` : 'Research how a credible competitor could exploit the company’s current positioning, motion, or funnel.'}</p><div className="pressure-response"><span>Recommended response</span><b>{primaryAttack?.response ?? 'Collect competitor and loss evidence before choosing a response.'}</b></div></div><aside><span className={`pressure-level ${(primaryAttack?.threat ?? 'Low').toLowerCase()}`}>{primaryAttack?.threat ?? 'Low'} threat</span><small>Early warning signal</small><p>{primaryAttack?.leadingSignal ?? 'No signal defined.'}</p><EvidenceButton ids={primaryAttack?.evidenceIds ?? []} onEvidence={onEvidence}/></aside></section>

    <section><div className="v3-section-heading"><div><p className="eyebrow">MEASUREMENT CHAIN</p><h2>{caseCopy(report, 'What must move before pipeline moves', 'Attention is nice. What happens next?')}</h2></div><span className="v3-status hypothesis">Baseline required before launch</span></div><div className="commercial-kpis"><article><TrendingUp size={18}/><span>North star KPI</span><b>{plan.northStar}</b></article><article><span>Current baseline</span><b>{plan.baseline ?? 'Connect data'}</b></article><article><span>Decision target</span><b>{plan.target ?? 'Set after baseline'}</b></article><article><span>Attribution window</span><b>{plan.attributionWindow}</b></article></div><div className="panel pipeline-model"><div><p className="eyebrow">PIPELINE LOGIC</p><h3>{plan.pipelineOutcome}</h3><p>{plan.pipelineLogic}</p><small>Source of truth: {plan.sourceOfTruth}</small></div><Route size={34}/></div><div className="leading-grid">{plan.leadingIndicators.map(item => <article className="panel" key={item.name}><span>{item.name}</span><b>{item.signal}</b><small>{item.source}</small></article>)}</div></section>

    <section><div className="v3-section-heading"><div><p className="eyebrow">TEST ECONOMICS</p><h2>{caseCopy(report, 'Cost the experiment, then judge affordability', 'Weird ideas still need a receipt.')}</h2><p className="muted">A test cap estimates what this design requires. It is not inferred CAC, company budget, or expected return.</p></div></div><div className="economics-grid">{report.opportunities.map(item => <article className="panel" key={item.id}><header><span>{item.priority ?? 'Later'} · {item.id}</span><DollarSign size={18}/></header><h3>{item.title}</h3><strong>{item.design?.budgetCap == null ? 'Estimate required' : `$${item.design.budgetCap.toLocaleString()} proposed cap`}</strong><p>{item.design?.smallestTest ?? item.validation}</p><small>{item.design?.durationDays ?? '—'} days · {item.design?.primaryMetric ?? item.metric}</small></article>)}</div><p className="cost-principle">{plan.costPrinciple}</p></section>

    <section><div className="v3-section-heading"><div><p className="eyebrow">ATTACK MAP</p><h2>{caseCopy(report, 'How a competitor could use the same evidence', 'If we worked for the competition…')}</h2></div></div><div className="attack-list">{plan.competitivePressures.map(item => <article className="panel" key={item.id}><header><span>{item.id}</span><em className={item.threat.toLowerCase()}>{item.threat}</em></header><div><small>Attacker</small><h3>{item.attacker}</h3></div><div><small>Exposed belief</small><p>{item.vulnerability}</p></div><ArrowRight size={18}/><div><small>Likely move</small><p>{item.likelyMove}</p></div><div className="attack-counter"><small>Counter-move</small><b>{item.response}</b></div></article>)}</div></section>

    <section className="defense-roadmap"><div><div className="v3-section-heading"><div><p className="eyebrow">DEFENSIBILITY</p><h2>{caseCopy(report, 'Assets that may be harder to copy', 'What survives being copied?')}</h2></div></div><div className="defense-list">{plan.defensibility.map(item => <article className="panel" key={item.asset}><ShieldCheck size={19}/><div><h3>{item.asset}</h3><p>{item.whyHardToCopy}</p><small><b>Proof needed:</b> {item.proofNeeded}</small></div></article>)}</div></div><div><div className="v3-section-heading"><div><p className="eyebrow">90-DAY ROADMAP</p><h2>{caseCopy(report, 'Evidence unlocks the next bet', 'Earn the next 30 days.')}</h2></div></div><div className="roadmap-list">{plan.roadmap.map((item, index) => <article className="panel" key={item.horizon}><span>0{index + 1}</span><div><em>{item.horizon}</em><h3>{item.objective}</h3><p>{item.decisionGate}</p><small>{item.experimentIds.join(' · ') || 'No experiment assigned'}</small></div></article>)}</div></div></section>

    <details className="panel eval-architecture"><summary>System quality and methodology · {result.score}/100</summary><div className="qa-compact"><div className="eval-dimensions">{result.dimensions.map(item => <article className="panel eval-dimension" key={item.id}><div><span className={`eval-status ${item.status.toLowerCase()}`}>{item.status}</span><strong>{item.score === null ? '—' : item.score}</strong></div><h3>{item.label}</h3><small>{item.nextAction}</small></article>)}</div><div className="eval-scenarios">{evaluationScenarios.map(item => <article className="panel" key={item.id}><header><span>{item.id}</span><em>{item.state}</em></header><h3>{item.name}</h3><small>{item.expectedBehavior}</small></article>)}</div><SystemBoard planner={planner} traces={traces} report={report}/></div></details>
  </div>;
}
