import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { MemberService } from '../src/core/services/MemberService.js';
import { MEMBER_TYPES, MEMBER_STATUS, ROLES } from '../src/config/constants.js';
import { requireAuthorization } from '../src/infrastructure/rbac/authorizationMiddleware.js';

// --- MOCK BROWSER ENVIRONMENT ---
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, val) { this.data[key] = String(val); },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

describe('Member Management Module Tests', () => {
  let service;

  beforeEach(() => {
    global.localStorage.clear();
    service = new MemberService();
  });

  describe('CRUD Operations', () => {
    test('Should create a new member successfully', async () => {
      const data = {
        member_number: 'M-001',
        full_name: 'John Doe',
        member_type: MEMBER_TYPES.MAHASISWA
      };

      const member = await service.create(data);
      assert.strictEqual(member.full_name, 'John Doe');
      assert.strictEqual(member.member_number, 'M-001');
      assert.strictEqual(member.status, MEMBER_STATUS.ACTIVE);
      assert.ok(member.id);
    });

    test('Should reject duplicate member number on create', async () => {
      const data = { member_number: 'M-001', full_name: 'John', member_type: MEMBER_TYPES.MAHASISWA };
      await service.create(data);

      const data2 = { member_number: 'M-001', full_name: 'Jane', member_type: MEMBER_TYPES.DOSEN };
      
      try {
        await service.create(data2);
        assert.fail('Should have thrown an error for duplicate member_number');
      } catch (err) {
        assert.match(err.message, /sudah terdaftar/);
      }
    });

    test('Should update an existing member', async () => {
      const created = await service.create({
        member_number: 'M-002',
        full_name: 'Bob',
        member_type: MEMBER_TYPES.STAF
      });

      const updated = await service.update(created.id, { full_name: 'Bob Updated' });
      assert.strictEqual(updated.full_name, 'Bob Updated');
      assert.strictEqual(updated.member_number, 'M-002');
    });

    test('Should reject duplicate member number on update', async () => {
      await service.create({ member_number: 'M-003', full_name: 'Alice', member_type: MEMBER_TYPES.STAF });
      const created = await service.create({ member_number: 'M-004', full_name: 'Eve', member_type: MEMBER_TYPES.STAF });

      try {
        await service.update(created.id, { member_number: 'M-003' });
        assert.fail('Should have thrown an error for duplicate member_number on update');
      } catch (err) {
        assert.match(err.message, /sudah terdaftar/);
      }
    });

    test('Should deactivate and activate member (soft delete)', async () => {
      const created = await service.create({ member_number: 'M-005', full_name: 'Charlie', member_type: MEMBER_TYPES.DOSEN });
      assert.strictEqual(created.status, MEMBER_STATUS.ACTIVE);

      const deactivated = await service.deactivate(created.id);
      assert.strictEqual(deactivated.status, MEMBER_STATUS.INACTIVE);

      const all = await service.getAll();
      assert.strictEqual(all.length, 1); // Record still exists in DB
      
      const reactivated = await service.activate(created.id);
      assert.strictEqual(reactivated.status, MEMBER_STATUS.ACTIVE);
    });
  });

  describe('Authorization Tests', () => {
    test('Admin should be authorized', () => {
      const user = { role: ROLES.ADMIN };
      // Should not throw
      requireAuthorization(user, [ROLES.ADMIN]);
    });

    test('Member should NOT be authorized for admin routes', () => {
      const user = { role: ROLES.MEMBER };
      try {
        requireAuthorization(user, [ROLES.ADMIN]);
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.match(err.message, /Akses ditolak/i);
      }
    });
  });
});
