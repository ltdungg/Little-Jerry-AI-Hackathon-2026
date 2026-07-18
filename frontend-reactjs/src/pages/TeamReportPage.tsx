import { useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Select } from '../components/common/Select';
import { StatCard } from '../components/common/StatCard';
import { useMockList } from '../hooks/useMockList';
import { useMockResource } from '../hooks/useMockResource';
import { listTeams } from '../services/teams.service';
import { getTeamReport } from '../services/updates.service';
import { listTasks } from '../services/tasks.service';

export function TeamReportPage() {
  const { items: teams } = useMockList(() => listTeams(), []);
  const [teamId, setTeamId] = useState<string>('');
  const activeTeamId = teamId || teams[0]?.id || '';
  const activeTeam = teams.find((t) => t.id === activeTeamId);

  const { data: report } = useMockResource(() => getTeamReport(activeTeamId), [activeTeamId]);
  const { items: allTasks } = useMockList(() => listTasks(), []);

  const memberNames = new Set(activeTeam?.members.map((m) => m.name) ?? []);
  const teamTasks = allTasks.filter((t) => t.assigneeName && memberNames.has(t.assigneeName));
  const overdueTasks = teamTasks.filter((t) => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date('2026-07-18'));

  const submittedCount = report?.memberSubmissions.filter((m) => m.submitted).length ?? 0;
  const totalCount = report?.memberSubmissions.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Bảng thông tin của nhóm" subtitle="Sức khoẻ nhóm nhìn nhanh — báo cáo, khó khăn và ưu tiên tuần tới." />

      <div className="mt-4">
        <Select
          value={activeTeamId}
          onChange={setTeamId}
          options={teams.map((t) => ({ value: t.id, label: t.name }))}
        />
      </div>

      {!report ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Nhóm này chưa có báo cáo tuần nào.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Đã gửi báo cáo" value={`${submittedCount}/${totalCount}`} icon="Users" tone={submittedCount === totalCount ? 'emerald' : 'amber'} />
            <StatCard label="Khó khăn đang nêu" value={report.issues.length} icon="AlertTriangle" tone={report.issues.length > 0 ? 'amber' : 'default'} />
            <StatCard label="Nhiệm vụ quá hạn" value={overdueTasks.length} icon="AlertCircle" tone={overdueTasks.length > 0 ? 'rose' : 'default'} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Section title="Kết quả nổi bật" items={report.highlights} icon="Sparkles" />
            <Section title="Khó khăn" items={report.issues} icon="AlertTriangle" />
            <Section title="Ưu tiên tuần tiếp theo" items={report.nextPriorities} icon="ArrowRight" />
            <Section
              title="Ai chưa gửi báo cáo"
              items={report.memberSubmissions.filter((m) => !m.submitted).map((m) => m.userName)}
              icon="Clock"
              emptyText="Mọi người đã gửi báo cáo."
            />
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  icon,
  emptyText = 'Không có mục nào.',
}: {
  title: string;
  items: string[];
  icon: string;
  emptyText?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
              <Icon name={icon} size={13} className="mt-0.5 shrink-0 text-brand-400" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
