import { Link } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useMockList } from '../hooks/useMockList';
import { listChatSessions } from '../services/chat.service';

export function ChatHistoryPage() {
  const { items, loading } = useMockList(() => listChatSessions(), []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Lịch sử trao đổi" subtitle="Tra lại các cuộc trao đổi trước đây với trợ lý AIV." />

      <div className="mt-6 flex flex-col gap-2">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : items.length === 0 ? (
          <EmptyState icon="History" title="Chưa có cuộc trao đổi nào" />
        ) : (
          items.map((session) => (
            <Link
              key={session.id}
              to="/assistant"
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
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
