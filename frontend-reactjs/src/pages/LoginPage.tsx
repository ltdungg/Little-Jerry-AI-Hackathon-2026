import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { useAuth } from '../context/useAuth';

export function LoginPage() {
  const { isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  function handleSignIn() {
    setLoading(true);
    window.setTimeout(() => {
      signIn();
      navigate(redirectTo, { replace: true });
    }, 500);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-blue-600 text-base font-bold text-white shadow-sm">
            AI
          </div>
          <h1 className="mt-4 text-lg font-semibold text-brand-700">NPO AI Platform</h1>
          <p className="mt-3 text-base font-medium text-slate-900">Welcome Back</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Sign in with your organization account to securely access your workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-brand-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:from-brand-600 hover:to-blue-700 disabled:opacity-70"
        >
          {loading ? (
            <Icon name="Loader2" size={16} className="animate-spin" />
          ) : (
            <Icon name="LogIn" size={16} />
          )}
          {loading ? 'Đang đăng nhập...' : 'Sign in via SSO'}
        </button>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Protected by organization SSO
          </p>
          <p className="mt-1.5 text-xs text-slate-400">
            By signing in, you agree to the organization&apos;s{' '}
            <span className="text-brand-600">Privacy Policy</span> and{' '}
            <span className="text-brand-600">Terms of Service</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
