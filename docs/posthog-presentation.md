# PostHog case-study presentation

Scope: the curated PostHog example and its saved copies (original generatedAt plus company and website identity). New research and other companies retain the standard workspace. No agent prompts, calculations, evidence records, budget values, or approval rules were changed for this presentation.

## Research and interpretation

Reviewed September 21, 2026:
- https://newsletter.posthog.com/p/how-not-to-be-boring — an intentional, engineering-oriented brand and specificity to an audience.
- https://newsletter.posthog.com/p/10x-job-posts-for-10x-engineers — conversational writing, concrete work, technical humor, and rejection of generic marketing language.
- https://posthog.com/ — product demonstrations, visible sample-data boundaries, developer tooling and direct descriptions.

Our interpretation: technical specificity first, candid uncertainty second, occasional dry humor third. This is an independent portfolio case, not an official PostHog interface or endorsement.

## Implementation

- Scoped `.posthog-case` styling: warm paper, dark ink, restrained orange and yellow, compact borders and monospace annotations.
- A short opening claim, with its underlying hypothesis retained behind “Why this bet?”.
- A three-step diagram of the proposed sandbox experiment. It is explicitly proposed, not a live trace.
- Plain-language section labels and concise curated experiment descriptions. Financial and measurement terminology remains literal.
- Existing saved studies retain their stored copy; the new default example contains the revised descriptions. We do not overwrite user edits.
- The case matcher in `lib/gtm/posthog-presentation.ts` uses the curated creation date and company identity, rather than styling every future PostHog research run.
