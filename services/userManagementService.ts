import { SystemUser, Role } from '../types';
import { getAccessToken } from './authService';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

type UserApiItem = {
  id: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  lastActivityAt: string | null;
  lastActive: string;
  avatar: string | null;
};

type RoleApiItem = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
};

import { buildApiUrl } from '../utils/apiConfig';

const buildUrl = (path: string) => buildApiUrl(path);

const authHeaders = (): Record<string, string> => {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const json = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Request failed');
  }
  return json.data;
};

function mapUser(row: UserApiItem): SystemUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    roleId: row.roleId,
    lastActive: row.lastActive,
    avatar: row.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&size=40`,
    firstname: row.firstname,
    lastname: row.lastname,
    username: row.username,
  };
}

function mapRole(row: RoleApiItem): Role {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
  };
}

export async function getUsers(): Promise<SystemUser[]> {
  const response = await fetch(buildUrl('/api/user-management/users'), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<UserApiItem[]>(response);
  return data.map(mapUser);
}

export async function getRoles(): Promise<Role[]> {
  const response = await fetch(buildUrl('/api/user-management/roles'), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<RoleApiItem[]>(response);
  return data.map(mapRole);
}

// --- User mutate ---

export type CreateUserPayload = {
  firstname: string;
  lastname: string;
  username: string;
  email?: string;
  password: string;
  passwordConfirm: string;
  roleId: string;
  branch_id?: string;
  table_id?: string | number;
};

export async function createUser(payload: CreateUserPayload): Promise<number> {
  const response = await fetch(buildUrl('/api/user-management/users'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ id: number }>(response);
  return data?.id ?? 0;
}

export type UpdateUserPayload = {
  firstname: string;
  lastname: string;
  username: string;
  email?: string;
  roleId: string;
  table_id?: string | number;
};

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<void> {
  const response = await fetch(buildUrl(`/api/user-management/users/${userId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  await handleResponse<{ id: number }>(response);
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(buildUrl(`/api/user-management/users/${userId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  await handleResponse<{ id: number }>(response);
}

// --- Role mutate ---

export type CreateRolePayload = {
  name: string;
  description?: string;
  permissions?: string[];
};

export type UpdateRolePayload = CreateRolePayload;

export async function createRole(payload: CreateRolePayload): Promise<number> {
  const response = await fetch(buildUrl('/api/user-management/roles'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ id: number }>(response);
  return data?.id ?? 0;
}

export async function updateRole(roleId: string, payload: UpdateRolePayload): Promise<void> {
  const response = await fetch(buildUrl(`/api/user-management/roles/${roleId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  await handleResponse<{ id: number }>(response);
}

export async function deleteRole(roleId: string): Promise<void> {
  const response = await fetch(buildUrl(`/api/user-management/roles/${roleId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  await handleResponse<{ id: number }>(response);
}
