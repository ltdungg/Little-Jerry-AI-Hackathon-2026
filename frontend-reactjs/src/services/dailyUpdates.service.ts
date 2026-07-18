import * as api from '../lib/api';
import type { DailyTaskProgress, DailyUpdate } from '../types';

function mapDailyUpdate(u: any): DailyUpdate {
  return {
    id: u.id,
    userId: u.user_id,
    userName: u.user_name || '',
    userInitials: (u.user_name || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
    date: u.date,
    programId: u.project_id,
    taskUpdates: (u.task_updates || []).map((tu: any): DailyTaskProgress => ({
      taskId: tu.task_id,
      taskTitle: tu.task_title,
      statusBefore: tu.status_before,
      statusAfter: tu.status_after,
      note: tu.note,
    })),
    status: u.status,
  };
}

export interface ListDailyUpdatesParams {
  programId: string;
  date?: string;
}

export async function listDailyUpdates(params: ListDailyUpdatesParams): Promise<DailyUpdate[]> {
  const raw = await api.getDailyUpdates(params.programId, params.date);
  return raw.map(mapDailyUpdate);
}

export async function submitDailyUpdate(
  programId: string,
  userName: string,
  taskUpdates: DailyTaskProgress[],
  date?: string,
): Promise<DailyUpdate> {
  const raw = await api.submitDailyUpdate(programId, {
    user_name: userName,
    date,
    task_updates: taskUpdates.map((tu) => ({
      task_id: tu.taskId,
      task_title: tu.taskTitle,
      status_before: tu.statusBefore,
      status_after: tu.statusAfter,
      note: tu.note,
    })),
  });
  return mapDailyUpdate(raw);
}
