import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { signIn as amplifySignIn, signOut as amplifySignOut } from '../lib/auth';
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
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getMe();
        setUser(mapUserProfile(profile));
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (username: string, password: string): Promise<boolean> => {
    const ok = await amplifySignIn(username, password);
    if (ok) {
      try {
        const profile = await getMe();
        setUser(mapUserProfile(profile));
      } catch {
        setUser(null);
      }
    }
    return ok;
  }, []);

  const signOut = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      signIn,
      signOut,
    }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
