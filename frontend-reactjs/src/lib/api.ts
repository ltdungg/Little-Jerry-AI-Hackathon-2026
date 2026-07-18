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
