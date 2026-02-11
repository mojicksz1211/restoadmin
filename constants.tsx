
import { Branch, SalesData, MenuItem, Staff, SystemUser, Role } from './types';

export const MOCK_BRANCHES: Branch[] = [
  { 
    id: '1', name: 'Makati Central', location: 'Ayala Ave, Makati', manager: 'Juan Dela Cruz', status: 'Open', dailyRevenue: 45000, ordersCount: 120, topSellingItem: 'Adobo Rice Bowl',
    expenses: { labor: 12000, cogs: 15000, operational: 5000 }
  },
  { 
    id: '2', name: 'BGC Stopover', location: '32nd St, Taguig', manager: 'Maria Santos', status: 'Open', dailyRevenue: 52000, ordersCount: 145, topSellingItem: 'Sinigang na Hipon',
    expenses: { labor: 14000, cogs: 18000, operational: 6000 }
  },
  { 
    id: '3', name: 'Quezon City Main', location: 'Tomas Morato, QC', manager: 'Pedro Penduko', status: 'Maintenance', dailyRevenue: 0, ordersCount: 0, topSellingItem: 'N/A',
    expenses: { labor: 5000, cogs: 0, operational: 4000 }
  },
  { 
    id: '4', name: 'Alabang Hub', location: 'Filinvest, Muntinlupa', manager: 'Elena Reyes', status: 'Open', dailyRevenue: 38000, ordersCount: 95, topSellingItem: 'Crispy Pata',
    expenses: { labor: 10000, cogs: 12000, operational: 4500 }
  },
];

export const MOCK_ROLES: Role[] = [
  { id: 'r1', name: 'Super Admin', description: 'Full system access across all branches.', permissions: ['all'] },
  { id: 'r2', name: 'Finance Manager', description: 'Access to revenue and cost reports.', permissions: ['read_financials', 'export_data'] },
  { id: 'r3', name: 'Branch Manager', description: 'Manage specific branch inventory and staff.', permissions: ['manage_branch', 'manage_inventory', 'manage_staff'] },
];

export const MOCK_SYSTEM_USERS: SystemUser[] = [
  { id: 'u1', name: 'Juan Luna', email: 'juan.luna@restoadmin.ph', roleId: 'r1', lastActive: '2 mins ago', avatar: 'https://picsum.photos/40/40?random=10' },
  { id: 'u2', name: 'Maria Makiling', email: 'maria.m@restoadmin.ph', roleId: 'r3', lastActive: '1 hour ago', avatar: 'https://picsum.photos/40/40?random=11' },
  { id: 'u3', name: 'Jose Rizal', email: 'jose.r@restoadmin.ph', roleId: 'r2', lastActive: 'Yesterday', avatar: 'https://picsum.photos/40/40?random=12' },
];

export const MOCK_INVENTORY: MenuItem[] = [
  { id: 'i1', name: 'Adobo Rice Bowl', category: 'Main Course', price: 245, stock: 85, branchId: '1' },
  { id: 'i2', name: 'Lumpiang Shanghai', category: 'Appetizer', price: 180, stock: 15, branchId: '1' },
  { id: 'i3', name: 'Halo-Halo Special', category: 'Dessert', price: 150, stock: 42, branchId: '1' },
  { id: 'i4', name: 'Sinigang na Hipon', category: 'Main Course', price: 320, stock: 12, branchId: '2' },
  { id: 'i5', name: 'Lechon Kawali', category: 'Main Course', price: 295, stock: 0, branchId: '2' },
  { id: 'i6', name: 'Iced Tea Pitcher', category: 'Beverage', price: 120, stock: 100, branchId: '2' },
  { id: 'i7', name: 'Crispy Pata', category: 'Main Course', price: 750, stock: 25, branchId: '4' },
  { id: 'i8', name: 'Pancit Guisado', category: 'Main Course', price: 210, stock: 60, branchId: '4' },
  { id: 'i9', name: 'Mango Shake', category: 'Beverage', price: 95, stock: 30, branchId: '4' },
  { id: 'i10', name: 'Beef Pares', category: 'Main Course', price: 195, stock: 55, branchId: '1' },
  { id: 'i11', name: 'Kare-Kare', category: 'Main Course', price: 420, stock: 8, branchId: '2' },
  { id: 'i12', name: 'Leche Flan', category: 'Dessert', price: 85, stock: 50, branchId: '4' },
];

export const MOCK_STAFF: Staff[] = [
  { id: 's1', name: 'Juan Dela Cruz', role: 'Manager', status: 'Active', branchId: '1', rating: 4.8, email: 'juan.dc@restoadmin.ph', joinedDate: '2023-01-15' },
  { id: 's2', name: 'Liza Soberano', role: 'Server', status: 'Active', branchId: '1', rating: 4.9, email: 'liza.s@restoadmin.ph', joinedDate: '2023-05-20' },
  { id: 's3', name: 'Rico Blanco', role: 'Chef', status: 'On Break', branchId: '1', rating: 4.7, email: 'rico.b@restoadmin.ph', joinedDate: '2023-02-10' },
  { id: 's4', name: 'Maria Santos', role: 'Manager', status: 'Active', branchId: '2', rating: 4.6, email: 'maria.s@restoadmin.ph', joinedDate: '2022-11-05' },
  { id: 's5', name: 'Anton Diaz', role: 'Chef', status: 'Active', branchId: '2', rating: 4.5, email: 'anton.d@restoadmin.ph', joinedDate: '2023-03-12' },
  { id: 's6', name: 'Ben Tulfo', role: 'Server', status: 'Off Duty', branchId: '2', rating: 4.2, email: 'ben.t@restoadmin.ph', joinedDate: '2024-01-15' },
  { id: 's7', name: 'Elena Reyes', role: 'Manager', status: 'Active', branchId: '4', rating: 4.9, email: 'elena.r@restoadmin.ph', joinedDate: '2023-06-01' },
  { id: 's8', name: 'Vhong Navarro', role: 'Chef', status: 'Active', branchId: '4', rating: 4.4, email: 'vhong.n@restoadmin.ph', joinedDate: '2023-08-25' },
  { id: 's9', name: 'Anne Curtis', role: 'Server', status: 'Active', branchId: '4', rating: 5.0, email: 'anne.c@restoadmin.ph', joinedDate: '2023-09-12' },
  { id: 's10', name: 'Pedro Penduko', role: 'Manager', status: 'Off Duty', branchId: '3', rating: 4.3, email: 'pedro.p@restoadmin.ph', joinedDate: '2023-11-20' },
];

export const SALES_CHART_DATA: SalesData[] = [
  { name: 'Mon', sales: 4000, expenses: 3200 },
  { name: 'Tue', sales: 3000, expenses: 2800 },
  { name: 'Wed', sales: 2000, expenses: 1900 },
  { name: 'Thu', sales: 2780, expenses: 2100 },
  { name: 'Fri', sales: 1890, expenses: 1500 },
  { name: 'Sat', sales: 2390, expenses: 1800 },
  { name: 'Sun', sales: 3490, expenses: 2600 },
];

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    branches: "Branches",
    menu: "Menu",
    inventory: "Inventory",
    staff: "Staff Members",
    user_mgmt: "User Management",
    settings: "Settings",
    revenue: "Revenue",
    search_placeholder: "Search anything across the platform...",
    viewing: "Viewing",
    reset: "Reset"
  },
  ph: {
    dashboard: "Dashboard",
    branches: "Mga Sangay",
    menu: "Menu",
    inventory: "Inbentaryo",
    staff: "Mga Kawani",
    user_mgmt: "Pamamahala ng User",
    settings: "Mga Setting",
    revenue: "Kita",
    search_placeholder: "Maghanap sa buong platform...",
    viewing: "Tinitingnan",
    reset: "I-reset"
  }
};
