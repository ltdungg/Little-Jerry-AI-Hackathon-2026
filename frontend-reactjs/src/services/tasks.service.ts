import * as api from '../lib/api';
import type { Task, TaskComment, TaskPriority, TaskStatus } from '../types';

/**
 * The real backend scopes tasks by project_id (`/v1/projects/{id}/tasks/{taskId}`),
 * but this service's public functions only take a task id (kept identical to the
 * original mock signatures so pages don't need to change). We cache the
 * project_id seen on the last listTasks() call so mutate-by-id calls can look
 * it up — the same role the in-memory mock array used to play.
 */
const projectIdByTaskId = new Map<string, string>();

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function mapPriority(priority: string): TaskPriority {
  return priority === 'critical' ? 'high' : ((priority as TaskPriority) || 'medium');
}

function mapComment(c: any): TaskComment {
  const author = c.author_display_name || c.author_id || '';
  return {
    id: c.comment_id,
    author,
    authorInitials: author ? initialsOf(author) : '',
    content: c.content,
    createdAt: c.created_at,
  };
}

function mapTask(t: any, projectNames: Record<string, string>): Task {
  const assignee = t.assignee;
  projectIdByTaskId.set(t.task_id, t.project_id);
  return {
    id: t.task_id,
    title: t.title,
    description: t.description || '',
    programId: t.project_id,
    programName: projectNames[t.project_id] || t.project_id,
    teamId: '',
    assigneeId: assignee?.user_id || null,
    assigneeName: assignee?.display_name || null,
    assigneeInitials: assignee?.display_name ? initialsOf(assignee.display_name) : null,
    priority: mapPriority(t.priority),
    status: t.status,
    dueDate: t.due_date || null,
    dependsOnTaskIds: t.depends_on_task_ids || [],
    comments: (t.comments || []).map(mapComment),
    updatedAt: t.updated_at || '',
  };
}

function requireProjectId(taskId: string): string {
  const projectId = projectIdByTaskId.get(taskId);
  if (!projectId) {
    throw new Error(`Không xác định được chương trình của nhiệm vụ ${taskId}. Hãy tải lại danh sách nhiệm vụ.`);
  }
  return projectId;
}

export interface ListTasksParams {
  assigneeId?: string;
  status?: TaskStatus | 'all';
  programId?: string;
}

export async function listTasks(params: ListTasksParams = {}): Promise<Task[]> {
  const status = params.status && params.status !== 'all' ? params.status : undefined;
  const [rawTasks, projectNames] = await Promise.all([
    params.assigneeId
      ? api.getMyTasks({ status })
      : api.getAllTasks({ status, project_id: params.programId }),
    api.getProjectNameMap(),
  ]);
  return rawTasks.map((t) => mapTask(t, projectNames));
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const raw = await api.updateTask(requireProjectId(id), id, { status });
  const projectNames = await api.getProjectNameMap();
  return mapTask(raw, projectNames);
}

export async function assignTask(id: string, assigneeName: string, assigneeInitials: string): Promise<Task> {
  const raw = await api.updateTask(requireProjectId(id), id, {
    assignee: { user_id: assigneeName, display_name: assigneeName },
  });
  const projectNames = await api.getProjectNameMap();
  const task = mapTask(raw, projectNames);
  // Server only stores a user_id/display_name pair; keep the caller-provided
  // initials since the backend has no user directory to derive them from yet.
  return { ...task, assigneeInitials };
}

export async function setTaskDueDate(id: string, dueDate: string): Promise<Task> {
  const raw = await api.updateTask(requireProjectId(id), id, { due_date: dueDate });
  const projectNames = await api.getProjectNameMap();
  return mapTask(raw, projectNames);
}

export async function addTaskComment(id: string, content: string, author: string): Promise<Task> {
  const raw = await api.addTaskComment(requireProjectId(id), id, content, author);
  const projectNames = await api.getProjectNameMap();
  return mapTask(raw, projectNames);
}

export function taskPriorityLabel(priority: TaskPriority): string {
  return { low: 'Thấp', medium: 'Trung bình', high: 'Cao' }[priority];
}

export function taskStatusLabel(status: TaskStatus): string {
  return { todo: 'Chưa bắt đầu', in_progress: 'Đang làm', blocked: 'Đang bị chặn', done: 'Hoàn thành' }[status];
}
