import { createContext } from 'react';
import type { AppUser } from '../types';

export interface AuthContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
