import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Icon } from '../common/Icon';
import { NAV_GROUPS } from '../../lib/navConfig';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  const activeGroupIndex = NAV_GROUPS.findIndex((g) =>
    g.items.some((item) => item.path === location.pathname),
  );

  const [overrides, setOverrides] = useState<Record<number, boolean>>({});

  function isGroupExpanded(index: number) {
    return overrides[index] ?? index === activeGroupIndex;
  }

  function toggleGroup(index: number) {
    setOverrides((prev) => ({ ...prev, [index]: !isGroupExpanded(index) }));
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-brand-500 to-blue-600 text-sm font-bold text-white">
          AI
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900">NPO AI Platform</p>
          <p className="text-xs text-slate-400">Safe Progress</p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <Link
          to="/projects"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          <Icon name="Plus" size={16} />
          Phân tích mới
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group, index) => {
          const isExpanded = isGroupExpanded(index);
          const groupHasActive = group.items.some((i) => i.path === location.pathname);
          return (
            <div key={group.label} className="mb-1">
              <button
                type="button"
                onClick={() => toggleGroup(index)}
                className={clsx(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold uppercase tracking-wide transition',
                  groupHasActive ? 'text-brand-700' : 'text-slate-400 hover:text-slate-600',
                )}
              >
                <Icon name={group.icon} size={15} />
                <span className="flex-1">{group.label}</span>
                <Icon
                  name="ChevronRight"
                  size={14}
                  className={clsx('transition-transform', isExpanded && 'rotate-90')}
                />
              </button>

              {isExpanded && (
                <div className="ml-2 flex flex-col gap-0.5 border-l border-slate-100 pl-3">
                  {group.items.map((item) => {
                    const isActive = item.path === location.pathname;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onNavigate}
                        className={clsx(
                          'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition',
                          isActive
                            ? 'bg-brand-50 font-medium text-brand-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        )}
                      >
                        <Icon name={item.icon} size={16} className={isActive ? 'text-brand-600' : 'text-slate-400'} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge === 'progress' && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-3 py-3">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <Icon name="Settings" size={16} />
          Cài đặt
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <Icon name="HelpCircle" size={16} />
          Hỗ trợ
        </button>
      </div>
    </aside>
  );
}
