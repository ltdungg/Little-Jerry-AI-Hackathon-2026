import { useMemo, useState } from 'react';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill, type PillTone } from '../components/common/Pill';
import { Select } from '../components/common/Select';
import { Table, type Column } from '../components/common/Table';
import { useMockList } from '../hooks/useMockList';
import {
  confirmAiIssue,
  dismissAiIssue,
  issueImpactLabel,
  issueStatusLabel,
  listIssues,
} from '../services/issues.service';
import { useAuth } from '../context/useAuth';
import type { Issue, IssueImpact, IssueStatus } from '../types';

type Tab = 'list' | 'ai_suggested';

const IMPACT_TONE: Record<IssueImpact, PillTone> = {
  low: 'slate',
  medium: 'blue',
  high: 'amber',
  critical: 'rose',
};

const STATUS_OPTIONS: { value: IssueStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'new', label: 'Mới ghi nhận' },
  { value: 'investigating', label: 'Đang tìm hiểu' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'resolved', label: 'Đã giải quyết' },
  { value: 'closed', label: 'Đã đóng' },
];

const IMPACT_OPTIONS: { value: IssueImpact | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả mức ảnh hưởng' },
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'critical', label: 'Nghiêm trọng' },
];

export function IssuesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('list');
  const [status, setStatus] = useState<IssueStatus | 'all'>('all');
  const [impact, setImpact] = useState<IssueImpact | 'all'>('all');
  const { items, setItems, loading } = useMockList(() => listIssues(), []);

  const manualIssues = useMemo(() => {
    let result = items.filter((i) => i.source === 'manual');
    if (status !== 'all') result = result.filter((i) => i.status === status);
    if (impact !== 'all') result = result.filter((i) => i.impact === impact);
    return result;
  }, [items, status, impact]);

  const aiIssues = items.filter((i) => i.source === 'ai_suggested');

  async function handleConfirm(issue: Issue) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === issue.id ? { ...i, source: 'manual', status: 'investigating', ownerName: user?.name ?? null } : i,
      ),
    );
    await confirmAiIssue(issue.id, user?.name ?? '');
  }

  async function handleDismiss(issue: Issue) {
    setItems((prev) => prev.filter((i) => i.id !== issue.id));
    await dismissAiIssue(issue.id);
  }

  const columns: Column<Issue>[] = [
    {
      header: 'Vấn đề',
      render: (issue) => (
        <div>
          <p className="font-medium text-slate-800">{issue.title}</p>
          <p className="text-xs text-slate-400">{issue.programName}</p>
        </div>
      ),
    },
    {
      header: 'Mức ảnh hưởng',
      render: (issue) => <Pill tone={IMPACT_TONE[issue.impact]}>{issueImpactLabel(issue.impact)}</Pill>,
    },
    {
      header: 'Người chịu trách nhiệm',
      render: (issue) => issue.ownerName ?? <span className="text-amber-600">Chưa xác định</span>,
    },
    {
      header: 'Hạn xử lý',
      render: (issue) => issue.dueDate ?? <span className="text-slate-400">—</span>,
    },
    {
      header: 'Trạng thái',
      render: (issue) => <Pill tone="slate">{issueStatusLabel(issue.status)}</Pill>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Khó khăn"
        subtitle="Ghi nhận, theo dõi và giải quyết khó khăn của tổ chức — phát hiện sớm thay vì chờ đến khi quá hạn."
      />

      <div className="mt-5 flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        <TabButton active={tab === 'list'} onClick={() => setTab('list')}>
          Danh sách khó khăn
        </TabButton>
        <TabButton active={tab === 'ai_suggested'} onClick={() => setTab('ai_suggested')}>
          AI đề xuất{aiIssues.length > 0 && ` (${aiIssues.length})`}
        </TabButton>
      </div>

      {tab === 'list' ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Select value={status} onChange={(v) => setStatus(v as IssueStatus | 'all')} options={STATUS_OPTIONS} />
            <Select value={impact} onChange={(v) => setImpact(v as IssueImpact | 'all')} options={IMPACT_OPTIONS} />
          </div>
          <div className="mt-4">
            {loading ? (
              <p className="text-sm text-slate-400">Đang tải...</p>
            ) : (
              <Table columns={columns} rows={manualIssues} rowKey={(i) => i.id} emptyIcon="AlertTriangle" emptyTitle="Không có khó khăn phù hợp" />
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {aiIssues.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              Không có khó khăn nào do AI đề xuất vào lúc này.
            </p>
          ) : (
            aiIssues.map((issue) => (
              <div key={issue.id} className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Pill tone="violet" icon="Sparkles">
                        AI đề xuất
                      </Pill>
                      <Pill tone={IMPACT_TONE[issue.impact]}>{issueImpactLabel(issue.impact)}</Pill>
                    </div>
                    <p className="mt-1.5 font-medium text-slate-800">{issue.title}</p>
                    <p className="text-xs text-slate-400">{issue.programName}</p>
                  </div>
                </div>

                {issue.aiEvidence && (
                  <div className="mt-3 rounded-lg border border-violet-100 bg-white p-3">
                    <p className="text-xs font-medium text-slate-500">Căn cứ phát hiện:</p>
                    <p className="mt-1 text-sm italic text-slate-600">"{issue.aiEvidence.snippet}"</p>
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
                      <Icon name="Hash" size={11} />
                      Nguồn: {issue.aiEvidence.source}
                    </p>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirm(issue)}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                  >
                    <Icon name="Check" size={13} />
                    Xác nhận
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismiss(issue)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Icon name="X" size={13} />
                    Từ chối
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
