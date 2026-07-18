import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pill } from '../components/common/Pill';
import { useMockList } from '../hooks/useMockList';
import { listTeams } from '../services/teams.service';

export function TeamsPage() {
  const { items: teams, loading } = useMockList(() => listTeams(), []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Các nhóm" subtitle="Mục tiêu, thành viên và chương trình phụ trách của từng nhóm." />

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Đang tải...</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{team.name}</p>
                <Pill tone={team.status === 'active' ? 'emerald' : 'amber'}>
                  {team.status === 'active' ? 'Hoạt động tốt' : 'Cần hỗ trợ'}
                </Pill>
              </div>
              <p className="mt-1.5 text-sm text-slate-500">{team.mission}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {team.programNames.map((p) => (
                  <Pill key={p} tone="blue">
                    {p}
                  </Pill>
                ))}
              </div>

              <div className="mt-3 flex -space-x-2">
                {team.members.map((m) => (
                  <div
                    key={m.id}
                    title={`${m.name} — ${m.roleLabel}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white"
                  >
                    {m.initials}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-400">
                <Icon name="RefreshCw" size={12} />
                Báo cáo gần nhất: {team.lastReportAt}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
