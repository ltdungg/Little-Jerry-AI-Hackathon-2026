import { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { SearchInput } from '../components/common/SearchInput';
import { Table, type Column } from '../components/common/Table';
import { useMockList } from '../hooks/useMockList';
import { listDecisions } from '../services/decisions.service';
import type { Decision } from '../types';

export function DecisionArchivePage() {
  const [query, setQuery] = useState('');
  const { items, loading } = useMockList(() => listDecisions({ onlyConfirmed: true }), []);

  const filtered = items.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()));

  const columns: Column<Decision>[] = [
    {
      header: 'Quyết định',
      render: (d) => (
        <div>
          <p className="font-medium text-slate-800">{d.title}</p>
          <p className="text-xs text-slate-400">{d.programName}</p>
        </div>
      ),
    },
    { header: 'Ngày quyết định', render: (d) => d.decidedAt },
    { header: 'Người phê duyệt', render: (d) => d.approverName ?? '—' },
    {
      header: 'Hiệu lực',
      render: (d) => (
        <Pill tone={d.effectiveStatus === 'active' ? 'emerald' : 'slate'}>
          {d.effectiveStatus === 'active' ? 'Còn hiệu lực' : 'Đã thay thế'}
        </Pill>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Kho quyết định" subtitle="Tra cứu nhanh các quyết định đã chính thức của tổ chức." />

      <div className="mt-6">
        <SearchInput value={query} onChange={setQuery} placeholder="Tìm quyết định..." className="max-w-sm" />
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : (
          <Table columns={columns} rows={filtered} rowKey={(d) => d.id} emptyIcon="Archive" emptyTitle="Không có quyết định phù hợp" />
        )}
      </div>
    </div>
  );
}
