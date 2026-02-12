import { AuthUser } from '../types';
import { buildApiUrl } from '../utils/apiConfig';

const STORAGE_KEY = 'restoadmin_access_token';

let accessToken: string | null = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
})();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export function clearAccessToken(): void {
  accessToken = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

type AuthResponse = {
  success: boolean;
  data?: {
    user_id: number;
    username: string;
    firstname: string;
    lastname: string;
    permissions: number;
    branch_id: number | null;
    branch_name: string | null;
    branch_code: string | null;
  };
  tokens?: { accessToken?: string; expiresIn?: string };
  error?: string;
};

const buildUrl = (path: string) => buildApiUrl(path);

const mapUser = (data: AuthResponse['data']): AuthUser => ({
  userId: data?.user_id ?? 0,
  username: data?.username ?? '',
  firstname: data?.firstname ?? '',
  lastname: data?.lastname ?? '',
  permissions: data?.permissions ?? 0,
  branchId: data?.branch_id ?? null,
  branchName: data?.branch_name ?? null,
  branchCode: data?.branch_code ?? null,
});

export const login = async (username: string, password: string): Promise<AuthUser> => {
  const response = await fetch(buildUrl('/login'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ username, password })
  });
  const json = (await response.json()) as AuthResponse;
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || 'Login failed');
  }
  if (json.tokens?.accessToken) {
    setAccessToken(json.tokens.accessToken);
  }
  return mapUser(json.data);
};

const FETCH_TIMEOUT_MS = 10_000;

/** Restore user from stored JWT via GET /me (used on refresh). */
export const getMe = async (): Promise<AuthUser | null> => {
  const token = getAccessToken();
  if (!token) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(buildUrl('/me'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.status === 401) {
      clearAccessToken();
      return null;
    }
    if (!response.ok) return null;
    const json = (await response.json()) as { success?: boolean; data?: AuthResponse['data'] | null };
    if (!json?.success) return null;
    if (json.data == null) {
      clearAccessToken();
      return null;
    }
    return mapUser(json.data);
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
};

export const checkSession = async (): Promise<AuthUser | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(buildUrl('/check-permission'), {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as { permissions?: number };
    if (!json || typeof json.permissions !== 'number') {
      return null;
    }
    return {
      userId: 0,
      username: '',
      firstname: '',
      lastname: '',
      permissions: json.permissions,
      branchId: null,
      branchName: null,
      branchCode: null,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
};

export const logout = async (): Promise<void> => {
  clearAccessToken();
  await fetch(buildUrl('/logout'), {
    method: 'POST',
    credentials: 'include'
  });
};
