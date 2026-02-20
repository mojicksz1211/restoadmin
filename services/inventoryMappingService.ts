import { getAccessToken } from './authService';
import { getApiBaseUrl } from '../utils/apiConfig';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

export type MenuInventoryMapping = {
  id: number;
  menu_id: number;
  product_id: number | null;
  material_id: number | null;
  quantity: number;
};

const buildUrl = (path: string) => {
  const base = getApiBaseUrl().replace(/\/$/, '');
  return `${base}${path}`;
};

const authHeaders = (): Record<string, string> => {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const json = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Request failed');
  }
  return json.data;
};

export async function getMenuInventoryMappings(menuId: string): Promise<MenuInventoryMapping[]> {
  const response = await fetch(buildUrl(`/inventory/menu/${menuId}/mappings`), {
    credentials: 'include',
    headers: authHeaders(),
  });
  return handleResponse<MenuInventoryMapping[]>(response);
}

export async function saveMenuInventoryMappings(
  menuId: string,
  mappings: Array<{ product_id?: number | null; material_id?: number | null; quantity: number }>
): Promise<void> {
  const response = await fetch(buildUrl(`/inventory/menu/${menuId}/mappings`), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ mappings }),
  });
  await handleResponse<null>(response);
}
