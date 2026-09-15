# Signaldesk

An evidence-led GTM operating system. It turns a company brief and public evidence into a decision thesis, an explicit assumption map, a sequenced creative portfolio, and reviewable execution packs.

## What works

- Saved, user-scoped company studies in Cloudflare D1.
- A clearly labeled PostHog example, kept separate from live research.
- A decision-first command center showing the recommended bet, funnel diagnosis, time to signal, proposed cap, and assumptions that could reverse the recommendation.
- Explicit separation of public facts, inferences, assumptions, and unknowns so a portfolio thesis cannot masquerade as an internal company diagnosis.
- Manual evidence and experiment authoring, including opposing evidence.
- Five server-side AI roles: planner, researcher, strategist, creative critic, and evidence auditor.
- A deterministic coordinator that checkpoints each stage and records an observable run trace.
- Seven-channel prioritization across paid, organic, email, inbound, community, partnerships, and sales/CRM.
- Benchmark cohorts classified by category, business model, GTM motion, company stage, geography, peer role, and metric comparability.
- Benchmark ranges remain explicitly unavailable unless a source establishes the metric definition, cohort, reporting period, and observed range.
- Core, bold, and wildcard experiment designs with distinct creative territories, a behavior to change, a cheap test, spend cap, stop rule, and guardrail.
- Prepared execution packs, connector contracts, metric storage, and descriptive outcome evaluation.
- Checkpointed stages, retries, concurrent-write protection, and daily AI-stage limits.
- Deterministic validation of source URLs, reference IDs, dates, and report structure.
- A supporting System QA layer scoring evidence integrity, specificity, mechanism-based originality, benchmark validity, and execution readiness.
- A reusable commercial pressure test for SaaS companies: north-star KPI, pipeline logic, leading indicators, attribution window, competitive attacks, defensible assets, and evidence-gated 30/60/90 roadmap.
- Experiment economics derived from the scoped test. Proposed caps are never inferred from revenue, treated as CAC, or presented as proof that a company can afford the idea.
- Four hard promotion gates plus a five-scenario regression specification covering developer-led PLG, crowded CRM, sales-led enterprise, sparse evidence, and conflicting evidence.
- Honest repeated-run evaluation: stability remains unmeasured until at least three comparable live reports are available.
- Markdown and JSON exports retaining limitations and provenance.
- Complete case-study exports containing planner output, operations, measured outcomes, and the AI run trace.
- Responsive working surface and keyboard-accessible editing dialogs.

## Live AI setup

Live research requires a server-side `OPENAI_API_KEY`. Configure the hosted variable as a secret through Sites; never expose it in browser code or source control. For local development, populate `.env` using `.env.example`. `OPENAI_MODEL` defaults to `gpt-5-mini` and can be changed to a model supporting Responses web search and structured outputs.

The OpenAI Developers plugin can provision/configure a key through its approved flow. No key was available during this implementation. The provider integration is implemented but has not been validated against a live paid account. The UI explicitly reports this condition and never substitutes the example for an AI result.

Official API references:
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/models/gpt-5-mini

## Research flow

1. **Planner** frames the bottleneck, creates research questions, and assigns one decision to each of seven GTM channels.
2. **Researcher** searches official pages and relevant public discussion for positive and negative evidence. Existing manual records are treated as unverified leads. Tool-returned URLs form the allowed source registry.
3. **Strategist** separates facts from assumptions, maps the funnel, builds a source-linked benchmark cohort, returns a strict channel portfolio, and sequences evidence-linked experiments. It also builds the commercial measurement chain and reverse engineers evidence-bound competitive attacks. Each experiment defines a behavior, creative territory, mechanism, smallest test, scoped cost cap, duration, metric, stop rule, and guardrail.
4. **Creative critic** rejects generic or novelty-only concepts and pressures each idea toward a concrete, audience-specific mechanism and cheap disproof.
5. **Evidence auditor** checks every evidence and experiment record against the research notes. Unsupported records and dependent experiments are withheld.
6. **Human review** checks source contents, current product behavior, existing solutions, baselines, targets, audience, assets, schedule, and spend before launch.

These are five sequential roles using the configured model, coordinated by a deterministic application state machine. There is no autonomous manager agent or uncontrolled sub-agent swarm. This design keeps retries, source validation, budgets, and external side effects visible.

## Execution and learning loop

The Operations API can store channel metrics, prepare versioned execution packs, and record experiment outcomes. Only the current `Now` experiment can enter execution; its approved preparation cap cannot exceed the reviewed experiment cap, and the approval timestamp is retained. Connector contracts are defined for CRM, email, organic, paid media, and product analytics. They are deliberately shown as disconnected until credentials and provider-specific adapters exist. Dispatch returns a safe error unless the exact audience, content, schedule, permissions, tracking, and cap can be approved; the current version sends nothing and spends nothing.

Outcome evaluation compares declared baseline and test windows, checks sample and guardrail rules, and records limitations. It never automatically promotes a prompt or campaign. A future self-improvement layer should cluster repeated failures, run regression cases, and require a quality gate before a prompt version is promoted.

Each stage has a bounded provider request. The UI advances stages sequentially; if the page closes, reopen the study and resume after the stage lease expires. Results are checkpointed in D1. The last completed report is preserved until a new review completes. No background worker is promised. New live runs replace the current completed report only on success; full historical report version browsing is not implemented.

## Evidence rules

- Anecdotes do not establish prevalence, causality, churn, or conversion impact.
- No fabricated benchmark numbers or company priorities.
- Summaries are paraphrases, not verified quotations.
- Multiple evidence records may cite one page. Source-page counts are deduplicated separately.
- Automated URL checks prove registry membership, not claim truth.
- Publication dates, source access, current behavior, and duplicate authors can remain uncertain.
- Experiments remain proposals. This app does not send outreach, publish campaigns, or claim revenue results.

## Development

Node 22.13+ and npm. Preserve the lockfile.

```sh
npm run install:ci
npm run dev
npm run test
npm run typecheck
npm run build
npm run check
```

For local user identity, visit `/signin-with-chatgpt?return_to=/`. The Sites preview simulates a local identity; hosted identity is supplied by the platform.

Generate schema migrations with `npm run db:generate`. Apply the checked-in migration to the local D1 database following the Sites starter workflow before API integration tests. Then run `node tests/api.integration.mjs` against the local preview on port 5173. The integration test creates synthetic local records and refuses a configurable production target.

GitHub Actions runs linting with zero warnings, type checking, unit tests, the production build, a production dependency audit, and the local API integration suite on pushes to `main` and pull requests.

## Structure

- `app/page.tsx`: interactive workspace, brief/evidence/experiment editors and exports.
- `app/api/projects`: authenticated ownership-scoped persistence and staged runs.
- `lib/gtm/ai.ts`: Responses API research, structured synthesis and review.
- `lib/gtm/validation.ts`: schemas, integrity checks, evidence warnings and export.
- `lib/gtm/example.ts`: curated PostHog reference study.
- `db/schema.ts`, `drizzle/`: persistent schema and migrations.
- `tests/`: validation and local API lifecycle checks.

## Validation boundaries

Deterministic validation tests and local API persistence/security checks are included. Browser interaction QA and live provider evaluations have not been performed. WebMCP tools are feature-detected and expose reading a study and staging a brief; no supported WebMCP validation context was available, so their runtime contract remains unverified.

The System QA tab provides a deterministic baseline and exports the score with the case study. It grades report discipline and completeness; it does not independently verify source truth or causal impact. Before describing the live model as validated in a portfolio, configure a provider and run the five defined regression conditions. Freeze each brief and source set, repeat each run at least three times, and compare claims, source relevance, recommendation drift, latency, and actual provider cost. Keep measured results distinct from implementation capabilities.

## Originality and inspiration

Original application code inspired by the workflow patterns discussed in `hculap/awesome-ai-gtm`, `ong/awesome-ai-gtm`, `gtmagents/gtm-agents`, `SamurAIGPT/open-ai-gtm-agent`, `lucaslinares1/gtm-skills`, and `onvoyage-ai/gtm-engineer-skills`. Their code was not copied into this application. UI infrastructure comes from the bundled Sites/Vinext starter and retains its supplied dependencies.
