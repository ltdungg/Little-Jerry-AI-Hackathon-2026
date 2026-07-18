import { useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill, type PillTone } from '../components/common/Pill';
import { Select } from '../components/common/Select';
import { useAuth } from '../context/useAuth';
import { useMockList } from '../hooks/useMockList';
import {
  approveDecision,
  decisionApprovalLabel,
  listDecisions,
  rejectDecision,
} from '../services/decisions.service';
import type { Decision, DecisionApprovalStatus } from '../types';

const APPROVAL_TONE: Record<DecisionApprovalStatus, PillTone> = {
  ai_suggested: 'violet',
  draft: 'slate',
  reviewing: 'amber',
  confirmed: 'emerald',
  rejected: 'rose',
};

const APPROVAL_OPTIONS: { value: DecisionApprovalStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'ai_suggested', label: 'AI đề xuất' },
  { value: 'draft', label: 'Bản nháp' },
  { value: 'reviewing', label: 'Đang xem xét' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'rejected', label: 'Bị từ chối' },
];

export function DecisionsPage() {
  const { user } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState<DecisionApprovalStatus | 'all'>('all');
  const { items, setItems, loading } = useMockList(() => listDecisions({ approvalStatus }), [approvalStatus]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = items.find((d) => d.id === selectedId) ?? items[0];

  async function handleApprove(decision: Decision) {
    setItems((prev) =>
      prev.map((d) => (d.id === decision.id ? { ...d, approvalStatus: 'confirmed', approverName: user?.name ?? '' } : d)),
    );
    await approveDecision(decision.id, user?.name ?? '');
  }

  async function handleReject(decision: Decision) {
    setItems((prev) => prev.map((d) => (d.id === decision.id ? { ...d, approvalStatus: 'rejected' } : d)));
    await rejectDecision(decision.id);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Quyết định"
        subtitle="Lưu vết lý do, phương án và người phê duyệt — AI chỉ đề xuất, con người xác nhận."
      />

      <div className="mt-4">
        <Select value={approvalStatus} onChange={(v) => setApprovalStatus(v as DecisionApprovalStatus | 'all')} options={APPROVAL_OPTIONS} />
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Không có quyết định phù hợp.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-2">
            {items.map((decision) => (
              <button
                key={decision.id}
                type="button"
                onClick={() => setSelectedId(decision.id)}
                className={`rounded-lg border p-3 text-left transition ${
                  selectedId === decision.id ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-200'
                }`}
              >
                <p className="text-sm font-medium text-slate-800">{decision.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">{decision.programName}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Pill tone={APPROVAL_TONE[decision.approvalStatus]}>{decisionApprovalLabel(decision.approvalStatus)}</Pill>
                  {decision.effectiveStatus === 'superseded' && <Pill tone="slate">Đã thay thế</Pill>}
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{selected.programName}</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">{selected.title}</h2>
                </div>
                <Pill tone={APPROVAL_TONE[selected.approvalStatus]}>{decisionApprovalLabel(selected.approvalStatus)}</Pill>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">{selected.content}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <DetailField label="Ngày quyết định" value={selected.decidedAt} />
                <DetailField label="Người chịu trách nhiệm" value={selected.ownerName} />
                <DetailField label="Người phê duyệt" value={selected.approverName ?? 'Chưa có'} />
              </div>

              <DetailSection title="Lý do đưa ra quyết định" text={selected.reason} />
              {selected.alternativesConsidered.length > 0 && (
                <DetailListSection title="Các phương án đã cân nhắc" items={selected.alternativesConsidered} />
              )}
              <DetailSection title="Ảnh hưởng dự kiến" text={selected.expectedImpact} />
              {selected.followUpTasks.length > 0 && (
                <DetailListSection title="Công việc cần thực hiện sau quyết định" items={selected.followUpTasks} />
              )}
              {selected.supersededByTitle && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <Icon name="History" size={13} />
                  Đã được thay thế bởi: <span className="font-medium text-slate-700">{selected.supersededByTitle}</span>
                </div>
              )}

              {(selected.approvalStatus === 'ai_suggested' || selected.approvalStatus === 'reviewing') && (
                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => handleApprove(selected)}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    <Icon name="Check" size={14} />
                    Phê duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(selected)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Từ chối
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-700">{value}</p>
    </div>
  );
}

function DetailSection({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{text}</p>
    </div>
  );
}

function DetailListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
