import * as api from '../lib/api';
import type { AppNotification, NotificationType } from '../types';

function mapNotification(n: any): AppNotification {
  return {
    id: n.notification_id,
    type: n.type,
    title: n.title,
    message: n.message || '',
    isRead: n.is_read || false,
    createdAt: n.created_at || '',
    link: n.link || '',
  };
}

export async function listNotifications(): Promise<AppNotification[]> {
  const raw = await api.getNotifications();
  return raw.map(mapNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.markNotificationRead(id);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.markAllNotificationsRead();
}

export function notificationIcon(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    task_assigned: 'ClipboardList',
    task_due_soon: 'Clock',
    task_overdue: 'AlertCircle',
    issue_new: 'AlertTriangle',
    issue_escalated: 'TrendingUp',
    decision_pending: 'Gavel',
    decision_confirmed: 'CheckCircle2',
    update_due_soon: 'CalendarClock',
    update_missing: 'CalendarClock',
    document_updated: 'FileText',
    handoff_pending: 'ArrowLeftRight',
  };
  return map[type];
}
