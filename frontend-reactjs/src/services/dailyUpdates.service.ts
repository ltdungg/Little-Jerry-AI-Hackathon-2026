import { delay, nextId } from './mockClient';
import type { DailyTaskProgress, DailyUpdate } from '../types';

export const TODAY_LABEL = '18 Th7, 2026';

let dailyUpdates: DailyUpdate[] = [
  {
    id: 'daily-1',
    userId: 'u-002',
    userName: 'Marcus Tran',
    userInitials: 'MT',
    date: TODAY_LABEL,
    programId: 'proj-rural-edu',
    taskUpdates: [
      {
        taskId: 'task-2',
        taskTitle: 'Ký hợp đồng nhà thầu xây trường',
        statusBefore: 'blocked',
        statusAfter: 'blocked',
        note: 'Vẫn chờ báo giá điều chỉnh từ nhà thầu.',
      },
    ],
    status: 'submitted',
  },
  {
    id: 'daily-2',
    userId: 'u-001',
    userName: 'Sarah Johnson',
    userInitials: 'SJ',
    date: TODAY_LABEL,
    programId: 'proj-rural-edu',
    taskUpdates: [
      {
        taskId: 'task-6',
        taskTitle: 'Tổng hợp phản hồi phụ huynh học kỳ 1',
        statusBefore: 'in_progress',
        statusAfter: 'done',
        note: 'Đã hoàn tất tổng hợp, gửi báo cáo cho trưởng nhóm.',
      },
    ],
    status: 'submitted',
  },
];

export interface ListDailyUpdatesParams {
  programId: string;
  date?: string;
}

export async function listDailyUpdates(params: ListDailyUpdatesParams): Promise<DailyUpdate[]> {
  const date = params.date ?? TODAY_LABEL;
  return delay(dailyUpdates.filter((u) => u.programId === params.programId && u.date === date));
}

export async function submitDailyUpdate(
  programId: string,
  userId: string,
  userName: string,
  userInitials: string,
  taskUpdates: DailyTaskProgress[],
  date: string = TODAY_LABEL,
): Promise<DailyUpdate> {
  const existing = dailyUpdates.find(
    (u) => u.programId === programId && u.userId === userId && u.date === date,
  );
  if (existing) {
    dailyUpdates = dailyUpdates.map((u) => (u.id === existing.id ? { ...u, taskUpdates, status: 'submitted' } : u));
    return delay(dailyUpdates.find((u) => u.id === existing.id)!);
  }
  const created: DailyUpdate = {
    id: nextId('daily'),
    userId,
    userName,
    userInitials,
    date,
    programId,
    taskUpdates,
    status: 'submitted',
  };
  dailyUpdates = [...dailyUpdates, created];
  return delay(created);
}

export async function sendDailyReminders(programId: string, userIds: string[]): Promise<void> {
  await delay({ programId, remindedUserIds: userIds }, 200);
}
