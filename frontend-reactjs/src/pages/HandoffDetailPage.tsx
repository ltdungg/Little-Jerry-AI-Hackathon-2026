import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { Pill } from '../components/common/Pill';
import { useAuth } from '../context/useAuth';
import { useMockList } from '../hooks/useMockList';
import {
  handoffStatusLabel,
  listHandoffs,
  reassignReceiver,
  regenerateHandoffContext,
  updateHandoffContent,
  updateHandoffStatus,
} from '../services/handoff.service';
import { listMembers } from '../services/people.service';
import type { Handoff, HandoffStatus, HandoffTask, MemberRecord } from '../types';

const STEPS: HandoffStatus[] = ['draft', 'team_lead_review', 'receiver_confirm', 'complete'];
const STEP_LABELS: Record<HandoffStatus, string> = {
  draft: 'Bản nháp',
  team_lead_review: 'Trưởng nhóm kiểm tra',
  receiver_confirm: 'Chờ người tiếp nhận xác nhận',
  complete: 'Hoàn tất',
};
const NEXT_STEP: Record<HandoffStatus, HandoffStatus | null> = {
  draft: 'team_lead_review',
  team_lead_review: 'receiver_confirm',
  receiver_confirm: 'complete',
  complete: null,
};
const NEXT_ACTION_LABEL: Record<HandoffStatus, string> = {
  draft: 'Gửi cho trưởng nhóm kiểm tra',
  team_lead_review: 'Xác nhận đã kiểm tra',
  receiver_confirm: 'Xác nhận hoàn tất bàn giao',
  complete: '',
};

export function HandoffDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isPm = (user?.role as string) === 'leader' || (user?.role as string) === 'project_manager';
  const { items: handoffs, setItems: setHandoffs, loading } = useMockList(() => listHandoffs(), []);
  const { items: members } = useMockList(() => listMembers({ kind: 'all' }), []);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Handoff>>({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handoff = handoffs.find((h) => h.id === id) ?? null;
  const current = isEditing ? { ...handoff, ...editData } as Handoff : handoff;

  if (loading) {
    return <p className="p-10 text-center text-sm text-slate-400">Đang tải...</p>;
  }

  if (!handoff || !current) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center">
        <div>
          <p className="text-lg font-semibold text-slate-900">Không tìm thấy bàn giao</p>
          <Link to="/handoffs" className="mt-2 inline-block text-sm text-brand-600 hover:underline">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(handoff.status);

  function handleFieldChange(field: string, value: string) {
    setEditData((prev) => ({ ...prev, [field]: value }));
  }

  function handleTaskChange(taskId: string, field: string, value: string) {
    const tasks = current!.tasks || [];
    setEditData((prev) => ({
      ...prev,
      tasks: tasks.map((t: HandoffTask) => (t.id === taskId ? { ...t, [field]: value } : t)),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateHandoffContent(handoff!.id, editData);
      setHandoffs((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setIsEditing(false);
      setEditData({});
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const updated = await regenerateHandoffContext(handoff!.id);
      setHandoffs((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    } finally {
      setRegenerating(false);
    }
  }

  async function handleAdvance() {
    const next = NEXT_STEP[handoff!.status];
    if (!next) return;
    setHandoffs((prev) => prev.map((h) => (h.id === handoff!.id ? { ...h, status: next } : h)));
    await updateHandoffStatus(handoff!.id, next);
  }

  async function handleReject() {
    setHandoffs((prev) => prev.map((h) => (h.id === handoff!.id ? { ...h, status: 'draft', reviewComments: null } : h)));
    await updateHandoffStatus(handoff!.id, 'draft');
  }

  async function handleAssignReceiver(memberId: string) {
    const member = members.find((m: MemberRecord) => m.id === memberId);
    setShowAssignModal(false);
    if (!member) return;
    const updated = await reassignReceiver(handoff!.id, member.id, member.name);
    setHandoffs((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        to="/handoffs"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <Icon name="ArrowLeft" size={15} />
        Bàn giao
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {handoff.fromName} → {handoff.toName ?? 'Chưa có người tiếp nhận'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{handoff.teamName} · {handoff.programName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={handoff.status === 'complete' ? 'emerald' : handoff.status === 'draft' ? 'slate' : 'amber'}>
            {handoffStatusLabel(handoff.status)}
          </Pill>
          {handoff.status !== 'complete' && (
            <>
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Save" size={14} />}
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setEditData({}); }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Icon name="Pencil" size={14} />
                  Chỉnh sửa
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-1.5">
          {STEPS.map((step, index) => (
            <div key={step} className="flex flex-1 items-center gap-1.5">
              <div className={`h-2 flex-1 rounded-full ${index <= currentIndex ? 'bg-brand-500' : 'bg-slate-100'}`} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          {STEPS.map((step) => (
            <span key={step} className={step === handoff.status ? 'font-medium text-brand-600' : ''}>
              {STEP_LABELS[step]}
            </span>
          ))}
        </div>
      </div>

      {/* Context */}
      {handoff.status !== 'complete' && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bối cảnh bàn giao (AI tổng hợp)</p>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {regenerating ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Sparkles" size={12} />}
              Tạo lại bằng AI
            </button>
          </div>
          {isEditing ? (
            <textarea
              value={current.context}
              onChange={(e) => handleFieldChange('context', e.target.value)}
              rows={3}
              className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          ) : (
            <p className="mt-2 text-sm text-slate-700">{current.context || 'Chưa có nội dung.'}</p>
          )}
        </div>
      )}

      {/* Deadline dự án (chỉ PM/lãnh đạo sửa được, chỉ lưu trong hồ sơ bàn giao) */}
      {(isPm || current.deadline) && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Deadline dự án (đề xuất)</p>
          {isPm && isEditing ? (
            <input
              type="date"
              value={current.deadline ?? ''}
              onChange={(e) => handleFieldChange('deadline', e.target.value)}
              className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          ) : (
            <p className="mt-2 text-sm text-slate-700">{current.deadline || 'Chưa có'}</p>
          )}
        </div>
      )}

      {/* Tasks */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-800">Các đầu việc cần bàn giao</p>
        <div className="mt-3 flex flex-col gap-2">
          {(current.tasks || []).map((task: HandoffTask) => (
            <div key={task.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ${
                task.status === 'completed' ? 'bg-emerald-500' :
                task.status === 'in_progress' ? 'bg-amber-400' : 'bg-slate-200'
              }`} />
              <div className="flex-1">
                {isEditing ? (
                  <input
                    value={task.title}
                    onChange={(e) => handleTaskChange(task.id, 'title', e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm font-medium text-slate-800 focus:border-brand-400 focus:outline-none"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800">{task.title}</p>
                )}
                {isEditing ? (
                  <textarea
                    value={task.description}
                    onChange={(e) => handleTaskChange(task.id, 'description', e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-y rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-brand-400 focus:outline-none"
                  />
                ) : (
                  <p className="mt-0.5 text-xs text-slate-500">{task.description}</p>
                )}
                <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                  {task.assigneeName && <span>Người phụ trách: {task.assigneeName}</span>}
                  {task.dueDate && <span>Hạn: {task.dueDate}</span>}
                  <Pill tone={
                    task.status === 'completed' ? 'emerald' :
                    task.status === 'in_progress' ? 'amber' : 'slate'
                  }>
                    {task.status === 'completed' ? 'Hoàn thành' :
                     task.status === 'in_progress' ? 'Đang thực hiện' : 'Chưa bắt đầu'}
                  </Pill>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-800">Tài liệu liên quan</p>
        <div className="mt-3 flex flex-col gap-2">
          {(current.documents || []).map((doc, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
              <Icon name={doc.type === 'doc' ? 'FileText' : doc.type === 'sheet' ? 'Table' : 'Image'} size={16} className="text-slate-400" />
              <span className="text-sm text-slate-700">{doc.name}</span>
              <Pill tone="slate">{doc.type}</Pill>
            </div>
          ))}
        </div>
      </div>

      {/* Detail fields */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailField label="Trách nhiệm hiện tại" value={current.currentResponsibilities} editing={isEditing} onChange={(v) => handleFieldChange('currentResponsibilities', v)} />
        <DetailField label="Công việc đang thực hiện" value={current.inProgressWork} editing={isEditing} onChange={(v) => handleFieldChange('inProgressWork', v)} />
        <DetailField label="Quyết định đang chờ" value={current.pendingDecisions} editing={isEditing} onChange={(v) => handleFieldChange('pendingDecisions', v)} />
        <DetailField label="Khó khăn chưa giải quyết" value={current.unresolvedIssues} editing={isEditing} onChange={(v) => handleFieldChange('unresolvedIssues', v)} />
        <DetailField label="Người liên hệ quan trọng" value={current.keyContacts} editing={isEditing} onChange={(v) => handleFieldChange('keyContacts', v)} />
        <DetailField label="Rủi ro cần lưu ý" value={current.risks} editing={isEditing} onChange={(v) => handleFieldChange('risks', v)} />
        <DetailField label="Bước tiếp theo đề xuất" value={current.nextSteps} editing={isEditing} onChange={(v) => handleFieldChange('nextSteps', v)} />
      </div>

      {/* Review comments */}
      {current.reviewComments && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800">Nhận xét từ người kiểm tra</p>
          <p className="mt-1 text-sm text-amber-700">{current.reviewComments}</p>
          <p className="mt-2 text-xs text-amber-600">— {current.reviewerName}, {current.reviewedAt}</p>
        </div>
      )}

      {/* Action buttons */}
      {handoff.status !== 'complete' && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
          {NEXT_STEP[handoff.status] && (
            <button
              type="button"
              onClick={handleAdvance}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Icon name="ArrowRight" size={14} />
              {NEXT_ACTION_LABEL[handoff.status]}
            </button>
          )}
          {handoff.status === 'team_lead_review' && (
            <>
              <button
                type="button"
                onClick={handleReject}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <Icon name="X" size={14} />
                Yêu cầu chỉnh sửa
              </button>
            </>
          )}
          {((!handoff.toName && handoff.status === 'draft') || isPm) && (
            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Icon name="UserPlus" size={14} />
              {handoff.toName ? 'Đổi người tiếp nhận' : 'Chọn người tiếp nhận'}
            </button>
          )}
        </div>
      )}

      {/* Assign modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Chọn người tiếp nhận</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {members.map((member: MemberRecord) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleAssignReceiver(member.id)}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {member.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.roleLabel} · {member.teamName}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      ) : (
        <p className="mt-2 text-sm text-slate-700">{value || '—'}</p>
      )}
    </div>
  );
}
