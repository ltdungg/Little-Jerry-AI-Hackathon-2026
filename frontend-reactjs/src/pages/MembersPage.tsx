import { useState, useCallback } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { Select } from '../components/common/Select';
import { Table, type Column } from '../components/common/Table';
import { Icon } from '../components/common/Icon';
import { CreateMemberModal } from '../components/common/CreateMemberModal';
import { useMockList } from '../hooks/useMockList';
import { listMembers } from '../services/people.service';
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
  const [kind, setKind] = useState<MemberKind | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
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
    </div>
  );
}
