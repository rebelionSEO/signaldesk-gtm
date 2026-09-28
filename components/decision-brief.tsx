'use client';

import type { Report } from '@/lib/gtm/types';

export function DecisionBriefView({ report, onNavigate, onEvidence }: {
  report: Report; onNavigate: (tab: string) => void; onEvidence: (ids: string[]) => void;
}) {
  const brief = report.decisionBrief;
  const first = brief?.recommendedExperimentId
    ? report.opportunities.find(o => o.id === brief.recommendedExperimentId) : undefined;
  return <section className="panel sd-decision-brief" aria-label="Decision brief">
    <p className="eyebrow">{report.brief.company} / START HERE</p>
    <h2>What deserves attention?</h2>
    {brief ? <>
      <span className="badge">{brief.status} · {report.mode === 'example' ? 'Illustrative study' : 'Review before acting'}</span>
      <p className="decision-finding">{brief.finding}</p>
      <div className="decision-grid">
        <div><h3>The evidence</h3>{brief.evidenceIds.map(id => {
          const source = report.evidence.find(e => e.id === id);
          return source ? <div key={id}><p>{source.summary}</p><button className="v3-evidence-link" onClick={() => onEvidence([id])}>{source.title} ↗</button></div> : null;
        })}</div>
        <div><h3>Why it matters</h3><p>{brief.whyItMatters}</p><h3>What we still need to confirm</h3><p>{brief.nextQuestion}</p>
          <details><summary>What else could explain this?</summary><ul>{brief.alternativeExplanations.map(reason => <li key={reason}>{reason}</li>)}</ul></details>
        </div>
      </div>
      <div className="decision-next"><h3>{first ? `Try first: ${first.title}` : 'First, collect more evidence'}</h3><p>{first?.design?.smallestTest ?? brief.nextQuestion}</p><p><strong>Why first:</strong> {brief.whyFirst}</p>
        {first && <><dl className="decision-measures">
          <div><dt>Business measure</dt><dd>{first.design?.primaryMetric ?? first.metric}</dd></div>
          <div><dt>Estimated test budget</dt><dd>{first.design?.budgetCap == null ? 'Estimate before approval' : `USD ${first.design.budgetCap.toLocaleString()} · proposed cap`}</dd></div>
          <div><dt>Owner and review</dt><dd>{first.owner} · {first.design ? `review ${first.design.durationDays} days after launch` : 'set a review date before launch'}</dd></div>
        </dl><details><summary>Early signal and stop rule</summary><p>{first.validation}</p><p>{first.design?.stopRule}</p><p>{first.design?.guardrail}</p></details>
        <button className="primary" onClick={() => onNavigate('plan')}>Review the experiments</button></>}
      </div>
    </> : <><p>A short decision brief has not been reviewed for this study yet.</p><p>{report.summary}</p><button className="secondary" onClick={() => onNavigate('evidence')}>Review the evidence</button></>}
  </section>;
}
