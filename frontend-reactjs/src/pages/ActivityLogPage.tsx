import { useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Select } from '../components/common/Select';
import { useMockList } from '../hooks/useMockList';
import { activityActionIcon, activityActionLabel, listActivityLog } from '../services/activityLog.service';
import type { ActivityAction } from '../types';

const ACTION_OPTIONS: { value: ActivityAction | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả hành động' },
  { value: 'viewed', label: 'Đã xem' },
  { value: 'edited', label: 'Đã chỉnh sửa' },
  { value: 'approved', label: 'Đã phê duyệt' },
  { value: 'rejected', label: 'Đã từ chối' },
  { value: 'exported', label: 'Đã xuất dữ liệu' },
  { value: 'shared', label: 'Đã chia sẻ' },
  { value: 'permission_changed', label: 'Đã đổi quyền' },
  { value: 'ai_generated', label: 'AI đã tạo nội dung' },
  { value: 'account_locked', label: 'Tài khoản bị khoá' },
];

export function ActivityLogPage() {
  const [action, setAction] = useState<ActivityAction | 'all'>('all');
  const { items, loading } = useMockList(() => listActivityLog({ action }), [action]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Nhật ký hoạt động"
        subtitle="Ai đã xem/sửa/duyệt gì, và trợ lý AI đã dùng nguồn nào để trả lời — phục vụ minh bạch & kiểm toán."
      />

      <div className="mt-4">
        <Select value={action} onChange={(v) => setAction(v as ActivityAction | 'all')} options={ACTION_OPTIONS} />
      </div>

      <div className="mt-4 flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-slate-400">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">Không có hoạt động phù hợp.</p>
        ) : (
          items.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Icon name={activityActionIcon(entry.action)} size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">
                  <span className="font-medium">{entry.actorName}</span> · {activityActionLabel(entry.action)}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">{entry.target}</p>
                {entry.aiSourceUsed && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-violet-600">
                    <Icon name="Sparkles" size={11} />
                    Nguồn AI đã dùng: {entry.aiSourceUsed}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-slate-400">{entry.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
