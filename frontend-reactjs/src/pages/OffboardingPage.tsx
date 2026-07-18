import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { useMockList } from '../hooks/useMockList';
import { confirmHandoffComplete, listOffboardingRecords } from '../services/handoff.service';
import type { OffboardingRecord } from '../types';

export function OffboardingPage() {
  const { items, setItems, loading } = useMockList(() => listOffboardingRecords(), []);

  async function handleConfirm(record: OffboardingRecord) {
    setItems((prev) => prev.map((r) => (r.id === record.id ? { ...r, handoffComplete: true } : r)));
    await confirmHandoffComplete(record.id);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Kết thúc tham gia" subtitle="Quản lý người sắp kết thúc thời gian tham gia và thu hồi quyền truy cập đúng hạn." />

      <div className="mt-6 flex flex-col gap-3">
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : (
          items.map((record) => (
            <div key={record.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {record.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{record.name}</p>
                    <p className="text-xs text-slate-400">{record.teamName}</p>
                  </div>
                </div>
                <Pill tone={record.handoffComplete ? 'emerald' : 'amber'}>
                  {record.handoffComplete ? 'Đã bàn giao xong' : 'Chưa hoàn tất bàn giao'}
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
                <Field label="Ngày hết quyền truy cập" value={record.accessEndsAt} />
                <Field label="Quyền cần thu hồi" value={record.accessToRevoke.join(', ') || 'Không có'} />
                <Field label="Tài liệu đang quản lý" value={record.ownedDocuments.join(', ') || 'Không có'} />
              </div>

              {!record.handoffComplete && (
                <button
                  type="button"
                  onClick={() => handleConfirm(record)}
                  className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Icon name="CheckCircle2" size={13} />
                  Xác nhận hoàn thành bàn giao
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-700">{value}</p>
    </div>
  );
}
