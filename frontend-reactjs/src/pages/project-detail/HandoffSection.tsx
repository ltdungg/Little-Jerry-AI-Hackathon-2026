import { Link } from 'react-router-dom';
import { Icon } from '../../components/common/Icon';
import { Pill } from '../../components/common/Pill';
import { useMockList } from '../../hooks/useMockList';
import { handoffStatusLabel, listHandoffs } from '../../services/handoff.service';
import type { Project, HandoffStatus } from '../../types';

const STEPS: HandoffStatus[] = ['draft', 'team_lead_review', 'receiver_confirm', 'complete'];

export function HandoffSection({ project }: { project: Project }) {
  const { items, loading } = useMockList(() => listHandoffs({ programName: project.name }), [project.name]);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Không có nội dung bàn giao nào cho dự án này.
          </p>
        ) : (
          items.map((handoff) => (
            <Link
              key={handoff.id}
              to={`/handoffs/${handoff.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  {handoff.fromName} → {handoff.toName ?? 'Chưa có người tiếp nhận'}
                </p>
                <Pill tone={handoff.status === 'complete' ? 'emerald' : 'amber'}>{handoffStatusLabel(handoff.status)}</Pill>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{handoff.teamName}</p>

              <Stepper current={handoff.status} />

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Trách nhiệm hiện tại" value={handoff.currentResponsibilities} />
                <Field label="Công việc đang thực hiện" value={handoff.inProgressWork} />
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs text-brand-600">
                <Icon name="ArrowRight" size={12} />
                Xem chi tiết bàn giao
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function Stepper({ current }: { current: HandoffStatus }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <div className="mt-3 flex items-center gap-1.5">
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
      <p className="mt-0.5 text-sm text-slate-700 line-clamp-2">{value || '—'}</p>
    </div>
  );
}
