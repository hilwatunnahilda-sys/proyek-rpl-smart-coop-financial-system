/**
 * Financial Transaction Ledger Domain Service
 * Provides immutable, auditable transaction ledger for cooperative finance
 * Covers: Saving Deposits/Withdrawals, Loan Disbursement, Installment Payments,
 * Operational Income, Operational Expenses, Reversals, and Adjustments
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { DatabaseAdapter } from '../../infrastructure/database/adapter.js';
import { FinancialTransactionEntity } from '../entities/FinancialTransaction.js';
import { FINANCIAL_TRANSACTION_TYPES, TRANSACTION_FLOW, TRANSACTION_REFERENCE_TYPES, ROLES } from '../../config/constants.js';
import { AuthorizationError } from '../../infrastructure/rbac/authorizationMiddleware.js';

export class FinancialTransactionService {
  constructor(adapter = null) {
    this.db = adapter || new DatabaseAdapter();
    this.tableName = 'financial_transactions';
    this.membersTable = 'members';
    this.auditLogsTable = 'audit_logs';
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
        'Isolasi Data Database: Anda tidak memiliki akses ke histori transaksi anggota lain.',
        'FORBIDDEN_DATA_ISOLATION'
      );
    }
  }

  /**
   * Helper: Generate unique transaction number format: TRX-YYYYMM-XXXX
   */
  async _generateTransactionNumber() {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const allTrx = await this.db.getAll(this.tableName);
    const count = (allTrx.length + 1).toString().padStart(4, '0');
    return `TRX-${yearMonth}-${count}`;
  }

  /**
   * 1. CORE TRANSACTION RECORDING (IMMUTABLE INSERT)
   */
  async recordTransaction({
    transaction_type,
    flow,
    amount,
    reference_type = TRANSACTION_REFERENCE_TYPES.OPERATIONAL,
    reference_id = null,
    member_id = null,
    category = 'Umum',
    description,
    notes = '',
    created_by,
    created_by_name = '',
    transaction_date = new Date().toISOString()
  }) {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Nominal transaksi harus lebih besar dari Rp 0.');
    }

    if (!description || description.trim().length === 0) {
      throw new Error('Deskripsi / keterangan transaksi wajib diisi.');
    }

    const transactionNumber = await this._generateTransactionNumber();

    const trx = new FinancialTransactionEntity({
      id: `TRX-${crypto.randomUUID()}`,
      transaction_number: transactionNumber,
      transaction_date,
      transaction_type,
      flow,
      amount: numAmount,
      reference_type,
      reference_id,
      member_id,
      category,
      description: description.trim(),
      notes: notes.trim(),
      is_reversed: false,
      created_by,
      created_by_name,
      created_at: new Date().toISOString()
    });

    await this.db.insert(this.tableName, trx.toJSON());

    // Record system audit log
    await this.db.insert(this.auditLogsTable, {
      id: `LOG-${crypto.randomUUID()}`,
      user_id: created_by,
      action: 'TRANSACTION_RECORDED',
      resource: `financial_transactions:${trx.id}`,
      details: `${trx.transaction_type} [${trx.transaction_number}] sebesar Rp ${trx.amount.toLocaleString('id-ID')} (${trx.flow}) - ${trx.description}`,
      timestamp: new Date().toISOString()
    });

    // Non-blocking Telegram notification (for Operational Income/Expense)
    if (reference_type === TRANSACTION_REFERENCE_TYPES.OPERATIONAL) {
      (async () => {
        try {
          const member = member_id ? await this.db.findById(this.membersTable, member_id) : null;
          this._dispatchTelegramNotification('TRANSACTION_SUCCESS', {
            transaction: trx.toJSON(),
            member: member || null
          });
        } catch {}
      })();
    }

    return trx;
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
   * 2. OPERATIONAL INCOME RECORDING
   */
  async recordIncome({ amount, category = 'Pendapatan Operasional', description, notes = '', created_by, created_by_name, transaction_date }) {
    return this.recordTransaction({
      transaction_type: FINANCIAL_TRANSACTION_TYPES.INCOME,
      flow: TRANSACTION_FLOW.IN,
      amount,
      reference_type: TRANSACTION_REFERENCE_TYPES.OPERATIONAL,
      reference_id: null,
      member_id: null,
      category,
      description,
      notes,
      created_by,
      created_by_name,
      transaction_date
    });
  }

  /**
   * 3. OPERATIONAL EXPENSE RECORDING
   */
  async recordExpense({ amount, category = 'Beban Operasional', description, notes = '', created_by, created_by_name, transaction_date }) {
    return this.recordTransaction({
      transaction_type: FINANCIAL_TRANSACTION_TYPES.EXPENSE,
      flow: TRANSACTION_FLOW.OUT,
      amount,
      reference_type: TRANSACTION_REFERENCE_TYPES.OPERATIONAL,
      reference_id: null,
      member_id: null,
      category,
      description,
      notes,
      created_by,
      created_by_name,
      transaction_date
    });
  }

  /**
   * 4. SAVINGS INTEGRATION RECORDING
   */
  async recordSavingDeposit({ member_id, saving_transaction_id, amount, saving_type, created_by, created_by_name }) {
    return this.recordTransaction({
      transaction_type: FINANCIAL_TRANSACTION_TYPES.SAVING_DEPOSIT,
      flow: TRANSACTION_FLOW.IN,
      amount,
      reference_type: TRANSACTION_REFERENCE_TYPES.SAVINGS,
      reference_id: saving_transaction_id,
      member_id,
      category: `Simpanan ${saving_type}`,
      description: `Setoran Simpanan ${saving_type}`,
      notes: `Ref Simpanan ID: ${saving_transaction_id}`,
      created_by,
      created_by_name
    });
  }

  async recordSavingWithdrawal({ member_id, saving_transaction_id, amount, saving_type, created_by, created_by_name }) {
    return this.recordTransaction({
      transaction_type: FINANCIAL_TRANSACTION_TYPES.SAVING_WITHDRAWAL,
      flow: TRANSACTION_FLOW.OUT,
      amount,
      reference_type: TRANSACTION_REFERENCE_TYPES.SAVINGS,
      reference_id: saving_transaction_id,
      member_id,
      category: `Penarikan Simpanan ${saving_type}`,
      description: `Penarikan Simpanan ${saving_type}`,
      notes: `Ref Simpanan ID: ${saving_transaction_id}`,
      created_by,
      created_by_name
    });
  }

  /**
   * 5. LOAN & INSTALLMENT INTEGRATION RECORDING
   */
  async recordLoanDisbursement({ loan_id, loan_number, member_id, amount, disbursement_method, created_by, created_by_name }) {
    return this.recordTransaction({
      transaction_type: FINANCIAL_TRANSACTION_TYPES.LOAN_DISBURSEMENT,
      flow: TRANSACTION_FLOW.OUT,
      amount,
      reference_type: TRANSACTION_REFERENCE_TYPES.LOANS,
      reference_id: loan_number || loan_id,
      member_id,
      category: 'Penyaluran Pinjaman',
      description: `Pencairan Pinjaman ${loan_number} (${disbursement_method || 'Kas Koperasi'})`,
      notes: `Ref Loan ID: ${loan_id}`,
      created_by,
      created_by_name
    });
  }

  async recordInstallmentPayment({ loan_id, installment_id, loan_number, installment_number, member_id, amount, payment_method, payment_receipt, created_by, created_by_name }) {
    return this.recordTransaction({
      transaction_type: FINANCIAL_TRANSACTION_TYPES.INSTALLMENT_PAYMENT,
      flow: TRANSACTION_FLOW.IN,
      amount,
      reference_type: TRANSACTION_REFERENCE_TYPES.INSTALLMENTS,
      reference_id: payment_receipt || installment_id,
      member_id,
      category: 'Angsuran Pinjaman',
      description: `Pembayaran Angsuran ke-${installment_number} Pinjaman ${loan_number}`,
      notes: `Ref Installment ID: ${installment_id} | Metode: ${payment_method || 'Tunai'}`,
      created_by,
      created_by_name
    });
  }

  /**
   * 6. REVERSAL / ADJUSTMENT WORKFLOW (IMMUTABLE AUDIT CORRECTION)
   */
  async reverseTransaction(originalTransactionId, user, { reason, notes = '' }) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Alasan pembatalan (reversal) transaksi wajib dicantumkan.');
    }

    const originalTrx = await this.db.findById(this.tableName, originalTransactionId);
    if (!originalTrx) {
      throw new Error('Transaksi original tidak ditemukan.');
    }

    if (originalTrx.is_reversed) {
      throw new Error(`Transaksi ${originalTrx.transaction_number} sudah pernah dibatalkan sebelumnya.`);
    }

    if (originalTrx.transaction_type === FINANCIAL_TRANSACTION_TYPES.REVERSAL) {
      throw new Error('Transaksi yang bertipe REVERSAL tidak dapat dibatalkan kembali.');
    }

    // Invert the flow for reversal entry
    const reversalFlow = originalTrx.flow === TRANSACTION_FLOW.IN ? TRANSACTION_FLOW.OUT : TRANSACTION_FLOW.IN;
    const reversalNumber = await this._generateTransactionNumber();

    const reversalTrx = new FinancialTransactionEntity({
      id: `TRX-${crypto.randomUUID()}`,
      transaction_number: reversalNumber,
      transaction_date: new Date().toISOString(),
      transaction_type: FINANCIAL_TRANSACTION_TYPES.REVERSAL,
      flow: reversalFlow,
      amount: originalTrx.amount,
      reference_type: TRANSACTION_REFERENCE_TYPES.TRANSACTION_REVERSAL,
      reference_id: originalTrx.transaction_number,
      member_id: originalTrx.member_id,
      category: 'Koreksi / Reversal Transaksi',
      description: `[REVERSAL] Koreksi Pembatalan Transaksi ${originalTrx.transaction_number} (${originalTrx.description})`,
      notes: notes ? `${reason} | ${notes}` : reason,
      is_reversed: false,
      original_transaction_id: originalTrx.id,
      reversal_reason: reason.trim(),
      created_by: user.id || user.name,
      created_by_name: user.name || 'Admin',
      created_at: new Date().toISOString()
    });

    // 1. Insert reversal entry
    await this.db.insert(this.tableName, reversalTrx.toJSON());

    // 2. Mark original transaction as reversed with bidirectional pointer
    await this.db.update(this.tableName, originalTransactionId, {
      is_reversed: true,
      reversed_by_transaction_id: reversalTrx.id,
      reversal_reason: reason.trim(),
      updated_at: new Date().toISOString()
    });

    // 3. Record security audit log
    await this.db.insert(this.auditLogsTable, {
      id: `LOG-${crypto.randomUUID()}`,
      user_id: user.id,
      action: 'TRANSACTION_REVERSED',
      resource: `financial_transactions:${originalTrx.id}`,
      details: `Reversal Transaksi ${originalTrx.transaction_number} dibuat sebagai ${reversalTrx.transaction_number}. Alasan: ${reason.trim()}`,
      timestamp: new Date().toISOString()
    });

    return {
      reversal: reversalTrx,
      original: new FinancialTransactionEntity({ ...originalTrx, is_reversed: true, reversed_by_transaction_id: reversalTrx.id })
    };
  }

  /**
   * 7. GET TRANSACTIONS (PAGINATION, DATE FILTER, TYPE FILTER, MEMBER ISOLATION, SEARCH)
   */
  async getTransactions({
    page = 1,
    limit = 10,
    startDate = null,
    endDate = null,
    transactionType = null,
    flow = null,
    memberId = null,
    search = null
  } = {}, user = null) {
    let effectiveMemberId = memberId;

    if (user && user.role === ROLES.MEMBER) {
      const memberRecord = await this.db.findById(this.membersTable, user.id, 'user_id');
      effectiveMemberId = memberRecord ? memberRecord.id : `mbr-${user.id}`;
    } else if (user && memberId) {
      await this._validateMemberAccess(user, memberId);
    }

    let records = await this.db.getAll(this.tableName);

    // Filter by memberId (Member data isolation enforced at database query layer)
    if (effectiveMemberId) {
      records = records.filter(r => r.member_id === effectiveMemberId);
    }

    // Filter by date range (transaction_date)
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      records = records.filter(r => new Date(r.transaction_date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      records = records.filter(r => new Date(r.transaction_date) <= end);
    }

    // Filter by transaction type
    if (transactionType) {
      records = records.filter(r => r.transaction_type === transactionType);
    }

    // Filter by cash flow (IN / OUT)
    if (flow) {
      records = records.filter(r => r.flow === flow);
    }

    // Member map for search and enrichment
    const members = await this.db.getAll(this.membersTable);
    const memberMap = new Map(members.map(m => [m.id, m]));

    // Search query (transaction number, description, category, member full_name)
    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      records = records.filter(r => {
        const numMatch = r.transaction_number && r.transaction_number.toLowerCase().includes(q);
        const descMatch = r.description && r.description.toLowerCase().includes(q);
        const catMatch = r.category && r.category.toLowerCase().includes(q);
        const refMatch = r.reference_id && r.reference_id.toLowerCase().includes(q);
        const member = memberMap.get(r.member_id);
        const memMatch = member && (member.full_name.toLowerCase().includes(q) || member.member_number.toLowerCase().includes(q));
        return numMatch || descMatch || catMatch || refMatch || memMatch;
      });
    }

    // Sort descending by transaction_date / created_at
    records.sort((a, b) => new Date(b.transaction_date || b.created_at) - new Date(a.transaction_date || a.created_at));

    // Compute Summary for the filtered set (Excluding reversed amounts from active totals if needed, or showing gross)
    let totalInflow = 0;
    let totalOutflow = 0;

    records.forEach(r => {
      // Active non-reversed transactions calculation
      if (r.flow === TRANSACTION_FLOW.IN) {
        totalInflow += Number(r.amount || 0);
      } else if (r.flow === TRANSACTION_FLOW.OUT) {
        totalOutflow += Number(r.amount || 0);
      }
    });

    const netCashBalance = totalInflow - totalOutflow;

    // Apply pagination
    const total = records.length;
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
    const totalPages = Math.ceil(total / pageLimit) || 1;
    const startIndex = (currentPage - 1) * pageLimit;
    const paginatedRecords = records.slice(startIndex, startIndex + pageLimit);

    const items = paginatedRecords.map(r => ({
      transaction: new FinancialTransactionEntity(r),
      member: memberMap.get(r.member_id) || null
    }));

    return {
      items,
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages,
      summary: {
        totalInflow,
        totalOutflow,
        netCashBalance,
        totalRecords: total
      }
    };
  }

  /**
   * 8. GET TRANSACTION DETAILS WITH REVERSAL RELATIONS
   */
  async getTransactionDetails(transactionId, user = null) {
    const trxRecord = await this.db.findById(this.tableName, transactionId);
    if (!trxRecord) return null;

    if (user && trxRecord.member_id) {
      await this._validateMemberAccess(user, trxRecord.member_id);
    }

    const member = trxRecord.member_id ? await this.db.findById(this.membersTable, trxRecord.member_id) : null;

    let originalTrx = null;
    let reversalTrx = null;

    if (trxRecord.original_transaction_id) {
      originalTrx = await this.db.findById(this.tableName, trxRecord.original_transaction_id);
    }

    if (trxRecord.reversed_by_transaction_id) {
      reversalTrx = await this.db.findById(this.tableName, trxRecord.reversed_by_transaction_id);
    }

    return {
      transaction: new FinancialTransactionEntity(trxRecord),
      member: member || null,
      originalTransaction: originalTrx ? new FinancialTransactionEntity(originalTrx) : null,
      reversalTransaction: reversalTrx ? new FinancialTransactionEntity(reversalTrx) : null
    };
  }

  /**
   * 9. GET CASH FLOW STATS & BREAKDOWN (CHAIRMAN & ADMIN DASHBOARD)
   */
  async getCashMetrics() {
    const allRecords = await this.db.getAll(this.tableName);

    let totalInflow = 0;
    let totalOutflow = 0;
    let totalReversalsCount = 0;
    const breakdownByType = {};

    Object.values(FINANCIAL_TRANSACTION_TYPES).forEach(t => {
      breakdownByType[t] = { count: 0, amount: 0 };
    });

    allRecords.forEach(r => {
      const amount = Number(r.amount || 0);
      if (r.flow === TRANSACTION_FLOW.IN) {
        totalInflow += amount;
      } else if (r.flow === TRANSACTION_FLOW.OUT) {
        totalOutflow += amount;
      }

      if (r.is_reversed || r.transaction_type === FINANCIAL_TRANSACTION_TYPES.REVERSAL) {
        totalReversalsCount++;
      }

      if (breakdownByType[r.transaction_type]) {
        breakdownByType[r.transaction_type].count++;
        breakdownByType[r.transaction_type].amount += amount;
      }
    });

    return {
      totalInflow,
      totalOutflow,
      netCashBalance: totalInflow - totalOutflow,
      totalTransactionsCount: allRecords.length,
      totalReversalsCount,
      breakdownByType
    };
  }
}
