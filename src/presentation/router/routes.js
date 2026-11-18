/**
 * Application Routes Configuration
 * Protected Route Guards for Admin, Chairman, and Member Areas
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { ROLES } from '../../config/constants.js';
import { PERMISSIONS } from '../../core/permissions.js';

export const ROUTES = [
  // 1. Public Authentication Route
  {
    path: '/login',
    title: 'Masuk ke Sistem',
    isPublic: true,
    view: 'LoginView'
  },

  // 2. Default Redirect
  {
    path: '/',
    redirect: '/dashboard'
  },

  // 3. Common Authenticated Dashboard
  {
    path: '/dashboard',
    title: 'Dashboard & Session Inspector',
    icon: 'dashboard',
    allowedRoles: [ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.MEMBER],
    view: 'DashboardShellView'
  },

  // 4. Admin Protected Area (Strictly ADMIN only)
  {
    path: '/admin/console',
    title: 'Konsol Admin Koperasi',
    icon: 'admin',
    allowedRoles: [ROLES.ADMIN],
    requiredPermission: PERMISSIONS.SYSTEM_SETTINGS,
    view: 'AdminAreaView'
  },
  {
    path: '/admin/ai-control',
    title: 'AI Model Control Center',
    icon: 'ai',
    allowedRoles: [ROLES.ADMIN],
    requiredPermission: PERMISSIONS.SYSTEM_SETTINGS,
    view: 'AiModelControlCenterView'
  },

  // 5. Chairman Protected Area (CHAIRMAN & ADMIN)
  {
    path: '/chairman/monitoring',
    title: 'Monitoring Eksekutif Ketua',
    icon: 'chairman',
    allowedRoles: [ROLES.CHAIRMAN, ROLES.ADMIN],
    requiredPermission: PERMISSIONS.DASHBOARD_EXECUTIVE_VIEW,
    view: 'ChairmanAreaView'
  },

  // 6. Member Portal & Profile (MEMBER, CHAIRMAN, ADMIN)
  {
    path: '/member/profile',
    title: 'Profil & Portal Anggota',
    icon: 'member',
    allowedRoles: [ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.MEMBER],
    requiredPermission: PERMISSIONS.DASHBOARD_MEMBER_VIEW,
    view: 'MemberProfileView'
  },

  // 6.1 Member Management (ADMIN & CHAIRMAN monitoring)
  {
    path: '/admin/members',
    title: 'Manajemen Anggota',
    icon: 'admin',
    allowedRoles: [ROLES.ADMIN, ROLES.CHAIRMAN],
    requiredPermission: 'member.read',
    view: 'MemberListView'
  },
  {
    path: '/admin/members/add',
    title: 'Tambah Anggota',
    icon: 'admin',
    allowedRoles: [ROLES.ADMIN],
    hidden: true,
    view: 'MemberAddView'
  },
  {
    path: '/admin/members/edit/:id',
    title: 'Edit Anggota',
    icon: 'admin',
    allowedRoles: [ROLES.ADMIN],
    hidden: true,
    view: 'MemberEditView'
  },
  {
    path: '/admin/members/:id',
    title: 'Detail Anggota',
    icon: 'admin',
    allowedRoles: [ROLES.ADMIN, ROLES.CHAIRMAN],
    hidden: true,
    view: 'MemberDetailView'
  },

  // 6.2 Loan & Installment Management (ADMIN & CHAIRMAN monitoring)
  {
    path: '/admin/loans',
    title: 'Manajemen Pinjaman & Angsuran',
    icon: 'loan',
    allowedRoles: [ROLES.ADMIN, ROLES.CHAIRMAN],
    requiredPermission: PERMISSIONS.LOANS_READ_ALL,
    view: 'AdminLoanView'
  },

  // 6.3 Member Self-Service Loan Portal (MEMBER & ADMIN)
  {
    path: '/member/loans',
    title: 'Pinjaman & Angsuran Saya',
    icon: 'loan',
    allowedRoles: [ROLES.MEMBER, ROLES.ADMIN],
    requiredPermission: PERMISSIONS.LOANS_READ_OWN,
    view: 'MemberLoanView'
  },

  // 6.4 Financial Transactions & Cash Book (ADMIN & CHAIRMAN)
  {
    path: '/admin/transactions',
    title: 'Buku Kas & Mutasi Transaksi',
    icon: 'transaction',
    allowedRoles: [ROLES.ADMIN, ROLES.CHAIRMAN],
    requiredPermission: PERMISSIONS.TRANSACTIONS_READ_ALL,
    view: 'TransactionListView'
  },

  // 6.5 Member Financial Transactions History (MEMBER & ADMIN)
  {
    path: '/member/transactions',
    title: 'Histori Transaksi Keuangan',
    icon: 'transaction',
    allowedRoles: [ROLES.MEMBER, ROLES.ADMIN],
    requiredPermission: PERMISSIONS.TRANSACTIONS_READ_OWN,
    view: 'MemberTransactionView'
  },

  // 6.6 Reports & Financial Statements (ADMIN & CHAIRMAN ONLY)
  {
    path: '/reports',
    title: 'Laporan & Rekapitulasi',
    icon: 'report',
    allowedRoles: [ROLES.ADMIN, ROLES.CHAIRMAN],
    requiredPermission: 'report.read',
    view: 'ReportsView'
  },

  // 6.7 About Application & Developer Identity (ALL ROLES)
  {
    path: '/about',
    title: 'Tentang Aplikasi',
    icon: 'about',
    allowedRoles: [ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.MEMBER],
    view: 'AboutView'
  },

  // 6.8 Telegram Bot Notification Settings (ALL ROLES)
  {
    path: '/settings/telegram',
    title: 'Notifikasi Telegram',
    icon: 'telegram',
    allowedRoles: [ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.MEMBER],
    requiredPermission: PERMISSIONS.TELEGRAM_LINK_OWN,
    view: 'TelegramSettingsView'
  },

  // 7. Error & Intercept Routes
  {
    path: '/forbidden',
    title: '403 - Akses Ditolak (RBAC Guard)',
    isPublic: false,
    view: 'ForbiddenView'
  },
  {
    path: '/not-found',
    title: '404 - Halaman Tidak Ditemukan',
    isPublic: true,
    view: 'NotFoundView'
  }
];
