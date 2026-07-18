import { useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill, type PillTone } from '../components/common/Pill';
import { SearchInput } from '../components/common/SearchInput';
import { Select } from '../components/common/Select';
import { Table, type Column } from '../components/common/Table';
import { useMockList } from '../hooks/useMockList';
import {
  documentKindLabel,
  documentStatusLabel,
  listDocuments,
  markDocumentOutdated,
} from '../services/documents.service';
import type { DocumentStatus, KnowledgeDocument, SourceType } from '../types';

const STATUS_TONE: Record<DocumentStatus, PillTone> = {
  active: 'emerald',
  draft: 'slate',
  maybe_outdated: 'amber',
  archived: 'slate',
  replaced: 'rose',
};

const STATUS_OPTIONS: { value: DocumentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang sử dụng' },
  { value: 'draft', label: 'Bản nháp' },
  { value: 'maybe_outdated', label: 'Có thể đã cũ' },
  { value: 'archived', label: 'Đã lưu trữ' },
  { value: 'replaced', label: 'Đã được thay thế' },
];

const SOURCE_ICON: Record<SourceType, string> = {
  SharePoint: 'Cloud',
  Slack: 'Hash',
  Meeting: 'Video',
  Docs: 'FileText',
};

export function DocumentsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<DocumentStatus | 'all'>('all');
  const { items, setItems, loading } = useMockList(() => listDocuments({ status }), [status]);

  const filtered = items.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()));
  const flaggedCount = items.filter((d) => d.aiFlag).length;

  async function handleMarkOutdated(doc: KnowledgeDocument) {
    setItems((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: 'maybe_outdated' } : d)));
    await markDocumentOutdated(doc.id);
  }

  const columns: Column<KnowledgeDocument>[] = [
    {
      header: 'Tài liệu',
      render: (doc) => (
        <div>
          <div className="flex items-center gap-1.5">
            <Icon name={SOURCE_ICON[doc.source]} size={13} className="text-slate-400" />
            <p className="font-medium text-slate-800">{doc.title}</p>
          </div>
          <p className="text-xs text-slate-400">
            {doc.teamName}
            {doc.programName && ` · ${doc.programName}`}
          </p>
          {doc.aiFlag && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-violet-600">
              <Icon name="Sparkles" size={11} />
              AI phát hiện: {doc.aiFlag === 'duplicate' ? 'trùng lặp' : doc.aiFlag === 'conflicting' ? 'nội dung mâu thuẫn' : 'lâu không cập nhật'}
            </p>
          )}
        </div>
      ),
    },
    { header: 'Loại', render: (doc) => <Pill tone="slate">{documentKindLabel(doc.kind)}</Pill> },
    { header: 'Người sở hữu', render: (doc) => doc.owner },
    { header: 'Phiên bản', render: (doc) => doc.version },
    { header: 'Cập nhật', render: (doc) => doc.updatedAt },
    {
      header: 'Trạng thái',
      render: (doc) => <Pill tone={STATUS_TONE[doc.status]}>{documentStatusLabel(doc.status)}</Pill>,
    },
    {
      header: '',
      render: (doc) =>
        doc.status === 'active' && (
          <button
            type="button"
            onClick={() => handleMarkOutdated(doc)}
            className="text-xs font-medium text-slate-400 hover:text-amber-600"
          >
            Đánh dấu lỗi thời
          </button>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Thư viện tài liệu"
        subtitle={
          flaggedCount > 0
            ? `AI phát hiện ${flaggedCount} tài liệu cần rà soát (trùng lặp / mâu thuẫn / lâu không cập nhật).`
            : 'Toàn bộ tài liệu của tổ chức — nền tảng để trợ lý AI trả lời có nguồn.'
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Tìm tài liệu..." className="flex-1" />
        <Select value={status} onChange={(v) => setStatus(v as DocumentStatus | 'all')} options={STATUS_OPTIONS} />
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : (
          <Table columns={columns} rows={filtered} rowKey={(d) => d.id} emptyIcon="Library" emptyTitle="Không có tài liệu phù hợp" />
        )}
      </div>
    </div>
  );
}
