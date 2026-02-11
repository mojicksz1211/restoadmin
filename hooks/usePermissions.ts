import { useMemo } from 'react';
import { AuthUser } from '../types';
import {
  isAdmin,
  hasPermission,
  canAccess,
  canManageBranches,
  canManageUsers,
  canManageMenu,
  canManageInventory,
  canManageStaff,
  canViewOrders,
  canManageOrders,
  canViewKitchenOrders,
  canViewBilling,
  canViewDashboard,
  getPermissionName,
  PERMISSION_LEVELS,
} from '../utils/permissions';

/**
 * React hook for permission checking
 * Usage: const { isAdmin, hasPermission, canManageUsers } = usePermissions(user);
 */
export function usePermissions(user: AuthUser | null) {
  const userPermissions = user?.permissions ?? null;

  return useMemo(() => ({
    // Permission level
    permissions: userPermissions,
    permissionName: userPermissions ? getPermissionName(userPermissions) : null,
    
    // Admin check
    isAdmin: isAdmin(userPermissions),
    
    // Permission checks
    hasPermission: (requiredPermissions: number | number[]) => 
      hasPermission(userPermissions, requiredPermissions),
    
    canAccess: (requiredPermissions: number | number[]) => 
      canAccess(userPermissions, requiredPermissions),
    
    // Feature-specific checks
    canManageBranches: canManageBranches(userPermissions),
    canManageUsers: canManageUsers(userPermissions),
    canManageMenu: canManageMenu(userPermissions),
    canManageInventory: canManageInventory(userPermissions),
    canManageStaff: canManageStaff(userPermissions),
    canViewOrders: canViewOrders(userPermissions),
    canManageOrders: canManageOrders(userPermissions),
    canViewKitchenOrders: canViewKitchenOrders(userPermissions),
    canViewBilling: canViewBilling(userPermissions),
    canViewDashboard: canViewDashboard(userPermissions),
    
    // Constants
    PERMISSION_LEVELS,
  }), [userPermissions]);
}
