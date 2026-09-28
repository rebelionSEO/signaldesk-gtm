# Working state

Updated: 2026-09-28. Verify processes and Git before relying on this snapshot.

## Repository and previews
- Active checkout: `/Users/gmejia/Documents/Codex/Github/signaldesk-gtm`
- Private remote: https://github.com/rebelionSEO/signaldesk-gtm
- Latest implementation commit before memory setup: `b2416d0` on main, pushed.
- Main local example: http://localhost:5174/?study=stratabeat-example
- Separate crawl test preview: http://localhost:5175/stratabeat-live-review.html — user rejected this as the main deliverable. Do not reopen it as the product experience.
- Earlier chatgpt.site deployments exist; they were not updated by recent local/Git changes.
- Current chat working directory may be the parent `/Users/gmejia/Documents/Codex`; explicitly use the active checkout.

## What is implemented
- Generic website discovery, page review and coverage gates; page discovery is not counted as content review.
- Sequential AI stages: planner, researcher, strategist, creative critic, evidence auditor. Do not describe this as a verified autonomous multi-agent swarm.
- Plain-English decision brief, references per experiment, budgets and outcome fields.
- Main overview now shows first proposed experiment plus compact experiment comparison. Coverage moved under Evidence → Method and limitations.
- Stratabeat example uses saved page reviews plus assistant synthesis and external source inspection. It is still an example, not a completed autonomous strategy run.
- Execution preparation exists; unconfigured external dispatch is blocked. CRM/channel integrations are not connected.

## Evidence already paid for — reuse it
- A bounded standalone test used the repository crawler and OpenAI page reviews: 166 discovered URLs, 88 URL records reviewed, estimated token cost $0.075393 over 30 calls. Some aliases may resolve to the same page; do not call this 88 unique documents.
- $0.50 was the test ceiling, not recurring spending permission. User reported only $0.77 available before that test. Current balance is unverified. No paid calls were made in the subsequent dashboard revision.
- Tracked review inventory: `lib/gtm/stratabeat-reviewed-coverage.json`.
- Local ignored checkpoint: `outputs/stratabeat-live-review.json`; local helper: `work/live-review.mjs`. These may not exist in a fresh clone. Helper is a bounded test, not the app's full production workflow.
- Credentials were used transiently and were not committed. Do not store keys or credential-file contents in memory.
- External inspected sources: Clutch Stratabeat profile, beomniscient.com, tomshapiro.com, Scrunch's Stratabeat customer story. Limited coverage, not a comprehensive sentiment study. A vendor story is not independent performance verification.

## Research/runtime gaps
- Sitemap failures and two incomplete required pages prevented full coverage: `/b2b-seo` and `/portfolio/data-training-provider` in saved inventory.
- HTML crawl has caps and no complete rendered-browser fallback; search discovery/external research/full strategy pipeline were not completed in the paid test.
- Local app AI connection was not configured persistently; the test used the key only in its process. App also requires sign-in for saved runs.
- No Screaming Frog import exists yet. Consider an adapter instead of redundant crawler development; URLs alone do not establish content review.
- Claim-specific coverage handling was discussed but NOT implemented. Existing broad pipeline/execution gates remain.

## Current user feedback — highest priority
The user liked the cleaner dashboard approach but explicitly rejected the ideas as boring, routine and insufficiently creative. The existing five concepts are NOT accepted merely because they are implemented.
Specifically rejected: “Let the client challenge next month’s work” (ordinary account management) and “Let a client inspect the next service before buying” (ordinary demo/cross-sell).
The assistant subsequently proposed three directions ONLY IN CHAT:
1. The competitor gets your sales call — blind buyer comparison of competing pitches.
2. Put our case study on trial — skeptical buyers challenge an existing result and its limits.
3. The recommendation that survives without us — a client-shared reusable diagnostic.
None has user approval, implementation or effectiveness validation. The assistant favored #2; that is not the user's choice. Do not silently promote these to accepted strategy.

## Next work after memory setup
1. Reassess the creative process against PROJECT_BRIEF.md, not just experiment wording.
2. Develop a few genuinely distinct, brand-appropriate mechanisms using saved evidence. Check what already exists and explain participation incentives and pipeline connection.
3. Present them for substantive review; do not claim they are strong merely because they contain KPI/cost fields.
4. Separately address research recovery, evidence provenance and the future production workflow without making technical diagnostics the product.

## Last verification
Before memory setup: 47 unit tests, lint, typecheck, production build and local API integration tests passed; revised Stratabeat overview inspected in browser. These checks validate structure/behavior, NOT idea quality or a full live end-to-end run. Build had a bundle-size warning. No public redeploy.
