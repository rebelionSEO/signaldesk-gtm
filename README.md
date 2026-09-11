# Signaldesk

An evidence-led GTM research workspace. Create a company brief, collect public evidence, form hypotheses, and produce a visual experiment plan with traceable sources.

## What works

- Saved, user-scoped company studies in Cloudflare D1.
- A clearly labeled PostHog example, kept separate from live research.
- Manual evidence and experiment authoring, including opposing evidence.
- Three server-side AI stages: research, synthesis, and consistency review.
- Checkpointed stages, retries, concurrent-write protection, and daily AI-stage limits.
- Deterministic validation of source URLs, reference IDs, dates, and report structure.
- Markdown and JSON exports retaining limitations and provenance.
- Responsive working surface and keyboard-accessible editing dialogs.

## Live AI setup

Live research requires a server-side `OPENAI_API_KEY`. Configure the hosted variable as a secret through Sites; never expose it in browser code or source control. For local development, populate `.env` using `.env.example`. `OPENAI_MODEL` defaults to `gpt-5-mini` and can be changed to a model supporting Responses web search and structured outputs.

The OpenAI Developers plugin can provision/configure a key through its approved flow. No key was available during this implementation. The provider integration is implemented but has not been validated against a live paid account. The UI explicitly reports this condition and never substitutes the example for an AI result.

Official API references:
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/models/gpt-5-mini

## Research flow

1. **Research** searches official pages and relevant public discussion for positive and negative evidence. Existing manual records are treated as unverified leads. Tool-returned URLs form the allowed source registry.
2. **Synthesis** returns a strict structured plan with evidence records, source limitations, references, experiments, and unknowns. Unknown dates remain null. Output with invalid references is rejected.
3. **Review** checks every evidence and experiment record against the research notes. Unsupported records and dependent experiments are withheld. A separate model call is an automated consistency review, not independent factual verification.
4. **Human review** checks source contents, current product behavior, existing solutions, and baselines before launch.

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
```

For local user identity, visit `/signin-with-chatgpt?return_to=/`. The Sites preview simulates a local identity; hosted identity is supplied by the platform.

Generate schema migrations with `npm run db:generate`. Apply the checked-in migration to the local D1 database following the Sites starter workflow before API integration tests. Then run `node tests/api.integration.mjs` against the local preview on port 5173. The integration test creates synthetic local records and refuses a configurable production target.

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

Before describing the agent as validated in a portfolio, configure a provider and evaluate real runs on PostHog, a second company, a company with sparse evidence, and a conflicting-evidence case. Manually grade factual support, source relevance, repeated-source handling, actionable experiments, latency and actual provider cost. Keep measured results distinct from this implementation's capabilities.

## Originality and inspiration

Original application code inspired by the workflow patterns discussed in `hculap/awesome-ai-gtm`, `ong/awesome-ai-gtm`, `gtmagents/gtm-agents`, `SamurAIGPT/open-ai-gtm-agent`, `lucaslinares1/gtm-skills`, and `onvoyage-ai/gtm-engineer-skills`. Their code was not copied into this application. UI infrastructure comes from the bundled Sites/Vinext starter and retains its supplied dependencies.
