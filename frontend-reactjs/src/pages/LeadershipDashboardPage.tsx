import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { StatCard } from '../components/common/StatCard';
import { useMockResource } from '../hooks/useMockResource';
import { getLeadershipSummary } from '../services/reports.service';

export function LeadershipDashboardPage() {
  const { data, loading } = useMockResource(() => getLeadershipSummary(), []);

  if (loading || !data) {
    return <p className="p-6 text-sm text-slate-400">Đang tải...</p>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Bảng thông tin lãnh đạo" subtitle="Toàn cảnh tổ chức — chương trình, khó khăn và quyết định cần chú ý." />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Tổng chương trình" value={data.totalPrograms} icon="FolderOpen" />
        <StatCard label="Đúng tiến độ" value={data.onTrack} icon="CheckCircle2" tone="emerald" />
        <StatCard label="Có nguy cơ" value={data.atRisk} icon="AlertTriangle" tone="amber" />
        <StatCard label="Quá hạn" value={data.overdue} icon="AlertCircle" tone="rose" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Khó khăn nghiêm trọng" value={data.criticalIssues} icon="Flame" tone={data.criticalIssues > 0 ? 'rose' : 'default'} />
        <StatCard label="Khó khăn quá hạn" value={data.overdueIssues} icon="Clock" tone={data.overdueIssues > 0 ? 'amber' : 'default'} />
        <StatCard label="Quyết định chờ duyệt" value={data.pendingDecisions} icon="Gavel" tone={data.pendingDecisions > 0 ? 'amber' : 'default'} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Section title="Kết quả nổi bật trong tuần" items={data.weeklyHighlights} icon="Sparkles" emptyText="Chưa có dữ liệu tuần này." />
        <Section title="Vấn đề cần lãnh đạo chú ý" items={data.attentionItems} icon="AlertTriangle" emptyText="Không có vấn đề nổi bật." />
      </div>

      {data.teamsMissingReport.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
            <Icon name="Clock" size={13} />
            Nhóm chưa gửi đủ báo cáo tuần này
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.teamsMissingReport.map((team) => (
              <Pill key={team} tone="amber">
                {team}
              </Pill>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="mt-5 flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        <Icon name="Sparkles" size={14} />
        Tự động tạo bản tóm tắt dành cho lãnh đạo
      </button>
    </div>
  );
}

function Section({
  title,
  items,
  icon,
  emptyText,
}: {
  title: string;
  items: string[];
  icon: string;
  emptyText: string;
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
