import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { Pill } from '../components/common/Pill';
import { useMockList } from '../hooks/useMockList';
import { listSavedAnswers, removeSavedAnswer } from '../services/chat.service';
import type { SavedAnswer, SourceType } from '../types';

const SOURCE_ICON: Record<SourceType, string> = {
  SharePoint: 'Cloud',
  Slack: 'Hash',
  Meeting: 'Video',
  Docs: 'FileText',
};

export function SavedAnswersPage() {
  const { items, setItems, loading } = useMockList(() => listSavedAnswers(), []);

  async function handleRemove(answer: SavedAnswer) {
    setItems((prev) => prev.filter((a) => a.id !== answer.id));
    await removeSavedAnswer(answer.id);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Câu trả lời đã lưu" subtitle="Tri thức quan trọng đã lưu lại từ trợ lý AIV để dùng lại hoặc chia sẻ nhóm." />

      <div className="mt-6 flex flex-col gap-3">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : items.length === 0 ? (
          <EmptyState icon="Bookmark" title="Chưa lưu câu trả lời nào" />
        ) : (
          items.map((answer) => (
            <div key={answer.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-800">{answer.question}</p>
              <p className="mt-1.5 text-sm text-slate-600">{answer.answer}</p>
              {answer.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {answer.citations.map((c) => (
                    <Pill key={c.id} tone="slate" icon={SOURCE_ICON[c.source]}>
                      {c.title}
                    </Pill>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-400">
                <span>
                  Lưu bởi {answer.savedBy} · {answer.savedAt}
                </span>
                <div className="flex items-center gap-3">
                  <button type="button" className="flex items-center gap-1 font-medium text-slate-500 hover:text-brand-600">
                    <Icon name="Share2" size={12} />
                    Chia sẻ với nhóm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(answer)}
                    className="flex items-center gap-1 font-medium text-slate-400 hover:text-rose-600"
                  >
                    <Icon name="Trash2" size={12} />
                    Xoá
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
