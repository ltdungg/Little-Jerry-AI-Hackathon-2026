import { delay } from './mockClient';
import type { Handoff, HandoffStatus, OffboardingRecord } from '../types';

let handoffs: Handoff[] = [
  {
    id: 'handoff-1',
    fromName: 'James Carter',
    toName: 'Linh Phạm',
    teamName: 'Education',
    programName: 'Rural Education',
    currentResponsibilities: 'Điều phối tình nguyện viên tại 3 điểm trường khu vực Bắc.',
    inProgressWork: 'Đang hoàn tất báo cáo khảo sát nhu cầu học sinh học kỳ 2.',
    pendingDecisions: 'Chưa chốt phương án hỗ trợ học bổng cho học sinh khó khăn.',
    unresolvedIssues: 'Thiếu tình nguyện viên hỗ trợ dạy kèm buổi tối.',
    keyContacts: 'Cô Hạnh — hiệu trưởng điểm trường số 2 (0987xxxxxx).',
    relatedDocs: 'Báo cáo khảo sát nhu cầu học sinh (bản nháp).',
    risks: 'Nếu không có người tiếp nhận kịp thời, lịch dạy kèm buổi tối có thể bị gián đoạn.',
    nextSteps: 'Bàn giao trực tiếp lịch dạy kèm cho người tiếp nhận trước ngày kết thúc.',
    status: 'receiver_confirm',
  },
];

let offboardingRecords: OffboardingRecord[] = [
  {
    id: 'off-1',
    name: 'James Carter',
    initials: 'JC',
    teamName: 'Education',
    accessEndsAt: '31 Th7, 2026',
    accessToRevoke: ['Kho tài liệu Education', 'Slack #proj-rural-edu'],
    ownedDocuments: ['Báo cáo khảo sát nhu cầu học sinh (bản nháp)'],
    handoffComplete: false,
  },
  {
    id: 'off-2',
    name: 'Hana Ito',
    initials: 'HI',
    teamName: 'Tech for Good',
    accessEndsAt: '5 Th7, 2026',
    accessToRevoke: ['Kho tài liệu Tech for Good'],
    ownedDocuments: [],
    handoffComplete: true,
  },
];

export async function listHandoffs(): Promise<Handoff[]> {
  return delay([...handoffs]);
}

export async function updateHandoffStatus(id: string, status: HandoffStatus): Promise<Handoff> {
  handoffs = handoffs.map((h) => (h.id === id ? { ...h, status } : h));
  return delay(handoffs.find((h) => h.id === id)!);
}

export async function listOffboardingRecords(): Promise<OffboardingRecord[]> {
  return delay([...offboardingRecords]);
}

export async function confirmHandoffComplete(id: string): Promise<OffboardingRecord> {
  offboardingRecords = offboardingRecords.map((r) => (r.id === id ? { ...r, handoffComplete: true } : r));
  return delay(offboardingRecords.find((r) => r.id === id)!);
}

export function handoffStatusLabel(status: HandoffStatus): string {
  return {
    draft: 'Bản nháp',
    team_lead_review: 'Trưởng nhóm kiểm tra',
    receiver_confirm: 'Chờ người tiếp nhận xác nhận',
    complete: 'Hoàn tất',
  }[status];
}
