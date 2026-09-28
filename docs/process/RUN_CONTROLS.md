# Bounded review and spending controls

Implemented 2026-09-28. Applies to saved live studies; curated examples are not retroactively approved.

## Workflow

Website discovery/review → planner → public researcher → strategist → creative revision → evidence/creative audit.

The auditor must return exactly one typed decision per evidence record and experiment, plus decisions for every narrative section. Missing, duplicate, inconsistent or oversized decisions fail validation before publication.

- Public evidence gap: at most **one targeted public research follow-up**. Original notes, source registry and planner remain saved. Newly found company pages are reviewed before synthesis resumes; they do not trigger another broad external search.
- Generic or irrelevant concept: at most **two additional creative revisions**, using explicit rejection reasons. The initial creative pass is separate. Each revised candidate goes through the auditor again. An exactly unchanged revision stops immediately.
- Unsupported numbers: withhold the affected record or section, including numbers in prose. Remove dependent experiments and sections when their evidence disappears. Unreviewed economics are never carried into live output. Supported dates and explicitly proposed test parameters are different from invented company performance.
- Unresolved issues after the limit: retain only audited content, which may contain zero experiments. Do not keep asking until the model says yes.

Revision attempts are checkpointed before paid work; a timeout does not reset the retry allowance. Missing private CRM data is not a reason for another web search. Model classification of a gap as public is still fallible. All input remains untrusted data.

## Spending setup — disabled until explicitly configured

Apply `drizzle/0002_pink_gertrude_yorkes.sql` to the intended D1 database through the normal migration process. Local test migration was applied; no hosted migration/deployment was performed in this change.

Set server-side variables only:

- `SIGNALDESK_RUN_BUDGET_USD`: explicitly authorized allowance for this saved study.
- `OPENAI_MAX_CALL_USD`: operator-verified conservative maximum charge for **one entire bounded request** on the configured `OPENAI_MODEL`, including input, reasoning/output and tool/search charges.

No default dollar values are supplied. Do not reuse an old account balance or copy the synthetic test values. Verify current provider prices and the maximum search-related charges before setting the ceiling. If a defensible ceiling cannot be established, leave spending disabled. This implementation does not calculate provider prices or verify account balance.

The enforced envelope is 240,000 UTF-8 bytes of serialized request, 9,000 maximum output tokens, and six maximum tool calls. These bounds limit the request; bytes are not billed tokens. The configured ceiling must cover the full possible charge, including provider-added search context. Changing the envelope requires re-verifying the ceiling.

Before every model fetch, a single database statement checks the active study lease, initializes or debits the persistent allowance, and rejects work that cannot fit. A hard **60 model-call limit per saved study** also bounds malformed-response retries. The original model and dollar settings are frozen for that ledger; configuration changes fail closed rather than resetting it.

Reservations are deliberately not refunded, including after provider errors or timeouts. The UI displays remaining **reserved allowance**, not actual billed usage. Restarting, editing or returning to a previous stage does not replenish it. New studies have separate allowances; this is not an account-wide spending limit or a provider billing guarantee. Do not create duplicate studies to bypass an exhausted allowance. Provider billing controls should be configured separately where available.

A missing migration or reservation failure prevents the model call. Ordinary study reads remain available when budget storage is unavailable, with `budgetAvailable: false`.

## Boundaries

- Review decisions are model judgments against saved research, not independent source verification or proof of originality. Existing claim-level grounding and whole-site coverage limitations remain.
- No paid end-to-end evaluation was run. Deterministic fixtures test routing, withholding, reference integrity, persistence, envelopes and stopping conditions; they do not establish creative quality.
- The reference library is still not automatically retrieved by the deployed model workflow.
- There is no automated refund/usage reconciliation, administrative budget top-up or account-wide monetary ledger in this version. Safest failure behavior is to stop and preserve saved work.
- No CRM, ad, email or external execution connector was activated.
