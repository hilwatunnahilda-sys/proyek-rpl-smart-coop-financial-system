/**
 * Centralized Permission & Role-Based Access Control (RBAC) Service
 * Single Source of Truth for Institutional Permissions
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Capabilities:
 * 1. Canonical Roles: ADMIN, CHAIRMAN, DOSEN, MAHASISWA, STAF
 * 2. Unified hasPermission(user, permission) supporting both dotted ('report.read') and colon ('reports:view') styles
 * 3. Strict Case-Insensitive Role & Alias Normalizer
 * 4. Comprehensive Audit Logging without leaking secrets
 */

import { ROLES, AI_ROLES, MEMBER_TYPES } from '../../config/constants.js';
import { PERMISSIONS } from '../permissions.js';

/**
 * Canonical Dotted Permission Identifiers
 */
export const CANONICAL_PERMISSIONS = Object.freeze({
  // Reports
  REPORT_READ: 'report.read',
  REPORT_EXPORT: 'report.export',

  // Members Management
  MEMBER_READ: 'member.read',
  MEMBER_MANAGE: 'member.manage',
  MEMBER_READ_OWN: 'member.read.own',

  // Financial Ledger & Cash Book
  FINANCE_READ: 'finance.read',
  FINANCE_MANAGE: 'finance.manage',
  TRANSACTION_READ_OWN: 'transaction.read.own',

  // Savings
  SAVINGS_READ_ALL: 'savings.read.all',
  SAVINGS_MANAGE: 'savings.manage',
  SAVINGS_READ_OWN: 'savings.read.own',

  // Loans & Installments
  LOAN_READ_ALL: 'loan.read.all',
  LOAN_MANAGE: 'loan.manage',
  LOAN_APPROVE: 'loan.approve',
  LOAN_READ_OWN: 'loan.read.own',
  LOAN_APPLY: 'loan.apply',
  INSTALLMENT_READ_ALL: 'installment.read.all',
  INSTALLMENT_READ_OWN: 'installment.read.own',
  INSTALLMENT_PAY: 'installment.pay',

  // Dashboards
  DASHBOARD_ADMIN: 'dashboard.admin.view',
  DASHBOARD_EXECUTIVE: 'dashboard.executive.view',
  DASHBOARD_MEMBER: 'dashboard.member.view',

  // AI & System Configuration
  AI_CONFIGURE: 'ai.configure',
  AI_USE: 'ai.use',
  SYSTEM_SETTINGS: 'system.settings',
  AUDIT_LOG_VIEW: 'audit.log.view',

  // Telegram Notifications
  TELEGRAM_LINK_OWN: 'telegram.link.own',
  TELEGRAM_MANAGE: 'telegram.manage'
});

/**
 * Equivalence Mapping between Dotted notation and Colon notation
 */
const PERMISSION_ALIASES = Object.freeze({
  'report.read': PERMISSIONS.REPORTS_VIEW,
  'reports:view': 'report.read',
  'report.export': PERMISSIONS.REPORTS_EXPORT,
  'reports:export': 'report.export',

  'member.read': PERMISSIONS.MEMBERS_READ,
  'members:read': 'member.read',
  'member.manage': PERMISSIONS.MEMBERS_CREATE,
  'members:create': 'member.manage',
  'members:update': 'member.manage',
  'members:delete': 'member.manage',

  'finance.read': PERMISSIONS.TRANSACTIONS_READ_ALL,
  'transactions:read:all': 'finance.read',
  'finance.manage': PERMISSIONS.TRANSACTIONS_CREATE,
  'transactions:create': 'finance.manage',
  'transaction.read.own': PERMISSIONS.TRANSACTIONS_READ_OWN,
  'transactions:read:own': 'transaction.read.own',

  'savings.read.all': PERMISSIONS.SAVINGS_READ_ALL,
  'savings:read:all': 'savings.read.all',
  'savings.read.own': PERMISSIONS.SAVINGS_READ_OWN,
  'savings:read:own': 'savings.read.own',
  'savings.manage': PERMISSIONS.SAVINGS_DEPOSIT,
  'savings:deposit': 'savings.manage',
  'savings:withdraw': 'savings.manage',

  'loan.read.all': PERMISSIONS.LOANS_READ_ALL,
  'loans:read:all': 'loan.read.all',
  'loan.approve': PERMISSIONS.LOANS_APPROVE,
  'loans:approve': 'loan.approve',
  'loan.manage': PERMISSIONS.LOANS_DISBURSE,
  'loan.read.own': PERMISSIONS.LOANS_READ_OWN,
  'loans:read:own': 'loan.read.own',
  'loan.apply': PERMISSIONS.LOANS_APPLY,
  'loans:apply': 'loan.apply',

  'installment.read.all': PERMISSIONS.INSTALLMENTS_READ_ALL,
  'installments:read:all': 'installment.read.all',
  'installment.read.own': PERMISSIONS.INSTALLMENTS_READ_OWN,
  'installments:read:own': 'installment.read.own',
  'installment.pay': PERMISSIONS.INSTALLMENTS_PAY,
  'installments:pay': 'installment.pay',

  'dashboard.admin.view': PERMISSIONS.DASHBOARD_ADMIN_VIEW,
  'dashboard:admin:view': 'dashboard.admin.view',
  'dashboard.executive.view': PERMISSIONS.DASHBOARD_EXECUTIVE_VIEW,
  'dashboard:executive:view': 'dashboard.executive.view',
  'dashboard.member.view': PERMISSIONS.DASHBOARD_MEMBER_VIEW,
  'dashboard:member:view': 'dashboard.member.view',

  'ai.configure': 'system:settings',
  'system.settings': PERMISSIONS.SYSTEM_SETTINGS,
  'system:settings': 'system.settings',
  'audit.log.view': PERMISSIONS.AUDIT_LOG_VIEW,
  'audit:log:view': 'audit.log.view',

  'telegram.link.own': PERMISSIONS.TELEGRAM_LINK_OWN,
  'telegram:link:own': 'telegram.link.own',
  'telegram.manage': PERMISSIONS.TELEGRAM_PREFERENCES_MANAGE,
  'telegram:preferences:manage': 'telegram.manage'
});

/**
 * Standard Role Canonical Normalizer
 */
export function normalizeRole(rawRole) {
  if (!rawRole) return ROLES.MEMBER;
  const cleaned = String(rawRole).trim().toUpperCase();

  if (cleaned === 'ADMIN' || cleaned === 'ADMINISTRATOR' || cleaned === 'ADMIN KOPERASI') {
    return ROLES.ADMIN;
  }
  if (
    cleaned === 'CHAIRMAN' ||
    cleaned === 'KETUA' ||
    cleaned === 'KETUA STMIK' ||
    cleaned === 'KETUA KOPERASI' ||
    cleaned === 'PENGURUS'
  ) {
    return ROLES.CHAIRMAN;
  }
  if (cleaned === 'DOSEN' || cleaned === 'LECTURER') {
    return ROLES.DOSEN;
  }
  if (cleaned === 'MAHASISWA' || cleaned === 'STUDENT' || cleaned === 'MHS') {
    return ROLES.MAHASISWA;
  }
  if (cleaned === 'STAF' || cleaned === 'STAFF' || cleaned === 'KARYAWAN' || cleaned === 'PEGAWAI') {
    return ROLES.STAF;
  }

  return ROLES.MEMBER;
}

/**
 * Resolves the true effective institutional role from authenticated user and optional member entity
 */
export function resolveEffectiveRole(user, member = null) {
  if (!user) return null;

  // 1. If explicit effectiveRole already resolved
  if (user.effectiveRole) {
    return normalizeRole(user.effectiveRole);
  }

  // 2. Check user.role first
  const normalizedUserRole = normalizeRole(user.role);
  if (normalizedUserRole === ROLES.ADMIN) return ROLES.ADMIN;
  if (normalizedUserRole === ROLES.CHAIRMAN) return ROLES.CHAIRMAN;
  if (normalizedUserRole === ROLES.DOSEN) return ROLES.DOSEN;
  if (normalizedUserRole === ROLES.MAHASISWA) return ROLES.MAHASISWA;
  if (normalizedUserRole === ROLES.STAF) return ROLES.STAF;

  // 3. If user.role is generic MEMBER, check member.member_type
  if (member && member.member_type) {
    const normalizedMemberType = normalizeRole(member.member_type);
    if (normalizedMemberType === ROLES.DOSEN) return ROLES.DOSEN;
    if (normalizedMemberType === ROLES.MAHASISWA) return ROLES.MAHASISWA;
    if (normalizedMemberType === ROLES.STAF) return ROLES.STAF;
  }

  // 4. Check user.member_type if present
  if (user.member_type) {
    const normalizedUserMType = normalizeRole(user.member_type);
    if (normalizedUserMType === ROLES.DOSEN) return ROLES.DOSEN;
    if (normalizedUserMType === ROLES.MAHASISWA) return ROLES.MAHASISWA;
    if (normalizedUserMType === ROLES.STAF) return ROLES.STAF;
  }

  return ROLES.MEMBER;
}

/**
 * Institutional Permissions Matrix
 */
export const CANONICAL_ROLE_PERMISSIONS = Object.freeze({
  // 1. ADMIN: Universal Superuser (Full system administration & all capabilities)
  [ROLES.ADMIN]: [
    CANONICAL_PERMISSIONS.REPORT_READ,
    CANONICAL_PERMISSIONS.REPORT_EXPORT,
    CANONICAL_PERMISSIONS.MEMBER_READ,
    CANONICAL_PERMISSIONS.MEMBER_MANAGE,
    CANONICAL_PERMISSIONS.MEMBER_READ_OWN,
    CANONICAL_PERMISSIONS.FINANCE_READ,
    CANONICAL_PERMISSIONS.FINANCE_MANAGE,
    CANONICAL_PERMISSIONS.TRANSACTION_READ_OWN,
    CANONICAL_PERMISSIONS.SAVINGS_READ_ALL,
    CANONICAL_PERMISSIONS.SAVINGS_MANAGE,
    CANONICAL_PERMISSIONS.SAVINGS_READ_OWN,
    CANONICAL_PERMISSIONS.LOAN_READ_ALL,
    CANONICAL_PERMISSIONS.LOAN_MANAGE,
    CANONICAL_PERMISSIONS.LOAN_APPROVE,
    CANONICAL_PERMISSIONS.LOAN_READ_OWN,
    CANONICAL_PERMISSIONS.LOAN_APPLY,
    CANONICAL_PERMISSIONS.INSTALLMENT_READ_ALL,
    CANONICAL_PERMISSIONS.INSTALLMENT_READ_OWN,
    CANONICAL_PERMISSIONS.INSTALLMENT_PAY,
    CANONICAL_PERMISSIONS.DASHBOARD_ADMIN,
    CANONICAL_PERMISSIONS.DASHBOARD_EXECUTIVE,
    CANONICAL_PERMISSIONS.DASHBOARD_MEMBER,
    CANONICAL_PERMISSIONS.AI_CONFIGURE,
    CANONICAL_PERMISSIONS.AI_USE,
    CANONICAL_PERMISSIONS.SYSTEM_SETTINGS,
    CANONICAL_PERMISSIONS.AUDIT_LOG_VIEW,
    CANONICAL_PERMISSIONS.TELEGRAM_LINK_OWN,
    CANONICAL_PERMISSIONS.TELEGRAM_MANAGE,
    // Include all legacy colon permissions for complete backwards compatibility
    ...Object.values(PERMISSIONS)
  ],

  // 2. CHAIRMAN: Executive Oversight, Monitoring & Financial Reports (Strictly Read-Only for operations)
  [ROLES.CHAIRMAN]: [
    CANONICAL_PERMISSIONS.REPORT_READ,
    CANONICAL_PERMISSIONS.REPORT_EXPORT,
    CANONICAL_PERMISSIONS.MEMBER_READ,
    CANONICAL_PERMISSIONS.MEMBER_READ_OWN,
    CANONICAL_PERMISSIONS.FINANCE_READ,
    CANONICAL_PERMISSIONS.TRANSACTION_READ_OWN,
    CANONICAL_PERMISSIONS.SAVINGS_READ_ALL,
    CANONICAL_PERMISSIONS.SAVINGS_READ_OWN,
    CANONICAL_PERMISSIONS.LOAN_READ_ALL,
    CANONICAL_PERMISSIONS.LOAN_APPROVE,
    CANONICAL_PERMISSIONS.LOAN_READ_OWN,
    CANONICAL_PERMISSIONS.INSTALLMENT_READ_ALL,
    CANONICAL_PERMISSIONS.INSTALLMENT_READ_OWN,
    CANONICAL_PERMISSIONS.DASHBOARD_EXECUTIVE,
    CANONICAL_PERMISSIONS.DASHBOARD_MEMBER,
    CANONICAL_PERMISSIONS.AI_USE,
    CANONICAL_PERMISSIONS.TELEGRAM_LINK_OWN,
    CANONICAL_PERMISSIONS.TELEGRAM_MANAGE,
    // Corresponding legacy colon permissions
    PERMISSIONS.DASHBOARD_EXECUTIVE_VIEW,
    PERMISSIONS.MEMBERS_READ,
    PERMISSIONS.SAVINGS_READ_ALL,
    PERMISSIONS.LOANS_READ_ALL,
    PERMISSIONS.LOANS_APPROVE,
    PERMISSIONS.INSTALLMENTS_READ_ALL,
    PERMISSIONS.TRANSACTIONS_READ_ALL,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SHU_SIMULATE,
    PERMISSIONS.TELEGRAM_LINK_OWN,
    PERMISSIONS.TELEGRAM_PREFERENCES_MANAGE
  ],

  // 3. DOSEN: Personal Portal & Own Financial Records Only (Strictly NO access to other members or internal reports)
  [ROLES.DOSEN]: [
    CANONICAL_PERMISSIONS.MEMBER_READ_OWN,
    CANONICAL_PERMISSIONS.SAVINGS_READ_OWN,
    CANONICAL_PERMISSIONS.LOAN_READ_OWN,
    CANONICAL_PERMISSIONS.LOAN_APPLY,
    CANONICAL_PERMISSIONS.INSTALLMENT_READ_OWN,
    CANONICAL_PERMISSIONS.TRANSACTION_READ_OWN,
    CANONICAL_PERMISSIONS.DASHBOARD_MEMBER,
    CANONICAL_PERMISSIONS.AI_USE,
    CANONICAL_PERMISSIONS.TELEGRAM_LINK_OWN,
    // Corresponding legacy colon permissions
    PERMISSIONS.DASHBOARD_MEMBER_VIEW,
    PERMISSIONS.SAVINGS_READ_OWN,
    PERMISSIONS.LOANS_READ_OWN,
    PERMISSIONS.LOANS_APPLY,
    PERMISSIONS.INSTALLMENTS_READ_OWN,
    PERMISSIONS.TRANSACTIONS_READ_OWN,
    PERMISSIONS.SHU_VIEW_OWN,
    PERMISSIONS.TELEGRAM_LINK_OWN,
    PERMISSIONS.TELEGRAM_PREFERENCES_MANAGE
  ],

  // 4. MAHASISWA: Personal Portal Only (Strictly NO internal reports, NO other members data, NO admin config, NO AI Model Control Center)
  [ROLES.MAHASISWA]: [
    CANONICAL_PERMISSIONS.MEMBER_READ_OWN,
    CANONICAL_PERMISSIONS.SAVINGS_READ_OWN,
    CANONICAL_PERMISSIONS.LOAN_READ_OWN,
    CANONICAL_PERMISSIONS.LOAN_APPLY,
    CANONICAL_PERMISSIONS.INSTALLMENT_READ_OWN,
    CANONICAL_PERMISSIONS.TRANSACTION_READ_OWN,
    CANONICAL_PERMISSIONS.DASHBOARD_MEMBER,
    CANONICAL_PERMISSIONS.AI_USE,
    CANONICAL_PERMISSIONS.TELEGRAM_LINK_OWN,
    // Corresponding legacy colon permissions
    PERMISSIONS.DASHBOARD_MEMBER_VIEW,
    PERMISSIONS.SAVINGS_READ_OWN,
    PERMISSIONS.LOANS_READ_OWN,
    PERMISSIONS.LOANS_APPLY,
    PERMISSIONS.INSTALLMENTS_READ_OWN,
    PERMISSIONS.TRANSACTIONS_READ_OWN,
    PERMISSIONS.SHU_VIEW_OWN,
    PERMISSIONS.TELEGRAM_LINK_OWN,
    PERMISSIONS.TELEGRAM_PREFERENCES_MANAGE
  ],

  // 5. STAF: Personal Profile & Own Transactions (Operational access only when granted by admin)
  [ROLES.STAF]: [
    CANONICAL_PERMISSIONS.MEMBER_READ_OWN,
    CANONICAL_PERMISSIONS.SAVINGS_READ_OWN,
    CANONICAL_PERMISSIONS.LOAN_READ_OWN,
    CANONICAL_PERMISSIONS.LOAN_APPLY,
    CANONICAL_PERMISSIONS.INSTALLMENT_READ_OWN,
    CANONICAL_PERMISSIONS.TRANSACTION_READ_OWN,
    CANONICAL_PERMISSIONS.DASHBOARD_MEMBER,
    CANONICAL_PERMISSIONS.AI_USE,
    CANONICAL_PERMISSIONS.TELEGRAM_LINK_OWN,
    // Corresponding legacy colon permissions
    PERMISSIONS.DASHBOARD_MEMBER_VIEW,
    PERMISSIONS.SAVINGS_READ_OWN,
    PERMISSIONS.LOANS_READ_OWN,
    PERMISSIONS.LOANS_APPLY,
    PERMISSIONS.INSTALLMENTS_READ_OWN,
    PERMISSIONS.TRANSACTIONS_READ_OWN,
    PERMISSIONS.SHU_VIEW_OWN,
    PERMISSIONS.TELEGRAM_LINK_OWN,
    PERMISSIONS.TELEGRAM_PREFERENCES_MANAGE
  ],

  // 6. MEMBER (Legacy General Member Fallback): Same as Dosen/Mhs/Staf personal permissions
  [ROLES.MEMBER]: [
    CANONICAL_PERMISSIONS.MEMBER_READ_OWN,
    CANONICAL_PERMISSIONS.SAVINGS_READ_OWN,
    CANONICAL_PERMISSIONS.LOAN_READ_OWN,
    CANONICAL_PERMISSIONS.LOAN_APPLY,
    CANONICAL_PERMISSIONS.INSTALLMENT_READ_OWN,
    CANONICAL_PERMISSIONS.TRANSACTION_READ_OWN,
    CANONICAL_PERMISSIONS.DASHBOARD_MEMBER,
    CANONICAL_PERMISSIONS.AI_USE,
    CANONICAL_PERMISSIONS.TELEGRAM_LINK_OWN,
    PERMISSIONS.DASHBOARD_MEMBER_VIEW,
    PERMISSIONS.SAVINGS_READ_OWN,
    PERMISSIONS.LOANS_READ_OWN,
    PERMISSIONS.LOANS_APPLY,
    PERMISSIONS.INSTALLMENTS_READ_OWN,
    PERMISSIONS.TRANSACTIONS_READ_OWN,
    PERMISSIONS.SHU_VIEW_OWN,
    PERMISSIONS.TELEGRAM_LINK_OWN,
    PERMISSIONS.TELEGRAM_PREFERENCES_MANAGE
  ]
});

export class PermissionService {
  constructor({ matrix = CANONICAL_ROLE_PERMISSIONS, auditService = null } = {}) {
    this.matrix = matrix;
    this.auditService = auditService;
  }

  /**
   * Returns list of granted permissions for a given role (canonical or alias)
   */
  getPermissionsForRole(rawRole) {
    const role = normalizeRole(rawRole);
    return this.matrix[role] || [];
  }

  /**
   * Centralized Permission Check
   * @param {object} user - Authenticated user entity or object
   * @param {string} permission - Dotted or colon permission identifier
   * @param {object|null} member - Optional member entity to resolve effective sub-role
   * @returns {boolean}
   */
  hasPermission(user, permission, member = null) {
    if (!user) return false;
    if (!permission) return true;

    const role = resolveEffectiveRole(user, member);
    if (!role) return false;

    // ADMIN has universal superuser access
    if (role === ROLES.ADMIN) {
      return true;
    }

    const granted = this.getPermissionsForRole(role);
    const targetPerm = String(permission).trim();

    // Check direct match
    if (granted.includes(targetPerm)) {
      return true;
    }

    // Check alias match (e.g., 'report.read' <-> 'reports:view')
    const alias = PERMISSION_ALIASES[targetPerm];
    if (alias && granted.includes(alias)) {
      return true;
    }

    return false;
  }

  /**
   * Centralized Role Check
   */
  hasRole(user, allowedRoles = [], member = null) {
    if (!user) return false;
    if (!allowedRoles || allowedRoles.length === 0) return true;

    const effectiveRole = resolveEffectiveRole(user, member);
    if (!effectiveRole) return false;

    // ADMIN always matches
    if (effectiveRole === ROLES.ADMIN) return true;

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const normalizedAllowed = rolesArray.map(r => normalizeRole(r));

    // Direct match
    if (normalizedAllowed.includes(effectiveRole)) {
      return true;
    }

    // If allowed contains MEMBER, check if effectiveRole is institutional member
    if (normalizedAllowed.includes(ROLES.MEMBER)) {
      if (
        effectiveRole === ROLES.DOSEN ||
        effectiveRole === ROLES.MAHASISWA ||
        effectiveRole === ROLES.STAF ||
        effectiveRole === ROLES.MEMBER
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Enforces permission and records structured audit log
   */
  async checkPermission(user, permission, moduleName = 'SYSTEM', member = null) {
    const allowed = this.hasPermission(user, permission, member);
    const role = resolveEffectiveRole(user, member);

    if (this.auditService) {
      await this.auditService.logAccess({
        userId: user ? user.id : 'anonymous',
        userName: user ? user.name : 'Unknown',
        role: user ? user.role : 'GUEST',
        effectiveRole: role,
        module: moduleName,
        action: `PERMISSION_CHECK_${permission}`,
        status: allowed ? 'ALLOWED' : 'DENIED',
        metadata: { permissionRequested: permission }
      });
    }

    return allowed;
  }
}

// Global Singleton Instance
export const permissionService = new PermissionService();

