import { FIREBASE_PROJECT_ID, FIREBASE_WEB_API_KEY } from '../src/firebaseConfig.ts';

export interface FirebaseAuthIdentity {
  localId: string;
  email: string;
  emailVerified?: boolean;
  idToken?: string;
}

export class FirebaseAuthRequestError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = 'FirebaseAuthRequestError';
  }
}

interface FirebaseAuthConfig {
  apiKey: string;
  projectId: string;
}

function readFirebaseAuthConfig(): FirebaseAuthConfig | null {
  const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim() || FIREBASE_WEB_API_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || FIREBASE_PROJECT_ID;
  if (!apiKey || apiKey === '__PUBLIC_FIREBASE_API_KEY__' || !projectId) return null;
  return { apiKey, projectId };
}

export function firebaseAuthAvailable(): boolean {
  return Boolean(readFirebaseAuthConfig());
}

async function postIdentityToolkit<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const config = readFirebaseAuthConfig();
  if (!config) throw new FirebaseAuthRequestError('AUTH_NOT_CONFIGURED', 503);

  let response: Response;
  try {
    response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/${method}?key=${encodeURIComponent(config.apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-Locale': 'pt-BR',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8_000),
      },
    );
  } catch {
    throw new FirebaseAuthRequestError('NETWORK_ERROR', 0);
  }

  const result = await response.json().catch(() => ({})) as {
    error?: { message?: string };
  };
  if (!response.ok) {
    const message = result.error?.message || `HTTP_${response.status}`;
    const code = message.match(/^[A-Z0-9_]+/)?.[0] || `HTTP_${response.status}`;
    throw new FirebaseAuthRequestError(code, response.status);
  }
  return result as T;
}

export function firebaseSignUp(email: string, password: string): Promise<FirebaseAuthIdentity> {
  return postIdentityToolkit<FirebaseAuthIdentity>('accounts:signUp', {
    email,
    password,
    returnSecureToken: true,
  });
}

export function firebaseSignIn(email: string, password: string): Promise<FirebaseAuthIdentity> {
  return postIdentityToolkit<FirebaseAuthIdentity>('accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });
}

export function firebaseSendVerificationEmail(idToken: string): Promise<unknown> {
  return postIdentityToolkit('accounts:sendOobCode', {
    requestType: 'VERIFY_EMAIL',
    idToken,
  });
}

export function firebaseSendPasswordReset(email: string): Promise<unknown> {
  return postIdentityToolkit('accounts:sendOobCode', {
    requestType: 'PASSWORD_RESET',
    email,
  });
}

export function firebaseResetPassword(oobCode: string, newPassword: string): Promise<{ email?: string }> {
  return postIdentityToolkit<{ email?: string }>('accounts:resetPassword', {
    oobCode,
    newPassword,
  });
}

export async function firebaseLookupIdToken(idToken: string): Promise<FirebaseAuthIdentity | null> {
  const result = await postIdentityToolkit<{ users?: FirebaseAuthIdentity[] }>('accounts:lookup', { idToken });
  return result.users?.[0] || null;
}
