/**
 * Authorized AI Data Service (Backend & Service Layer Enforcement)
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Enforces strict Role-Based Access Control (RBAC), Least Privilege,
 * and Member Data Isolation. AI Assistant queries this service to obtain
 * actual, verified database figures without ever accessing raw SQL or direct DB connections.
 */

import { DatabaseAdapter } from '../../infrastructure/database/adapter.js';
import { ROLES, AI_ROLES, MEMBER_STATUS, LOAN_STATUS, INSTALLMENT_STATUS, SAVING_TYPES } from '../../config/constants.js';
import { AuthorizationError, resolveEffectiveRole } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { AuditLogService } from './AuditLogService.js';

export class AiAuthorizedDataService {
  constructor(adapter = null, auditService = null) {
    this.db = adapter || new DatabaseAdapter();
    this.auditService = auditService || new AuditLogService(this.db);
    this.membersTable = 'members';
    this.usersTable = 'users';
    this.loansTable = 'loans';
    this.installmentsTable = 'installments';
    this.savingTransactionsTable = 'saving_transactions';
    this.financialTransactionsTable = 'financial_transactions';
  }

  /**
   * Helper: Format number into Rupiah currency
   */
  formatRupiah(amount) {
    const num = Number(amount || 0);
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
  }

  /**
   * Helper: Parse month and year from ISO or YYYY-MM-DD date string
   */
  _getDateParts(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1, // 1-12
      date: d.getDate(),
      fullDate: d
    };
  }

  /**
   * 1. STATISTIK ANGGOTA (MEMBER STATISTICS)
   * Allowed: ADMIN, CHAIRMAN
   * Denied: DOSEN, MAHASISWA, STAF, MEMBER
   */
  async getAuthorizedMemberStatistics(user, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);

    if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      const roleName = effectiveRole === 'MAHASISWA' ? 'Mahasiswa' : effectiveRole === 'DOSEN' ? 'Dosen' : effectiveRole === 'STAF' ? 'Staf' : 'Anggota';
      const reason = `Sebagai Anggota (${roleName}), Anda hanya memiliki hak akses ke data pribadi Anda sendiri dan tidak dapat melihat rekapitulasi data anggota koperasi secara keseluruhan.`;

      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole,
        module: 'MEMBER_MANAGEMENT',
        action: 'READ_MEMBER_STATISTICS',
        status: 'DENIED',
        reason
      });

      return {
        authorized: false,
        effectiveRole,
        reason
      };
    }

    await this.auditService.logAccess({
      userId: user.id,
      userName: user.name,
      role: user.role,
      effectiveRole,
      module: 'MEMBER_MANAGEMENT',
      action: 'READ_MEMBER_STATISTICS',
      status: 'ALLOWED'
    });

    const members = await this.db.getAll(this.membersTable);
    const totalMembers = members.length;
    let totalActive = 0;
    let totalInactive = 0;
    let totalDosen = 0;
    let totalMahasiswa = 0;
    let totalStaf = 0;

    members.forEach(m => {
      if (m.status === MEMBER_STATUS.ACTIVE) totalActive++;
      if (m.status === MEMBER_STATUS.INACTIVE) totalInactive++;
      if (m.member_type === 'DOSEN') totalDosen++;
      if (m.member_type === 'MAHASISWA') totalMahasiswa++;
      if (m.member_type === 'STAF') totalStaf++;
    });

    return {
      authorized: true,
      effectiveRole,
      timestamp: new Date().toISOString(),
      summary: {
        totalTerdaftar: totalMembers,
        totalAktif: totalActive,
        totalNonaktif: totalInactive,
        breakdownTipe: {
          dosen: totalDosen,
          mahasiswa: totalMahasiswa,
          staf: totalStaf
        }
      },
      definisi: 'Total Terdaftar adalah seluruh anggota yang tercatat di database koperasi STMIK IKMI. Total Aktif adalah anggota berstatus ACTIVE yang berhak bertransaksi simpan pinjam.'
    };
  }

  /**
   * 2. STATISTIK PENDAFTARAN ANGGOTA BARU & PERBANDINGAN PERIODE
   * Allowed: ADMIN, CHAIRMAN
   * Denied: DOSEN, MAHASISWA, STAF, MEMBER
   */
  async getAuthorizedRegistrationStatistics(user, referenceDate = new Date(), member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);

    if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      const roleName = effectiveRole === 'MAHASISWA' ? 'Mahasiswa' : effectiveRole === 'DOSEN' ? 'Dosen' : effectiveRole === 'STAF' ? 'Staf' : 'Anggota';
      const reason = `Sebagai Anggota (${roleName}), Anda tidak memiliki izin untuk melihat statistik pendaftaran anggota baru.`;

      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole,
        module: 'MEMBER_REGISTRATION',
        action: 'READ_REGISTRATION_STATISTICS',
        status: 'DENIED',
        reason
      });

      return {
        authorized: false,
        effectiveRole,
        reason
      };
    }

    await this.auditService.logAccess({
      userId: user.id,
      userName: user.name,
      role: user.role,
      effectiveRole,
      module: 'MEMBER_REGISTRATION',
      action: 'READ_REGISTRATION_STATISTICS',
      status: 'ALLOWED'
    });

    const members = await this.db.getAll(this.membersTable);
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth() + 1; // 1-12

    // Target previous month
    let prevMonth = refMonth - 1;
    let prevYear = refYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = refYear - 1;
    }

    let thisMonthCount = 0;
    let lastMonthCount = 0;
    let todayCount = 0;
    const todayStr = referenceDate.toISOString().split('T')[0];

    members.forEach(m => {
      const parts = this._getDateParts(m.join_date || m.created_at);
      if (parts) {
        if (parts.year === refYear && parts.month === refMonth) {
          thisMonthCount++;
        }
        if (parts.year === prevYear && parts.month === prevMonth) {
          lastMonthCount++;
        }
        const mDateStr = (m.join_date || m.created_at || '').slice(0, 10);
        if (mDateStr === todayStr) {
          todayCount++;
        }
      }
    });

    const diff = thisMonthCount - lastMonthCount;
    let percentChange = '0%';
    if (lastMonthCount > 0) {
      const pct = ((diff / lastMonthCount) * 100).toFixed(1);
      percentChange = `${diff >= 0 ? '+' : ''}${pct}%`;
    } else if (thisMonthCount > 0) {
      percentChange = '+100% (baru)';
    }

    const monthNames = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return {
      authorized: true,
      effectiveRole,
      timestamp: new Date().toISOString(),
      currentPeriod: `${monthNames[refMonth]} ${refYear}`,
      previousPeriod: `${monthNames[prevMonth]} ${prevYear}`,
      hariIni: todayCount,
      bulanIni: thisMonthCount,
      bulanLalu: lastMonthCount,
      selisih: diff,
      pertumbuhan: percentChange,
      keterangan: diff >= 0
        ? `Terdapat peningkatan pendaftaran sebanyak ${diff} anggota dibandingkan bulan lalu.`
        : `Terdapat penurunan pendaftaran sebanyak ${Math.abs(diff)} anggota dibandingkan bulan lalu.`
    };
  }

  /**
   * 3. RINGKASAN SIMPANAN (SAVINGS SUMMARY)
   * ADMIN & CHAIRMAN: Rekap total simpanan global (Pokok, Wajib, Sukarela)
   * DOSEN, MAHASISWA, STAF, MEMBER: Rekap simpanan pribadi milik anggota yang login saja
   */
  async getAuthorizedSavingsSummary(user, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);
    const transactions = await this.db.getAll(this.savingTransactionsTable);

    if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      // Find member id for this user strictly from verified session/db
      const targetMember = member || (await this.db.findById(this.membersTable, user.id, 'user_id'));
      const targetMemberId = targetMember ? targetMember.id : `mbr-${user.id}`;

      let pokok = 0;
      let wajib = 0;
      let sukarela = 0;
      let trxCount = 0;

      transactions.filter(t => t.member_id === targetMemberId).forEach(t => {
        const amt = Number(t.amount || 0);
        trxCount++;
        if (t.transaction_type === 'DEPOSIT') {
          if (t.saving_type === SAVING_TYPES.POKOK) pokok += amt;
          if (t.saving_type === SAVING_TYPES.WAJIB) wajib += amt;
          if (t.saving_type === SAVING_TYPES.SUKARELA) sukarela += amt;
        } else if (t.transaction_type === 'WITHDRAWAL') {
          if (t.saving_type === SAVING_TYPES.POKOK) pokok -= amt;
          if (t.saving_type === SAVING_TYPES.WAJIB) wajib -= amt;
          if (t.saving_type === SAVING_TYPES.SUKARELA) sukarela -= amt;
        }
      });

      const total = pokok + wajib + sukarela;

      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole,
        module: 'SAVINGS',
        action: 'READ_SAVINGS_OWN',
        status: 'ALLOWED',
        metadata: { targetMemberId, scope: 'PERSONAL' }
      });

      return {
        authorized: true,
        scope: 'PERSONAL',
        effectiveRole,
        memberName: targetMember ? targetMember.full_name : user.name,
        memberNumber: targetMember ? targetMember.member_number : '-',
        saldoPokok: pokok,
        saldoWajib: wajib,
        saldoSukarela: sukarela,
        totalSimpanan: total,
        formatted: {
          pokok: this.formatRupiah(pokok),
          wajib: this.formatRupiah(wajib),
          sukarela: this.formatRupiah(sukarela),
          total: this.formatRupiah(total)
        },
        jumlahTransaksi: trxCount
      };
    }

    // ADMIN or CHAIRMAN: Global Aggregate
    await this.auditService.logAccess({
      userId: user.id,
      userName: user.name,
      role: user.role,
      effectiveRole,
      module: 'SAVINGS',
      action: 'READ_SAVINGS_ALL',
      status: 'ALLOWED',
      metadata: { scope: 'GLOBAL' }
    });

    let totalPokok = 0;
    let totalWajib = 0;
    let totalSukarela = 0;
    let totalDeposit = 0;
    let totalWithdrawal = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.transaction_type === 'DEPOSIT') {
        totalDeposit += amt;
        if (t.saving_type === SAVING_TYPES.POKOK) totalPokok += amt;
        if (t.saving_type === SAVING_TYPES.WAJIB) totalWajib += amt;
        if (t.saving_type === SAVING_TYPES.SUKARELA) totalSukarela += amt;
      } else if (t.transaction_type === 'WITHDRAWAL') {
        totalWithdrawal += amt;
        if (t.saving_type === SAVING_TYPES.POKOK) totalPokok -= amt;
        if (t.saving_type === SAVING_TYPES.WAJIB) totalWajib -= amt;
        if (t.saving_type === SAVING_TYPES.SUKARELA) totalSukarela -= amt;
      }
    });

    const netSavings = totalPokok + totalWajib + totalSukarela;

    return {
      authorized: true,
      scope: 'GLOBAL',
      role: user.role,
      effectiveRole,
      totalSimpananPokok: totalPokok,
      totalSimpananWajib: totalWajib,
      totalSimpananSukarela: totalSukarela,
      totalSaldoSimpanan: netSavings,
      totalSetoran: totalDeposit,
      totalPenarikan: totalWithdrawal,
      formatted: {
        pokok: this.formatRupiah(totalPokok),
        wajib: this.formatRupiah(totalWajib),
        sukarela: this.formatRupiah(totalSukarela),
        total: this.formatRupiah(netSavings),
        setoran: this.formatRupiah(totalDeposit),
        penarikan: this.formatRupiah(totalWithdrawal)
      },
      totalTransaksi: transactions.length
    };
  }

  /**
   * 4. RINGKASAN PINJAMAN (LOAN SUMMARY)
   * ADMIN & CHAIRMAN: Rekap portofolio pinjaman koperasi
   * DOSEN, MAHASISWA, STAF, MEMBER: Ringkasan pinjaman aktif pribadi anggota saja
   */
  async getAuthorizedLoanSummary(user, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);
    const allLoans = (await this.db.getAll(this.loansTable)).filter(l => !l.is_deleted);

    if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      const targetMember = member || (await this.db.findById(this.membersTable, user.id, 'user_id'));
      const targetMemberId = targetMember ? targetMember.id : `mbr-${user.id}`;
      const memberLoans = allLoans.filter(l => l.member_id === targetMemberId);

      let activeCount = 0;
      let pendingCount = 0;
      let paidOffCount = 0;
      let totalRemaining = 0;
      let totalPaid = 0;

      const loanItems = memberLoans.map(l => {
        if (l.status === LOAN_STATUS.ACTIVE || l.status === LOAN_STATUS.DISBURSED) {
          activeCount++;
          totalRemaining += Number(l.remaining_principal || 0);
        }
        if (l.status === LOAN_STATUS.PENDING) pendingCount++;
        if (l.status === LOAN_STATUS.PAID_OFF) paidOffCount++;
        totalPaid += Number(l.paid_amount || 0);

        return {
          loanNumber: l.loan_number,
          pokok: this.formatRupiah(l.principal_amount),
          sisaPokok: this.formatRupiah(l.remaining_principal),
          status: l.status,
          keperluan: l.purpose,
          tenor: `${l.tenure} bulan`
        };
      });

      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole,
        module: 'LOANS',
        action: 'READ_LOANS_OWN',
        status: 'ALLOWED',
        metadata: { targetMemberId, count: memberLoans.length, scope: 'PERSONAL' }
      });

      return {
        authorized: true,
        scope: 'PERSONAL',
        effectiveRole,
        memberName: targetMember ? targetMember.full_name : user.name,
        pinjamanAktif: activeCount,
        menungguPersetujuan: pendingCount,
        lunas: paidOffCount,
        totalSisaPokok: totalRemaining,
        totalTelahDibayar: totalPaid,
        formatted: {
          sisaPokok: this.formatRupiah(totalRemaining),
          telahDibayar: this.formatRupiah(totalPaid)
        },
        daftarPinjaman: loanItems
      };
    }

    // ADMIN or CHAIRMAN: Global Aggregate
    await this.auditService.logAccess({
      userId: user.id,
      userName: user.name,
      role: user.role,
      effectiveRole,
      module: 'LOANS',
      action: 'READ_LOANS_ALL',
      status: 'ALLOWED',
      metadata: { scope: 'GLOBAL' }
    });

    let totalDisbursed = 0;
    let totalRemaining = 0;
    let totalCollected = 0;
    let activeCount = 0;
    let pendingCount = 0;
    let paidOffCount = 0;
    let rejectedCount = 0;

    allLoans.forEach(l => {
      const principal = Number(l.principal_amount || 0);
      const paid = Number(l.paid_amount || 0);
      const remaining = Number(l.remaining_principal || 0);

      if (l.status === LOAN_STATUS.ACTIVE || l.status === LOAN_STATUS.DISBURSED) {
        activeCount++;
        totalDisbursed += principal;
        totalRemaining += remaining;
        totalCollected += paid;
      } else if (l.status === LOAN_STATUS.PAID_OFF) {
        paidOffCount++;
        totalDisbursed += principal;
        totalCollected += paid;
      } else if (l.status === LOAN_STATUS.PENDING) {
        pendingCount++;
      } else if (l.status === LOAN_STATUS.REJECTED) {
        rejectedCount++;
      }
    });

    return {
      authorized: true,
      scope: 'GLOBAL',
      role: user.role,
      effectiveRole,
      totalPinjamanTercatat: allLoans.length,
      pinjamanBerjalan: activeCount,
      pinjamanPending: pendingCount,
      pinjamanLunas: paidOffCount,
      pinjamanDitolak: rejectedCount,
      totalDanaDisalurkan: totalDisbursed,
      sisaPokokPinjaman: totalRemaining,
      totalPengembalianMasuk: totalCollected,
      formatted: {
        totalDisalurkan: this.formatRupiah(totalDisbursed),
        sisaPokok: this.formatRupiah(totalRemaining),
        totalKembali: this.formatRupiah(totalCollected)
      }
    };
  }

  /**
   * 5. RINGKASAN ANGSURAN & TUNGGAKAN (INSTALLMENTS & ARREARS SUMMARY)
   * ADMIN & CHAIRMAN: Total angsuran dan tunggakan koperasi
   * DOSEN, MAHASISWA, STAF, MEMBER: Angsuran dan tagihan pribadi anggota saja
   */
  async getAuthorizedInstallmentSummary(user, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);
    const allInstallments = (await this.db.getAll(this.installmentsTable)).filter(i => !i.is_deleted);
    const allLoans = (await this.db.getAll(this.loansTable)).filter(l => !l.is_deleted);
    const loanMap = new Map(allLoans.map(l => [l.id, l]));

    if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      const targetMember = member || (await this.db.findById(this.membersTable, user.id, 'user_id'));
      const targetMemberId = targetMember ? targetMember.id : `mbr-${user.id}`;

      // Filter installments belonging strictly to member's loans
      const memberInstallments = allInstallments.filter(inst => {
        const loan = loanMap.get(inst.loan_id);
        return loan && loan.member_id === targetMemberId;
      });

      let totalDueSum = 0;
      let totalPaidSum = 0;
      let overdueCount = 0;
      let totalOverdue = 0;
      let unpaidCount = 0;
      let paidCount = 0;

      const upcoming = [];
      const overdues = [];

      memberInstallments.forEach(i => {
        const due = Number(i.total_due || 0);
        const paid = Number(i.paid_amount || 0);
        const rem = Math.max(0, due - paid);
        totalDueSum += due;
        totalPaidSum += paid;

        if (i.status === INSTALLMENT_STATUS.PAID) {
          paidCount++;
        } else if (i.status === INSTALLMENT_STATUS.OVERDUE) {
          overdueCount++;
          totalOverdue += rem;
          overdues.push({
            angsuranKe: i.installment_number,
            jatuhTempo: i.due_date,
            sisaTagihan: this.formatRupiah(rem),
            status: 'TERLAMBAT / TUNGGAKAN'
          });
        } else {
          unpaidCount++;
          upcoming.push({
            angsuranKe: i.installment_number,
            jatuhTempo: i.due_date,
            tagihan: this.formatRupiah(due),
            status: i.status
          });
        }
      });

      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole,
        module: 'INSTALLMENTS',
        action: 'READ_INSTALLMENTS_OWN',
        status: 'ALLOWED',
        metadata: { targetMemberId, count: memberInstallments.length, scope: 'PERSONAL' }
      });

      return {
        authorized: true,
        scope: 'PERSONAL',
        effectiveRole,
        totalAngsuran: memberInstallments.length,
        telahDibayar: paidCount,
        belumDibayar: unpaidCount,
        tunggakanCount: overdueCount,
        totalTunggakan: totalOverdue,
        formatted: {
          totalTagihan: this.formatRupiah(totalDueSum),
          totalDibayar: this.formatRupiah(totalPaidSum),
          totalTunggakan: this.formatRupiah(totalOverdue)
        },
        daftarTunggakan: overdues,
        daftarMendatang: upcoming.slice(0, 3)
      };
    }

    // ADMIN or CHAIRMAN: Global Aggregate
    await this.auditService.logAccess({
      userId: user.id,
      userName: user.name,
      role: user.role,
      effectiveRole,
      module: 'INSTALLMENTS',
      action: 'READ_INSTALLMENTS_ALL',
      status: 'ALLOWED',
      metadata: { scope: 'GLOBAL' }
    });

    let totalDueSum = 0;
    let totalPaidSum = 0;
    let overdueCount = 0;
    let totalOverdue = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    const overdueLoanIds = new Set();

    allInstallments.forEach(i => {
      const due = Number(i.total_due || 0);
      const paid = Number(i.paid_amount || 0);
      const rem = Math.max(0, due - paid);
      totalDueSum += due;
      totalPaidSum += paid;

      if (i.status === INSTALLMENT_STATUS.PAID) {
        paidCount++;
      } else if (i.status === INSTALLMENT_STATUS.OVERDUE) {
        overdueCount++;
        totalOverdue += rem;
        overdueLoanIds.add(i.loan_id);
      } else {
        unpaidCount++;
      }
    });

    return {
      authorized: true,
      scope: 'GLOBAL',
      role: user.role,
      effectiveRole,
      totalJadwalAngsuran: allInstallments.length,
      lunasCount: paidCount,
      belumBayarCount: unpaidCount,
      tunggakanCount: overdueCount,
      pinjamanMenunggakCount: overdueLoanIds.size,
      totalTagihan: totalDueSum,
      totalPenerimaanAngsuran: totalPaidSum,
      totalNominalTunggakan: totalOverdue,
      formatted: {
        totalTagihan: this.formatRupiah(totalDueSum),
        totalDiterima: this.formatRupiah(totalPaidSum),
        nominalTunggakan: this.formatRupiah(totalOverdue)
      }
    };
  }

  /**
   * 6. RINGKASAN ARUS KAS & KEUANGAN (FINANCIAL & CASH FLOW SUMMARY)
   * Allowed: ADMIN, CHAIRMAN
   * Denied: MAHASISWA, DOSEN, STAF, MEMBER
   */
  async getAuthorizedFinancialSummary(user, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);

    if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      const roleName = effectiveRole === 'MAHASISWA' ? 'Mahasiswa' : effectiveRole === 'DOSEN' ? 'Dosen' : effectiveRole === 'STAF' ? 'Staf' : 'Anggota';
      const reason = effectiveRole === 'MAHASISWA'
        ? 'Akses ditolak: Anggota (Mahasiswa) tidak memiliki izin untuk melihat laporan pembukuan kas dan keuangan internal koperasi.'
        : `Sebagai Anggota (${roleName}), Anda tidak memiliki izin untuk melihat laporan pembukuan kas dan keuangan internal koperasi.`;

      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole,
        module: 'FINANCIAL_REPORTS',
        action: 'READ_FINANCIAL_SUMMARY',
        status: 'DENIED',
        reason
      });

      return {
        authorized: false,
        effectiveRole,
        reason
      };
    }

    await this.auditService.logAccess({
      userId: user.id,
      userName: user.name,
      role: user.role,
      effectiveRole,
      module: 'FINANCIAL_REPORTS',
      action: 'READ_FINANCIAL_SUMMARY',
      status: 'ALLOWED'
    });

    const transactions = (await this.db.getAll(this.financialTransactionsTable)).filter(t => !t.is_reversed);
    let totalInflow = 0;
    let totalOutflow = 0;

    const breakdown = {
      simpananMasuk: 0,
      angsuranMasuk: 0,
      pendapatanLain: 0,
      penarikanSimpanan: 0,
      pencairanPinjaman: 0,
      bebanOperasional: 0
    };

    transactions.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.flow === 'IN') {
        totalInflow += amt;
        if (t.transaction_type === 'SAVING_DEPOSIT') breakdown.simpananMasuk += amt;
        else if (t.transaction_type === 'INSTALLMENT_PAYMENT') breakdown.angsuranMasuk += amt;
        else breakdown.pendapatanLain += amt;
      } else if (t.flow === 'OUT') {
        totalOutflow += amt;
        if (t.transaction_type === 'SAVING_WITHDRAWAL') breakdown.penarikanSimpanan += amt;
        else if (t.transaction_type === 'LOAN_DISBURSEMENT') breakdown.pencairanPinjaman += amt;
        else breakdown.bebanOperasional += amt;
      }
    });

    const netSurplus = totalInflow - totalOutflow;

    return {
      authorized: true,
      scope: 'GLOBAL',
      role: user.role,
      effectiveRole,
      totalPemasukanKas: totalInflow,
      totalPengeluaranKas: totalOutflow,
      surplusKasBersih: netSurplus,
      formatted: {
        pemasukan: this.formatRupiah(totalInflow),
        pengeluaran: this.formatRupiah(totalOutflow),
        surplusBersih: this.formatRupiah(netSurplus),
        simpananMasuk: this.formatRupiah(breakdown.simpananMasuk),
        angsuranMasuk: this.formatRupiah(breakdown.angsuranMasuk),
        pendapatanLain: this.formatRupiah(breakdown.pendapatanLain),
        penarikanSimpanan: this.formatRupiah(breakdown.penarikanSimpanan),
        pencairanPinjaman: this.formatRupiah(breakdown.pencairanPinjaman),
        bebanOperasional: this.formatRupiah(breakdown.bebanOperasional)
      },
      totalTransaksiBukuKas: transactions.length,
      standarAkuntansi: 'Pencatatan kas koperasi dihitung berbasis cash-basis real-time mengikuti prinsip SAK ETAP / PSAK 27.'
    };
  }

  /**
   * 6b. ANALISIS TREN KEUANGAN & PERBANDINGAN ARUS KAS BULANAN
   * Allowed: ADMIN, CHAIRMAN
   * Denied: MAHASISWA, DOSEN, STAF, MEMBER
   */
  async getAuthorizedFinancialTrend(user, member = null, referenceDate = new Date()) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);

    if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      const reason = `Sebagai Anggota (${effectiveRole}), Anda tidak memiliki izin untuk melihat laporan perbandingan arus kas internal koperasi.`;
      return { authorized: false, effectiveRole, reason };
    }

    const transactions = (await this.db.getAll(this.financialTransactionsTable)).filter(t => !t.is_reversed);
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth() + 1;

    let prevMonth = refMonth - 1;
    let prevYear = refYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = refYear - 1;
    }

    let thisMonthIn = 0;
    let thisMonthOut = 0;
    let lastMonthIn = 0;
    let lastMonthOut = 0;

    transactions.forEach(t => {
      const parts = this._getDateParts(t.transaction_date || t.created_at);
      if (parts) {
        const amt = Number(t.amount || 0);
        if (parts.year === refYear && parts.month === refMonth) {
          if (t.flow === 'IN') thisMonthIn += amt;
          else if (t.flow === 'OUT') thisMonthOut += amt;
        } else if (parts.year === prevYear && parts.month === prevMonth) {
          if (t.flow === 'IN') lastMonthIn += amt;
          else if (t.flow === 'OUT') lastMonthOut += amt;
        }
      }
    });

    const thisMonthSurplus = thisMonthIn - thisMonthOut;
    const lastMonthSurplus = lastMonthIn - lastMonthOut;
    const surplusDiff = thisMonthSurplus - lastMonthSurplus;

    let surplusGrowthPct = '0%';
    if (lastMonthSurplus !== 0) {
      const pct = ((surplusDiff / Math.abs(lastMonthSurplus)) * 100).toFixed(1);
      surplusGrowthPct = `${surplusDiff >= 0 ? '+' : ''}${pct}%`;
    }

    const isImproving = thisMonthSurplus >= lastMonthSurplus;

    return {
      authorized: true,
      scope: 'GLOBAL',
      effectiveRole,
      periodeBulanIni: `${refMonth}/${refYear}`,
      periodeBulanLalu: `${prevMonth}/${prevYear}`,
      pemasukanBulanIni: thisMonthIn,
      pemasukanBulanLalu: lastMonthIn,
      pengeluaranBulanIni: thisMonthOut,
      pengeluaranBulanLalu: lastMonthOut,
      surplusBulanIni: thisMonthSurplus,
      surplusBulanLalu: lastMonthSurplus,
      selisihSurplus: surplusDiff,
      pertumbuhanSurplus: surplusGrowthPct,
      kondisiMeningkat: isImproving,
      kesimpulan: isImproving
        ? `Kondisi keuangan koperasi bulan ini MENINGKAT dengan surplus kas ${this.formatRupiah(thisMonthSurplus)} (naik ${this.formatRupiah(surplusDiff)} dibandingkan bulan lalu).`
        : `Kondisi surplus kas bulan ini mengalami penurunan sebesar ${this.formatRupiah(Math.abs(surplusDiff))} dibandingkan bulan sebelumnya.`,
      formatted: {
        inBulanIni: this.formatRupiah(thisMonthIn),
        inBulanLalu: this.formatRupiah(lastMonthIn),
        outBulanIni: this.formatRupiah(thisMonthOut),
        outBulanLalu: this.formatRupiah(lastMonthOut),
        surplusBulanIni: this.formatRupiah(thisMonthSurplus),
        surplusBulanLalu: this.formatRupiah(lastMonthSurplus),
        selisihSurplus: this.formatRupiah(surplusDiff)
      }
    };
  }

  /**
   * 6c. ANGGOTA DENGAN SALDO SIMPANAN TERBESAR (TOP SAVERS)
   * Allowed: ADMIN, CHAIRMAN
   * Scoped / Denied: DOSEN, MAHASISWA, STAF, MEMBER
   */
  async getAuthorizedTopSavers(user, { limit = 5 } = {}, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);

    if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      return {
        authorized: false,
        effectiveRole,
        reason: 'Akses Terbatas: Pemeringkatan saldo simpanan seluruh anggota hanya dapat diakses oleh Admin dan Pengurus demi melindungi privasi data finansial anggota.'
      };
    }

    const transactions = await this.db.getAll(this.savingTransactionsTable);
    const members = await this.db.getAll(this.membersTable);
    const memberMap = new Map(members.map(m => [m.id, m]));

    // Aggregate net savings per member
    const balanceMap = new Map();
    transactions.forEach(t => {
      const mId = t.member_id;
      const amt = Number(t.amount || 0);
      const current = balanceMap.get(mId) || 0;
      if (t.transaction_type === 'DEPOSIT') {
        balanceMap.set(mId, current + amt);
      } else if (t.transaction_type === 'WITHDRAWAL') {
        balanceMap.set(mId, current - amt);
      }
    });

    const ranked = Array.from(balanceMap.entries())
      .map(([mId, balance]) => {
        const m = memberMap.get(mId);
        return {
          memberId: mId,
          memberName: m ? m.full_name : 'Anggota',
          memberNumber: m ? m.member_number : '-',
          memberType: m ? m.member_type : '-',
          totalSaldo: balance,
          formattedSaldo: this.formatRupiah(balance)
        };
      })
      .sort((a, b) => b.totalSaldo - a.totalSaldo)
      .slice(0, limit);

    return {
      authorized: true,
      scope: 'GLOBAL',
      effectiveRole,
      topRank: ranked
    };
  }

  /**
   * 6d. RINGKASAN KONDISI UMUM KOPERASI (COOPERATIVE EXECUTIVE SUMMARY)
   * Allowed: ADMIN, CHAIRMAN
   */
  async getAuthorizedCoopSummary(user, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);

    if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      return this.getAuthorizedSavingsSummary(user, member);
    }

    const memberStats = await this.getAuthorizedMemberStatistics(user, member);
    const savingsStats = await this.getAuthorizedSavingsSummary(user, member);
    const loanStats = await this.getAuthorizedLoanSummary(user, member);
    const installmentStats = await this.getAuthorizedInstallmentSummary(user, member);
    const financialStats = await this.getAuthorizedFinancialSummary(user, member);

    return {
      authorized: true,
      scope: 'GLOBAL',
      effectiveRole,
      summaryType: 'EXECUTIVE_SUMMARY',
      ringkasan: {
        anggota: {
          total: memberStats.summary.totalTerdaftar,
          aktif: memberStats.summary.totalAktif,
          nonaktif: memberStats.summary.totalNonaktif
        },
        simpanan: {
          totalSaldo: savingsStats.formatted.total,
          pokok: savingsStats.formatted.pokok,
          wajib: savingsStats.formatted.wajib,
          sukarela: savingsStats.formatted.sukarela
        },
        pinjaman: {
          totalDisalurkan: loanStats.formatted.totalDisalurkan,
          sisaPokok: loanStats.formatted.sisaPokok,
          pinjamanBerjalan: loanStats.pinjamanBerjalan,
          menungguPersetujuan: loanStats.pinjamanPending
        },
        angsuran: {
          totalTagihan: installmentStats.formatted.totalTagihan,
          totalTunggakan: installmentStats.formatted.nominalTunggakan,
          pinjamanMenunggak: installmentStats.pinjamanMenunggakCount
        },
        kas: {
          pemasukan: financialStats.formatted.pemasukan,
          pengeluaran: financialStats.formatted.pengeluaran,
          surplusBersih: financialStats.formatted.surplusBersih
        }
      }
    };
  }

  /**
   * 7. STATUS MODUL INVENTARIS / STOK BARANG
   * Verifies inventory module availability without hallucinating fake numbers
   */
  async getAuthorizedInventoryStatus(user, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);

    await this.auditService.logAccess({
      userId: user.id,
      userName: user.name,
      role: user.role,
      effectiveRole,
      module: 'INVENTORY_STOCK',
      action: 'CHECK_INVENTORY_STATUS',
      status: 'ALLOWED'
    });

    return {
      authorized: true,
      effectiveRole,
      module: 'INVENTORY_STOCK',
      isAvailable: false,
      isModuleActive: false,
      message: 'Modul inventaris dan stok barang saat ini BELUM TERSEDIA atau belum diimplementasikan pada sistem Koperasi STMIK IKMI Cirebon.',
      penjelasan: 'Sistem Smart Co-op saat ini difokuskan pada manajemen simpanan (pokok, wajib, sukarela), pinjaman & angsuran, buku kas umum, dan laporan keuangan koperasi. Tidak ada data barang fisik, inventaris, maupun stok gudang yang tercatat.',
      saran: 'Jika koperasi berencana membuka unit usaha toko/waserda atau kantin, modul inventaris barang dapat diajukan ke administrator untuk dikembangkan pada pembaruan mendatang.'
    };
  }

  /**
   * 8. PROFIL ANGGOTA PRIBADI (OWN PROFILE)
   * Available for all authenticated roles
   */
  async getOwnMemberProfile(user, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);
    const targetMember = member || (await this.db.findById(this.membersTable, user.id, 'user_id'));

    await this.auditService.logAccess({
      userId: user.id,
      userName: user.name,
      role: user.role,
      effectiveRole,
      module: 'PROFILE',
      action: 'READ_PROFILE_OWN',
      status: 'ALLOWED'
    });

    return {
      authorized: true,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      effectiveRole,
      statusAkun: user.status,
      memberNumber: targetMember ? targetMember.member_number : '-',
      memberType: targetMember ? targetMember.member_type : '-',
      identityNumber: targetMember ? targetMember.identity_number : '-',
      phone: targetMember ? targetMember.phone : '-',
      joinDate: targetMember ? targetMember.join_date : '-',
      statusAnggota: targetMember ? targetMember.status : 'BELUM TERDAFTAR SEBAGAI ANGGOTA'
    };
  }

  /**
   * 9. DAFTAR ANGGOTA (MEMBER LIST)
   * Allowed: ADMIN, CHAIRMAN
   * Denied: DOSEN, MAHASISWA, STAF, MEMBER
   */
  async getAuthorizedMemberList(user, { status = null, limit = 50 } = {}, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);

    if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      const reason = 'Akses Terbatas: Hanya Admin dan Pengurus/Ketua yang berwenang melihat daftar seluruh anggota koperasi.';

      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole,
        module: 'MEMBERS',
        action: 'READ_MEMBER_LIST',
        status: 'DENIED',
        reason
      });

      return {
        authorized: false,
        effectiveRole,
        reason,
        message: reason
      };
    }

    await this.auditService.logAccess({
      userId: user.id,
      userName: user.name,
      role: user.role,
      effectiveRole,
      module: 'MEMBERS',
      action: 'READ_MEMBER_LIST',
      status: 'ALLOWED'
    });

    let members = await this.db.getAll(this.membersTable);
    if (status) {
      members = members.filter(m => m.status === status);
    }

    const mapped = members.map(m => ({
      id: m.id,
      memberNumber: m.member_number,
      fullName: m.full_name,
      memberType: m.member_type,
      status: m.status,
      phone: m.phone || '-',
      joinDate: m.join_date || m.created_at || '-'
    }));

    return {
      authorized: true,
      effectiveRole,
      total: mapped.length,
      members: mapped.slice(0, limit)
    };
  }

  /**
   * 10. DAFTAR PINJAMAN (LOAN LIST)
   * ADMIN & CHAIRMAN: Daftar pinjaman koperasi (default ACTIVE / DISBURSED)
   * DOSEN, MAHASISWA, STAF, MEMBER: Pinjaman pribadi milik sendiri
   */
  async getAuthorizedLoanList(user, { status = null, limit = 20 } = {}, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);
    const allLoans = (await this.db.getAll(this.loansTable)).filter(l => !l.is_deleted);
    const members = await this.db.getAll(this.membersTable);
    const memberMap = new Map(members.map(m => [m.id, m]));

    if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      const targetMember = member || (await this.db.findById(this.membersTable, user.id, 'user_id'));
      const targetMemberId = targetMember ? targetMember.id : `mbr-${user.id}`;
      let memberLoans = allLoans.filter(l => l.member_id === targetMemberId);

      if (status === 'ACTIVE') {
        memberLoans = memberLoans.filter(l => l.status === LOAN_STATUS.ACTIVE || l.status === LOAN_STATUS.DISBURSED);
      } else if (status) {
        memberLoans = memberLoans.filter(l => l.status === status);
      }

      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole,
        module: 'LOANS',
        action: 'READ_LOAN_LIST_OWN',
        status: 'ALLOWED',
        metadata: { targetMemberId, count: memberLoans.length, scope: 'PERSONAL' }
      });

      return {
        authorized: true,
        scope: 'PERSONAL',
        effectiveRole,
        total: memberLoans.length,
        loans: memberLoans.slice(0, limit).map(l => ({
          loanNumber: l.loan_number,
          memberName: targetMember ? targetMember.full_name : user.name,
          memberNumber: targetMember ? targetMember.member_number : '-',
          principalAmount: Number(l.principal_amount || 0),
          remainingPrincipal: Number(l.remaining_principal || 0),
          formattedPrincipal: this.formatRupiah(l.principal_amount),
          formattedRemaining: this.formatRupiah(l.remaining_principal),
          status: l.status,
          tenure: `${l.tenure} bulan`,
          purpose: l.purpose
        }))
      };
    }

    // ADMIN & CHAIRMAN
    await this.auditService.logAccess({
      userId: user.id,
      userName: user.name,
      role: user.role,
      effectiveRole,
      module: 'LOANS',
      action: 'READ_LOAN_LIST_GLOBAL',
      status: 'ALLOWED',
      metadata: { scope: 'GLOBAL' }
    });

    let targetLoans = allLoans;
    if (status === 'ACTIVE' || status === 'UNPAID') {
      targetLoans = allLoans.filter(l => l.status === LOAN_STATUS.ACTIVE || l.status === LOAN_STATUS.DISBURSED);
    } else if (status) {
      targetLoans = allLoans.filter(l => l.status === status);
    }

    const mapped = targetLoans.map(l => {
      const m = memberMap.get(l.member_id);
      return {
        loanNumber: l.loan_number,
        memberName: m ? m.full_name : 'Anggota',
        memberNumber: m ? m.member_number : '-',
        principalAmount: Number(l.principal_amount || 0),
        remainingPrincipal: Number(l.remaining_principal || 0),
        formattedPrincipal: this.formatRupiah(l.principal_amount),
        formattedRemaining: this.formatRupiah(l.remaining_principal),
        status: l.status,
        tenure: `${l.tenure} bulan`,
        purpose: l.purpose
      };
    });

    return {
      authorized: true,
      scope: 'GLOBAL',
      effectiveRole,
      total: mapped.length,
      loans: mapped.slice(0, limit)
    };
  }

  /**
   * 11. ANGGOTA YANG BELUM MEMBAYAR ANGSURAN (UNPAID INSTALLMENTS)
   * ADMIN & CHAIRMAN: Daftar anggota yang memiliki angsuran belum dibayar (UNPAID / OVERDUE)
   * DOSEN, MAHASISWA, STAF, MEMBER: Tagihan angsuran milik sendiri yang belum lunas
   */
  async getAuthorizedUnpaidInstallmentMembers(user, { limit = 30 } = {}, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);
    const allInstallments = (await this.db.getAll(this.installmentsTable)).filter(i => !i.is_deleted);
    const allLoans = (await this.db.getAll(this.loansTable)).filter(l => !l.is_deleted);
    const allMembers = await this.db.getAll(this.membersTable);

    const loanMap = new Map(allLoans.map(l => [l.id, l]));
    const memberMap = new Map(allMembers.map(m => [m.id, m]));

    if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      const targetMember = member || (await this.db.findById(this.membersTable, user.id, 'user_id'));
      const targetMemberId = targetMember ? targetMember.id : `mbr-${user.id}`;

      const unpaidList = allInstallments
        .filter(i => i.status !== INSTALLMENT_STATUS.PAID)
        .filter(i => {
          const loan = loanMap.get(i.loan_id);
          return loan && loan.member_id === targetMemberId;
        })
        .map(i => {
          const loan = loanMap.get(i.loan_id);
          const totalDue = Number(i.total_due || 0);
          const paidAmount = Number(i.paid_amount || 0);
          const remaining = Math.max(0, totalDue - paidAmount);
          return {
            memberName: targetMember ? targetMember.full_name : user.name,
            memberNumber: targetMember ? targetMember.member_number : '-',
            loanNumber: loan ? loan.loan_number : '-',
            installmentNumber: i.installment_number,
            dueDate: i.due_date,
            totalDue,
            paidAmount,
            remainingAmount: remaining,
            formattedRemaining: this.formatRupiah(remaining),
            status: i.status
          };
        });

      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole,
        module: 'INSTALLMENTS',
        action: 'READ_UNPAID_INSTALLMENTS_OWN',
        status: 'ALLOWED',
        metadata: { targetMemberId, count: unpaidList.length, scope: 'PERSONAL' }
      });

      return {
        authorized: true,
        scope: 'PERSONAL',
        effectiveRole,
        count: unpaidList.length,
        items: unpaidList.slice(0, limit)
      };
    }

    // ADMIN or CHAIRMAN
    await this.auditService.logAccess({
      userId: user.id,
      userName: user.name,
      role: user.role,
      effectiveRole,
      module: 'INSTALLMENTS',
      action: 'READ_UNPAID_INSTALLMENTS_GLOBAL',
      status: 'ALLOWED',
      metadata: { scope: 'GLOBAL' }
    });

    const unpaidList = allInstallments
      .filter(i => i.status !== INSTALLMENT_STATUS.PAID)
      .map(i => {
        const loan = loanMap.get(i.loan_id);
        const m = loan ? memberMap.get(loan.member_id) : null;
        const totalDue = Number(i.total_due || 0);
        const paidAmount = Number(i.paid_amount || 0);
        const remaining = Math.max(0, totalDue - paidAmount);
        return {
          memberName: m ? m.full_name : 'Anggota',
          memberNumber: m ? m.member_number : '-',
          loanNumber: loan ? loan.loan_number : '-',
          installmentNumber: i.installment_number,
          dueDate: i.due_date,
          totalDue,
          paidAmount,
          remainingAmount: remaining,
          formattedRemaining: this.formatRupiah(remaining),
          status: i.status
        };
      })
      .sort((a, b) => {
        // OVERDUE first, then earliest due date
        if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
        if (a.status !== 'OVERDUE' && b.status === 'OVERDUE') return 1;
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      });

    return {
      authorized: true,
      scope: 'GLOBAL',
      effectiveRole,
      count: unpaidList.length,
      items: unpaidList.slice(0, limit)
    };
  }

  /**
   * 12. RINGKASAN KAPABILITAS & ARSITEKTUR APLIKASI
   * Available for all authenticated roles
   */
  async getApplicationOverview(user, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);

    return {
      authorized: true,
      effectiveRole,
      type: 'application_overview',
      name: 'Smart Co-op Financial System',
      institution: 'STMIK IKMI Cirebon',
      legalNumber: '518/BH/DISKOP-UKM/2020',
      description: 'Aplikasi berbasis web untuk membantu pengelolaan administrasi dan keuangan Koperasi Pegawai & Civitas STMIK IKMI Cirebon secara akuntabel, transparan, dan modern.',
      targetUsers: ['Admin Koperasi', 'Ketua STMIK IKMI', 'Dosen', 'Mahasiswa', 'Staf Pegawai'],
      currentUserRole: user.role,
      activeModules: [
        {
          name: 'Manajemen Keanggotaan',
          description: 'Pendaftaran anggota baru (Dosen, Mahasiswa, Staf), pencatatan identitas resmi (NIDN, NIM, NIP), serta monitoring status aktif dan nonaktif.'
        },
        {
          name: 'Simpanan Koperasi',
          description: 'Pengelolaan Simpanan Pokok, Wajib, dan Sukarela, pencatatan setoran & penarikan saldo simpanan secara akurat.'
        },
        {
          name: 'Pinjaman & Pembiayaan',
          description: 'Pengajuan pinjaman mandiri, evaluasi komite, approval berjenjang, dan beragam skema perhitungan bunga: Flat, Menurun/Efektif, Anuitas, serta 0% Syariah Qardh.'
        },
        {
          name: 'Jadwal & Pembayaran Angsuran',
          description: 'Penjadwalan angsuran bulanan otomatis, deteksi jatuh tempo, denda keterlambatan, dan pencatatan pelunasan.'
        },
        {
          name: 'Buku Kas & Transaksi Keuangan',
          description: 'Pencatatan buku kas umum real-time (kas masuk/inflow dan kas keluar/outflow), immutable ledger, dan mekanisme pembalik (reversal) transaksi yang akuntabel.'
        },
        {
          name: 'Laporan Keuangan',
          description: 'Laporan keuangan komprehensif (Anggota, Simpanan, Pinjaman, Arus Kas, dan Neraca) berbasis standar akuntansi SAK ETAP / PSAK 27.'
        },
        {
          name: 'Notifikasi Telegram Bot',
          description: 'Integrasi notifikasi instan via Telegram Bot resmi menggunakan tautan kode OTP aman untuk pembaruan status pinjaman dan transaksi.'
        },
        {
          name: 'Smart Co-op AI Assistant',
          description: 'Asisten cerdas terintegrasi Multi-Model AI (NVIDIA NIM, Gemini, OpenAI, Anthropic, OpenRouter, Ollama) dan basis data aktual untuk menjawab pertanyaan seputar fitur, data koperasi, dan bantuan teknis.'
        }
      ],
      inactiveModules: [
        {
          name: 'Inventaris & Stok Fisik Barang',
          description: 'Modul inventaris/stok barang toko fisik saat ini belum tersedia pada sistem karena sistem difokuskan pada simpan pinjam dan pembukuan kas.'
        }
      ],
      securityStandards: [
        'Enkripsi kata sandi PBKDF2-SHA256 dengan 100.000 iterasi dan random salt 16-byte',
        'Autentikasi sesi berbasis token aman pada basis data',
        'Role-Based Access Control (RBAC) ketat dengan prinsip Least Privilege',
        'Isolasi data pribadi anggota (anggota hanya dapat melihat data finansial miliknya sendiri)'
      ]
    };
  }

  /**
   * 13. PANDUAN PENGGUNAAN ALUR KERJA (WORKFLOW GUIDES)
   * Detailed step-by-step procedures based on documented application UI
   */
  async getWorkflowGuide(topic = '', user = null, member = null) {
    if (!user) {
      throw new AuthorizationError('Autentikasi diperlukan.', 'UNAUTHENTICATED');
    }

    const effectiveRole = resolveEffectiveRole(user, member);
    const cleanTopic = (topic || '').toUpperCase();

    if (cleanTopic.includes('PINJAMAN') && (cleanTopic.includes('SETUJUI') || cleanTopic.includes('APPROVE'))) {
      if (effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
        return {
          authorized: true,
          effectiveRole,
          topic: 'PERSETUJUAN_PINJAMAN',
          title: 'Persetujuan Pinjaman (Hak Akses Terbatas)',
          content: 'Sebagai Anggota, Anda tidak memiliki kewenangan untuk menyetujui pinjaman. Persetujuan pinjaman dilakukan oleh komite pembiayaan (Admin) dan disahkan oleh Ketua Koperasi (Chairman).'
        };
      }
      return {
        authorized: true,
        effectiveRole,
        topic: 'PERSETUJUAN_PINJAMAN',
        title: 'Alur Persetujuan Pinjaman (Admin & Ketua)',
        steps: [
          'Buka menu **Pinjaman** pada sidebar navigasi.',
          'Pada tabel daftar pinjaman, temukan pengajuan yang berstatus `PENDING`.',
          'Klik tombol **Detail / Review** untuk melihat kelayakan anggota, nominal pokok, tenor, dan keperluan pinjaman.',
          'Admin melakukan verifikasi berkas dan catatan awal.',
          'Ketua atau komite pembiayaan mengklik tombol **Setujui (Approve)** atau **Tolak (Reject)** disertai alasan/catatan resmi.',
          'Setelah disetujui, Admin dapat mencairkan pinjaman melalui menu kasir/pencairan dan sistem secara otomatis menerbitkan jadwal angsuran bulanan.'
        ]
      };
    }

    if (cleanTopic.includes('PINJAMAN') || cleanTopic.includes('AJUKAN')) {
      return {
        authorized: true,
        effectiveRole,
        topic: 'PENGAJUAN_PINJAMAN',
        title: 'Alur Pengajuan Pinjaman',
        steps: [
          'Buka menu **Pinjaman** lalu klik tombol **Ajukan Pinjaman**.',
          'Pilih nama anggota peminjam (atau otomatis terisi untuk akun Anggota).',
          'Masukkan nominal pinjaman yang dibutuhkan dan tentukan tenor waktu pengembalian (bulan).',
          'Pilih skema bunga: Flat (Tetap), Menurun/Efektif, Anuitas, atau 0% Syariah Qardh.',
          'Tuliskan keperluan pinjaman (misal: biaya akademik, riset, atau renovasi).',
          'Klik **Kirim Pengajuan**. Status pinjaman akan menjadi `PENDING` menunggu tinjauan pengurus.'
        ]
      };
    }

    if (cleanTopic.includes('SIMPANAN') || cleanTopic.includes('SETOR')) {
      return {
        authorized: true,
        effectiveRole,
        topic: 'SETORAN_SIMPANAN',
        title: 'Alur Setoran Simpanan',
        steps: [
          'Buka menu **Simpanan & Operasional**.',
          'Klik tombol **Setor Simpanan**.',
          'Pilih anggota penyetor dan tentukan jenis simpanan (Simpanan Pokok awal, Simpanan Wajib rutin, atau Simpanan Sukarela).',
          'Masukkan nominal setoran dan catatan transaksi.',
          'Pilih metode pembayaran (Tunai Teller atau Transfer Bank).',
          'Klik **Simpan Transaksi**. Saldo simpanan anggota dan kas masuk koperasi otomatis terupdate.'
        ]
      };
    }

    if (cleanTopic.includes('ANGSURAN') || cleanTopic.includes('BAYAR')) {
      return {
        authorized: true,
        effectiveRole,
        topic: 'PEMBAYARAN_ANGSURAN',
        title: 'Alur Pembayaran Angsuran',
        steps: [
          'Buka menu **Angsuran**.',
          'Cari jadwal tagihan angsuran pinjaman berdasarkan nomor pinjaman atau nama anggota.',
          'Pilih angsuran yang berstatus `UNPAID` atau `OVERDUE`.',
          'Klik tombol **Bayar Angsuran**.',
          'Masukkan nominal pembayaran, tanggal bayar, dan nomor bukti pembayaran / kuitansi.',
          'Klik **Konfirmasi Pembayaran**. Status angsuran berubah menjadi `PAID` dan sisa pokok pinjaman berkurang otomatis.'
        ]
      };
    }

    if (cleanTopic.includes('ANGGOTA') || cleanTopic.includes('DAFTAR')) {
      return {
        authorized: true,
        effectiveRole,
        topic: 'PENDAFTARAN_ANGGOTA',
        title: 'Alur Pendaftaran Anggota Baru',
        steps: [
          'Buka menu **Anggota** pada dashboard navigasi.',
          'Klik tombol **Tambah Anggota Baru**.',
          'Isi data identitas: Nama Lengkap, Email institusi (@ikmi.ac.id), Nomor Induk (NIDN untuk Dosen, NIM untuk Mahasiswa, NIP untuk Staf).',
          'Lengkapi nomor telepon aktif dan alamat tempat tinggal.',
          'Tentukan tanggal bergabung dan klik **Simpan Data**.',
          'Nomor anggota unik (contoh: `IKMI-MBR-005`) diterbitkan otomatis oleh sistem.'
        ]
      };
    }

    if (cleanTopic.includes('TELEGRAM')) {
      return {
        authorized: true,
        effectiveRole,
        topic: 'LINK_TELEGRAM',
        title: 'Alur Menghubungkan Notifikasi Telegram',
        steps: [
          'Login ke akun Anda dan buka menu **Profil Pengguna** atau klik tombol **Hubungkan Telegram**.',
          'Klik tombol **Buat Kode Tautan (OTP)** untuk mendapatkan kode 6 digit yang berlaku selama 10 menit.',
          'Buka aplikasi Telegram dan cari bot resmi Koperasi STMIK IKMI.',
          'Kirimkan pesan: `/start <KODE_OTP>` (contoh: `/start 482910`).',
          'Bot akan mengonfirmasi akun Anda berhasil terhubung, dan setiap ada transaksi atau persetujuan pinjaman, notifikasi otomatis terkirim.'
        ]
      };
    }

    // Default general workflow summary
    return {
      authorized: true,
      effectiveRole,
      topic: 'GENERAL_WORKFLOW',
      title: 'Panduan Alur Operasional Koperasi',
      steps: [
        '1. **Pendaftaran Anggota:** Menu Anggota > Tambah Anggota',
        '2. **Simpanan (Setor/Tarik):** Menu Simpanan & Operasional',
        '3. **Pengajuan Pinjaman:** Menu Pinjaman > Ajukan Pinjaman',
        '4. **Persetujuan Pinjaman:** Menu Pinjaman > Review & Setujui (khusus Admin & Ketua)',
        '5. **Pembayaran Angsuran:** Menu Angsuran > Bayar Angsuran',
        '6. **Laporan Keuangan:** Menu Laporan > Cetak / Export'
      ]
    };
  }
}
