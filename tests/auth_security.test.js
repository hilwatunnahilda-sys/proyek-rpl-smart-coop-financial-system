/**
 * Automated Test Suite: Authentication & Security Subsystem
 * Covers: PBKDF2 Hashing, Salt Verification, Token Generation, Session Expiry, Revocation, RBAC Guards
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CryptoService } from '../src/infrastructure/security/cryptoService.js';
import { SessionEntity } from '../src/core/entities/Session.js';
import { UserEntity } from '../src/core/entities/User.js';
import { rbac } from '../src/infrastructure/rbac/rbacEngine.js';
import { PERMISSIONS } from '../src/core/permissions.js';
import { ROLES } from '../src/config/constants.js';

describe('Authentication & Security Test Suite', () => {
  describe('1. PBKDF2 Cryptographic Password Hashing', () => {
    it('Should hash password with PBKDF2-SHA256 and unique random salt', async () => {
      const password = 'IKMI@Coop2026!';
      const hashResult1 = await CryptoService.hashPassword(password);
      const hashResult2 = await CryptoService.hashPassword(password);

      // Verify structure
      assert.ok(hashResult1.hash, 'Hash string should exist');
      assert.ok(hashResult1.salt, 'Salt string should exist');
      assert.strictEqual(hashResult1.salt.length, 32, 'Salt should be 16 bytes (32 hex characters)');

      // Verify that two hashes with random salts are distinct
      assert.notStrictEqual(hashResult1.salt, hashResult2.salt, 'Salts should be randomly generated and unique');
      assert.notStrictEqual(hashResult1.hash, hashResult2.hash, 'Hashes should differ due to distinct salts');
    });

    it('Should correctly verify matching passwords and reject incorrect ones', async () => {
      const password = 'CorrectSecretPassword123!';
      const { hash, salt } = await CryptoService.hashPassword(password);

      const isValid = await CryptoService.verifyPassword(password, hash, salt);
      assert.strictEqual(isValid, true, 'Valid password must be verified as true');

      const isInvalid = await CryptoService.verifyPassword('WrongPassword!', hash, salt);
      assert.strictEqual(isInvalid, false, 'Invalid password must be rejected as false');
    });

    it('Should sanitize and validate email formats', () => {
      assert.strictEqual(CryptoService.sanitizeEmail('  Admin@IKMI.ac.id  '), 'admin@ikmi.ac.id');
      assert.strictEqual(CryptoService.isValidEmail('admin@ikmi.ac.id'), true);
      assert.strictEqual(CryptoService.isValidEmail('invalid-email-format'), false);
    });
  });

  describe('2. Session Token & Expiration Lifecycle', () => {
    it('Should issue valid cryptographically secure session tokens', () => {
      const token = CryptoService.generateSessionToken();
      assert.ok(token, 'Token string should exist');
      assert.ok(token.startsWith('ikmi_tok_'), 'Token should start with prefix ikmi_tok_');
      assert.strictEqual(token.length, 57, 'Token should have full length of prefix + 48 hex chars');

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();

      const session = new SessionEntity({
        token,
        user_id: 'usr-admin-001',
        created_at: now.toISOString(),
        expires_at: expiresAt,
        is_revoked: false
      });

      assert.strictEqual(session.isValid(), true, 'Active non-expired session must be valid');
    });

    it('Should invalidate revoked or expired sessions', () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString();

      const expiredSession = new SessionEntity({
        token: 'exp-token-001',
        user_id: 'usr-admin-001',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        expires_at: pastTime,
        is_revoked: false
      });

      assert.strictEqual(expiredSession.isValid(), false, 'Expired session must be invalid');

      const revokedSession = new SessionEntity({
        token: 'rev-token-001',
        user_id: 'usr-admin-001',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        is_revoked: true
      });

      assert.strictEqual(revokedSession.isValid(), false, 'Revoked session must be invalid');
    });
  });

  describe('3. RBAC Permissions Matrix Verification', () => {
    const adminUser = new UserEntity({ id: 'usr-admin', name: 'Admin', role: ROLES.ADMIN });
    const chairmanUser = new UserEntity({ id: 'usr-ketua', name: 'Ketua', role: ROLES.CHAIRMAN });
    const memberUser = new UserEntity({ id: 'usr-member', name: 'Member', role: ROLES.MEMBER });

    it('Admin should have full administrative and operational capabilities', () => {
      assert.strictEqual(rbac.can(adminUser, PERMISSIONS.SYSTEM_SETTINGS), true);
      assert.strictEqual(rbac.can(adminUser, PERMISSIONS.MEMBERS_CREATE), true);
      assert.strictEqual(rbac.can(adminUser, PERMISSIONS.SAVINGS_DEPOSIT), true);
      assert.strictEqual(rbac.can(adminUser, PERMISSIONS.LOANS_DISBURSE), true);
    });

    it('Chairman should have executive monitoring & report access but no operational mutations', () => {
      assert.strictEqual(rbac.can(chairmanUser, PERMISSIONS.DASHBOARD_EXECUTIVE_VIEW), true);
      assert.strictEqual(rbac.can(chairmanUser, PERMISSIONS.REPORTS_VIEW), true);
      assert.strictEqual(rbac.can(chairmanUser, PERMISSIONS.LOANS_READ_ALL), true);

      // Chairman cannot mutate operational records
      assert.strictEqual(rbac.can(chairmanUser, PERMISSIONS.SAVINGS_DEPOSIT), false);
      assert.strictEqual(rbac.can(chairmanUser, PERMISSIONS.LOANS_DISBURSE), false);
      assert.strictEqual(rbac.can(chairmanUser, PERMISSIONS.MEMBERS_CREATE), false);
      assert.strictEqual(rbac.can(chairmanUser, PERMISSIONS.SYSTEM_SETTINGS), false);
    });

    it('Member should only have self-service permissions', () => {
      assert.strictEqual(rbac.can(memberUser, PERMISSIONS.DASHBOARD_MEMBER_VIEW), true);
      assert.strictEqual(rbac.can(memberUser, PERMISSIONS.SAVINGS_READ_OWN), true);
      assert.strictEqual(rbac.can(memberUser, PERMISSIONS.LOANS_READ_OWN), true);
      assert.strictEqual(rbac.can(memberUser, PERMISSIONS.LOANS_APPLY), true);

      // Member cannot access global management
      assert.strictEqual(rbac.can(memberUser, PERMISSIONS.SAVINGS_READ_ALL), false);
      assert.strictEqual(rbac.can(memberUser, PERMISSIONS.LOANS_READ_ALL), false);
      assert.strictEqual(rbac.can(memberUser, PERMISSIONS.MEMBERS_READ), false);
      assert.strictEqual(rbac.can(memberUser, PERMISSIONS.SYSTEM_SETTINGS), false);
    });
  });
});
