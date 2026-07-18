import { useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Pill, type PillTone } from '../components/common/Pill';
import { Select } from '../components/common/Select';
import { Table, type Column } from '../components/common/Table';
import { useAuth } from '../context/useAuth';
import { useMockList } from '../hooks/useMockList';
import { listTasks, taskPriorityLabel, taskStatusLabel, updateTaskStatus } from '../services/tasks.service';
import type { Task, TaskPriority, TaskStatus } from '../types';

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

export function MyTasksPage() {
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
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
