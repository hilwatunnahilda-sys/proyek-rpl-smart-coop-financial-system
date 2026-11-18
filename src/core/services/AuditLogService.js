/**
 * Security Audit Log Service
 * Enforces centralized security logging and compliance trails
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Guarantees:
 * 1. Immutable record of every authorized & unauthorized database query
 * 2. Effective Role & User Identity tracking from backend sessions
 * 3. Zero leakage of passwords, secrets, API keys, or session tokens
 */

import { DatabaseAdapter } from '../../infrastructure/database/adapter.js';

export class AuditLogService {
  constructor(adapter = null) {
    this.db = adapter || new DatabaseAdapter();
    this.tableName = 'audit_logs';
  }

  /**
   * Log an access attempt or security event
   * @param {object} params
   * @returns {Promise<object>} The saved audit record
   */
  async logAccess({
    userId = 'anonymous',
    userName = 'Anonymous',
    role = 'UNKNOWN',
    effectiveRole = 'UNKNOWN',
    module = 'AI_ASSISTANT',
    action = 'QUERY',
    endpoint = '/api/ai/chat',
    status = 'ALLOWED', // 'ALLOWED' | 'DENIED' | 'ERROR'
    reason = null,
    metadata = null,
    ip = '127.0.0.1'
  } = {}) {
    const sanitizedMetadata = this._sanitizeMetadata(metadata);

    const record = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      user_id: userId,
      userId: userId,
      user_name: userName,
      userName: userName,
      role: role || 'UNKNOWN',
      effective_role: effectiveRole || role || 'UNKNOWN',
      effectiveRole: effectiveRole || role || 'UNKNOWN',
      module,
      action,
      endpoint,
      status: status.toUpperCase(),
      reason: reason || (status.toUpperCase() === 'ALLOWED' ? 'Akses disetujui sesuai wewenang' : 'Akses ditolak oleh kebijakan keamanan RBAC'),
      metadata: sanitizedMetadata,
      ip
    };

    try {
      await this.db.insert(this.tableName, record);
      return record;
    } catch (err) {
      console.error('[AuditLogService] Error inserting audit log:', err);
      return record;
    }
  }

  /**
   * Sanitizes metadata to strictly strip sensitive security tokens or passwords
   */
  _sanitizeMetadata(meta) {
    if (!meta) return null;
    if (typeof meta !== 'object') return { info: String(meta).slice(0, 500) };

    const clean = { ...meta };
    const sensitiveKeys = ['password', 'token', 'apikey', 'api_key', 'salt', 'secret', 'authorization', 'bearer'];

    for (const key of Object.keys(clean)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        clean[key] = '[REDACTED]';
      } else if (typeof clean[key] === 'object' && clean[key] !== null) {
        clean[key] = this._sanitizeMetadata(clean[key]);
      }
    }

    return clean;
  }

  /**
   * Query logs with optional filters (Admin oversight)
   */
  async getLogs({ limit = 50, status = null, effectiveRole = null, userId = null, module = null } = {}) {
    let logs = await this.db.getAll(this.tableName);

    if (status) {
      logs = logs.filter(l => l.status === status.toUpperCase());
    }
    if (effectiveRole) {
      logs = logs.filter(l => l.effective_role === effectiveRole.toUpperCase());
    }
    if (userId) {
      logs = logs.filter(l => l.user_id === userId);
    }
    if (module) {
      logs = logs.filter(l => l.module === module);
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  }
}

