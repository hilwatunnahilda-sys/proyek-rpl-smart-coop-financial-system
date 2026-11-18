/**
 * Automated Test Suite: Login View Structure & Credential Security Verification
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseAdapter } from '../src/infrastructure/database/adapter.js';
import { DatabaseSeeder, DEFAULT_DEV_PASSWORD } from '../src/infrastructure/database/seeder.js';
import { CryptoService } from '../src/infrastructure/security/cryptoService.js';
import { ROLES } from '../src/config/constants.js';

describe('Login View Structure & Credential Security Test Suite', () => {
  const loginViewPath = resolve(process.cwd(), 'src/presentation/views/LoginView.js');
  const loginViewCode = readFileSync(loginViewPath, 'utf-8');

  it('1. Source code must NOT import or contain development passwords', () => {
    assert.strictEqual(
      loginViewCode.includes('DEFAULT_DEV_PASSWORD'),
      false,
      'LoginView.js must not import or reference DEFAULT_DEV_PASSWORD'
    );
    assert.strictEqual(
      loginViewCode.includes('Password development:'),
      false,
      'LoginView.js must not display development password hint'
    );
    assert.strictEqual(
      loginViewCode.includes('IKMI@Coop2026!'),
      false,
      'LoginView.js must not hardcode password plaintext'
    );
  });

  it('2. Source code must NOT render development account cards or auto-fill buttons', () => {
    assert.strictEqual(
      loginViewCode.includes('fill-credential-btn'),
      false,
      'LoginView.js must not contain .fill-credential-btn quick account switchers'
    );
    assert.strictEqual(
      loginViewCode.includes('demo-login-btn'),
      false,
      'LoginView.js must not contain demo login buttons'
    );
    assert.strictEqual(
      loginViewCode.includes('Form Kredensial</span>'),
      false,
      'LoginView.js must not have separate Form Kredensial divider as dev cards are removed'
    );
  });

  it('3. Source code must contain exact institutional title, updated subtitle, and credential form', () => {
    assert.ok(
      loginViewCode.includes('Masuk ke Akun Anda'),
      'Must contain title "Masuk ke Akun Anda"'
    );
    assert.ok(
      loginViewCode.includes('Masukkan email institusi dan kata sandi Anda untuk melanjutkan.'),
      'Must contain updated subtitle'
    );
    assert.ok(
      loginViewCode.includes('Email Terdaftar STMIK IKMI'),
      'Must contain label "Email Terdaftar STMIK IKMI"'
    );
    assert.ok(
      loginViewCode.includes('Kata Sandi'),
      'Must contain label "Kata Sandi"'
    );
    assert.ok(
      loginViewCode.includes('Masuk & Verifikasi Hash'),
      'Must contain submit button "Masuk & Verifikasi Hash"'
    );
    assert.ok(
      loginViewCode.includes('toggle-password-btn'),
      'Must contain password visibility toggle button'
    );
  });

  it('4. Form inputs must start empty without prefilled default credentials', () => {
    // Check that input email and password don't have hardcoded default values
    assert.strictEqual(
      loginViewCode.includes('value="admin@ikmi.ac.id"'),
      false,
      'Email input must not be pre-filled with admin@ikmi.ac.id'
    );
    assert.strictEqual(
      loginViewCode.includes('value="${DEFAULT_DEV_PASSWORD}"'),
      false,
      'Password input must not be pre-filled with dev password'
    );
  });

  describe('5. Multi-Role PBKDF2 Password Verification Integration', () => {
    let adapter;

    beforeEach(async () => {
      // Create isolated in-memory test database and seed accounts
      const prefix = `test_login_auth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      adapter = new DatabaseAdapter(prefix);
      const seeder = new DatabaseSeeder(adapter);
      await seeder.seed();
    });

    it('Admin role can be verified with valid email and password hash', async () => {
      const users = await adapter.find('users', { email: 'admin@ikmi.ac.id' });
      assert.strictEqual(users.length, 1);
      const admin = users[0];
      assert.strictEqual(admin.role, ROLES.ADMIN);

      const isValid = await CryptoService.verifyPassword(DEFAULT_DEV_PASSWORD, admin.password_hash, admin.salt);
      assert.strictEqual(isValid, true, 'Admin PBKDF2 password verification must succeed');
    });

    it('Chairman role can be verified with valid email and password hash', async () => {
      const users = await adapter.find('users', { email: 'ketua@ikmi.ac.id' });
      assert.strictEqual(users.length, 1);
      const ketua = users[0];
      assert.strictEqual(ketua.role, ROLES.CHAIRMAN);

      const isValid = await CryptoService.verifyPassword(DEFAULT_DEV_PASSWORD, ketua.password_hash, ketua.salt);
      assert.strictEqual(isValid, true, 'Chairman PBKDF2 password verification must succeed');
    });

    it('Dosen (Member) role can be verified with valid email and password hash', async () => {
      const users = await adapter.find('users', { email: 'dosen@ikmi.ac.id' });
      assert.strictEqual(users.length, 1);
      const dosen = users[0];
      assert.strictEqual(dosen.role, ROLES.MEMBER);

      const isValid = await CryptoService.verifyPassword(DEFAULT_DEV_PASSWORD, dosen.password_hash, dosen.salt);
      assert.strictEqual(isValid, true, 'Dosen PBKDF2 password verification must succeed');
    });

    it('Mahasiswa (Member) role can be verified with valid email and password hash', async () => {
      const users = await adapter.find('users', { email: 'mahasiswa@ikmi.ac.id' });
      assert.strictEqual(users.length, 1);
      const mhs = users[0];
      assert.strictEqual(mhs.role, ROLES.MEMBER);

      const isValid = await CryptoService.verifyPassword(DEFAULT_DEV_PASSWORD, mhs.password_hash, mhs.salt);
      assert.strictEqual(isValid, true, 'Mahasiswa PBKDF2 password verification must succeed');
    });

    it('Invalid password must be rejected by verification', async () => {
      const users = await adapter.find('users', { email: 'admin@ikmi.ac.id' });
      const admin = users[0];

      const isInvalid = await CryptoService.verifyPassword('WrongPassword123!', admin.password_hash, admin.salt);
      assert.strictEqual(isInvalid, false, 'Incorrect password must be rejected');
    });
  });
});
