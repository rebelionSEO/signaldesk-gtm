import type {Design, OperatingPlan} from './operating';
export type Brief = {
    company: string;
    website: string;
    audience: string;
    objective: string;
    constraints: string;
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
    operatingPlan?: OperatingPlan;
    marketContext?: MarketContext;
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
