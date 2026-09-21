import type {Design, OperatingPlan} from './operating';
export type Brief = {
    company: string;
    website: string;
    audience: string;
    objective: string;
    constraints: string;
    industry?: string;
    businessModel?: string;
    gtmMotion?: string;
    geography?: string;
    companyStage?: string;
};
export type Evidence = {
    id: string;
    title: string;
    url: string;
    summary: string;
    kind: 'complaint' | 'positive' | 'context';
    date: string | null;
    limitation: string;
};
export type GTMFact = {
    label: string;
    value: string;
    status: 'Public fact' | 'Inference' | 'Assumption' | 'Unknown';
    evidenceIds: string[];
};
export type FunnelStage = {
    name: 'Acquire' | 'Evaluate' | 'Activate' | 'Expand' | 'Retain';
    signal: string;
    state: 'Known' | 'Hypothesis' | 'Missing data';
};
export type MarketContext = {
    thesis: string;
    facts: GTMFact[];
    funnel: FunnelStage[];
};
export type BenchmarkProfile = {
    category: string;
    businessModel: string;
    gtmMotion: string;
    companyStage: string;
    geography: string;
    peers: {
        company: string;
        role: 'Direct competitor' | 'Category leader' | 'Motion leader' | 'Creative reference';
        rationale: string;
        evidenceIds: string[];
    }[];
    metrics: {
        name: string;
        definition: string;
        observedRange: string | null;
        unit: string;
        evidenceIds: string[];
        freshness: string;
        limitation: string;
    }[];
    conventions: string[];
    whitespace: string[];
};
export type CommercialPlan = {
    northStar: string;
    pipelineOutcome: string;
    baseline: string | null;
    target: string | null;
    attributionWindow: string;
    sourceOfTruth: string;
    pipelineLogic: string;
    costPrinciple: string;
    leadingIndicators: { name: string; signal: string; source: string }[];
    guardrails: string[];
    competitivePressures: { id: string; attacker: string; vulnerability: string; likelyMove: string; evidenceIds: string[]; threat: 'High' | 'Medium' | 'Low'; leadingSignal: string; response: string }[];
    defensibility: { asset: string; whyHardToCopy: string; proofNeeded: string }[];
    roadmap: { horizon: '0–30 days' | '31–60 days' | '61–90 days'; objective: string; decisionGate: string; experimentIds: string[] }[];
};
export type Assumption = {
    id: string;
    title: string;
    statement: string;
    confidence: 'Low' | 'Medium' | 'High';
    impact: 'Low' | 'Medium' | 'High';
    evidenceIds: string[];
    whyItMatters: string;
    validation: string;
};
export type Opportunity = {
    design?: Design;
    priority?: 'Now' | 'Next' | 'Later';
    territory?: string;
    behavior?: string;
    id: string;
    title: string;
    hypothesis: string;
    evidenceIds: string[];
    counterEvidenceIds: string[];
    stage: 'Discover' | 'Evaluate' | 'Activate' | 'Retain';
    effort: 'Low' | 'Medium' | 'High';
    action: string;
    metric: string;
    validation: string;
    owner: string;
};
export type Report = {
    economics?: import('./economics').Economics[];
    commercialPlan?: CommercialPlan;
    operatingPlan?: OperatingPlan;
    marketContext?: MarketContext;
    benchmarkProfile?: BenchmarkProfile;
    assumptions?: Assumption[];
    brief: Brief;
    summary: string;
    evidence: Evidence[];
    opportunities: Opportunity[];
    unknowns: string[];
    generatedAt: string;
    mode: 'example' | 'live' | 'manual';
    warnings: string[];
};
