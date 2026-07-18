import { delay } from './mockClient';
import type { AppNotification, NotificationType } from '../types';

let notifications: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'task_overdue',
    title: 'Nhiệm vụ quá hạn',
    message: '"Ký hợp đồng nhà thầu xây trường" đã quá hạn 2 ngày.',
    isRead: false,
    createdAt: '2 giờ trước',
    link: '/my-tasks',
  },
  {
    id: 'notif-2',
    type: 'issue_new',
    title: 'Khó khăn mới được phát hiện',
    message: 'Trợ lý AI đề xuất 1 khó khăn mới trong chương trình Rural Education.',
    isRead: false,
    createdAt: '5 giờ trước',
    link: '/issues',
  },
  {
    id: 'notif-3',
    type: 'decision_pending',
    title: 'Quyết định chờ duyệt',
    message: 'Quyết định "Chọn phương án khoan giếng" đang chờ bạn phê duyệt.',
    isRead: false,
    createdAt: 'Hôm qua',
    link: '/decisions',
  },
  {
    id: 'notif-4',
    type: 'update_due_soon',
    title: 'Sắp đến hạn gửi báo cáo tuần',
    message: 'Bạn chưa gửi cập nhật hằng tuần cho Tuần 29.',
    isRead: true,
    createdAt: '2 ngày trước',
    link: '/my-updates',
  },
  {
    id: 'notif-5',
    type: 'handoff_pending',
    title: 'Nội dung bàn giao cần xác nhận',
    message: 'James Carter đã tạo nội dung bàn giao chờ bạn xác nhận.',
    isRead: true,
    createdAt: '3 ngày trước',
    link: '/handoff',
  },
  {
    id: 'notif-6',
    type: 'document_updated',
    title: 'Tài liệu quan trọng được cập nhật',
    message: '"Quy trình an toàn công trường" vừa được cập nhật phiên bản mới.',
    isRead: true,
    createdAt: '4 ngày trước',
    link: '/knowledge',
  },
];

export async function listNotifications(): Promise<AppNotification[]> {
  return delay([...notifications]);
}

export async function markNotificationRead(id: string): Promise<void> {
  notifications = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  await delay(undefined, 150);
}

export async function markAllNotificationsRead(): Promise<void> {
  notifications = notifications.map((n) => ({ ...n, isRead: true }));
  await delay(undefined, 150);
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
