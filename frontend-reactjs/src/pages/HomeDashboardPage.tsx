import { Link } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { Pill } from '../components/common/Pill';
import { useAuth } from '../context/useAuth';
import { useMockList } from '../hooks/useMockList';
import { useMockResource } from '../hooks/useMockResource';
import { listTasks, taskPriorityLabel } from '../services/tasks.service';
import { getMyCurrentUpdate } from '../services/updates.service';
import { listNotifications, notificationIcon } from '../services/notifications.service';
import { listIssues } from '../services/issues.service';

const SHORTCUTS = [
  { label: 'Hỏi AIV', path: '/assistant', icon: 'MessageCircle' },
  { label: 'Chương trình của tôi', path: '/projects', icon: 'FolderKanban' },
  { label: 'Cập nhật hằng tuần', path: '/weekly-updates', icon: 'CalendarClock' },
  { label: 'Khó khăn', path: '/issues', icon: 'AlertTriangle' },
];

export function HomeDashboardPage() {
  const { user } = useAuth();
  const { items: tasks } = useMockList(() => listTasks({ assigneeId: user?.id }), [user?.id]);
  const { data: currentUpdate } = useMockResource(() => getMyCurrentUpdate(user!.id), [user?.id]);
  const { items: notifications } = useMockList(() => listNotifications(), []);
  const { items: aiIssues } = useMockList(() => listIssues({ source: 'ai_suggested' }), []);

  const todayTasks = tasks.filter((t) => t.status !== 'done').slice(0, 4);
  const unreadNotifications = notifications.filter((n) => !n.isRead).slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Chào {user?.name.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">{user?.roleLabel} · {user?.team}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Việc cần làm hôm nay" icon="ListChecks" action={{ label: 'Xem tất cả', to: '/my-tasks' }}>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-slate-400">Không có việc nào cần làm. 🎉</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {todayTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-700">{task.title}</p>
                    <p className="text-xs text-slate-400">{task.programName}</p>
                  </div>
                  <Pill tone={task.priority === 'high' ? 'rose' : task.priority === 'medium' ? 'blue' : 'slate'}>
                    {taskPriorityLabel(task.priority)}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Cập nhật của tôi" icon="CalendarClock" action={{ label: 'Mở', to: '/my-updates' }}>
          {currentUpdate ? (
            <div>
              <p className="text-sm text-slate-600">{currentUpdate.week}</p>
              <div className="mt-2">
                {currentUpdate.status === 'draft' ? (
                  <Pill tone="amber" icon="FileEdit">
                    Chưa gửi
                  </Pill>
                ) : (
                  <Pill tone="emerald" icon="CheckCircle2">
                    Đã gửi
                  </Pill>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Chưa có bản nháp tuần này.</p>
          )}
        </Card>

        <Card title="Thông báo mới nhất" icon="Bell" action={{ label: 'Xem tất cả', to: '/notifications' }}>
          {unreadNotifications.length === 0 ? (
            <p className="text-sm text-slate-400">Không có thông báo mới.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {unreadNotifications.map((n) => (
                <li key={n.id} className="flex items-start gap-2.5 text-sm">
                  <Icon name={notificationIcon(n.type)} size={15} className="mt-0.5 shrink-0 text-brand-500" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-700">{n.title}</p>
                    <p className="truncate text-xs text-slate-400">{n.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Khó khăn AI đề xuất cần xác nhận"
          icon="Sparkles"
          action={{ label: 'Xem tất cả', to: '/issues' }}
        >
          {aiIssues.length === 0 ? (
            <p className="text-sm text-slate-400">Không có đề xuất mới từ AI.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {aiIssues.slice(0, 3).map((issue) => (
                <li key={issue.id} className="text-sm">
                  <p className="font-medium text-slate-700">{issue.title}</p>
                  <p className="text-xs text-slate-400">{issue.programName}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
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
    </div>
  );
}

function Card({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: string;
  action?: { label: string; to: string };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name={icon} size={16} className="text-brand-500" />
          <p className="text-sm font-semibold text-slate-800">{title}</p>
        </div>
        {action && (
          <Link to={action.to} className="text-xs font-medium text-brand-600 hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
