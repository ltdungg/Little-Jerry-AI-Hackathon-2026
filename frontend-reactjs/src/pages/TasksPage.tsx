import { useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Pill, type PillTone } from '../components/common/Pill';
import { Select } from '../components/common/Select';
import { Table, type Column } from '../components/common/Table';
import { useMockList } from '../hooks/useMockList';
import { listTasks, taskPriorityLabel, taskStatusLabel } from '../services/tasks.service';
import { PROJECTS } from '../lib/mockData';
import type { Task, TaskPriority, TaskStatus } from '../types';

type QuickFilter = 'all' | 'overdue' | 'unassigned' | 'no_due_date' | 'blocked';

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'overdue', label: 'Quá hạn' },
  { value: 'unassigned', label: 'Chưa có người phụ trách' },
  { value: 'no_due_date', label: 'Chưa có hạn' },
  { value: 'blocked', label: 'Đang bị chặn' },
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

export function TasksPage() {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [programId, setProgramId] = useState('all');
  const { items, loading } = useMockList(() => listTasks(), []);

  const filtered = useMemo(() => {
    let result = items;
    if (programId !== 'all') result = result.filter((t) => t.programId === programId);
    switch (quickFilter) {
      case 'overdue':
        result = result.filter(isOverdue);
        break;
      case 'unassigned':
        result = result.filter((t) => !t.assigneeId);
        break;
      case 'no_due_date':
        result = result.filter((t) => !t.dueDate);
        break;
      case 'blocked':
        result = result.filter((t) => t.status === 'blocked');
        break;
      default:
        break;
    }
    return result;
  }, [items, quickFilter, programId]);

  const columns: Column<Task>[] = [
    {
      header: 'Nhiệm vụ',
      render: (task) => (
        <div>
          <p className="font-medium text-slate-800">{task.title}</p>
          <p className="text-xs text-slate-400">{task.programName}</p>
          {task.dependsOnTaskIds.length > 0 && (
            <p className="mt-0.5 text-[11px] text-amber-600">Phụ thuộc {task.dependsOnTaskIds.length} nhiệm vụ khác</p>
          )}
        </div>
      ),
    },
    {
      header: 'Người phụ trách',
      render: (task) =>
        task.assigneeName ? (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
              {task.assigneeInitials}
            </div>
            <span className="text-slate-600">{task.assigneeName}</span>
          </div>
        ) : (
          <span className="text-amber-600">Chưa có người phụ trách</span>
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
          <span className={isOverdue(task) ? 'font-medium text-rose-600' : 'text-slate-600'}>{task.dueDate}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      header: 'Trạng thái',
      render: (task) => <Pill tone={STATUS_TONE[task.status]}>{taskStatusLabel(task.status)}</Pill>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Nhiệm vụ"
        subtitle="Toàn bộ nhiệm vụ của các chương trình — phát hiện nhiệm vụ nghẽn hoặc chưa có người phụ trách."
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setQuickFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              quickFilter === f.value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
        <Select
          value={programId}
          onChange={setProgramId}
          options={[{ value: 'all', label: 'Tất cả chương trình' }, ...PROJECTS.map((p) => ({ value: p.id, label: p.name }))]}
          className="ml-auto"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : (
          <Table
            columns={columns}
            rows={filtered}
            rowKey={(t) => t.id}
            emptyIcon="ClipboardList"
            emptyTitle="Không có nhiệm vụ phù hợp"
          />
        )}
      </div>
    </div>
  );
}
