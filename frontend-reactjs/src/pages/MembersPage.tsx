import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { Select } from '../components/common/Select';
import { Table, type Column } from '../components/common/Table';
import { Icon } from '../components/common/Icon';
import { CreateMemberModal } from '../components/common/CreateMemberModal';
import { useAuth } from '../context/useAuth';
import { useMockList } from '../hooks/useMockList';
import { listMembers } from '../services/people.service';
import { createOffboarding } from '../services/handoff.service';
import type { MemberKind, MemberRecord, MemberStatus } from '../types';

const KIND_OPTIONS: { value: MemberKind | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả loại' },
  { value: 'staff', label: 'Nhân viên' },
  { value: 'volunteer', label: 'Tình nguyện viên' },
];

const STATUS_LABEL: Record<MemberStatus, string> = {
  active: 'Đang hoạt động',
  ending_soon: 'Sắp kết thúc',
  inactive: 'Đã ngừng',
};

export function MembersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPm = (user?.role as string) === 'leader' || (user?.role as string) === 'project_manager';
  const [kind, setKind] = useState<MemberKind | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [offboardTarget, setOffboardTarget] = useState<MemberRecord | null>(null);
  const { items, loading, refresh } = useMockList(() => listMembers({ kind }), [kind]);

  const handleMemberCreated = useCallback(() => {
    refresh();
  }, [refresh]);

  const columns: Column<MemberRecord>[] = [
    {
      header: 'Thành viên',
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {m.initials}
          </div>
          <div>
            <p className="font-medium text-slate-800">{m.name}</p>
            <p className="text-xs text-slate-400">{m.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Vai trò', render: (m) => m.roleLabel },
    { header: 'Nhóm', render: (m) => m.teamName },
    { header: 'Chương trình', render: (m) => m.programNames.join(', ') },
    { header: 'Loại', render: (m) => <Pill tone={m.kind === 'staff' ? 'blue' : 'violet'}>{m.kind === 'staff' ? 'Nhân viên' : 'TNV'}</Pill> },
    {
      header: 'Trạng thái',
      render: (m) => <Pill tone={m.status === 'active' ? 'emerald' : m.status === 'ending_soon' ? 'amber' : 'slate'}>{STATUS_LABEL[m.status]}</Pill>,
    },
    ...(isPm ? [{
      header: '',
      render: (m: MemberRecord) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOffboardTarget(m); }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <Icon name="UserMinus" size={13} />
          Bàn giao trước khi nghỉ
        </button>
      ),
    } as Column<MemberRecord>] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <PageHeader title="Danh sách thành viên" subtitle="Toàn bộ nhân viên và tình nguyện viên trong tổ chức." />
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          <Icon name="UserPlus" size={16} />
          Thêm thành viên
        </button>
      </div>

      <div className="mt-4">
        <Select value={kind} onChange={(v) => setKind(v as MemberKind | 'all')} options={KIND_OPTIONS} />
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : (
          <Table columns={columns} rows={items} rowKey={(m) => m.id} emptyIcon="Contact" emptyTitle="Không có thành viên phù hợp" />
        )}
      </div>

      <CreateMemberModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleMemberCreated}
      />

      {offboardTarget && (
        <OffboardMemberModal
          member={offboardTarget}
          onClose={() => setOffboardTarget(null)}
          onCreated={() => navigate('/offboarding')}
        />
      )}
    </div>
  );
}

function OffboardMemberModal({
  member,
  onClose,
  onCreated,
}: {
  member: MemberRecord;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [accessEndsAt, setAccessEndsAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessEndsAt) return;
    setSubmitting(true);
    setError('');
    try {
      await createOffboarding(member.id, accessEndsAt);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo bàn giao');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Bàn giao trước khi nghỉ — {member.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon name="X" size={20} />
          </button>
        </div>
        {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày hết quyền truy cập</label>
            <input
              type="date"
              value={accessEndsAt}
              onChange={(e) => setAccessEndsAt(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <p className="text-xs text-slate-400">
            Hệ thống sẽ tự tạo bàn giao cho từng dự án {member.name} đang tham gia, kèm nội dung do AI tổng hợp
            sẵn. Bạn có thể theo dõi và duyệt tại trang "Kết thúc tham gia".
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Đang tạo...' : 'Bắt đầu bàn giao'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
