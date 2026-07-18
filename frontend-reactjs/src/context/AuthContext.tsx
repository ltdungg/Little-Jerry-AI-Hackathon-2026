import { useMemo, useState, type ReactNode } from 'react';
import { MOCK_USER } from '../lib/mockData';
import { AuthContext, type AuthContextValue } from './auth-context';

const STORAGE_KEY = 'aiv.auth.session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1',
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: isAuthenticated ? MOCK_USER : null,
      isAuthenticated,
      signIn: () => {
        localStorage.setItem(STORAGE_KEY, '1');
        setIsAuthenticated(true);
      },
      signOut: () => {
        localStorage.removeItem(STORAGE_KEY);
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
