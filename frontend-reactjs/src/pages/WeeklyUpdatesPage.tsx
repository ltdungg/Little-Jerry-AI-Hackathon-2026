import { useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { useMockList } from '../hooks/useMockList';
import {
  approveTeamReport,
  listTeamReports,
  publishTeamReport,
  sendReminders,
} from '../services/updates.service';
import type { TeamWeeklyReport } from '../types';

type Tab = 'team' | 'org';

export function WeeklyUpdatesPage() {
  const [tab, setTab] = useState<Tab>('team');
  const { items: reports, setItems: setReports, loading } = useMockList(() => listTeamReports(), []);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  const activeReport = reports.find((r) => r.teamId === activeTeamId) ?? reports[0];

  async function handleApprove(report: TeamWeeklyReport) {
    setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: 'approved' } : r)));
    await approveTeamReport(report.id);
  }

  async function handlePublish(report: TeamWeeklyReport) {
    setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: 'published' } : r)));
    await publishTeamReport(report.id);
  }

  async function handleRemind(report: TeamWeeklyReport) {
    await sendReminders(report.teamId, report.memberSubmissions.filter((m) => !m.submitted));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Cập nhật hằng tuần"
        subtitle="Hệ thống tự tổng hợp báo cáo từng người → báo cáo nhóm → báo cáo toàn tổ chức."
      />

      <div className="mt-5 flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        <TabButton active={tab === 'team'} onClick={() => setTab('team')}>
          Báo cáo nhóm
        </TabButton>
        <TabButton active={tab === 'org'} onClick={() => setTab('org')}>
          Báo cáo toàn tổ chức
        </TabButton>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Đang tải...</p>
      ) : tab === 'team' ? (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
          <div className="flex flex-row gap-2 overflow-x-auto lg:flex-col">
            {reports.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveTeamId(r.teamId)}
                className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  (activeReport?.teamId ?? reports[0]?.teamId) === r.teamId
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r.teamName}
              </button>
            ))}
          </div>

          {activeReport && (
            <TeamReportCard
              report={activeReport}
              onApprove={() => handleApprove(activeReport)}
              onPublish={() => handlePublish(activeReport)}
              onRemind={() => handleRemind(activeReport)}
            />
          )}
        </div>
      ) : (
        <OrgSummary reports={reports} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function TeamReportCard({
  report,
  onApprove,
  onPublish,
  onRemind,
}: {
  report: TeamWeeklyReport;
  onApprove: () => void;
  onPublish: () => void;
  onRemind: () => void;
}) {
  const notSubmitted = report.memberSubmissions.filter((m) => !m.submitted);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{report.teamName}</p>
          <p className="text-xs text-slate-400">{report.week}</p>
        </div>
        <Pill tone={report.status === 'published' ? 'emerald' : report.status === 'approved' ? 'blue' : 'slate'}>
          {report.status === 'published' ? 'Đã công bố' : report.status === 'approved' ? 'Đã duyệt' : 'Bản nháp'}
        </Pill>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Thành viên</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {report.memberSubmissions.map((m) => (
            <span
              key={m.userId}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                m.submitted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              <Icon name={m.submitted ? 'CheckCircle2' : 'Clock'} size={12} />
              {m.userName}
            </span>
          ))}
        </div>
        {notSubmitted.length > 0 && (
          <button
            type="button"
            onClick={onRemind}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
          >
            <Icon name="Bell" size={12} />
            Gửi nhắc nhở cho {notSubmitted.length} người chưa gửi
          </button>
        )}
      </div>

      <ReportSection title="Kết quả nổi bật" items={report.highlights} icon="Sparkles" />
      <ReportSection title="Khó khăn" items={report.issues} icon="AlertTriangle" />
      <ReportSection title="Ưu tiên tuần tiếp theo" items={report.nextPriorities} icon="ArrowRight" />

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onApprove}
          disabled={report.status !== 'draft'}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Phê duyệt
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={report.status !== 'approved'}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          Công bố báo cáo
        </button>
      </div>
    </div>
  );
}

function ReportSection({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
            <Icon name={icon} size={13} className="mt-1 shrink-0 text-brand-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrgSummary({ reports }: { reports: TeamWeeklyReport[] }) {
  const allHighlights = reports.flatMap((r) => r.highlights);
  const allIssues = reports.flatMap((r) => r.issues);
  const notPublished = reports.filter((r) => r.status !== 'published');

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-800">Tổng hợp toàn tổ chức</p>
      <ReportSection title="Kết quả nổi bật" items={allHighlights} icon="Sparkles" />
      <ReportSection title="Khó khăn cần lãnh đạo hỗ trợ" items={allIssues} icon="AlertTriangle" />
      {notPublished.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nhóm chưa công bố báo cáo</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {notPublished.map((r) => (
              <Pill key={r.id} tone="amber">
                {r.teamName}
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
        Tạo bản tóm tắt cho lãnh đạo
      </button>
    </div>
  );
}
