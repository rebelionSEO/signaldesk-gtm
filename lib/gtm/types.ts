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
export type Opportunity = {
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
    brief: Brief;
    summary: string;
    evidence: Evidence[];
    opportunities: Opportunity[];
    unknowns: string[];
    generatedAt: string;
    mode: 'example' | 'live' | 'manual';
    warnings: string[];
};
