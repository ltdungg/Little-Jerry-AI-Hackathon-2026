import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from '../common/Icon';
import { useAuth } from '../../context/useAuth';
import { ALL_NAV_LEAVES } from '../../lib/navConfig';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const current = ALL_NAV_LEAVES.find((item) => item.path === location.pathname);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
      >
        <Icon name="Menu" size={20} />
      </button>

      <div className="hidden min-w-0 flex-col sm:flex">
        <h1 className="truncate text-base font-semibold text-slate-900">
          {current?.label ?? 'NPO AI Platform'}
        </h1>
      </div>

      <div className="ml-auto flex flex-1 items-center justify-end gap-2 sm:flex-initial">
        <div className="relative hidden w-full max-w-sm sm:block">
          <Icon
            name="Search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm kiếm dự án, tài liệu, dữ liệu..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Thông báo"
        >
          <Icon name="Bell" size={19} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {user?.initials}
            </div>
            <div className="hidden max-w-[120px] text-left leading-tight md:block">
              <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.roleLabel}</p>
            </div>
            <Icon name="ChevronDown" size={14} className="hidden shrink-0 text-slate-400 md:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2 md:hidden">
                <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Icon name="LogOut" size={15} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
