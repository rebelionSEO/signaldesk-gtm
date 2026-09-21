import type { Report } from './types';

// Presentation for the curated portfolio case and its saved copies only.
// New research (including new PostHog research) retains the standard workspace.
export function isPostHogCaseStudy(report: Report): boolean {
  try {
    return report.generatedAt === '2026-09-14T12:00:00Z'
      && report.brief.company === 'PostHog'
      && new URL(report.brief.website).hostname === 'posthog.com';
  } catch { return false; }
}
export function caseCopy(report: Report, standard: string, posthog: string): string {
  return isPostHogCaseStudy(report) ? posthog : standard;
}
