/**
 * Loan & Installment Domain Service
 * Encapsulates end-to-end Loan Lifecycle:
 * Pengajuan -> Review -> Persetujuan/Penolakan -> Pencairan -> Pembayaran Angsuran -> Pelunasan
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { DatabaseAdapter } from '../../infrastructure/database/adapter.js';
import { LoanEntity } from '../entities/Loan.js';
import { InstallmentEntity } from '../entities/Installment.js';
import { InterestCalculator } from './InterestCalculator.js';
import { FinancialTransactionService } from './FinancialTransactionService.js';
import { LOAN_STATUS, INSTALLMENT_STATUS, INTEREST_CALCULATION_TYPE, ROLES } from '../../config/constants.js';
import { AuthorizationError } from '../../infrastructure/rbac/authorizationMiddleware.js';

export class LoanService {
  constructor(adapter = null) {
    this.db = adapter || new DatabaseAdapter();
    this.loansTable = 'loans';
    this.installmentsTable = 'installments';
    this.historyTable = 'loan_status_history';
    this.membersTable = 'members';
    this.finService = new FinancialTransactionService(this.db);
  }

  /**
   * Enforce member data isolation at backend database query layer
   */
  async _validateMemberAccess(user, requestedMemberId) {
    if (!user) return true;
    if (user.role === ROLES.ADMIN || user.role === ROLES.CHAIRMAN) return true;

    const memberRecord = await this.db.findById(this.membersTable, user.id, 'user_id');
    const actualMemberId = memberRecord ? memberRecord.id : `mbr-${user.id}`;

    if (requestedMemberId !== actualMemberId) {
      throw new AuthorizationError(
        'Isolasi Data Database: Anda tidak memiliki hak untuk mengakses catatan pinjaman anggota lain.',
        'FORBIDDEN_DATA_ISOLATION'
      );
    }
  }

  /**
   * Helper: Record status change audit trail
   */
  async _recordStatusHistory(loanId, previousStatus, newStatus, changedBy, changedByName = '', notes = '') {
    const historyRecord = {
      id: `HST-${crypto.randomUUID()}`,
      loan_id: loanId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: changedBy,
      changed_by_name: changedByName,
      notes: notes,
      timestamp: new Date().toISOString()
    };
    await this.db.insert(this.historyTable, historyRecord);
    return historyRecord;
  }

  _dispatchTelegramNotification(eventType, eventData) {
    try {
      if (typeof fetch !== 'undefined') {
        fetch('/api/telegram/notify-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType, eventData })
        }).catch(() => {});
      }
    } catch {
      // Safe non-blocking catch: Financial transaction is 100% safeguarded
    }
  }

  /**
   * Generates next unique loan number format: LN-YYYYMM-XXXX
   */
  async _generateLoanNumber() {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const allLoans = await this.db.getAll(this.loansTable);
    const count = (allLoans.length + 1).toString().padStart(4, '0');
    return `LN-${yearMonth}-${count}`;
  }

  /**
   * 1. PENGAJUAN PINJAMAN (LOAN APPLICATION)
   */
  async applyLoan({
    member_id,
    principal_amount,
    tenure,
    interest_rate = 0,
    interest_type = INTEREST_CALCULATION_TYPE.FLAT,
    purpose,
    notes = '',
    start_date = new Date().toISOString().split('T')[0],
    created_by,
    created_by_name = ''
  }) {
    if (!member_id) {
      throw new Error('Data anggota peminjam wajib diisi.');
    }

    const member = await this.db.findById(this.membersTable, member_id);
    if (!member) {
      throw new Error('Anggota tidak ditemukan dalam basis data.');
    }

    const principal = Number(principal_amount);
    if (!principal || principal <= 0) {
      throw new Error('Jumlah pokok pinjaman harus lebih besar dari Rp 0.');
    }

    const tenureMonths = parseInt(tenure, 10);
    if (!tenureMonths || tenureMonths < 1) {
      throw new Error('Tenor pinjaman minimal 1 bulan.');
    }

    if (!purpose || purpose.trim().length === 0) {
      throw new Error('Tujuan pengajuan pinjaman wajib diisi.');
    }

    // Calculate simulation breakdown
    const scheduleCalc = InterestCalculator.generateSchedule({
      principal,
      annualInterestRate: Number(interest_rate) || 0,
      tenureMonths,
      interestType: interest_type,
      startDate: start_date
    });

    const loanNumber = await this._generateLoanNumber();
    const finalDueDate = scheduleCalc.schedule.length > 0 
      ? scheduleCalc.schedule[scheduleCalc.schedule.length - 1].due_date 
      : InterestCalculator.getDueDate(start_date, tenureMonths);

    const loan = new LoanEntity({
      id: `LN-${crypto.randomUUID()}`,
      member_id,
      loan_number: loanNumber,
      principal_amount: principal,
      interest_rate: Number(interest_rate) || 0,
      interest_type,
      tenure: tenureMonths,
      start_date,
      due_date: finalDueDate,
      status: LOAN_STATUS.PENDING,
      purpose: purpose.trim(),
      notes: notes.trim(),
      total_interest: scheduleCalc.total_interest,
      total_repayment: scheduleCalc.total_repayment,
      paid_amount: 0,
      remaining_principal: principal,
      created_by: created_by || member_id,
      created_at: new Date().toISOString()
    });

    await this.db.insert(this.loansTable, loan.toJSON());

    // Record initial status in history
    await this._recordStatusHistory(
      loan.id,
      null,
      LOAN_STATUS.PENDING,
      created_by || member_id,
      created_by_name || member.full_name,
      `Pengajuan pinjaman baru diajukan sebesar Rp ${principal.toLocaleString('id-ID')} dengan tenor ${tenureMonths} bulan.`
    );

    // Non-blocking Telegram notification (Pengajuan Pinjaman Baru)
    this._dispatchTelegramNotification('LOAN_APPLICATION', {
      loan: loan.toJSON(),
      member
    });

    return loan;
  }

  /**
   * 2. REVIEW PINJAMAN (ADMIN/CHAIRMAN)
   */
  async reviewLoan(loanId, user, reviewNotes = '') {
    const loanRecord = await this.db.findById(this.loansTable, loanId);
    if (!loanRecord || loanRecord.is_deleted) {
      throw new Error('Data pinjaman tidak ditemukan.');
    }

    const updated = await this.db.update(this.loansTable, loanId, {
      reviewed_by: user.id || user.name,
      reviewed_at: new Date().toISOString(),
      notes: reviewNotes ? `${loanRecord.notes ? loanRecord.notes + ' | ' : ''}Review: ${reviewNotes}` : loanRecord.notes
    });

    await this._recordStatusHistory(
      loanId,
      loanRecord.status,
      loanRecord.status,
      user.id,
      user.name,
      `Review pinjaman: ${reviewNotes || 'Dokumen dan kelayakan pinjaman telah ditinjau.'}`
    );

    return new LoanEntity(updated);
  }

  /**
   * 3. PERSETUJUAN PINJAMAN (APPROVAL)
   */
  async approveLoan(loanId, user, approvalNotes = '') {
    const loanRecord = await this.db.findById(this.loansTable, loanId);
    if (!loanRecord || loanRecord.is_deleted) {
      throw new Error('Data pinjaman tidak ditemukan.');
    }

    if (loanRecord.status !== LOAN_STATUS.PENDING) {
      throw new Error(`Pinjaman tidak dapat disetujui karena berstatus ${loanRecord.status}.`);
    }

    const previousStatus = loanRecord.status;
    const updateData = {
      status: LOAN_STATUS.APPROVED,
      approved_by: user.id || user.name,
      approved_at: new Date().toISOString(),
      notes: approvalNotes ? `${loanRecord.notes ? loanRecord.notes + ' | ' : ''}Approval: ${approvalNotes}` : loanRecord.notes
    };

    const updated = await this.db.update(this.loansTable, loanId, updateData);

    await this._recordStatusHistory(
      loanId,
      previousStatus,
      LOAN_STATUS.APPROVED,
      user.id,
      user.name,
      approvalNotes || 'Pengajuan pinjaman telah disetujui.'
    );

    // Non-blocking Telegram notification (Persetujuan Pinjaman)
    (async () => {
      try {
        const member = await this.db.findById(this.membersTable, loanRecord.member_id);
        this._dispatchTelegramNotification('LOAN_STATUS_CHANGE', {
          loan: updated,
          member: member || {},
          previousStatus,
          newStatus: LOAN_STATUS.APPROVED,
          notesOrReason: approvalNotes
        });
      } catch {}
    })();

    return new LoanEntity(updated);
  }

  /**
   * 4. PENOLAKAN PINJAMAN (REJECTION)
   */
  async rejectLoan(loanId, user, rejectionReason) {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new Error('Alasan penolakan pengajuan pinjaman wajib dicantumkan.');
    }

    const loanRecord = await this.db.findById(this.loansTable, loanId);
    if (!loanRecord || loanRecord.is_deleted) {
      throw new Error('Data pinjaman tidak ditemukan.');
    }

    if (loanRecord.status !== LOAN_STATUS.PENDING && loanRecord.status !== LOAN_STATUS.APPROVED) {
      throw new Error(`Pinjaman berstatus ${loanRecord.status} tidak dapat ditolak.`);
    }

    const previousStatus = loanRecord.status;
    const updateData = {
      status: LOAN_STATUS.REJECTED,
      rejection_reason: rejectionReason.trim(),
      updated_at: new Date().toISOString()
    };

    const updated = await this.db.update(this.loansTable, loanId, updateData);

    await this._recordStatusHistory(
      loanId,
      previousStatus,
      LOAN_STATUS.REJECTED,
      user.id,
      user.name,
      `Alasan penolakan: ${rejectionReason.trim()}`
    );

    // Non-blocking Telegram notification (Penolakan Pinjaman)
    (async () => {
      try {
        const member = await this.db.findById(this.membersTable, loanRecord.member_id);
        this._dispatchTelegramNotification('LOAN_STATUS_CHANGE', {
          loan: updated,
          member: member || {},
          previousStatus,
          newStatus: LOAN_STATUS.REJECTED,
          notesOrReason: rejectionReason.trim()
        });
      } catch {}
    })();

    return new LoanEntity(updated);
  }

  /**
   * 5. PEMBATALAN PINJAMAN (CANCELLATION)
   */
  async cancelLoan(loanId, user, reason = '') {
    const loanRecord = await this.db.findById(this.loansTable, loanId);
    if (!loanRecord || loanRecord.is_deleted) {
      throw new Error('Data pinjaman tidak ditemukan.');
    }

    if (loanRecord.status !== LOAN_STATUS.PENDING) {
      throw new Error(`Hanya pinjaman dengan status PENDING yang dapat dibatalkan.`);
    }

    const previousStatus = loanRecord.status;
    const updateData = {
      status: LOAN_STATUS.CANCELLED,
      notes: reason ? `${loanRecord.notes ? loanRecord.notes + ' | ' : ''}Batal: ${reason}` : loanRecord.notes,
      updated_at: new Date().toISOString()
    };

    const updated = await this.db.update(this.loansTable, loanId, updateData);

    await this._recordStatusHistory(
      loanId,
      previousStatus,
      LOAN_STATUS.CANCELLED,
      user.id,
      user.name,
      reason || 'Pengajuan pinjaman dibatalkan.'
    );

    return new LoanEntity(updated);
  }

  /**
   * 6. PENCAIRAN PINJAMAN (DISBURSEMENT) & PEMBUATAN JADWAL ANGSURAN
   */
  async disburseLoan(loanId, user, {
    disbursement_date = new Date().toISOString().split('T')[0],
    disbursement_method = 'KAS_KOPERASI',
    notes = ''
  } = {}) {
    const loanRecord = await this.db.findById(this.loansTable, loanId);
    if (!loanRecord || loanRecord.is_deleted) {
      throw new Error('Data pinjaman tidak ditemukan.');
    }

    if (loanRecord.status !== LOAN_STATUS.APPROVED) {
      throw new Error(`Hanya pinjaman dengan status APPROVED yang dapat dicairkan. Status saat ini: ${loanRecord.status}.`);
    }

    // 1. Generate active installment schedule
    const scheduleResult = InterestCalculator.generateSchedule({
      principal: loanRecord.principal_amount,
      annualInterestRate: loanRecord.interest_rate,
      tenureMonths: loanRecord.tenure,
      interestType: loanRecord.interest_type,
      startDate: disbursement_date
    });

    const installmentEntities = [];
    for (const item of scheduleResult.schedule) {
      const inst = new InstallmentEntity({
        id: `INS-${crypto.randomUUID()}`,
        loan_id: loanId,
        installment_number: item.installment_number,
        due_date: item.due_date,
        principal: item.principal,
        interest: item.interest,
        total_due: item.total_due,
        paid_amount: 0,
        paid_date: null,
        status: INSTALLMENT_STATUS.UNPAID,
        payment_method: null,
        notes: ''
      });
      await this.db.insert(this.installmentsTable, inst.toJSON());
      installmentEntities.push(inst);
    }

    const previousStatus = loanRecord.status;
    const finalDueDate = scheduleResult.schedule[scheduleResult.schedule.length - 1].due_date;

    // 2. Update loan record to ACTIVE / DISBURSED
    const updateData = {
      status: LOAN_STATUS.ACTIVE,
      start_date: disbursement_date,
      due_date: finalDueDate,
      disbursed_by: user.id || user.name,
      disbursed_at: new Date().toISOString(),
      notes: notes ? `${loanRecord.notes ? loanRecord.notes + ' | ' : ''}Pencairan (${disbursement_method}): ${notes}` : loanRecord.notes
    };

    const updated = await this.db.update(this.loansTable, loanId, updateData);

    // 3. Record status history
    await this._recordStatusHistory(
      loanId,
      previousStatus,
      LOAN_STATUS.ACTIVE,
      user.id,
      user.name,
      `Dana pinjaman dicairkan sebesar Rp ${loanRecord.principal_amount.toLocaleString('id-ID')} melalui ${disbursement_method}. Jadwal ${installmentEntities.length} angsuran telah diaktifkan.`
    );

    // 4. Record into General Financial Transactions Ledger
    try {
      await this.finService.recordLoanDisbursement({
        loan_id: loanRecord.id,
        loan_number: loanRecord.loan_number,
        member_id: loanRecord.member_id,
        amount: loanRecord.principal_amount,
        disbursement_method,
        created_by: user.id,
        created_by_name: user.name
      });
    } catch (e) {
      console.warn('[LoanService] Failed to post disbursement to general ledger:', e);
    }

    // Non-blocking Telegram notification (Pencairan Pinjaman)
    (async () => {
      try {
        const member = await this.db.findById(this.membersTable, loanRecord.member_id);
        this._dispatchTelegramNotification('LOAN_STATUS_CHANGE', {
          loan: updated,
          member: member || {},
          previousStatus,
          newStatus: LOAN_STATUS.ACTIVE,
          notesOrReason: notes || `Pencairan dana pinjaman melalui ${disbursement_method}`
        });
      } catch {}
    })();

    return {
      loan: new LoanEntity(updated),
      installments: installmentEntities
    };
  }

  /**
   * 7. PEMBAYARAN ANGSURAN (INSTALLMENT PAYMENT) & EVALUASI PELUNASAN (PAID_OFF)
   */
  async recordInstallmentPayment(installmentId, user, {
    paid_amount,
    payment_date = new Date().toISOString(),
    payment_method = 'TUNAI',
    notes = ''
  }) {
    const amount = Number(paid_amount);
    if (!amount || amount <= 0) {
      throw new Error('Jumlah pembayaran angsuran harus lebih besar dari Rp 0.');
    }

    const installmentRecord = await this.db.findById(this.installmentsTable, installmentId);
    if (!installmentRecord || installmentRecord.is_deleted) {
      throw new Error('Data angsuran tidak ditemukan.');
    }

    if (installmentRecord.status === INSTALLMENT_STATUS.PAID) {
      throw new Error(`Angsuran ke-${installmentRecord.installment_number} sudah lunas.`);
    }

    const loanRecord = await this.db.findById(this.loansTable, installmentRecord.loan_id);
    if (!loanRecord || loanRecord.is_deleted) {
      throw new Error('Data pinjaman terkait tidak ditemukan.');
    }

    const currentPaid = Number(installmentRecord.paid_amount || 0);
    const newPaidAmount = currentPaid + amount;
    const totalDue = Number(installmentRecord.total_due);

    let newInstallmentStatus = INSTALLMENT_STATUS.PARTIALLY_PAID;
    let paidDate = installmentRecord.paid_date;

    if (newPaidAmount >= totalDue) {
      newInstallmentStatus = INSTALLMENT_STATUS.PAID;
      paidDate = payment_date;
    }

    const receiptNumber = `RCP-${Date.now().toString().slice(-8)}`;

    // 1. Update installment record
    const updatedInstallment = await this.db.update(this.installmentsTable, installmentId, {
      paid_amount: newPaidAmount,
      paid_date: paidDate,
      status: newInstallmentStatus,
      payment_method: payment_method,
      payment_receipt: receiptNumber,
      notes: notes ? `${installmentRecord.notes ? installmentRecord.notes + ' | ' : ''}${notes}` : installmentRecord.notes
    });

    // 2. Update loan total paid & remaining balance
    const allLoanInstallments = await this.db.find(this.installmentsTable, { loan_id: loanRecord.id });
    
    let totalLoanPaid = 0;
    let totalPrincipalPaid = 0;
    let allPaid = true;

    allLoanInstallments.forEach(item => {
      totalLoanPaid += Number(item.paid_amount || 0);
      if (item.status === INSTALLMENT_STATUS.PAID) {
        totalPrincipalPaid += Number(item.principal || 0);
      } else if (item.status === INSTALLMENT_STATUS.PARTIALLY_PAID) {
        // Proportionate principal portion
        const ratio = Number(item.paid_amount) / Number(item.total_due);
        totalPrincipalPaid += (Number(item.principal) * ratio);
        allPaid = false;
      } else {
        allPaid = false;
      }
    });

    const remainingPrincipal = Math.max(0, loanRecord.principal_amount - totalPrincipalPaid);

    let loanUpdateData = {
      paid_amount: totalLoanPaid,
      remaining_principal: Math.round(remainingPrincipal)
    };

    let isLoanPaidOff = false;

    // 3. Pelunasan check
    if (allPaid && allLoanInstallments.length > 0) {
      loanUpdateData.status = LOAN_STATUS.PAID_OFF;
      loanUpdateData.remaining_principal = 0;
      isLoanPaidOff = true;
    }

    const updatedLoan = await this.db.update(this.loansTable, loanRecord.id, loanUpdateData);

    if (isLoanPaidOff) {
      await this._recordStatusHistory(
        loanRecord.id,
        loanRecord.status,
        LOAN_STATUS.PAID_OFF,
        user.id,
        user.name,
        `Seluruh angsuran pinjaman ${loanRecord.loan_number} telah lunas sebesar Rp ${totalLoanPaid.toLocaleString('id-ID')}. Status pinjaman: LUNAS (PAID_OFF).`
      );
    }

    // 4. Record into General Financial Transactions Ledger
    try {
      await this.finService.recordInstallmentPayment({
        loan_id: loanRecord.id,
        installment_id: installmentRecord.id,
        loan_number: loanRecord.loan_number,
        installment_number: installmentRecord.installment_number,
        member_id: loanRecord.member_id,
        amount: amount,
        payment_method,
        payment_receipt: receiptNumber,
        created_by: user.id,
        created_by_name: user.name
      });
    } catch (e) {
      console.warn('[LoanService] Failed to post installment payment to general ledger:', e);
    }

    // Non-blocking Telegram notification (Pembayaran Angsuran & Pelunasan)
    (async () => {
      try {
        const member = await this.db.findById(this.membersTable, loanRecord.member_id);
        this._dispatchTelegramNotification('TRANSACTION_SUCCESS', {
          transaction: {
            transaction_number: receiptNumber,
            transaction_type: 'INSTALLMENT_PAYMENT',
            flow: 'IN',
            amount,
            description: `Pembayaran angsuran ke-${installmentRecord.installment_number} pinjaman ${loanRecord.loan_number} (${payment_method})`
          },
          member: member || {}
        });

        if (isLoanPaidOff) {
          this._dispatchTelegramNotification('LOAN_STATUS_CHANGE', {
            loan: updatedLoan,
            member: member || {},
            previousStatus: LOAN_STATUS.ACTIVE,
            newStatus: LOAN_STATUS.PAID_OFF,
            notesOrReason: 'Selamat! Seluruh kewajiban angsuran pinjaman telah lunas penuh.'
          });
        }
      } catch {}
    })();

    return {
      installment: new InstallmentEntity(updatedInstallment),
      loan: new LoanEntity(updatedLoan),
      isPaidOff: isLoanPaidOff,
      receiptNumber
    };
  }

  /**
   * 8. DETEKSI & UPDATE STATUS ANGSURAN OVERDUE / TUNGGAKAN
   */
  async checkAndUpdateOverdueStatus(referenceDate = new Date()) {
    const allInstallments = await this.db.getAll(this.installmentsTable);
    const updatedList = [];

    for (const inst of allInstallments) {
      if (inst.status !== INSTALLMENT_STATUS.PAID && !inst.is_deleted) {
        const entity = new InstallmentEntity(inst);
        const originalStatus = entity.status;
        entity.checkAndUpdateOverdue(referenceDate);

        if (entity.status !== originalStatus) {
          await this.db.update(this.installmentsTable, entity.id, { status: entity.status });
          updatedList.push(entity);
        }
      }
    }

    return updatedList;
  }

  /**
   * 9. GET LOAN BY ID (WITH FULL DETAILS, INSTALLMENTS, AND AUDIT TRAIL)
   */
  async getLoanDetails(loanId, user = null) {
    const loanRecord = await this.db.findById(this.loansTable, loanId);
    if (!loanRecord || loanRecord.is_deleted) {
      return null;
    }

    if (user) {
      await this._validateMemberAccess(user, loanRecord.member_id);
    }

    const member = await this.db.findById(this.membersTable, loanRecord.member_id);
    const installmentsData = await this.db.find(this.installmentsTable, { loan_id: loanId });
    const historyData = await this.db.find(this.historyTable, { loan_id: loanId });

    const installments = installmentsData
      .filter(i => !i.is_deleted)
      .map(i => new InstallmentEntity(i))
      .sort((a, b) => a.installment_number - b.installment_number);

    const history = historyData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return {
      loan: new LoanEntity(loanRecord),
      member: member || null,
      installments,
      history
    };
  }

  /**
   * 10. GET MEMBER LOANS
   */
  async getMemberLoans(memberId, user = null) {
    if (user) {
      await this._validateMemberAccess(user, memberId);
    }

    const memberLoans = await this.db.find(this.loansTable, { member_id: memberId });
    const activeNonDeleted = memberLoans.filter(l => !l.is_deleted);
    
    const results = [];
    for (const l of activeNonDeleted) {
      const installments = await this.db.find(this.installmentsTable, { loan_id: l.id });
      results.push({
        loan: new LoanEntity(l),
        installments: installments.map(i => new InstallmentEntity(i)).sort((a, b) => a.installment_number - b.installment_number)
      });
    }

    return results.sort((a, b) => new Date(b.loan.created_at) - new Date(a.loan.created_at));
  }

  /**
   * 11. GET ALL LOANS (FOR ADMIN / CHAIRMAN FILTERING)
   */
  async getAllLoans(filter = {}) {
    let loans = await this.db.getAll(this.loansTable);
    loans = loans.filter(l => !l.is_deleted);

    if (filter.status) {
      loans = loans.filter(l => l.status === filter.status);
    }
    if (filter.member_id) {
      loans = loans.filter(l => l.member_id === filter.member_id);
    }

    const members = await this.db.getAll(this.membersTable);
    const memberMap = new Map(members.map(m => [m.id, m]));

    const enriched = [];
    for (const l of loans) {
      const member = memberMap.get(l.member_id) || null;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const numMatch = l.loan_number.toLowerCase().includes(q);
        const nameMatch = member && member.full_name.toLowerCase().includes(q);
        const memNumMatch = member && member.member_number.toLowerCase().includes(q);
        if (!numMatch && !nameMatch && !memNumMatch) {
          continue;
        }
      }

      enriched.push({
        loan: new LoanEntity(l),
        member
      });
    }

    return enriched.sort((a, b) => new Date(b.loan.created_at) - new Date(a.loan.created_at));
  }

  /**
   * 12. GET OVERDUE INSTALLMENTS / TUNGGAKAN
   */
  async getOverdueInstallments() {
    await this.checkAndUpdateOverdueStatus();

    const installments = await this.db.find(this.installmentsTable, { status: INSTALLMENT_STATUS.OVERDUE });
    const nonDeleted = installments.filter(i => !i.is_deleted);

    const members = await this.db.getAll(this.membersTable);
    const memberMap = new Map(members.map(m => [m.id, m]));

    const loans = await this.db.getAll(this.loansTable);
    const loanMap = new Map(loans.map(l => [l.id, l]));

    return nonDeleted.map(i => {
      const loan = loanMap.get(i.loan_id) || null;
      const member = loan ? memberMap.get(loan.member_id) : null;
      return {
        installment: new InstallmentEntity(i),
        loan: loan ? new LoanEntity(loan) : null,
        member: member || null
      };
    }).sort((a, b) => new Date(a.installment.due_date) - new Date(b.installment.due_date));
  }

  /**
   * 13. EXECUTIVE LOAN STATISTICS (CHAIRMAN & ADMIN MONITORING)
   */
  async getExecutiveLoanMetrics() {
    await this.checkAndUpdateOverdueStatus();

    const loans = (await this.db.getAll(this.loansTable)).filter(l => !l.is_deleted);
    const installments = (await this.db.getAll(this.installmentsTable)).filter(i => !i.is_deleted);

    let totalDisbursedAmount = 0;
    let totalOutstandingPrincipal = 0;
    let totalRepaymentsCollected = 0;
    let totalPendingCount = 0;
    let totalActiveCount = 0;
    let totalPaidOffCount = 0;
    let totalRejectedCount = 0;

    loans.forEach(l => {
      if (l.status === LOAN_STATUS.ACTIVE || l.status === LOAN_STATUS.DISBURSED || l.status === LOAN_STATUS.PAID_OFF) {
        totalDisbursedAmount += Number(l.principal_amount || 0);
        totalRepaymentsCollected += Number(l.paid_amount || 0);
      }
      if (l.status === LOAN_STATUS.ACTIVE || l.status === LOAN_STATUS.DISBURSED) {
        totalActiveCount++;
        totalOutstandingPrincipal += Number(l.remaining_principal || 0);
      }
      if (l.status === LOAN_STATUS.PENDING) totalPendingCount++;
      if (l.status === LOAN_STATUS.PAID_OFF) totalPaidOffCount++;
      if (l.status === LOAN_STATUS.REJECTED) totalRejectedCount++;
    });

    // Overdue stats
    const overdueInstallments = installments.filter(i => i.status === INSTALLMENT_STATUS.OVERDUE);
    let totalOverdueAmount = 0;
    const overdueLoanIds = new Set();

    overdueInstallments.forEach(i => {
      totalOverdueAmount += (Number(i.total_due) - Number(i.paid_amount || 0));
      overdueLoanIds.add(i.loan_id);
    });

    const nplRate = totalActiveCount > 0 ? ((overdueLoanIds.size / totalActiveCount) * 100) : 0;

    return {
      totalLoansCount: loans.length,
      totalDisbursedAmount,
      totalOutstandingPrincipal,
      totalRepaymentsCollected,
      totalPendingCount,
      totalActiveCount,
      totalPaidOffCount,
      totalRejectedCount,
      totalOverdueCount: overdueInstallments.length,
      totalOverdueAmount,
      overdueLoansCount: overdueLoanIds.size,
      nplRate: Math.round(nplRate * 10) / 10
    };
  }

  /**
   * 14. SOFT DELETE LOAN (PRESERVES HISTORICAL RECORD)
   */
  async softDeleteLoan(loanId, user, reason = '') {
    const loanRecord = await this.db.findById(this.loansTable, loanId);
    if (!loanRecord) {
      throw new Error('Pinjaman tidak ditemukan.');
    }

    if (loanRecord.status === LOAN_STATUS.ACTIVE) {
      throw new Error('Pinjaman yang masih berstatus AKTIF tidak dapat dihapus/diarsipkan.');
    }

    await this.db.update(this.loansTable, loanId, {
      is_deleted: true,
      notes: `${loanRecord.notes || ''} [Soft Deleted by ${user.name}: ${reason}]`
    });

    await this._recordStatusHistory(
      loanId,
      loanRecord.status,
      'SOFT_DELETED',
      user.id,
      user.name,
      `Pinjaman diarsipkan / soft deleted. Alasan: ${reason || '-'}`
    );

    return true;
  }
}
