import { type MenuItem } from '../types';

export interface ProductItem extends MenuItem {
  unit: string;
  type: string;
  status: 'Active' | 'Inactive';
  sku?: string;
  barcode?: string;
  description?: string;
  cafeItem?: boolean;
  multipleVariants?: boolean;
}

const STORAGE_KEY = 'restoadmin_products';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalize(input: Partial<ProductItem>): ProductItem {
  return {
    id: String(input.id ?? ''),
    name: String(input.name ?? ''),
    category: (input.category as ProductItem['category']) ?? 'Main Course',
    price: Number.isFinite(input.price) ? Number(input.price) : 0,
    stock: Number.isFinite(input.stock) ? Number(input.stock) : 0,
    branchId: String(input.branchId ?? 'all'),
    unit: String(input.unit ?? ''),
    type: String(input.type ?? ''),
    status: input.status === 'Inactive' ? 'Inactive' : 'Active',
    sku: input.sku ? String(input.sku) : '',
    barcode: input.barcode ? String(input.barcode) : '',
    description: input.description ? String(input.description) : '',
    cafeItem: Boolean(input.cafeItem),
    multipleVariants: Boolean(input.multipleVariants),
  };
}

export function getProducts(): ProductItem[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ProductItem>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize).filter((item) => item.id && item.name);
  } catch {
    return [];
  }
}

export function saveProducts(products: ProductItem[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function addProduct(payload: Omit<ProductItem, 'id'>): ProductItem[] {
  const current = getProducts();
  const next: ProductItem[] = [
    ...current,
    normalize({
      ...payload,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prd-${Date.now()}`,
    }),
  ];
  saveProducts(next);
  return next;
}

export function updateProduct(id: string, payload: Partial<Omit<ProductItem, 'id'>>): ProductItem[] {
  const current = getProducts();
  const next = current.map((item) => (item.id === id ? normalize({ ...item, ...payload, id }) : item));
  saveProducts(next);
  return next;
}

export function deleteProduct(id: string): ProductItem[] {
  const current = getProducts();
  const next = current.filter((item) => item.id !== id);
  saveProducts(next);
  return next;
}
