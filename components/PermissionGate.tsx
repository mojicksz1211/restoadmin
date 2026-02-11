import React from 'react';
import { AuthUser } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { hasPermission } from '../utils/permissions';

interface PermissionGateProps {
  user: AuthUser | null;
  requiredPermissions?: number | number[];
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Permission Gate Component
 * Conditionally renders children based on user permissions
 * 
 * @example
 * <PermissionGate user={user} requiredPermissions={PERMISSION_LEVELS.ADMIN}>
 *   <AdminButton />
 * </PermissionGate>
 * 
 * @example
 * <PermissionGate user={user} requireAdmin fallback={<div>Admin only</div>}>
 *   <AdminPanel />
 * </PermissionGate>
 */
export function PermissionGate({
  user,
  requiredPermissions,
  requireAdmin = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { isAdmin, hasPermission: checkPermission } = usePermissions(user);

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return <>{fallback}</>;
  }

  // Check specific permissions
  if (requiredPermissions !== undefined) {
    if (!checkPermission(requiredPermissions)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
