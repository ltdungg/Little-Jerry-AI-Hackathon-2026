import { PageHeader } from '../components/common/PageHeader';
import { Icon } from '../components/common/Icon';
import { Pill } from '../components/common/Pill';
import { useAuth } from '../context/useAuth';
import { useMockList } from '../hooks/useMockList';
import { handoffStatusLabel, listHandoffs, updateHandoffStatus } from '../services/handoff.service';
import type { Handoff, HandoffStatus } from '../types';

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

export function HandoffRollupPage() {
  const { user } = useAuth();
  const { items, setItems, loading } = useMockList(() => listHandoffs(), []);

  const received = items.filter((h) => user && h.toName === user.name);
  const given = items.filter((h) => user && h.fromName === user.name);

  async function handleAdvance(handoff: Handoff) {
    const next = NEXT_STEP[handoff.status];
    if (!next) return;
    setItems((prev) => prev.map((h) => (h.id === handoff.id ? { ...h, status: next } : h)));
    await updateHandoffStatus(handoff.id, next);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Bàn giao" subtitle="Những gì bạn được bàn giao và những gì bạn đã bàn giao cho người khác." />

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Đang tải...</p>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          <HandoffGroup
            title="Được bàn giao cho tôi"
            icon="Inbox"
            items={received}
            onAdvance={handleAdvance}
            emptyText="Chưa có nội dung nào được bàn giao cho bạn."
          />
          <HandoffGroup
            title="Tôi bàn giao cho người khác"
            icon="Send"
            items={given}
            onAdvance={handleAdvance}
            emptyText="Bạn chưa bàn giao nội dung nào cho người khác."
          />
        </div>
      )}
    </div>
  );
}

function HandoffGroup({
  title,
  icon,
  items,
  onAdvance,
  emptyText,
}: {
  title: string;
  icon: string;
  items: Handoff[];
  onAdvance: (h: Handoff) => void;
  emptyText: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <Icon name={icon} size={15} className="text-brand-500" />
        {title}
      </p>

      {items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
          {emptyText}
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {items.map((handoff) => (
            <div key={handoff.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  {handoff.fromName} → {handoff.toName ?? 'Chưa có người tiếp nhận'}
                </p>
                <Pill tone={handoff.status === 'complete' ? 'emerald' : 'amber'}>{handoffStatusLabel(handoff.status)}</Pill>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {handoff.teamName} · {handoff.programName}
              </p>

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
                  onClick={() => onAdvance(handoff)}
                  className="mt-4 flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <Icon name="ArrowRight" size={14} />
                  {NEXT_ACTION_LABEL[handoff.status]}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
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
