import * as api from '../lib/api';
import type { MemberKind, MemberRecord, MemberStatus, Role, UserAccount, UserAccountStatus } from '../types';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function mapMember(u: any): MemberRecord {
  return {
    id: u.user_id,
    name: u.name,
    initials: initialsOf(u.name || ''),
    email: u.email || '',
    roleLabel: u.role_label || '',
    teamName: u.team_name || '',
    programNames: u.program_names || [],
    kind: u.kind,
    status: u.status === 'locked' ? 'inactive' : u.status,
    startDate: u.start_date || '',
    endDate: u.end_date ?? null,
  };
}

function mapUserAccount(u: any): UserAccount {
  return {
    id: u.user_id,
    name: u.name,
    initials: initialsOf(u.name || ''),
    email: u.email || '',
    role: (u.role as Role) || 'staff',
    roleLabel: u.role_label || '',
    teamName: u.team_name || '',
    kind: u.kind,
    status: (u.status as UserAccountStatus) || 'active',
    startDate: u.start_date || '',
    endDate: u.end_date ?? null,
  };
}

export interface ListMembersParams {
  teamName?: string;
  kind?: MemberKind | 'all';
  status?: MemberStatus | 'all';
}

export async function listMembers(params: ListMembersParams = {}): Promise<MemberRecord[]> {
  const raw = await api.getUsers({
    team: params.teamName,
    kind: params.kind && params.kind !== 'all' ? params.kind : undefined,
    status: params.status && params.status !== 'all' ? params.status : undefined,
  });
  return raw.map(mapMember);
}

export async function listUserAccounts(): Promise<UserAccount[]> {
  const raw = await api.getUsers();
  return raw.map(mapUserAccount);
}

export async function setUserAccountStatus(id: string, status: UserAccountStatus): Promise<UserAccount> {
  const raw = await api.updateUser(id, { status });
  return mapUserAccount(raw);
}
