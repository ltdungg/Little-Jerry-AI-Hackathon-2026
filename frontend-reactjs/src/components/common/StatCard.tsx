import clsx from 'clsx';
import { Icon } from './Icon';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  tone?: 'default' | 'emerald' | 'amber' | 'rose';
}

const TONE_MAP: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-slate-100 text-slate-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
};

export function StatCard({ label, value, icon, tone = 'default' }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className={clsx('flex h-10 w-10 items-center justify-center rounded-lg', TONE_MAP[tone])}>
        <Icon name={icon} size={18} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
