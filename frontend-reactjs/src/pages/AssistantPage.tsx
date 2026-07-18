import { useId, useRef, useState } from 'react';
import { Icon } from '../components/common/Icon';
import { Pill } from '../components/common/Pill';
import { EmptyState } from '../components/common/EmptyState';
import { useMockList } from '../hooks/useMockList';
import { sendChatMessage, listChatSessions, listSavedAnswers, removeSavedAnswer } from '../services/chat.service';
import type { ChatMessage, SourceType, SavedAnswer } from '../types';
import ReactMarkdown from 'react-markdown';

const SOURCE_ICON: Record<SourceType, string> = {
  SharePoint: 'Cloud',
  Slack: 'Hash',
  Meeting: 'Video',
  Docs: 'FileText',
};

const STARTER_PROMPTS = [
  'What are the latest risks identified in this project?',
  'Tóm tắt tiến độ chương trình trong tuần này.',
  'Ai đang chịu trách nhiệm chương trình này?',
];

export function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const inputId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const nextMessageId = useRef(1);
  const sessionId = useRef(crypto.randomUUID());

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const activeCitations = lastAssistantMessage?.citations ?? [];

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  }

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isThinking) return;

    const userMessage: ChatMessage = {
      id: `u-${nextMessageId.current++}`,
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setDraft('');
    setIsThinking(true);
    scrollToBottom();

    try {
      const answer = await sendChatMessage(trimmed, undefined, sessionId.current);
      const assistantMessage: ChatMessage = {
        id: `a-${nextMessageId.current++}`,
        role: 'assistant',
        content:
          answer.content ||
          'Hệ thống chưa có đủ dữ liệu đã xác nhận để trả lời chính xác câu hỏi này. Bạn có thể thử diễn đạt lại, hoặc gửi yêu cầu tới người phụ trách chương trình liên quan.',
        synthesizedFrom: answer.citations.length > 0 ? answer.citations.length : undefined,
        sources: answer.sources,
        citations: answer.citations,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${nextMessageId.current++}`,
          role: 'assistant',
          content: 'Không kết nối được tới trợ lý AI. Vui lòng thử lại sau.',
          citations: [],
        },
      ]);
    } finally {
      setIsThinking(false);
      scrollToBottom();
    }
  }

  return (
    <div className="flex h-full min-h-0 bg-slate-50/50 relative">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-600 transition"
              title="Lịch sử trao đổi"
            >
              <Icon name="History" size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowSaved(true)}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-600 transition"
              title="Câu trả lời đã lưu"
            >
              <Icon name="Bookmark" size={16} />
            </button>
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {messages.length === 0 && !isThinking && (
              <div className="mt-6 flex flex-col items-center gap-4 text-center">
                <p className="text-sm text-slate-400">
                  Đặt câu hỏi cho trợ lý AIV để nhận câu trả lời có dẫn nguồn từ tài liệu tổ chức.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {STARTER_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendQuestion(q)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isThinking && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Icon name="Loader2" size={15} className="animate-spin text-brand-400" />
                Đang tổng hợp câu trả lời...
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendQuestion(draft);
              }}
              className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100"
            >
              <label htmlFor={inputId} className="sr-only">
                Đặt câu hỏi cho AIV
              </label>
              <textarea
                id={inputId}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendQuestion(draft);
                  }
                }}
                rows={1}
                placeholder="Ask about risks, updates, or summarize documents..."
                className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim() || isThinking}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
                aria-label="Gửi câu hỏi"
              >
                <Icon name="SendHorizontal" size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 flex-col border-l border-slate-200 bg-white xl:flex">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Icon name="Pin" size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Citations</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {activeCitations.length === 0 ? (
            <p className="p-3 text-xs text-slate-400">
              Chưa có nguồn tham khảo cho câu trả lời hiện tại.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeCitations.map((citation, index) => (
                <div key={citation.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-brand-600">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-100 text-[10px] text-brand-700">
                      {index + 1}
                    </span>
                    <span className="truncate">{citation.title}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{citation.snippet}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <Icon name={SOURCE_ICON[citation.source]} size={12} />
                      {citation.source}
                    </span>
                    <span className="text-[11px] text-slate-300">{citation.updatedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {showHistory && (
        <Modal title="Lịch sử trao đổi" onClose={() => setShowHistory(false)}>
          <ChatHistorySection />
        </Modal>
      )}

      {showSaved && (
        <Modal title="Câu trả lời đã lưu" onClose={() => setShowSaved(false)}>
          <SavedAnswersSection />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-slate-50 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button 
            type="button" 
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}



function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
        {message.synthesizedFrom !== undefined && (
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-brand-600">
            <Icon name="Sparkles" size={13} />
            Synthesized from {message.synthesizedFrom} sources
          </div>
        )}
        <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed text-slate-700 prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
            <span className="text-[11px] text-slate-400">Sources:</span>
            {message.sources.map((source) => (
              <span
                key={source}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                <Icon name={SOURCE_ICON[source]} size={11} />
                {source}
              </span>
            ))}
          </div>
        )}

        {message.citations && message.citations.length === 0 && message.synthesizedFrom === undefined && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
            <Icon name="Info" size={12} />
            Không có đủ dữ liệu đã xác nhận
          </div>
        )}
      </div>
    </div>
  );
}

function ChatHistorySection() {
  const { items, loading } = useMockList(() => listChatSessions(), []);

  return (
    <div>
      <div className="mt-6 flex flex-col gap-2">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : items.length === 0 ? (
          <EmptyState icon="History" title="Chưa có cuộc trao đổi nào" />
        ) : (
          items.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name="MessageCircle" size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{session.title}</p>
                  <p className="text-xs text-slate-400">{session.messageCount} tin nhắn</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">{session.lastMessageAt}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SavedAnswersSection() {
  const { items, setItems, loading } = useMockList(() => listSavedAnswers(), []);

  async function handleRemove(answer: SavedAnswer) {
    setItems((prev) => prev.filter((a) => a.id !== answer.id));
    await removeSavedAnswer(answer.id);
  }

  return (
    <div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : items.length === 0 ? (
          <div className="col-span-full">
            <EmptyState icon="Bookmark" title="Chưa lưu câu trả lời nào" />
          </div>
        ) : (
          items.map((answer) => (
            <div key={answer.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-800">{answer.question}</p>
              <p className="mt-1.5 text-sm text-slate-600">{answer.answer}</p>
              {answer.citations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {answer.citations.map((c) => (
                    <Pill key={c.id} tone="slate" icon={SOURCE_ICON[c.source]}>
                      {c.title}
                    </Pill>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                <span>
                  Lưu bởi {answer.savedBy} · {answer.savedAt}
                </span>
                <div className="flex items-center gap-3">
                  <button type="button" className="flex items-center gap-1 font-medium text-slate-500 hover:text-brand-600">
                    <Icon name="Share2" size={12} />
                    Chia sẻ
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
