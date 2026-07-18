import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { Pill, type PillTone } from '../components/common/Pill';
import { PageHeader } from '../components/common/PageHeader';
import { Select } from '../components/common/Select';
import { Table, type Column } from '../components/common/Table';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/useAuth';
import { useMockList } from '../hooks/useMockList';
import { useMockResource } from '../hooks/useMockResource';
import { listTasks, taskPriorityLabel, taskStatusLabel, updateTaskStatus } from '../services/tasks.service';
import {
  getMyCurrentUpdate,
  listMyUpdates,
  saveUpdateDraft,
  submitUpdate,
} from '../services/updates.service';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationIcon,
} from '../services/notifications.service';
import type { Task, TaskPriority, TaskStatus, WeeklyUpdate, AppNotification } from '../types';

const SHORTCUTS = [
  { label: 'Hỏi AIV', path: '/assistant', icon: 'MessageCircle' },
  { label: 'Chương trình của tôi', path: '/projects', icon: 'FolderKanban' },
  { label: 'Cập nhật hằng tuần', path: '/weekly-updates', icon: 'CalendarClock' },
  { label: 'Khó khăn', path: '/issues', icon: 'AlertTriangle' },
];

const STATUS_OPTIONS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'todo', label: 'Chưa bắt đầu' },
  { value: 'in_progress', label: 'Đang làm' },
  { value: 'blocked', label: 'Đang bị chặn' },
  { value: 'done', label: 'Hoàn thành' },
];

const PRIORITY_TONE: Record<TaskPriority, PillTone> = { low: 'slate', medium: 'blue', high: 'rose' };
const STATUS_TONE: Record<TaskStatus, PillTone> = {
  todo: 'slate',
  in_progress: 'blue',
  blocked: 'amber',
  done: 'emerald',
};

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  return new Date(task.dueDate) < new Date('2026-07-18');
}

export function HomeDashboardPage() {
  const { user } = useAuth();
  
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-12">
      {/* SECTION: TỔNG QUAN / LỐI TẮT */}
      <section>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Chào {user?.name.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-sm text-slate-500">{user?.roleLabel} · {user?.team}</p>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lối tắt nhanh</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SHORTCUTS.map((shortcut) => (
              <Link
                key={shortcut.path}
                to={shortcut.path}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-100 p-3 text-center text-xs font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                <Icon name={shortcut.icon} size={18} />
                {shortcut.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: THÔNG BÁO */}
      <section className="border-t border-slate-200 pt-8">
        <NotificationsSection />
      </section>

      {/* SECTION: NHIỆM VỤ CỦA TÔI */}
      <section className="border-t border-slate-200 pt-8">
        <MyTasksSection />
      </section>

      {/* SECTION: CẬP NHẬT CỦA TÔI */}
      <section className="border-t border-slate-200 pt-8">
        <MyUpdatesSection />
      </section>
    </div>
  );
}

function MyTasksSection() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  const { items, setItems, loading } = useMockList(
    () => listTasks({ assigneeId: user?.id, status: statusFilter }),
    [user?.id, statusFilter],
  );

  const overdueCount = useMemo(() => items.filter(isOverdue).length, [items]);

  async function handleStatusChange(task: Task, status: TaskStatus) {
    setItems((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    await updateTaskStatus(task.id, status);
  }

  const columns: Column<Task>[] = [
    {
      header: 'Nhiệm vụ',
      render: (task) => (
        <div>
          <p className="font-medium text-slate-800">{task.title}</p>
          <p className="text-xs text-slate-400">{task.programName}</p>
        </div>
      ),
    },
    {
      header: 'Ưu tiên',
      render: (task) => <Pill tone={PRIORITY_TONE[task.priority]}>{taskPriorityLabel(task.priority)}</Pill>,
    },
    {
      header: 'Hạn',
      render: (task) =>
        task.dueDate ? (
          <span className={isOverdue(task) ? 'font-medium text-rose-600' : 'text-slate-600'}>
            {task.dueDate}
            {isOverdue(task) && ' (quá hạn)'}
          </span>
        ) : (
          <span className="text-slate-400">Chưa đặt hạn</span>
        ),
    },
    {
      header: 'Trạng thái',
      render: (task) => (
        <div className="flex items-center gap-2">
          <Pill tone={STATUS_TONE[task.status]}>{taskStatusLabel(task.status)}</Pill>
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
            className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-500 focus:outline-none"
            aria-label={`Đổi trạng thái nhiệm vụ ${task.title}`}
          >
            {STATUS_OPTIONS.filter((s) => s.value !== 'all').map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Nhiệm vụ của tôi"
        subtitle={
          overdueCount > 0
            ? `Bạn có ${overdueCount} nhiệm vụ quá hạn cần xử lý.`
            : 'Toàn bộ nhiệm vụ được giao cho bạn, sắp xếp theo mức ưu tiên.'
        }
      />
      <div className="mt-6 flex items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as TaskStatus | 'all')}
          options={STATUS_OPTIONS}
        />
      </div>
      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : (
          <Table
            columns={columns}
            rows={items}
            rowKey={(t) => t.id}
            emptyIcon="ClipboardList"
            emptyTitle="Không có nhiệm vụ nào"
            emptyDescription="Thử đổi bộ lọc trạng thái."
          />
        )}
      </div>
    </div>
  );
}

function MyUpdatesSection() {
  const { data: current, loading } = useMockResource(() => getMyCurrentUpdate(), []);
  const { data: history } = useMockResource(() => listMyUpdates(), []);

  return (
    <div>
      <PageHeader
        title="Cập nhật của tôi"
        subtitle="Bản nháp báo cáo tuần được hệ thống tự tổng hợp — bổ sung nội dung rồi gửi cho trưởng nhóm."
      />
      {loading || !current ? (
        <p className="mt-6 text-sm text-slate-400">Đang tải...</p>
      ) : (
        <UpdateForm key={current.id} initial={current} />
      )}
      {history && history.filter((u) => u.status === 'submitted').length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700">Các tuần trước</h2>
          <div className="mt-2 flex flex-col gap-2">
            {history
              .filter((u) => u.status === 'submitted')
              .map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm"
                >
                  <span className="text-slate-700">{u.week}</span>
                  <span className="text-xs text-slate-400">Đã gửi {u.submittedAt}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UpdateForm({ initial }: { initial: WeeklyUpdate }) {
  const [update, setUpdate] = useState(initial);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'submitting' | 'submitted'>('idle');

  async function handleSaveDraft() {
    setSaving('saving');
    await saveUpdateDraft(update);
    setSaving('saved');
  }

  async function handleSubmit() {
    setSaving('submitting');
    await saveUpdateDraft(update);
    await submitUpdate(update.id);
    setUpdate((u) => ({ ...u, status: 'submitted' }));
    setSaving('submitted');
  }

  if (update.status === 'submitted') {
    return (
      <div className="mt-6 flex flex-col items-center rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <Icon name="CheckCircle2" size={28} className="text-emerald-600" />
        <p className="mt-2 text-sm font-medium text-emerald-800">
          Đã gửi cập nhật {update.week} cho trưởng nhóm.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{update.week}</p>
        <Pill tone="slate" icon="Sparkles">
          Bản nháp tự động
        </Pill>
      </div>

      <Field label="Đã hoàn thành">
        <MultilineInput
          value={update.doneItems.join('\n')}
          onChange={(v) => setUpdate((u) => ({ ...u, doneItems: v.split('\n').filter(Boolean) }))}
          placeholder="Mỗi dòng một việc đã hoàn thành"
        />
      </Field>

      <Field label="Đang thực hiện">
        <MultilineInput
          value={update.inProgressItems.join('\n')}
          onChange={(v) => setUpdate((u) => ({ ...u, inProgressItems: v.split('\n').filter(Boolean) }))}
          placeholder="Mỗi dòng một việc đang làm"
        />
      </Field>

      <Field label="Khó khăn">
        <MultilineInput
          value={update.issues}
          onChange={(v) => setUpdate((u) => ({ ...u, issues: v }))}
          rows={2}
          placeholder="Có khó khăn nào cần báo cáo không?"
        />
      </Field>

      <Field label="Bước tiếp theo">
        <MultilineInput
          value={update.nextSteps}
          onChange={(v) => setUpdate((u) => ({ ...u, nextSteps: v }))}
          rows={2}
        />
      </Field>

      <Field label="Nhu cầu hỗ trợ">
        <MultilineInput
          value={update.supportNeeded}
          onChange={(v) => setUpdate((u) => ({ ...u, supportNeeded: v }))}
          rows={2}
          placeholder="Bạn cần hỗ trợ gì từ trưởng nhóm hoặc điều phối?"
        />
      </Field>

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        {saving === 'saved' && <span className="text-xs text-slate-400">Đã lưu nháp</span>}
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving === 'saving' || saving === 'submitting'}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Lưu nháp
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving === 'saving' || saving === 'submitting'}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving === 'submitting' && <Icon name="Loader2" size={14} className="animate-spin" />}
          Gửi cho trưởng nhóm
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function MultilineInput({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
    />
  );
}

const NOTIFICATION_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'unread', label: 'Chưa đọc' },
];

function NotificationsSection() {
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
    <div>
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
        <Select value={filter} onChange={(v) => setFilter(v as 'all' | 'unread')} options={NOTIFICATION_FILTERS} />
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
