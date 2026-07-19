import { useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { queryKnowledgeBase } from '../lib/api';

interface KBDocument {
  content: string;
  source: string;
  score: number;
}

export function KnowledgeSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KBDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await queryKnowledgeBase(query.trim());
      setResults(res.documents || []);
    } catch (e: any) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Tìm kiếm tri thức"
        subtitle="Tìm kiếm tài liệu, quy trình, chính sách từ Knowledge Base của tổ chức."
      />

      {/* Search bar */}
      <div className="mt-6 flex gap-3">
        <div className="relative flex-1">
          <Icon
            name="Search"
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            type="text"
            placeholder="VD: Quy trình an toàn khảo sát, Chính sách bảo mật..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? (
            <Icon name="Loader2" size={16} className="animate-spin" />
          ) : (
            <Icon name="Search" size={16} />
          )}
          Tìm kiếm
        </button>
      </div>

      {/* Results */}
      <div className="mt-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Icon name="Loader2" size={24} className="animate-spin text-brand-500" />
            <span className="ml-2 text-sm text-slate-500">Đang tìm kiếm...</span>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon name="SearchX" size={32} className="text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600">Không tìm thấy tài liệu phù hợp</p>
            <p className="mt-1 text-xs text-slate-400">Thử từ khóa khác hoặc kiểm tra lại chính tả.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Tìm thấy <span className="font-medium text-slate-700">{results.length}</span> tài liệu liên quan
            </p>
            {results.map((doc, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon name="FileText" size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        Tài liệu #{i + 1}
                      </p>
                      <p className="text-xs text-slate-400 truncate max-w-md">{doc.source || 'Không rõ nguồn'}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600">
                    {Math.round(doc.score * 100)}% liên quan
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {doc.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {!loading && !searched && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icon name="BookOpen" size={40} className="text-slate-200" />
            <p className="mt-4 text-sm font-medium text-slate-500">Nhập từ khóa để tìm kiếm tri thức tổ chức</p>
            <p className="mt-1 text-xs text-slate-400">
              VD: quy trình, chính sách, hướng dẫn, tài liệu nội bộ...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
