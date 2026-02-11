
export interface Branch {
  id: string;
  name: string;
  location: string;
  manager: string;
  status: 'Open' | 'Closed' | 'Maintenance';
  dailyRevenue: number;
  ordersCount: number;
  topSellingItem: string;
  expenses: {
    labor: number;
    cogs: number; // Cost of Goods Sold
    operational: number;
  };
}

export interface BranchRecord {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string | null;
}

export interface BranchOption {
  value: string;
  label: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'Appetizer' | 'Main Course' | 'Dessert' | 'Beverage';
  price: number;
  stock: number;
  branchId: string;
}

export interface Staff {
  id: string;
  name: string;
  role: 'Manager' | 'Chef' | 'Server' | 'Admin' | string;
  status: 'Active' | 'On Break' | 'Off Duty';
  branchId: string;
  rating: number;
  email: string;
  joinedDate: string;
  photo?: string | null;
  contactNo?: string | null;
  department?: string | null;
  username?: string | null;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  lastActive: string;
  avatar: string;
  /** For edit form */
  firstname?: string;
  lastname?: string;
  username?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface SalesData {
  name: string;
  sales: number;
  expenses: number;
}

export interface AIInsight {
  summary: string;
  recommendations: string[];
}

export interface AuthUser {
  userId: number;
  username: string;
  firstname: string;
  lastname: string;
  permissions: number;
  branchId: number | null;
  branchName: string | null;
  branchCode: string | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  branchId: string | null;
}

export interface MenuRecord {
  id: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  branchLabel?: string;
  categoryId: string | null;
  categoryName: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isAvailable: boolean;
  active: boolean;
  encodedBy: string;
  encodedAt: string;
  editedBy: string | null;
  editedAt: string | null;
}
