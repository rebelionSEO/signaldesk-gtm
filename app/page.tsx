'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { BookOpen, Download, LoaderCircle, Pencil, Plus, Radio, Search, ShieldCheck, ExternalLink } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { example } from '@/lib/gtm/example';
import { briefSchema, evidenceSchema, opportunitySchema, referenceErrors, toMarkdown } from '@/lib/gtm/validation';
import type { Brief, Evidence, Opportunity, Report } from '@/lib/gtm/types';
import type { Operations, Planner, Trace } from '@/lib/gtm/operating';
import { emptyOperations } from '@/lib/gtm/operating';
import { isPostHogCaseStudy, caseCopy } from '@/lib/gtm/posthog-presentation';
import { PipelineBudget } from '@/components/pipeline-budget';
import { PressureTestBoard } from '@/components/gtm-v2';
import { evaluateReport } from '@/lib/gtm/evaluation';
import { CommandCenter, ExperimentsView, OperationsView, StrategyView } from '@/components/gtm-v3';
type Study = {
    id: string;
    report: Report;
    planner: Planner | null;
    operations: Operations;
    trace: Trace[];
    revision: number;
    stage: string;
    busy: boolean;
    updatedAt: string;
};
type Summary = {
    id: string;
    brief: Brief;
    stage: string;
    updated_at: string;
};
const blank: Brief = { company: '', website: 'https://', audience: '', objective: '', constraints: '', industry: '', businessModel: '', gtmMotion: '', geography: '', companyStage: '' };
function Field({ label, value, onChange, multiline = false, required = true, max = 4000, type = 'text' }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    multiline?: boolean;
    required?: boolean;
    max?: number;
    type?: string;
}) { return <label className="field"><span>{label}</span>{multiline ? <textarea value={value} onChange={e => onChange(e.target.value)} required={required} maxLength={max} rows={3}/> : <input value={value} onChange={e => onChange(e.target.value)} required={required} maxLength={max} type={type}/>}</label>; }
function Picker({ label, value, items, onChange }: {
    label: string;
    value: string;
    items: string[];
    onChange: (v: string) => void;
}) { return <div className="field"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{items.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>; }
function Empty({ children }: {
    children: ReactNode;
}) { return <div className="empty-state"><Search size={26}/><p>{children}</p></div>; }
async function request(url: string, method = 'GET', data?: unknown): Promise<any> { const r = await fetch(url, { method, headers: data ? { 'Content-Type': 'application/json' } : undefined, body: data ? JSON.stringify(data) : undefined }); let payload: any; try {
    payload = await r.json();
}
catch {
    throw new Error('The server did not return a usable response. Your current study is unchanged.');
} if (!r.ok)
    throw new Error(payload.error || 'Request failed'); return payload; }
export default function Home() {
    const [tab, setTab] = useState('overview'), [report, setReport] = useState<Report>(example), [study, setStudy] = useState<Study | null>(null), [studies, setStudies] = useState<Summary[]>([]), [busy, setBusy] = useState(false), [phase, setPhase] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState(''), [signedIn, setSignedIn] = useState<boolean | null>(null), [configured, setConfigured] = useState(false), [dialog, setDialog] = useState<'new' | 'brief' | 'evidence' | 'opportunity' | null>(null), [brief, setBrief] = useState<Brief>(blank), [evidence, setEvidence] = useState<Evidence | null>(null), [opportunity, setOpportunity] = useState<Opportunity | null>(null), [search, setSearch] = useState(''), [kind, setKind] = useState('All'), [focus, setFocus] = useState<string[]>([]);
    const state = useRef({ report, study });
    useEffect(() => { state.current = { report, study }; }, [report, study]);
    const mounted = useRef(true);
    const createId = useRef(cryptoId());
    const apply = useCallback((s: Study) => { setStudy(s); setReport(s.report); const url = new URL(window.location.href); url.searchParams.set('study', s.id); window.history.replaceState({}, '', url); }, []);
    const refresh = useCallback(async () => { const result = await request('/api/projects'); setStudies(result.studies); }, []);
    const load = useCallback(async (id: string) => { setError(''); setFocus([]); setBusy(true); try {
        if (id === 'example') {
            setStudy(null);
            setReport(example);
            window.history.replaceState({}, '', '/');
        }
        else
            apply(await request('/api/projects/' + id));
        setTab('overview');
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }, [apply]);
    useEffect(() => { mounted.current = true; async function init() { try {
        const response = await fetch('/api/status');
        if (response.status === 401) {
            setSignedIn(false);
            return;
        }
        if (!response.ok)
            throw new Error('Connection status is unavailable.');
        const status = await response.json() as {
            aiConfigured: boolean;
        };
        setSignedIn(true);
        setConfigured(status.aiConfigured);
        await refresh();
        const id = new URLSearchParams(window.location.search).get('study');
        if (id && mounted.current)
            await load(id);
    }
    catch (e) {
        setError(message(e));
    } } void init(); return () => { mounted.current = false; }; }, [load, refresh]);
    useEffect(() => { const context = (document as unknown as {
        modelContext?: {
            registerTool: (tool: unknown, options: unknown) => void | Promise<void>;
        };
    }).modelContext; if (!context)
        return; const controller = new AbortController(); const register = (tool: unknown) => { try {
        Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(() => { });
    }
    catch { } }; register({ name: 'read_gtm_study', description: 'Read the visible GTM brief, evidence, proposed experiments and limitations.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: (input: unknown) => { if (!input || typeof input !== 'object' || Object.keys(input).length)
            throw new Error('Expected an empty object'); return state.current.report; } }); register({ name: 'start_gtm_study', description: 'Open and prefill a new research brief. Does not save a study or run AI research.', inputSchema: { type: 'object', properties: { company: { type: 'string' }, website: { type: 'string' }, audience: { type: 'string' }, objective: { type: 'string' }, constraints: { type: 'string' } }, required: ['company', 'website', 'audience', 'objective', 'constraints'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: (input: unknown) => { const value = briefSchema.parse(input); setBrief(value); setDialog('new'); return { status: 'brief_staged', company: value.company }; } }); return () => controller.abort(); }, []);
    async function create(e: FormEvent) { e.preventDefault(); setError(''); const result = briefSchema.safeParse(brief); if (!result.success) {
        setError(result.error.issues[0].message);
        return;
    } setBusy(true); try {
        apply(await request('/api/projects', 'POST', { id: createId.current, brief: result.data }));
        createId.current = cryptoId();
        setDialog(null);
        setTab('strategy');
        setNotice('Study saved. Add evidence manually or run live research.');
        await refresh();
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }
    async function copyExample() { setBusy(true); setError(''); try {
        apply(await request('/api/projects', 'POST', { id: createId.current, brief: example.brief, example: true }));
        createId.current = cryptoId();
        setNotice('Example saved as your own study. You can now edit it.');
        await refresh();
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }
    async function save(next: Report) { if (!study)
        throw new Error('Save a copy of the example before editing.'); const errors = referenceErrors(next); if (errors.length)
        throw new Error(errors.join('; ')); const saved = await request('/api/projects/' + study.id, 'PATCH', { revision: study.revision, report: next }); apply(saved); setDialog(null); setNotice('Changes saved. The study is marked as manually edited.'); await refresh(); }
    async function submitEdit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try {
        if (dialog === 'brief') {
            const b = briefSchema.parse(brief);
            await save({ ...report, brief: b, summary: 'Brief updated. Review evidence and rebuild the proposed experiments.', opportunities: [], economics: undefined, commercialPlan: undefined, operatingPlan: undefined, benchmarkProfile: undefined, ...((b.company !== report.brief.company || b.website !== report.brief.website) ? { evidence: [], marketContext: undefined, assumptions: undefined, operatingPlan: undefined, unknowns: ['Which customer problems are supported by public evidence?'] } : {}) });
        }
        else if (dialog === 'evidence' && evidence) {
            const parsed = evidenceSchema.parse(evidence);
            await save({ ...report, evidence: [...report.evidence.filter(x => x.id !== parsed.id), parsed] });
        }
        else if (dialog === 'opportunity' && opportunity) {
            const parsed = opportunitySchema.parse(opportunity);
            await save({ ...report, opportunities: [...report.opportunities.filter(x => x.id !== parsed.id), parsed] });
        }
    }
    catch (e) {
        setError(message(e));
    }
    finally {
        setBusy(false);
    } }
    async function run() { if (!study)
        return; setBusy(true); setError(''); setNotice(''); let current = study; try {
        for (let i = 0; i < 5; i++) {
            const labels: Record<string, string> = { draft: 'Planner is defining the research question', scoped: 'Researcher is collecting sources and counterevidence', researched: 'Strategist is building the channel portfolio', proposed: 'Creative critic is pressure-testing the ideas', planned: 'Evidence auditor is checking every claim' };
            setPhase(labels[current.stage] ?? 'Running the next GTM stage');
            current = await request('/api/projects/' + study.id + '/run', 'POST', { revision: current.revision, restart: i === 0 && current.stage === 'complete' });
            apply(current);
            if (current.stage === 'complete') {
                setTab('overview');
                setNotice('Research completed. Review the sources before acting on the plan.');
                break;
            }
        }
        await refresh();
    }
    catch (e) {
        setError(message(e));
        try {
            apply(await request('/api/projects/' + study.id));
        }
        catch { }
    }
    finally {
        setBusy(false);
        setPhase('');
    } }
    function download(format: 'md' | 'json') { const evaluation = evaluateReport(report); const bundle = study ? { studyId: study.id, stage: study.stage, revision: study.revision, updatedAt: study.updatedAt, report, evaluation, planner: study.planner, operations: study.operations, trace: study.trace } : { report, evaluation, note: 'Curated example; no saved operations or run trace.' }; const content = format === 'md' ? caseStudyMarkdown(report, study) + evaluationMarkdown(report) : JSON.stringify(bundle, null, 2); const url = URL.createObjectURL(new Blob([content], { type: format === 'md' ? 'text/markdown' : 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = report.brief.company.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-gtm-case-study.' + format; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    function showEvidence(ids: string[]) { setFocus(ids); setSearch(''); setKind('All'); setTab('evidence'); }
    async function prepare(opportunity: Opportunity) { if (!study) return; setBusy(true); setError(''); try {
        const start = new Date(); const due = new Date(start); due.setDate(due.getDate() + (opportunity.design?.durationDays ?? 14));
        const next = await request('/api/projects/' + study.id + '/operations', 'POST', { action: 'prepare', revision: study.revision, id: cryptoId(), experimentId: opportunity.id, owner: opportunity.owner, startDate: start.toISOString().slice(0, 10), dueDate: due.toISOString().slice(0, 10), budgetCap: opportunity.design?.budgetCap ?? 0, approved: true });
        apply(next); setNotice('Execution pack prepared. Review the artifact and connector contract before any external action.'); setTab('execution');
    } catch (e) { setError(message(e)); } finally { setBusy(false); } }
    const filtered = report.evidence.filter(e => (kind === 'All' || e.kind === kind) && (!focus.length || focus.includes(e.id)) && `${e.title} ${e.summary} ${e.url}`.toLowerCase().includes(search.toLowerCase()));
    const editable = !!study && signedIn && !busy && !study.busy;
    const locked = busy || !!study?.busy;
    return <main className={isPostHogCaseStudy(report) ? "workspace posthog-case" : "workspace"}><header className="topbar"><Link className="brand" href="/"><Radio size={23}/>signaldesk<span> / GTM workspace</span></Link><span className="private-label"><ShieldCheck size={15}/> Evidence before action</span></header><div className="shell">
 <div className="workspace-tools"><Select value={study?.id ?? 'example'} onValueChange={id => void load(id)} disabled={busy}><SelectTrigger aria-label="Choose a study"><SelectValue placeholder="Choose a study"/></SelectTrigger><SelectContent><SelectItem value="example">PostHog · example</SelectItem>{studies.map(s => <SelectItem key={s.id} value={s.id}>{s.brief.company} · {s.stage === 'complete' ? 'reviewed' : 'draft'}</SelectItem>)}</SelectContent></Select><span className="saved-state">{study ? 'Saved ' + new Date(study.updatedAt).toLocaleDateString() : 'Curated example · not a live run'}</span></div>
 {signedIn === false && <div className="notice"><p>Explore the example, or sign in to save your own research.</p><a href="/signin-with-chatgpt?return_to=/" target="_top">Sign in ↗</a></div>}
 {error && <div className="error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
 {notice && <div className="success" role="status">{notice}</div>}
 <div className="page-heading"><div><p className="eyebrow">{caseCopy(report, 'RESEARCH WORKSPACE', 'FIELD NOTES / POSTHOG EDITION')}</p><h1>{report.brief.company}<span className="badge">{report.mode === 'example' ? 'Example study' : report.mode === 'live' ? 'AI-researched · review sources' : 'Manual study'}</span></h1><p className="muted audience">{report.brief.audience}</p></div><button className="primary" disabled={locked || signedIn !== true} onClick={() => { setBrief(blank); setError(''); createId.current = cryptoId(); setDialog('new'); }}><Plus size={17}/> New research</button></div>
 {isPostHogCaseStudy(report) && <p className="hog-case-disclaimer">An independent experiment notebook for PostHog. Public evidence, explicit hunches, no inside access.</p>}
 <div className="actionbar"><div className="run-status">{busy ? <><LoaderCircle size={17} className="spin"/>{phase || 'Saving your study…'}</> : <><span className={'status-mark ' + (configured ? 'connected' : '')}/>{configured ? 'Live research connected' : 'Live research needs an AI connection'}</>}</div><div className="actions">{study ? <button className="primary compact" disabled={locked || !configured} onClick={() => void run()}><Search size={16}/>{['researched', 'planned'].includes(study.stage) ? 'Resume research' : study.stage === 'complete' ? 'New live run' : 'Run live research'}</button> : <button className="secondary" disabled={locked || signedIn !== true} onClick={() => void copyExample()}>Save an editable copy</button>}<button className="secondary" onClick={() => download('md')}><Download size={16}/> Export brief</button><button className="secondary" onClick={() => download('json')}>JSON</button></div></div>
 {study?.busy && !busy && <div className="notice"><p>A research stage is running or recovering. Reload the study after a few minutes.</p><button className="secondary" onClick={() => void load(study.id)}>Reload study</button></div>}
 <Tabs value={tab} onValueChange={setTab}><TabsList className="tabbar v3-tabbar" variant="line"><TabsTrigger value="overview">{caseCopy(report, "Command", "The bet")}</TabsTrigger><TabsTrigger value="strategy">{caseCopy(report, "Strategy", "What we know")}</TabsTrigger><TabsTrigger value="plan">Ideas <span>{report.opportunities.length}</span></TabsTrigger><TabsTrigger value="economics">Pipeline & Budget</TabsTrigger><TabsTrigger value="execution">Operations <span>{study?.operations.tasks.length ?? 0}</span></TabsTrigger><TabsTrigger value="evidence">Evidence <span>{report.evidence.length}</span></TabsTrigger><TabsTrigger value="system">{caseCopy(report, "Pressure Test", "Poke holes")}</TabsTrigger></TabsList>
 <TabsContent value="overview"><CommandCenter report={report} onNavigate={setTab} onEvidence={showEvidence}/></TabsContent>
 <TabsContent value="strategy"><StrategyView report={report} onEvidence={showEvidence}/></TabsContent>
 <TabsContent value="plan"><ExperimentsView report={report} editable={!!editable} onEdit={item => { setOpportunity({ ...item }); setDialog('opportunity'); }} onEvidence={showEvidence}/></TabsContent>
 <TabsContent value="economics"><PipelineBudget key={study?.id??'example'} report={report} canSave={!!editable} onSave={async model=>{await save({...report,economics:[...(report.economics??[]).filter(m=>m.experimentId!==model.experimentId),model]});}}/></TabsContent>
 <TabsContent value="execution"><OperationsView report={report} operations={study?.operations ?? emptyOperations} canPrepare={!!editable} onPrepare={opportunity => void prepare(opportunity)}/></TabsContent>
 <TabsContent value="system"><PressureTestBoard planner={study?.planner ?? null} traces={study?.trace ?? []} report={report} onEvidence={showEvidence}/></TabsContent>
 <TabsContent value="evidence"><div className="section-title"><div><h2>Evidence library</h2><p className="muted">{caseCopy(report, 'Source-linked observations, including opposing experiences.', 'The receipts. Including the ones that disagree with us.')}</p></div><button disabled={!editable || report.evidence.length >= 30} onClick={() => { setError(''); setEvidence({ id: 'E' + (Math.max(0, ...report.evidence.map(e => Number(e.id.slice(1)))) + 1), title: '', url: 'https://', summary: '', kind: 'complaint', date: null, limitation: '' }); setDialog('evidence'); }}><Plus size={16}/> Add evidence</button></div><div className="filters"><label className="search-field"><Search size={17}/><input aria-label="Search evidence" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search observations or sources"/></label><Picker label="Evidence type" value={kind} items={['All', 'complaint', 'positive', 'context']} onChange={setKind}/>{focus.length > 0 && <button className="secondary" onClick={() => setFocus([])}>Clear linked-record filter</button>}</div><div className="evidence-grid">{filtered.map(e => <article className="panel evidence-card" key={e.id}><div className="card-top"><span className={'evidence-kind ' + e.kind}>{e.id} / {e.kind}</span><button className="icon-button" aria-label={'Edit ' + e.title} disabled={!editable} onClick={() => { setEvidence({ ...e }); setDialog('evidence'); }}><Pencil size={16}/></button></div><h3>{e.title}</h3><p>{e.summary}</p><a className="source-link" href={e.url} target="_blank" rel="noreferrer">{new URL(e.url).hostname} <ExternalLink size={14}/></a><p className="source-date">Published: {e.date ?? 'Unknown'}</p><div className="limitation"><b>Limit:</b> {e.limitation}</div></article>)}</div>{!filtered.length && <Empty>No matching evidence. Add a source or clear your filters.</Empty>}</TabsContent>
 <TabsContent value="evidence"><div className="brief-grid v3-research-context"><section className="panel"><div className="plan-heading"><h2>Research brief</h2><button className="secondary" disabled={!editable} onClick={() => { setBrief({ ...report.brief }); setDialog('brief'); }}><Pencil size={15}/> Edit</button></div><dl><dt>Company</dt><dd><a href={report.brief.website} target="_blank" rel="noreferrer">{report.brief.company} ↗</a></dd><dt>Audience</dt><dd>{report.brief.audience}</dd><dt>Working objective</dt><dd>{report.brief.objective}</dd><dt>Constraints & assumptions</dt><dd>{report.brief.constraints || 'None supplied.'}</dd></dl></section><section className="panel"><h2>What we still need to know</h2><ul className="question-list">{report.unknowns.map((x, i) => <li key={i}>{x}</li>)}</ul></section></div><details className="panel v3-method"><summary><BookOpen size={20}/> Method and limitations</summary><div className="method"><ol><li><b>Collect.</b> Search company pages and public discussions for specific experiences, positive evidence, and existing solutions.</li><li><b>Synthesize.</b> Separate public facts, inferences, assumptions, and unknowns before proposing a strategy.</li><li><b>Challenge.</b> Force every idea to name a behavior, mechanism, cheap disproof, cap, stop rule, and guardrail.</li><li><b>Decide.</b> A person verifies sources and replaces outside-in assumptions with authorized baselines before launch.</li></ol><h3>Study limitations</h3><ul>{report.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul><p className="muted">{report.mode === 'example' ? 'This is a portfolio thesis built from public information. It demonstrates the system; it is not an internal PostHog diagnosis.' : report.mode === 'manual' ? 'This study includes user-entered evidence. Saving validates its structure and links, not the truth of the source summaries.' : 'Source URLs were checked against the search registry. Automated review checks consistency with research notes, not independent factual truth.'}</p>{!configured && <div className="connection-note"><b>Live AI setup pending</b><p>The hosted app needs a server-side OpenAI API key. Manual studies and the example work independently.</p></div>}</div></details></TabsContent></Tabs>
 <footer className="app-footer"><span>signaldesk / evidence-led GTM</span><span>Independent research · {new Date(report.generatedAt).toLocaleDateString()}</span></footer>
 </div>
 <Dialog open={dialog !== null} onOpenChange={open => { if (!open && !busy) {
        setDialog(null);
        setError('');
    } }}><DialogContent className="editor-dialog"><DialogTitle>{dialog === 'new' ? 'Start a company study' : dialog === 'brief' ? 'Edit research brief' : dialog === 'evidence' ? 'Evidence record' : 'Proposed experiment'}</DialogTitle><DialogDescription>{dialog === 'new' ? 'Define the company and question. Saving a brief does not call AI.' : dialog === 'evidence' ? 'Summarize what the source actually says. Include its limitations.' : dialog === 'brief' ? 'Changing the brief clears proposed experiments. Changing the company also clears evidence.' : 'Edits are saved as manual work and reset any in-progress AI research.'}</DialogDescription>{error && <p className="error" role="alert">{error}</p>}<form onSubmit={dialog === 'new' ? create : submitEdit}>
 {(dialog === 'new' || dialog === 'brief') && <><Field label="Company" value={brief.company} max={150} onChange={v => setBrief({ ...brief, company: v })}/><Field label="Company website (HTTPS)" value={brief.website} type="url" max={2048} onChange={v => setBrief({ ...brief, website: v })}/><Field label="Target audience" value={brief.audience} max={1000} onChange={v => setBrief({ ...brief, audience: v })}/><Field label="What do you want to investigate?" value={brief.objective} multiline max={1500} onChange={v => setBrief({ ...brief, objective: v })}/><div className="form-row"><Field label="Industry or category (optional)" value={brief.industry ?? ''} required={false} max={250} onChange={v => setBrief({ ...brief, industry: v })}/><Field label="Business model (optional)" value={brief.businessModel ?? ''} required={false} max={250} onChange={v => setBrief({ ...brief, businessModel: v })}/></div><div className="form-row"><Field label="GTM motion (optional)" value={brief.gtmMotion ?? ''} required={false} max={250} onChange={v => setBrief({ ...brief, gtmMotion: v })}/><Field label="Company stage (optional)" value={brief.companyStage ?? ''} required={false} max={250} onChange={v => setBrief({ ...brief, companyStage: v })}/></div><Field label="Primary geography (optional)" value={brief.geography ?? ''} required={false} max={250} onChange={v => setBrief({ ...brief, geography: v })}/><Field label="Constraints and assumptions (optional)" value={brief.constraints} multiline required={false} max={2000} onChange={v => setBrief({ ...brief, constraints: v })}/></>}
 {dialog === 'evidence' && evidence && <><Field label="Observation title" value={evidence.title} max={250} onChange={v => setEvidence({ ...evidence, title: v })}/><Field label="Source URL (HTTPS)" value={evidence.url} type="url" max={2048} onChange={v => setEvidence({ ...evidence, url: v })}/><Picker label="Evidence type" value={evidence.kind} items={['complaint', 'positive', 'context']} onChange={v => setEvidence({ ...evidence, kind: v as Evidence['kind'] })}/><Field label="Source summary (paraphrase)" value={evidence.summary} multiline onChange={v => setEvidence({ ...evidence, summary: v })}/><Field label="Publication date (leave blank if unknown)" value={evidence.date ?? ''} type="date" required={false} onChange={v => setEvidence({ ...evidence, date: v || null })}/><Field label="Limitations or conflicting context" value={evidence.limitation} multiline onChange={v => setEvidence({ ...evidence, limitation: v })}/></>}
 {dialog === 'opportunity' && opportunity && <><Field label="Experiment title" value={opportunity.title} max={250} onChange={v => setOpportunity({ ...opportunity, title: v })}/><Field label="Hypothesis" value={opportunity.hypothesis} multiline onChange={v => setOpportunity({ ...opportunity, hypothesis: v })}/><div className="form-row"><Picker label="Journey stage" value={opportunity.stage} items={['Discover', 'Evaluate', 'Activate', 'Retain']} onChange={v => setOpportunity({ ...opportunity, stage: v as Opportunity['stage'] })}/><Picker label="Estimated effort" value={opportunity.effort} items={['Low', 'Medium', 'High']} onChange={v => setOpportunity({ ...opportunity, effort: v as Opportunity['effort'] })}/></div><Field label="Proposed action" value={opportunity.action} multiline onChange={v => setOpportunity({ ...opportunity, action: v })}/><Field label="Success metric (no invented baseline)" value={opportunity.metric} multiline onChange={v => setOpportunity({ ...opportunity, metric: v })}/><Field label="Validation needed before launch" value={opportunity.validation} multiline onChange={v => setOpportunity({ ...opportunity, validation: v })}/><Field label="Proposed owner or role" value={opportunity.owner} max={150} onChange={v => setOpportunity({ ...opportunity, owner: v })}/><fieldset><legend>Supporting evidence (at least one)</legend>{report.evidence.map(e => <label className="check-row" key={e.id}><Checkbox checked={opportunity.evidenceIds.includes(e.id)} onCheckedChange={checked => setOpportunity({ ...opportunity, evidenceIds: checked ? [...opportunity.evidenceIds, e.id] : opportunity.evidenceIds.filter(id => id !== e.id), counterEvidenceIds: checked ? opportunity.counterEvidenceIds.filter(id => id !== e.id) : opportunity.counterEvidenceIds })}/>{e.id} · {e.title}</label>)}</fieldset><fieldset><legend>Counterevidence</legend>{report.evidence.map(e => <label className="check-row" key={e.id}><Checkbox checked={opportunity.counterEvidenceIds.includes(e.id)} onCheckedChange={checked => setOpportunity({ ...opportunity, counterEvidenceIds: checked ? [...opportunity.counterEvidenceIds, e.id] : opportunity.counterEvidenceIds.filter(id => id !== e.id), evidenceIds: checked ? opportunity.evidenceIds.filter(id => id !== e.id) : opportunity.evidenceIds })}/>{e.id} · {e.title}</label>)}</fieldset></>}
 <div className="dialog-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setDialog(null)}>Cancel</button><button className="primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16}/> : null}{dialog === 'new' ? 'Create study' : 'Save changes'}</button></div></form></DialogContent></Dialog>
 </main>;
}
function cryptoId() { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ''; }
function message(e: unknown) { if (e && typeof e === 'object' && 'issues' in e)
    return 'Check required fields, source URLs, and selected supporting evidence.'; return e instanceof Error ? e.message : 'Something went wrong. Please try again.'; }
function caseStudyMarkdown(report: Report, study: Study | null) { let content = toMarkdown(report); if (!study) return content + '\n## Decision history\nCurated example; no saved run trace or execution history.\n'; content += `\n## Planner\n${study.planner ? `Objective: ${study.planner.objective}\nBottleneck hypothesis: ${study.planner.bottleneckHypothesis}\nData gaps:\n${study.planner.dataGaps.map(x => `- ${x}`).join('\n')}` : 'No planner output saved.'}\n\n## Execution packs\n${study.operations.tasks.map(t => `- ${t.title} — ${t.status}; ${t.startDate} to ${t.dueDate}; cap USD ${t.budgetCap}; approved ${t.approvedAt ?? 'not recorded'}`).join('\n') || '- None prepared.'}\n\n## Recorded metrics\n${study.operations.metrics.map(m => `- ${m.name}: ${m.value} ${m.unit}; ${m.windowStart} to ${m.windowEnd}; source: ${m.source}`).join('\n') || '- None recorded.'}\n\n## Outcomes\n${study.operations.outcomes.map(o => `- ${o.metric}: ${o.baselineSuccess}/${o.baselineTotal} to ${o.testSuccess}/${o.testTotal}; design: ${o.design}; source: ${o.source}`).join('\n') || '- None recorded.'}\n\n## Run trace\n${study.trace.map(t => `- ${t.at}: ${t.phase} ${t.status} in ${t.durationMs}ms; prompt ${t.promptVersion}; ${t.signal}`).join('\n') || '- No AI stages recorded.'}\n`; return content; }
function evaluationMarkdown(report: Report) { const evaluation = evaluateReport(report); return `\n## System evaluation\nScore: ${evaluation.score}/100 — ${evaluation.status}\n\n### Weighted rubric\n${evaluation.dimensions.map(item => `- ${item.label}: ${item.score ?? 'Unmeasured'} (${item.status}). Next: ${item.nextAction}`).join('\n')}\n\n### Hard gates\n${evaluation.gates.map(item => `- ${item.pass ? 'PASS' : 'FAIL'} — ${item.name}: ${item.detail}`).join('\n')}\n\nThis deterministic evaluation checks discipline and completeness. It does not independently prove source truth, causal impact, or repeated-run stability.\n`; }
