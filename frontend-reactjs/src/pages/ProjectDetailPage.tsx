import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { StatusBadge } from '../components/common/StatusBadge';
import { useMockResource } from '../hooks/useMockResource';
import { getProject } from '../services/projects.service';
import type { Project } from '../types';

export interface ProjectDetailContext {
  project: Project;
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const isOverview = location.pathname === `/projects/${id}`;
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
            Quay lại Dự án
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
        Dự án
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{project.program}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{project.name}</h1>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {!isOverview && (
        <Link
          to=""
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <Icon name="ArrowLeft" size={14} />
          Tổng quan
        </Link>
      )}

      <div className="mt-5">
        <Outlet context={{ project } satisfies ProjectDetailContext} />
      </div>
    </div>
  );
}
