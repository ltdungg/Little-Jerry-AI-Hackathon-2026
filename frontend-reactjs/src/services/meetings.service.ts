import { delay } from './mockClient';
import type { Meeting } from '../types';

let meetings: Meeting[] = [
  {
    id: 'meeting-1',
    title: 'Họp giao ban tuần — Education',
    date: '15 Th7, 2026',
    durationMinutes: 45,
    participants: ['Sarah Johnson', 'Marcus Tran', 'Linh Phạm'],
    teamId: 'team-education',
    programId: 'proj-rural-edu',
    programName: 'Rural Education',
    summary:
      'Nhóm rà soát tiến độ xây trường, thống nhất mở rộng phạm vi tuyển site manager sang tỉnh lân cận.',
    keyTopics: ['Tiến độ ký hợp đồng nhà thầu', 'Tuyển dụng site manager', 'Khảo sát phụ huynh'],
    proposedDecisions: ['Ưu tiên tuyển site manager từ tỉnh lân cận'],
    actionItems: [
      { id: 'ai-1', title: 'Gửi lại yêu cầu báo giá cho nhà thầu', owner: 'Marcus Tran', dueDate: '18 Th7', status: 'confirmed' },
      { id: 'ai-2', title: 'Liên hệ đơn vị tuyển dụng tỉnh lân cận', owner: 'Sarah Johnson', dueDate: '20 Th7', status: 'proposed' },
    ],
    openQuestions: ['Ngân sách đi lại cho nhân sự ngoài tỉnh lấy từ đâu?'],
  },
  {
    id: 'meeting-2',
    title: 'Rà soát ngân sách — Health & WASH',
    date: '12 Th7, 2026',
    durationMinutes: 30,
    participants: ['Priya Nair', 'Sarah Johnson'],
    teamId: 'team-health',
    programId: 'proj-clean-water',
    programName: 'Clean Water Access',
    summary: 'Thảo luận đề xuất ngân sách cho đợt khoan giếng thứ hai.',
    keyTopics: ['Ngân sách khoan giếng đợt 2', 'Kết quả khảo sát nguồn nước'],
    proposedDecisions: [],
    actionItems: [
      { id: 'ai-3', title: 'Trình đề xuất ngân sách lên điều phối', owner: 'Priya Nair', dueDate: '19 Th7', status: 'confirmed' },
    ],
    openQuestions: [],
  },
  {
    id: 'meeting-3',
    title: 'Đồng bộ tiến độ hạ tầng số cộng đồng',
    date: '10 Th7, 2026',
    durationMinutes: 40,
    participants: ['Elena Lopez', 'David Kim'],
    teamId: 'team-tech',
    programId: 'proj-community-digital',
    programName: 'Community Digital Infrastructure',
    summary: 'Xác định nguyên nhân trì hoãn lắp đặt mạng do phụ thuộc tiến độ xây dựng.',
    keyTopics: ['Trì hoãn lắp mạng', 'Phụ thuộc giữa các nhóm'],
    proposedDecisions: [],
    actionItems: [
      { id: 'ai-4', title: 'Trao đổi với nhóm xây dựng về mốc bàn giao điện', owner: 'Elena Lopez', dueDate: '17 Th7', status: 'proposed' },
    ],
    openQuestions: ['Mốc hoàn tất phần điện của nhà thầu là khi nào?'],
  },
];

export async function listMeetings(params: { programId?: string } = {}): Promise<Meeting[]> {
  let result = meetings;
  if (params.programId) result = result.filter((m) => m.programId === params.programId);
  return delay([...result]);
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  return delay(meetings.find((m) => m.id === id));
}

export async function confirmActionItem(meetingId: string, actionItemId: string, owner: string): Promise<Meeting> {
  meetings = meetings.map((m) =>
    m.id === meetingId
      ? {
          ...m,
          actionItems: m.actionItems.map((a) =>
            a.id === actionItemId ? { ...a, status: 'confirmed' as const, owner } : a,
          ),
        }
      : m,
  );
  return delay(meetings.find((m) => m.id === meetingId)!);
}

export async function rejectActionItem(meetingId: string, actionItemId: string): Promise<Meeting> {
  meetings = meetings.map((m) =>
    m.id === meetingId
      ? {
          ...m,
          actionItems: m.actionItems.map((a) =>
            a.id === actionItemId ? { ...a, status: 'rejected' as const } : a,
          ),
        }
      : m,
  );
  return delay(meetings.find((m) => m.id === meetingId)!);
}
