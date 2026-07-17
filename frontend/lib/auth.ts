'use client';
import { Amplify } from 'aws-amplify';
import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  fetchAuthSession,
  getCurrentUser,
} from 'aws-amplify/auth';

let configured = false;

export function configureAuth() {
  if (configured) return;
  const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;
  if (!userPoolId || !userPoolClientId) {
    console.warn('Cognito env vars missing; auth disabled.');
    return;
  }
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
      },
    },
  });
  configured = true;
}

export async function signIn(username: string, password: string) {
  configureAuth();
  return amplifySignIn({ username, password });
}

export async function signOut() {
  configureAuth();
  return amplifySignOut();
}

// Returns the Cognito ID token (JWT) used as the API Gateway JWT authorizer bearer.
export async function getIdToken(): Promise<string | null> {
  configureAuth();
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<string | null> {
  configureAuth();
  try {
    const u = await getCurrentUser();
    return u.username ?? null;
  } catch {
    return null;
  }
}
