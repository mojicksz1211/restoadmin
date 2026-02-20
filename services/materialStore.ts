export interface MaterialItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  status: 'Active' | 'Inactive';
  stock: number;
  unitCost: number;
  sku?: string;
  barcode?: string;
  description?: string;
  branchId: string;
}

const STORAGE_KEY = 'restoadmin_materials';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalize(input: Partial<MaterialItem>): MaterialItem {
  return {
    id: String(input.id ?? ''),
    name: String(input.name ?? ''),
    category: String(input.category ?? ''),
    unit: String(input.unit ?? ''),
    status: input.status === 'Inactive' ? 'Inactive' : 'Active',
    stock: Number.isFinite(input.stock) ? Number(input.stock) : 0,
    unitCost: Number.isFinite(input.unitCost) ? Number(input.unitCost) : 0,
    sku: input.sku ? String(input.sku) : '',
    barcode: input.barcode ? String(input.barcode) : '',
    description: input.description ? String(input.description) : '',
    branchId: String(input.branchId ?? 'all'),
  };
}

export function getMaterials(): MaterialItem[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<MaterialItem>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize).filter((item) => item.id && item.name);
  } catch {
    return [];
  }
}

export function saveMaterials(materials: MaterialItem[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(materials));
}

export function addMaterial(payload: Omit<MaterialItem, 'id'>): MaterialItem[] {
  const current = getMaterials();
  const next: MaterialItem[] = [
    ...current,
    normalize({
      ...payload,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mat-${Date.now()}`,
    }),
  ];
  saveMaterials(next);
  return next;
}

export function updateMaterial(id: string, payload: Partial<Omit<MaterialItem, 'id'>>): MaterialItem[] {
  const current = getMaterials();
  const next = current.map((item) =>
    item.id === id
      ? normalize({
          ...item,
          ...payload,
          id,
        })
      : item
  );
  saveMaterials(next);
  return next;
}

export function deleteMaterial(id: string): MaterialItem[] {
  const current = getMaterials();
  const next = current.filter((item) => item.id !== id);
  saveMaterials(next);
  return next;
}
