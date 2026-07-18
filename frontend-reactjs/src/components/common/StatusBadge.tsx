import clsx from 'clsx';
import type { ProjectStatus } from '../../types';
import { Icon } from './Icon';

const STATUS_MAP: Record<ProjectStatus, { label: string; className: string; icon: string }> = {
  healthy: {
    label: 'Đúng tiến độ',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    icon: 'CheckCircle2',
  },
  at_risk: {
    label: 'Có nguy cơ',
    className: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    icon: 'AlertTriangle',
  },
  overdue: {
    label: 'Quá hạn',
    className: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    icon: 'AlertCircle',
  },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const meta = STATUS_MAP[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        meta.className,
      )}
    >
      <Icon name={meta.icon} size={12} />
      {meta.label}
    </span>
  );
}
