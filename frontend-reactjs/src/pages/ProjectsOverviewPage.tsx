import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { CreateProjectModal } from '../components/common/CreateProjectModal';
import { useMockList } from '../hooks/useMockList';
import { listProjects } from '../services/projects.service';
import type { Project, ProjectStatus } from '../types';

const PROGRAM_ICON: Record<string, string> = {
  'Global Health Initiative': 'Droplet',
  'Education Programs': 'BookOpen',
  'Digital Infrastructure': 'Wifi',
  'Youth Development': 'Sparkle',
  'Economic Empowerment': 'Landmark',
  'Emergency Response': 'Siren',
};

const STATUS_FILTERS: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'healthy', label: 'Đúng tiến độ' },
  { value: 'at_risk', label: 'Có nguy cơ' },
  { value: 'overdue', label: 'Quá hạn' },
];

export function ProjectsOverviewPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { items: projects, loading, refresh } = useMockList(() => listProjects(), []);

  const handleProjectCreated = useCallback(() => {
    refresh();
  }, [refresh]);

  const programs = useMemo(
    () => Array.from(new Set(projects.map((p) => p.program))),
    [projects],
  );

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (programFilter !== 'all' && p.program !== programFilter) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [projects, query, statusFilter, programFilter]);

  const stats = useMemo(
    () => ({
      total: projects.length,
      healthy: projects.filter((p) => p.status === 'healthy').length,
      atRisk: projects.filter((p) => p.status === 'at_risk').length,
      overdue: projects.filter((p) => p.status === 'overdue').length,
    }),
    [projects],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects Overview</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Monitor the health and progress of all active initiatives. Ensure "Safe Progress"
            across your organization&apos;s commitments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          <Icon name="Plus" size={16} />
          New Project
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Projects" value={stats.total} icon="FolderOpen" />
        <StatCard label="Healthy" value={stats.healthy} icon="CheckCircle2" tone="emerald" />
        <StatCard label="At Risk" value={stats.atRisk} icon="AlertTriangle" tone="amber" />
        <StatCard label="Overdue" value={stats.overdue} icon="AlertCircle" tone="rose" />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon
            name="Search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Filter projects..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          <option value="all">Tất cả chương trình</option>
          {programs.map((program) => (
            <option key={program} value={program}>
              {program}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={`rounded-md p-1.5 ${view === 'grid' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
            aria-label="Grid view"
          >
            <Icon name="LayoutGrid" size={16} />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`rounded-md p-1.5 ${view === 'list' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
            aria-label="List view"
          >
            <Icon name="List" size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-sm text-slate-400">Đang tải...</p>
      ) : filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <Icon name="SearchX" size={32} className="text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">Không tìm thấy dự án phù hợp</p>
          <p className="mt-1 text-xs text-slate-400">Thử điều chỉnh bộ lọc hoặc từ khoá tìm kiếm.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Next milestone</th>
                <th className="px-4 py-3 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/projects/${project.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                      {project.name}
                    </Link>
                    <p className="text-xs text-slate-400">{project.program}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{project.owner}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{project.nextMilestone}</td>
                  <td className="px-4 py-3 text-slate-600">{project.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon name={PROGRAM_ICON[project.program] ?? 'FolderOpen'} size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{project.name}</p>
            <p className="text-xs text-slate-400">{project.program}</p>
          </div>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
          {project.ownerInitials}
        </div>
        <span className="text-xs text-slate-500">{project.owner}</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${project.progress}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Next Milestone</p>
          <p className="mt-0.5 text-xs font-medium text-slate-700">{project.nextMilestone}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Overdue</p>
          <p
            className={`mt-0.5 text-xs font-medium ${project.overdueCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}
          >
            {project.overdueCount}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">High Risk</p>
          <p
            className={`mt-0.5 text-xs font-medium ${project.highRiskCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}
          >
            {project.highRiskCount}
          </p>
        </div>
      </div>
    </Link>
  );
}
