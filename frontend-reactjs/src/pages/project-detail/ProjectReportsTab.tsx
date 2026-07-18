import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Icon } from '../../components/common/Icon';
import { Pill } from '../../components/common/Pill';
import { StatCard } from '../../components/common/StatCard';
import { useAuth } from '../../context/useAuth';
import { useMockList } from '../../hooks/useMockList';
import { useMockResource } from '../../hooks/useMockResource';
import { printReportAsPdf } from '../../lib/reportPrint';
import {
  generateReports,
  listProjectReports,
  markReportExported,
  reportStatusLabel,
  reportTypeLabel,
  revertReport,
  updateReportContent,
} from '../../services/projectReports.service';
import {
  addTeamReportItem,
  approveTeamReport,
  getTeamReportForProject,
  publishTeamReport,
  removeTeamReportItem,
  sendReminders,
  type TeamReportSection,
} from '../../services/updates.service';
import type { ProjectDetailContext } from '../ProjectDetailPage';
import type { ProjectReport, ProjectReportType, TeamReportItem } from '../../types';

export function ProjectReportsTab() {
  const { project } = useOutletContext<ProjectDetailContext>();

  return (
    <div className="flex flex-col gap-6">
      <GeneratedReportsSection projectId={project.id} projectName={project.name} />
      <TeamDashboardSection projectId={project.id} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Báo cáo tự động (AgentCore)
// ---------------------------------------------------------------------------

function GeneratedReportsSection({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { user } = useAuth();
  const { items: reports, setItems: setReports, loading } = useMockList(() => listProjectReports(projectId), [projectId]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = reports.find((r) => r.id === selectedId) ?? null;
  const [revertNonce, setRevertNonce] = useState(0);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<ProjectReportType[]>(['daily_update']);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (selectedTypes.length === 0) return;
    setGenerating(true);
    const created = await generateReports(projectId, selectedTypes, 'manual');
    setReports((prev) => [...created, ...prev]);
    setGenerating(false);
    setShowGenerateModal(false);
    if (created[0]) setSelectedId(created[0].id);
  }

  async function handleSave(content: string) {
    if (!selected) return;
    const updated = await updateReportContent(selected.id, content, user?.name ?? '');
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function handleRevert() {
    if (!selected) return;
    const updated = await revertReport(selected.id);
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setRevertNonce((n) => n + 1);
  }

  async function handleExportPdf(content: string) {
    if (!selected) return;
    printReportAsPdf(`${projectName} — ${reportTypeLabel(selected.reportType)}`, content);
    const updated = await markReportExported(selected.id);
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Báo cáo tự động</p>
          <p className="mt-1 text-xs text-slate-400">
            Lịch tự động: 18:00 hằng ngày và 18:00 Chủ nhật hằng tuần. Nếu hai lịch trùng thời điểm, cả hai báo cáo đều
            được tạo — một cho ngày, một cho tuần.
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
          key={`${selected.id}:${revertNonce}`}
          report={selected}
          onSave={handleSave}
          onRevert={handleRevert}
          onExportPdf={handleExportPdf}
        />
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
            <p className="text-sm font-semibold text-slate-800">Xuất báo cáo</p>
            <div className="mt-3 flex flex-col gap-2">
              {(['daily_update', 'weekly_update'] as ProjectReportType[]).map((type) => (
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

function ReportEditorPanel({
  report,
  onSave,
  onRevert,
  onExportPdf,
}: {
  report: ProjectReport;
  onSave: (content: string) => Promise<void>;
  onRevert: () => Promise<void>;
  onExportPdf: (content: string) => void;
}) {
  const [content, setContent] = useState(report.contentMarkdown);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(content);
    setSaving(false);
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">
          {reportTypeLabel(report.reportType)} — {report.periodLabel}
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
          onClick={onRevert}
          disabled={!report.isEdited}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Khôi phục bản gốc AI
        </button>
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
          onClick={() => onExportPdf(content)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          <Icon name="Download" size={13} />
          Xuất PDF
        </button>
      </div>
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

// ---------------------------------------------------------------------------
// Bảng thông tin nhóm (lát cắt theo dự án)
// ---------------------------------------------------------------------------

function TeamDashboardSection({ projectId }: { projectId: string }) {
  const { data, setData, loading } = useMockResource(() => getTeamReportForProject(projectId), [projectId]);
  const [newItemText, setNewItemText] = useState<Record<TeamReportSection, string>>({
    highlights: '',
    issues: '',
    nextPriorities: '',
  });

  if (loading) return <p className="text-sm text-slate-400">Đang tải Bảng thông tin nhóm...</p>;
  if (!data) return null;

  const { report, team } = data;

  function indexedItemsForProject(items: TeamReportItem[]) {
    return items.map((item, index) => ({ item, index })).filter(({ item }) => item.programId === projectId);
  }

  async function handleAdd(section: TeamReportSection) {
    const text = newItemText[section].trim();
    if (!text) return;
    const updated = await addTeamReportItem(report.id, section, { text, programId: projectId });
    setData({ report: updated, team });
    setNewItemText((prev) => ({ ...prev, [section]: '' }));
  }

  async function handleRemove(section: TeamReportSection, index: number) {
    const updated = await removeTeamReportItem(report.id, section, index);
    setData({ report: updated, team });
  }

  async function handleApprove() {
    const updated = await approveTeamReport(report.id);
    setData({ report: updated, team });
  }

  async function handlePublish() {
    const updated = await publishTeamReport(report.id);
    setData({ report: updated, team });
  }

  async function handleRemind() {
    await sendReminders(report.teamId, report.memberSubmissions.filter((m) => !m.submitted));
  }

  const notSubmitted = report.memberSubmissions.filter((m) => !m.submitted);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Bảng thông tin nhóm — {team.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Chỉ hiển thị phần liên quan tới dự án này. Xem toàn cảnh nhóm (mọi dự án) tại "Bảng thông tin của nhóm".
          </p>
        </div>
        <Pill tone={report.status === 'published' ? 'emerald' : report.status === 'approved' ? 'blue' : 'slate'}>
          {report.status === 'published' ? 'Đã công bố' : report.status === 'approved' ? 'Đã duyệt' : 'Bản nháp'}
        </Pill>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Thành viên đã gửi" value={`${report.memberSubmissions.length - notSubmitted.length}/${report.memberSubmissions.length}`} icon="Users" tone={notSubmitted.length === 0 ? 'emerald' : 'amber'} />
        <StatCard label="Khó khăn của dự án" value={indexedItemsForProject(report.issues).length} icon="AlertTriangle" tone={indexedItemsForProject(report.issues).length > 0 ? 'amber' : 'default'} />
        <StatCard label="Ưu tiên tuần tới" value={indexedItemsForProject(report.nextPriorities).length} icon="ArrowRight" />
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

      <EditableItemList
        title="Kết quả nổi bật"
        icon="Sparkles"
        entries={indexedItemsForProject(report.highlights)}
        onRemove={(index) => handleRemove('highlights', index)}
        value={newItemText.highlights}
        onChange={(v) => setNewItemText((prev) => ({ ...prev, highlights: v }))}
        onAdd={() => handleAdd('highlights')}
      />
      <EditableItemList
        title="Khó khăn"
        icon="AlertTriangle"
        entries={indexedItemsForProject(report.issues)}
        onRemove={(index) => handleRemove('issues', index)}
        value={newItemText.issues}
        onChange={(v) => setNewItemText((prev) => ({ ...prev, issues: v }))}
        onAdd={() => handleAdd('issues')}
      />
      <EditableItemList
        title="Ưu tiên tuần tiếp theo"
        icon="ArrowRight"
        entries={indexedItemsForProject(report.nextPriorities)}
        onRemove={(index) => handleRemove('nextPriorities', index)}
        value={newItemText.nextPriorities}
        onChange={(v) => setNewItemText((prev) => ({ ...prev, nextPriorities: v }))}
        onAdd={() => handleAdd('nextPriorities')}
      />

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <p className="mr-auto text-xs text-slate-400">
          Duyệt/công bố áp dụng cho toàn bộ báo cáo của nhóm (mọi dự án), không chỉ riêng dự án này.
        </p>
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

function EditableItemList({
  title,
  icon,
  entries,
  onRemove,
  value,
  onChange,
  onAdd,
}: {
  title: string;
  icon: string;
  entries: { item: TeamReportItem; index: number }[];
  onRemove: (index: number) => void;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {entries.length === 0 ? (
        <p className="mt-1.5 text-sm text-slate-400">Chưa có mục nào cho dự án này.</p>
      ) : (
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {entries.map(({ item, index }) => (
            <li key={index} className="flex items-start justify-between gap-2 text-sm text-slate-600">
              <span className="flex items-start gap-2">
                <Icon name={icon} size={13} className="mt-0.5 shrink-0 text-brand-400" />
                {item.text}
              </span>
              <button type="button" onClick={() => onRemove(index)} className="shrink-0 text-slate-300 hover:text-rose-500">
                <Icon name="X" size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAdd();
          }}
          placeholder="Thêm mục mới cho dự án này..."
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Thêm
        </button>
      </div>
    </div>
  );
}
