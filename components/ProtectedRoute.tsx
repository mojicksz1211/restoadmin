import React from 'react';
import { AuthUser } from '../types';
import { hasPermission } from '../utils/permissions';

interface ProtectedRouteProps {
  user: AuthUser | null;
  requiredPermissions?: number | number[];
  children: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * Protected Route Component
 * Protects routes based on authentication and permissions
 * Returns null if user doesn't have access (component won't render)
 * 
 * @example
 * <ProtectedRoute user={user} requiredPermissions={PERMISSION_LEVELS.ADMIN}>
 *   <AdminPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  user,
  requiredPermissions,
  children,
  requireAuth = true,
}: ProtectedRouteProps) {
  // Check authentication
  if (requireAuth && !user) {
    return null;
  }

  // Check permissions if required
  if (user && requiredPermissions !== undefined) {
    if (!hasPermission(user.permissions, requiredPermissions)) {
      // Return null to hide the component
      return null;
    }
  }

  return <>{children}</>;
}
