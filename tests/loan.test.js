import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { LoanService } from '../src/core/services/LoanService.js';
import { InterestCalculator } from '../src/core/services/InterestCalculator.js';
import { LOAN_STATUS, INSTALLMENT_STATUS, INTEREST_CALCULATION_TYPE, ROLES } from '../src/config/constants.js';
import { requireAuthorization } from '../src/infrastructure/rbac/authorizationMiddleware.js';

// --- MOCK BROWSER ENVIRONMENT FOR LOCALSTORAGE ---
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, val) { this.data[key] = String(val); },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

describe('Loan and Installment Module Test Suite', () => {
  let loanService;
  const mockMember = {
    id: 'mbr-test-001',
    member_number: 'IKMI-MBR-001',
    full_name: 'Dr. Test Dosen, M.Kom.',
    user_id: 'usr-dosen-001'
  };

  const adminUser = { id: 'usr-admin-001', name: 'Admin Koperasi', role: ROLES.ADMIN };
  const chairmanUser = { id: 'usr-ketua-001', name: 'Dr. Ketua IKMI', role: ROLES.CHAIRMAN };
  const memberUser = { id: 'usr-dosen-001', name: 'Dr. Test Dosen', role: ROLES.MEMBER };

  beforeEach(async () => {
    global.localStorage.clear();
    loanService = new LoanService();
    // Seed member into test db
    await loanService.db.insert('members', mockMember);
  });

  describe('1. Configurable Interest Calculation Engine', () => {
    test('Should accurately calculate FLAT interest schedule', () => {
      const principal = 12000000;
      const annualRate = 12; // 12% per year -> 1% per month -> Rp 120.000 interest/month
      const tenureMonths = 12;

      const result = InterestCalculator.generateSchedule({
        principal,
        annualInterestRate: annualRate,
        tenureMonths,
        interestType: INTEREST_CALCULATION_TYPE.FLAT,
        startDate: '2026-01-01'
      });

      assert.strictEqual(result.schedule.length, 12);
      assert.strictEqual(result.total_interest, 1440000); // 12 * 120.000
      assert.strictEqual(result.total_repayment, 13440000);
      assert.strictEqual(result.schedule[0].principal, 1000000);
      assert.strictEqual(result.schedule[0].interest, 120000);
      assert.strictEqual(result.schedule[0].total_due, 1120000);
    });

    test('Should accurately calculate ZERO_INTEREST (Syariah Qardh) schedule', () => {
      const principal = 6000000;
      const tenureMonths = 6;

      const result = InterestCalculator.generateSchedule({
        principal,
        annualInterestRate: 0,
        tenureMonths,
        interestType: INTEREST_CALCULATION_TYPE.ZERO_INTEREST,
        startDate: '2026-01-01'
      });

      assert.strictEqual(result.schedule.length, 6);
      assert.strictEqual(result.total_interest, 0);
      assert.strictEqual(result.total_repayment, 6000000);
      assert.strictEqual(result.schedule[0].interest, 0);
      assert.strictEqual(result.schedule[0].total_due, 1000000);
    });

    test('Should accurately calculate DECLINING (Effective) interest schedule', () => {
      const principal = 10000000;
      const annualRate = 12;
      const tenureMonths = 5;

      const result = InterestCalculator.generateSchedule({
        principal,
        annualInterestRate: annualRate,
        tenureMonths,
        interestType: INTEREST_CALCULATION_TYPE.DECLINING,
        startDate: '2026-01-01'
      });

      assert.strictEqual(result.schedule.length, 5);
      // First month interest on 10,000,000 = 100,000
      assert.strictEqual(result.schedule[0].interest, 100000);
      // Later months interest should decrease
      assert.ok(result.schedule[0].interest > result.schedule[1].interest);
      assert.ok(result.schedule[1].interest > result.schedule[2].interest);
    });

    test('Should accurately calculate ANNUITY interest schedule', () => {
      const principal = 10000000;
      const annualRate = 12;
      const tenureMonths = 6;

      const result = InterestCalculator.generateSchedule({
        principal,
        annualInterestRate: annualRate,
        tenureMonths,
        interestType: INTEREST_CALCULATION_TYPE.ANNUITY,
        startDate: '2026-01-01'
      });

      assert.strictEqual(result.schedule.length, 6);
      // Annuity monthly total dues should be identical (except minor final rounding)
      assert.strictEqual(result.schedule[0].total_due, result.schedule[1].total_due);
      assert.ok(result.total_interest > 0);
    });
  });

  describe('2. Loan Application Workflow', () => {
    test('Should create a loan application with status PENDING and audit history', async () => {
      const loan = await loanService.applyLoan({
        member_id: mockMember.id,
        principal_amount: 5000000,
        tenure: 10,
        interest_rate: 6,
        interest_type: INTEREST_CALCULATION_TYPE.FLAT,
        purpose: 'Biaya Publikasi Jurnal Ilmiah',
        created_by: memberUser.id,
        created_by_name: memberUser.name
      });

      assert.ok(loan.id);
      assert.strictEqual(loan.status, LOAN_STATUS.PENDING);
      assert.strictEqual(loan.principal_amount, 5000000);
      assert.strictEqual(loan.tenure, 10);
      assert.ok(loan.loan_number.startsWith('LN-'));

      const details = await loanService.getLoanDetails(loan.id);
      assert.strictEqual(details.history.length, 1);
      assert.strictEqual(details.history[0].new_status, LOAN_STATUS.PENDING);
    });

    test('Should reject application with invalid amount or missing purpose', async () => {
      await assert.rejects(
        async () => {
          await loanService.applyLoan({
            member_id: mockMember.id,
            principal_amount: 0,
            tenure: 6,
            purpose: 'Beli laptop'
          });
        },
        /harus lebih besar dari Rp 0/
      );

      await assert.rejects(
        async () => {
          await loanService.applyLoan({
            member_id: mockMember.id,
            principal_amount: 5000000,
            tenure: 6,
            purpose: ''
          });
        },
        /Tujuan pengajuan pinjaman wajib diisi/
      );
    });
  });

  describe('3. Loan Review, Approval and Rejection Tests', () => {
    let pendingLoan;

    beforeEach(async () => {
      pendingLoan = await loanService.applyLoan({
        member_id: mockMember.id,
        principal_amount: 10000000,
        tenure: 10,
        interest_rate: 10,
        interest_type: INTEREST_CALCULATION_TYPE.FLAT,
        purpose: 'Renovasi Laboratorium',
        created_by: memberUser.id
      });
    });

    test('Approval Test: Admin/Chairman approves loan', async () => {
      const approved = await loanService.approveLoan(pendingLoan.id, adminUser, 'Dokumen lengkap dan disetujui');
      assert.strictEqual(approved.status, LOAN_STATUS.APPROVED);
      assert.strictEqual(approved.approved_by, adminUser.id);
      assert.ok(approved.approved_at);

      const details = await loanService.getLoanDetails(pendingLoan.id);
      assert.strictEqual(details.history.length, 2);
      assert.strictEqual(details.history[1].new_status, LOAN_STATUS.APPROVED);
    });

    test('Rejection Test: Loan is rejected with mandatory reason', async () => {
      const rejected = await loanService.rejectLoan(pendingLoan.id, chairmanUser, 'Rasio DSR anggota melebihi batas 40%');
      assert.strictEqual(rejected.status, LOAN_STATUS.REJECTED);
      assert.strictEqual(rejected.rejection_reason, 'Rasio DSR anggota melebihi batas 40%');

      const details = await loanService.getLoanDetails(pendingLoan.id);
      assert.strictEqual(details.loan.status, LOAN_STATUS.REJECTED);
      assert.strictEqual(details.history[1].new_status, LOAN_STATUS.REJECTED);
    });

    test('Rejection Test: Fails when rejection reason is missing', async () => {
      await assert.rejects(
        async () => {
          await loanService.rejectLoan(pendingLoan.id, adminUser, '');
        },
        /Alasan penolakan/
      );
    });
  });

  describe('4. Loan Disbursement (Pencairan) and Installment Schedule Generation', () => {
    let approvedLoan;

    beforeEach(async () => {
      const loan = await loanService.applyLoan({
        member_id: mockMember.id,
        principal_amount: 6000000,
        tenure: 6,
        interest_rate: 12,
        interest_type: INTEREST_CALCULATION_TYPE.FLAT,
        purpose: 'Pengembangan Riset AI',
        created_by: memberUser.id
      });
      approvedLoan = await loanService.approveLoan(loan.id, adminUser, 'Disetujui komite');
    });

    test('Disbursement Test: Activates loan and generates installments', async () => {
      const result = await loanService.disburseLoan(approvedLoan.id, adminUser, {
        disbursement_date: '2026-03-01',
        disbursement_method: 'TRANSFER_BANK',
        notes: 'Bukti transfer No. TRF-99882'
      });

      assert.strictEqual(result.loan.status, LOAN_STATUS.ACTIVE);
      assert.strictEqual(result.loan.disbursed_by, adminUser.id);
      assert.strictEqual(result.installments.length, 6);

      // Verify first installment
      const firstInst = result.installments[0];
      assert.strictEqual(firstInst.installment_number, 1);
      assert.strictEqual(firstInst.principal, 1000000);
      assert.strictEqual(firstInst.interest, 60000);
      assert.strictEqual(firstInst.total_due, 1060000);
      assert.strictEqual(firstInst.status, INSTALLMENT_STATUS.UNPAID);

      const details = await loanService.getLoanDetails(approvedLoan.id);
      assert.strictEqual(details.installments.length, 6);
      assert.strictEqual(details.loan.status, LOAN_STATUS.ACTIVE);
    });

    test('Disbursement Test: Rejects disbursement on unapproved loan', async () => {
      const unapproved = await loanService.applyLoan({
        member_id: mockMember.id,
        principal_amount: 3000000,
        tenure: 3,
        purpose: 'Seminar'
      });

      await assert.rejects(
        async () => {
          await loanService.disburseLoan(unapproved.id, adminUser);
        },
        /Hanya pinjaman dengan status APPROVED yang dapat dicairkan/
      );
    });
  });

  describe('5. Installment Payment, Overdue, and Paid Off Lifecycle', () => {
    let activeLoan;
    let installments;

    beforeEach(async () => {
      const loan = await loanService.applyLoan({
        member_id: mockMember.id,
        principal_amount: 3000000,
        tenure: 3,
        interest_rate: 0,
        interest_type: INTEREST_CALCULATION_TYPE.ZERO_INTEREST,
        purpose: 'Biaya Pendidikan',
        start_date: '2026-01-01'
      });
      await loanService.approveLoan(loan.id, adminUser);
      const disburseResult = await loanService.disburseLoan(loan.id, adminUser, {
        disbursement_date: '2026-01-01'
      });
      activeLoan = disburseResult.loan;
      installments = disburseResult.installments;
    });

    test('Payment Test: Partial payment on installment', async () => {
      const inst1 = installments[0];
      const res = await loanService.recordInstallmentPayment(inst1.id, adminUser, {
        paid_amount: 500000,
        payment_method: 'TRANSFER'
      });

      assert.strictEqual(res.installment.status, INSTALLMENT_STATUS.PARTIALLY_PAID);
      assert.strictEqual(res.installment.paid_amount, 500000);
      assert.strictEqual(res.isPaidOff, false);

      const details = await loanService.getLoanDetails(activeLoan.id);
      assert.strictEqual(details.loan.paid_amount, 500000);
      assert.strictEqual(details.loan.status, LOAN_STATUS.ACTIVE);
    });

    test('Payment Test: Full payment on installment', async () => {
      const inst1 = installments[0];
      const res = await loanService.recordInstallmentPayment(inst1.id, adminUser, {
        paid_amount: 1000000,
        payment_method: 'TUNAI'
      });

      assert.strictEqual(res.installment.status, INSTALLMENT_STATUS.PAID);
      assert.strictEqual(res.installment.paid_amount, 1000000);
      assert.ok(res.installment.paid_date);
    });

    test('Paid Off Test: Loan automatically marked PAID_OFF when all installments paid', async () => {
      // Pay installment 1
      await loanService.recordInstallmentPayment(installments[0].id, adminUser, { paid_amount: 1000000 });
      // Pay installment 2
      await loanService.recordInstallmentPayment(installments[1].id, adminUser, { paid_amount: 1000000 });
      // Pay installment 3 (final)
      const resFinal = await loanService.recordInstallmentPayment(installments[2].id, adminUser, { paid_amount: 1000000 });

      assert.strictEqual(resFinal.isPaidOff, true);
      assert.strictEqual(resFinal.loan.status, LOAN_STATUS.PAID_OFF);
      assert.strictEqual(resFinal.loan.remaining_principal, 0);
      assert.strictEqual(resFinal.loan.paid_amount, 3000000);

      const details = await loanService.getLoanDetails(activeLoan.id);
      assert.strictEqual(details.loan.status, LOAN_STATUS.PAID_OFF);
      const lastHistory = details.history[details.history.length - 1];
      assert.strictEqual(lastHistory.new_status, LOAN_STATUS.PAID_OFF);
    });

    test('Overdue Test: Correctly identifies and flags past due installments', async () => {
      // Set future simulation date past due_date of installment 1 & 2
      const futureDate = new Date('2026-06-01');
      const updated = await loanService.checkAndUpdateOverdueStatus(futureDate);

      assert.ok(updated.length >= 3);
      const overdueList = await loanService.getOverdueInstallments();
      assert.strictEqual(overdueList.length, 3);
      assert.strictEqual(overdueList[0].installment.status, INSTALLMENT_STATUS.OVERDUE);
    });
  });

  describe('6. Authorization and RBAC Tests', () => {
    test('Admin should have full access to all loan capabilities', () => {
      requireAuthorization(adminUser, [ROLES.ADMIN]);
    });

    test('Chairman should have access to executive monitoring and approval', () => {
      requireAuthorization(chairmanUser, [ROLES.CHAIRMAN, ROLES.ADMIN]);
    });

    test('Member cannot access Admin or Chairman specific endpoints', () => {
      assert.throws(() => {
        requireAuthorization(memberUser, [ROLES.ADMIN]);
      }, /Akses ditolak/);

      assert.throws(() => {
        requireAuthorization(memberUser, [ROLES.CHAIRMAN]);
      }, /Akses ditolak/);
    });
  });
});
