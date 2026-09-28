# Mandatory website review

Every new live run starts with website discovery, before the planner or strategy stages. This is generic infrastructure; no company-name condition controls crawling.

## Sequence

1. Check robots.txt and conventional/declared XML sitemaps, including nested sitemap indexes.
2. Parse the homepage with an HTML parser. Collect navigation/header/menu links, including hidden dropdown anchors already present in HTML.
3. Fetch every discovered navigation page and business-relevant sitemap/internal link. Follow relevant case-study, service, industry, proof and resource links. Ordinary archive URLs remain inventoried as unread until relevant.
4. Save fetched page bodies before the model review stage. Review every body in that batch for existing capabilities and assets. Only exact, complete URL-matched model responses can mark pages Reviewed. Errors preserve the prior checkpoint.
5. Block progress until required pages are reviewed. Then plan and research external evidence. Additional same-site URLs returned by search go back through crawling/review before strategy.
6. Require every new experiment to specify existing work, cite reviewed website URLs, and say precisely what the change adds. The auditor checks against the inventory. Execution preparation independently blocks missing coverage or missing website checks.

## What the status means

Discovered is a link, Fetched is extracted HTML awaiting model review, Reviewed is a completed page-content review. Blocked, Failed, Partial and Unsupported are unresolved states. Reviewed does not mean independently fact-checked, effective, or indexed by Google.

The overview exposes URL-level coverage, discovery source, HTTP status, summaries, existing assets, robots/sitemap checks and limitations. Markdown/JSON exports preserve coverage. Older studies still load, but are not silently certified; they require a fresh run before execution preparation.

## Limits and unsupported cases

The first implementation is an HTML crawler, not a browser rendering service. Missing menu targets, empty shells and detected company-subdomain navigation block readiness. A browser-rendering integration is still needed to resolve those cases automatically. Static HTML cannot prove that no additional JavaScript-generated links exist. External hosts, query-string navigation and media binaries are not fetched; no authentication or cookies are sent. A sitemap is not proof of Google indexing, and search results do not form a complete index inventory. Search Console is not connected.

Each batch reads up to three pages and two sitemaps. The run caps at 120 page fetches, 16 sitemaps and 1,000 discovered page URLs. Caps leave required pages unread and prevent readiness, rather than asserting complete coverage. The UI runs up to eight resumable stages per click; checkpoints allow continuing. The daily endpoint limit is 100 stages, including network-only discovery stages. This is not a claim that every site can be fully reviewed within one run.

The reader restricts requests to HTTPS on the selected host and its www alias, checks public DNS addresses and every redirect, respects robots rules, and bounds time/body size. Production deployment should retain platform public-network egress restrictions; DNS preflight alone is not a DNS-rebinding guarantee.

## Stratabeat correction

The example now acknowledges the existing testimonials and searchable case-study library. It has no prioritized Now experiment. The five older concepts are conditional, not execution-ready. A live discovery smoke test found both proof sections directly through navigation (the first batch discovered 87 URLs, with 79 required at that point). The case-study library returned HTTP 200 and usable HTML. This was a network/parser test, not a completed paid model review or a full site crawl.

## Validation

Regression tests cover nested/hidden menus, relative links, unresolved dynamic menus, sitemap indexes, robots restrictions, trailing-slash redirects, unsafe URLs/addresses, missing and malformed sitemaps, partial responses, distinct fetched/reviewed states, exact review coverage, and unread-page recommendation references. Local API checks verify that preparation without website coverage is blocked and reviewed fixtures can still be saved/reloaded/prepared. No paid model run was performed for this change.
