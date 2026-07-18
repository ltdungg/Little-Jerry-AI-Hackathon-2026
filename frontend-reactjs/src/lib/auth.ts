import { Amplify } from 'aws-amplify';
import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  fetchAuthSession,
  getCurrentUser,
} from 'aws-amplify/auth';

let configured = false;

function configureAuth() {
  if (configured) return;
  // Web authentication pool (for frontend login)
  const userPoolId = import.meta.env.VITE_WEB_COGNITO_POOL_ID;
  const userPoolClientId = import.meta.env.VITE_WEB_COGNITO_CLIENT_ID;
  if (userPoolId && userPoolClientId) {
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
}

export async function signIn(username: string, password: string): Promise<boolean> {
  try {
    configureAuth();
    const result = await amplifySignIn({ username, password });
    return result.isSignedIn;
  } catch (err) {
    // Amplify throws this when a valid session already exists (e.g. the user
    // resubmits the form after a first sign-in whose post-login profile fetch
    // failed) — that's a real, already-authenticated session, not a failure.
    if (err instanceof Error && err.name === 'UserAlreadyAuthenticatedException') {
      return true;
    }
    return false;
  }
}

export async function signOut(): Promise<void> {
  try {
    configureAuth();
    await amplifySignOut();
  } catch {
    // silently ignore
  }
}

export async function getIdToken(): Promise<string | null> {
  try {
    configureAuth();
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<string | null> {
  try {
    configureAuth();
    const u = await getCurrentUser();
    return u.username;
  } catch {
    return null;
  }
}
