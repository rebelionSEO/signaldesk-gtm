import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectHtml, normalizePage, sitemapLocations, robotAllowed, publicAddress, startCrawl, crawlBatch, crawlCanContinue, type Reader } from '../lib/gtm/website-crawl.ts';
import { coverageBlockers } from '../lib/gtm/website-coverage.ts';
const root='https://agency.example/';
const longText='This is a real page body describing an existing service, its customer audience, and the client proof the company already publishes. It includes enough useful material for a reviewer to inspect the existing offering.';
const html=(links='')=>`<html><title>Agency</title><header><nav>${links}</nav></header><main>${longText}</main></html>`;
const reader=(pages:Record<string,string>,status:Record<string,number>={}):Reader=>async url=>({url,status:status[url]??(url in pages?200:404),text:pages[url]??'',contentType:url.endsWith('.xml')?'application/xml':url.endsWith('.txt')?'text/plain':'text/html',truncated:false});
test('nested hidden dropdowns and relative navigation links are inventoried',()=>{
 const p=inspectHtml(html('<a href="/">Home</a><div hidden><a href="/why/testimonials/#video">Testimonials</a><a href="/careers/">Careers</a></div>'),root);
 assert.equal(p.navigationDetected,true);
 assert.ok(p.links.some(l=>l.url===root+'why/testimonials'&&l.navigation));
 assert.ok(p.links.some(l=>l.url===root+'careers'&&l.navigation));
});
test('navigation discovery ignores script-generated fake links and flags unresolved menus',()=>{
 const p=inspectHtml(html('<a href="/">Home</a><button aria-controls="unrendered">More</button>')+'<script>"<a href="/fake">Fake</a>"</script>',root);
 assert.equal(p.unresolvedMenus,true);assert.ok(!p.links.some(l=>l.url.includes('fake')));
});
test('URL normalization rejects external hosts, credentials, query traps and private targets',()=>{
 for(const path of ['https://evil.example/','https://user:pass@agency.example/','http://agency.example/','https://agency.example:8080/','/search?q=anything','/logout','/logo.png'])assert.equal(normalizePage(path,root),null,path);
 assert.equal(normalizePage('/results/?utm_source=x#top',root),root+'results');
 assert.equal(normalizePage('/', 'https://127.0.0.1/'),null);
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('1.1.1.1'),true);
});
test('robots groups respect longest match, specific agents and allow overrides',()=>{
 const rules='User-agent: *\nDisallow: /private\nAllow: /private/public\n';
 assert.equal(robotAllowed(rules,root+'private/report'),false);assert.equal(robotAllowed(rules,root+'private/public'),true);
 assert.equal(robotAllowed('User-agent: *\nDisallow: /\nUser-agent: SignalDeskBot\nAllow: /',root),true);
});
test('sitemap parser handles nested indexes, namespaces and entities',()=>{
 assert.deepEqual(sitemapLocations('<x:sitemapindex><x:loc><![CDATA[https://agency.example/pages.xml]]></x:loc></x:sitemapindex>'),[root+'pages.xml']);
});
test('crawl reviews navigation before optional archives and never marks fetching as reading',async()=>{
 const read=reader({[root+'robots.txt']:'User-agent: *\nAllow: /',[root+'sitemap.xml']:`<sitemapindex><sitemap><loc>${root}pages.xml</loc></sitemap></sitemapindex>`,[root+'pages.xml']:`<urlset><url><loc>${root}blog/old-post</loc></url></urlset>`,[root]:html('<a href="/testimonials">Testimonials</a><a href="/results">Case studies</a>'),[root+'testimonials']:html(),[root+'results']:html('<a href="/portfolio/customer">Customer</a>'),[root+'portfolio/customer']:html()});
 const s=startCrawl(root);await crawlBatch(s,read);
 assert.ok(s.coverage.pages.some(p=>p.url.endsWith('testimonials')&&p.state==='Fetched'));
 assert.ok(coverageBlockers(s.coverage).length);
 const snapshot=JSON.parse(JSON.stringify(s));assert.equal(snapshot.pending.length,3);
 // Simulate successful review, explicitly separate from network discovery.
 for(const p of s.coverage.pages.filter(p=>p.state==='Fetched')){p.state='Reviewed';p.summary='Fixture review';}s.pending=[];
 while(crawlCanContinue(s)){await crawlBatch(s,read);for(const p of s.coverage.pages.filter(p=>p.state==='Fetched')){p.state='Reviewed';p.summary='Fixture review';}s.pending=[];}
 assert.deepEqual(coverageBlockers(s.coverage),[]);
 assert.equal(s.coverage.pages.find(p=>p.url.includes('old-post'))?.state,'Discovered');
 assert.equal(s.coverage.pages.find(p=>p.url.includes('portfolio/customer'))?.state,'Reviewed');
});
test('robots denial and failed navigation pages block recommendations',async()=>{
 const s=startCrawl(root);await crawlBatch(s,reader({[root+'robots.txt']:'User-agent: *\nDisallow: /testimonials',[root]:html('<a href="/testimonials">Testimonials</a><a href="/pricing">Pricing</a>')}));
 assert.equal(s.coverage.pages.find(p=>p.url.endsWith('testimonials'))?.state,'Blocked');
 assert.equal(s.coverage.pages.find(p=>p.url.endsWith('pricing'))?.state,'Failed');
 assert.ok(coverageBlockers(s.coverage).some(x=>x.includes('required')));
});
test('missing sitemaps are recorded without pretending they contain zero pages',async()=>{
 const s=startCrawl(root);await crawlBatch(s,reader({[root]:html('<a href="/">Home</a>')}));
 assert.ok(s.coverage.checks.some(c=>c.url.endsWith('sitemap.xml')&&c.outcome==='HTTP 404'));
 assert.ok(s.coverage.pages.every(p=>p.state!=='Reviewed'));
});
test('malformed sitemap and unresolved rendered navigation fail closed',async()=>{
 const s=startCrawl(root);await crawlBatch(s,reader({[root+'sitemap.xml']:'<html>Not a sitemap</html>',[root]:html('<a href="/">Home</a><button aria-controls="missing">More</button>')}));
 assert.equal(s.coverage.discoveryComplete,false);
 assert.ok(coverageBlockers(s.coverage).some(x=>x.includes('rendering')));
});
test('oversized, non-HTML, and failed robots responses remain explicit gaps',async()=>{
 const s=startCrawl(root);await crawlBatch(s,async url=>({url,status:200,text:'Denied',contentType:'text/html',truncated:false}));
 assert.equal(s.robotsReady,false);assert.ok(coverageBlockers(s.coverage).length);
 const t=startCrawl(root);t.robotsReady=true;t.sitemapQueue=[];
 await crawlBatch(t,async url=>({url,status:200,text:html(),contentType:'text/html',truncated:true}));
 assert.equal(t.coverage.pages[0].state,'Partial');assert.ok(coverageBlockers(t.coverage).length);
});

test('public reader follows trailing-slash redirects and rejects private/external redirects',async()=>{
 const {createPublicReader}=await import('../lib/gtm/website-crawl.ts');
 const seen:string[]=[];
 const transport:typeof fetch=async input=>{const u=String(input);seen.push(u);return u.endsWith('/')?new Response(html(),{headers:{'content-type':'text/html'}}):new Response(null,{status:301,headers:{location:'/results/'}});};
 const read=createPublicReader(transport,async()=>['1.1.1.1']);
 assert.equal((await read(root+'results',root)).status,200);
 assert.deepEqual(seen,[root+'results',root+'results/']);
 let requested=false;
 const unsafe=createPublicReader(async()=>{requested=true;return new Response('bad');},async()=>['127.0.0.1']);
 await assert.rejects(unsafe(root,root));assert.equal(requested,false);
 const redirect=createPublicReader(async()=>new Response(null,{status:302,headers:{location:'https://127.0.0.1/secret'}}),async()=>['1.1.1.1']);
 await assert.rejects(redirect(root,root));
});

test('page review cannot mark omitted, duplicated or invented URLs as reviewed',async()=>{
 const {applyPageReviews}=await import('../lib/gtm/website-crawl.ts');
 const s=startCrawl(root);await crawlBatch(s,reader({[root]:html('<a href="/">Home</a>')}));
 assert.equal(s.coverage.pages[0].state,'Fetched');
 assert.throws(()=>applyPageReviews(s,{pages:[]}));
 assert.throws(()=>applyPageReviews(s,{pages:[{url:root+'invented',summary:'Fake',existing:[],usable:true}]}));
 assert.equal(s.coverage.pages[0].state,'Fetched');
 applyPageReviews(s,{pages:[{url:root,summary:'Company service page',existing:['Existing services'],usable:true}]});
 assert.equal(s.coverage.pages[0].state,'Reviewed');assert.deepEqual(coverageBlockers(s.coverage),[]);
});
test('unusable page content remains a blocker after model review',async()=>{
 const {applyPageReviews}=await import('../lib/gtm/website-crawl.ts');
 const s=startCrawl(root);await crawlBatch(s,reader({[root]:html('<a href="/">Home</a>')}));
 applyPageReviews(s,{pages:[{url:root,summary:'Bot challenge',existing:[],usable:false}]});
 assert.equal(s.coverage.pages[0].state,'Partial');assert.ok(coverageBlockers(s.coverage).length);
});
