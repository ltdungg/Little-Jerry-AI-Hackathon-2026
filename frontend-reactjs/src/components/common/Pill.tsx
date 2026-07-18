import clsx from 'clsx';
import { Icon } from './Icon';

export type PillTone = 'slate' | 'emerald' | 'amber' | 'rose' | 'blue' | 'violet' | 'sky';

const TONE_MAP: Record<PillTone, string> = {
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
};

interface PillProps {
  tone?: PillTone;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

export function Pill({ tone = 'slate', icon, children, className }: PillProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONE_MAP[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
