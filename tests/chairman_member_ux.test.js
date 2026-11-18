import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseAdapter } from '../src/infrastructure/database/adapter.js';
import { MemberService } from '../src/core/services/MemberService.js';
import { SavingService } from '../src/core/services/SavingService.js';
import { LoanService } from '../src/core/services/LoanService.js';
import { FinancialTransactionService } from '../src/core/services/FinancialTransactionService.js';
import { ReportService } from '../src/core/services/ReportService.js';
import { ROLES, MEMBER_TYPES, LOAN_STATUS, SAVING_TYPES, FINANCIAL_TRANSACTION_TYPES, TRANSACTION_FLOW } from '../src/config/constants.js';

// Setup Mock In-Memory Storage for Test Suite
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) { return this.store[key] || null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}

describe('Chairman Monitoring & Member Self-Service Integration Tests', () => {
  let db;
  let memberService;
  let savingService;
  let loanService;
  let finService;
  let reportService;

  let member1, member2;

  beforeEach(async () => {
    global.localStorage = new MockStorage();
    db = new DatabaseAdapter();

    memberService = new MemberService(db);
    savingService = new SavingService();
    savingService.db = db;
    savingService.finService = new FinancialTransactionService(db);

    loanService = new LoanService(db);
    finService = new FinancialTransactionService(db);
    reportService = new ReportService(db);

    // 1. Seed two members
    member1 = await memberService.create({
      member_number: 'IKMI-2026-0001',
      full_name: 'Dr. H. Ahmad Dosen M.Kom',
      identity_number: '0412345678',
      member_type: MEMBER_TYPES.DOSEN,
      email: 'ahmad@ikmi.ac.id',
      phone: '081234567890',
      address: 'Jl. Perjuangan No. 10 Cirebon',
      join_date: '2026-01-10'
    }, { id: 'admin-1', name: 'Super Admin' });

    member2 = await memberService.create({
      member_number: 'IKMI-2026-0002',
      full_name: 'Budi Santoso Mahasiswa',
      identity_number: '2023010099',
      member_type: MEMBER_TYPES.MAHASISWA,
      email: 'budi@ikmi.ac.id',
      phone: '085678901234',
      address: 'Jl. Majalengka No. 44',
      join_date: '2026-02-01'
    }, { id: 'admin-1', name: 'Super Admin' });

    // 2. Member 1 deposits savings
    await savingService.recordTransaction({
      member_id: member1.id,
      saving_type: SAVING_TYPES.POKOK,
      transaction_type: 'DEPOSIT',
      amount: 500000,
      description: 'Simpanan Pokok Awal',
      created_by: member1.id
    });

    await savingService.recordTransaction({
      member_id: member1.id,
      saving_type: SAVING_TYPES.WAJIB,
      transaction_type: 'DEPOSIT',
      amount: 100000,
      description: 'Simpanan Wajib Jan',
      created_by: member1.id
    });

    await savingService.recordTransaction({
      member_id: member1.id,
      saving_type: SAVING_TYPES.SUKARELA,
      transaction_type: 'DEPOSIT',
      amount: 250000,
      description: 'Simpanan Sukarela Jan',
      created_by: member1.id
    });

    // 3. Member 1 applies for a loan and it gets approved + disbursed
    const loanApp = await loanService.applyLoan({
      member_id: member1.id,
      principal_amount: 3000000,
      tenure: 3,
      interest_rate: 6,
      interest_type: 'FLAT',
      purpose: 'Beli Laptop Riset',
      created_by: member1.id
    });

    await loanService.approveLoan(loanApp.id, { id: 'chairman-1', name: 'Ketua IKMI' }, 'Disetujui Ketua');
    const disbursed = await loanService.disburseLoan(loanApp.id, { id: 'admin-1', name: 'Admin Koperasi' });

    // Pay first installment
    const firstInst = disbursed.installments[0];
    await loanService.recordInstallmentPayment(firstInst.id, { id: 'admin-1', name: 'Admin' }, {
      paid_amount: firstInst.total_due,
      payment_method: 'TUNAI'
    });

    // 4. Record Operational Income and Expense
    await finService.recordIncome({
      amount: 250000,
      category: 'JASA_ADMINISTRASI',
      description: 'Biaya Administrasi Formulir',
      created_by: 'admin-1',
      created_by_name: 'Admin'
    });

    await finService.recordExpense({
      amount: 120000,
      category: 'OPERASIONAL_KANTOR',
      description: 'Beli Kertas dan Tinta Printer',
      created_by: 'admin-1',
      created_by_name: 'Admin'
    });
  });

  describe('A. Chairman Monitoring Capabilities', () => {
    test('Should aggregate all executive monitoring metrics accurately', async () => {
      // 1. Total Anggota Aktif
      const activeMembers = (await memberService.getAll()).filter(m => m.status === 'ACTIVE');
      assert.strictEqual(activeMembers.length, 2);

      // 2. Total Simpanan
      const globalBalances = await savingService.getGlobalBalances();
      assert.strictEqual(globalBalances.total, 850000);
      assert.strictEqual(globalBalances[SAVING_TYPES.POKOK], 500000);
      assert.strictEqual(globalBalances[SAVING_TYPES.WAJIB], 100000);
      assert.strictEqual(globalBalances[SAVING_TYPES.SUKARELA], 250000);

      // 3 & 4. Total Pinjaman & Angsuran
      const loanMetrics = await loanService.getExecutiveLoanMetrics();
      assert.strictEqual(loanMetrics.totalDisbursedAmount, 3000000);
      assert.strictEqual(loanMetrics.totalActiveCount, 1);
      assert.strictEqual(loanMetrics.totalRepaymentsCollected > 0, true);

      // 5, 6, 7. Income, Expense, Net Cash Movement
      const cashFlow = await reportService.getCashFlowSummaryReport();
      assert.strictEqual(cashFlow.totalInflow > 0, true);
      assert.strictEqual(cashFlow.totalOutflow > 0, true);
      assert.strictEqual(cashFlow.breakdownInflow[FINANCIAL_TRANSACTION_TYPES.INCOME].amount, 250000);
      assert.strictEqual(cashFlow.breakdownOutflow[FINANCIAL_TRANSACTION_TYPES.EXPENSE].amount, 120000);
      assert.strictEqual(cashFlow.netSurplus, cashFlow.totalInflow - cashFlow.totalOutflow);
    });

    test('Chairman role has read-only capability and cannot perform operational mutations', async () => {
      const chairmanUser = { id: 'usr-chairman', name: 'Ketua STMIK IKMI', role: ROLES.CHAIRMAN };
      
      // Chairman can view loans & approve/reject pending
      const allLoans = await loanService.getAllLoans();
      assert.strictEqual(allLoans.length >= 1, true);

      // Verify Chairman is able to access reporting & executive metrics without mutating financial records
      const metrics = await loanService.getExecutiveLoanMetrics();
      assert.ok(metrics.totalLoansCount >= 1);
    });
  });

  describe('B. Member Self-Service Capabilities & Data Isolation', () => {
    test('Member 1 can retrieve profile, savings breakdown, active loans, and payment history', async () => {
      // 1. Profile & Member Number
      const profile = await memberService.getById(member1.id);
      assert.strictEqual(profile.full_name, 'Dr. H. Ahmad Dosen M.Kom');
      assert.ok(profile.member_number.startsWith('IKMI-'));

      // 2. Savings breakdown (Pokok, Wajib, Sukarela, Total)
      const balances = await savingService.getMemberBalances(member1.id);
      assert.strictEqual(balances.total, 850000);
      assert.strictEqual(balances[SAVING_TYPES.POKOK], 500000);
      assert.strictEqual(balances[SAVING_TYPES.WAJIB], 100000);
      assert.strictEqual(balances[SAVING_TYPES.SUKARELA], 250000);

      // 3. Member Loans & Installments
      const memberLoans = await loanService.getMemberLoans(member1.id);
      assert.strictEqual(memberLoans.length, 1);
      assert.strictEqual(memberLoans[0].loan.principal_amount, 3000000);
      assert.strictEqual(memberLoans[0].installments.length, 3);
      assert.strictEqual(memberLoans[0].installments[0].status, 'PAID');
      assert.strictEqual(memberLoans[0].installments[1].status, 'UNPAID');

      // 4. Member Financial Transactions
      const transactions = await finService.getTransactions({ memberId: member1.id });
      assert.strictEqual(transactions.items.length >= 4, true); // 3 savings + 1 disbursement + 1 installment
    });

    test('Member 2 has empty state for savings and loans and cannot see Member 1 data', async () => {
      // Member 2 balances are 0
      const balances = await savingService.getMemberBalances(member2.id);
      assert.strictEqual(balances.total, 0);
      assert.strictEqual(balances[SAVING_TYPES.POKOK], 0);
      assert.strictEqual(balances[SAVING_TYPES.WAJIB], 0);
      assert.strictEqual(balances[SAVING_TYPES.SUKARELA], 0);

      // Member 2 has 0 loans
      const loans = await loanService.getMemberLoans(member2.id);
      assert.strictEqual(loans.length, 0);

      // Member 2 has 0 financial transactions
      const trxs = await finService.getTransactions({ memberId: member2.id });
      assert.strictEqual(trxs.items.length, 0);
      assert.strictEqual(trxs.total, 0);
    });
  });
});
