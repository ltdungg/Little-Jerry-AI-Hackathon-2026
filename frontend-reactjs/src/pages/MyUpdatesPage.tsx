import { useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { useAuth } from '../context/useAuth';
import { useMockResource } from '../hooks/useMockResource';
import {
  getMyCurrentUpdate,
  listMyUpdates,
  saveUpdateDraft,
  submitUpdate,
} from '../services/updates.service';
import type { WeeklyUpdate } from '../types';

export function MyUpdatesPage() {
  const { user } = useAuth();
  const { data: current, loading } = useMockResource(() => getMyCurrentUpdate(user!.id), [user?.id]);
  const { data: history } = useMockResource(() => listMyUpdates(user!.id), [user?.id]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Cập nhật của tôi"
        subtitle="Bản nháp báo cáo tuần được hệ thống tự tổng hợp — bổ sung nội dung rồi gửi cho trưởng nhóm."
      />

      {loading || !current ? (
        <p className="mt-6 text-sm text-slate-400">Đang tải...</p>
      ) : (
        <UpdateForm key={current.id} initial={current} />
      )}

      {history && history.filter((u) => u.status === 'submitted').length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700">Các tuần trước</h2>
          <div className="mt-2 flex flex-col gap-2">
            {history
              .filter((u) => u.status === 'submitted')
              .map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm"
                >
                  <span className="text-slate-700">{u.week}</span>
                  <span className="text-xs text-slate-400">Đã gửi {u.submittedAt}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UpdateForm({ initial }: { initial: WeeklyUpdate }) {
  const [update, setUpdate] = useState(initial);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'submitting' | 'submitted'>('idle');

  async function handleSaveDraft() {
    setSaving('saving');
    await saveUpdateDraft(update);
    setSaving('saved');
  }

  async function handleSubmit() {
    setSaving('submitting');
    await saveUpdateDraft(update);
    await submitUpdate(update.id);
    setUpdate((u) => ({ ...u, status: 'submitted' }));
    setSaving('submitted');
  }

  if (update.status === 'submitted') {
    return (
      <div className="mt-6 flex flex-col items-center rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <Icon name="CheckCircle2" size={28} className="text-emerald-600" />
        <p className="mt-2 text-sm font-medium text-emerald-800">
          Đã gửi cập nhật {update.week} cho trưởng nhóm.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{update.week}</p>
        <Pill tone="slate" icon="Sparkles">
          Bản nháp tự động
        </Pill>
      </div>

      <Field label="Đã hoàn thành">
        <MultilineInput
          value={update.doneItems.join('\n')}
          onChange={(v) => setUpdate((u) => ({ ...u, doneItems: v.split('\n').filter(Boolean) }))}
          placeholder="Mỗi dòng một việc đã hoàn thành"
        />
      </Field>

      <Field label="Đang thực hiện">
        <MultilineInput
          value={update.inProgressItems.join('\n')}
          onChange={(v) => setUpdate((u) => ({ ...u, inProgressItems: v.split('\n').filter(Boolean) }))}
          placeholder="Mỗi dòng một việc đang làm"
        />
      </Field>

      <Field label="Khó khăn">
        <MultilineInput
          value={update.issues}
          onChange={(v) => setUpdate((u) => ({ ...u, issues: v }))}
          rows={2}
          placeholder="Có khó khăn nào cần báo cáo không?"
        />
      </Field>

      <Field label="Bước tiếp theo">
        <MultilineInput
          value={update.nextSteps}
          onChange={(v) => setUpdate((u) => ({ ...u, nextSteps: v }))}
          rows={2}
        />
      </Field>

      <Field label="Nhu cầu hỗ trợ">
        <MultilineInput
          value={update.supportNeeded}
          onChange={(v) => setUpdate((u) => ({ ...u, supportNeeded: v }))}
          rows={2}
          placeholder="Bạn cần hỗ trợ gì từ trưởng nhóm hoặc điều phối?"
        />
      </Field>

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        {saving === 'saved' && <span className="text-xs text-slate-400">Đã lưu nháp</span>}
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving === 'saving' || saving === 'submitting'}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Lưu nháp
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving === 'saving' || saving === 'submitting'}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving === 'submitting' && <Icon name="Loader2" size={14} className="animate-spin" />}
          Gửi cho trưởng nhóm
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function MultilineInput({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
    />
  );
}
