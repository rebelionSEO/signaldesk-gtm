'use client';

import { Activity, ArrowRight, CheckCircle2, CircleAlert, FlaskConical, PlugZap, ShieldCheck, Sparkles } from 'lucide-react';
import type { Opportunity, Report } from '@/lib/gtm/types';
import { adapters } from '@/lib/gtm/execution';
import { channels, evaluateOutcome, planQuality, type Operations, type Planner, type Trace } from '@/lib/gtm/operating';
import { evaluateReport, evaluationScenarios } from '@/lib/gtm/evaluation';

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

export function EvaluationBoard({ planner, traces, report }: { planner: Planner | null; traces: Trace[]; report: Report }) {
  const result = evaluateReport(report);
  const passed = result.gates.filter(gate => gate.pass).length;
  return <div className="v3-stack eval-workspace">
    <section className="eval-hero panel">
      <div><p className="eyebrow">SYSTEM QA / DETERMINISTIC BASELINE</p><h2>Can this strategy survive review?</h2><p>Signaldesk grades the report before anyone treats it as a plan. The score tests discipline and completeness; it does not claim the market diagnosis is true.</p></div>
      <div className={`eval-score ${result.status === 'Ready for review' ? 'ready' : result.status === 'Blocked' ? 'blocked' : 'review'}`}><strong>{result.score}</strong><span>/ 100</span><b>{result.status}</b><small>{passed}/{result.gates.length} hard gates passed</small></div>
    </section>
    <section><div className="v3-section-heading"><div><p className="eyebrow">WEIGHTED RUBRIC</p><h2>Why the score moved</h2></div><span className="muted">Stability unlocks after 3 comparable live runs</span></div><div className="eval-dimensions">{result.dimensions.map(item => <article className="panel eval-dimension" key={item.id}><div><span className={`eval-status ${item.status.toLowerCase()}`}>{item.status}</span><strong>{item.score === null ? '—' : item.score}</strong></div><h3>{item.label}</h3><p>{item.explanation}</p><small><b>Next:</b> {item.nextAction}</small></article>)}</div></section>
    <section className="eval-grid"><div className="panel eval-gates"><p className="eyebrow">NON-NEGOTIABLE GATES</p><h2>Failures block promotion</h2>{result.gates.map(gate => <div key={gate.name} className={gate.pass ? 'pass' : 'fail'}>{gate.pass ? <CheckCircle2 size={18}/> : <CircleAlert size={18}/>}<div><b>{gate.name}</b><p>{gate.detail}</p></div></div>)}</div><div className="panel eval-protocol"><FlaskConical size={23}/><p className="eyebrow">LIVE MODEL PROTOCOL</p><h2>What still needs real runs</h2><ol><li>Freeze one brief and source set.</li><li>Run it three times with the same model and prompt.</li><li>Compare claims, sources, Now bet, cost, and latency.</li><li>Review drift and failed gates before promoting a prompt.</li></ol><p className="muted">No stability score is invented when comparable run history is unavailable.</p></div></section>
    <section><div className="v3-section-heading"><div><p className="eyebrow">REGRESSION SUITE</p><h2>Five conditions the system must handle</h2><p className="muted">Each case protects a different GTM failure mode. A fixture proves deterministic behavior; a specification defines the next live evaluation.</p></div></div><div className="eval-scenarios">{evaluationScenarios.map(item => <article className="panel" key={item.id}><header><span>{item.id}</span><em>{item.state}</em></header><h3>{item.name}</h3><p>{item.stress}</p><small>{item.expectedBehavior}</small></article>)}</div></section>
    <details className="panel eval-architecture"><summary>Inspect the five-agent architecture and run trace</summary><SystemBoard planner={planner} traces={traces} report={report}/></details>
  </div>;
}
