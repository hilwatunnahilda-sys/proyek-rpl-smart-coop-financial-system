import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { FinancialTransactionService } from '../src/core/services/FinancialTransactionService.js';
import { FINANCIAL_TRANSACTION_TYPES, TRANSACTION_FLOW, TRANSACTION_REFERENCE_TYPES, ROLES } from '../src/config/constants.js';
import { requireAuthorization } from '../src/infrastructure/rbac/authorizationMiddleware.js';

// --- MOCK BROWSER ENVIRONMENT FOR LOCALSTORAGE ---
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, val) { this.data[key] = String(val); },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

describe('Financial Transactions Module Test Suite', () => {
  let transactionService;

  const adminUser = { id: 'usr-admin-001', name: 'Admin Koperasi', role: ROLES.ADMIN };
  const chairmanUser = { id: 'usr-ketua-001', name: 'Dr. Ketua IKMI', role: ROLES.CHAIRMAN };
  const member1User = { id: 'usr-dosen-001', name: 'Dr. Siti Nurhaliza', role: ROLES.MEMBER };
  const member2User = { id: 'usr-mhs-001', name: 'Ahmad Fauzi', role: ROLES.MEMBER };

  beforeEach(async () => {
    global.localStorage.clear();
    transactionService = new FinancialTransactionService();

    // Seed mock members
    await transactionService.db.saveAll('members', [
      { id: 'mbr-001', user_id: 'usr-dosen-001', full_name: 'Dr. Siti Nurhaliza', member_number: 'IKMI-MBR-001' },
      { id: 'mbr-002', user_id: 'usr-mhs-001', full_name: 'Ahmad Fauzi', member_number: 'IKMI-MBR-002' }
    ]);
  });

  describe('1. Transaction Recording (Income, Expense & Reference Tracking)', () => {
    test('Should record Operational Income (Flow: IN)', async () => {
      const income = await transactionService.recordIncome({
        amount: 750000,
        category: 'Administrasi',
        description: 'Penerimaan Biaya Administrasi Anggota',
        created_by: adminUser.id,
        created_by_name: adminUser.name
      });

      assert.ok(income.id);
      assert.ok(income.transaction_number.startsWith('TRX-'));
      assert.strictEqual(income.amount, 750000);
      assert.strictEqual(income.transaction_type, FINANCIAL_TRANSACTION_TYPES.INCOME);
      assert.strictEqual(income.flow, TRANSACTION_FLOW.IN);
      assert.strictEqual(income.is_reversed, false);
    });

    test('Should record Operational Expense (Flow: OUT)', async () => {
      const expense = await transactionService.recordExpense({
        amount: 300000,
        category: 'ATK',
        description: 'Pembelian Perlengkapan Kantor Koperasi',
        created_by: adminUser.id,
        created_by_name: adminUser.name
      });

      assert.strictEqual(expense.amount, 300000);
      assert.strictEqual(expense.transaction_type, FINANCIAL_TRANSACTION_TYPES.EXPENSE);
      assert.strictEqual(expense.flow, TRANSACTION_FLOW.OUT);
    });

    test('Should record Saving Deposit & Loan Disbursement references consistently', async () => {
      const depositTrx = await transactionService.recordSavingDeposit({
        member_id: 'mbr-001',
        saving_transaction_id: 'TRX-SAV-9901',
        amount: 500000,
        saving_type: 'WAJIB',
        created_by: adminUser.id,
        created_by_name: adminUser.name
      });

      assert.strictEqual(depositTrx.transaction_type, FINANCIAL_TRANSACTION_TYPES.SAVING_DEPOSIT);
      assert.strictEqual(depositTrx.reference_type, TRANSACTION_REFERENCE_TYPES.SAVINGS);
      assert.strictEqual(depositTrx.reference_id, 'TRX-SAV-9901');
      assert.strictEqual(depositTrx.flow, TRANSACTION_FLOW.IN);

      const disburseTrx = await transactionService.recordLoanDisbursement({
        loan_id: 'ln-001',
        loan_number: 'LN-202610-0001',
        member_id: 'mbr-001',
        amount: 5000000,
        disbursement_method: 'TRANSFER_BANK',
        created_by: adminUser.id,
        created_by_name: adminUser.name
      });

      assert.strictEqual(disburseTrx.transaction_type, FINANCIAL_TRANSACTION_TYPES.LOAN_DISBURSEMENT);
      assert.strictEqual(disburseTrx.flow, TRANSACTION_FLOW.OUT);
      assert.strictEqual(disburseTrx.reference_type, TRANSACTION_REFERENCE_TYPES.LOANS);
      assert.strictEqual(disburseTrx.reference_id, 'LN-202610-0001');
    });

    test('Should reject transaction with zero or negative amount', async () => {
      await assert.rejects(
        async () => {
          await transactionService.recordIncome({
            amount: 0,
            description: 'Uji Nol'
          });
        },
        /lebih besar dari Rp 0/
      );
    });
  });

  describe('2. Immutability & Reversal Workflow', () => {
    test('Should successfully reverse a transaction and link bidirectional pointers', async () => {
      // 1. Create original expense (OUT)
      const original = await transactionService.recordExpense({
        amount: 200000,
        category: 'Konsumsi',
        description: 'Konsumsi Rapat Pengurus',
        created_by: adminUser.id,
        created_by_name: adminUser.name
      });

      // 2. Perform Reversal
      const { reversal, original: updatedOriginal } = await transactionService.reverseTransaction(
        original.id,
        adminUser,
        { reason: 'Koreksi salah input nota konsumsi' }
      );

      // Reversal should have inverted flow (OUT -> IN) and same amount
      assert.strictEqual(reversal.transaction_type, FINANCIAL_TRANSACTION_TYPES.REVERSAL);
      assert.strictEqual(reversal.flow, TRANSACTION_FLOW.IN);
      assert.strictEqual(reversal.amount, 200000);
      assert.strictEqual(reversal.original_transaction_id, original.id);
      assert.strictEqual(reversal.reversal_reason, 'Koreksi salah input nota konsumsi');

      // Original transaction must remain in DB with reversed flag and pointer
      const details = await transactionService.getTransactionDetails(original.id);
      assert.strictEqual(details.transaction.is_reversed, true);
      assert.strictEqual(details.transaction.reversed_by_transaction_id, reversal.id);
      assert.strictEqual(details.reversalTransaction.id, reversal.id);
    });

    test('Should prevent double reversal on the same transaction', async () => {
      const original = await transactionService.recordIncome({
        amount: 100000,
        description: 'Test Double Reversal'
      });

      await transactionService.reverseTransaction(original.id, adminUser, { reason: 'Reversal 1' });

      await assert.rejects(
        async () => {
          await transactionService.reverseTransaction(original.id, adminUser, { reason: 'Reversal 2' });
        },
        /sudah pernah dibatalkan/
      );
    });

    test('Should require mandatory reversal reason', async () => {
      const original = await transactionService.recordIncome({
        amount: 100000,
        description: 'Test Mandatory Reason'
      });

      await assert.rejects(
        async () => {
          await transactionService.reverseTransaction(original.id, adminUser, { reason: '' });
        },
        /Alasan pembatalan/
      );
    });
  });

  describe('3. Filtering, Search & Pagination', () => {
    beforeEach(async () => {
      // Seed several transactions with varied dates and members
      await transactionService.recordTransaction({
        transaction_type: FINANCIAL_TRANSACTION_TYPES.INCOME,
        flow: TRANSACTION_FLOW.IN,
        amount: 1000000,
        description: 'Sewa Kantin Bulan Januari',
        transaction_date: '2026-01-10T10:00:00.000Z'
      });

      await transactionService.recordTransaction({
        transaction_type: FINANCIAL_TRANSACTION_TYPES.EXPENSE,
        flow: TRANSACTION_FLOW.OUT,
        amount: 400000,
        description: 'Beli ATK Kantor',
        transaction_date: '2026-02-15T10:00:00.000Z'
      });

      await transactionService.recordSavingDeposit({
        member_id: 'mbr-001',
        saving_transaction_id: 'TRX-DEP-001',
        amount: 250000,
        saving_type: 'WAJIB'
      });

      await transactionService.recordSavingDeposit({
        member_id: 'mbr-002',
        saving_transaction_id: 'TRX-DEP-002',
        amount: 150000,
        saving_type: 'SUKARELA'
      });
    });

    test('Should filter by date range correctly', async () => {
      const resultJan = await transactionService.getTransactions({
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      });

      assert.strictEqual(resultJan.items.length, 1);
      assert.strictEqual(resultJan.items[0].transaction.description, 'Sewa Kantin Bulan Januari');
    });

    test('Should filter by transaction type correctly', async () => {
      const result = await transactionService.getTransactions({
        transactionType: FINANCIAL_TRANSACTION_TYPES.EXPENSE
      });

      assert.strictEqual(result.items.length, 1);
      assert.strictEqual(result.items[0].transaction.flow, TRANSACTION_FLOW.OUT);
    });

    test('Should isolate member transactions (Member only sees own records)', async () => {
      const member1Trx = await transactionService.getTransactions({ memberId: 'mbr-001' });
      assert.strictEqual(member1Trx.items.length, 1);
      assert.strictEqual(member1Trx.items[0].transaction.member_id, 'mbr-001');

      const member2Trx = await transactionService.getTransactions({ memberId: 'mbr-002' });
      assert.strictEqual(member2Trx.items.length, 1);
      assert.strictEqual(member2Trx.items[0].transaction.member_id, 'mbr-002');
    });

    test('Should paginate results properly', async () => {
      const page1 = await transactionService.getTransactions({ page: 1, limit: 2 });
      assert.strictEqual(page1.items.length, 2);
      assert.strictEqual(page1.total, 4);
      assert.strictEqual(page1.totalPages, 2);

      const page2 = await transactionService.getTransactions({ page: 2, limit: 2 });
      assert.strictEqual(page2.items.length, 2);
    });

    test('Should search by keyword (description or member name)', async () => {
      const searchRes = await transactionService.getTransactions({ search: 'Kantin' });
      assert.strictEqual(searchRes.items.length, 1);
      assert.strictEqual(searchRes.items[0].transaction.description, 'Sewa Kantin Bulan Januari');
    });
  });

  describe('4. Authorization Tests', () => {
    test('Admin and Chairman have access to financial transaction records', () => {
      requireAuthorization(adminUser, [ROLES.ADMIN]);
      requireAuthorization(chairmanUser, [ROLES.CHAIRMAN, ROLES.ADMIN]);
    });

    test('Member is prevented from accessing Admin general transactions route', () => {
      assert.throws(() => {
        requireAuthorization(member1User, [ROLES.ADMIN]);
      }, /Akses ditolak/);
    });
  });
});
