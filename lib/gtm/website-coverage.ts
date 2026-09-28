import { z } from 'zod';

const pageUrl=z.string().max(2048).url().refine(value=>{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}, 'Use a public HTTPS URL');
export const coverageSchema = z.object({
  version: z.literal(1), root: pageUrl, checkedAt: z.string().datetime(),
  indexing: z.literal('Unverified — search results and sitemaps are not a complete index report'),
  navigationDetected: z.boolean(), discoveryComplete: z.boolean(),
  pages: z.array(z.object({
    url: pageUrl, title: z.string(), required: z.boolean(),
    foundBy: z.enum(['Homepage', 'Navigation', 'Internal link', 'Sitemap', 'Search']),
    state: z.enum(['Discovered', 'Fetched', 'Reviewed', 'Blocked', 'Failed', 'Partial', 'Unsupported']),
    httpStatus: z.number().nullable(), note: z.string(),
    summary: z.string(), existing: z.array(z.string()).max(12),
  }).strict()).max(1000),
  checks: z.array(z.object({ url: pageUrl, outcome: z.string() }).strict()).max(100),
  limitations: z.array(z.string()).max(30),
}).strict();
export type WebsiteCoverage = z.infer<typeof coverageSchema>;
export type WebsitePage = WebsiteCoverage['pages'][number];

export function coverageBlockers(c: WebsiteCoverage | undefined): string[] {
  if (!c) return ['Website navigation has not been reviewed. Start a new research run.'];
  const blockers: string[] = [];
  if (!c.discoveryComplete) blockers.push('Website discovery is incomplete.');
  for(const gap of c.limitations.filter(x=>x.includes('Required navigation review is incomplete'))) blockers.push(gap);
  if (!c.navigationDetected) blockers.push('Navigation could not be verified from the available HTML. A rendered-browser review is required.');
  const unread = c.pages.filter(p => p.required && p.state !== 'Reviewed');
  if (unread.length) blockers.push(`${unread.length} required page(s) have not been reviewed.`);
  if (!c.pages.some(p => p.foundBy === 'Homepage' && p.state === 'Reviewed')) blockers.push('The homepage has not been reviewed.');
  return blockers;
}

export function coverageMarkdown(c: WebsiteCoverage) {
  return `\n## Website coverage\nChecked: ${c.checkedAt}\nIndexing: ${c.indexing}\n${coverageBlockers(c).join(' ') || 'Required discovered pages reviewed; this is not a claim that the entire website was read.'}\n\n${c.pages.map(p => `- [${p.state}] ${p.url} (${p.foundBy}${p.required ? ', required' : ''})\n  ${p.summary || p.note}\n  Already exists: ${p.existing.join('; ') || 'Not established.'}`).join('\n')}\n\nLimitations: ${c.limitations.join(' ')}\n`;
}
