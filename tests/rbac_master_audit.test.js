/**
 * Master RBAC Audit & Role Permission Verification Test Suite
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Verifies all 8 critical test conditions:
 * 1. Login as ADMIN can access /reports route and view.
 * 2. Login as CHAIRMAN can access /reports route and view.
 * 3. Login as MAHASISWA attempting /reports receives 403 Forbidden.
 * 4. Login as DOSEN attempting /reports receives 403 Forbidden.
 * 5. Login as STAF attempting /reports receives 403 Forbidden.
 * 6. Request to backend /api/reports without token receives 401 Unauthorized.
 * 7. Request to backend /api/reports with MAHASISWA token receives 403 Forbidden with structured error.
 * 8. Request to backend /api/reports with ADMIN or CHAIRMAN token succeeds with 200 OK and valid report payload.
 * 
 * Additional validations:
 * - Dotted & Colon permission equivalence (e.g., report.read <-> reports:view)
 * - Strict Case-insensitive role normalizer
 * - Structured audit logs with zero credential/secret leaks
 * - Sidebar navigation filtering hiding unauthorized or hidden routes
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseAdapter } from '../src/infrastructure/database/adapter.js';
import { DatabaseSeeder } from '../src/infrastructure/database/seeder.js';
import { ReportServerHandler } from '../src/infrastructure/reports/reportServerHandler.js';
import { rbac, RbacEngine } from '../src/infrastructure/rbac/rbacEngine.js';
import {
  permissionService,
  normalizeRole,
  resolveEffectiveRole,
  CANONICAL_PERMISSIONS,
  CANONICAL_ROLE_PERMISSIONS
} from '../src/core/services/PermissionService.js';
import { ROUTES } from '../src/presentation/router/routes.js';
import { ROLES, MEMBER_TYPES } from '../src/config/constants.js';
import { requireAuthorization, AuthorizationError } from '../src/infrastructure/rbac/authorizationMiddleware.js';
import { AuditLogService } from '../src/core/services/AuditLogService.js';

describe('Master RBAC & Role Permission Audit Test Suite', () => {
  let db;
  let reportHandler;
  let auditService;

  // Seeded Dev Session Tokens
  const ADMIN_TOKEN = 'ikmi_tok_admin_001_seed_dev_session_token_ikmi_2026';
  const CHAIRMAN_TOKEN = 'ikmi_tok_ketua_001_seed_dev_session_token_ikmi_2026';
  const DOSEN_TOKEN = 'ikmi_tok_dosen_001_seed_dev_session_token_ikmi_2026';
  const MAHASISWA_TOKEN = 'ikmi_tok_mhs_001_seed_dev_session_token_ikmi_2026';
  const STAF_TOKEN = 'ikmi_tok_staf_001_seed_dev_session_token_ikmi_2026';

  // Seeded User Entities
  const adminUser = { id: 'usr-admin-001', name: 'Admin Koperasi IKMI', role: ROLES.ADMIN, status: 'ACTIVE' };
  const chairmanUser = { id: 'usr-ketua-001', name: 'Dr. H. Dadang Sudrajat', role: ROLES.CHAIRMAN, status: 'ACTIVE' };
  const dosenUser = { id: 'usr-dosen-001', name: 'Dr. Siti Nurhaliza', role: ROLES.MEMBER, status: 'ACTIVE' };
  const dosenMember = { id: 'mbr-usr-dosen-001', user_id: 'usr-dosen-001', member_type: MEMBER_TYPES.DOSEN };
  const mhsUser = { id: 'usr-mhs-001', name: 'Ahmad Fauzi', role: ROLES.MEMBER, status: 'ACTIVE' };
  const mhsMember = { id: 'mbr-usr-mhs-001', user_id: 'usr-mhs-001', member_type: MEMBER_TYPES.MAHASISWA };
  const stafUser = { id: 'usr-staf-001', name: 'Budi Santoso', role: ROLES.MEMBER, status: 'ACTIVE' };
  const stafMember = { id: 'mbr-usr-staf-001', user_id: 'usr-staf-001', member_type: MEMBER_TYPES.STAF };

  beforeEach(async () => {
    db = new DatabaseAdapter('test_rbac_master_' + Date.now());
    const seeder = new DatabaseSeeder(db);
    await seeder.seed();

    auditService = new AuditLogService(db);
    reportHandler = new ReportServerHandler({ adapter: db, auditService });
    await reportHandler.init();
  });

  // ==========================================
  // SECTION 1: ROLE NORMALIZATION & CANONICAL MAPPINGS
  // ==========================================
  describe('1. Role Normalization & Institutional Resolution', () => {
    it('1.1 Normalizes role variations to canonical standard', () => {
      assert.strictEqual(normalizeRole('admin'), ROLES.ADMIN);
      assert.strictEqual(normalizeRole('ADMINISTRATOR'), ROLES.ADMIN);
      assert.strictEqual(normalizeRole('Admin Koperasi'), ROLES.ADMIN);

      assert.strictEqual(normalizeRole('chairman'), ROLES.CHAIRMAN);
      assert.strictEqual(normalizeRole('KETUA'), ROLES.CHAIRMAN);
      assert.strictEqual(normalizeRole('ketua stmik'), ROLES.CHAIRMAN);
      assert.strictEqual(normalizeRole('pengurus'), ROLES.CHAIRMAN);

      assert.strictEqual(normalizeRole('DOSEN'), ROLES.DOSEN);
      assert.strictEqual(normalizeRole('lecturer'), ROLES.DOSEN);

      assert.strictEqual(normalizeRole('mahasiswa'), ROLES.MAHASISWA);
      assert.strictEqual(normalizeRole('student'), ROLES.MAHASISWA);
      assert.strictEqual(normalizeRole('MHS'), ROLES.MAHASISWA);

      assert.strictEqual(normalizeRole('staf'), ROLES.STAF);
      assert.strictEqual(normalizeRole('STAFF'), ROLES.STAF);
      assert.strictEqual(normalizeRole('karyawan'), ROLES.STAF);
    });

    it('1.2 Resolves effective role from user and member metadata', () => {
      assert.strictEqual(resolveEffectiveRole(adminUser), ROLES.ADMIN);
      assert.strictEqual(resolveEffectiveRole(chairmanUser), ROLES.CHAIRMAN);
      assert.strictEqual(resolveEffectiveRole(dosenUser, dosenMember), ROLES.DOSEN);
      assert.strictEqual(resolveEffectiveRole(mhsUser, mhsMember), ROLES.MAHASISWA);
      assert.strictEqual(resolveEffectiveRole(stafUser, stafMember), ROLES.STAF);
    });
  });

  // ==========================================
  // SECTION 2: PERMISSION MATRIX & SERVICE EVALUATION
  // ==========================================
  describe('2. Centralized PermissionService hasPermission & hasRole', () => {
    it('2.1 ADMIN has universal permissions across all modules', () => {
      assert.strictEqual(permissionService.hasPermission(adminUser, 'report.read'), true);
      assert.strictEqual(permissionService.hasPermission(adminUser, 'reports:view'), true);
      assert.strictEqual(permissionService.hasPermission(adminUser, 'report.export'), true);
      assert.strictEqual(permissionService.hasPermission(adminUser, 'finance.read'), true);
      assert.strictEqual(permissionService.hasPermission(adminUser, 'member.manage'), true);
      assert.strictEqual(permissionService.hasPermission(adminUser, 'ai.configure'), true);
      assert.strictEqual(permissionService.hasPermission(adminUser, 'system.settings'), true);
    });

    it('2.2 CHAIRMAN has executive oversight & report permissions, but cannot configure system or mutate operations', () => {
      assert.strictEqual(permissionService.hasPermission(chairmanUser, 'report.read'), true);
      assert.strictEqual(permissionService.hasPermission(chairmanUser, 'reports:view'), true);
      assert.strictEqual(permissionService.hasPermission(chairmanUser, 'report.export'), true);
      assert.strictEqual(permissionService.hasPermission(chairmanUser, 'finance.read'), true);
      assert.strictEqual(permissionService.hasPermission(chairmanUser, 'member.read'), true);

      // Denied operations
      assert.strictEqual(permissionService.hasPermission(chairmanUser, 'finance.manage'), false);
      assert.strictEqual(permissionService.hasPermission(chairmanUser, 'member.manage'), false);
      assert.strictEqual(permissionService.hasPermission(chairmanUser, 'ai.configure'), false);
      assert.strictEqual(permissionService.hasPermission(chairmanUser, 'system.settings'), false);
    });

    it('2.3 MAHASISWA has personal permissions only, strictly denied from internal financial reports', () => {
      assert.strictEqual(permissionService.hasPermission(mhsUser, 'member.read.own', mhsMember), true);
      assert.strictEqual(permissionService.hasPermission(mhsUser, 'savings.read.own', mhsMember), true);
      assert.strictEqual(permissionService.hasPermission(mhsUser, 'loan.read.own', mhsMember), true);

      // Strictly denied
      assert.strictEqual(permissionService.hasPermission(mhsUser, 'report.read', mhsMember), false);
      assert.strictEqual(permissionService.hasPermission(mhsUser, 'reports:view', mhsMember), false);
      assert.strictEqual(permissionService.hasPermission(mhsUser, 'report.export', mhsMember), false);
      assert.strictEqual(permissionService.hasPermission(mhsUser, 'finance.read', mhsMember), false);
      assert.strictEqual(permissionService.hasPermission(mhsUser, 'member.read', mhsMember), false);
      assert.strictEqual(permissionService.hasPermission(mhsUser, 'ai.configure', mhsMember), false);
    });

    it('2.4 DOSEN has personal permissions only, strictly denied from internal financial reports', () => {
      assert.strictEqual(permissionService.hasPermission(dosenUser, 'report.read', dosenMember), false);
      assert.strictEqual(permissionService.hasPermission(dosenUser, 'reports:view', dosenMember), false);
      assert.strictEqual(permissionService.hasPermission(dosenUser, 'report.export', dosenMember), false);
      assert.strictEqual(permissionService.hasPermission(dosenUser, 'finance.read', dosenMember), false);
    });

    it('2.5 STAF has personal permissions only, strictly denied from internal financial reports', () => {
      assert.strictEqual(permissionService.hasPermission(stafUser, 'report.read', stafMember), false);
      assert.strictEqual(permissionService.hasPermission(stafUser, 'reports:view', stafMember), false);
      assert.strictEqual(permissionService.hasPermission(stafUser, 'report.export', stafMember), false);
      assert.strictEqual(permissionService.hasPermission(stafUser, 'finance.read', stafMember), false);
    });
  });

  // ==========================================
  // SECTION 3: FRONTEND ROUTE GUARDS & 403 REDIRECTION (CONDITIONS 1-5)
  // ==========================================
  describe('3. Route Guard & Reports View Authorization (Conditions 1 - 5)', () => {
    const reportsRoute = ROUTES.find(r => r.path === '/reports');

    it('Condition 1: Login as ADMIN can open /reports (Route Guard allowed: true)', () => {
      assert.ok(reportsRoute, 'Route /reports must exist');
      const access = rbac.evaluateRouteAccess(adminUser, reportsRoute);
      assert.strictEqual(access.allowed, true, 'Admin must be granted access to /reports');

      // Test Service Authorization Middleware
      assert.doesNotThrow(() => {
        requireAuthorization(adminUser, reportsRoute.allowedRoles, reportsRoute.requiredPermission);
      });
    });

    it('Condition 2: Login as CHAIRMAN can open /reports (Route Guard allowed: true)', () => {
      const access = rbac.evaluateRouteAccess(chairmanUser, reportsRoute);
      assert.strictEqual(access.allowed, true, 'Chairman must be granted access to /reports');

      // Test Service Authorization Middleware
      assert.doesNotThrow(() => {
        requireAuthorization(chairmanUser, reportsRoute.allowedRoles, reportsRoute.requiredPermission);
      });
    });

    it('Condition 3: Login as MAHASISWA opening /reports receives 403 Forbidden', () => {
      const access = rbac.evaluateRouteAccess(mhsUser, reportsRoute, mhsMember);
      assert.strictEqual(access.allowed, false, 'Mahasiswa must be denied access to /reports');
      assert.strictEqual(access.redirect, '/forbidden', 'Mahasiswa must be redirected to /forbidden');

      // Service Authorization Middleware must throw AuthorizationError (403)
      assert.throws(() => {
        requireAuthorization(mhsUser, reportsRoute.allowedRoles, reportsRoute.requiredPermission, mhsMember);
      }, (err) => {
        return err instanceof AuthorizationError && (err.code === 'FORBIDDEN_ROLE' || err.code === 'FORBIDDEN_PERMISSION');
      });
    });

    it('Condition 4: Login as DOSEN opening /reports receives 403 Forbidden', () => {
      const access = rbac.evaluateRouteAccess(dosenUser, reportsRoute, dosenMember);
      assert.strictEqual(access.allowed, false, 'Dosen must be denied access to /reports');
      assert.strictEqual(access.redirect, '/forbidden', 'Dosen must be redirected to /forbidden');

      assert.throws(() => {
        requireAuthorization(dosenUser, reportsRoute.allowedRoles, reportsRoute.requiredPermission, dosenMember);
      }, (err) => {
        return err instanceof AuthorizationError;
      });
    });

    it('Condition 5: Login as STAF opening /reports receives 403 Forbidden', () => {
      const access = rbac.evaluateRouteAccess(stafUser, reportsRoute, stafMember);
      assert.strictEqual(access.allowed, false, 'Staf must be denied access to /reports');
      assert.strictEqual(access.redirect, '/forbidden', 'Staf must be redirected to /forbidden');

      assert.throws(() => {
        requireAuthorization(stafUser, reportsRoute.allowedRoles, reportsRoute.requiredPermission, stafMember);
      }, (err) => {
        return err instanceof AuthorizationError;
      });
    });
  });

  // ==========================================
  // SECTION 4: BACKEND /api/reports RBAC ENFORCEMENT (CONDITIONS 6-8)
  // ==========================================
  describe('4. Backend /api/reports RBAC Enforcement (Conditions 6 - 8)', () => {
    it('Condition 6: Request to backend /api/reports without token receives 401 Unauthorized', async () => {
      const result = await reportHandler.handleReportsRequest({
        method: 'GET',
        url: '/api/reports?type=summary',
        headers: {} // No token provided
      });

      assert.strictEqual(result.status, 401);
      assert.strictEqual(result.body.success, false);
      assert.strictEqual(result.body.code, 'UNAUTHENTICATED');
      assert.ok(result.body.error.includes('Autentikasi diperlukan'));
    });

    it('Condition 6.1: Request with invalid or expired token receives 401 Unauthorized', async () => {
      const result = await reportHandler.handleReportsRequest({
        method: 'GET',
        url: '/api/reports?type=summary',
        headers: { authorization: 'Bearer invalid_random_token_999' }
      });

      assert.strictEqual(result.status, 401);
      assert.strictEqual(result.body.success, false);
      assert.strictEqual(result.body.code, 'SESSION_NOT_FOUND');
    });

    it('Condition 7: Request to backend /api/reports with MAHASISWA token receives 403 Forbidden', async () => {
      const result = await reportHandler.handleReportsRequest({
        method: 'GET',
        url: '/api/reports?type=summary',
        headers: { authorization: `Bearer ${MAHASISWA_TOKEN}` }
      });

      assert.strictEqual(result.status, 403);
      assert.strictEqual(result.body.success, false);
      assert.strictEqual(result.body.code, 'FORBIDDEN_PERMISSION');
      assert.strictEqual(result.body.requestedPermission, 'report.read');
      assert.strictEqual(result.body.effectiveRole, ROLES.MAHASISWA);
      assert.ok(result.body.error.includes('Akses ditolak'));
    });

    it('Condition 7.1: Request to backend /api/reports with DOSEN token receives 403 Forbidden', async () => {
      const result = await reportHandler.handleReportsRequest({
        method: 'GET',
        url: '/api/reports?type=savings',
        headers: { authorization: `Bearer ${DOSEN_TOKEN}` }
      });

      assert.strictEqual(result.status, 403);
      assert.strictEqual(result.body.success, false);
      assert.strictEqual(result.body.code, 'FORBIDDEN_PERMISSION');
      assert.strictEqual(result.body.effectiveRole, ROLES.DOSEN);
    });

    it('Condition 7.2: Request to backend /api/reports with STAF token receives 403 Forbidden', async () => {
      const result = await reportHandler.handleReportsRequest({
        method: 'GET',
        url: '/api/reports?type=loans',
        headers: { authorization: `Bearer ${STAF_TOKEN}` }
      });

      assert.strictEqual(result.status, 403);
      assert.strictEqual(result.body.success, false);
      assert.strictEqual(result.body.code, 'FORBIDDEN_PERMISSION');
      assert.strictEqual(result.body.effectiveRole, ROLES.STAF);
    });

    it('Condition 8: Request to backend /api/reports with ADMIN token succeeds (200 OK)', async () => {
      const result = await reportHandler.handleReportsRequest({
        method: 'GET',
        url: '/api/reports?type=summary',
        headers: { authorization: `Bearer ${ADMIN_TOKEN}` }
      });

      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.success, true);
      assert.strictEqual(result.body.reportType, 'summary');
      assert.ok(result.body.data !== undefined);
      assert.strictEqual(result.body.authenticatedUser.role, ROLES.ADMIN);
      assert.strictEqual(result.body.authenticatedUser.effectiveRole, ROLES.ADMIN);
    });

    it('Condition 8.1: Request to backend /api/reports with CHAIRMAN token succeeds (200 OK)', async () => {
      const result = await reportHandler.handleReportsRequest({
        method: 'GET',
        url: '/api/reports?type=summary',
        headers: { authorization: `Bearer ${CHAIRMAN_TOKEN}` }
      });

      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.success, true);
      assert.strictEqual(result.body.reportType, 'summary');
      assert.ok(result.body.data !== undefined);
      assert.strictEqual(result.body.authenticatedUser.role, ROLES.CHAIRMAN);
      assert.strictEqual(result.body.authenticatedUser.effectiveRole, ROLES.CHAIRMAN);
    });

    it('Condition 8.2: Chairman and Admin can read all individual report types (savings, loans, members)', async () => {
      for (const type of ['members', 'savings', 'loans', 'installments', 'transactions']) {
        const res = await reportHandler.handleReportsRequest({
          method: 'GET',
          url: `/api/reports?type=${type}`,
          headers: { authorization: `Bearer ${CHAIRMAN_TOKEN}` }
        });
        assert.strictEqual(res.status, 200, `Chairman must have access to report type: ${type}`);
        assert.strictEqual(res.body.success, true);
      }
    });
  });

  // ==========================================
  // SECTION 5: AUDIT LOGGING & ZERO SECRETS LEAK
  // ==========================================
  describe('5. Audit Logging Integrity & Zero Secrets Leak Guarantee', () => {
    it('5.1 Records structured audit logs for both ALLOWED and DENIED report requests', async () => {
      // 1. Forbidden attempt
      await reportHandler.handleReportsRequest({
        method: 'GET',
        url: '/api/reports?type=summary',
        headers: { authorization: `Bearer ${MAHASISWA_TOKEN}` }
      });

      // 2. Allowed attempt
      await reportHandler.handleReportsRequest({
        method: 'GET',
        url: '/api/reports?type=summary',
        headers: { authorization: `Bearer ${ADMIN_TOKEN}` }
      });

      const logs = await db.getAll('audit_logs');
      assert.ok(logs.length >= 2, 'At least 2 audit logs must be recorded');

      const deniedLog = logs.find(l => l.status === 'DENIED' && l.module === 'REPORTS');
      assert.ok(deniedLog, 'Denied log must exist');
      assert.strictEqual(deniedLog.effectiveRole || deniedLog.effective_role, ROLES.MAHASISWA);
      assert.strictEqual(deniedLog.metadata.reason, 'FORBIDDEN_PERMISSION');

      const allowedLog = logs.find(l => l.status === 'ALLOWED' && l.module === 'REPORTS');
      assert.ok(allowedLog, 'Allowed log must exist');
      assert.strictEqual(allowedLog.effectiveRole || allowedLog.effective_role, ROLES.ADMIN);
    });

    it('5.2 Audit logs NEVER contain tokens, passwords, or secrets in cleartext', async () => {
      const logs = await db.getAll('audit_logs');
      for (const log of logs) {
        const logString = JSON.stringify(log);
        assert.ok(!logString.includes(ADMIN_TOKEN), 'Admin token must NOT be leaked into audit log');
        assert.ok(!logString.includes(MAHASISWA_TOKEN), 'Mahasiswa token must NOT be leaked into audit log');
        assert.ok(!logString.includes('IKMI@Coop2026!'), 'Password must NOT be leaked into audit log');
      }
    });
  });

  // ==========================================
  // SECTION 6: SIDEBAR VISIBILITY & SUB-ROUTE ISOLATION
  // ==========================================
  describe('6. Sidebar Navigation & Route Masking', () => {
    it('6.1 Sub-routes (add, edit, detail) are marked with hidden: true', () => {
      const addRoute = ROUTES.find(r => r.path === '/admin/members/add');
      const editRoute = ROUTES.find(r => r.path === '/admin/members/edit/:id');
      const detailRoute = ROUTES.find(r => r.path === '/admin/members/:id');

      assert.strictEqual(addRoute?.hidden, true, '/admin/members/add must have hidden: true');
      assert.strictEqual(editRoute?.hidden, true, '/admin/members/edit/:id must have hidden: true');
      assert.strictEqual(detailRoute?.hidden, true, '/admin/members/:id must have hidden: true');
    });

    it('6.2 Reports route is visible to ADMIN and CHAIRMAN, but hidden from MAHASISWA', () => {
      const allowedForAdmin = ROUTES.filter(r => !r.hidden && !r.isPublic && !r.redirect && rbac.evaluateRouteAccess(adminUser, r).allowed);
      const allowedForChairman = ROUTES.filter(r => !r.hidden && !r.isPublic && !r.redirect && rbac.evaluateRouteAccess(chairmanUser, r).allowed);
      const allowedForMhs = ROUTES.filter(r => !r.hidden && !r.isPublic && !r.redirect && rbac.evaluateRouteAccess(mhsUser, r, mhsMember).allowed);

      // Reports in sidebar
      assert.ok(allowedForAdmin.some(r => r.path === '/reports'), '/reports must be in Admin sidebar');
      assert.ok(allowedForChairman.some(r => r.path === '/reports'), '/reports must be in Chairman sidebar');
      assert.ok(!allowedForMhs.some(r => r.path === '/reports'), '/reports must NOT be in Mahasiswa sidebar');

      // Admin console in sidebar
      assert.ok(allowedForAdmin.some(r => r.path === '/admin/console'), '/admin/console must be in Admin sidebar');
      assert.ok(!allowedForChairman.some(r => r.path === '/admin/console'), '/admin/console must NOT be in Chairman sidebar');
      assert.ok(!allowedForMhs.some(r => r.path === '/admin/console'), '/admin/console must NOT be in Mahasiswa sidebar');
    });
  });
});

