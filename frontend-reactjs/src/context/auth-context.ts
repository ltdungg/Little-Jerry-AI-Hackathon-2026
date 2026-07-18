import { createContext } from 'react';
import type { AppUser } from '../types';

export interface AuthContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
