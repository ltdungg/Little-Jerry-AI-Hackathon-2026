import { getIdToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await getIdToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(await authHeaders()), ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API error ${res.status}`);
  }
  return res.json();
}

// ── User ──
export async function getMe() {
  return apiFetch<{ user_id: string; display_name: string; email: string; roles: string[]; capabilities: string[]; projects: { project_id: string; name: string; role: string }[] }>('/v1/me');
}

// ── Projects ──
export async function getProjects() {
  return apiFetch<any[]>('/v1/projects');
}

/** Small lookup used by services (tasks/issues/decisions) to resolve a bare
 * project_id into a display name without an N+1 request per row. */
export async function getProjectNameMap(): Promise<Record<string, string>> {
  const projects = await getProjects();
  const map: Record<string, string> = {};
  for (const p of projects) map[p.project_id] = p.name;
  return map;
}

export async function getProject(projectId: string) {
  return apiFetch<any>(`/v1/projects/${projectId}`);
}

// ── Tasks ──
export async function getTasks(projectId: string, params?: { status?: string; priority?: string; assignee?: string; overdue_only?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.priority) qs.set('priority', params.priority);
  if (params?.assignee) qs.set('assignee', params.assignee);
  if (params?.overdue_only) qs.set('overdue_only', 'true');
  const query = qs.toString();
  return apiFetch<any[]>(`/v1/projects/${projectId}/tasks${query ? `?${query}` : ''}`);
}

export async function getTask(projectId: string, taskId: string) {
  return apiFetch<any>(`/v1/projects/${projectId}/tasks/${taskId}`);
}

// ── Risks ──
export async function getRisks(projectId: string, params?: { severity?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.severity) qs.set('severity', params.severity);
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString();
  return apiFetch<any[]>(`/v1/projects/${projectId}/risks${query ? `?${query}` : ''}`);
}

// ── Milestones ──
export async function getMilestones(projectId: string) {
  return apiFetch<any[]>(`/v1/projects/${projectId}/milestones`);
}

// ── Chat ──
export async function sendMessage(message: string, projectId?: string, sessionId?: string, idempotencyKey?: string) {
  return apiFetch<any>('/v1/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      project_id: projectId,
      session_id: sessionId,
      mode: 'sync',
      idempotency_key: idempotencyKey,
    }),
  });
}

// ── Workflows ──
export async function createWorkflow(data: { message: string; project_id?: string; mode?: string; idempotency_key?: string }) {
  return apiFetch<any>('/v1/workflows', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getWorkflow(workflowId: string) {
  return apiFetch<any>(`/v1/workflows/${workflowId}`);
}

export async function confirmWorkflow(workflowId: string, confirmationToken: string) {
  return apiFetch<any>(`/v1/workflows/${workflowId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ confirmation_token: confirmationToken }),
  });
}

export async function cancelWorkflow(workflowId: string) {
  return apiFetch<any>(`/v1/workflows/${workflowId}/cancel`, { method: 'POST' });
}

// ── Task Proposals ──
export async function createTaskProposal(projectId: string, data: any) {
  return apiFetch<any>(`/v1/projects/${projectId}/tasks/proposals`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Tasks (tenant-wide) ──
export async function getAllTasks(params?: { status?: string; project_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.project_id) qs.set('project_id', params.project_id);
  const query = qs.toString();
  return apiFetch<any[]>(`/v1/tasks${query ? `?${query}` : ''}`);
}

// ── My tasks (cross-project) ──
export async function getMyTasks(params?: { status?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString();
  return apiFetch<any[]>(`/v1/me/tasks${query ? `?${query}` : ''}`);
}

export async function updateTask(projectId: string, taskId: string, data: Record<string, unknown>) {
  return apiFetch<any>(`/v1/projects/${projectId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function addTaskComment(projectId: string, taskId: string, content: string, authorDisplayName?: string) {
  return apiFetch<any>(`/v1/projects/${projectId}/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, author_display_name: authorDisplayName }),
  });
}

// ── Issues (tenant-wide) ──
export async function getIssues(params?: { status?: string; impact?: string; source?: string; project_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.impact) qs.set('impact', params.impact);
  if (params?.source) qs.set('source', params.source);
  if (params?.project_id) qs.set('project_id', params.project_id);
  const query = qs.toString();
  return apiFetch<any[]>(`/v1/issues${query ? `?${query}` : ''}`);
}

export async function updateIssue(projectId: string, issueId: string, data: Record<string, unknown>) {
  return apiFetch<any>(`/v1/issues/${issueId}?project_id=${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function dismissIssue(projectId: string, issueId: string) {
  return apiFetch<any>(`/v1/issues/${issueId}?project_id=${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });
}

// ── Decisions (tenant-wide) ──
export async function getDecisions(params?: { approval_status?: string; project_id?: string; only_confirmed?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.approval_status) qs.set('approval_status', params.approval_status);
  if (params?.project_id) qs.set('project_id', params.project_id);
  if (params?.only_confirmed) qs.set('only_confirmed', 'true');
  const query = qs.toString();
  return apiFetch<any[]>(`/v1/decisions${query ? `?${query}` : ''}`);
}

export async function updateDecision(projectId: string, decisionId: string, data: Record<string, unknown>) {
  return apiFetch<any>(`/v1/decisions/${decisionId}?project_id=${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ── Notifications (current user) ──
export async function getNotifications() {
  return apiFetch<any[]>('/v1/me/notifications');
}

export async function markNotificationRead(notificationId: string) {
  return apiFetch<any>(`/v1/me/notifications/${notificationId}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead() {
  return apiFetch<any>('/v1/me/notifications/read-all', { method: 'POST' });
}

// ── Activity log ──
export async function getActivityLog(params?: { action?: string }) {
  const qs = new URLSearchParams();
  if (params?.action) qs.set('action', params.action);
  const query = qs.toString();
  return apiFetch<any[]>(`/v1/activity-log${query ? `?${query}` : ''}`);
}

// ── Teams ──
export async function getTeams() {
  return apiFetch<any[]>('/v1/teams');
}

export async function getTeam(teamId: string) {
  return apiFetch<any>(`/v1/teams/${teamId}`);
}

// ── Users (members / admin users) ──
export async function getUsers(params?: { team?: string; kind?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.team) qs.set('team', params.team);
  if (params?.kind) qs.set('kind', params.kind);
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString();
  return apiFetch<any[]>(`/v1/users${query ? `?${query}` : ''}`);
}

export async function updateUser(userId: string, data: Record<string, unknown>) {
  return apiFetch<any>(`/v1/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// ── Admin ──
export async function createAdminUser(data: { username: string; email: string; password: string }) {
  return apiFetch<any>('/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Weekly updates (current user) ──
export async function getMyCurrentUpdate() {
  return apiFetch<any | null>('/v1/me/updates/current');
}

export async function getMyUpdates() {
  return apiFetch<any[]>('/v1/me/updates');
}

export async function saveUpdateDraft(data: Record<string, unknown>) {
  return apiFetch<any>('/v1/me/updates', { method: 'PUT', body: JSON.stringify(data) });
}

export async function submitUpdate(week: string) {
  return apiFetch<any>(`/v1/me/updates/${week}/submit`, { method: 'POST' });
}

// ── Team weekly reports ──
export async function getTeamReports(teamId: string) {
  return apiFetch<any[]>(`/v1/teams/${teamId}/reports`);
}

export async function getAllTeamReports() {
  return apiFetch<any[]>('/v1/team-reports');
}

export async function remindTeamReport(teamId: string, week: string) {
  return apiFetch<any>(`/v1/teams/${teamId}/reports/${week}/remind`, { method: 'POST' });
}

export async function approveTeamReport(teamId: string, week: string) {
  return apiFetch<any>(`/v1/teams/${teamId}/reports/${week}/approve`, { method: 'POST' });
}

export async function publishTeamReport(teamId: string, week: string) {
  return apiFetch<any>(`/v1/teams/${teamId}/reports/${week}/publish`, { method: 'POST' });
}

// ── Meetings ──
export async function getMeetings() {
  return apiFetch<any[]>('/v1/meetings');
}

export async function getMeeting(meetingId: string) {
  return apiFetch<any>(`/v1/meetings/${meetingId}`);
}

export async function decideMeetingActionItem(meetingId: string, actionItemId: string, decision: 'confirm' | 'reject', owner?: string) {
  return apiFetch<any>(`/v1/meetings/${meetingId}/action-items/${actionItemId}/${decision}`, {
    method: 'POST',
    body: JSON.stringify({ owner }),
  });
}

// ── Knowledge documents ──
export async function getDocuments(params?: { status?: string; kind?: string; team_name?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.kind) qs.set('kind', params.kind);
  if (params?.team_name) qs.set('team_name', params.team_name);
  const query = qs.toString();
  return apiFetch<any[]>(`/v1/documents${query ? `?${query}` : ''}`);
}

export async function updateDocument(docId: string, data: Record<string, unknown>) {
  return apiFetch<any>(`/v1/documents/${docId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// ── Handoff / offboarding ──
export async function getHandoffs() {
  return apiFetch<any[]>('/v1/handoffs');
}

export async function updateHandoff(handoffId: string, status: string) {
  return apiFetch<any>(`/v1/handoffs/${handoffId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function getOffboardingRecords() {
  return apiFetch<any[]>('/v1/offboarding');
}

export async function confirmOffboardingHandoff(offboardingId: string) {
  return apiFetch<any>(`/v1/offboarding/${offboardingId}/confirm-handoff-complete`, { method: 'POST' });
}

// ── Role permissions ──
export async function getRolePermissions() {
  return apiFetch<any[]>('/v1/roles/permissions');
}

export async function toggleRolePermission(role: string, action: string) {
  return apiFetch<any>('/v1/roles/permissions', { method: 'PATCH', body: JSON.stringify({ role, action }) });
}

// ── Onboarding ──
export async function getOnboarding() {
  return apiFetch<any>('/v1/onboarding');
}

export async function toggleOnboardingChecklistItem(itemId: string) {
  return apiFetch<any>(`/v1/onboarding/checklist/${itemId}/toggle`, { method: 'POST' });
}

// ── Assistant: chat sessions + saved answers ──
export async function getChatSessions() {
  return apiFetch<any[]>('/v1/me/chat-sessions');
}

export async function renameChatSession(sessionId: string, title: string) {
  return apiFetch<any>(`/v1/me/chat-sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify({ title }) });
}

export async function getSavedAnswers() {
  return apiFetch<any[]>('/v1/me/saved-answers');
}

export async function createSavedAnswer(data: Record<string, unknown>) {
  return apiFetch<any>('/v1/me/saved-answers', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteSavedAnswer(savedId: string) {
  return apiFetch<void>(`/v1/me/saved-answers/${savedId}`, { method: 'DELETE' });
}

// ── Leadership summary ──
export async function getLeadershipSummary() {
  return apiFetch<any>('/v1/reports/leadership-summary');
}

// ── Project reports (daily/weekly AI-generated, editable, PDF export) ──
export async function getProjectReports(projectId: string, params?: { category?: string }) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  const query = qs.toString();
  return apiFetch<any[]>(`/v1/projects/${projectId}/reports${query ? `?${query}` : ''}`);
}

export async function getAllReports(params?: { category?: string; project_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.project_id) qs.set('project_id', params.project_id);
  const query = qs.toString();
  return apiFetch<any[]>(`/v1/reports${query ? `?${query}` : ''}`);
}

export async function createReport(projectId: string, reportType: string) {
  return apiFetch<any>(`/v1/projects/${projectId}/reports`, {
    method: 'POST',
    body: JSON.stringify({ report_type: reportType }),
  });
}

export async function getReport(reportId: string) {
  return apiFetch<any>(`/v1/reports/${reportId}`);
}

export async function updateReport(reportId: string, content: string) {
  return apiFetch<any>(`/v1/reports/${reportId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function exportReportPdf(reportId: string) {
  return apiFetch<{ report_id: string; pdf_s3_uri: string; download_url: string; expires_in: number }>(
    `/v1/reports/${reportId}/export-pdf`,
    { method: 'POST' },
  );
}

// ── Daily updates (cập nhật tiến độ task hằng ngày, theo dự án) ──
export async function getDailyUpdates(projectId: string, date?: string) {
  const qs = new URLSearchParams();
  if (date) qs.set('date', date);
  const query = qs.toString();
  return apiFetch<any[]>(`/v1/projects/${projectId}/daily-updates${query ? `?${query}` : ''}`);
}

export async function submitDailyUpdate(projectId: string, data: { user_name?: string; date?: string; task_updates: Record<string, unknown>[] }) {
  return apiFetch<any>(`/v1/projects/${projectId}/daily-updates`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
