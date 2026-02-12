import { getAccessToken } from './authService';

export type NotificationRecord = {
  id: number;
  userId: number;
  branchId?: number;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: NotificationRecord[];
  unread_count: number;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

type NotificationApiRow = {
  IDNo: number;
  USER_ID: number;
  BRANCH_ID?: number;
  TITLE?: string;
  MESSAGE?: string;
  TYPE?: string;
  LINK?: string | null;
  IS_READ?: number;
  CREATED_DT?: string;
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

function mapNotification(row: NotificationApiRow): NotificationRecord {
  return {
    id: row.IDNo,
    userId: row.USER_ID,
    branchId: row.BRANCH_ID,
    title: row.TITLE ?? '',
    message: row.MESSAGE ?? '',
    type: row.TYPE ?? 'info',
    link: row.LINK ?? null,
    isRead: Number(row.IS_READ) === 1,
    createdAt: row.CREATED_DT ?? '',
  };
}

/** Get notifications and unread count (branchId: undefined or 'all' = all branches, else that branch only) */
export async function getNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
  branchId?: string | null;
}): Promise<NotificationsResponse> {
  const params: Record<string, string> = {};
  if (options?.unreadOnly) params.unread_only = 'true';
  if (options?.limit != null) params.limit = String(options.limit);
  if (options?.branchId != null && options.branchId !== '' && options.branchId !== 'all') {
    params.branch_id = options.branchId;
  }
  const response = await fetch(buildUrl('/notifications', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<{ notifications: NotificationApiRow[]; unread_count: number }>(response);
  const notifications = (data.notifications ?? []).map(mapNotification);
  return { notifications, unread_count: data.unread_count ?? 0 };
}

/** Mark one notification as read */
export async function markAsRead(id: number): Promise<void> {
  const response = await fetch(buildUrl(`/notifications/${id}/mark-read`), {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
  });
  await handleResponse<{ notification_id: number }>(response);
}

/** Mark all notifications as read */
export async function markAllAsRead(): Promise<void> {
  const response = await fetch(buildUrl('/notifications/mark-read'), {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
  });
  await handleResponse<null>(response);
}

/** Clear all notifications */
export async function clearAll(): Promise<void> {
  const response = await fetch(buildUrl('/notifications/clear'), {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
  });
  await handleResponse<null>(response);
}
