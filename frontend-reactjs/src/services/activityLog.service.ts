import * as api from '../lib/api';
import type { ActivityAction, ActivityLogEntry } from '../types';

function mapEntry(a: any): ActivityLogEntry {
  return {
    id: a.log_id,
    actorName: a.actor_id || '',
    action: a.action,
    target: a.target || '',
    timestamp: a.created_at || '',
    aiSourceUsed: a.ai_source_used ?? null,
  };
}

export interface ListActivityLogParams {
  action?: ActivityAction | 'all';
}

export async function listActivityLog(params: ListActivityLogParams = {}): Promise<ActivityLogEntry[]> {
  const raw = await api.getActivityLog({
    action: params.action && params.action !== 'all' ? params.action : undefined,
  });
  return raw.map(mapEntry);
}

export function activityActionLabel(action: ActivityAction): string {
  return {
    viewed: 'Đã xem',
    edited: 'Đã chỉnh sửa',
    approved: 'Đã phê duyệt',
    rejected: 'Đã từ chối',
    exported: 'Đã xuất dữ liệu',
    shared: 'Đã chia sẻ',
    permission_changed: 'Đã đổi quyền',
    ai_generated: 'AI đã tạo nội dung',
    account_locked: 'Tài khoản bị khoá',
  }[action];
}

export function activityActionIcon(action: ActivityAction): string {
  return {
    viewed: 'Eye',
    edited: 'Pencil',
    approved: 'CheckCircle2',
    rejected: 'XCircle',
    exported: 'Download',
    shared: 'Share2',
    permission_changed: 'KeyRound',
    ai_generated: 'Sparkles',
    account_locked: 'Lock',
  }[action];
}
