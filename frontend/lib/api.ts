import { getIdToken } from './auth'
import type { UserProfile, Project, Task, Risk, Milestone, Workflow, ChatResponse } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = await getIdToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(await authHeaders()), ...options?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `API error ${res.status}`)
  }
  return res.json()
}

// ── Auth / Profile ──
export async function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/v1/me')
}

// ── Projects ──
export async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/v1/projects')
}

export async function getProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/v1/projects/${projectId}`)
}

// ── Tasks ──
export async function getTasks(
  projectId: string,
  params?: { status?: string; priority?: string; assignee?: string; overdue_only?: boolean }
): Promise<Task[]> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.priority) qs.set('priority', params.priority)
  if (params?.assignee) qs.set('assignee', params.assignee)
  if (params?.overdue_only) qs.set('overdue_only', 'true')
  const query = qs.toString()
  return apiFetch<Task[]>(`/v1/projects/${projectId}/tasks${query ? `?${query}` : ''}`)
}

export async function getTask(projectId: string, taskId: string): Promise<Task> {
  return apiFetch<Task>(`/v1/projects/${projectId}/tasks/${taskId}`)
}

// ── Risks ──
export async function getRisks(
  projectId: string,
  params?: { severity?: string; status?: string }
): Promise<Risk[]> {
  const qs = new URLSearchParams()
  if (params?.severity) qs.set('severity', params.severity)
  if (params?.status) qs.set('status', params.status)
  const query = qs.toString()
  return apiFetch<Risk[]>(`/v1/projects/${projectId}/risks${query ? `?${query}` : ''}`)
}

// ── Milestones ──
export async function getMilestones(projectId: string): Promise<Milestone[]> {
  return apiFetch<Milestone[]>(`/v1/projects/${projectId}/milestones`)
}

// ── Chat ──
export async function sendMessage(
  message: string,
  projectId?: string,
  idempotencyKey?: string
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/v1/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      project_id: projectId,
      mode: 'sync',
      idempotency_key: idempotencyKey,
    }),
  })
}

// ── Workflows ──
export async function createWorkflow(data: {
  message: string
  project_id?: string
  mode?: 'sync' | 'async'
  idempotency_key?: string
}): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/v1/workflows', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getWorkflow(workflowId: string): Promise<Workflow> {
  return apiFetch<Workflow>(`/v1/workflows/${workflowId}`)
}

export async function confirmWorkflow(
  workflowId: string,
  confirmationToken: string
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>(`/v1/workflows/${workflowId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ confirmation_token: confirmationToken }),
  })
}

export async function cancelWorkflow(workflowId: string): Promise<{ workflow_id: string; status: string }> {
  return apiFetch(`/v1/workflows/${workflowId}/cancel`, { method: 'POST' })
}

// ── Task Proposals (WF-03) ──
export async function createTaskProposal(
  projectId: string,
  data: {
    title: string
    description?: string
    assignee_user_id?: string
    priority?: string
    due_date?: string
    milestone_id?: string
    related_risk_ids?: string[]
    expected_version?: number
    task_id?: string
  }
): Promise<{ workflow_id: string; status: string; preview: Record<string, unknown> }> {
  return apiFetch(`/v1/projects/${projectId}/tasks/proposals`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
