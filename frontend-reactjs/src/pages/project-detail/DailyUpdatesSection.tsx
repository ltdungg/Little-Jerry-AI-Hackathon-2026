import { useState } from 'react';
import { Icon } from '../../components/common/Icon';
import { useAuth } from '../../context/useAuth';
import { useMockList } from '../../hooks/useMockList';
import { useMockResource } from '../../hooks/useMockResource';
import { listDailyUpdates, submitDailyUpdate } from '../../services/dailyUpdates.service';
import { listTasks, taskStatusLabel } from '../../services/tasks.service';
import { listTeams } from '../../services/teams.service';
import type { Project, TaskStatus } from '../../types';

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];

const TODAY_LABEL = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

async function resolveTeamMembers(projectName: string) {
  const teams = await listTeams();
  const team = teams.find((t) => t.programNames.includes(projectName));
  return team?.members ?? [];
}

export function DailyUpdatesSection({ project }: { project: Project }) {
  const { user } = useAuth();

  const { items: tasks, loading: loadingTasks } = useMockList(() => listTasks({ programId: project.id }), [project.id]);
  const { data: members } = useMockResource(() => resolveTeamMembers(project.name), [project.name]);
  const { items: updates, setItems: setUpdates, loading: loadingUpdates } = useMockList(
    () => listDailyUpdates({ programId: project.id }),
    [project.id],
  );

  const myTasks = tasks.filter((t) => t.assigneeId === user?.id);
  const mySubmission = updates.find((u) => u.userId === user?.id);

  const [statusDraft, setStatusDraft] = useState<Record<string, TaskStatus>>({});
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const teamMembers = members ?? [];
  const notSubmitted = teamMembers.filter((m) => !updates.some((u) => u.userId === m.id));

  async function handleSubmit() {
    if (!user || myTasks.length === 0) return;
    setSubmitting(true);
    try {
      const taskUpdates = myTasks.map((t) => ({
        taskId: t.id,
        taskTitle: t.title,
        statusBefore: t.status,
        statusAfter: statusDraft[t.id] ?? t.status,
        note: noteDraft[t.id]?.trim() || undefined,
      }));
      const saved = await submitDailyUpdate(project.id, user.name, taskUpdates);
      setUpdates((prev) => [...prev.filter((u) => u.id !== saved.id), saved]);
    } finally {
      setSubmitting(false);
    }
  }

  const loading = loadingTasks || loadingUpdates;

  return (
    <div className="max-w-4xl">
      <p className="text-sm text-slate-500">
        Cập nhật tiến độ task hôm nay — <span className="font-medium text-slate-700">{TODAY_LABEL}</span>
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-800">Ai đã gửi cập nhật hôm nay</p>
        {loading ? (
          <p className="mt-3 text-sm text-slate-400">Đang tải...</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {teamMembers.map((m) => {
              const submitted = updates.some((u) => u.userId === m.id);
              return (
                <span
                  key={m.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    submitted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <Icon name={submitted ? 'CheckCircle2' : 'Clock'} size={12} />
                  {m.name}
                </span>
              );
            })}
            {notSubmitted.length === 0 && teamMembers.length > 0 && (
              <span className="text-xs text-slate-400">Mọi người đã gửi cập nhật.</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-800">Cập nhật của tôi</p>
        {myTasks.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Bạn không có nhiệm vụ nào trong dự án này.</p>
        ) : mySubmission ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <Icon name="CheckCircle2" size={15} />
            Bạn đã gửi cập nhật hôm nay. Có thể sửa và gửi lại nếu cần.
          </div>
        ) : null}

        <div className="mt-3 flex flex-col gap-3">
          {myTasks.map((task) => (
            <div key={task.id} className="rounded-lg border border-slate-100 p-3">
              <p className="text-sm font-medium text-slate-800">{task.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={statusDraft[task.id] ?? task.status}
                  onChange={(e) => setStatusDraft((prev) => ({ ...prev, [task.id]: e.target.value as TaskStatus }))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {taskStatusLabel(s)}
                    </option>
                  ))}
                </select>
                <input
                  value={noteDraft[task.id] ?? ''}
                  onChange={(e) => setNoteDraft((prev) => ({ ...prev, [task.id]: e.target.value }))}
                  placeholder="Ghi chú ngắn (không bắt buộc)"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
          ))}
        </div>

        {myTasks.length > 0 && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting && <Icon name="Loader2" size={14} className="animate-spin" />}
            Gửi cập nhật hôm nay
          </button>
        )}
      </div>

      {updates.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-800">Cập nhật đã nhận hôm nay</p>
          <div className="mt-3 flex flex-col gap-3">
            {updates.map((u) => (
              <div key={u.id} className="rounded-lg border border-slate-100 p-3">
                <p className="text-xs font-semibold text-slate-600">{u.userName}</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {u.taskUpdates.map((tu) => (
                    <li key={tu.taskId} className="text-sm text-slate-600">
                      "{tu.taskTitle}" → <span className="font-medium">{taskStatusLabel(tu.statusAfter)}</span>
                      {tu.note && <span className="text-slate-400"> — {tu.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
