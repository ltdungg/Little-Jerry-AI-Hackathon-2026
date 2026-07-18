import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Select } from '../components/common/Select';
import { EmptyState } from '../components/common/EmptyState';
import { useMockList } from '../hooks/useMockList';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationIcon,
} from '../services/notifications.service';
import type { AppNotification } from '../types';

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'unread', label: 'Chưa đọc' },
];

export function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { items, setItems, loading } = useMockList(() => listNotifications(), []);

  const visible = filter === 'unread' ? items.filter((n) => !n.isRead) : items;
  const unreadCount = items.filter((n) => !n.isRead).length;

  async function handleRead(notification: AppNotification) {
    if (notification.isRead) return;
    setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    await markNotificationRead(notification.id);
  }

  async function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsRead();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Thông báo"
        subtitle={unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc.` : 'Bạn đã đọc hết thông báo.'}
        action={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAll}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Đánh dấu tất cả đã đọc
            </button>
          ) : undefined
        }
      />

      <div className="mt-4">
        <Select value={filter} onChange={(v) => setFilter(v as 'all' | 'unread')} options={FILTERS} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : visible.length === 0 ? (
          <EmptyState icon="BellOff" title="Không có thông báo" />
        ) : (
          visible.map((notification) => (
            <Link
              key={notification.id}
              to={notification.link}
              onClick={() => handleRead(notification)}
              className={`flex items-start gap-3 rounded-xl border p-4 transition hover:border-brand-200 ${
                notification.isRead ? 'border-slate-200 bg-white' : 'border-brand-200 bg-brand-50/40'
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  notification.isRead ? 'bg-slate-100 text-slate-500' : 'bg-brand-100 text-brand-600'
                }`}
              >
                <Icon name={notificationIcon(notification.type)} size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{notification.title}</p>
                  {!notification.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{notification.message}</p>
                <p className="mt-1 text-xs text-slate-400">{notification.createdAt}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
