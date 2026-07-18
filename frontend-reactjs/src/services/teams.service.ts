import * as api from '../lib/api';
import type { CreateTeamPayload, Team } from '../types';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function mapTeam(t: any): Team {
  return {
    id: t.team_id,
    name: t.name,
    mission: t.mission || '',
    programNames: t.program_names || [],
    members: (t.members || []).map((m: any) => ({
      id: m.user_id || m.id,
      name: m.name,
      initials: m.initials || initialsOf(m.name || ''),
      roleLabel: m.role_label || m.roleLabel || '',
    })),
    status: t.status,
    lastReportAt: t.last_report_at || '',
  };
}

export async function listTeams(): Promise<Team[]> {
  const raw = await api.getTeams();
  return raw.map(mapTeam);
}

export async function getTeam(id: string): Promise<Team | undefined> {
  try {
    return mapTeam(await api.getTeam(id));
  } catch {
    return undefined;
  }
}

export async function createTeam(payload: CreateTeamPayload): Promise<Team> {
  const raw = await api.createTeam({
    name: payload.name,
    mission: payload.mission,
    program_names: payload.programNames,
    members: payload.members.map((m) => ({
      user_id: m.id,
      name: m.name,
      initials: m.initials,
      role_label: m.roleLabel,
    })),
  });
  return mapTeam(raw);
}
