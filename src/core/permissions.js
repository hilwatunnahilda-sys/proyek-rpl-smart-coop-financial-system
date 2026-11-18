/**
 * Domain Permissions Enum
 * Granular permissions governing application feature access
 */

export const PERMISSIONS = Object.freeze({
  // Dashboard
  DASHBOARD_ADMIN_VIEW: 'dashboard:admin:view',
  DASHBOARD_EXECUTIVE_VIEW: 'dashboard:executive:view',
  DASHBOARD_MEMBER_VIEW: 'dashboard:member:view',

  // Members Management
  MEMBERS_READ: 'members:read',
  MEMBERS_CREATE: 'members:create',
  MEMBERS_UPDATE: 'members:update',
  MEMBERS_DELETE: 'members:delete',

  // Savings Management
  SAVINGS_READ_OWN: 'savings:read:own',
  SAVINGS_READ_ALL: 'savings:read:all',
  SAVINGS_DEPOSIT: 'savings:deposit',
  SAVINGS_WITHDRAW: 'savings:withdraw',

  // Loans Management
  LOANS_READ_OWN: 'loans:read:own',
  LOANS_READ_ALL: 'loans:read:all',
  LOANS_APPLY: 'loans:apply',
  LOANS_APPROVE: 'loans:approve',
  LOANS_DISBURSE: 'loans:disburse',

  // Installments Management
  INSTALLMENTS_READ_OWN: 'installments:read:own',
  INSTALLMENTS_READ_ALL: 'installments:read:all',
  INSTALLMENTS_PAY: 'installments:pay',

  // Financial Ledger & Cash Book
  TRANSACTIONS_READ_OWN: 'transactions:read:own',
  TRANSACTIONS_READ_ALL: 'transactions:read:all',
  TRANSACTIONS_CREATE: 'transactions:create',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // SHU
  SHU_SIMULATE: 'shu:simulate',
  SHU_VIEW_OWN: 'shu:view:own',

  // System Administration
  SYSTEM_SETTINGS: 'system:settings',
  DATABASE_BACKUP: 'database:backup',
  AUDIT_LOG_VIEW: 'audit:log:view',

  // Telegram Notifications & Integration
  TELEGRAM_LINK_OWN: 'telegram:link:own',
  TELEGRAM_PREFERENCES_MANAGE: 'telegram:preferences:manage',
  TELEGRAM_BROADCAST: 'telegram:broadcast',
});
