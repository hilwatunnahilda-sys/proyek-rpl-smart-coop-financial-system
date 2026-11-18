/**
 * Authentication Service & Session Manager
 * Enforces PBKDF2 password verification, token issuance, session lifecycle & audit logging
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { ENV } from '../../config/env.js';
import { db } from '../database/connection.js';
import { CryptoService } from '../security/cryptoService.js';
import { UserEntity } from '../../core/entities/User.js';
import { MemberEntity } from '../../core/entities/Member.js';
import { SessionEntity } from '../../core/entities/Session.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentMember = null;
    this.currentSession = null;
    this.subscribers = [];
  }

  onAuthStateChange(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.subscribers.forEach(cb => {
      try {
        cb(this.currentUser, this.currentMember, this.currentSession);
      } catch (e) {
        console.error('Error in auth subscriber:', e);
      }
    });
  }

  /**
   * Initializes session from storage and validates token against database
   */
  async initSession() {
    try {
      const storedToken = localStorage.getItem(ENV.AUTH.SESSION_KEY);
      if (!storedToken) {
        this.currentUser = null;
        this.currentMember = null;
        this.currentSession = null;
        return null;
      }

      const sessionValidation = await this.validateSession(storedToken);
      if (sessionValidation.valid) {
        this.currentUser = sessionValidation.user;
        this.currentMember = sessionValidation.member;
        this.currentSession = sessionValidation.session;
        this.notify();
        return this.currentUser;
      } else {
        await this.logout();
        return null;
      }
    } catch (e) {
      console.warn('[AuthService] Session restoration failed:', e);
      await this.logout();
      return null;
    }
  }

  /**
   * Backend-style Session Token Validator
   * Checks token existence, expiration, and revocation in the database
   * @param {string} token
   * @returns {Promise<{valid: boolean, user?: UserEntity, member?: MemberEntity, session?: SessionEntity, reason?: string}>}
   */
  async validateSession(token) {
    if (!token) return { valid: false, reason: 'TOKEN_MISSING' };

    const sessionRecord = await db.adapter.findById('sessions', token, 'token');
    if (!sessionRecord) {
      return { valid: false, reason: 'TOKEN_NOT_FOUND' };
    }

    const sessionEntity = new SessionEntity(sessionRecord);
    if (!sessionEntity.isValid()) {
      return { valid: false, reason: sessionEntity.is_revoked ? 'TOKEN_REVOKED' : 'TOKEN_EXPIRED' };
    }

    const userRecord = await db.adapter.findById('users', sessionEntity.user_id, 'id');
    if (!userRecord || userRecord.status !== 'ACTIVE') {
      return { valid: false, reason: 'USER_INACTIVE_OR_DELETED' };
    }

    const userEntity = new UserEntity(userRecord);
    const memberRecord = await db.adapter.findById('members', userEntity.id, 'user_id');
    const memberEntity = memberRecord ? new MemberEntity(memberRecord) : null;

    return {
      valid: true,
      user: userEntity,
      member: memberEntity,
      session: sessionEntity
    };
  }

  /**
   * Authenticates user with email & password using PBKDF2 hash verification
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{success: boolean, message?: string, user?: UserEntity, token?: string}>}
   */
  async login(email, password) {
    const cleanEmail = CryptoService.sanitizeEmail(email);

    if (!cleanEmail || !password) {
      return { success: false, message: 'Email dan password wajib diisi.' };
    }

    if (!CryptoService.isValidEmail(cleanEmail)) {
      return { success: false, message: 'Format email tidak valid.' };
    }

    // 1. Fetch user by email
    const users = await db.adapter.find('users', { email: cleanEmail });
    if (!users || users.length === 0) {
      await this.recordAuditLog(null, 'LOGIN_FAILED', 'AUTH', `Failed login attempt for unknown email: ${cleanEmail}`);
      return { success: false, message: 'Email atau password yang Anda masukkan salah.' };
    }

    const userRecord = users[0];

    // 2. Check account status
    if (userRecord.status !== 'ACTIVE') {
      await this.recordAuditLog(userRecord.id, 'LOGIN_BLOCKED', 'AUTH', `Blocked login attempt on ${userRecord.status} account`);
      return { success: false, message: `Akun Anda sedang ${userRecord.status}. Hubungi Admin Koperasi.` };
    }

    // 3. Verify PBKDF2 Password Hash
    const isMatch = await CryptoService.verifyPassword(password, userRecord.password_hash, userRecord.salt);
    if (!isMatch) {
      await this.recordAuditLog(userRecord.id, 'LOGIN_FAILED', 'AUTH', 'Password verification failed (hash mismatch)');
      return { success: false, message: 'Email atau password yang Anda masukkan salah.' };
    }

    // 4. Issue Cryptographically Secure Session Token
    const token = CryptoService.generateSessionToken();
    const sessionEntity = new SessionEntity({
      token,
      user_id: userRecord.id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      is_revoked: false
    });

    await db.adapter.insert('sessions', sessionEntity.toJSON());
    localStorage.setItem(ENV.AUTH.SESSION_KEY, token);

    // 5. Load Domain Entities
    const userEntity = new UserEntity(userRecord);
    const memberRecord = await db.adapter.findById('members', userEntity.id, 'user_id');
    const memberEntity = memberRecord ? new MemberEntity(memberRecord) : null;

    this.currentUser = userEntity;
    this.currentMember = memberEntity;
    this.currentSession = sessionEntity;

    await this.recordAuditLog(userEntity.id, 'LOGIN_SUCCESS', 'AUTH', `Login successful (${userEntity.role})`);
    this.notify();

    return {
      success: true,
      user: userEntity,
      member: memberEntity,
      token: sessionEntity.token
    };
  }

  /**
   * Helper for instant demo switching
   * @param {string} email
   */
  async switchDemoAccount(email) {
    const cleanEmail = CryptoService.sanitizeEmail(email);
    const users = await db.adapter.find('users', { email: cleanEmail });
    if (!users || users.length === 0) {
      return { success: false, message: 'Akun demo tidak ditemukan.' };
    }

    const userRecord = users[0];
    const token = CryptoService.generateSessionToken();
    const sessionEntity = new SessionEntity({
      token,
      user_id: userRecord.id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      is_revoked: false
    });

    await db.adapter.insert('sessions', sessionEntity.toJSON());
    localStorage.setItem(ENV.AUTH.SESSION_KEY, token);

    const userEntity = new UserEntity(userRecord);
    const memberRecord = await db.adapter.findById('members', userEntity.id, 'user_id');
    const memberEntity = memberRecord ? new MemberEntity(memberRecord) : null;

    this.currentUser = userEntity;
    this.currentMember = memberEntity;
    this.currentSession = sessionEntity;

    await this.recordAuditLog(userEntity.id, 'DEMO_SWITCH', 'AUTH', `Demo role switched to ${userEntity.role}`);
    this.notify();

    return {
      success: true,
      user: userEntity,
      member: memberEntity,
      token: sessionEntity.token
    };
  }

  /**
   * Revokes active session token and clears client state
   */
  async logout() {
    const token = localStorage.getItem(ENV.AUTH.SESSION_KEY);
    if (token) {
      const session = await db.adapter.findById('sessions', token, 'token');
      if (session) {
        await db.adapter.update('sessions', token, { is_revoked: true }, 'token');
      }
      localStorage.removeItem(ENV.AUTH.SESSION_KEY);
    }

    if (this.currentUser) {
      await this.recordAuditLog(this.currentUser.id, 'LOGOUT', 'AUTH', 'User logged out successfully');
    }

    this.currentUser = null;
    this.currentMember = null;
    this.currentSession = null;
    this.notify();
  }

  async recordAuditLog(userId, action, resource, details) {
    if (!ENV.AUTH.ENABLE_AUDIT_LOG) return;
    try {
      await db.adapter.insert('audit_logs', {
        id: `audit-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        user_id: userId || 'anonymous',
        action,
        resource,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.warn('[AuthService] Failed to record audit log:', e);
    }
  }

  getUser() {
    return this.currentUser;
  }

  getMember() {
    return this.currentMember;
  }

  getSession() {
    return this.currentSession;
  }

  isAuthenticated() {
    return this.currentUser !== null && this.currentSession !== null && this.currentSession.isValid();
  }
}

export const auth = new AuthService();
