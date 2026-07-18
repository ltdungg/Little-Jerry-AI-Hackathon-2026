import { delay } from './mockClient';
import type { Issue, IssueImpact, IssueStatus } from '../types';

let issues: Issue[] = [
  {
    id: 'issue-1',
    title: 'Nhà thầu chậm gửi báo giá điều chỉnh',
    description: 'Nhà thầu xây trường chưa gửi lại báo giá đã điều chỉnh, làm chậm việc ký hợp đồng.',
    programId: 'proj-rural-edu',
    programName: 'Rural Education',
    reporterName: 'Marcus Tran',
    ownerId: 'u-002',
    ownerName: 'Marcus Tran',
    detectedAt: '2 ngày trước',
    dueDate: '2026-07-20',
    impact: 'high',
    status: 'in_progress',
    source: 'manual',
    resolutionPlan: 'Họp trực tiếp với nhà thầu thứ Ba tuần sau để chốt báo giá.',
  },
  {
    id: 'issue-2',
    title: 'Thiếu 5 vị trí quản lý công trình',
    description: 'Đơn vị tuyển dụng địa phương không tuyển đủ 5 site manager cho khu vực Bắc.',
    programId: 'proj-rural-edu',
    programName: 'Rural Education',
    reporterName: 'Sarah Johnson',
    ownerId: 'u-001',
    ownerName: 'Sarah Johnson',
    detectedAt: '5 giờ trước',
    dueDate: '2026-07-25',
    impact: 'critical',
    status: 'new',
    source: 'ai_suggested',
    aiEvidence: {
      snippet:
        '@sarah just an heads up that the local staffing agency couldn’t fill the 5 site manager roles in the northern district.',
      source: 'Slack',
    },
    resolutionPlan: '',
  },
  {
    id: 'issue-3',
    title: 'Chưa có ngân sách khoan giếng đợt 2',
    description: 'Ngân sách cho đợt khoan giếng thứ hai chưa được phê duyệt.',
    programId: 'proj-clean-water',
    programName: 'Clean Water Access',
    reporterName: 'Priya Nair',
    ownerId: 'u-001',
    ownerName: 'Sarah Johnson',
    detectedAt: '1 tuần trước',
    dueDate: '2026-08-01',
    impact: 'medium',
    status: 'investigating',
    source: 'manual',
    resolutionPlan: 'Trình đề xuất ngân sách lên người điều phối trong tuần này.',
  },
  {
    id: 'issue-4',
    title: 'Lắp đặt mạng bị trì hoãn do phụ thuộc công trình',
    description: 'Việc lắp thiết bị mạng phải chờ công trình xây dựng hoàn tất phần điện.',
    programId: 'proj-community-digital',
    programName: 'Community Digital Infrastructure',
    reporterName: 'Elena Lopez',
    ownerId: 'u-004',
    ownerName: 'Elena Lopez',
    detectedAt: 'Hôm qua',
    dueDate: '2026-07-05',
    impact: 'high',
    status: 'new',
    source: 'ai_suggested',
    aiEvidence: {
      snippet: 'Việc lắp đặt thiết bị mạng đang bị trì hoãn do phụ thuộc vào tiến độ xây dựng.',
      source: 'Meeting',
    },
    resolutionPlan: '',
  },
  {
    id: 'issue-5',
    title: 'Không rõ người chịu trách nhiệm đánh giá tác động lũ',
    description: 'Chưa xác định ai phụ trách báo cáo đánh giá tác động cho khu vực miền Trung.',
    programId: 'proj-disaster-relief',
    programName: 'Disaster Relief Readiness',
    reporterName: 'Marcus Tran',
    ownerId: null,
    ownerName: null,
    detectedAt: '3 ngày trước',
    dueDate: null,
    impact: 'medium',
    status: 'new',
    source: 'manual',
    resolutionPlan: '',
  },
  {
    id: 'issue-6',
    title: 'Đối tác chậm phản hồi hồ sơ vay vòng 2',
    description: 'Ngân hàng đối tác chưa phản hồi hồ sơ xét duyệt vay vốn.',
    programId: 'proj-microfinance',
    programName: 'Women Microfinance Circles',
    reporterName: 'Grace Owusu',
    ownerId: 'u-006',
    ownerName: 'Grace Owusu',
    detectedAt: '6 ngày trước',
    dueDate: '2026-07-15',
    impact: 'low',
    status: 'resolved',
    source: 'manual',
    resolutionPlan: 'Đã nhận phản hồi, đang hoàn tất thủ tục.',
  },
];

export interface ListIssuesParams {
  status?: IssueStatus | 'all';
  impact?: IssueImpact | 'all';
  source?: 'manual' | 'ai_suggested' | 'all';
  programId?: string;
}

export async function listIssues(params: ListIssuesParams = {}): Promise<Issue[]> {
  let result = issues;
  if (params.status && params.status !== 'all') result = result.filter((i) => i.status === params.status);
  if (params.impact && params.impact !== 'all') result = result.filter((i) => i.impact === params.impact);
  if (params.source && params.source !== 'all') result = result.filter((i) => i.source === params.source);
  if (params.programId) result = result.filter((i) => i.programId === params.programId);
  return delay([...result]);
}

export async function confirmAiIssue(id: string, ownerName: string): Promise<Issue> {
  issues = issues.map((i) =>
    i.id === id ? { ...i, source: 'manual' as const, status: 'investigating' as const, ownerName } : i,
  );
  return delay(issues.find((i) => i.id === id)!);
}

export async function dismissAiIssue(id: string): Promise<void> {
  issues = issues.filter((i) => i.id !== id);
  await delay(undefined, 150);
}

export async function updateIssueStatus(id: string, status: IssueStatus): Promise<Issue> {
  issues = issues.map((i) => (i.id === id ? { ...i, status } : i));
  return delay(issues.find((i) => i.id === id)!);
}

export async function updateIssueOwner(id: string, ownerName: string): Promise<Issue> {
  issues = issues.map((i) => (i.id === id ? { ...i, ownerName } : i));
  return delay(issues.find((i) => i.id === id)!);
}

export function issueImpactLabel(impact: IssueImpact): string {
  return { low: 'Thấp', medium: 'Trung bình', high: 'Cao', critical: 'Nghiêm trọng' }[impact];
}

export function issueStatusLabel(status: IssueStatus): string {
  return {
    new: 'Mới ghi nhận',
    investigating: 'Đang tìm hiểu',
    in_progress: 'Đang xử lý',
    resolved: 'Đã giải quyết',
    closed: 'Đã đóng',
  }[status];
}
