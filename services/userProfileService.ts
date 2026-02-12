import { getAccessToken } from './authService';

export type UserProfile = {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string | null;
  avatarUrl: string | null;
  permissions: number;
  lastLogin: string | null;
  roleName: string | null;
};

export type UserProfileUpdatePayload = {
  firstname?: string;
  lastname?: string;
  email?: string | null;
  avatar_url?: string | null;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export type ActivityItem = {
  id?: number;
  action?: string;
  entity?: string;
  details?: string;
  createdAt?: string;
  [key: string]: unknown;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

type ProfileApiRecord = {
  IDNo: number;
  USERNAME?: string;
  FIRSTNAME?: string;
  LASTNAME?: string;
  EMAIL?: string | null;
  AVATAR_URL?: string | null;
  PERMISSIONS?: number;
  LAST_LOGIN?: string | null;
  role_name?: string | null;
};

const API_BASE_URL =
  (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
  || 'http://localhost:2000';

const buildUrl = (path: string, params?: Record<string, string>) => {
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = new URL(`${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
    });
  }
  return url.toString();
};

const authHeaders = (): Record<string, string> => {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const json = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || json.message || 'Request failed');
  }
  return json.data;
};

function mapProfile(row: ProfileApiRecord): UserProfile {
  return {
    id: row.IDNo,
    username: row.USERNAME ?? '',
    firstname: row.FIRSTNAME ?? '',
    lastname: row.LASTNAME ?? '',
    email: row.EMAIL ?? null,
    avatarUrl: row.AVATAR_URL ?? null,
    permissions: row.PERMISSIONS ?? 0,
    lastLogin: row.LAST_LOGIN ?? null,
    roleName: row.role_name ?? null,
  };
}

/** Get current user profile */
export async function getProfile(): Promise<UserProfile> {
  const response = await fetch(buildUrl('/user/profile'), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<ProfileApiRecord>(response);
  return mapProfile(data);
}

/** Update current user profile */
export async function updateProfile(payload: UserProfileUpdatePayload): Promise<void> {
  const response = await fetch(buildUrl('/user/profile'), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  await handleResponse<null>(response);
}

/** Change password */
export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  const response = await fetch(buildUrl('/user/password'), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  await handleResponse<null>(response);
}

/** Get user activity history */
export async function getActivity(limit = 50): Promise<ActivityItem[]> {
  const response = await fetch(buildUrl('/user/activity', { limit: String(limit) }), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<ActivityItem[]>(response);
  return Array.isArray(data) ? data : [];
}
