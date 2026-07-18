import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { Pill } from '../components/common/Pill';
import { useMockList } from '../hooks/useMockList';
import { listHandoffs, handoffStatusLabel } from '../services/handoff.service';
import type { Handoff, HandoffStatus } from '../types';

const STATUS_FILTERS: { value: HandoffStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'draft', label: 'Bản nháp' },
  { value: 'team_lead_review', label: 'Trưởng nhóm kiểm tra' },
  { value: 'receiver_confirm', label: 'Chờ người tiếp nhận' },
  { value: 'complete', label: 'Hoàn tất' },
];

const STEPS: HandoffStatus[] = ['draft', 'team_lead_review', 'receiver_confirm', 'complete'];

export function HandoffsListPage() {
  const [statusFilter, setStatusFilter] = useState<HandoffStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const { items, loading } = useMockList(() => listHandoffs(), []);

  const filtered = useMemo(() => {
    return items.filter((h) => {
      if (statusFilter !== 'all' && h.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          h.fromName.toLowerCase().includes(q) ||
          (h.toName && h.toName.toLowerCase().includes(q)) ||
          h.programName.toLowerCase().includes(q) ||
          h.teamName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, statusFilter, query]);

  const stats = useMemo(() => ({
    total: items.length,
    draft: items.filter((h) => h.status === 'draft').length,
    inReview: items.filter((h) => h.status === 'team_lead_review' || h.status === 'receiver_confirm').length,
    complete: items.filter((h) => h.status === 'complete').length,
  }), [items]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Bàn giao</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Theo dõi và quản lý các bản bàn giao công việc. Bấm vào một bàn giao để xem chi tiết và thực hiện phê duyệt.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Tổng cộng" value={stats.total} icon="ArrowLeftRight" tone="default" />
        <StatBox label="Bản nháp" value={stats.draft} icon="FileEdit" tone="slate" />
        <StatBox label="Đang kiểm tra" value={stats.inReview} icon="Eye" tone="amber" />
        <StatBox label="Hoàn tất" value={stats.complete} icon="CheckCircle2" tone="emerald" />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon
            name="Search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Tìm theo tên người, dự án, nhóm..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as HandoffStatus | 'all')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-sm text-slate-400">Đang tải...</p>
      ) : filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <Icon name="SearchX" size={32} className="text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">Không tìm thấy bàn giao phù hợp</p>
          <p className="mt-1 text-xs text-slate-400">Thử điều chỉnh bộ lọc hoặc từ khoá tìm kiếm.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {filtered.map((handoff) => (
            <HandoffCard key={handoff.id} handoff={handoff} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <Icon name={icon} size={16} className={tone === 'emerald' ? 'text-emerald-500' : tone === 'amber' ? 'text-amber-500' : 'text-slate-400'} />
      <p className="mt-2 text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function HandoffCard({ handoff }: { handoff: Handoff }) {
  const currentIndex = STEPS.indexOf(handoff.status);

  return (
    <Link
      to={`/handoffs/${handoff.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {handoff.fromName} → {handoff.toName ?? 'Chưa có người tiếp nhận'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{handoff.teamName} · {handoff.programName}</p>
        </div>
        <Pill tone={handoff.status === 'complete' ? 'emerald' : handoff.status === 'draft' ? 'slate' : 'amber'}>
          {handoffStatusLabel(handoff.status)}
        </Pill>
      </div>

      {/* Stepper */}
      <div className="mt-3 flex items-center gap-1.5">
        {STEPS.map((step, index) => (
          <div key={step} className="flex flex-1 items-center gap-1.5">
            <div className={`h-1.5 flex-1 rounded-full ${index <= currentIndex ? 'bg-brand-500' : 'bg-slate-100'}`} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>Nháp</span>
        <span>Kiểm tra</span>
        <span>Xác nhận</span>
        <span>Hoàn tất</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Đầu việc</p>
          <p className="mt-0.5 text-xs font-medium text-slate-700">{handoff.tasks?.length ?? 0} đầu việc</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Tài liệu</p>
          <p className="mt-0.5 text-xs font-medium text-slate-700">{handoff.documents?.length ?? 0} tài liệu</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Bối cảnh</p>
          <p className="mt-0.5 text-xs font-medium text-slate-700 line-clamp-1">{handoff.context || '—'}</p>
        </div>
      </div>
    </Link>
  );
}
