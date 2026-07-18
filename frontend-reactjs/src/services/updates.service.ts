import { delay } from './mockClient';
import { PROJECTS } from '../lib/mockData';
import { getTeam } from './teams.service';
import type { Team, TeamMemberSubmission, TeamReportItem, TeamWeeklyReport, WeeklyUpdate } from '../types';

const CURRENT_WEEK = 'Tuần 29, 2026 (13–19 Th7)';

let myUpdates: WeeklyUpdate[] = [
  {
    id: 'update-current',
    userId: 'u-001',
    userName: 'Sarah Johnson',
    week: CURRENT_WEEK,
    programIds: ['proj-rural-edu', 'proj-teacher-training'],
    doneItems: [
      'Hoàn thành khảo sát phụ huynh học kỳ 1',
      'Chuẩn bị xong tài liệu tập huấn giáo viên đợt 3',
    ],
    inProgressItems: ['Theo dõi tiến độ ký hợp đồng nhà thầu xây trường'],
    issues: 'Nhà thầu chậm gửi báo giá điều chỉnh, có thể ảnh hưởng mốc tháng 9.',
    nextSteps: 'Họp với nhà thầu vào thứ Ba tuần sau.',
    supportNeeded: 'Cần điều phối hỗ trợ liên hệ đơn vị tuyển dụng địa phương.',
    status: 'draft',
    submittedAt: null,
  },
  {
    id: 'update-prev-1',
    userId: 'u-001',
    userName: 'Sarah Johnson',
    week: 'Tuần 28, 2026 (6–12 Th7)',
    programIds: ['proj-rural-edu'],
    doneItems: ['Rà soát danh sách 5 vị trí site manager còn trống'],
    inProgressItems: ['Khảo sát phụ huynh học kỳ 1'],
    issues: 'Đơn vị tuyển dụng địa phương không tuyển đủ người.',
    nextSteps: 'Mở rộng tìm kiếm sang tỉnh lân cận.',
    supportNeeded: '',
    status: 'submitted',
    submittedAt: '12 Th7',
  },
];

let teamReports: TeamWeeklyReport[] = [
  {
    id: 'report-education-current',
    teamId: 'team-education',
    teamName: 'Education',
    week: CURRENT_WEEK,
    memberSubmissions: [
      { userId: 'u-001', userName: 'Sarah Johnson', userInitials: 'SJ', submitted: true },
      { userId: 'u-002', userName: 'Marcus Tran', userInitials: 'MT', submitted: true },
      { userId: 'u-007', userName: 'Linh Phạm', userInitials: 'LP', submitted: false },
    ],
    highlights: [
      { text: 'Hoàn thành tập huấn giáo viên đợt 3', programId: 'proj-teacher-training' },
      { text: 'Khảo sát phụ huynh đạt 92% phản hồi tích cực', programId: 'proj-rural-edu' },
    ],
    issues: [
      { text: 'Nhà thầu xây trường chậm tiến độ 3 tuần', programId: 'proj-rural-edu' },
      { text: 'Thiếu 5 vị trí quản lý công trình', programId: 'proj-rural-edu' },
    ],
    nextPriorities: [
      { text: 'Chốt hợp đồng nhà thầu', programId: 'proj-rural-edu' },
      { text: 'Mở rộng tuyển dụng site manager', programId: 'proj-rural-edu' },
    ],
    status: 'draft',
  },
  {
    id: 'report-health-current',
    teamId: 'team-health',
    teamName: 'Health & WASH',
    week: CURRENT_WEEK,
    memberSubmissions: [
      { userId: 'u-001', userName: 'Sarah Johnson', userInitials: 'SJ', submitted: true },
      { userId: 'u-003', userName: 'Priya Nair', userInitials: 'PN', submitted: true },
    ],
    highlights: [{ text: 'Khảo sát nguồn nước 3 xã hoàn tất đúng hạn', programId: 'proj-clean-water' }],
    issues: [{ text: 'Chưa có ngân sách khoan giếng đợt 2', programId: 'proj-clean-water' }],
    nextPriorities: [{ text: 'Trình đề xuất ngân sách lên điều phối', programId: 'proj-clean-water' }],
    status: 'approved',
  },
];

export async function getMyCurrentUpdate(userId: string): Promise<WeeklyUpdate | undefined> {
  return delay(myUpdates.find((u) => u.userId === userId && u.status === 'draft'));
}

export async function listMyUpdates(userId: string): Promise<WeeklyUpdate[]> {
  return delay(myUpdates.filter((u) => u.userId === userId));
}

export async function saveUpdateDraft(update: WeeklyUpdate): Promise<WeeklyUpdate> {
  myUpdates = myUpdates.map((u) => (u.id === update.id ? update : u));
  return delay(update);
}

export async function submitUpdate(id: string): Promise<WeeklyUpdate> {
  myUpdates = myUpdates.map((u) =>
    u.id === id ? { ...u, status: 'submitted' as const, submittedAt: 'vừa xong' } : u,
  );
  return delay(myUpdates.find((u) => u.id === id)!);
}

export async function listTeamReports(): Promise<TeamWeeklyReport[]> {
  return delay([...teamReports]);
}

export async function getTeamReport(teamId: string): Promise<TeamWeeklyReport | undefined> {
  return delay(teamReports.find((r) => r.teamId === teamId));
}

export async function sendReminders(teamId: string, users: TeamMemberSubmission[]): Promise<void> {
  await delay({ teamId, remindedUserIds: users.map((u) => u.userId) }, 200);
}

export async function approveTeamReport(id: string): Promise<TeamWeeklyReport> {
  teamReports = teamReports.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r));
  return delay(teamReports.find((r) => r.id === id)!);
}

export async function publishTeamReport(id: string): Promise<TeamWeeklyReport> {
  teamReports = teamReports.map((r) => (r.id === id ? { ...r, status: 'published' as const } : r));
  return delay(teamReports.find((r) => r.id === id)!);
}

export type TeamReportSection = 'highlights' | 'issues' | 'nextPriorities';

/** Bảng thông tin nhóm của đúng nhóm phụ trách 1 dự án — dùng cho tab "Xuất báo cáo" trong Chi tiết dự án. */
export async function getTeamReportForProject(
  projectId: string,
): Promise<{ report: TeamWeeklyReport; team: Team } | undefined> {
  const project = PROJECTS.find((p) => p.id === projectId);
  if (!project?.teamId) return undefined;
  const team = await getTeam(project.teamId);
  const report = teamReports.find((r) => r.teamId === project.teamId);
  if (!team || !report) return undefined;
  return delay({ report, team });
}

export async function addTeamReportItem(
  reportId: string,
  section: TeamReportSection,
  item: TeamReportItem,
): Promise<TeamWeeklyReport> {
  teamReports = teamReports.map((r) =>
    r.id === reportId ? { ...r, [section]: [...r[section], item] } : r,
  );
  return delay(teamReports.find((r) => r.id === reportId)!);
}

export async function removeTeamReportItem(
  reportId: string,
  section: TeamReportSection,
  index: number,
): Promise<TeamWeeklyReport> {
  teamReports = teamReports.map((r) =>
    r.id === reportId ? { ...r, [section]: r[section].filter((_, i) => i !== index) } : r,
  );
  return delay(teamReports.find((r) => r.id === reportId)!);
}
