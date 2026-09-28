import { z } from 'zod';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { resolve4, resolve6 } from 'node:dns/promises';
import { isIP } from 'node:net';
import { coverageBlockers, type WebsiteCoverage, type WebsitePage } from './website-coverage.ts';

type Node = DefaultTreeAdapterMap['node'];
const business = /testimon|case.stud|\/results|\/portfolio|\/industr|\/services?|\/solutions?|\/products?|\/pricing|\/about|\/why-|\/customers?|\/resources?|\/contact|\/careers?|\/team|\/books?|\/events?/i;
const asset = /\.(?:png|jpe?g|webp|gif|svg|ico|css|js|woff2?|ttf|zip|mp[34]|webm)(?:$|\?)/i;
const excluded = /\/(?:logout|signout|cart|checkout|wp-admin|wp-login)(?:[/.?]|$)/i;
const MAX_PAGES = 1000, MAX_READ = 120, MAX_SITEMAPS = 16;
export type CrawlState = {
  coverage: WebsiteCoverage; sitemapQueue: string[]; sitemapsSeen: string[];
  robots: string; robotsReady: boolean; reads: number;
  // Only the current batch has page bodies; persist the reviewed inventory, not raw website text.
  pending: {url: string; text: string}[];
};
export type ReadResult = {status: number; url: string; text: string; contentType: string; truncated: boolean};
export type Reader = (url: string, root: string) => Promise<ReadResult>;

export function normalizePage(value: string, base: string): string | null {
  try {
    const u = new URL(value, base), origin = new URL(base);
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return null;
    if (u.hostname.replace(/^www\./, '') !== origin.hostname.replace(/^www\./, '')) return null;
    if (isIP(u.hostname) || !u.hostname.includes('.') || /(?:\.local|\.internal|\.localhost|\.test)$/.test(u.hostname)) return null;
    if (asset.test(u.pathname) || excluded.test(u.pathname)) return null;
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/.test(key)) u.searchParams.delete(key);
    // Arbitrary query navigation can submit searches or create infinite faceted crawls.
    if (u.search) return null;
    return u.href.replace(/\/$/, u.pathname === '/' ? '/' : '');
  } catch { return null; }
}

function attrs(node: Node): Record<string, string> {
  return 'attrs' in node ? Object.fromEntries(node.attrs.map(a => [a.name, a.value])) : {};
}
function tag(node: Node) { return 'tagName' in node ? node.tagName : ''; }
function children(node: Node): Node[] { return 'childNodes' in node ? node.childNodes : []; }
function textOf(node: Node): string {
  if (['script','style','noscript','svg','template'].includes(tag(node))) return '';
  if ('value' in node) return node.value;
  return children(node).map(textOf).join(' ');
}
export function inspectHtml(html: string, url: string) {
  const doc = parse(html); let title = '', navigationDetected = false;
  const links: {url: string; navigation: boolean}[] = [];
  const nodesById=new Map<string,Node>(); const menuControls: string[]=[];
  function collect(node:Node){const a=attrs(node);if(a.id)nodesById.set(a.id,node);for(const child of children(node))collect(child);}
  collect(doc);
  const foreignNavigation: string[] = [];
  function walk(node: Node, navigation = false) {
    const a = attrs(node), name = tag(node);
    const nav = navigation || ['nav','header'].includes(name) || a.role === 'navigation' || /(?:^|[\s_-])(?:nav|menu)(?:[\s_-]|$)/i.test(`${a.class ?? ''} ${a.id ?? ''}`);
    if(nav && name==='button' && a['aria-controls'] && !/search/i.test(`${a['aria-label']??''} ${textOf(node)}`)) menuControls.push(...a['aria-controls'].split(/\s+/));
    if (name === 'title') title = textOf(node).trim();
    if (name === 'a' && a.href && !a.href.startsWith('#')) {
      const href = normalizePage(a.href, url);
      if (href) { links.push({url: href, navigation: nav}); if (nav) navigationDetected = true; }
      else if (nav && /^https?:/i.test(a.href)) foreignNavigation.push(a.href);
    }
    for (const child of children(node)) walk(child, nav);
  }
  walk(doc);
  const text = textOf(doc).replace(/\s+/g, ' ').trim();
  function hasLink(node:Node):boolean{return tag(node)==='a'&&!!attrs(node).href || children(node).some(hasLink);}
  const unresolvedMenus=menuControls.some(id=>!nodesById.has(id)||!hasLink(nodesById.get(id)!));
  return {title, text, links, foreignNavigation, navigationDetected, unresolvedMenus};
}

// Sitemap loc values are XML text, not executable HTML. No external entity expansion.
export function sitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<(?:[\w-]+:)?loc\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?loc>/gi)].map(m => m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim());
}
export function robotAllowed(robots: string, url: string) {
  const groups: {agents: string[]; rules: {allow: boolean; path: string}[]}[] = [];
  let group = {agents: [] as string[], rules: [] as {allow: boolean; path: string}[]};
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim(); const pos = line.indexOf(':'); if (pos < 0) continue;
    const key = line.slice(0,pos).toLowerCase(), value = line.slice(pos+1).trim();
    if (key === 'user-agent') {
      if (group.rules.length) { groups.push(group); group = {agents: [], rules: []}; }
      group.agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && value) group.rules.push({allow: key === 'allow', path: value});
  }
  groups.push(group);
  const specific = groups.filter(g => g.agents.some(a => a !== '*' && 'signaldeskbot'.includes(a)));
  const chosen = specific.length ? specific : groups.filter(g => g.agents.includes('*'));
  const path = new URL(url).pathname;
  const matched = chosen.flatMap(g => g.rules).filter(r => {
    const pattern = r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$');
    return new RegExp('^' + pattern).test(path);
  }).sort((a,b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return matched[0]?.allow ?? true;
}

export function publicAddress(ip: string) {
  if (isIP(ip) === 4) {
    const [a,b] = ip.split('.').map(Number);
    return a !== 0 && a !== 10 && a !== 127 && a !== 169 && a !== 192 && !(a === 172 && b >= 16 && b <= 31) && !(a === 100 && b >= 64 && b <= 127) && !(a === 198 && (b === 18 || b === 19 || b === 51)) && !(a === 203 && b === 0) && a < 224;
  }
  return isIP(ip) === 6 && /^2[0-9a-f]{3}:/i.test(ip) && !/^2001:(?:db8|0*0|10|20):/i.test(ip) && !/^2002:/i.test(ip);
}
export function createPublicReader(transport: typeof fetch = fetch, lookup: (host:string)=>Promise<string[]> = async host => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([
    Promise.allSettled([resolve4(host), resolve6(host)]).then(results=>results.flatMap(r=>r.status==='fulfilled'?r.value:[])),
    new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('DNS timeout')),4000);}),
  ]); } finally { clearTimeout(timer); }
}): Reader { return async (initial, root) => {
  const normalized = normalizePage(initial, root);
  if (!normalized) throw new Error('Out-of-scope or unsafe URL');
  let url: string = normalized;
  for (let redirects = 0; redirects <= 4; redirects++) {
    const host = new URL(url).hostname;
    const addresses = await lookup(host);
    if (!addresses.length || addresses.some(ip => !publicAddress(ip))) throw new Error('Public network address could not be verified');
    const response: Response = await transport(url, {redirect: 'manual', signal: AbortSignal.timeout(8000), headers: {'User-Agent': 'SignalDeskBot/1.0', Accept: 'text/html,application/xhtml+xml,application/xml,text/xml,text/plain'}});
    if ([301,302,303,307,308].includes(response.status)) {
      const location: string | null=response.headers.get('location');
      const permitted: string | null = location ? normalizePage(location,url) : null;
      const next: string | null = permitted ? new URL(location!,url).href : null;
      await response.body?.cancel();
      if (!next || next === url) throw new Error('Redirect left the verified website or looped');
      url = next; continue;
    }
    const reader = response.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0, truncated = false;
    try { if (reader) for (;;) { const {value, done} = await reader.read(); if (done) break; size += value.length; if (size > 1_000_000) { truncated = true; await reader.cancel(); break; } chunks.push(value); } }
    finally { reader?.releaseLock(); }
    const bytes = new Uint8Array(chunks.reduce((n,c) => n+c.length,0)); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
    return {url, status: response.status, contentType: response.headers.get('content-type') ?? '', text: new TextDecoder().decode(bytes), truncated};
  }
  throw new Error('Redirect limit reached');
}; }
export const readPublicPage = createPublicReader();

export function startCrawl(website: string): CrawlState {
  const root = normalizePage('/', website);
  if (!root) throw new Error('A public HTTPS website is required');
  return {coverage: {version: 1, root, checkedAt: new Date().toISOString(), indexing: 'Unverified — search results and sitemaps are not a complete index report', navigationDetected: false, discoveryComplete: false, pages: [{url: root, title: '', required: true, foundBy: 'Homepage', state: 'Discovered', httpStatus: null, note: '', summary: '', existing: []}], checks: [], limitations: ['HTML crawl only: JavaScript-only links, external navigation destinations and search indexing require separate verification. No claim of whole-site coverage.']}, sitemapQueue: [new URL('/sitemap.xml',root).href, new URL('/sitemap_index.xml',root).href], sitemapsSeen: [], robots: '', robotsReady: false, reads: 0, pending: []};
}
function addPage(s: CrawlState, url: string, foundBy: WebsitePage['foundBy'], required: boolean) {
  const existing = s.coverage.pages.find(p => p.url === url);
  if (existing) { existing.required ||= required; if (foundBy === 'Navigation' && existing.foundBy !== 'Homepage') existing.foundBy = foundBy; return; }
  if (s.coverage.pages.length >= MAX_PAGES) { limit(s, 'URL inventory limit reached. Discovery is incomplete.'); return; }
  s.coverage.pages.push({url, foundBy, required, title: '', state: 'Discovered', httpStatus: null, note: '', summary: '', existing: []});
}
function limit(s: CrawlState, message: string) { if (!s.coverage.limitations.includes(message)) s.coverage.limitations.push(message); }
export async function crawlBatch(s: CrawlState, read: Reader = readPublicPage): Promise<CrawlState> {
  if (s.pending.length) return s; // Review fetched bodies before doing more network work.
  const c = s.coverage;
  if (!s.robotsReady) {
    const url = new URL('/robots.txt',c.root).href;
    try {
      const r = await read(url,c.root); c.checks.push({url, outcome: `HTTP ${r.status}`});
      if (r.status !== 404 && (r.status !== 200 || r.truncated || /html/i.test(r.contentType))) throw new Error('Robots policy unavailable');
      s.robots = r.status === 200 ? r.text : ''; s.robotsReady = true;
      for (const match of s.robots.matchAll(/^sitemap:\s*(\S+)/gim)) { const u = normalizePage(match[1],c.root); if (u && !s.sitemapQueue.includes(u)) s.sitemapQueue.unshift(u); }
    } catch { limit(s,'Robots policy could not be checked. Crawl paused; retry with a new run.'); return s; }
  }
  // Bound sitemap work separately so a large archive cannot starve navigation review.
  for (let n=0; n<2 && s.sitemapQueue.length && s.sitemapsSeen.length<MAX_SITEMAPS; n++) {
    const url = s.sitemapQueue.shift()!; if (s.sitemapsSeen.includes(url)) continue; s.sitemapsSeen.push(url);
    if (!robotAllowed(s.robots,url)) { c.checks.push({url,outcome:'Blocked by robots.txt'}); continue; }
    try {
      const r = await read(url,c.root); c.checks.push({url,outcome:`HTTP ${r.status}${r.truncated ? ' · truncated' : ''}`});
      if (r.status !== 200) { if (r.status !== 404) limit(s,'A sitemap could not be read. Discovery is incomplete.'); continue; }
      if (!/<(?:[\w-]+:)?(?:urlset|sitemapindex)\b/i.test(r.text)) {limit(s,'A sitemap response was not valid sitemap XML. Discovery is incomplete.');continue;}
      if (r.truncated) limit(s,'A sitemap was truncated. Discovery is incomplete.');
      const index = /<(?:[\w-]+:)?sitemapindex\b/i.test(r.text);
      for (const location of sitemapLocations(r.text)) {
        const u = normalizePage(location,c.root); if (!u) continue;
        if (index) { if (!s.sitemapsSeen.includes(u) && !s.sitemapQueue.includes(u)) s.sitemapQueue.push(u); }
        else addPage(s,u,'Sitemap',business.test(new URL(u).pathname));
      }
    } catch { c.checks.push({url,outcome:'Fetch failed'}); limit(s,'A sitemap could not be read. Discovery is incomplete.'); }
  }
  if (s.sitemapQueue.length && s.sitemapsSeen.length>=MAX_SITEMAPS) limit(s,'Sitemap limit reached. Discovery is incomplete.');
  // All navigation pages, then relevant business pages. Remaining archive URLs stay visibly unread.
  for (let n=0; n<3 && s.reads<MAX_READ; n++) {
    const page = c.pages.filter(p => p.state === 'Discovered' && p.required).sort((a,b) => rank(a)-rank(b))[0];
    if (!page) break;
    if (!robotAllowed(s.robots,page.url)) { page.state='Blocked'; page.note='Disallowed by robots.txt'; continue; }
    s.reads++;
    try {
      const r = await read(page.url,c.root); page.httpStatus=r.status;
      if (r.status !== 200) { page.state='Failed'; page.note=`HTTP ${r.status}`; continue; }
      if (!/text\/html|application\/xhtml\+xml/i.test(r.contentType)) { page.state='Unsupported'; page.note='Non-HTML page requires a separate reader'; continue; }
      const parsed = inspectHtml(r.text,r.url); page.title=parsed.title;
      c.navigationDetected ||= parsed.navigationDetected;
      if(parsed.unresolvedMenus) limit(s,'Navigation contains a menu that requires rendering. Required navigation review is incomplete.');
      if(parsed.foreignNavigation.some(u=>{try{return new URL(u).hostname.endsWith('.'+new URL(c.root).hostname.replace(/^www\./,''));}catch{return false;}})) limit(s,'Navigation links to another company subdomain. Required navigation review is incomplete.');
      for (const link of parsed.links) addPage(s,link.url,link.navigation?'Navigation':'Internal link',link.navigation || business.test(new URL(link.url).pathname));
      if (parsed.foreignNavigation.length) limit(s,'External navigation links were found and were not crawled; verify connected sites separately.');
      if (r.truncated || parsed.text.length>40000 || parsed.text.length<160) { page.state='Partial'; page.note='Body truncated, too short, or requires rendering. Manual page review needed.'; continue; }
      page.state='Fetched'; page.note='Full extracted HTML text fetched; awaiting model review.';
      s.pending.push({url:page.url,text:parsed.text});
    } catch { page.state='Failed'; page.note='Fetch failed, timed out or left the permitted website'; }
  }
  if (s.reads>=MAX_READ && c.pages.some(p=>p.required && p.state==='Discovered')) limit(s,'Page budget reached. Required pages remain unread.');
  c.discoveryComplete = !s.sitemapQueue.length && !c.pages.some(p=>p.required && p.state==='Discovered') && !c.limitations.some(x=>x.includes('Discovery is incomplete'));
  c.checkedAt=new Date().toISOString();
  return s;
}
function rank(p: WebsitePage) { return p.foundBy === 'Homepage' ? 0 : p.foundBy === 'Navigation' ? 1 : 2; }
export function crawlCanContinue(s: CrawlState) {
  return s.robotsReady && (s.pending.length>0 || (s.sitemapQueue.length>0 && s.sitemapsSeen.length<MAX_SITEMAPS) || (s.reads<MAX_READ && s.coverage.pages.some(p=>p.required && p.state==='Discovered')));
}
export function assertWebsiteReady(c: WebsiteCoverage | undefined) {
  const blockers=coverageBlockers(c); if(blockers.length) throw new Error(blockers.join(' '));
}

const pageReviewSchema = z.object({pages:z.array(z.object({url:z.string(),summary:z.string().min(1).max(900),existing:z.array(z.string().min(1).max(250)).max(12),usable:z.boolean()}).strict()).max(3)}).strict();
export function applyPageReviews(state: CrawlState, input: unknown) {
  const result=pageReviewSchema.parse(input);
  const expected=new Set(state.pending.map(p=>p.url));
  if(result.pages.length!==expected.size || new Set(result.pages.map(p=>p.url)).size!==expected.size || result.pages.some(p=>!expected.has(p.url))) throw new Error('Website review did not cover every fetched page.');
  for(const review of result.pages){const page=state.coverage.pages.find(p=>p.url===review.url)!;page.summary=review.summary;page.existing=review.existing;page.state=review.usable?'Reviewed':'Partial';page.note=review.usable?'Extracted page text reviewed; company claims are not independently verified.':'Page contents could not be reliably reviewed.';}
  state.pending=[];
  return state;
}
