import * as api from '../lib/api';
import type { LeadershipSummary } from '../types';

export async function getLeadershipSummary(): Promise<LeadershipSummary> {
  const s = await api.getLeadershipSummary();
  return {
    totalPrograms: s.total_programs,
    onTrack: s.on_track,
    atRisk: s.at_risk,
    overdue: s.overdue,
    criticalIssues: s.critical_issues,
    overdueIssues: s.overdue_issues,
    pendingDecisions: s.pending_decisions,
    teamsMissingReport: s.teams_missing_report,
    weeklyHighlights: s.weekly_highlights,
    attentionItems: s.attention_items,
  };
}
