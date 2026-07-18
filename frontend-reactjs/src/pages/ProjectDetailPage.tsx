import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Icon } from '../components/common/Icon';
import { StatusBadge } from '../components/common/StatusBadge';
import { useMockResource } from '../hooks/useMockResource';
import { getProject } from '../services/projects.service';
import { OverviewSection } from './project-detail/OverviewSection';
import { TasksSection } from './project-detail/TasksSection';
import { IssuesSection } from './project-detail/IssuesSection';
import { DailyUpdatesSection } from './project-detail/DailyUpdatesSection';
import { MeetingsSection } from './project-detail/MeetingsSection';
import { HandoffSection } from './project-detail/HandoffSection';
import { ReportsSection } from './project-detail/ReportsSection';

interface SectionDef {
  id: string;
  label: string;
  icon: string;
}

const SECTIONS: SectionDef[] = [
  { id: 'overview', label: 'Tổng quan', icon: 'LayoutDashboard' },
  { id: 'tasks', label: 'Nhiệm vụ', icon: 'CheckSquare' },
  { id: 'issues', label: 'Khó khăn', icon: 'AlertTriangle' },
  { id: 'daily-updates', label: 'Cập nhật hằng ngày', icon: 'CalendarClock' },
  { id: 'meetings', label: 'Cuộc họp', icon: 'CalendarDays' },
  { id: 'handoff', label: 'Bàn giao', icon: 'ArrowLeftRight' },
  { id: 'reports', label: 'Báo cáo tuần', icon: 'FileText' },
];

export function ProjectDetailPage() {
  const { id } = useParams();
  const { data: project, loading } = useMockResource(() => getProject(id ?? ''), [id]);
  const [activeSection, setActiveSection] = useState('overview');

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
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{project.description}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="mt-5 flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              activeSection === section.id
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon name={section.icon} size={14} />
            {section.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {activeSection === 'overview' && <OverviewSection project={project} />}
        {activeSection === 'tasks' && <TasksSection project={project} />}
        {activeSection === 'issues' && <IssuesSection project={project} />}
        {activeSection === 'daily-updates' && <DailyUpdatesSection project={project} />}
        {activeSection === 'meetings' && <MeetingsSection project={project} />}
        {activeSection === 'handoff' && <HandoffSection project={project} />}
        {activeSection === 'reports' && <ReportsSection project={project} />}
      </div>
    </div>
  );
}
