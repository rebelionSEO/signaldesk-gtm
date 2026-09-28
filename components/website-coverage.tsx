'use client';
import { coverageBlockers, type WebsiteCoverage } from '@/lib/gtm/website-coverage';
export function WebsiteCoverageView({ coverage }: {coverage?: WebsiteCoverage}) {
  const blockers=coverageBlockers(coverage);
  return <details className="panel website-coverage">
    <summary>Website coverage · {coverage ? `${coverage.pages.filter(p=>p.state==='Reviewed').length} reviewed / ${coverage.pages.length} discovered` : 'Not checked'}{blockers.length ? ' · incomplete' : ' · required pages reviewed'}</summary>
    <p>Finding a link is not the same as reading its page. Company claims are not independently verified.</p>
    {blockers.map(gap=><p key={gap}><strong>{gap}</strong></p>)}
    {coverage && <><p>{coverage.indexing}</p>
      <ul>{coverage.limitations.map(note=><li key={note}>{note}</li>)}</ul>
      <details><summary>Sitemap and robots checks</summary>{coverage.checks.map((check,i)=><p key={i}>{check.url}: {check.outcome}</p>)}</details>
      <div className="coverage-pages">{coverage.pages.map(page=><details key={page.url}><summary>{page.state} · {page.title || page.url}{page.required?' · required':''}</summary>
        <a href={page.url} target="_blank" rel="noopener noreferrer">Open page ↗</a><p>Found through: {page.foundBy}. {page.httpStatus ? `HTTP ${page.httpStatus}.` : ''} {page.note}</p><p>{page.summary}</p>
        <ul>{page.existing.map(item=><li key={item}>{item}</li>)}</ul>
      </details>)}</div></>}
  </details>;
}
