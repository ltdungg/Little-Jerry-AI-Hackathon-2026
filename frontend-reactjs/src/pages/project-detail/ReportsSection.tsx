import { useState } from 'react';
import { Icon } from '../../components/common/Icon';
import { Pill } from '../../components/common/Pill';
import { StatCard } from '../../components/common/StatCard';
import { useMockList } from '../../hooks/useMockList';
import { useMockResource } from '../../hooks/useMockResource';
import {
  exportReportPdf,
  generateReports,
  listProjectReports,
  reportStatusLabel,
  reportTypeLabel,
  updateReportContent,
} from '../../services/projectReports.service';
import { approveTeamReport, getTeamReport, publishTeamReport, sendReminders } from '../../services/updates.service';
import { listTeams } from '../../services/teams.service';
import type { Project, ProjectReport, Team, TeamWeeklyReport } from '../../types';

export function ReportsSection({ project }: { project: Project }) {
  return (
    <div className="flex flex-col gap-6">
      <GeneratedReportsSection projectId={project.id} projectName={project.name} />
      <TeamDashboardSection projectName={project.name} />
    </div>
  );
}

function GeneratedReportsSection({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { items: reports, setItems: setReports, loading } = useMockList(() => listProjectReports(projectId), [projectId]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = reports.find((r) => r.id === selectedId) ?? null;
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<ProjectReport['reportType'][]>(['daily_status']);
  const [generating, setGenerating] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  async function handleGenerate() {
    if (selectedTypes.length === 0) return;
    setGenerating(true);
    try {
      const created = await generateReports(projectId, selectedTypes);
      setReports((prev) => [...created, ...prev]);
      setShowGenerateModal(false);
      if (created[0]) setSelectedId(created[0].id);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(content: string) {
    if (!selected) return;
    const updated = await updateReportContent(selected.id, content);
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function handleExportPdf() {
    if (!selected) return;
    setExportingId(selected.id);
    try {
      const { downloadUrl } = await exportReportPdf(selected.id);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      setReports((prev) =>
        prev.map((r) => (r.id === selected.id ? { ...r, status: 'exported', pdfExportedAt: 'vừa xong' } : r)),
      );
    } finally {
      setExportingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Báo cáo tự động</p>
          <p className="mt-1 text-xs text-slate-400">
            Lịch tự động: 18:00 hằng ngày và 18:00 Chủ nhật hằng tuần.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowGenerateModal(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Icon name="Sparkles" size={14} />
          Xuất báo cáo
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-400">Đang tải...</p>
      ) : reports.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          Chưa có báo cáo nào. Bấm "Xuất báo cáo" để tạo báo cáo đầu tiên.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Loại</th>
                <th className="px-3 py-2 font-medium">Kỳ báo cáo</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
                <th className="px-3 py-2 font-medium">Nguồn tạo</th>
                <th className="px-3 py-2 font-medium">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 ${
                    selected?.id === r.id ? 'bg-brand-50/60' : ''
                  }`}
                >
                  <td className="px-3 py-2.5 font-medium text-slate-700">{reportTypeLabel(r.reportType)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.periodLabel}</td>
                  <td className="px-3 py-2.5">
                    <Pill tone={statusTone(r.status)}>{reportStatusLabel(r.status)}</Pill>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{r.generatedBy === 'schedule' ? 'Tự động' : 'Thủ công'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{r.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ReportEditorPanel
          key={selected.id}
          report={selected}
          projectName={projectName}
          exporting={exportingId === selected.id}
          onSave={handleSave}
          onExportPdf={handleExportPdf}
        />
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
            <p className="text-sm font-semibold text-slate-800">Xuất báo cáo</p>
            <div className="mt-3 flex flex-col gap-2">
              {(['daily_status', 'weekly_status'] as ProjectReport['reportType'][]).map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={(e) =>
                      setSelectedTypes((prev) =>
                        e.target.checked ? [...prev, type] : prev.filter((t) => t !== type),
                      )
                    }
                  />
                  {reportTypeLabel(type)}
                </label>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || selectedTypes.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {generating && <Icon name="Loader2" size={14} className="animate-spin" />}
                Tạo báo cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusTone(status: ProjectReport['status']) {
  return (
    {
      generating: 'slate' as const,
      draft: 'blue' as const,
      edited: 'amber' as const,
      exported: 'emerald' as const,
      failed: 'rose' as const,
    }[status]
  );
}

function ReportEditorPanel({
  report,
  projectName,
  exporting,
  onSave,
  onExportPdf,
}: {
  report: ProjectReport;
  projectName: string;
  exporting: boolean;
  onSave: (content: string) => Promise<void>;
  onExportPdf: () => Promise<void>;
}) {
  const [content, setContent] = useState(report.contentMarkdown);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(content);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">
          {reportTypeLabel(report.reportType)} — {projectName} · {report.periodLabel}
        </p>
        <Pill tone={statusTone(report.status)}>{reportStatusLabel(report.status)}</Pill>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        className="mt-3 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
      />

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Lưu thay đổi
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {exporting ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Download" size={13} />}
          Xuất PDF
        </button>
      </div>
    </div>
  );
}

function TeamDashboardSection({ projectName }: { projectName: string }) {
  const { data, loading } = useMockResource(() => resolveTeamReport(projectName), [projectName]);
  const [reportState, setReportState] = useState<TeamWeeklyReport | null>(null);
  const report = reportState ?? data?.report ?? null;
  const team = data?.team;

  if (loading) return <p className="text-sm text-slate-400">Đang tải Bảng thông tin nhóm...</p>;
  if (!team || !report) return null;

  async function handleApprove() {
    if (!report) return;
    const updated = await approveTeamReport(report.id);
    setReportState(updated);
  }

  async function handlePublish() {
    if (!report) return;
    const updated = await publishTeamReport(report.id);
    setReportState(updated);
  }

  async function handleRemind() {
    if (!report) return;
    await sendReminders(report.teamId, report.memberSubmissions.filter((m) => !m.submitted));
  }

  const notSubmitted = report.memberSubmissions.filter((m) => !m.submitted);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Bảng thông tin nhóm — {team.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">Nhóm phụ trách dự án này.</p>
        </div>
        <Pill tone={report.status === 'published' ? 'emerald' : report.status === 'approved' ? 'blue' : 'slate'}>
          {report.status === 'published' ? 'Đã công bố' : report.status === 'approved' ? 'Đã duyệt' : 'Bản nháp'}
        </Pill>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Thành viên đã gửi"
          value={`${report.memberSubmissions.length - notSubmitted.length}/${report.memberSubmissions.length}`}
          icon="Users"
          tone={notSubmitted.length === 0 ? 'emerald' : 'amber'}
        />
        <StatCard label="Khó khăn đang nêu" value={report.issues.length} icon="AlertTriangle" tone={report.issues.length > 0 ? 'amber' : 'default'} />
        <StatCard label="Ưu tiên tuần tới" value={report.nextPriorities.length} icon="ArrowRight" />
      </div>

      {notSubmitted.length > 0 && (
        <button
          type="button"
          onClick={handleRemind}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
        >
          <Icon name="Bell" size={12} />
          Gửi nhắc nhở cho {notSubmitted.length} người chưa gửi báo cáo nhóm
        </button>
      )}

      <BulletList title="Kết quả nổi bật" icon="Sparkles" items={report.highlights} />
      <BulletList title="Khó khăn" icon="AlertTriangle" items={report.issues} />
      <BulletList title="Ưu tiên tuần tiếp theo" icon="ArrowRight" items={report.nextPriorities} />

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={handleApprove}
          disabled={report.status !== 'draft'}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Phê duyệt
        </button>
        <button
          type="button"
          onClick={handlePublish}
          disabled={report.status !== 'approved'}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          Công bố báo cáo
        </button>
      </div>
    </div>
  );
}

async function resolveTeamReport(projectName: string): Promise<{ team: Team; report: TeamWeeklyReport } | undefined> {
  const teams = await listTeams();
  const team = teams.find((t) => t.programNames.includes(projectName));
  if (!team) return undefined;
  const report = await getTeamReport(team.id);
  if (!report) return undefined;
  return { team, report };
}

function BulletList({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
            <Icon name={icon} size={13} className="mt-0.5 shrink-0 text-brand-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
