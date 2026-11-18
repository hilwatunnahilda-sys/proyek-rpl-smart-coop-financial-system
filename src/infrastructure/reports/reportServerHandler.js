/**
 * Server-Side Reports API Handler & Strict RBAC Guard
 * Enforces server-side authentication, canonical permissions ('report.read', 'report.export'),
 * structured audit logging, and zero-leak guarantees.
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { DatabaseAdapter } from '../database/adapter.js';
import { DatabaseSeeder } from '../database/seeder.js';
import { ReportService } from '../../core/services/ReportService.js';
import { AuditLogService } from '../../core/services/AuditLogService.js';
import { permissionService, resolveEffectiveRole } from '../../core/services/PermissionService.js';
import { ROLES } from '../../config/constants.js';

export class ReportServerHandler {
  constructor({ adapter = null, auditService = null, reportService = null } = {}) {
    this.db = adapter || new DatabaseAdapter();
    this.auditService = auditService || new AuditLogService(this.db);
    this.reportService = reportService || new ReportService(this.db);
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;

    try {
      const existingUsers = await this.db.getAll('users');
      if (!existingUsers || existingUsers.length === 0) {
        const seeder = new DatabaseSeeder(this.db);
        await seeder.seed();
      }

      await this._ensureDefaultSessions();
      this._initialized = true;
    } catch (err) {
      console.error('[ReportServerHandler] Initialization error:', err);
    }
  }

  async _ensureDefaultSessions() {
    const existingSessions = await this.db.getAll('sessions');
    const existingTokens = new Set(existingSessions.map(s => s.token));

    const defaultDevTokens = [
      {
        token: 'ikmi_tok_admin_001_seed_dev_session_token_ikmi_2026',
        user_id: 'usr-admin-001',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false
      },
      {
        token: 'ikmi_tok_ketua_001_seed_dev_session_token_ikmi_2026',
        user_id: 'usr-ketua-001',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false
      },
      {
        token: 'ikmi_tok_dosen_001_seed_dev_session_token_ikmi_2026',
        user_id: 'usr-dosen-001',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false
      },
      {
        token: 'ikmi_tok_mhs_001_seed_dev_session_token_ikmi_2026',
        user_id: 'usr-mhs-001',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false
      },
      {
        token: 'ikmi_tok_staf_001_seed_dev_session_token_ikmi_2026',
        user_id: 'usr-staf-001',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false
      }
    ];

    for (const session of defaultDevTokens) {
      if (!existingTokens.has(session.token)) {
        await this.db.insert('sessions', session);
      }
    }
  }

  /**
   * Authenticates session token against backend database session store
   */
  async authenticateRequest(headers = {}, body = {}) {
    await this.init();

    let token = null;

    // 1. Authorization: Bearer <token>
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.trim().split(/\s+/);
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    // 2. X-Session-Token
    if (!token) {
      token = headers['x-session-token'] || headers['X-Session-Token'];
    }

    // 3. Body fallback
    if (!token && body && body.token) {
      token = body.token;
    }

    if (!token) {
      return {
        authenticated: false,
        status: 401,
        code: 'UNAUTHENTICATED',
        error: 'Autentikasi diperlukan. Sesi Anda tidak valid atau telah berakhir. Harap sertakan session token.'
      };
    }

    const session = await this.db.findById('sessions', token, 'token');
    if (!session) {
      return {
        authenticated: false,
        status: 401,
        code: 'SESSION_NOT_FOUND',
        error: 'Sesi tidak ditemukan dalam basis data sistem. Akses ditolak.'
      };
    }

    if (session.is_revoked) {
      return {
        authenticated: false,
        status: 401,
        code: 'SESSION_REVOKED',
        error: 'Sesi telah dicabut (revoked) karena logout atau pembatalan keamanan. Silakan login kembali.'
      };
    }

    if (new Date(session.expires_at) <= new Date()) {
      return {
        authenticated: false,
        status: 401,
        code: 'SESSION_EXPIRED',
        error: 'Sesi Anda telah kedaluwarsa (expired). Silakan login kembali untuk melanjutkan.'
      };
    }

    const user = await this.db.findById('users', session.user_id, 'id');
    if (!user || user.status !== 'ACTIVE') {
      return {
        authenticated: false,
        status: 403,
        code: 'USER_INACTIVE',
        error: `Akun pengguna tidak aktif atau berstatus ${user ? user.status : 'TIDAK DITEMUKAN'}.`
      };
    }

    const member = await this.db.findById('members', user.id, 'user_id');
    const effectiveRole = resolveEffectiveRole(user, member);

    return {
      authenticated: true,
      token,
      user,
      member: member || null,
      effectiveRole,
      session
    };
  }

  /**
   * Main Dispatcher for GET /api/reports and POST /api/reports
   */
  async handleReportsRequest({ method = 'GET', url = '', headers = {}, body = {}, clientIp = '127.0.0.1' } = {}) {
    await this.init();

    // Parse URL and query params
    const [pathPart, queryPart] = url.split('?');
    const params = new URLSearchParams(queryPart || '');
    const reportType = params.get('type') || body.type || 'summary';
    const action = params.get('action') || body.action || 'read'; // 'read' or 'export'
    const requestedPermission = action === 'export' ? 'report.export' : 'report.read';

    // 1. Authenticate Request
    const authResult = await this.authenticateRequest(headers, body);

    if (!authResult.authenticated) {
      // Structured Audit Log for unauthenticated access attempt (Zero secrets logged)
      await this.auditService.logAccess({
        userId: 'anonymous',
        userName: 'Anonymous/Unauthenticated',
        role: 'GUEST',
        effectiveRole: 'GUEST',
        module: 'REPORTS',
        action: `REPORT_${action.toUpperCase()}`,
        endpoint: pathPart || '/api/reports',
        status: 'DENIED',
        metadata: {
          requestedPermission,
          reportType,
          reason: authResult.code
        },
        ip: clientIp
      });

      return {
        status: authResult.status || 401,
        body: {
          success: false,
          status: authResult.status || 401,
          code: authResult.code || 'UNAUTHENTICATED',
          error: authResult.error
        }
      };
    }

    const { user, member, effectiveRole } = authResult;

    // 2. RBAC Permission Check
    const isPermitted = permissionService.hasPermission(user, requestedPermission, member);

    if (!isPermitted) {
      // Structured Audit Log for forbidden attempt (Zero secrets logged)
      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole: effectiveRole,
        module: 'REPORTS',
        action: `REPORT_${action.toUpperCase()}`,
        endpoint: pathPart || '/api/reports',
        status: 'DENIED',
        metadata: {
          requestedPermission,
          reportType,
          reason: 'FORBIDDEN_PERMISSION'
        },
        ip: clientIp
      });

      return {
        status: 403,
        body: {
          success: false,
          status: 403,
          code: 'FORBIDDEN_PERMISSION',
          error: `Akses ditolak (RBAC Guard). Role ${effectiveRole} tidak memiliki izin [${requestedPermission}] untuk mengakses laporan keuangan internal koperasi.`,
          requestedPermission,
          effectiveRole
        }
      };
    }

    // 3. Execution & Data Retrieval
    try {
      const filterParams = {
        startDate: params.get('startDate') || body.startDate || null,
        endDate: params.get('endDate') || body.endDate || null,
        status: params.get('status') || body.status || null,
        category: params.get('category') || body.category || null,
        savingType: params.get('savingType') || body.savingType || null,
        transactionType: params.get('transactionType') || body.transactionType || null,
        page: parseInt(params.get('page') || body.page || '1', 10),
        limit: parseInt(params.get('limit') || body.limit || '10', 10),
        search: params.get('search') || body.search || null
      };

      let reportData = null;

      switch (reportType) {
        case 'members':
          reportData = await this.reportService.getMembersReport(filterParams);
          break;
        case 'savings':
          reportData = await this.reportService.getSavingsReport(filterParams);
          break;
        case 'loans':
          reportData = await this.reportService.getLoansReport(filterParams);
          break;
        case 'installments':
          reportData = await this.reportService.getInstallmentsReport(filterParams);
          break;
        case 'transactions':
          reportData = await this.reportService.getTransactionsReport(filterParams);
          break;
        case 'income':
          reportData = await this.reportService.getIncomeReport(filterParams);
          break;
        case 'expense':
          reportData = await this.reportService.getExpenseReport(filterParams);
          break;
        case 'summary':
        default:
          reportData = await this.reportService.getCashFlowSummaryReport(filterParams);
          break;
      }

      // Audit Log for successful report access
      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole: effectiveRole,
        module: 'REPORTS',
        action: `REPORT_${action.toUpperCase()}`,
        endpoint: pathPart || '/api/reports',
        status: 'ALLOWED',
        metadata: {
          requestedPermission,
          reportType
        },
        ip: clientIp
      });

      return {
        status: 200,
        body: {
          success: true,
          reportType,
          action,
          data: reportData,
          authenticatedUser: {
            id: user.id,
            name: user.name,
            role: user.role,
            effectiveRole
          }
        }
      };
    } catch (err) {
      console.error('[ReportServerHandler] Error fetching report:', err);
      return {
        status: 500,
        body: {
          success: false,
          status: 500,
          error: 'Gagal memproses data laporan: ' + err.message
        }
      };
    }
  }
}

