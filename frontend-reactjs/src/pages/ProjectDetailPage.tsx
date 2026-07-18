import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Icon } from '../components/common/Icon';
import { StatusBadge } from '../components/common/StatusBadge';
import { useMockResource } from '../hooks/useMockResource';
import { getProject } from '../services/projects.service';
import type { Project } from '../types';

const TABS = [
  { to: '', label: 'Tổng quan', icon: 'LayoutDashboard', end: true },
  { to: 'tasks', label: 'Nhiệm vụ', icon: 'CheckSquare', end: false },
  { to: 'issues', label: 'Khó khăn', icon: 'AlertTriangle', end: false },
  { to: 'daily-updates', label: 'Cập nhật hằng ngày', icon: 'CalendarClock', end: false },
  { to: 'reports', label: 'Xuất báo cáo', icon: 'FileText', end: false },
  { to: 'handoff', label: 'Bàn giao', icon: 'ArrowLeftRight', end: false },
  { to: 'meetings', label: 'Cuộc họp', icon: 'CalendarDays', end: false },
] as const;

export interface ProjectDetailContext {
  project: Project;
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const { data: project, loading } = useMockResource(() => getProject(id ?? ''), [id]);

  if (loading) {
    return <p className="p-10 text-center text-sm text-slate-400">Đang tải...</p>;
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center">
        <div>
          <p className="text-lg font-semibold text-slate-900">Không tìm thấy dự án</p>
          <Link to="/projects" className="mt-2 inline-block text-sm text-brand-600 hover:underline">
            Quay lại Công việc
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <Icon name="ArrowLeft" size={15} />
        Công việc
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{project.program}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{project.name}</h1>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="mt-5 flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              clsx(
                'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
                isActive ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )
            }
          >
            <Icon name={tab.icon} size={14} />
            {tab.label}
          </NavLink>
        ))}
      </div>

      <div className="mt-5">
        <Outlet context={{ project } satisfies ProjectDetailContext} />
      </div>
    </div>
  );
}
