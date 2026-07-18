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
  const userPoolId = import.meta.env.VITE_USER_POOL_ID;
  const userPoolClientId = import.meta.env.VITE_USER_POOL_CLIENT_ID;
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
    await amplifySignIn({ username, password });
    return true;
  } catch {
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
