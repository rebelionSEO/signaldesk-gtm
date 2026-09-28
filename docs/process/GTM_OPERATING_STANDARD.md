# SignalDesk operating standard

Updated 2026-09-28. This is the desired process plus explicit implementation status, not a claim that the runtime already enforces every step.

## Product promise
Show a small set of relevant experiments, their evidence, the business decision they test and the next action. Research and QA support the dashboard; they are not the main deliverable. Never invent facts to make a report look complete.

## Minimum decision packet
- Business and offer: what is sold, to whom the company says it sells, purchase path and available pricing. Published pricing is not realized contract value.
- Buyer: user, champion, decision-maker and buying trigger. If unknown, say unknown. A persona inferred from marketing copy is not a validated ICP.
- Existing work: inspect the relevant service, pricing, testimonials, case studies and conversion path before suggesting their addition. Crawl navigation and sitemaps for discovery, deduplicate redirects, review material pages. Do not claim entire-site coverage from counts.
- External evidence: seek first-person customer accounts and positive/counterevidence. Resolve the exact brand/domain; record date, relationship, incentives, context and duplicate origin. Anonymous Reddit accounts and self-selected Clutch reviews generate questions, not population estimates. Employee reviews are not customer evidence. Vendor stories have commercial incentives. No credible reports found means unknown, not no problems.
- Decision: which uncertainty matters enough to test now? Stop collecting when additional sources do not change that decision, while recording gaps. This does not permit a missing-capability claim from an unread page.

## Fast experiment sequence
1. Confirm the buying situation and whether the proposed activity already exists. If ICP is unknown, start with discovery to validate a segment rather than targeting a fabricated one.
2. Test understanding: can an intended buyer explain who the offer is for, its benefit, alternatives and next step? Message testing is not a homepage aesthetic score.
3. Test offer/price understanding: unit, inclusions, exclusions, commitment, buying route and relevant proof. Do not recommend a discount without knowing the issue.
4. Prototype the different interaction cheaply. Prefer a few consented sessions to expensive production. This is qualitative learning, not statistical proof of lift.
5. Before a market test, define eligible cohort, event, attribution window, control/comparison where feasible, cost cap, delivery capacity, guardrail and stop rule. Sample/time needs depend on baseline and effect size; do not promise a result in seven days.
6. Review results, counterevidence and tracking quality. Continue, revise or stop. External execution needs authorized tools and scope; an idea is not permission to publish or contact people.

## Creativity review: reject routine work
For each idea write the ordinary alternative first. Explain the changed participant behavior, participation incentive, brand-specific asset and route to a commercial next step. Strip away its title: does it still differ? Could a competitor swap the logo unchanged? What would disprove its value? Reject generic formats, routine account management, novelty without relevance, or an unsupported claim that the company lacks the idea.

Use books and current practitioner work as a set of mechanisms to combine, not a template bank. Select 2–4 relevant reference IDs, explain the adaptation, and cite separate company evidence. Existing experiments in the Stratabeat example remain unapproved after the user's creativity rejection.

## Channel connections
A proposed sequence might use organic queries to understand the problem, PPC to test a specific message, an opt-in email to help interested people evaluate, and account outreach where relevance is established. It is a hypothesis, not a universal playbook. Each handoff needs a next event, audience permission where relevant, owner and measurement window. Avoid forcing every channel into a plan. Do not sum channel-attributed opportunities without deduplicating account/opportunity IDs. Client expansion and retention need their own cohorts and outcomes.

## Explain money without inventing it
First show itemized cash, internal hours/rate, total resource cost and whether rates are user-supplied estimates. Unknown quantities stay unknown.

Conditional illustration ONLY, unrelated to any client: if a user supplies 10 incremental qualified opportunities, $6,000 contract value and a 20% win rate, pipeline arithmetic is $60,000 and expected bookings are $12,000 (two expected wins). This is not measured lift or recognized revenue. If opportunity count, value or rate is missing, do not produce a forecast. Actual revenue depends on signed terms, delivery/recognition timing and cancellations; cash depends on payment timing. Net contribution also needs gross margin and servicing cost. Avoid CAC/LTV/payback unless cohort, cost scope and time window are defensible. Include zero/downside outcomes when scenarios are requested; do not imply a probability distribution from three labels.

A qualitative test can earn the next investment by resolving an important uncertainty without claiming revenue impact. Tie the next measurable outcome to opportunity creation, progression, wins, expansion or renewal and say which link is still unverified.

## Supervision and bounded validation loops
Suggested roles, implemented today as sequential stages rather than a new swarm:
- Supervisor/planner: choose decision, evidence needs, budget, cache and stop conditions.
- Researcher: gather first-party and external evidence, existing-work inventory and contradictions.
- Strategist: define buyer decision and connected commercial mechanism.
- Creative critic: reject routine/irrelevant ideas using the tests above.
- Evidence/finance reviewer: inspect claims and units, unknowns, provenance and scope.
- Supervisor: allow a proposal, return targeted corrections or explicitly abstain.

For each failed claim, check the cited source once, look for counterevidence and narrow/withdraw the claim if unresolved. Allow at most two targeted revision passes per issue in the desired workflow; preserve unresolved gaps. Never loop until a model says yes. Repeating one model is not independent validation. Budget must be reserved before calls; unknown cost/timeouts stay reserved. This durable budget and retry policy is NOT implemented in the app yet (see QA audit).

## Screaming Frog
Prefer existing Screaming Frog MCP crawl results over paying an LLM to discover URLs. Check available tools and active user crawls first; do not disrupt an existing crawl. Import URL, final URL, status, canonical, source link, title, content extract/hash, timestamp and rendering mode when available. A URL-only export supplies discovery, not review. Content should be cached and only changed/relevant pages reprocessed.

Verified official documentation: https://www.screamingfrog.co.uk/seo-spider/user-guide/configuration/#mcp-server (checked 2026-09-28). Screaming Frog MCP tools are NOT exposed in this Codex session. No connector or export importer was implemented here; do not silently substitute another paid SEO tool.

## Weekly reference refresh
Automation `refresh-signaldesk-gtm-reference-library`: Mondays at 09:00 (app schedule; intended local America/Bogota). Read a small set of primary sources; add only useful new mechanisms/corrections, record publication and access dates and preserve disagreements. Never pad with search snippets or pretend to have read an unavailable book. No paid APIs, account subscriptions, production prompt changes, deployment or automatic pushes. Quiet when unchanged. Update the refresh log inside docs/references/GTM_LIBRARY.md with changes and review needs.

## What changed in runtime today
`lib/gtm/research-policy.ts` is appended to model instructions for missing data, source limits, creative rejection, fast validation, channel handoffs and financial language. Prompt guidance is not a hard verification gate or proof of better outputs. The reference library is read by Codex during strategy work; the deployed app does not yet retrieve it automatically. The original full-coverage gate remains; claim-specific readiness is a separate engineering task.
