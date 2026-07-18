import { useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { OrgChart } from '../components/common/OrgChart';
import { Pill } from '../components/common/Pill';
import { Select } from '../components/common/Select';
import { Table, type Column } from '../components/common/Table';
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
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const { items, loading } = useMockList(() => listMembers({ kind }), [kind]);

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
      <PageHeader title="Danh sách thành viên" subtitle="Toàn bộ nhân viên và tình nguyện viên trong tổ chức." />

      <div className="mt-4 flex items-center justify-between">
        <Select value={kind} onChange={(v) => setKind(v as MemberKind | 'all')} options={KIND_OPTIONS} />
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Icon name="List" size={14} />
            Dạng bảng
          </button>
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'chart' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Icon name="Network" size={14} />
            Sơ đồ tổ chức
          </button>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : viewMode === 'table' ? (
          <Table columns={columns} rows={items} rowKey={(m) => m.id} emptyIcon="Contact" emptyTitle="Không có thành viên phù hợp" />
        ) : (
          <OrgChart members={items} />
        )}
      </div>
    </div>
  );
}
