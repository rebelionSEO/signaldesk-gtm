# SignalDesk system audit — 2026-09-28

## Verdict and scope

The existing system has useful reference validation, explicit unknowns, incremental finance arithmetic, owner-scoped storage and blocked external dispatch. It is **not yet a verified autonomous GTM strategist**. The central risks are unsupported interpretation, expensive research recovery, and confusing complete form fields with creative quality.

This audit inspected the active repository, its memory documents, generation stages, research/crawl boundaries, evaluation, finance, storage and execution routes. No paid API request, new crawl, secret access or outreach was performed. Code references below describe the state inspected on this date; subsequent fixes may move lines. This is not a penetration test or a live-model effectiveness evaluation.

## Priority findings

### P1 — Paid workflow has no enforceable monetary budget

**Evidence:** `lib/gtm/ai.ts:52–60` calls the provider with up to 9,000 output tokens, but does not persist provider usage or enforce a per-run dollar ceiling. `app/api/projects/[id]/run/route.ts:30–33` limits stage requests to 100 per owner/day; stage counts are not dollars and include unpaid network stages. The trace at the route's finalization stores duration/status, not token charges.

**Impact:** The low-credit user cannot know whether another stage fits their remaining allowance. Retrying a failed parsing stage can spend again. The bounded standalone review helper described in memory is not a production runtime budget control.

**Fix:** Before further paid trials, add a run budget, a conservative reservation before each provider request, actual usage accounting, explicit uncertain-charge handling on timeouts, and a stop when the next call cannot be safely reserved. Cache by input/source revision. Show a small remaining-run-budget indicator rather than technical billing logs. Do not silently rely on an account's last reported balance.

### P1 — Search discovery discards useful research and can repeat paid work

**Evidence:** `app/api/projects/[id]/run/route.ts:61–68` replaces research output with `{crawl}` if search discovers an unread company page. The subsequent crawl branch at lines 39–45 clears the planner, leading back through planning and external search. `lib/gtm/ai.ts:72–78` marks newly found company URLs as required.

**Impact:** An otherwise useful research result is lost when one new URL is found. Recovery may rerun expensive analysis and discover additional pages again. `coverage-blocked` at route line 23 currently asks for a new run; draft at line 40 starts an empty inventory.

**Fix:** Preserve external notes, sources, retrieval time and planner separately from crawl progress. Fetch only newly needed pages and resume synthesis from cached findings. Add bounded revision attempts and a no-progress stop; restarting should not be the default recovery path.

### P1 — Whole-site gate blocks unrelated useful hypotheses

**Evidence:** `lib/gtm/website-coverage.ts:21–30` blocks on any required unread page or incomplete discovery. `lib/gtm/ai.ts:103–105` applies that to strategy, critic and auditor. Research itself is gated at line 62. The saved Stratabeat inventory has extensive review but still incomplete pages; memory records the resulting blocked run.

**Impact:** The product can do a great deal of research without producing a useful decision. Removing all protection would reintroduce the original missing-testimonials mistake.

**Fix:** Keep broad discovery and existing-asset checks, but map each claim/experiment to the pages and external sources it needs. An unread pricing page blocks a pricing diagnosis; it need not block a sourced test using a reviewed case study. List unresolved gaps and refuse absence claims where relevant coverage is incomplete. Preserve stricter execution approval independently.

### P1 — Originality scoring measures completeness more than creativity

**Evidence:** `lib/gtm/evaluation.ts:41–49` scores distinct string labels, presence of text, roles and ambition categories. The generic-pattern penalty at line 48 disappears when explanation fields are populated, even if those explanations simply rename ordinary work. The pass gate at line 83 is also primarily field/reference presence. `tests/validation.test.ts:25` confirms populated creative fields, not meaningful differentiation.

**Impact:** Routine account reviews or service demos can pass as original, matching the user's observed failure. A numeric originality score may imply evidence the implementation does not possess.

**Fix:** Relabel current checks as completeness, and add explicit rejection fixtures for renamed normal agency activity. Require a distinct buyer interaction, participation incentive, evidenced company asset, commercial next step and cheap disproof. The critic should return an inspectable accept/revise/reject decision with reasons, with at most a bounded retry. Human concept review remains necessary; no prompt proves creativity.

### P1 — Grounding verifies references, not every claim's source support

**Evidence:** `lib/gtm/ai.ts:65–71` adds URLs from search action sources and annotations to the source registry; registry inclusion is not proof of full content inspection. `lib/gtm/validation.ts:20` stores source summary, date and limitation but no supporting passage, retrieval status, author relationship or claim-level support. Lines 38–39 verify registry membership. The auditor at `lib/gtm/ai.ts:91` explicitly performs consistency with research notes, not independent verification.

**Impact:** A plausible interpretation can survive several model stages if all stages inherit the same incorrect research summary. A citation is necessary but does not make a claim true. Reddit/Clutch anecdotes must not become estimated prevalence or diagnosed revenue loss.

**Fix:** For decision-critical factual claims, retain a short supporting passage or structured observation, exact URL, retrieval timestamp, source type and stated limitation. Mark vendor/customer stories as company-selected evidence. Check original source support and counterevidence before publishing. If no relevant feedback is found, say so instead of manufacturing a negative diagnosis.

### P2 — New “never assume company data” requirement conflicts with prompts

**Evidence:** `lib/gtm/ai.ts:83` explicitly requests an assumption map and permits unsupported brand claims labeled Assumption. `lib/gtm/validation.ts:21–24` accommodates those classifications. This was compatible with earlier user guidance but needs updating after the latest instruction.

**Impact:** The system can continue generating speculative ICP, goals or traits even when transparently labeled, contrary to current preference.

**Fix:** Unknown company inputs stay unknown. Distinguish a proposed experiment hypothesis from an assumed company fact. Do not fill missing revenue, conversion rates, ICP composition or budgets with defaults. A numerical teaching example should require explicit selection and remain separate from company findings.

### P2 — Manual editing can assert review state

**Evidence:** `app/api/projects/[id]/route.ts:18–26` accepts a complete report including websiteCoverage, then labels it manual. `app/api/projects/[id]/operations/route.ts:15` trusts those coverage fields when preparing an execution pack. The integration fixture intentionally submits synthetic Reviewed coverage through PATCH.

**Impact:** Current user-owned editing is allowed and external dispatch is blocked, so this is not an observed external-action exploit. But an eventual execution adapter must not confuse owner-entered review state with authenticated crawler/model provenance.

**Fix:** Keep server-owned review records separate from editable narrative; store provenance such as crawler, assistant-reviewed, owner-attested or imported. Make any manual override explicit and auditable. Recheck the exact proposal and data version before an adapter can execute.

### P2 — Finance is honest arithmetic but insufficiently explains input credibility

**Evidence:** `lib/gtm/economics.ts:23–30` correctly separates incremental activation, downstream opportunities, pipeline and expected bookings. Lines 32–34 check presence of a sample minimum and explanatory strings, not whether the minimum is justified or inputs have usable provenance. A nonempty generic note can pass. Currency is USD and contract value is reused in the model; the model has no margin, revenue-recognition or retention calculation.

**Impact:** “Ready for human funding review” is a completeness status, not evidence that the experiment is statistically valid or financially attractive. Fractional expected customers and bookings should never be presented as observed customers or recognized revenue.

**Fix:** Keep unknown inputs null. Explain the small chain: extra qualified opportunities × contract value = potential pipeline; × observed win rate = modeled bookings. Without those inputs, show cost and the missing information needed to estimate upside. Retain cash versus team time, and avoid company CAC/ROI claims. Validate cohort design and sample rationale separately before making an effectiveness claim.

### P2 — Counterevidence gate demands a complaint even when none is found

**Evidence:** `lib/gtm/evaluation.ts:81` requires both positive and complaint evidence for its counterevidence gate, while line 34 rewards having a complaint.

**Impact:** A company with sparse or mostly positive public discussion is penalized even if research is honest. This encourages finding a token negative rather than testing the recommendation against meaningful alternative explanations.

**Fix:** Evaluate whether counterevidence was sought and relevant limitations/alternatives were recorded. “No credible complaint found within searched sources” is a valid outcome. Positive/negative sentiment is not identical to evidence supporting/opposing a particular hypothesis.

### P2 — SSRF defenses require deployment-level confirmation

**Evidence:** `lib/gtm/website-crawl.ts:105–119` resolves host addresses and validates public ranges, then calls ordinary fetch, which performs its own network resolution. Redirect checks and URL scoping exist.

**Impact:** The DNS preflight is not IP pinning. This review did not demonstrate a rebinding exploit, and hosting egress may block private destinations, but the code alone does not establish that guarantee.

**Fix:** Before enabling arbitrary public-user crawling, verify enforced outbound private-network restrictions in the actual deployment or use a vetted crawl service/adapter with those controls. Preserve redirect, protocol and size limits. A Screaming Frog MCP adapter can replace crawl work, but imported URLs alone must not become Reviewed content.

### P3 — Maintainability and payload size increase review cost

**Evidence:** Several core files, particularly `lib/gtm/ai.ts`, `lib/gtm/economics.ts` and operation routes, pack whole functions into single long lines. Production build emits a chunk-over-500 kB warning.

**Fix:** Format functions and separate stage orchestration, prompt policies, validation and transport. Lazy-load heavy optional dashboard sections after measuring actual performance. Do not spend time polishing raw crawl presentation again.

## What already works and should remain

- Unknown financial inputs remain null, explicit zero remains zero, and negative modeled lift is retained. Tests distinguish pipeline/bookings and sales-led/self-service calculations.
- Source URL/id consistency, duplicate IDs, dates, missing references and unread cited website pages are checked.
- Fetched text is not automatically Reviewed. Dropdown links are inspected in static HTML, with known rendering gaps disclosed.
- Study routes require identity and owner scope; writes reject a mismatching Origin and stale revision. Leases prevent ordinary duplicate concurrent runs.
- Execution preparation requires a selected Now experiment, owner, dates, approval and cap. External dispatch always rejects with a clear message; no working CRM/PPC/email connector is implied.
- Outcome evaluation is descriptive and does not auto-promote a successful-looking test.
- Saved examples, manual edits and live runs have separate mode labels; this distinction must survive every export and UI revision.

## Verification performed

On the checkout inspected in this session:

| Check | Result | Boundary |
| --- | --- | --- |
| Lint | Passed | Static checks only |
| TypeScript | Passed | Type consistency only |
| Existing unit suite | 47/47 passed | Primarily structural/fixture validation and deterministic crawl tests |
| Production build | Passed | Large client chunk warning; no deployment |
| Local API integration on port 5174 | Passed | Synthetic local studies; persistence, owner/auth, stale write, origin, preparation, blocked dispatch, unconfigured AI, Stratabeat copy/reload |
| Paid model end-to-end | Not run | No API spend authorized for this audit |
| Browser/mobile/accessibility pass | Not run in this audit | Earlier memory is not fresh verification |
| Adversarial network/security testing | Not run | Static concern identified, no exploit claim |
| Creative effectiveness/market response | Not established | Requires substantive concept review and real bounded experiments |

The first integration attempt was blocked by sandbox localhost access; rerunning with approved local network access passed. No automatic-approval rejection remained unresolved. Tests create synthetic local records; they do not touch production.

## Recommended implementation sequence

1. Prevent unbudgeted paid calls and preserve already-paid research during recovery.
2. Introduce claim-level support and provenance; replace invented company inputs with unknowns.
3. Replace semantic-sounding QA scores with honest structural checks and an explicit creative reject/revise loop.
4. Scope coverage gaps to affected recommendations; add a verified crawl-import adapter instead of expanding duplicate crawl machinery.
5. Generate a small, reviewed portfolio showing the problem/opportunity, distinct mechanism, channel handoff, cost, observable pipeline signal and cheap stop condition.
6. Before external execution, validate integration permissions, audience/content approval, measurement, funding and an explicit dispatch audit trail.

A supervisor with bounded stages and durable checkpoints is sufficient for this work. More agents alone do not fix weak inputs, bad criteria or missing budget controls. Avoid repeated loops unless they have a specific failing check, a limited number of retries and a clear stop.

## Same-session follow-up
After the initial audit, a shared prompt policy was added for unknown inputs, source limitations, routine-idea rejection, channel handoffs and financial honesty. The numeric originality dimension and creative gate were relabeled as completeness/structure checks, with explicit limitations. This addresses misleading labels and adds guidance; it does not resolve the substantive P1 findings or establish creative effectiveness. The GTM reference library is available to Codex, not yet retrieved by the deployed runtime.

Final follow-up verification: lint and typecheck passed; updated unit suite passed 48/48 after aligning the renamed gate assertion. Production build rechecked after runtime policy changes. Substantive creative review cases are saved separately; they were not evaluated with a paid model.
