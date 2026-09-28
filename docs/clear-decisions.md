# Clear decisions: September 2026 update

SignalDesk now begins with a short decision brief: what we found, its evidence status, why it matters, alternative explanations, one first test (or a decision to gather evidence), and the next question. The full analysis stays available behind a disclosure. Experiment cards use simpler labels and put the effort/ambition chart behind a disclosure.

## Default process

The strategist and creative reviewer share the plain-English output instructions in `lib/gtm/decision.ts`. The evidence auditor separately checks whether simplification preserves qualifications. The schema limits decision fields to 320 characters and up to three sources/explanations. Source validation checks the brief against the evidence registry and the single Now experiment. The quality view checks for the new brief. These are structural safeguards, not proof of readability or causal validity.

Older reports remain loadable and show an explicit missing-brief state; they are not silently rewritten. An audited brief is withheld if its supporting sources or recommended experiment were removed. Markdown and JSON exports retain the brief and uncertainty.

## Stratabeat interview example

Select “Stratabeat · example” or visit `/?study=stratabeat-example`. Signed-in users can save an editable copy. The existing PostHog example remains independently selectable, with its presentation voice preserved.

Sources checked on September 28, 2026:
- https://stratabeat.com/ — self-published services and client proof.
- https://tomshapiro.com/ — self-published books, speaking and agency connection.

This narrow example is not comprehensive competitive research. It does not establish founder dependence, a conversion problem, retention trouble, or a market benchmark. Its five proposals cover conversion, acquisition, authority, retention and expansion. Budgets are illustrative scoped labor and cash estimates; none establish company affordability. A 21–30 day pilot can reveal early behavior; the stated pipeline and renewal windows are longer. No realized pipeline or revenue uplift is claimed.

## Validation and limits

Unit coverage includes brief size limits, source/priority contradictions, legacy loading, exports, and the separate Stratabeat fixture. Local API coverage includes saving and reopening the selected example. Manual browser checks cover the brief, experiment navigation and a 390px viewport.

No paid model run or CRM connector was exercised. Existing integrations remain preparation-only; these changes do not introduce autonomous publishing or spending. Existing public deployments require their normal release process; a GitHub push alone is not evidence of deployment.
