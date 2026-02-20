export interface ProductCategoryItem {
  id: string;
  name: string;
  productsCount: number;
  status: 'Active' | 'Inactive';
}

const STORAGE_KEY = 'restoadmin_product_categories';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getProductCategories(): ProductCategoryItem[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProductCategoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.name === 'string' && typeof item.id === 'string')
      .map((item) => ({
        id: item.id,
        name: item.name,
        productsCount: Number.isFinite(item.productsCount) ? item.productsCount : 0,
        status: item.status === 'Inactive' ? 'Inactive' : 'Active',
      }));
  } catch {
    return [];
  }
}

export function saveProductCategories(categories: ProductCategoryItem[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

export function addProductCategory(
  name: string,
  status: ProductCategoryItem['status'] = 'Active'
): ProductCategoryItem[] {
  const trimmed = name.trim();
  if (!trimmed) return getProductCategories();

  const current = getProductCategories();
  const exists = current.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) return current;

  const next: ProductCategoryItem[] = [
    ...current,
    {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`,
      name: trimmed,
      productsCount: 0,
      status,
    },
  ];
  saveProductCategories(next);
  return next;
}

export function updateProductCategory(
  id: string,
  name: string,
  status?: ProductCategoryItem['status']
): ProductCategoryItem[] {
  const trimmed = name.trim();
  if (!trimmed) return getProductCategories();

  const current = getProductCategories();
  const exists = current.some(
    (item) => item.id !== id && item.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) return current;

  const next = current.map((item) =>
    item.id === id
      ? {
          ...item,
          name: trimmed,
          status: status ?? item.status,
        }
      : item
  );

  saveProductCategories(next);
  return next;
}

export function deleteProductCategory(id: string): ProductCategoryItem[] {
  const current = getProductCategories();
  const next = current.filter((item) => item.id !== id);
  saveProductCategories(next);
  return next;
}
