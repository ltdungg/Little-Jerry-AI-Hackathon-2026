import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { StatusBadge } from '../components/common/StatusBadge';
import { useMockResource } from '../hooks/useMockResource';
import { getProject } from '../services/projects.service';

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
            Quay lại Projects Overview
          </Link>
        </div>
      </div>
    );
  }

  const infoTiles = [
    { label: 'Người phụ trách', value: project.owner, icon: 'User' },
    { label: 'Nhóm', value: project.team, icon: 'Users' },
    { label: 'Mốc tiếp theo', value: project.nextMilestone, icon: 'Calendar' },
    { label: 'Cập nhật gần nhất', value: project.updatedAt, icon: 'RefreshCw' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <Icon name="ArrowLeft" size={15} />
        Projects Overview
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
            {project.program}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{project.name}</h1>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Tiến độ tổng thể</span>
          <span className="text-slate-500">{project.progress}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${project.progress}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {infoTiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <Icon name={tile.icon} size={16} className="text-slate-400" />
            <p className="mt-2 text-xs text-slate-400">{tile.label}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-medium text-rose-600">Nhiệm vụ quá hạn</p>
          <p className="mt-1 text-2xl font-semibold text-rose-700">{project.overdueCount}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-600">Khó khăn mức cao</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{project.highRiskCount}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
        <Icon name="Sparkles" size={20} className="mx-auto text-brand-400" />
        <p className="mt-2 text-sm font-medium text-slate-600">
          Nhiệm vụ, khó khăn, quyết định và tài liệu chi tiết của chương trình sẽ hiển thị tại đây.
        </p>
        <Link
          to="/assistant"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
        >
          Hỏi trợ lý AIV về chương trình này
          <Icon name="ArrowRight" size={14} />
        </Link>
      </div>
    </div>
  );
}
