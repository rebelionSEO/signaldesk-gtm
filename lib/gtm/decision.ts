import { z } from 'zod';

// Short fields are an output contract; length checks do not prove readability.
const sentence = z.string().trim().min(1).max(320);
export const decisionBriefSchema = z.object({
  finding: sentence,
  status: z.enum(['Supported observation', 'Hypothesis', 'Needs data']),
  evidenceIds: z.array(z.string().regex(/^E\d+$/)).min(1).max(3),
  whyItMatters: sentence,
  alternativeExplanations: z.array(sentence).min(1).max(3),
  recommendedExperimentId: z.string().regex(/^O\d+$/).nullable(),
  whyFirst: sentence,
  nextQuestion: sentence,
}).strict();
export type DecisionBrief = z.infer<typeof decisionBriefSchema>;
export const decisionOutputInstructions = `Write for a busy company leader in plain English. Use short sentences and concrete verbs. Explain necessary acronyms on first use. Avoid phrases such as commercial whitespace, activation architecture, and authority flywheel. Titles must describe an action, not just name a concept. Create decisionBrief with one short finding, its evidence status, up to three evidence IDs, why it matters, plausible alternative explanations, one recommended experiment ID (or null when evidence is insufficient), why that test comes first, and the next question to answer. Keep each text field within 320 characters. Public visibility does not establish founder dependence or a funnel failure. Connected data can reveal associations, not automatically causes. Return no more than five experiments, with exactly one Now experiment when recommending a test. That experiment must match recommendedExperimentId. Explain the buyer and buying situation. Give each experiment one main business measure, one early signal in its validation, an estimated cost with assumptions or null, an owner, a test duration and a review point relative to approval. Distinguish proposed thresholds from observed baselines. Explain the path to qualified opportunities, won business, retention or expansion; do not equate engagement with revenue. Keep analysis details out of the short decision brief. Preserve counterevidence and uncertainty when simplifying.`;
