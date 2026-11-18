/**
 * Authorization Middleware (Backend & Service Layer Enforcement)
 * Enforces canonical role and permission checks at the service execution level
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { rbac } from './rbacEngine.js';
import { ROLES } from '../../config/constants.js';
import { permissionService, normalizeRole, resolveEffectiveRole } from '../../core/services/PermissionService.js';

export { normalizeRole, resolveEffectiveRole, permissionService };

export class AuthorizationError extends Error {
  constructor(message, code = 'FORBIDDEN', required = null) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
    this.required = required;
  }
}

/**
 * Backend-Style Service-Level Authorization Guard
 * Throws an AuthorizationError if the user is missing required roles or permissions
 * @param {object} user - Authenticated user entity or session object
 * @param {Array<string>|string} allowedRoles - Permitted roles (canonical or aliases)
 * @param {string} requiredPermission - Required permission identifier (dotted or colon format)
 * @param {object|null} member - Optional member entity
 */
export function requireAuthorization(user, allowedRoles = [], requiredPermission = null, member = null) {
  if (!user) {
    throw new AuthorizationError('Autentikasi diperlukan. Sesi Anda tidak valid atau telah berakhir.', 'UNAUTHENTICATED');
  }

  const effectiveRole = resolveEffectiveRole(user, member);

  if (allowedRoles && allowedRoles.length > 0) {
    if (!permissionService.hasRole(user, allowedRoles, member)) {
      throw new AuthorizationError(
        `Akses ditolak. Fitur ini memerlukan role: ${Array.isArray(allowedRoles) ? allowedRoles.join(', ') : allowedRoles}. Role Anda: ${effectiveRole}`,
        'FORBIDDEN_ROLE',
        allowedRoles
      );
    }
  }

  if (requiredPermission) {
    if (!permissionService.hasPermission(user, requiredPermission, member)) {
      throw new AuthorizationError(
        `Akses ditolak. Izin [${requiredPermission}] tidak ditemukan untuk role ${effectiveRole}.`,
        'FORBIDDEN_PERMISSION',
        requiredPermission
      );
    }
  }

  return true;
}

/**
 * Enforces Member Data Isolation
 * Asserts that a non-admin/non-chairman user can only read or write their own member data
 * Admins and Chairmen can access any member's data
 * @param {object} requestingUser
 * @param {string} targetUserId
 * @param {object|null} member
 */
export function enforceMemberDataIsolation(requestingUser, targetUserId, member = null) {
  if (!requestingUser) {
    throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
  }

  const effectiveRole = resolveEffectiveRole(requestingUser, member);

  // Admins and Chairmen have supervisor privileges
  if (effectiveRole === ROLES.ADMIN || effectiveRole === ROLES.CHAIRMAN) {
    return true;
  }

  // Regular members can only access their own user ID
  if (requestingUser.id !== targetUserId) {
    throw new AuthorizationError(
      'Isolasi Data Anggota: Anda hanya memiliki izin untuk mengakses data profil Anda sendiri.',
      'DATA_ISOLATION_VIOLATION'
    );
  }

  return true;
}
