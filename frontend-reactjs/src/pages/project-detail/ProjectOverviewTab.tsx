import { Link, useOutletContext } from 'react-router-dom';
import { Icon } from '../../components/common/Icon';
import type { ProjectDetailContext } from '../ProjectDetailPage';

const NAV_BLOCKS = [
  { to: 'tasks', label: 'Nhiệm vụ', icon: 'CheckSquare', desc: 'Danh sách công việc và người phụ trách' },
  { to: 'issues', label: 'Khó khăn', icon: 'AlertTriangle', desc: 'Rủi ro và vướng mắc đang gặp phải' },
  { to: 'daily-updates', label: 'Cập nhật hằng ngày', icon: 'CalendarClock', desc: 'Tiến độ task theo từng ngày' },
  { to: 'decisions', label: 'Quyết định', icon: 'Gavel', desc: 'Lý do, phương án và người phê duyệt' },
  { to: 'handoff', label: 'Bàn giao', icon: 'ArrowLeftRight', desc: 'Nội dung bàn giao đang xử lý' },
  { to: 'meetings', label: 'Cuộc họp', icon: 'CalendarDays', desc: 'Tóm tắt và việc cần thực hiện sau họp' },
] as const;

export function ProjectOverviewTab() {
  const { project } = useOutletContext<ProjectDetailContext>();

  const infoTiles = [
    { label: 'Người phụ trách', value: project.owner, icon: 'User' },
    { label: 'Nhóm', value: project.team, icon: 'Users' },
    { label: 'Mốc tiếp theo', value: project.nextMilestone, icon: 'Calendar' },
    { label: 'Cập nhật gần nhất', value: project.updatedAt, icon: 'RefreshCw' },
  ];

  return (
    <div className="max-w-4xl">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
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

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NAV_BLOCKS.map((block) => (
          <Link
            key={block.to}
            to={block.to}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Icon name={block.icon} size={16} className="text-brand-500" />
              <span className="text-sm font-semibold text-slate-800">{block.label}</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">{block.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
        <Icon name="Sparkles" size={20} className="mx-auto text-brand-400" />
        <Link
          to="/assistant"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
        >
          Hỏi trợ lý AIV về dự án này
          <Icon name="ArrowRight" size={14} />
        </Link>
      </div>
    </div>
  );
}
