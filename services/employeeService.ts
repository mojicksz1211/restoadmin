import { getAccessToken } from './authService';

const API_BASE_URL =
  (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
  || 'http://localhost:2000';

const buildUrl = (path: string) => {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
};

// API Response type
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Backend employee data structure
type EmployeeApiItem = {
  IDNo: number;
  BRANCH_ID: number | null;
  BRANCH_NAME: string | null;
  BRANCH_CODE: string | null;
  BRANCH_LABEL: string | null;
  USER_INFO_ID: number | null;
  USERNAME: string | null;
  USER_INFO_NAME: string | null;
  PHOTO: string | null;
  FIRSTNAME: string;
  LASTNAME: string;
  FULLNAME: string;
  CONTACTNo: string | null;
  DEPARTMENT: string | null;
  ADDRESS: string | null;
  DATE_STARTED: string | null;
  SALARY: number | null;
  STATUS: string | number | null;
  ENCODED_BY: number;
  ENCODED_DT: string;
  EDITED_BY: number | null;
  EDITED_DT: string | null;
  ACTIVE: number;
  EMERGENCY_CONTACT_NAME: string | null;
  EMERGENCY_CONTACT_PHONE: string | null;
};

// Frontend Staff interface
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

const authHeaders = (): Record<string, string> => {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }
  
  // Backend returns ApiResponse format: { success: true, data: [...] }
  const json = await response.json() as ApiResponse<T>;
  if (!json.success) {
    throw new Error(json.error || 'Request failed');
  }
  // For update/delete operations, data can be null/undefined, which is valid
  // Only throw error if success is false
  return json.data as T;
};

function mapEmployee(row: EmployeeApiItem): Staff {
  // Map STATUS to frontend status
  // STATUS is tinyint(1) in database: 1 = ACTIVE, 0 = INACTIVE
  const mapStatus = (status: string | number | null): 'Active' | 'On Break' | 'Off Duty' => {
    if (status === null || status === undefined) return 'Active';
    
    // Handle numeric status codes (STATUS is tinyint: 1=ACTIVE, 0=INACTIVE)
    if (typeof status === 'number') {
      if (status === 1) return 'Active';
      if (status === 0) return 'Off Duty';
      return 'Active'; // Default for any other number
    }
    
    // Handle string status values (for backward compatibility)
    const statusStr = String(status).toLowerCase();
    if (statusStr.includes('break')) return 'On Break';
    if (statusStr.includes('off') || statusStr.includes('duty') || statusStr === '0' || statusStr === 'inactive') return 'Off Duty';
    if (statusStr.includes('active') || statusStr === '1') return 'Active';
    
    return 'Active'; // Default
  };

  // Map DEPARTMENT to role
  const mapRole = (dept: string | null): string => {
    if (!dept) return 'Server';
    const deptLower = dept.toLowerCase();
    if (deptLower.includes('manager') || deptLower.includes('admin')) return 'Manager';
    if (deptLower.includes('chef') || deptLower.includes('kitchen')) return 'Chef';
    if (deptLower.includes('waiter') || deptLower.includes('waitress') || deptLower.includes('server')) return 'Server';
    return dept;
  };

  // Generate full name from FIRSTNAME and LASTNAME if FULLNAME is not available
  const fullName = row.FULLNAME || `${row.FIRSTNAME || ''} ${row.LASTNAME || ''}`.trim();
  
  // Generate email from username or use a default
  const email = row.USERNAME 
    ? `${row.USERNAME}@restaurant.com` 
    : `${fullName.toLowerCase().replace(/\s+/g, '.')}@restaurant.com`;

  return {
    id: String(row.IDNo),
    name: fullName,
    role: mapRole(row.DEPARTMENT),
    status: mapStatus(row.STATUS),
    branchId: row.BRANCH_ID ? String(row.BRANCH_ID) : '0',
    rating: 4.5, // Default rating, can be updated if backend provides this
    email: email,
    joinedDate: row.DATE_STARTED || row.ENCODED_DT || new Date().toISOString(),
    photo: row.PHOTO,
    contactNo: row.CONTACTNo || null,
    department: row.DEPARTMENT || null,
    username: row.USERNAME || null,
  };
}

/**
 * Get all employees
 * @param branchId Optional branch ID to filter employees
 */
export async function getEmployees(branchId?: string | number | null): Promise<Staff[]> {
  const url = branchId && branchId !== 'all' 
    ? buildUrl(`/employees_list?branch_id=${branchId}`)
    : buildUrl('/employees_list');
    
  const response = await fetch(url, {
    credentials: 'include',
    headers: authHeaders(),
  });
  
  const data = await handleResponse<EmployeeApiItem[]>(response);
  return data.map(mapEmployee);
}

/**
 * Get employee by ID
 */
export async function getEmployeeById(id: string | number): Promise<Staff> {
  const response = await fetch(buildUrl(`/employee/${id}`), {
    credentials: 'include',
    headers: authHeaders(),
  });
  
  const data = await handleResponse<EmployeeApiItem>(response);
  return mapEmployee(data);
}

// Payload types for create/update
export type CreateEmployeePayload = {
  BRANCH_ID?: string | number | null;
  PHOTO?: string | null;
  FIRSTNAME: string;
  LASTNAME: string;
  CONTACTNo?: string | null;
  DEPARTMENT?: string | null;
  ADDRESS?: string | null;
  DATE_STARTED?: string | null;
  SALARY?: number | string | null;
  EMERGENCY_CONTACT_NAME?: string | null;
  EMERGENCY_CONTACT_PHONE?: string | null;
  CREATE_USER_ACCOUNT?: boolean;
  USERNAME?: string;
  PASSWORD?: string;
  PASSWORD2?: string;
  PERMISSIONS?: string | number;
};

export type UpdateEmployeePayload = {
  BRANCH_ID?: string | number | null;
  USER_INFO_ID?: string | number | null;
  PHOTO?: string | null;
  FIRSTNAME: string;
  LASTNAME: string;
  CONTACTNo?: string | null;
  DEPARTMENT?: string | null;
  ADDRESS?: string | null;
  DATE_STARTED?: string | null;
  SALARY?: number | string | null;
  STATUS?: number | string;
  EMERGENCY_CONTACT_NAME?: string | null;
  EMERGENCY_CONTACT_PHONE?: string | null;
};

/**
 * Create new employee
 */
export async function createEmployee(payload: CreateEmployeePayload): Promise<number> {
  const response = await fetch(buildUrl('/employee'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  
  const result = await handleResponse<{ id: number; user_id?: number }>(response);
  return result.id;
}

/**
 * Update employee
 */
export async function updateEmployee(id: string | number, payload: UpdateEmployeePayload): Promise<void> {
  const response = await fetch(buildUrl(`/employee/${id}`), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  
  await handleResponse<void>(response);
}

/**
 * Delete employee
 */
export async function deleteEmployee(id: string | number): Promise<void> {
  const response = await fetch(buildUrl(`/employee/${id}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  
  await handleResponse<void>(response);
}

/**
 * Get employee page metadata (branches, users, roles, departments)
 */
export async function getEmployeeMetadata(): Promise<{
  branches: Array<{ IDNo: number; BRANCH_NAME: string; BRANCH_CODE: string }>;
  users: Array<{ IDNo: number; USERNAME: string; FIRSTNAME: string; LASTNAME: string; FULLNAME: string }>;
  roles: Array<{ IDNo: number; ROLE: string }>;
  departments: string[];
}> {
  const response = await fetch(buildUrl('/employee/metadata'), {
    credentials: 'include',
    headers: authHeaders(),
  });
  
  return await handleResponse(response);
}

/**
 * Get raw employee data by ID (for editing - includes all fields)
 */
export async function getEmployeeRawData(id: string | number): Promise<EmployeeApiItem> {
  const response = await fetch(buildUrl(`/employee/${id}`), {
    credentials: 'include',
    headers: authHeaders(),
  });
  
  return await handleResponse<EmployeeApiItem>(response);
}
