import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../context/useAuth';
import { Icon } from '../common/Icon';

export function AppShell() {
  const { isAuthenticated, loading, user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Icon name="Loader2" size={24} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.status === 'locked') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Icon name="Lock" size={28} className="mx-auto text-slate-400" />
          <p className="mt-3 text-base font-semibold text-slate-900">Tài khoản đã bị khoá</p>
          <p className="mt-1.5 text-sm text-slate-500">
            Tài khoản này đã hoàn tất bàn giao khi kết thúc tham gia nên không còn quyền truy cập hệ thống.
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-3 z-50 rounded-lg bg-white/90 p-2 text-slate-600 shadow"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
