/**
 * Role-Based Access Control (RBAC) Permissions Matrix
 * Standard Canonical Roles: ADMIN, CHAIRMAN, DOSEN, MAHASISWA, STAF, MEMBER
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { ROLES } from './constants.js';
import { PERMISSIONS } from '../core/permissions.js';
import { CANONICAL_ROLE_PERMISSIONS, CANONICAL_PERMISSIONS } from '../core/services/PermissionService.js';

export { CANONICAL_ROLE_PERMISSIONS, CANONICAL_PERMISSIONS };

export const ROLE_PERMISSIONS = CANONICAL_ROLE_PERMISSIONS;
