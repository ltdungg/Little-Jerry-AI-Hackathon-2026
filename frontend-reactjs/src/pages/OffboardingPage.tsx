import { useState, useEffect } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { useMockList } from '../hooks/useMockList';
import { confirmHandoffComplete, listOffboardingRecords } from '../services/handoff.service';
import { assignTask, listTasksForUser } from '../services/tasks.service';
import { AssignModal } from '../components/common/AssignModal';
import type { OffboardingRecord, Task } from '../types';

export function OffboardingPage() {
  const { items, setItems, loading } = useMockList(() => listOffboardingRecords(), []);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleConfirm(record: OffboardingRecord) {
    setItems((prev) => prev.map((r) => (r.id === record.id ? { ...r, handoffComplete: true } : r)));
    await confirmHandoffComplete(record.id);
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Kết thúc tham gia" subtitle="Quản lý người sắp kết thúc thời gian tham gia và thu hồi quyền truy cập đúng hạn." />

      <div className="mt-6 flex flex-col gap-3">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : (
          items.map((record) => (
            <div key={record.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {record.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{record.name}</p>
                    <p className="text-xs text-slate-400">{record.teamName}</p>
                  </div>
                </div>
                <Pill tone={record.handoffComplete ? 'emerald' : 'amber'}>
                  {record.handoffComplete ? 'Đã bàn giao xong' : 'Chưa hoàn tất bàn giao'}
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
                <Field label="Ngày hết quyền truy cập" value={record.accessEndsAt} />
                <Field label="Quyền cần thu hồi" value={record.accessToRevoke.join(', ') || 'Không có'} />
                <Field label="Tài liệu đang quản lý" value={record.ownedDocuments.join(', ') || 'Không có'} />
              </div>

              <div className="mt-4 flex items-center gap-3">
                {!record.handoffComplete && (
                  <button
                    type="button"
                    onClick={() => handleConfirm(record)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Icon name="CheckCircle2" size={13} />
                    Xác nhận hoàn thành bàn giao
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleExpand(record.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Icon name={expandedId === record.id ? 'ChevronUp' : 'ChevronDown'} size={14} />
                  {expandedId === record.id ? 'Ẩn chi tiết công việc' : 'Xem chi tiết công việc'}
                </button>
              </div>

              {expandedId === record.id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <OffboardingUserTasks userId={record.id} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-700">{value}</p>
    </div>
  );
}

function OffboardingUserTasks({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [taskToAssign, setTaskToAssign] = useState<Task | null>(null);

  const handleAssign = async (_targetUserId: string, userName: string, userInitials: string) => {
    if (!taskToAssign) return;
    await assignTask(taskToAssign.id, userName, userInitials);
    setTasks((prev) => prev.filter((t) => t.id !== taskToAssign.id));
  };

  useEffect(() => {
    let active = true;
    listTasksForUser(userId)
      .then((res) => {
        if (active) {
          setTasks(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) return <p className="text-xs text-slate-400">Đang tải công việc...</p>;

  const doneTasks = tasks.filter((t) => t.status === 'done');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const todoTasks = tasks.filter((t) => t.status === 'todo' || t.status === 'blocked');

  if (tasks.length === 0) {
    return <p className="text-sm text-slate-500 italic">Nhân sự này không có công việc nào được giao.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TaskListColumn 
          title="Chưa làm (To-Do)" 
          tasks={todoTasks} 
          color="bg-slate-50 border-slate-200" 
          onAssign={(t) => { setTaskToAssign(t); setAssignModalOpen(true); }}
        />
        <TaskListColumn 
          title="Đang làm (In Progress)" 
          tasks={inProgressTasks} 
          color="bg-blue-50 border-blue-200" 
          onAssign={(t) => { setTaskToAssign(t); setAssignModalOpen(true); }}
        />
        <TaskListColumn 
          title="Đã làm (Done)" 
          tasks={doneTasks} 
          color="bg-emerald-50 border-emerald-200" 
        />
      </div>

      <AssignModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssign={handleAssign}
        taskTitle={taskToAssign?.title || ''}
      />
    </>
  );
}

function TaskListColumn({ title, tasks, color, onAssign }: { title: string; tasks: Task[]; color: string; onAssign?: (t: Task) => void }) {
  return (
    <div className={`p-3 rounded-xl border ${color}`}>
      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">{title} ({tasks.length})</h4>
      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <div key={t.id} className="bg-white p-2.5 rounded-lg shadow-sm border border-slate-100 text-sm flex flex-col group">
            <p className="font-medium text-slate-800 line-clamp-2">{t.title}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span className="truncate max-w-[120px]">{t.programName}</span>
              {t.dueDate && <span className="text-slate-400">{t.dueDate}</span>}
            </div>
            {onAssign && (
              <button
                type="button"
                onClick={() => onAssign(t)}
                className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-100 px-2 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Icon name="UserPlus" size={12} />
                Bàn giao
              </button>
            )}
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-slate-400 italic">Không có công việc</p>
        )}
      </div>
    </div>
  );
}
