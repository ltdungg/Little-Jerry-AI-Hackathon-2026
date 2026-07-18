import * as api from '../lib/api';
import type { Team } from '../types';

function mapTeam(t: any): Team {
  return {
    id: t.team_id,
    name: t.name,
    mission: t.mission || '',
    programNames: t.program_names || [],
    members: (t.members || []).map((m: any) => ({
      id: m.user_id,
      name: m.name,
      initials: m.initials,
      roleLabel: m.role_label,
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
