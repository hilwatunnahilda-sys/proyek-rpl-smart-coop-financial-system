/**
 * Role-Based Access Control (RBAC) Engine
 * Evaluates permissions and access guards across the system
 * Integrates directly with Centralized PermissionService
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { ROLE_PERMISSIONS } from '../../config/rbac.config.js';
import { ROLES } from '../../config/constants.js';
import { permissionService, normalizeRole, resolveEffectiveRole } from '../../core/services/PermissionService.js';

export class RbacEngine {
  constructor(permissionsMap = ROLE_PERMISSIONS, permService = permissionService) {
    this.permissionsMap = permissionsMap;
    this.permissionService = permService;
  }

  getPermissionsForRole(role) {
    if (!role) return [];
    return this.permissionService.getPermissionsForRole(role);
  }

  can(user, requiredPermission, member = null) {
    if (!user) return false;
    if (!requiredPermission) return true;
    return this.permissionService.hasPermission(user, requiredPermission, member);
  }

  hasRole(user, allowedRoles, member = null) {
    if (!user) return false;
    if (!allowedRoles || allowedRoles.length === 0) return true;
    return this.permissionService.hasRole(user, allowedRoles, member);
  }

  evaluateRouteAccess(user, routeConfig, member = null) {
    if (!routeConfig) return { allowed: true };

    // Public routes require no auth
    if (routeConfig.isPublic) {
      return { allowed: true };
    }

    // Must be authenticated for private routes
    if (!user) {
      return { allowed: false, reason: 'UNAUTHENTICATED', redirect: '/login' };
    }

    // Role check
    if (routeConfig.allowedRoles && routeConfig.allowedRoles.length > 0) {
      if (!this.hasRole(user, routeConfig.allowedRoles, member)) {
        return {
          allowed: false,
          reason: 'FORBIDDEN_ROLE',
          redirect: '/forbidden',
          requiredRoles: routeConfig.allowedRoles
        };
      }
    }

    // Permission check
    if (routeConfig.requiredPermission) {
      if (!this.can(user, routeConfig.requiredPermission, member)) {
        return {
          allowed: false,
          reason: 'FORBIDDEN_PERMISSION',
          redirect: '/forbidden',
          requiredPermission: routeConfig.requiredPermission
        };
      }
    }

    return { allowed: true };
  }
}

export const rbac = new RbacEngine();
export { permissionService, normalizeRole, resolveEffectiveRole };
