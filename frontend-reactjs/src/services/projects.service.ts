import * as api from '../lib/api';
import type { CreateProjectPayload, Project, ProjectMember, ProjectStatus, Role } from '../types';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const HEALTH_TO_STATUS: Record<string, ProjectStatus> = { green: 'healthy', amber: 'at_risk', red: 'overdue' };

function mapHealth(health: string): ProjectStatus {
  return HEALTH_TO_STATUS[health] ?? 'healthy';
}

const ROLE_LABELS: Record<Role, string> = {
  leadership: 'Ban lãnh đạo',
  coordinator: 'Điều phối viên',
  team_lead: 'Trưởng nhóm',
  staff: 'Nhân viên',
  volunteer: 'Tình nguyện viên',
  admin: 'Quản trị viên',
};

function mapProjectMembers(members: any[]): ProjectMember[] {
  if (!members || !Array.isArray(members)) return [];
  return members.map((m) => ({
    userId: m.user_id || m.userId || '',
    userName: m.name || m.user_name || m.userName || '',
    userInitials: m.initials || m.user_initials || m.userInitials || initialsOf(m.name || m.user_name || ''),
    role: (m.role as Role) || 'staff',
    roleLabel: m.role_label || m.roleLabel || ROLE_LABELS[(m.role as Role) || 'staff'],
  }));
}

function mapProject(p: any): Project {
  const ownerName = p.manager?.display_name || '';
  return {
    id: p.project_id,
    name: p.name,
    program: p.program_name || '',
    description: p.description || '',
    status: mapHealth(p.health),
    owner: ownerName,
    ownerInitials: ownerName ? initialsOf(ownerName) : '',
    nextMilestone: p.next_milestone || '',
    overdueCount: p.overdue_task_count || 0,
    highRiskCount: p.high_risk_count || 0,
    progress: p.progress || 0,
    team: p.team_name || '',
    jiraUrl: p.jira_url || '',
    members: mapProjectMembers(p.members || []),
    updatedAt: p.updated_at || '',
  };
}

export async function listProjects(): Promise<Project[]> {
  const raw = await api.getProjects();
  return raw.map(mapProject);
}

export async function getProject(id: string): Promise<Project | undefined> {
  try {
    return mapProject(await api.getProject(id));
  } catch {
    return undefined;
  }
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const raw = await api.createProject({
    name: payload.name,
    program_name: payload.program,
    description: payload.description,
    manager_id: payload.managerId,
    jira_url: payload.jiraUrl,
    members: payload.members.map((m) => ({
      user_id: m.userId,
      role: m.role,
    })),
  });
  return mapProject(raw);
}
