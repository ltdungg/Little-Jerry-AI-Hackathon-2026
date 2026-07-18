import { useMemo, useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { SearchInput } from '../components/common/SearchInput';
import { Select } from '../components/common/Select';
import { EmptyState } from '../components/common/EmptyState';
import { useMockList } from '../hooks/useMockList';
import { listDocuments } from '../services/documents.service';
import { listDecisions } from '../services/decisions.service';
import { PROJECTS } from '../lib/mockData';

export function KnowledgeSearchPage() {
  const [query, setQuery] = useState('');
  const [programId, setProgramId] = useState('all');
  const [onlyConfirmed, setOnlyConfirmed] = useState(true);

  const { items: documents } = useMockList(() => listDocuments(), []);
  const { items: decisions } = useMockList(() => listDecisions({ onlyConfirmed: true }), []);

  const results = useMemo(() => {
    const programName = programId === 'all' ? null : PROJECTS.find((p) => p.id === programId)?.name ?? null;

    const docResults = documents
      .filter((d) => (onlyConfirmed ? d.status === 'active' : true))
      .filter((d) => !programName || d.programName === programName)
      .filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
      .map((d) => ({ kind: 'document' as const, id: d.id, title: d.title, subtitle: `${d.teamName}${d.programName ? ' · ' + d.programName : ''}`, updatedAt: d.updatedAt }));

    const decisionResults = decisions
      .filter((d) => !programName || d.programName === programName)
      .filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
      .map((d) => ({ kind: 'decision' as const, id: d.id, title: d.title, subtitle: d.programName, updatedAt: d.decidedAt }));

    return [...docResults, ...decisionResults];
  }, [documents, decisions, query, programId, onlyConfirmed]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Tìm kiếm kiến thức" subtitle="Tìm nâng cao xuyên tài liệu và quyết định của tổ chức." />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Nhập từ khoá..." className="flex-1" />
        <Select
          value={programId}
          onChange={setProgramId}
          options={[{ value: 'all', label: 'Tất cả chương trình' }, ...PROJECTS.map((p) => ({ value: p.id, label: p.name }))]}
        />
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={onlyConfirmed}
          onChange={(e) => setOnlyConfirmed(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
        />
        Chỉ hiển thị thông tin đã được xác nhận
      </label>

      <div className="mt-5 flex flex-col gap-2">
        {results.length === 0 ? (
          <EmptyState icon="SearchX" title="Không tìm thấy kết quả" description="Thử từ khoá khác hoặc bỏ bớt bộ lọc." />
        ) : (
          results.map((r) => (
            <div key={`${r.kind}-${r.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Icon name={r.kind === 'document' ? 'FileText' : 'Gavel'} size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{r.title}</p>
                <p className="truncate text-xs text-slate-400">{r.subtitle}</p>
              </div>
              <Pill tone={r.kind === 'document' ? 'blue' : 'violet'}>{r.kind === 'document' ? 'Tài liệu' : 'Quyết định'}</Pill>
              <span className="shrink-0 text-xs text-slate-400">{r.updatedAt}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
