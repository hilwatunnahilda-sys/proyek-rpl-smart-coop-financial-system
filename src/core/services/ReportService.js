/**
 * Cooperative Financial Report Engine Service
 * Extracts and aggregates real-time production data from actual database tables:
 * members, saving_transactions, loans, installments, financial_transactions
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { DatabaseAdapter } from '../../infrastructure/database/adapter.js';
import {
  MEMBER_STATUS,
  MEMBER_TYPES,
  SAVING_TYPES,
  TRANSACTION_TYPES,
  LOAN_STATUS,
  INSTALLMENT_STATUS,
  FINANCIAL_TRANSACTION_TYPES,
  TRANSACTION_FLOW
} from '../../config/constants.js';

export class ReportService {
  constructor(adapter = null) {
    this.db = adapter || new DatabaseAdapter();
    this.membersTable = 'members';
    this.savingTransactionsTable = 'saving_transactions';
    this.loansTable = 'loans';
    this.installmentsTable = 'installments';
    this.financialTransactionsTable = 'financial_transactions';
  }

  /**
   * Helper: Filter by date range (field must be YYYY-MM-DD or ISO string)
   */
  _applyDateFilter(records, dateField, startDate, endDate) {
    if (!startDate && !endDate) return records;

    return records.filter(r => {
      const val = r[dateField];
      if (!val) return false;
      const d = new Date(val);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }

  /**
   * Helper: Apply Pagination to result list
   */
  _paginate(records, page = 1, limit = 10) {
    const total = records.length;
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
    const totalPages = Math.ceil(total / pageLimit) || 1;
    const startIndex = (currentPage - 1) * pageLimit;
    const paginated = records.slice(startIndex, startIndex + pageLimit);

    return {
      items: paginated,
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages
    };
  }

  /**
   * 1. LAPORAN ANGGOTA (MEMBERS REPORT)
   */
  async getMembersReport({ status, memberType, startDate, endDate, search, page = 1, limit = 10 } = {}) {
    let members = await this.db.getAll(this.membersTable);

    if (status) {
      members = members.filter(m => m.status === status);
    }
    if (memberType) {
      members = members.filter(m => m.member_type === memberType);
    }

    members = this._applyDateFilter(members, 'join_date', startDate, endDate);

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      members = members.filter(m => {
        return (m.full_name && m.full_name.toLowerCase().includes(q)) ||
               (m.member_number && m.member_number.toLowerCase().includes(q)) ||
               (m.identity_number && m.identity_number.toLowerCase().includes(q)) ||
               (m.phone && m.phone.includes(q));
      });
    }

    // Sort by join_date descending
    members.sort((a, b) => new Date(b.join_date) - new Date(a.join_date));

    // Calculate real summaries
    let totalActive = 0;
    let totalInactive = 0;
    let totalDosen = 0;
    let totalMahasiswa = 0;
    let totalStaf = 0;

    members.forEach(m => {
      if (m.status === MEMBER_STATUS.ACTIVE) totalActive++;
      if (m.status === MEMBER_STATUS.INACTIVE) totalInactive++;
      if (m.member_type === MEMBER_TYPES.DOSEN) totalDosen++;
      if (m.member_type === MEMBER_TYPES.MAHASISWA) totalMahasiswa++;
      if (m.member_type === MEMBER_TYPES.STAF) totalStaf++;
    });

    const paginated = this._paginate(members, page, limit);

    return {
      ...paginated,
      summary: {
        totalMembers: members.length,
        totalActive,
        totalInactive,
        totalDosen,
        totalMahasiswa,
        totalStaf
      }
    };
  }

  /**
   * 2. LAPORAN SIMPANAN (SAVINGS REPORT)
   */
  async getSavingsReport({ memberId, savingType, startDate, endDate, search, page = 1, limit = 10 } = {}) {
    let savingTrx = await this.db.getAll(this.savingTransactionsTable);
    const members = await this.db.getAll(this.membersTable);
    const memberMap = new Map(members.map(m => [m.id, m]));

    if (memberId) {
      savingTrx = savingTrx.filter(s => s.member_id === memberId);
    }
    if (savingType) {
      savingTrx = savingTrx.filter(s => s.saving_type === savingType);
    }

    savingTrx = this._applyDateFilter(savingTrx, 'created_at', startDate, endDate);

    // Enrich with member details
    let enriched = savingTrx.map(trx => {
      const member = memberMap.get(trx.member_id);
      return {
        ...trx,
        member_name: member ? member.full_name : 'Anggota #' + trx.member_id,
        member_number: member ? member.member_number : '-',
        member_type: member ? member.member_type : '-'
      };
    });

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter(item => {
        return (item.member_name && item.member_name.toLowerCase().includes(q)) ||
               (item.member_number && item.member_number.toLowerCase().includes(q)) ||
               (item.id && item.id.toLowerCase().includes(q)) ||
               (item.description && item.description.toLowerCase().includes(q));
      });
    }

    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Summaries
    let totalDeposit = 0;
    let totalWithdrawal = 0;
    let totalPokok = 0;
    let totalWajib = 0;
    let totalSukarela = 0;

    enriched.forEach(item => {
      const amt = Number(item.amount || 0);
      if (item.transaction_type === TRANSACTION_TYPES.DEPOSIT) {
        totalDeposit += amt;
        if (item.saving_type === SAVING_TYPES.POKOK) totalPokok += amt;
        if (item.saving_type === SAVING_TYPES.WAJIB) totalWajib += amt;
        if (item.saving_type === SAVING_TYPES.SUKARELA) totalSukarela += amt;
      } else {
        totalWithdrawal += amt;
        if (item.saving_type === SAVING_TYPES.POKOK) totalPokok -= amt;
        if (item.saving_type === SAVING_TYPES.WAJIB) totalWajib -= amt;
        if (item.saving_type === SAVING_TYPES.SUKARELA) totalSukarela -= amt;
      }
    });

    const netSavingsBalance = totalDeposit - totalWithdrawal;
    const paginated = this._paginate(enriched, page, limit);

    return {
      ...paginated,
      summary: {
        totalTransactions: enriched.length,
        totalDeposit,
        totalWithdrawal,
        netSavingsBalance,
        totalPokok,
        totalWajib,
        totalSukarela
      }
    };
  }

  /**
   * 3. LAPORAN PINJAMAN (LOANS REPORT)
   */
  async getLoansReport({ memberId, status, interestType, startDate, endDate, search, page = 1, limit = 10 } = {}) {
    let loans = (await this.db.getAll(this.loansTable)).filter(l => !l.is_deleted);
    const members = await this.db.getAll(this.membersTable);
    const memberMap = new Map(members.map(m => [m.id, m]));

    if (memberId) {
      loans = loans.filter(l => l.member_id === memberId);
    }
    if (status) {
      loans = loans.filter(l => l.status === status);
    }
    if (interestType) {
      loans = loans.filter(l => l.interest_type === interestType);
    }

    loans = this._applyDateFilter(loans, 'start_date', startDate, endDate);

    let enriched = loans.map(l => {
      const member = memberMap.get(l.member_id);
      return {
        ...l,
        member_name: member ? member.full_name : 'Anggota #' + l.member_id,
        member_number: member ? member.member_number : '-',
        member_type: member ? member.member_type : '-'
      };
    });

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter(item => {
        return (item.loan_number && item.loan_number.toLowerCase().includes(q)) ||
               (item.member_name && item.member_name.toLowerCase().includes(q)) ||
               (item.purpose && item.purpose.toLowerCase().includes(q));
      });
    }

    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Calculate summaries
    let totalPrincipalDisbursed = 0;
    let totalOutstandingPrincipal = 0;
    let totalRepaymentsCollected = 0;
    let totalInterestIncome = 0;
    let activeLoansCount = 0;
    let paidOffLoansCount = 0;
    let pendingLoansCount = 0;

    enriched.forEach(l => {
      if (l.status === LOAN_STATUS.ACTIVE || l.status === LOAN_STATUS.DISBURSED || l.status === LOAN_STATUS.PAID_OFF) {
        totalPrincipalDisbursed += Number(l.principal_amount || 0);
        totalRepaymentsCollected += Number(l.paid_amount || 0);
        totalInterestIncome += Number(l.total_interest || 0);
      }
      if (l.status === LOAN_STATUS.ACTIVE || l.status === LOAN_STATUS.DISBURSED) {
        activeLoansCount++;
        totalOutstandingPrincipal += Number(l.remaining_principal || 0);
      }
      if (l.status === LOAN_STATUS.PAID_OFF) paidOffLoansCount++;
      if (l.status === LOAN_STATUS.PENDING) pendingLoansCount++;
    });

    const paginated = this._paginate(enriched, page, limit);

    return {
      ...paginated,
      summary: {
        totalLoans: enriched.length,
        totalPrincipalDisbursed,
        totalOutstandingPrincipal,
        totalRepaymentsCollected,
        totalInterestIncome,
        activeLoansCount,
        paidOffLoansCount,
        pendingLoansCount
      }
    };
  }

  /**
   * 4. LAPORAN ANGSURAN (INSTALLMENTS REPORT)
   */
  async getInstallmentsReport({ memberId, loanId, status, startDate, endDate, search, page = 1, limit = 10 } = {}) {
    let installments = (await this.db.getAll(this.installmentsTable)).filter(i => !i.is_deleted);
    const loans = (await this.db.getAll(this.loansTable)).filter(l => !l.is_deleted);
    const loanMap = new Map(loans.map(l => [l.id, l]));
    const members = await this.db.getAll(this.membersTable);
    const memberMap = new Map(members.map(m => [m.id, m]));

    if (loanId) {
      installments = installments.filter(i => i.loan_id === loanId);
    }
    if (status) {
      installments = installments.filter(i => i.status === status);
    }

    installments = this._applyDateFilter(installments, 'due_date', startDate, endDate);

    let enriched = installments.map(i => {
      const loan = loanMap.get(i.loan_id);
      const member = loan ? memberMap.get(loan.member_id) : null;
      const remainingDue = Math.max(0, Number(i.total_due) - Number(i.paid_amount || 0));

      return {
        ...i,
        remaining_due: remainingDue,
        loan_number: loan ? loan.loan_number : i.loan_id,
        member_id: loan ? loan.member_id : null,
        member_name: member ? member.full_name : '-',
        member_number: member ? member.member_number : '-'
      };
    });

    if (memberId) {
      enriched = enriched.filter(i => i.member_id === memberId);
    }

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter(item => {
        return (item.loan_number && item.loan_number.toLowerCase().includes(q)) ||
               (item.member_name && item.member_name.toLowerCase().includes(q)) ||
               (item.payment_receipt && item.payment_receipt.toLowerCase().includes(q));
      });
    }

    enriched.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    // Summaries
    let totalDueSum = 0;
    let totalPaidSum = 0;
    let totalOverdueSum = 0;
    let paidCount = 0;
    let overdueCount = 0;
    let unpaidCount = 0;

    enriched.forEach(i => {
      totalDueSum += Number(i.total_due || 0);
      totalPaidSum += Number(i.paid_amount || 0);
      if (i.status === INSTALLMENT_STATUS.PAID) paidCount++;
      if (i.status === INSTALLMENT_STATUS.OVERDUE) {
        overdueCount++;
        totalOverdueSum += i.remaining_due;
      }
      if (i.status === INSTALLMENT_STATUS.UNPAID) unpaidCount++;
    });

    const paginated = this._paginate(enriched, page, limit);

    return {
      ...paginated,
      summary: {
        totalInstallments: enriched.length,
        totalDueSum,
        totalPaidSum,
        totalOverdueSum,
        paidCount,
        overdueCount,
        unpaidCount
      }
    };
  }

  /**
   * 5. LAPORAN TRANSAKSI BUKU KAS (GENERAL TRANSACTIONS REPORT)
   */
  async getTransactionsReport({ memberId, transactionType, flow, startDate, endDate, search, page = 1, limit = 10 } = {}) {
    let transactions = await this.db.getAll(this.financialTransactionsTable);
    const members = await this.db.getAll(this.membersTable);
    const memberMap = new Map(members.map(m => [m.id, m]));

    if (memberId) {
      transactions = transactions.filter(t => t.member_id === memberId);
    }
    if (transactionType) {
      transactions = transactions.filter(t => t.transaction_type === transactionType);
    }
    if (flow) {
      transactions = transactions.filter(t => t.flow === flow);
    }

    transactions = this._applyDateFilter(transactions, 'transaction_date', startDate, endDate);

    let enriched = transactions.map(t => {
      const member = t.member_id ? memberMap.get(t.member_id) : null;
      return {
        ...t,
        member_name: member ? member.full_name : '-',
        member_number: member ? member.member_number : '-'
      };
    });

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter(item => {
        return (item.transaction_number && item.transaction_number.toLowerCase().includes(q)) ||
               (item.description && item.description.toLowerCase().includes(q)) ||
               (item.category && item.category.toLowerCase().includes(q)) ||
               (item.member_name && item.member_name.toLowerCase().includes(q));
      });
    }

    enriched.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

    // Summaries
    let totalInflow = 0;
    let totalOutflow = 0;
    let totalReversals = 0;

    enriched.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.flow === TRANSACTION_FLOW.IN) {
        totalInflow += amt;
      } else {
        totalOutflow += amt;
      }
      if (t.is_reversed || t.transaction_type === FINANCIAL_TRANSACTION_TYPES.REVERSAL) {
        totalReversals++;
      }
    });

    const netBalance = totalInflow - totalOutflow;
    const paginated = this._paginate(enriched, page, limit);

    return {
      ...paginated,
      summary: {
        totalTransactions: enriched.length,
        totalInflow,
        totalOutflow,
        netBalance,
        totalReversals
      }
    };
  }

  /**
   * 6. LAPORAN PENDAPATAN OPERASIONAL (INCOME REPORT)
   */
  async getIncomeReport({ category, startDate, endDate, search, page = 1, limit = 10 } = {}) {
    let transactions = (await this.db.getAll(this.financialTransactionsTable)).filter(
      t => t.transaction_type === FINANCIAL_TRANSACTION_TYPES.INCOME && !t.is_reversed
    );

    if (category) {
      transactions = transactions.filter(t => t.category === category);
    }

    transactions = this._applyDateFilter(transactions, 'transaction_date', startDate, endDate);

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      transactions = transactions.filter(t => {
        return (t.transaction_number && t.transaction_number.toLowerCase().includes(q)) ||
               (t.description && t.description.toLowerCase().includes(q)) ||
               (t.category && t.category.toLowerCase().includes(q));
      });
    }

    transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

    let totalIncome = 0;
    const categoryBreakdown = {};

    transactions.forEach(t => {
      const amt = Number(t.amount || 0);
      totalIncome += amt;
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + amt;
    });

    const paginated = this._paginate(transactions, page, limit);

    return {
      ...paginated,
      summary: {
        totalIncome,
        totalTransactions: transactions.length,
        categoryBreakdown
      }
    };
  }

  /**
   * 7. LAPORAN PENGELUARAN OPERASIONAL (EXPENSE REPORT)
   */
  async getExpenseReport({ category, startDate, endDate, search, page = 1, limit = 10 } = {}) {
    let transactions = (await this.db.getAll(this.financialTransactionsTable)).filter(
      t => t.transaction_type === FINANCIAL_TRANSACTION_TYPES.EXPENSE && !t.is_reversed
    );

    if (category) {
      transactions = transactions.filter(t => t.category === category);
    }

    transactions = this._applyDateFilter(transactions, 'transaction_date', startDate, endDate);

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      transactions = transactions.filter(t => {
        return (t.transaction_number && t.transaction_number.toLowerCase().includes(q)) ||
               (t.description && t.description.toLowerCase().includes(q)) ||
               (t.category && t.category.toLowerCase().includes(q));
      });
    }

    transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

    let totalExpense = 0;
    const categoryBreakdown = {};

    transactions.forEach(t => {
      const amt = Number(t.amount || 0);
      totalExpense += amt;
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + amt;
    });

    const paginated = this._paginate(transactions, page, limit);

    return {
      ...paginated,
      summary: {
        totalExpense,
        totalTransactions: transactions.length,
        categoryBreakdown
      }
    };
  }

  /**
   * 8. RINGKASAN PEMASUKAN DAN PENGELUARAN (CASH FLOW & SURPLUS SUMMARY)
   */
  async getCashFlowSummaryReport({ startDate, endDate } = {}) {
    let transactions = (await this.db.getAll(this.financialTransactionsTable)).filter(t => !t.is_reversed);
    transactions = this._applyDateFilter(transactions, 'transaction_date', startDate, endDate);

    const breakdownInflow = {
      [FINANCIAL_TRANSACTION_TYPES.SAVING_DEPOSIT]: { label: 'Setoran Simpanan Anggota', amount: 0, count: 0 },
      [FINANCIAL_TRANSACTION_TYPES.INSTALLMENT_PAYMENT]: { label: 'Pengembalian Angsuran Pinjaman', amount: 0, count: 0 },
      [FINANCIAL_TRANSACTION_TYPES.INCOME]: { label: 'Pendapatan Operasional & Unit Usaha', amount: 0, count: 0 },
      [FINANCIAL_TRANSACTION_TYPES.REVERSAL]: { label: 'Reversal Pengeluaran', amount: 0, count: 0 }
    };

    const breakdownOutflow = {
      [FINANCIAL_TRANSACTION_TYPES.SAVING_WITHDRAWAL]: { label: 'Penarikan Simpanan Anggota', amount: 0, count: 0 },
      [FINANCIAL_TRANSACTION_TYPES.LOAN_DISBURSEMENT]: { label: 'Penyaluran Pinjaman Anggota', amount: 0, count: 0 },
      [FINANCIAL_TRANSACTION_TYPES.EXPENSE]: { label: 'Beban Operasional & ATK', amount: 0, count: 0 }
    };

    let totalInflow = 0;
    let totalOutflow = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.flow === TRANSACTION_FLOW.IN) {
        totalInflow += amt;
        if (breakdownInflow[t.transaction_type]) {
          breakdownInflow[t.transaction_type].amount += amt;
          breakdownInflow[t.transaction_type].count++;
        }
      } else if (t.flow === TRANSACTION_FLOW.OUT) {
        totalOutflow += amt;
        if (breakdownOutflow[t.transaction_type]) {
          breakdownOutflow[t.transaction_type].amount += amt;
          breakdownOutflow[t.transaction_type].count++;
        }
      }
    });

    const netSurplus = totalInflow - totalOutflow;

    return {
      period: {
        startDate: startDate || 'Awal Berdiri',
        endDate: endDate || 'Saat Ini'
      },
      totalInflow,
      totalOutflow,
      netSurplus,
      breakdownInflow,
      breakdownOutflow,
      totalTransactions: transactions.length,
      accountingStandardNotice: 'Catatan Akuntansi: Laporan mutasi kas dihitung berbasis cash basis real-time. Standar SAK ETAP / PSAK 27 untuk pembagian cadangan SHU otomatis dikonfigurasikan pada modul akhir tahun.'
    };
  }
}
