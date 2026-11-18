/**
 * Server-Side AI Chat Handler & Security Guard
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Handles:
 * 1. Session Token Authentication from HTTP headers
 * 2. Identity Verification & User/Member Entity Resolution from Database
 * 3. Rate Limiting per IP/Token
 * 4. Dispatching to AiBackendCoordinator for Authorized RBAC Database Reads
 * 5. Multi-Model Endpoints (Models, Control Center Config, Routing, Testing, Telemetry)
 * 6. Safe Error Sanitization
 */

import { DatabaseAdapter } from '../database/adapter.js';
import { DatabaseSeeder } from '../database/seeder.js';
import { AiBackendCoordinator } from './aiBackendCoordinator.js';
import { ROLES, AI_ROLES } from '../../config/constants.js';
import { resolveEffectiveRole } from '../rbac/authorizationMiddleware.js';
import { AuditLogService } from '../../core/services/AuditLogService.js';

export class AiChatServerHandler {
  constructor({ aiService = null, adapter = null } = {}) {
    this.db = adapter || new DatabaseAdapter();
    this.aiService = aiService;
    this.auditService = new AuditLogService(this.db);
    this.coordinator = new AiBackendCoordinator({
      aiService: this.aiService,
      adapter: this.db,
      auditService: this.auditService
    });
    this.modelManager = this.coordinator.modelManager;
    this.modelRouter = this.coordinator.modelRouter;
    this.rateLimitMap = new Map();
    this._initialized = false;
  }

  /**
   * Initialize server-side database with seed data if needed
   */
  async init() {
    if (this._initialized) return;

    try {
      const existingUsers = await this.db.getAll('users');
      if (!existingUsers || existingUsers.length === 0) {
        const seeder = new DatabaseSeeder(this.db);
        await seeder.seed();
      }

      // Ensure default development test sessions exist in server sessions table
      await this._ensureDefaultSessions();
      if (this.modelManager) await this.modelManager.init();
      if (this.modelRouter) await this.modelRouter.init();
      this._initialized = true;
    } catch (err) {
      console.error('[AiChatServerHandler] Initialization error:', err);
    }
  }

  /**
   * Pre-populates standard dev sessions for fast testing & seamless dev experience
   */
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
   * Sync tables or active session from client to server database
   */
  async syncData(payload = {}) {
    await this.init();

    if (payload.tables && typeof payload.tables === 'object') {
      for (const [table, records] of Object.entries(payload.tables)) {
        if (Array.isArray(records)) {
          await this.db.saveAll(table, records);
        }
      }
      return { success: true, syncedTables: Object.keys(payload.tables) };
    }

    if (payload.session && payload.session.token) {
      const existing = await this.db.findById('sessions', payload.session.token, 'token');
      if (existing) {
        await this.db.update('sessions', payload.session.token, payload.session, 'token');
      } else {
        await this.db.insert('sessions', payload.session);
      }
      return { success: true, syncedSession: payload.session.token };
    }

    return { success: false, error: 'No valid data provided to sync.' };
  }

  /**
   * Authenticates the incoming request via Bearer token
   */
  async authenticateRequest(headers = {}, body = {}) {
    await this.init();

    let token = null;

    // 1. Check Authorization: Bearer <token>
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.trim().split(/\s+/);
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    // 2. Check X-Session-Token
    if (!token) {
      token = headers['x-session-token'] || headers['X-Session-Token'];
    }

    // 3. Check body.token (optional fallback)
    if (!token && body && body.token) {
      token = body.token;
    }

    if (!token) {
      return {
        authenticated: false,
        status: 401,
        error: 'Autentikasi diperlukan. Sesi Anda tidak valid atau telah berakhir. Silakan login terlebih dahulu.'
      };
    }

    // Lookup token in database sessions table
    const session = await this.db.findById('sessions', token, 'token');
    if (!session) {
      return {
        authenticated: false,
        status: 401,
        error: 'Sesi tidak ditemukan dalam basis data sistem. Akses ditolak.'
      };
    }

    if (session.is_revoked) {
      return {
        authenticated: false,
        status: 401,
        error: 'Sesi telah dicabut (revoked) karena logout atau pembatalan keamanan. Silakan login kembali.'
      };
    }

    if (new Date(session.expires_at) <= new Date()) {
      return {
        authenticated: false,
        status: 401,
        error: 'Sesi Anda telah kedaluwarsa (expired). Silakan login kembali untuk melanjutkan.'
      };
    }

    // Lookup User
    const user = await this.db.findById('users', session.user_id, 'id');
    if (!user || user.status !== 'ACTIVE') {
      return {
        authenticated: false,
        status: 403,
        error: `Akun pengguna tidak aktif atau berstatus ${user ? user.status : 'TIDAK DITEMUKAN'}.`
      };
    }

    // Lookup Member record if available
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
   * Rate limiting check: max 30 requests per 60 seconds
   */
  checkRateLimit(key, maxRequests = 30, windowMs = 60000) {
    const now = Date.now();
    const timestamps = this.rateLimitMap.get(key) || [];
    const validTimestamps = timestamps.filter(t => (now - t) < windowMs);

    if (validTimestamps.length >= maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.rateLimitMap.set(key, validTimestamps);
    return true;
  }

  /**
   * Primary entry point for POST /api/ai/chat
   */
  async handleChatRequest(body = {}, headers = {}, clientIp = '127.0.0.1') {
    await this.init();

    // 1. Rate Limiting Check
    const rateLimitKey = headers['authorization'] || clientIp;
    if (!this.checkRateLimit(rateLimitKey)) {
      return {
        status: 429,
        body: {
          success: false,
          error: 'Batas frekuensi permintaan (Rate Limit) terlampaui. Harap tunggu sebentar sebelum mengirim pesan baru.'
        }
      };
    }

    // 2. Authentication & RBAC Identity Resolution
    const authResult = await this.authenticateRequest(headers, body);
    if (!authResult.authenticated) {
      return {
        status: authResult.status,
        body: {
          success: false,
          error: authResult.error
        }
      };
    }

    // 3. Message Validation
    const message = body.message;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Pesan (message) wajib diisi.'
        }
      };
    }

    if (message.length > 2000) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Panjang pesan melebihi batas maksimal 2.000 karakter.'
        }
      };
    }

    // 4. Process Chat with Authorized Coordinator & Multi-Model Routing
    try {
      const providerId = body.providerId || body.provider || null;
      const modelId = body.modelId || body.model || null;

      const coordinatorResult = await this.coordinator.processChat({
        message: message.trim(),
        conversation: Array.isArray(body.conversation) ? body.conversation : [],
        user: authResult.user,
        member: authResult.member,
        providerId,
        modelId
      });

      await this.auditService.logAccess({
        userId: authResult.user.id,
        userName: authResult.user.name,
        role: authResult.user.role,
        effectiveRole: authResult.effectiveRole,
        module: 'AI_CHAT',
        action: 'CHAT_REQUEST',
        endpoint: '/api/ai/chat',
        status: 'ALLOWED',
        metadata: {
          model: coordinatorResult.model,
          providerId: coordinatorResult.providerId,
          routingMode: coordinatorResult.routingMode
        },
        ip: clientIp
      });

      return {
        status: 200,
        body: {
          success: true,
          reply: coordinatorResult.reply,
          model: coordinatorResult.model,
          providerId: coordinatorResult.providerId || null,
          providerName: coordinatorResult.providerName || null,
          routingMode: coordinatorResult.routingMode || null,
          fallbackOccurred: Boolean(coordinatorResult.fallbackOccurred),
          originalProviderId: coordinatorResult.originalProviderId || null,
          originalProviderName: coordinatorResult.originalProviderName || null,
          usage: coordinatorResult.usage || null,
          cost: coordinatorResult.cost || null,
          intent: coordinatorResult.intent || null,
          topic: coordinatorResult.topic || null,
          executionPipeline: coordinatorResult.executionPipeline || null,
          dataContext: coordinatorResult.dataContext || null,
          authenticatedUser: {
            name: authResult.user.name,
            role: authResult.user.role,
            effectiveRole: authResult.effectiveRole
          }
        }
      };
    } catch (err) {
      console.error('[AiChatServerHandler] Coordinator Error:', err);
      const isAuthError = err.message.includes('Akses ditolak') || err.message.includes('RBAC') || err.message.includes('izin');
      return {
        status: isAuthError ? 403 : 500,
        body: {
          success: false,
          error: err.message || 'Terjadi kesalahan sistem saat memproses percakapan.'
        }
      };
    }
  }

  /**
   * Endpoint: GET /api/ai/models
   * Returns list of configured and role-permitted AI models for user's chatbot selector
   */
  async handleGetModels(headers = {}, body = {}) {
    const authResult = await this.authenticateRequest(headers, body);
    if (!authResult.authenticated) {
      return {
        status: authResult.status,
        body: { success: false, error: authResult.error }
      };
    }

    try {
      const role = authResult.user.role;
      const providers = await this.modelManager.getAllProviders({
        maskKeys: true,
        forRole: role
      });

      // Enrich with available model details
      const modelsList = [];
      for (const p of providers) {
        if (!p.isConfigured || !p.isEnabled) continue;
        const available = await this.modelManager.getAvailableModelsForProvider(p.id);
        modelsList.push({
          providerId: p.id,
          providerName: p.name,
          isPrimary: p.isPrimary,
          selectedModel: p.selectedModel,
          models: available
        });
      }

      return {
        status: 200,
        body: {
          success: true,
          allowManualSelection: this.modelRouter.settings.allowManualSelection,
          autoRoutingEnabled: this.modelRouter.settings.autoRoutingEnabled,
          providers: modelsList
        }
      };
    } catch (err) {
      return {
        status: 500,
        body: { success: false, error: err.message }
      };
    }
  }

  /**
   * Guard for Admin-only operations
   */
  async _requireAdminAuth(headers, body) {
    const authResult = await this.authenticateRequest(headers, body);
    if (!authResult.authenticated) {
      return { allowed: false, response: { status: authResult.status, body: { success: false, error: authResult.error } } };
    }

    const effectiveRole = authResult.effectiveRole || resolveEffectiveRole(authResult.user, authResult.member);

    if (effectiveRole !== ROLES.ADMIN) {
      await this.auditService.logAccess({
        userId: authResult.user.id,
        userName: authResult.user.name,
        role: authResult.user.role,
        effectiveRole,
        module: 'AI_ADMIN_CONTROL',
        action: 'ADMIN_ACCESS_ATTEMPT',
        status: 'DENIED',
        reason: 'Akses ditolak: Hanya Administrator yang berwenang mengakses AI Model Control Center.'
      });

      return {
        allowed: false,
        response: {
          status: 403,
          body: {
            success: false,
            error: 'Akses ditolak. Fitur AI Model Control Center hanya dapat diakses oleh Administrator Koperasi (RBAC).'
          }
        }
      };
    }

    return { allowed: true, authResult };
  }

  /**
   * Endpoint: GET /api/ai/admin/audit
   * Admin-only: Retrieves security audit logs
   */
  async handleGetAdminAuditLogs(headers = {}, body = {}) {
    const check = await this._requireAdminAuth(headers, body);
    if (!check.allowed) return check.response;

    try {
      const logs = await this.auditService.getLogs({ limit: 100 });
      return {
        status: 200,
        body: {
          success: true,
          total: logs.length,
          logs
        }
      };
    } catch (err) {
      return {
        status: 500,
        body: { success: false, error: err.message }
      };
    }
  }

  /**
   * Endpoint: GET /api/ai/admin/config
   * Admin-only: Returns full provider configurations (with masked keys) and routing parameters
   */
  async handleGetAdminConfig(headers = {}, body = {}) {
    const check = await this._requireAdminAuth(headers, body);
    if (!check.allowed) return check.response;

    try {
      const providers = await this.modelManager.getAllProviders({ maskKeys: true });
      const routing = this.modelRouter.getSettings();

      return {
        status: 200,
        body: {
          success: true,
          providers,
          routing
        }
      };
    } catch (err) {
      return {
        status: 500,
        body: { success: false, error: err.message }
      };
    }
  }

  /**
   * Endpoint: POST /api/ai/admin/config
   * Admin-only: Updates a provider's settings or API key
   */
  async handleUpdateAdminConfig(body = {}, headers = {}) {
    const check = await this._requireAdminAuth(headers, body);
    if (!check.allowed) return check.response;

    const providerId = body.providerId;
    if (!providerId) {
      return {
        status: 400,
        body: { success: false, error: 'Parameter providerId wajib diisi.' }
      };
    }

    try {
      const updated = await this.modelManager.updateProviderConfig(providerId, body.updates || {});
      return {
        status: 200,
        body: {
          success: true,
          message: `Konfigurasi provider "${providerId}" berhasil diperbarui.`,
          provider: updated
        }
      };
    } catch (err) {
      return {
        status: 500,
        body: { success: false, error: err.message }
      };
    }
  }

  /**
   * Endpoint: POST /api/ai/admin/test
   * Admin-only: Triggers real test connection for a provider
   */
  async handleTestAdminProvider(body = {}, headers = {}) {
    const check = await this._requireAdminAuth(headers, body);
    if (!check.allowed) return check.response;

    const providerId = body.providerId;
    if (!providerId) {
      return {
        status: 400,
        body: { success: false, error: 'Parameter providerId wajib diisi.' }
      };
    }

    try {
      const result = await this.modelManager.testProviderConnection(providerId);
      return {
        status: 200,
        body: {
          success: result.success,
          latencyMs: result.latencyMs,
          message: result.message,
          model: result.model
        }
      };
    } catch (err) {
      return {
        status: 500,
        body: {
          success: false,
          latencyMs: 0,
          message: `Terjadi error saat menguji koneksi: ${err.message}`
        }
      };
    }
  }

  /**
   * Endpoint: GET /api/ai/admin/usage
   * Admin-only: Retrieves aggregated token, cost, and latency metrics
   */
  async handleGetAdminUsage(headers = {}, body = {}) {
    const check = await this._requireAdminAuth(headers, body);
    if (!check.allowed) return check.response;

    try {
      const metrics = await this.modelManager.usageTracker.getMetrics();
      return {
        status: 200,
        body: {
          success: true,
          metrics
        }
      };
    } catch (err) {
      return {
        status: 500,
        body: { success: false, error: err.message }
      };
    }
  }

  /**
   * Endpoint: POST /api/ai/admin/routing
   * Admin-only: Updates AI routing settings and fallback rules
   */
  async handleUpdateAdminRouting(body = {}, headers = {}) {
    const check = await this._requireAdminAuth(headers, body);
    if (!check.allowed) return check.response;

    try {
      const updated = await this.modelRouter.updateSettings(body.settings || body);
      return {
        status: 200,
        body: {
          success: true,
          message: 'Pengaturan Model Routing berhasil diperbarui.',
          routing: updated
        }
      };
    } catch (err) {
      return {
        status: 500,
        body: { success: false, error: err.message }
      };
    }
  }

  /**
   * Endpoint: POST /api/ai/admin/delete
   * Admin-only: Clears/deletes provider configuration
   */
  async handleDeleteAdminConfig(body = {}, headers = {}) {
    const check = await this._requireAdminAuth(headers, body);
    if (!check.allowed) return check.response;

    const providerId = body.providerId;
    if (!providerId) {
      return {
        status: 400,
        body: { success: false, error: 'Parameter providerId wajib diisi.' }
      };
    }

    try {
      await this.modelManager.deleteProviderConfig(providerId);
      return {
        status: 200,
        body: {
          success: true,
          message: `Konfigurasi provider "${providerId}" berhasil dihapus/direset.`
        }
      };
    } catch (err) {
      return {
        status: 500,
        body: { success: false, error: err.message }
      };
    }
  }

  /**
   * Universal Dispatcher for all /api/ai/* endpoints
   */
  async dispatchApiRequest({ method = 'GET', url = '', headers = {}, body = {}, clientIp = '127.0.0.1' }) {
    await this.init();
    const cleanUrl = url.split('?')[0];

    if (cleanUrl === '/api/ai/chat' && method === 'POST') {
      return this.handleChatRequest(body, headers, clientIp);
    }

    if (cleanUrl === '/api/ai/models' && (method === 'GET' || method === 'POST')) {
      return this.handleGetModels(headers, body);
    }

    if (cleanUrl === '/api/ai/admin/config') {
      if (method === 'GET') return this.handleGetAdminConfig(headers, body);
      if (method === 'POST' || method === 'PUT') return this.handleUpdateAdminConfig(body, headers);
      if (method === 'DELETE') return this.handleDeleteAdminConfig(body, headers);
    }

    if (cleanUrl === '/api/ai/admin/test' && method === 'POST') {
      return this.handleTestAdminProvider(body, headers);
    }

    if (cleanUrl === '/api/ai/admin/usage' && method === 'GET') {
      return this.handleGetAdminUsage(headers, body);
    }

    if (cleanUrl === '/api/ai/admin/audit' && method === 'GET') {
      return this.handleGetAdminAuditLogs(headers, body);
    }

    if (cleanUrl === '/api/ai/admin/routing' && (method === 'POST' || method === 'PUT')) {
      return this.handleUpdateAdminRouting(body, headers);
    }

    if (cleanUrl === '/api/ai/admin/delete' && method === 'POST') {
      return this.handleDeleteAdminConfig(body, headers);
    }

    return {
      status: 404,
      body: { success: false, error: `Endpoint AI "${method} ${cleanUrl}" tidak ditemukan.` }
    };
  }
}
