import { delay } from './mockClient';
import { PROJECTS } from '../lib/mockData';
import { listIssues } from './issues.service';
import { listDecisions } from './decisions.service';
import { listTeamReports } from './updates.service';
import type { LeadershipSummary } from '../types';

export async function getLeadershipSummary(): Promise<LeadershipSummary> {
  const [issues, decisions, teamReports] = await Promise.all([
    listIssues(),
    listDecisions(),
    listTeamReports(),
  ]);

  const teamsMissingReport = teamReports
    .filter((r) => r.memberSubmissions.some((m) => !m.submitted))
    .map((r) => r.teamName);

  return delay({
    totalPrograms: PROJECTS.length,
    onTrack: PROJECTS.filter((p) => p.status === 'healthy').length,
    atRisk: PROJECTS.filter((p) => p.status === 'at_risk').length,
    overdue: PROJECTS.filter((p) => p.status === 'overdue').length,
    criticalIssues: issues.filter((i) => i.impact === 'critical' && i.status !== 'closed').length,
    overdueIssues: issues.filter((i) => i.dueDate && new Date(i.dueDate) < new Date('2026-07-18') && i.status !== 'resolved' && i.status !== 'closed').length,
    pendingDecisions: decisions.filter((d) => d.approvalStatus === 'reviewing' || d.approvalStatus === 'ai_suggested').length,
    teamsMissingReport,
    weeklyHighlights: teamReports.flatMap((r) => r.highlights.map((h) => h.text)).slice(0, 5),
    attentionItems: [
      ...issues.filter((i) => i.impact === 'critical').map((i) => `${i.title} (${i.programName})`),
      ...PROJECTS.filter((p) => p.status === 'overdue').map((p) => `Chương trình "${p.name}" đang quá hạn`),
    ].slice(0, 5),
  });
}
