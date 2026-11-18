import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ReportService } from '../src/core/services/ReportService.js';
import { MEMBER_TYPES, MEMBER_STATUS, FINANCIAL_TRANSACTION_TYPES, TRANSACTION_FLOW, LOAN_STATUS, INSTALLMENT_STATUS, ROLES } from '../src/config/constants.js';
import { requireAuthorization } from '../src/infrastructure/rbac/authorizationMiddleware.js';

// Mock Browser Environment
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, val) { this.data[key] = String(val); },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

describe('Reports Module Test Suite (Real Database Data Verification)', () => {
  let reportService;

  const adminUser = { id: 'usr-admin-001', name: 'Admin Koperasi', role: ROLES.ADMIN };
  const chairmanUser = { id: 'usr-ketua-001', name: 'Dr. Ketua IKMI', role: ROLES.CHAIRMAN };
  const memberUser = { id: 'usr-dosen-001', name: 'Dr. Siti Nurhaliza', role: ROLES.MEMBER };

  beforeEach(async () => {
    global.localStorage.clear();
    reportService = new ReportService();

    // 1. Seed members
    await reportService.db.saveAll('members', [
      { id: 'mbr-001', member_number: 'IKMI-MBR-001', full_name: 'Dr. Siti Nurhaliza', member_type: MEMBER_TYPES.DOSEN, status: MEMBER_STATUS.ACTIVE, join_date: '2026-01-01' },
      { id: 'mbr-002', member_number: 'IKMI-MBR-002', full_name: 'Ahmad Fauzi', member_type: MEMBER_TYPES.MAHASISWA, status: MEMBER_STATUS.ACTIVE, join_date: '2026-02-01' },
      { id: 'mbr-003', member_number: 'IKMI-MBR-003', full_name: 'Budi Santoso', member_type: MEMBER_TYPES.STAF, status: MEMBER_STATUS.INACTIVE, join_date: '2025-10-01' }
    ]);

    // 2. Seed saving transactions
    await reportService.db.saveAll('saving_transactions', [
      { id: 'sav-001', member_id: 'mbr-001', transaction_type: 'DEPOSIT', saving_type: 'POKOK', amount: 1000000, created_at: '2026-01-05T08:00:00.000Z' },
      { id: 'sav-002', member_id: 'mbr-001', transaction_type: 'DEPOSIT', saving_type: 'WAJIB', amount: 200000, created_at: '2026-01-10T08:00:00.000Z' },
      { id: 'sav-003', member_id: 'mbr-002', transaction_type: 'DEPOSIT', saving_type: 'SUKARELA', amount: 300000, created_at: '2026-02-15T08:00:00.000Z' }
    ]);

    // 3. Seed loans and installments
    await reportService.db.saveAll('loans', [
      { id: 'ln-001', member_id: 'mbr-001', loan_number: 'LN-2026-0001', principal_amount: 10000000, total_interest: 600000, total_repayment: 10600000, paid_amount: 2000000, remaining_principal: 8000000, status: LOAN_STATUS.ACTIVE, start_date: '2026-01-10', created_at: '2026-01-05' }
    ]);

    await reportService.db.saveAll('installments', [
      { id: 'ins-001', loan_id: 'ln-001', installment_number: 1, due_date: '2026-02-10', principal: 1000000, interest: 60000, total_due: 1060000, paid_amount: 1060000, status: INSTALLMENT_STATUS.PAID },
      { id: 'ins-002', loan_id: 'ln-001', installment_number: 2, due_date: '2026-03-10', principal: 1000000, interest: 60000, total_due: 1060000, paid_amount: 0, status: INSTALLMENT_STATUS.OVERDUE }
    ]);

    // 4. Seed financial transactions
    await reportService.db.saveAll('financial_transactions', [
      { id: 'trx-001', transaction_number: 'TRX-001', transaction_type: FINANCIAL_TRANSACTION_TYPES.SAVING_DEPOSIT, flow: TRANSACTION_FLOW.IN, amount: 1200000, category: 'Simpanan', description: 'Setoran Pokok & Wajib', transaction_date: '2026-01-05', is_reversed: false },
      { id: 'trx-002', transaction_number: 'TRX-002', transaction_type: FINANCIAL_TRANSACTION_TYPES.INCOME, flow: TRANSACTION_FLOW.IN, amount: 500000, category: 'Administrasi', description: 'Penerimaan Biaya Admin', transaction_date: '2026-01-15', is_reversed: false },
      { id: 'trx-003', transaction_number: 'TRX-003', transaction_type: FINANCIAL_TRANSACTION_TYPES.EXPENSE, flow: TRANSACTION_FLOW.OUT, amount: 200000, category: 'ATK', description: 'Beli Kertas Kantor', transaction_date: '2026-01-20', is_reversed: false }
    ]);
  });

  describe('1. Laporan Anggota (Members Report)', () => {
    test('Should aggregate member counts accurately', async () => {
      const res = await reportService.getMembersReport();
      assert.strictEqual(res.total, 3);
      assert.strictEqual(res.summary.totalActive, 2);
      assert.strictEqual(res.summary.totalInactive, 1);
      assert.strictEqual(res.summary.totalDosen, 1);
      assert.strictEqual(res.summary.totalMahasiswa, 1);
      assert.strictEqual(res.summary.totalStaf, 1);
    });

    test('Should filter members by status and date', async () => {
      const res = await reportService.getMembersReport({ status: MEMBER_STATUS.ACTIVE });
      assert.strictEqual(res.items.length, 2);

      const res2026 = await reportService.getMembersReport({ startDate: '2026-01-01', endDate: '2026-01-31' });
      assert.strictEqual(res2026.items.length, 1);
      assert.strictEqual(res2026.items[0].member_number, 'IKMI-MBR-001');
    });
  });

  describe('2. Laporan Simpanan (Savings Report)', () => {
    test('Should calculate saving deposits, withdrawals and net balances', async () => {
      const res = await reportService.getSavingsReport();
      assert.strictEqual(res.total, 3);
      assert.strictEqual(res.summary.totalDeposit, 1500000);
      assert.strictEqual(res.summary.totalPokok, 1000000);
      assert.strictEqual(res.summary.totalWajib, 200000);
      assert.strictEqual(res.summary.totalSukarela, 300000);
      assert.strictEqual(res.summary.netSavingsBalance, 1500000);
    });

    test('Should filter savings report by memberId', async () => {
      const res = await reportService.getSavingsReport({ memberId: 'mbr-001' });
      assert.strictEqual(res.items.length, 2);
      assert.strictEqual(res.summary.totalDeposit, 1200000);
    });
  });

  describe('3. Laporan Pinjaman & Angsuran (Loans & Installments Report)', () => {
    test('Should aggregate loans report accurately', async () => {
      const res = await reportService.getLoansReport();
      assert.strictEqual(res.total, 1);
      assert.strictEqual(res.summary.totalPrincipalDisbursed, 10000000);
      assert.strictEqual(res.summary.totalOutstandingPrincipal, 8000000);
      assert.strictEqual(res.summary.activeLoansCount, 1);
    });

    test('Should aggregate installments report and detect overdue sums', async () => {
      const res = await reportService.getInstallmentsReport();
      assert.strictEqual(res.total, 2);
      assert.strictEqual(res.summary.paidCount, 1);
      assert.strictEqual(res.summary.overdueCount, 1);
      assert.strictEqual(res.summary.totalPaidSum, 1060000);
      assert.strictEqual(res.summary.totalOverdueSum, 1060000);
    });
  });

  describe('4. Laporan Transaksi, Pendapatan, dan Pengeluaran', () => {
    test('Should generate General Transactions report with net cash balance', async () => {
      const res = await reportService.getTransactionsReport();
      assert.strictEqual(res.total, 3);
      assert.strictEqual(res.summary.totalInflow, 1700000); // 1.200.000 + 500.000
      assert.strictEqual(res.summary.totalOutflow, 200000);  // 200.000
      assert.strictEqual(res.summary.netBalance, 1500000);
    });

    test('Should generate Income and Expense reports accurately', async () => {
      const incomeRes = await reportService.getIncomeReport();
      assert.strictEqual(incomeRes.summary.totalIncome, 500000);
      assert.strictEqual(incomeRes.summary.totalTransactions, 1);

      const expenseRes = await reportService.getExpenseReport();
      assert.strictEqual(expenseRes.summary.totalExpense, 200000);
      assert.strictEqual(expenseRes.summary.totalTransactions, 1);
    });

    test('Should generate Cash Flow and Surplus Summary report', async () => {
      const summary = await reportService.getCashFlowSummaryReport();
      assert.strictEqual(summary.totalInflow, 1700000);
      assert.strictEqual(summary.totalOutflow, 200000);
      assert.strictEqual(summary.netSurplus, 1500000);
      assert.ok(summary.accountingStandardNotice);
    });
  });

  describe('5. RBAC Authorization for Reports', () => {
    test('Admin and Chairman have authorization for reports', () => {
      requireAuthorization(adminUser, [ROLES.ADMIN]);
      requireAuthorization(chairmanUser, [ROLES.CHAIRMAN, ROLES.ADMIN]);
    });
  });
});
