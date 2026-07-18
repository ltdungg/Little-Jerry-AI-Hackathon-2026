import { delay } from './mockClient';
import type { MemberKind, MemberRecord, MemberStatus, UserAccount, UserAccountStatus } from '../types';

const members: MemberRecord[] = [
  {
    id: 'u-001',
    name: 'Sarah Johnson',
    initials: 'SJ',
    email: 'sarah.johnson@aiv.org',
    roleLabel: 'Trưởng nhóm',
    teamName: 'Education',
    programNames: ['Rural Education', 'Teacher Training Fellowship'],
    kind: 'staff',
    status: 'active',
    startDate: '10 Th1, 2024',
    endDate: null,
  },
  {
    id: 'u-002',
    name: 'Marcus Tran',
    initials: 'MT',
    email: 'marcus.tran@aiv.org',
    roleLabel: 'Trưởng nhóm',
    teamName: 'Education',
    programNames: ['Rural Education'],
    kind: 'staff',
    status: 'active',
    startDate: '3 Th3, 2024',
    endDate: null,
  },
  {
    id: 'u-003',
    name: 'Priya Nair',
    initials: 'PN',
    email: 'priya.nair@aiv.org',
    roleLabel: 'Thành viên',
    teamName: 'Health & WASH',
    programNames: ['Clean Water Access'],
    kind: 'staff',
    status: 'active',
    startDate: '15 Th5, 2024',
    endDate: null,
  },
  {
    id: 'u-004',
    name: 'Elena Lopez',
    initials: 'EL',
    email: 'elena.lopez@aiv.org',
    roleLabel: 'Trưởng nhóm',
    teamName: 'Tech for Good',
    programNames: ['Community Digital Infrastructure'],
    kind: 'staff',
    status: 'active',
    startDate: '20 Th2, 2024',
    endDate: null,
  },
  {
    id: 'u-006',
    name: 'Grace Owusu',
    initials: 'GO',
    email: 'grace.owusu@aiv.org',
    roleLabel: 'Trưởng nhóm',
    teamName: 'Economic Empowerment',
    programNames: ['Women Microfinance Circles'],
    kind: 'staff',
    status: 'active',
    startDate: '8 Th4, 2024',
    endDate: null,
  },
  {
    id: 'u-007',
    name: 'Linh Phạm',
    initials: 'LP',
    email: 'linh.pham@aiv.org',
    roleLabel: 'Tình nguyện viên',
    teamName: 'Education',
    programNames: ['Rural Education'],
    kind: 'volunteer',
    status: 'active',
    startDate: '1 Th6, 2026',
    endDate: '30 Th11, 2026',
  },
  {
    id: 'u-008',
    name: 'David Kim',
    initials: 'DK',
    email: 'david.kim@aiv.org',
    roleLabel: 'Trưởng nhóm',
    teamName: 'Youth Development',
    programNames: ['Youth Leadership Program'],
    kind: 'staff',
    status: 'active',
    startDate: '12 Th1, 2024',
    endDate: null,
  },
  {
    id: 'u-009',
    name: 'James Carter',
    initials: 'JC',
    email: 'james.carter@aiv.org',
    roleLabel: 'Điều phối hoạt động',
    teamName: 'Education',
    programNames: ['Rural Education'],
    kind: 'volunteer',
    status: 'ending_soon',
    startDate: '1 Th2, 2026',
    endDate: '31 Th7, 2026',
  },
  {
    id: 'u-010',
    name: 'Hana Ito',
    initials: 'HI',
    email: 'hana.ito@aiv.org',
    roleLabel: 'Tình nguyện viên',
    teamName: 'Tech for Good',
    programNames: ['Community Digital Infrastructure'],
    kind: 'volunteer',
    status: 'inactive',
    startDate: '1 Th1, 2026',
    endDate: '5 Th7, 2026',
  },
];

export interface ListMembersParams {
  teamName?: string;
  kind?: MemberKind | 'all';
  status?: MemberStatus | 'all';
}

export async function listMembers(params: ListMembersParams = {}): Promise<MemberRecord[]> {
  let result = members;
  if (params.teamName) result = result.filter((m) => m.teamName === params.teamName);
  if (params.kind && params.kind !== 'all') result = result.filter((m) => m.kind === params.kind);
  if (params.status && params.status !== 'all') result = result.filter((m) => m.status === params.status);
  return delay([...result]);
}

let userAccounts: UserAccount[] = members.map((m) => ({
  id: m.id,
  name: m.name,
  initials: m.initials,
  email: m.email,
  role: m.roleLabel.includes('Trưởng nhóm') ? 'team_lead' : m.kind === 'volunteer' ? 'volunteer' : 'staff',
  roleLabel: m.roleLabel,
  teamName: m.teamName,
  kind: m.kind,
  status: m.status === 'inactive' ? 'locked' : 'active',
  startDate: m.startDate,
  endDate: m.endDate,
}));

export async function listUserAccounts(): Promise<UserAccount[]> {
  return delay([...userAccounts]);
}

export async function setUserAccountStatus(id: string, status: UserAccountStatus): Promise<UserAccount> {
  userAccounts = userAccounts.map((u) => (u.id === id ? { ...u, status } : u));
  return delay(userAccounts.find((u) => u.id === id)!);
}
