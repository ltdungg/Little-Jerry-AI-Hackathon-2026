import { useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { useMockList } from '../hooks/useMockList';
import { confirmActionItem, listMeetings, rejectActionItem } from '../services/meetings.service';
import { useAuth } from '../context/useAuth';
import type { Meeting, MeetingActionItem } from '../types';

export function MeetingsPage() {
  const { user } = useAuth();
  const { items, setItems, loading } = useMockList(() => listMeetings(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((m) => m.id === selectedId) ?? items[0];

  async function handleConfirmAction(meeting: Meeting, action: MeetingActionItem) {
    setItems((prev) =>
      prev.map((m) =>
        m.id === meeting.id
          ? {
              ...m,
              actionItems: m.actionItems.map((a) =>
                a.id === action.id ? { ...a, status: 'confirmed', owner: action.owner ?? user?.name ?? '' } : a,
              ),
            }
          : m,
      ),
    );
    await confirmActionItem(meeting.id, action.id, action.owner ?? user?.name ?? '');
  }

  async function handleRejectAction(meeting: Meeting, action: MeetingActionItem) {
    setItems((prev) =>
      prev.map((m) =>
        m.id === meeting.id
          ? { ...m, actionItems: m.actionItems.map((a) => (a.id === action.id ? { ...a, status: 'rejected' } : a)) }
          : m,
      ),
    );
    await rejectActionItem(meeting.id, action.id);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Cuộc họp"
        subtitle="Không để lọt việc và quyết định sau mỗi cuộc họp — hệ thống tự tóm tắt và đề xuất việc cần làm."
      />

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">Chưa có cuộc họp nào được ghi nhận.</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-col gap-2">
            {items.map((meeting) => (
              <button
                key={meeting.id}
                type="button"
                onClick={() => setSelectedId(meeting.id)}
                className={`rounded-lg border p-3 text-left transition ${
                  selected?.id === meeting.id ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-200'
                }`}
              >
                <p className="text-sm font-medium text-slate-800">{meeting.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {meeting.date} · {meeting.durationMinutes} phút
                </p>
                <p className="mt-1 text-xs text-slate-400">{meeting.programName}</p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">{selected.title}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {selected.date} · {selected.durationMinutes} phút · {selected.participants.join(', ')}
              </p>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tóm tắt</p>
                <p className="mt-1 text-sm text-slate-600">{selected.summary}</p>
              </div>

              {selected.keyTopics.length > 0 && (
                <BulletSection title="Vấn đề chính đã thảo luận" items={selected.keyTopics} />
              )}
              {selected.proposedDecisions.length > 0 && (
                <BulletSection title="Quyết định được đề xuất" items={selected.proposedDecisions} icon="Gavel" />
              )}

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Việc cần thực hiện</p>
                <div className="mt-2 flex flex-col gap-2">
                  {selected.actionItems.map((action) => (
                    <div key={action.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                      <div>
                        <p className="text-sm text-slate-700">{action.title}</p>
                        <p className="text-xs text-slate-400">
                          {action.owner ?? 'Chưa gán người'} {action.dueDate && `· hạn ${action.dueDate}`}
                        </p>
                      </div>
                      {action.status === 'proposed' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleConfirmAction(selected, action)}
                            className="rounded-md bg-brand-600 p-1.5 text-white hover:bg-brand-700"
                            aria-label="Xác nhận"
                          >
                            <Icon name="Check" size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectAction(selected, action)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                            aria-label="Từ chối"
                          >
                            <Icon name="X" size={13} />
                          </button>
                        </div>
                      ) : (
                        <Pill tone={action.status === 'confirmed' ? 'emerald' : 'rose'}>
                          {action.status === 'confirmed' ? 'Đã xác nhận' : 'Đã từ chối'}
                        </Pill>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selected.openQuestions.length > 0 && (
                <BulletSection title="Câu hỏi chưa được trả lời" items={selected.openQuestions} icon="HelpCircle" />
              )}

              <button
                type="button"
                className="mt-5 flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Icon name="Send" size={14} />
                Gửi nội dung sau cuộc họp cho người tham gia
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BulletSection({ title, items, icon = 'Dot' }: { title: string; items: string[]; icon?: string }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
            <Icon name={icon} size={13} className="mt-0.5 shrink-0 text-brand-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
