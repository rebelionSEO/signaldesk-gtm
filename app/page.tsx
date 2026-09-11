'use client';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowUpRight, BookOpen, Download, FlaskConical, Layers, LoaderCircle, Pencil, Plus, Radio, Search, ShieldCheck, ExternalLink } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { example } from '@/lib/gtm/example';
import { briefSchema, evidenceSchema, opportunitySchema, referenceErrors, toMarkdown, canonicalUrl } from '@/lib/gtm/validation';
import type { Brief, Evidence, Opportunity, Report } from '@/lib/gtm/types';
type Study = {
    id: string;
    report: Report;
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
const blank: Brief = { company: '', website: 'https://', audience: '', objective: '', constraints: '' };
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
    state.current = { report, study };
    const mounted = useRef(true);
    const createId = useRef(cryptoId());
    function apply(s: Study) { setStudy(s); setReport(s.report); const url = new URL(window.location.href); url.searchParams.set('study', s.id); window.history.replaceState({}, '', url); }
    async function refresh() { const result = await request('/api/projects'); setStudies(result.studies); }
    async function load(id: string) { setError(''); setFocus([]); setBusy(true); try {
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
    } }
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
    } } void init(); return () => { mounted.current = false; }; }, []);
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
        setTab('brief');
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
            await save({ ...report, brief: b, summary: 'Brief updated. Review evidence and rebuild the proposed experiments.', opportunities: [], ...((b.company !== report.brief.company || b.website !== report.brief.website) ? { evidence: [], unknowns: ['Which customer problems are supported by public evidence?'] } : {}) });
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
        for (let i = 0; i < 3; i++) {
            setPhase(current.stage === 'researched' ? 'Building an evidence-linked plan' : current.stage === 'planned' ? 'Checking claims and source references' : 'Searching public sources and counterevidence');
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
    function download(format: 'md' | 'json') { const content = format === 'md' ? toMarkdown(report) : JSON.stringify(report, null, 2); const url = URL.createObjectURL(new Blob([content], { type: format === 'md' ? 'text/markdown' : 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = report.brief.company.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-gtm-study.' + format; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    function showEvidence(ids: string[]) { setFocus(ids); setSearch(''); setKind('All'); setTab('evidence'); }
    const sourceCount = new Set(report.evidence.map(e => canonicalUrl(e.url))).size;
    const positives = report.evidence.filter(e => e.kind === 'positive').length;
    const filtered = report.evidence.filter(e => (kind === 'All' || e.kind === kind) && (!focus.length || focus.includes(e.id)) && `${e.title} ${e.summary} ${e.url}`.toLowerCase().includes(search.toLowerCase()));
    const editable = !!study && signedIn && !busy && !study.busy;
    const locked = busy || !!study?.busy;
    return <main className="workspace"><header className="topbar"><a className="brand" href="/"><Radio size={23}/>signaldesk<span> / GTM workspace</span></a><span className="private-label"><ShieldCheck size={15}/> Evidence before action</span></header><div className="shell">
 <div className="workspace-tools"><Select value={study?.id ?? 'example'} onValueChange={id => void load(id)} disabled={busy}><SelectTrigger aria-label="Choose a study"><SelectValue placeholder="Choose a study"/></SelectTrigger><SelectContent><SelectItem value="example">PostHog · example</SelectItem>{studies.map(s => <SelectItem key={s.id} value={s.id}>{s.brief.company} · {s.stage === 'complete' ? 'reviewed' : 'draft'}</SelectItem>)}</SelectContent></Select><span className="saved-state">{study ? 'Saved ' + new Date(study.updatedAt).toLocaleDateString() : 'Curated example · not a live run'}</span></div>
 {signedIn === false && <div className="notice"><p>Explore the example, or sign in to save your own research.</p><a href="/signin-with-chatgpt?return_to=/" target="_top">Sign in ↗</a></div>}
 {error && <div className="error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
 {notice && <div className="success" role="status">{notice}</div>}
 <div className="page-heading"><div><p className="eyebrow">RESEARCH WORKSPACE</p><h1>{report.brief.company}<span className="badge">{report.mode === 'example' ? 'Example study' : report.mode === 'live' ? 'AI-researched · review sources' : 'Manual study'}</span></h1><p className="muted audience">{report.brief.audience}</p></div><button className="primary" disabled={locked || signedIn !== true} onClick={() => { setBrief(blank); setError(''); createId.current = cryptoId(); setDialog('new'); }}><Plus size={17}/> New research</button></div>
 <div className="actionbar"><div className="run-status">{busy ? <><LoaderCircle size={17} className="spin"/>{phase || 'Saving your study…'}</> : <><span className={'status-mark ' + (configured ? 'connected' : '')}/>{configured ? 'Live research connected' : 'Live research needs an AI connection'}</>}</div><div className="actions">{study ? <button className="primary compact" disabled={locked || !configured} onClick={() => void run()}><Search size={16}/>{['researched', 'planned'].includes(study.stage) ? 'Resume research' : study.stage === 'complete' ? 'New live run' : 'Run live research'}</button> : <button className="secondary" disabled={locked || signedIn !== true} onClick={() => void copyExample()}>Save an editable copy</button>}<button className="secondary" onClick={() => download('md')}><Download size={16}/> Export brief</button><button className="secondary" onClick={() => download('json')}>JSON</button></div></div>
 {study?.busy && !busy && <div className="notice"><p>A research stage is running or recovering. Reload the study after a few minutes.</p><button className="secondary" onClick={() => void load(study.id)}>Reload study</button></div>}
 <Tabs value={tab} onValueChange={setTab}><TabsList className="tabbar" variant="line"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="evidence">Evidence <span>{report.evidence.length}</span></TabsTrigger><TabsTrigger value="plan">Experiments <span>{report.opportunities.length}</span></TabsTrigger><TabsTrigger value="brief">Brief & method</TabsTrigger></TabsList>
 <TabsContent value="overview"><div className="overview-grid"><section className="thesis"><p className="eyebrow">WORKING STRATEGY</p><h2>{report.summary}</h2><p>{report.brief.objective}</p><div className="thesis-foot"><span>Hypothesis · Needs validation</span><FlaskConical size={24}/></div></section><section className="panel snapshot"><p className="eyebrow">RESEARCH AT A GLANCE</p><div className="metrics"><div><strong>{sourceCount}</strong><span>Unique source pages</span></div><div><strong>{report.opportunities.length}</strong><span>Proposed experiments</span></div></div><hr /><p><ShieldCheck size={18}/>{positives ? 'Counterevidence included' : 'Counterevidence still needed'}</p><small>Evidence records can share a source. No measured business impact.</small></section></div>
 <div className="section-title"><h2>Where the evidence points</h2><button onClick={() => setTab('plan')}>Explore experiments <ArrowUpRight size={17}/></button></div>{!report.opportunities.length ? <Empty>Add evidence, then build an experiment or run research to generate a plan.</Empty> : <div className="opportunity-grid">{report.opportunities.map((o, i) => <article className="panel opportunity" key={o.id}><div className="card-top"><span className="number">0{i + 1}</span><span className="badge">{o.stage}</span></div><h3>{o.title}</h3><p>{o.hypothesis}</p><footer><button onClick={() => showEvidence(o.evidenceIds)}>{o.evidenceIds.length} supporting records ↗</button><span>{o.effort} effort</span></footer></article>)}</div>}
 <div className="note"><Layers size={19}/><div><p><b>Built on signals, not certainty.</b> Every experiment is a proposal. Forum complaints help frame questions; they do not establish a company-wide problem.</p><button onClick={() => setTab('brief')}>Read limitations and method ↗</button></div></div></TabsContent>
 <TabsContent value="evidence"><div className="section-title"><div><h2>Evidence library</h2><p className="muted">Source-linked observations, including opposing experiences.</p></div><button disabled={!editable || report.evidence.length >= 30} onClick={() => { setError(''); setEvidence({ id: 'E' + (Math.max(0, ...report.evidence.map(e => Number(e.id.slice(1)))) + 1), title: '', url: 'https://', summary: '', kind: 'complaint', date: null, limitation: '' }); setDialog('evidence'); }}><Plus size={16}/> Add evidence</button></div><div className="filters"><label className="search-field"><Search size={17}/><input aria-label="Search evidence" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search observations or sources"/></label><Picker label="Evidence type" value={kind} items={['All', 'complaint', 'positive', 'context']} onChange={setKind}/>{focus.length > 0 && <button className="secondary" onClick={() => setFocus([])}>Clear linked-record filter</button>}</div><div className="evidence-grid">{filtered.map(e => <article className="panel evidence-card" key={e.id}><div className="card-top"><span className={'evidence-kind ' + e.kind}>{e.id} / {e.kind}</span><button className="icon-button" aria-label={'Edit ' + e.title} disabled={!editable} onClick={() => { setEvidence({ ...e }); setDialog('evidence'); }}><Pencil size={16}/></button></div><h3>{e.title}</h3><p>{e.summary}</p><a className="source-link" href={e.url} target="_blank" rel="noreferrer">{new URL(e.url).hostname} <ExternalLink size={14}/></a><p className="source-date">Published: {e.date ?? 'Unknown'}</p><div className="limitation"><b>Limit:</b> {e.limitation}</div></article>)}</div>{!filtered.length && <Empty>No matching evidence. Add a source or clear your filters.</Empty>}</TabsContent>
 <TabsContent value="plan"><div className="section-title"><div><h2>Experiments worth testing</h2><p className="muted">Proposed actions. No campaigns have been launched.</p></div><button disabled={!editable || !report.evidence.length || report.opportunities.length >= 5} onClick={() => { setError(''); setOpportunity({ id: 'O' + (Math.max(0, ...report.opportunities.map(o => Number(o.id.slice(1)))) + 1), title: '', hypothesis: '', evidenceIds: [], counterEvidenceIds: [], stage: 'Evaluate', effort: 'Low', action: '', metric: '', validation: '', owner: '' }); setDialog('opportunity'); }}><Plus size={16}/> Add experiment</button></div><div className="journey">{(['Discover', 'Evaluate', 'Activate', 'Retain'] as const).map((s, i) => <div key={s}><span>0{i + 1} / {s}</span><strong>{report.opportunities.filter(o => o.stage === s).length}</strong><small>proposed {report.opportunities.filter(o => o.stage === s).length === 1 ? 'experiment' : 'experiments'}</small></div>)}</div>{report.opportunities.map(o => <article className="panel plan-card" key={o.id}><div className="plan-heading"><div><p className="eyebrow">{o.id} / {o.stage} / {o.effort} EFFORT</p><h3>{o.title}</h3></div><button className="secondary" disabled={!editable} onClick={() => { setOpportunity({ ...o }); setDialog('opportunity'); }}><Pencil size={15}/> Edit</button></div><p className="hypothesis">{o.hypothesis}</p><div className="plan-grid"><div><h4>Proposed action</h4><p>{o.action}</p><h4>Proposed owner</h4><p>{o.owner}</p></div><div><h4>How to measure it</h4><p>{o.metric}</p><h4>Before launch</h4><p>{o.validation}</p></div></div><div className="evidence-links"><button onClick={() => showEvidence(o.evidenceIds)}>Supporting evidence: {o.evidenceIds.join(', ')} ↗</button>{o.counterEvidenceIds.length ? <button onClick={() => showEvidence(o.counterEvidenceIds)}>Counterevidence: {o.counterEvidenceIds.join(', ')} ↗</button> : <span>No counterevidence linked</span>}</div></article>)}{!report.opportunities.length && <Empty>No experiments yet. Start with a supported problem hypothesis.</Empty>}</TabsContent>
 <TabsContent value="brief"><div className="brief-grid"><section className="panel"><div className="plan-heading"><h2>Research brief</h2><button className="secondary" disabled={!editable} onClick={() => { setBrief({ ...report.brief }); setDialog('brief'); }}><Pencil size={15}/> Edit</button></div><dl><dt>Company</dt><dd><a href={report.brief.website} target="_blank" rel="noreferrer">{report.brief.company} ↗</a></dd><dt>Audience</dt><dd>{report.brief.audience}</dd><dt>Working objective</dt><dd>{report.brief.objective}</dd><dt>Constraints & assumptions</dt><dd>{report.brief.constraints || 'None supplied.'}</dd></dl></section><section className="panel"><h2>What we still need to know</h2><ul className="question-list">{report.unknowns.map((x, i) => <li key={i}>{x}</li>)}</ul></section></div><section className="panel method"><h2><BookOpen size={22}/> Research method</h2><ol><li><b>Collect.</b> Search company pages and public discussions for specific experiences, positive evidence, and existing solutions.</li><li><b>Synthesize.</b> Build hypotheses from the retrieved source registry. Dates and benchmarks stay unknown unless supported.</li><li><b>Check.</b> Validate source references and run a separate AI consistency review. Withhold unsupported items.</li><li><b>Decide.</b> A person verifies source content, checks current behavior, and defines a baseline before any launch.</li></ol><h3>Study limitations</h3><ul>{report.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul><p className="muted">{report.mode === 'example' ? 'This sample was curated from the conversation’s public research; it was not produced by the app’s live pipeline.' : report.mode === 'manual' ? 'This study includes user-entered evidence. Saving validates its structure and links, not the truth of the source summaries.' : 'Source URLs were checked against the search registry. Automated review checks consistency with research notes, not independent factual truth.'}</p>{!configured && <div className="connection-note"><b>Live AI setup pending</b><p>The hosted app needs a server-side OpenAI API key. Your ChatGPT subscription does not automatically configure this connection. Manual studies and the example work independently.</p></div>}</section></TabsContent></Tabs>
 <footer className="app-footer"><span>signaldesk / evidence-led GTM</span><span>Independent research · {new Date(report.generatedAt).toLocaleDateString()}</span></footer>
 </div>
 <Dialog open={dialog !== null} onOpenChange={open => { if (!open && !busy) {
        setDialog(null);
        setError('');
    } }}><DialogContent className="editor-dialog"><DialogTitle>{dialog === 'new' ? 'Start a company study' : dialog === 'brief' ? 'Edit research brief' : dialog === 'evidence' ? 'Evidence record' : 'Proposed experiment'}</DialogTitle><DialogDescription>{dialog === 'new' ? 'Define the company and question. Saving a brief does not call AI.' : dialog === 'evidence' ? 'Summarize what the source actually says. Include its limitations.' : dialog === 'brief' ? 'Changing the brief clears proposed experiments. Changing the company also clears evidence.' : 'Edits are saved as manual work and reset any in-progress AI research.'}</DialogDescription>{error && <p className="error" role="alert">{error}</p>}<form onSubmit={dialog === 'new' ? create : submitEdit}>
 {(dialog === 'new' || dialog === 'brief') && <><Field label="Company" value={brief.company} max={150} onChange={v => setBrief({ ...brief, company: v })}/><Field label="Company website (HTTPS)" value={brief.website} type="url" max={2048} onChange={v => setBrief({ ...brief, website: v })}/><Field label="Target audience" value={brief.audience} max={1000} onChange={v => setBrief({ ...brief, audience: v })}/><Field label="What do you want to investigate?" value={brief.objective} multiline max={1500} onChange={v => setBrief({ ...brief, objective: v })}/><Field label="Constraints and assumptions (optional)" value={brief.constraints} multiline required={false} max={2000} onChange={v => setBrief({ ...brief, constraints: v })}/></>}
 {dialog === 'evidence' && evidence && <><Field label="Observation title" value={evidence.title} max={250} onChange={v => setEvidence({ ...evidence, title: v })}/><Field label="Source URL (HTTPS)" value={evidence.url} type="url" max={2048} onChange={v => setEvidence({ ...evidence, url: v })}/><Picker label="Evidence type" value={evidence.kind} items={['complaint', 'positive', 'context']} onChange={v => setEvidence({ ...evidence, kind: v as Evidence['kind'] })}/><Field label="Source summary (paraphrase)" value={evidence.summary} multiline onChange={v => setEvidence({ ...evidence, summary: v })}/><Field label="Publication date (leave blank if unknown)" value={evidence.date ?? ''} type="date" required={false} onChange={v => setEvidence({ ...evidence, date: v || null })}/><Field label="Limitations or conflicting context" value={evidence.limitation} multiline onChange={v => setEvidence({ ...evidence, limitation: v })}/></>}
 {dialog === 'opportunity' && opportunity && <><Field label="Experiment title" value={opportunity.title} max={250} onChange={v => setOpportunity({ ...opportunity, title: v })}/><Field label="Hypothesis" value={opportunity.hypothesis} multiline onChange={v => setOpportunity({ ...opportunity, hypothesis: v })}/><div className="form-row"><Picker label="Journey stage" value={opportunity.stage} items={['Discover', 'Evaluate', 'Activate', 'Retain']} onChange={v => setOpportunity({ ...opportunity, stage: v as Opportunity['stage'] })}/><Picker label="Estimated effort" value={opportunity.effort} items={['Low', 'Medium', 'High']} onChange={v => setOpportunity({ ...opportunity, effort: v as Opportunity['effort'] })}/></div><Field label="Proposed action" value={opportunity.action} multiline onChange={v => setOpportunity({ ...opportunity, action: v })}/><Field label="Success metric (no invented baseline)" value={opportunity.metric} multiline onChange={v => setOpportunity({ ...opportunity, metric: v })}/><Field label="Validation needed before launch" value={opportunity.validation} multiline onChange={v => setOpportunity({ ...opportunity, validation: v })}/><Field label="Proposed owner or role" value={opportunity.owner} max={150} onChange={v => setOpportunity({ ...opportunity, owner: v })}/><fieldset><legend>Supporting evidence (at least one)</legend>{report.evidence.map(e => <label className="check-row" key={e.id}><Checkbox checked={opportunity.evidenceIds.includes(e.id)} onCheckedChange={checked => setOpportunity({ ...opportunity, evidenceIds: checked ? [...opportunity.evidenceIds, e.id] : opportunity.evidenceIds.filter(id => id !== e.id), counterEvidenceIds: checked ? opportunity.counterEvidenceIds.filter(id => id !== e.id) : opportunity.counterEvidenceIds })}/>{e.id} · {e.title}</label>)}</fieldset><fieldset><legend>Counterevidence</legend>{report.evidence.map(e => <label className="check-row" key={e.id}><Checkbox checked={opportunity.counterEvidenceIds.includes(e.id)} onCheckedChange={checked => setOpportunity({ ...opportunity, counterEvidenceIds: checked ? [...opportunity.counterEvidenceIds, e.id] : opportunity.counterEvidenceIds.filter(id => id !== e.id), evidenceIds: checked ? opportunity.evidenceIds.filter(id => id !== e.id) : opportunity.evidenceIds })}/>{e.id} · {e.title}</label>)}</fieldset></>}
 <div className="dialog-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setDialog(null)}>Cancel</button><button className="primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16}/> : null}{dialog === 'new' ? 'Create study' : 'Save changes'}</button></div></form></DialogContent></Dialog>
 </main>;
}
function cryptoId() { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ''; }
function message(e: unknown) { if (e && typeof e === 'object' && 'issues' in e)
    return 'Check required fields, source URLs, and selected supporting evidence.'; return e instanceof Error ? e.message : 'Something went wrong. Please try again.'; }
