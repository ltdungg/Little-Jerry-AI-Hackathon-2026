import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { signIn as amplifySignIn, signOut as amplifySignOut, getIdToken } from '../lib/auth';
import { getMe } from '../lib/api';
import { AuthContext, type AuthContextValue } from './auth-context';
import type { AppUser } from '../types';

function mapUserProfile(profile: any): AppUser {
  const name = profile.display_name || profile.user_id || 'User';
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  return {
    id: profile.user_id,
    name,
    email: profile.email || '',
    role: profile.roles?.[0] || 'volunteer',
    roleLabel: profile.roles?.[0] || 'Volunteer',
    team: '',
    initials,
    status: profile.status === 'locked' ? 'locked' : 'active',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  // Whether Cognito itself considers the session valid — the source of truth
  // for "is this person logged in". Kept separate from `user` (the richer
  // /v1/me profile) so a transient failure of that profile fetch can't bounce
  // an otherwise-authenticated person back to the login page.
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    try {
      const profile = await getMe();
      setUser(mapUserProfile(profile));
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const token = await getIdToken();
        if (token) {
          setAuthenticated(true);
          await loadProfile();
          setLoading(false);
          return;
        }
      } catch {
        // Cognito not configured or unreachable — fall through to dev bypass
      }
      // Dev bypass: auto-login with mock user when Cognito is unavailable
      setUser({
        id: 'dev-user',
        name: 'Le Hoang Anh',
        email: 'anh@aiforvietnam.org',
        role: 'coordinator',
        roleLabel: 'Điều phối viên',
        team: 'Điều phối',
        initials: 'LA',
      });
      setAuthenticated(true);
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (username: string, password: string): Promise<boolean> => {
    const ok = await amplifySignIn(username, password);
    if (ok) {
      setAuthenticated(true);
      await loadProfile();
    }
    return ok;
  }, []);

  const signOut = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
    setAuthenticated(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: authenticated,
      loading,
      signIn,
      signOut,
    }),
    [user, authenticated, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
