import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reserveModelCall, readModelBudget, budgetConfiguration, type BudgetDatabase } from '../lib/gtm/model-budget.ts';
const settings = { SIGNALDESK_RUN_BUDGET_USD: '0.50', OPENAI_MAX_CALL_USD: '0.10' };
const request = { studyId: 'study', lease: 'lease', model: 'verified-model', requestBytes: 1000, maxOutputTokens: 9000, maxToolCalls: 6 };
function adapter(sqlite: DatabaseSync): BudgetDatabase {
    return { prepare(sql: string) { return { bind(...values: (string | number)[]) { return { async first<T>() { return sqlite.prepare(sql).get(...values) as T ?? null; } }; } }; } };
}
function setup(path = ':memory:') {
    const sqlite = new DatabaseSync(path);
    sqlite.exec('CREATE TABLE studies (id TEXT PRIMARY KEY, lease TEXT, busy_until INTEGER)');
    sqlite.exec(readFileSync(new URL('../drizzle/0002_pink_gertrude_yorkes.sql', import.meta.url), 'utf8'));
    sqlite.prepare('INSERT INTO studies VALUES (?, ?, ?)').run('study', 'lease', Date.now() + 60_000);
    return sqlite;
}
test('missing, nonfinite, zero, negative and insufficient configuration fails closed', () => {
    for (const value of [undefined, 'NaN', 'Infinity', '0', '-1', '1e2', '0.0000001']) {
        assert.throws(() => budgetConfiguration({ ...settings, SIGNALDESK_RUN_BUDGET_USD: value }));
    }
    assert.throws(() => budgetConfiguration({ ...settings, OPENAI_MAX_CALL_USD: '0.51' }));
});
test('atomic reservations reach exact allowance and never refund failed or ambiguous calls', async () => {
    const sqlite = setup(); const db = adapter(sqlite);
    const results = await Promise.allSettled(Array.from({length: 9}, () => reserveModelCall(db, request, settings)));
    assert.equal(results.filter(x => x.status === 'fulfilled').length, 5);
    assert.deepEqual({ ...await readModelBudget(db, 'study') }, { limitMicros: 500000, reservedMicros: 500000, calls: 5 });
    sqlite.close();
});
test('reservations survive reconnect/restart and configuration cannot silently reset study', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'signaldesk-budget-')); const file = join(folder, 'budget.db');
    try {
        let sqlite = setup(file);
        await reserveModelCall(adapter(sqlite), request, settings); sqlite.close();
        sqlite = new DatabaseSync(file); const db = adapter(sqlite);
        assert.equal((await reserveModelCall(db, request, settings)).calls, 2);
        await assert.rejects(reserveModelCall(db, request, {...settings, SIGNALDESK_RUN_BUDGET_USD:'1'}));
        await assert.rejects(reserveModelCall(db, {...request, model: 'different-model'}, settings));
        await assert.rejects(reserveModelCall(db, request, {...settings, OPENAI_MAX_CALL_USD:'0.01'}));
        assert.equal((await readModelBudget(db,'study'))?.calls, 2); sqlite.close();
    } finally { rmSync(folder, {recursive: true, force: true}); }
});
test('lease and request-envelope failures do not reserve money', async () => {
    const sqlite = setup(); const db = adapter(sqlite);
    for (const changes of [{lease:'other'}, {requestBytes:240001}, {maxOutputTokens:9001}, {maxToolCalls:7}, {maxToolCalls:-1}]) {
        await assert.rejects(reserveModelCall(db, {...request, ...changes}, settings));
    }
    assert.equal(await readModelBudget(db,'study'),null);
    sqlite.exec('UPDATE studies SET busy_until = 0');
    await assert.rejects(reserveModelCall(db,request,settings)); sqlite.close();
});
test('hard call-count bound prevents unlimited attempts even with a tiny reservation', async () => {
    const sqlite = setup(); const db = adapter(sqlite); const tiny = {...settings, OPENAI_MAX_CALL_USD:'0.000001'};
    for(let i=0;i<60;i++) await reserveModelCall(db,request,tiny);
    await assert.rejects(reserveModelCall(db,request,tiny));
    assert.equal((await readModelBudget(db,'study'))?.calls,60); sqlite.close();
});
