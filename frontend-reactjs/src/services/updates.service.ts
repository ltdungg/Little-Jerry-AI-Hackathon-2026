import * as api from '../lib/api';
import type { TeamMemberSubmission, TeamWeeklyReport, WeeklyUpdate } from '../types';

/** submitUpdate/approveTeamReport/publishTeamReport only take an id, but the
 * real backend needs the (user|team, week) composite key — cache it from the
 * last list/get call, same pattern as tasks/issues/decisions.service.ts. */
const weekByUpdateId = new Map<string, string>();
const teamAndWeekByReportId = new Map<string, { teamId: string; week: string }>();

function mapUpdate(u: any): WeeklyUpdate {
  weekByUpdateId.set(u.update_id, u.week);
  return {
    id: u.update_id,
    userId: u.user_id,
    userName: u.user_name || '',
    week: u.week,
    programIds: u.program_ids || [],
    doneItems: u.done_items || [],
    inProgressItems: u.in_progress_items || [],
    issues: u.issues || '',
    nextSteps: u.next_steps || '',
    supportNeeded: u.support_needed || '',
    status: u.status,
    submittedAt: u.submitted_at ?? null,
  };
}

function mapTeamReport(r: any): TeamWeeklyReport {
  teamAndWeekByReportId.set(r.report_id, { teamId: r.team_id, week: r.week });
  return {
    id: r.report_id,
    teamId: r.team_id,
    teamName: r.team_name || '',
    week: r.week,
    memberSubmissions: (r.member_submissions || []).map((s: any): TeamMemberSubmission => ({
      userId: s.user_id,
      userName: s.user_name || '',
      userInitials: s.user_initials || '',
      submitted: s.submitted,
    })),
    highlights: r.highlights || [],
    issues: r.issues || [],
    nextPriorities: r.next_priorities || [],
    status: r.status,
  };
}

function requireWeek(updateId: string): string {
  const week = weekByUpdateId.get(updateId);
  if (!week) throw new Error(`Không xác định được tuần của cập nhật ${updateId}. Hãy tải lại trang.`);
  return week;
}

function requireTeamAndWeek(reportId: string): { teamId: string; week: string } {
  const found = teamAndWeekByReportId.get(reportId);
  if (!found) throw new Error(`Không xác định được nhóm/tuần của báo cáo ${reportId}. Hãy tải lại trang.`);
  return found;
}

/** The backend always resolves "me" from the JWT — a caller-supplied userId
 * would be meaningless (and unsafe to honor), so unlike the mock version
 * these no longer take a userId parameter. */
export async function getMyCurrentUpdate(): Promise<WeeklyUpdate | undefined> {
  const raw = await api.getMyCurrentUpdate();
  return raw ? mapUpdate(raw) : undefined;
}

export async function listMyUpdates(): Promise<WeeklyUpdate[]> {
  const raw = await api.getMyUpdates();
  return raw.map(mapUpdate);
}

export async function saveUpdateDraft(update: WeeklyUpdate): Promise<WeeklyUpdate> {
  const raw = await api.saveUpdateDraft({
    update_id: update.id,
    user_name: update.userName,
    week: update.week,
    program_ids: update.programIds,
    done_items: update.doneItems,
    in_progress_items: update.inProgressItems,
    issues: update.issues,
    next_steps: update.nextSteps,
    support_needed: update.supportNeeded,
  });
  return mapUpdate(raw);
}

export async function submitUpdate(id: string): Promise<WeeklyUpdate> {
  const raw = await api.submitUpdate(requireWeek(id));
  return mapUpdate(raw);
}

export async function listTeamReports(): Promise<TeamWeeklyReport[]> {
  const raw = await api.getAllTeamReports();
  return raw.map(mapTeamReport);
}

export async function getTeamReport(teamId: string): Promise<TeamWeeklyReport | undefined> {
  const raw = await api.getTeamReports(teamId);
  if (raw.length === 0) return undefined;
  return mapTeamReport(raw[0]);
}

export async function sendReminders(teamId: string, users: TeamMemberSubmission[]): Promise<void> {
  const report = await getTeamReport(teamId);
  if (!report) return;
  await api.remindTeamReport(teamId, report.week);
  void users;
}

export async function approveTeamReport(id: string): Promise<TeamWeeklyReport> {
  const { teamId, week } = requireTeamAndWeek(id);
  const raw = await api.approveTeamReport(teamId, week);
  return mapTeamReport(raw);
}

export async function publishTeamReport(id: string): Promise<TeamWeeklyReport> {
  const { teamId, week } = requireTeamAndWeek(id);
  const raw = await api.publishTeamReport(teamId, week);
  return mapTeamReport(raw);
}
