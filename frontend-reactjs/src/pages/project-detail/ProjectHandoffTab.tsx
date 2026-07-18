import { useOutletContext } from 'react-router-dom';
import { Icon } from '../../components/common/Icon';
import { Pill } from '../../components/common/Pill';
import { useMockList } from '../../hooks/useMockList';
import { handoffStatusLabel, listHandoffs, updateHandoffStatus } from '../../services/handoff.service';
import type { ProjectDetailContext } from '../ProjectDetailPage';
import type { Handoff, HandoffStatus } from '../../types';

const STEPS: HandoffStatus[] = ['draft', 'team_lead_review', 'receiver_confirm', 'complete'];
const NEXT_STEP: Record<HandoffStatus, HandoffStatus | null> = {
  draft: 'team_lead_review',
  team_lead_review: 'receiver_confirm',
  receiver_confirm: 'complete',
  complete: null,
};
const NEXT_ACTION_LABEL: Record<HandoffStatus, string> = {
  draft: 'Gửi cho trưởng nhóm kiểm tra',
  team_lead_review: 'Xác nhận đã kiểm tra',
  receiver_confirm: 'Người tiếp nhận xác nhận hoàn tất',
  complete: '',
};

export function ProjectHandoffTab() {
  const { project } = useOutletContext<ProjectDetailContext>();
  const { items, setItems, loading } = useMockList(() => listHandoffs({ programName: project.name }), [project.name]);

  async function handleAdvance(handoff: Handoff) {
    const next = NEXT_STEP[handoff.status];
    if (!next) return;
    setItems((prev) => prev.map((h) => (h.id === handoff.id ? { ...h, status: next } : h)));
    await updateHandoffStatus(handoff.id, next);
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Không có nội dung bàn giao nào đang chờ xử lý cho dự án này.
          </p>
        ) : (
          items.map((handoff) => (
            <div key={handoff.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  {handoff.fromName} → {handoff.toName ?? 'Chưa có người tiếp nhận'}
                </p>
                <Pill tone={handoff.status === 'complete' ? 'emerald' : 'amber'}>{handoffStatusLabel(handoff.status)}</Pill>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{handoff.teamName}</p>

              <Stepper current={handoff.status} />

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Trách nhiệm hiện tại" value={handoff.currentResponsibilities} />
                <Field label="Công việc đang thực hiện" value={handoff.inProgressWork} />
                <Field label="Quyết định đang chờ" value={handoff.pendingDecisions} />
                <Field label="Khó khăn chưa giải quyết" value={handoff.unresolvedIssues} />
                <Field label="Người liên hệ quan trọng" value={handoff.keyContacts} />
                <Field label="Tài liệu liên quan" value={handoff.relatedDocs} />
                <Field label="Rủi ro cần lưu ý" value={handoff.risks} />
                <Field label="Bước tiếp theo đề xuất" value={handoff.nextSteps} />
              </div>

              {NEXT_STEP[handoff.status] && (
                <button
                  type="button"
                  onClick={() => handleAdvance(handoff)}
                  className="mt-4 flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <Icon name="ArrowRight" size={14} />
                  {NEXT_ACTION_LABEL[handoff.status]}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stepper({ current }: { current: HandoffStatus }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <div className="mt-4 flex items-center gap-1.5">
      {STEPS.map((step, index) => (
        <div key={step} className="flex flex-1 items-center gap-1.5">
          <div className={`h-1.5 flex-1 rounded-full ${index <= currentIndex ? 'bg-brand-500' : 'bg-slate-100'}`} />
        </div>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-700">{value || '—'}</p>
    </div>
  );
}
