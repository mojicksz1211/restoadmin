/**
 * Permission Utilities
 * Matches backend permission logic from restoBackend/middleware/unifiedAuth.js
 */

// Permission levels (role IDs)
export const PERMISSION_LEVELS = {
  ADMIN: 1,           // Administrator - can do everything
  TABLET_APP: 2,      // Tablet App only - blocked from web login
  MANAGER: 3,         // Manager
  WAITER: 14,         // Waiter/Waitress
  CASHIER: 15,        // Cashier
  KITCHEN: 16,        // Kitchen
} as const;

export type PermissionLevel = typeof PERMISSION_LEVELS[keyof typeof PERMISSION_LEVELS];

/**
 * Check if user is admin (permission level 1)
 */
export function isAdmin(userPermissions: number | null | undefined): boolean {
  return userPermissions === PERMISSION_LEVELS.ADMIN;
}

/**
 * Check if user has required permission level(s)
 * Admin (permission 1) always returns true
 * @param userPermissions - User's permission level (role ID)
 * @param requiredPermissions - Required permission level(s) - can be number or array
 */
export function hasPermission(
  userPermissions: number | null | undefined,
  requiredPermissions: number | number[]
): boolean {
  if (!userPermissions) return false;
  
  // Admin can do everything
  if (userPermissions === PERMISSION_LEVELS.ADMIN) return true;
  
  // Check if user has one of the required permissions
  const requiredArray = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];
  
  return requiredArray.includes(userPermissions);
}

/**
 * Check if user can access a specific feature
 * Admin always returns true
 */
export function canAccess(
  userPermissions: number | null | undefined,
  requiredPermissions: number | number[]
): boolean {
  return hasPermission(userPermissions, requiredPermissions);
}

/**
 * Get permission level name
 */
export function getPermissionName(permission: number): string {
  switch (permission) {
    case PERMISSION_LEVELS.ADMIN:
      return 'Administrator';
    case PERMISSION_LEVELS.TABLET_APP:
      return 'Tablet App';
    case PERMISSION_LEVELS.MANAGER:
      return 'Manager';
    case PERMISSION_LEVELS.WAITER:
      return 'Waiter/Waitress';
    case PERMISSION_LEVELS.CASHIER:
      return 'Cashier';
    case PERMISSION_LEVELS.KITCHEN:
      return 'Kitchen';
    default:
      return `Role ${permission}`;
  }
}

/**
 * Check if user can manage branches (admin only)
 */
export function canManageBranches(userPermissions: number | null | undefined): boolean {
  return isAdmin(userPermissions);
}

/**
 * Check if user can manage users (admin or manager)
 */
export function canManageUsers(userPermissions: number | null | undefined): boolean {
  return hasPermission(userPermissions, [PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MANAGER]);
}

/**
 * Check if user can manage menu (admin or manager)
 */
export function canManageMenu(userPermissions: number | null | undefined): boolean {
  return hasPermission(userPermissions, [PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MANAGER]);
}

/**
 * Check if user can manage inventory (admin or manager)
 */
export function canManageInventory(userPermissions: number | null | undefined): boolean {
  return hasPermission(userPermissions, [PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MANAGER]);
}

/**
 * Check if user can manage staff (admin or manager)
 */
export function canManageStaff(userPermissions: number | null | undefined): boolean {
  return hasPermission(userPermissions, [PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MANAGER]);
}

/**
 * Check if user can view orders (most roles except tablet app)
 */
export function canViewOrders(userPermissions: number | null | undefined): boolean {
  if (!userPermissions) return false;
  return userPermissions !== PERMISSION_LEVELS.TABLET_APP;
}

/**
 * Check if user can manage orders (admin, manager, waiter, cashier)
 */
export function canManageOrders(userPermissions: number | null | undefined): boolean {
  return hasPermission(userPermissions, [
    PERMISSION_LEVELS.ADMIN,
    PERMISSION_LEVELS.MANAGER,
    PERMISSION_LEVELS.WAITER,
    PERMISSION_LEVELS.CASHIER
  ]);
}

/**
 * Check if user can view kitchen orders (admin, manager, kitchen)
 */
export function canViewKitchenOrders(userPermissions: number | null | undefined): boolean {
  return hasPermission(userPermissions, [
    PERMISSION_LEVELS.ADMIN,
    PERMISSION_LEVELS.MANAGER,
    PERMISSION_LEVELS.KITCHEN
  ]);
}

/**
 * Check if user can view billing (admin, manager, cashier)
 */
export function canViewBilling(userPermissions: number | null | undefined): boolean {
  return hasPermission(userPermissions, [
    PERMISSION_LEVELS.ADMIN,
    PERMISSION_LEVELS.MANAGER,
    PERMISSION_LEVELS.CASHIER
  ]);
}

/**
 * Check if user can view dashboard (all authenticated users except tablet app)
 */
export function canViewDashboard(userPermissions: number | null | undefined): boolean {
  if (!userPermissions) return false;
  return userPermissions !== PERMISSION_LEVELS.TABLET_APP;
}
