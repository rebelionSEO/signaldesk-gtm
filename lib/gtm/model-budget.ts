/** Durable conservative reservations, not an invoice or a provider-side billing cap.
 * The operator must verify OPENAI_MAX_CALL_USD covers the configured model and the
 * entire bounded request (including search). No price assumptions live here.
 * Failed/ambiguous calls keep their reservation: retrying cannot refund spending.
 */
export class ModelBudgetError extends Error {
    readonly status: number;
    constructor(message: string, status = 409) { super(message); this.name = 'ModelBudgetError'; this.status = status; }
}
export const modelRequestLimits = { requestBytes: 240_000, outputTokens: 9000, toolCalls: 6, studyCalls: 60 } as const;
export type BudgetDatabase = {
    prepare(sql: string): { bind(...values: (string | number)[]): { first<T>(): Promise<T | null> } };
};
export type ModelReservation = { studyId: string; lease: string; model: string; requestBytes: number; maxOutputTokens: number; maxToolCalls: number };
export type ModelBudget = { limitMicros: number; reservedMicros: number; calls: number };
function dollarsToMicros(value: string | undefined): number {
    if (!value || !/^\d+(?:\.\d{1,6})?$/.test(value)) throw new ModelBudgetError('AI spending is disabled. Configure an explicit run budget and a verified maximum cost per bounded model call.', 503);
    const [whole, fraction = ''] = value.split('.');
    const result = Number(whole) * 1_000_000 + Number(fraction.padEnd(6, '0'));
    if (!Number.isSafeInteger(result) || result <= 0) throw new ModelBudgetError('AI spending limits must be positive, finite dollar amounts.', 503);
    return result;
}
export function budgetConfiguration(settings: Record<string, string | undefined>) {
    const limitMicros = dollarsToMicros(settings.SIGNALDESK_RUN_BUDGET_USD);
    const callMicros = dollarsToMicros(settings.OPENAI_MAX_CALL_USD);
    if (callMicros > limitMicros) throw new ModelBudgetError('The verified maximum cost of one model call exceeds this study budget.', 503);
    return { limitMicros, callMicros };
}
export async function reserveModelCall(db: BudgetDatabase, request: ModelReservation, settings: Record<string, string | undefined>): Promise<ModelBudget> {
    const { limitMicros, callMicros } = budgetConfiguration(settings);
    if (!request.studyId || !request.lease || !request.model) throw new ModelBudgetError('A saved study and active run lease are required before AI spending.');
    if (!Number.isInteger(request.requestBytes) || request.requestBytes <= 0 || request.requestBytes > modelRequestLimits.requestBytes ||
        !Number.isInteger(request.maxOutputTokens) || request.maxOutputTokens <= 0 || request.maxOutputTokens > modelRequestLimits.outputTokens ||
        !Number.isInteger(request.maxToolCalls) || request.maxToolCalls < 0 || request.maxToolCalls > modelRequestLimits.toolCalls)
        throw new ModelBudgetError('This model request exceeds the verified spending envelope. Reduce its size before continuing.', 413);
    // A single SQL statement performs authorization, initialization and debit. A
    // process restart, duplicate request or concurrent worker cannot reset it.
    const result = await db.prepare(`INSERT INTO model_budgets (study_id, model, limit_micros, call_micros, reserved_micros, calls)
        SELECT id, ?, ?, ?, ?, 1 FROM studies WHERE id = ? AND lease = ? AND busy_until > ?
        ON CONFLICT(study_id) DO UPDATE SET reserved_micros = model_budgets.reserved_micros + excluded.call_micros, calls = model_budgets.calls + 1
        WHERE model_budgets.model = excluded.model AND model_budgets.limit_micros = excluded.limit_micros
          AND model_budgets.call_micros = excluded.call_micros
          AND model_budgets.calls < 60
          AND model_budgets.reserved_micros <= model_budgets.limit_micros - excluded.call_micros
        RETURNING limit_micros AS limitMicros, reserved_micros AS reservedMicros, calls`)
        .bind(request.model, limitMicros, callMicros, callMicros, request.studyId, request.lease, Date.now()).first<ModelBudget>();
    if (!result) throw new ModelBudgetError('AI work stopped: the study spending allowance is exhausted, its original limits/model changed, or its run lease expired. Saved work is preserved.');
    return result;
}

export async function readModelBudget(db: BudgetDatabase, studyId: string): Promise<ModelBudget | null> {
    return db.prepare('SELECT limit_micros AS limitMicros, reserved_micros AS reservedMicros, calls FROM model_budgets WHERE study_id = ?').bind(studyId).first<ModelBudget>();
}
