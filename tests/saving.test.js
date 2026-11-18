/**
 * Automated Test Suite: Savings Management Subsystem
 * Covers: Deposits, Withdrawals, Insufficient Balance Validation, Global & Member Balances, RBAC & Isolation
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SavingService } from '../src/core/services/SavingService.js';
import { DatabaseAdapter } from '../src/infrastructure/database/adapter.js';
import { SAVING_TYPES, TRANSACTION_TYPES, ROLES } from '../src/config/constants.js';

class MockDatabaseAdapter extends DatabaseAdapter {
  constructor() {
    super('mock_saving_test');
    this.storage = new Map();
  }

  async getAll(tableName) {
    return this.storage.get(tableName) || [];
  }

  async saveAll(tableName, records) {
    this.storage.set(tableName, records);
    return true;
  }

  async findById(tableName, id, keyField = 'id') {
    const records = await this.getAll(tableName);
    return records.find(item => item[keyField] === id) || null;
  }

  async insert(tableName, record) {
    const records = await this.getAll(tableName);
    records.push(record);
    await this.saveAll(tableName, records);
    return record;
  }

  async clearTable(tableName) {
    this.storage.delete(tableName);
  }
}

describe('Savings Subsystem Test Suite', () => {
  let db;
  let savingService;

  const mockAdminUser = { id: 'usr-admin-001', name: 'Admin', role: ROLES.ADMIN };
  const mockChairmanUser = { id: 'usr-ketua-001', name: 'Chairman', role: ROLES.CHAIRMAN };
  const mockMember1User = { id: 'usr-dosen-001', name: 'Dr. Siti', role: ROLES.MEMBER };
  const mockMember2User = { id: 'usr-mhs-001', name: 'Ahmad Fauzi', role: ROLES.MEMBER };

  beforeEach(async () => {
    db = new MockDatabaseAdapter();
    savingService = new SavingService(db);

    // Setup initial members
    await db.saveAll('members', [
      { id: 'mbr-usr-dosen-001', user_id: 'usr-dosen-001', full_name: 'Dr. Siti', member_number: 'IKMI-MBR-002', status: 'ACTIVE' },
      { id: 'mbr-usr-mhs-001', user_id: 'usr-mhs-001', full_name: 'Ahmad Fauzi', member_number: 'IKMI-MBR-003', status: 'ACTIVE' }
    ]);
  });

  describe('1. Savings Deposit and Balance Computation', () => {
    it('Should deposit Simpanan Pokok, Wajib, and Sukarela and calculate total balance', async () => {
      // 1. Deposit Pokok
      await savingService.recordTransaction({
        member_id: 'mbr-usr-dosen-001',
        saving_type: SAVING_TYPES.POKOK,
        transaction_type: TRANSACTION_TYPES.DEPOSIT,
        amount: 1000000,
        description: 'Setoran Pokok',
        created_by: 'usr-admin-001'
      }, mockAdminUser);

      // 2. Deposit Wajib
      await savingService.recordTransaction({
        member_id: 'mbr-usr-dosen-001',
        saving_type: SAVING_TYPES.WAJIB,
        transaction_type: TRANSACTION_TYPES.DEPOSIT,
        amount: 500000,
        description: 'Setoran Wajib',
        created_by: 'usr-admin-001'
      }, mockAdminUser);

      // 3. Deposit Sukarela
      await savingService.recordTransaction({
        member_id: 'mbr-usr-dosen-001',
        saving_type: SAVING_TYPES.SUKARELA,
        transaction_type: TRANSACTION_TYPES.DEPOSIT,
        amount: 750000,
        description: 'Setoran Sukarela',
        created_by: 'usr-admin-001'
      }, mockAdminUser);

      const balances = await savingService.getMemberBalances('mbr-usr-dosen-001', mockMember1User);

      assert.strictEqual(balances[SAVING_TYPES.POKOK], 1000000);
      assert.strictEqual(balances[SAVING_TYPES.WAJIB], 500000);
      assert.strictEqual(balances[SAVING_TYPES.SUKARELA], 750000);
      assert.strictEqual(balances.total, 2250000);
    });

    it('Should reject deposit with zero or negative amount', async () => {
      await assert.rejects(async () => {
        await savingService.recordTransaction({
          member_id: 'mbr-usr-dosen-001',
          saving_type: SAVING_TYPES.SUKARELA,
          transaction_type: TRANSACTION_TYPES.DEPOSIT,
          amount: 0,
          description: 'Invalid 0 amount',
          created_by: 'usr-admin-001'
        }, mockAdminUser);
      }, /Jumlah transaksi harus lebih besar dari 0/);

      await assert.rejects(async () => {
        await savingService.recordTransaction({
          member_id: 'mbr-usr-dosen-001',
          saving_type: SAVING_TYPES.SUKARELA,
          transaction_type: TRANSACTION_TYPES.DEPOSIT,
          amount: -50000,
          description: 'Invalid negative amount',
          created_by: 'usr-admin-001'
        }, mockAdminUser);
      }, /Jumlah transaksi harus lebih besar dari 0/);
    });
  });

  describe('2. Savings Withdrawal and Business Rules', () => {
    it('Should successfully withdraw Sukarela within available balance', async () => {
      // Deposit 1.000.000
      await savingService.recordTransaction({
        member_id: 'mbr-usr-dosen-001',
        saving_type: SAVING_TYPES.SUKARELA,
        transaction_type: TRANSACTION_TYPES.DEPOSIT,
        amount: 1000000,
        description: 'Setoran',
        created_by: 'usr-admin-001'
      }, mockAdminUser);

      // Withdraw 400.000
      await savingService.recordTransaction({
        member_id: 'mbr-usr-dosen-001',
        saving_type: SAVING_TYPES.SUKARELA,
        transaction_type: TRANSACTION_TYPES.WITHDRAWAL,
        amount: 400000,
        description: 'Penarikan Sebagian',
        created_by: 'usr-admin-001'
      }, mockAdminUser);

      const balances = await savingService.getMemberBalances('mbr-usr-dosen-001', mockMember1User);
      assert.strictEqual(balances[SAVING_TYPES.SUKARELA], 600000);
      assert.strictEqual(balances.total, 600000);
    });

    it('Should reject withdrawal when amount exceeds available balance', async () => {
      // Deposit only 200.000
      await savingService.recordTransaction({
        member_id: 'mbr-usr-dosen-001',
        saving_type: SAVING_TYPES.SUKARELA,
        transaction_type: TRANSACTION_TYPES.DEPOSIT,
        amount: 200000,
        description: 'Setoran',
        created_by: 'usr-admin-001'
      }, mockAdminUser);

      // Attempt to withdraw 500.000 (Exceeds balance)
      await assert.rejects(async () => {
        await savingService.recordTransaction({
          member_id: 'mbr-usr-dosen-001',
          saving_type: SAVING_TYPES.SUKARELA,
          transaction_type: TRANSACTION_TYPES.WITHDRAWAL,
          amount: 500000,
          description: 'Overdraft attempt',
          created_by: 'usr-admin-001'
        }, mockAdminUser);
      }, /Saldo simpanan sukarela tidak mencukupi/);
    });
  });

  describe('3. RBAC & Data Isolation Enforcement', () => {
    it('Should prevent Chairman from creating savings mutations (Read-Only Enforcement)', async () => {
      await assert.rejects(async () => {
        await savingService.recordTransaction({
          member_id: 'mbr-usr-dosen-001',
          saving_type: SAVING_TYPES.POKOK,
          transaction_type: TRANSACTION_TYPES.DEPOSIT,
          amount: 500000,
          description: 'Chairman mutation attempt',
          created_by: 'usr-ketua-001'
        }, mockChairmanUser);
      }, /Ketua bersifat READ-ONLY/);
    });

    it('Should block Member 1 from reading Member 2 savings data', async () => {
      await assert.rejects(async () => {
        await savingService.getMemberBalances('mbr-usr-mhs-001', mockMember1User);
      }, /Isolasi Data Database/);
    });
  });
});
