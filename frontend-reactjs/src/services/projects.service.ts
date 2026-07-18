import * as api from '../lib/api';
import type { Project, ProjectStatus } from '../types';

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

function mapProject(p: any): Project {
  const ownerName = p.manager?.display_name || '';
  return {
    id: p.project_id,
    name: p.name,
    program: p.program_name || '',
    status: mapHealth(p.health),
    owner: ownerName,
    ownerInitials: ownerName ? initialsOf(ownerName) : '',
    nextMilestone: p.next_milestone || '',
    overdueCount: p.overdue_task_count || 0,
    highRiskCount: p.high_risk_count || 0,
    progress: p.progress || 0,
    team: p.team_name || '',
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
