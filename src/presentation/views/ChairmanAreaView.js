/**
 * Protected Chairman Area View - Executive Financial & Portfolio Monitoring
 * Role: CHAIRMAN & ADMIN
 * 
 * Requirements:
 * 1. 9 Executive KPI Monitoring Metrics:
 *    - Total Anggota Aktif
 *    - Total Simpanan
 *    - Total Pinjaman
 *    - Total Angsuran
 *    - Pinjaman Aktif
 *    - Pinjaman Overdue
 *    - Income
 *    - Expense
 *    - Net Cash Movement
 * 2. Visualisasi Tren Transaksi Berdasarkan Periode (Sederhana & Mudah Dipahami)
 * 3. Bersifat READ-ONLY terhadap data operasional:
 *    - Tidak mengubah transaksi
 *    - Tidak mengubah saldo
 *    - Tidak mengubah data anggota
 *    - Tidak mengubah data pinjaman
 * 
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { requireAuthorization } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { LoanService } from '../../core/services/LoanService.js';
import { MemberService } from '../../core/services/MemberService.js';
import { SavingService } from '../../core/services/SavingService.js';
import { ReportService } from '../../core/services/ReportService.js';
import { ROLES, SAVING_TYPES, FINANCIAL_TRANSACTION_TYPES, LOAN_STATUS } from '../../config/constants.js';

export async function renderChairmanAreaView(container, { user }) {
  // Service-level RBAC enforcement
  requireAuthorization(user, [ROLES.CHAIRMAN, ROLES.ADMIN]);

  const loanService = new LoanService();
  const memberService = new MemberService();
  const savingService = new SavingService();
  const reportService = new ReportService();

  // Period Filter State
  let selectedPeriod = 'ALL'; // 'ALL' | 'THIS_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR'
  let startDate = '';
  let endDate = '';

  function computeDateRange(periodKey) {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start = '';

    if (periodKey === 'THIS_MONTH') {
      start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    } else if (periodKey === 'LAST_3_MONTHS') {
      const past = new Date();
      past.setMonth(now.getMonth() - 2);
      past.setDate(1);
      start = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-01`;
    } else if (periodKey === 'THIS_YEAR') {
      start = `${now.getFullYear()}-01-01`;
    } else {
      start = '';
    }

    return { start, end };
  }

  async function render() {
    const dates = computeDateRange(selectedPeriod);
    const filterStartDate = startDate || dates.start;
    const filterEndDate = endDate || dates.end;

    // Fetch All Executive Domain Metrics in Parallel
    const [
      allMembers,
      globalSavings,
      loanMetrics,
      cashFlowSummary,
      allLoansData,
      overdueList,
      transactionsData
    ] = await Promise.all([
      memberService.getAll(),
      savingService.getGlobalBalances(),
      loanService.getExecutiveLoanMetrics(),
      reportService.getCashFlowSummaryReport({ startDate: filterStartDate, endDate: filterEndDate }),
      loanService.getAllLoans(),
      loanService.getOverdueInstallments(),
      reportService.getTransactionsReport({ startDate: filterStartDate, endDate: filterEndDate, limit: 1000 })
    ]);

    // Compute active member metrics
    const activeMembers = allMembers.filter(m => m.status === 'ACTIVE');
    const dosenCount = activeMembers.filter(m => m.member_type === 'DOSEN').length;
    const stafCount = activeMembers.filter(m => m.member_type === 'STAF').length;
    const mhsCount = activeMembers.filter(m => m.member_type === 'MAHASISWA').length;

    // Income & Expense Breakdown from Cash Flow Summary
    const totalIncome = cashFlowSummary.breakdownInflow[FINANCIAL_TRANSACTION_TYPES.INCOME]
      ? cashFlowSummary.breakdownInflow[FINANCIAL_TRANSACTION_TYPES.INCOME].amount
      : 0;

    const totalExpense = cashFlowSummary.breakdownOutflow[FINANCIAL_TRANSACTION_TYPES.EXPENSE]
      ? cashFlowSummary.breakdownOutflow[FINANCIAL_TRANSACTION_TYPES.EXPENSE].amount
      : 0;

    // Monthly Trend Data Computation for Visualization
    const monthlyTrend = buildMonthlyTrendData(transactionsData.items || []);

    container.innerHTML = `
      <div class="animate-fade-in" style="padding-bottom: 3.5rem;">
        
        <!-- Chairman Executive Hero Header -->
        <div style="background: linear-gradient(135deg, #0A2540 0%, #064e3b 60%, #047857 100%); border-radius: var(--radius-xl); padding: 2.25rem 2rem; color: #fff; margin-bottom: 1.5rem; box-shadow: var(--shadow-lg); position: relative; overflow: hidden;">
          <div style="position: absolute; right: -25px; bottom: -25px; opacity: 0.06; font-size: 11rem; font-weight: 900; pointer-events: none; user-select: none;">EXECUTIVE</div>
          
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(16, 185, 129, 0.25); backdrop-filter: blur(8px); padding: 0.35rem 0.9rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #a7f3d0; border: 1px solid rgba(167, 243, 208, 0.3);">
              <span>🏛️ EXECUTIVE MONITORING & PENGAWASAN KOPERASI</span>
              <span style="opacity: 0.5;">&bull;</span>
              <span>KETUA STMIK IKMI</span>
            </div>

            <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(0, 0, 0, 0.35); padding: 0.35rem 0.8rem; border-radius: var(--radius-full); font-size: 0.725rem; font-weight: 700; color: #fef08a; border: 1px solid rgba(254, 240, 138, 0.3);">
              <span>🔒 HAK AKSES: READ-ONLY TERHADAP OPERASIONAL</span>
            </div>
          </div>

          <h2 style="font-size: 1.85rem; color: #fff; margin-bottom: 0.45rem; font-family: 'Outfit', sans-serif;">
            Executive Financial & Governance Monitoring Dashboard
          </h2>
          <p style="font-size: 0.875rem; color: rgba(255,255,255,0.92); max-width: 850px; line-height: 1.6; margin: 0;">
            Pantau ringkasan metrik keuangan dan pergerakan kas koperasi secara terpusat: keanggotaan aktif, likuiditas simpanan, dana pembiayaan, realisasi angsuran, pendapatan, beban, surplus kas bersih, serta profil risiko portofolio pinjaman.
          </p>
        </div>

        <!-- Strict Read-Only Governance Card -->
        <div class="card" style="background: var(--bg-subtle); border-left: 4px solid var(--primary-600); padding: 0.9rem 1.25rem; margin-bottom: 1.5rem; font-size: 0.825rem; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            🛡️ <strong>Prinsip Tata Kelola Pengawasan Eksekutif (Read-Only Policy):</strong> Akun Ketua bersifat murni <em>Read-Only</em> terhadap seluruh data operasional (tidak dapat mengubah transaksi kas, tidak dapat memodifikasi saldo, tidak dapat mengubah data anggota, dan tidak dapat mengubah data pinjaman). Segala mutasi operasional merupakan kewenangan kasir/teller dan admin operasional.
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <a href="#/reports" class="btn btn-sm btn-outline-primary" style="font-size: 0.75rem;">
              📊 Buka Rekapitulasi Laporan
            </a>
            <a href="#/settings/telegram" class="btn btn-sm btn-outline-primary" style="font-size: 0.75rem; color: #0088cc; border-color: #0088cc;">
              ✈️ Notifikasi Telegram
            </a>
          </div>
        </div>

        <!-- Section: 9 Executive KPI Metrics Grid -->
        <div style="margin-bottom: 1.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <h3 style="font-size: 1.15rem; color: var(--text-primary); margin: 0; font-family: 'Outfit', sans-serif;">
              📈 9 Indikator Utama Kinerja Keuangan Koperasi
            </h3>
            <span style="font-size: 0.75rem; color: var(--text-tertiary);">Data Live Terhubung ke Basis Data</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            
            <!-- 1. Total Anggota Aktif -->
            <div class="stat-card" style="--stat-accent: #3b82f6;">
              <div class="stat-info">
                <span class="stat-label">Total Anggota Aktif</span>
                <span class="stat-value" style="color: var(--primary-600); font-size: 1.5rem;">
                  ${activeMembers.length} Orang
                </span>
                <span class="stat-subtext">${dosenCount} Dosen &bull; ${stafCount} Staf &bull; ${mhsCount} Mhs</span>
              </div>
              <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
                👥
              </div>
            </div>

            <!-- 2. Total Simpanan -->
            <div class="stat-card" style="--stat-accent: #10b981;">
              <div class="stat-info">
                <span class="stat-label">Total Saldo Simpanan</span>
                <span class="stat-value" style="color: var(--success); font-size: 1.45rem;">
                  Rp ${globalSavings.total.toLocaleString('id-ID')}
                </span>
                <span class="stat-subtext">Pokok: Rp ${(globalSavings[SAVING_TYPES.POKOK]/1000000).toFixed(1)}M &bull; Wajib: Rp ${(globalSavings[SAVING_TYPES.WAJIB]/1000000).toFixed(1)}M &bull; Sukarela: Rp ${(globalSavings[SAVING_TYPES.SUKARELA]/1000000).toFixed(1)}M</span>
              </div>
              <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
                💰
              </div>
            </div>

            <!-- 3. Total Pinjaman Disalurkan -->
            <div class="stat-card" style="--stat-accent: #6366f1;">
              <div class="stat-info">
                <span class="stat-label">Total Pinjaman Disalurkan</span>
                <span class="stat-value" style="color: #4f46e5; font-size: 1.45rem;">
                  Rp ${loanMetrics.totalDisbursedAmount.toLocaleString('id-ID')}
                </span>
                <span class="stat-subtext">${loanMetrics.totalLoansCount} Total Fasilitas Pembiayaan</span>
              </div>
              <div class="stat-icon" style="--stat-icon-bg: #e0e7ff; --stat-icon-color: #4338ca;">
                💳
              </div>
            </div>

            <!-- 4. Total Angsuran Diterima -->
            <div class="stat-card" style="--stat-accent: #0284c7;">
              <div class="stat-info">
                <span class="stat-label">Total Angsuran Diterima</span>
                <span class="stat-value" style="color: #0284c7; font-size: 1.45rem;">
                  Rp ${loanMetrics.totalRepaymentsCollected.toLocaleString('id-ID')}
                </span>
                <span class="stat-subtext">Realisasi Pokok & Jasa Cicilan Masuk</span>
              </div>
              <div class="stat-icon" style="--stat-icon-bg: #e0f2fe; --stat-icon-color: #0284c7;">
                📥
              </div>
            </div>

            <!-- 5. Pinjaman Aktif (Outstanding Principal) -->
            <div class="stat-card" style="--stat-accent: #f59e0b;">
              <div class="stat-info">
                <span class="stat-label">Pinjaman Aktif (Outstanding)</span>
                <span class="stat-value" style="color: var(--warning-dark); font-size: 1.45rem;">
                  Rp ${loanMetrics.totalOutstandingPrincipal.toLocaleString('id-ID')}
                </span>
                <span class="stat-subtext">${loanMetrics.totalActiveCount} Fasilitas Pinjaman Berjalan</span>
              </div>
              <div class="stat-icon" style="--stat-icon-bg: var(--warning-light); --stat-icon-color: var(--warning-dark);">
                ⏳
              </div>
            </div>

            <!-- 6. Pinjaman Overdue (NPL / Macet) -->
            <div class="stat-card" style="--stat-accent: #ef4444;">
              <div class="stat-info">
                <span class="stat-label">Pinjaman Overdue (NPL)</span>
                <span class="stat-value" style="color: var(--danger); font-size: 1.45rem;">
                  ${loanMetrics.nplRate}% <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-tertiary);">(Rp ${loanMetrics.totalOverdueAmount.toLocaleString('id-ID')})</span>
                </span>
                <span class="stat-subtext">${loanMetrics.totalOverdueCount} Tagihan Lewat Jatuh Tempo</span>
              </div>
              <div class="stat-icon" style="--stat-icon-bg: var(--danger-light); --stat-icon-color: var(--danger);">
                ⚠️
              </div>
            </div>

            <!-- 7. Income (Pendapatan Operasional) -->
            <div class="stat-card" style="--stat-accent: #10b981;">
              <div class="stat-info">
                <span class="stat-label">Pendapatan (Income)</span>
                <span class="stat-value" style="color: var(--success); font-size: 1.45rem;">
                  +Rp ${totalIncome.toLocaleString('id-ID')}
                </span>
                <span class="stat-subtext">Jasa Administrasi & Unit Usaha</span>
              </div>
              <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
                📈
              </div>
            </div>

            <!-- 8. Expense (Beban Operasional) -->
            <div class="stat-card" style="--stat-accent: #ec4899;">
              <div class="stat-info">
                <span class="stat-label">Beban (Expense)</span>
                <span class="stat-value" style="color: #db2777; font-size: 1.45rem;">
                  -Rp ${totalExpense.toLocaleString('id-ID')}
                </span>
                <span class="stat-subtext">ATK, Utilitas & Operasional Kantor</span>
              </div>
              <div class="stat-icon" style="--stat-icon-bg: #fce7f3; --stat-icon-color: #db2777;">
                📉
              </div>
            </div>

            <!-- 9. Net Cash Movement (Surplus Kas Bersih) -->
            <div class="stat-card" style="--stat-accent: #8b5cf6;">
              <div class="stat-info">
                <span class="stat-label">Net Cash Movement</span>
                <span class="stat-value" style="color: ${cashFlowSummary.netSurplus >= 0 ? 'var(--success)' : 'var(--danger)'}; font-size: 1.45rem;">
                  Rp ${cashFlowSummary.netSurplus.toLocaleString('id-ID')}
                </span>
                <span class="stat-subtext">Inflow: +Rp ${(cashFlowSummary.totalInflow/1000000).toFixed(1)}M &bull; Outflow: -Rp ${(cashFlowSummary.totalOutflow/1000000).toFixed(1)}M</span>
              </div>
              <div class="stat-icon" style="--stat-icon-bg: var(--purple-light); --stat-icon-color: var(--purple);">
                ⚖️
              </div>
            </div>

          </div>
        </div>

        <!-- Section: Trend Transaksi Berdasarkan Periode (Visual Chart & Analysis) -->
        <div class="card" style="margin-bottom: 1.75rem; padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.85rem;">
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-primary); font-family: 'Outfit', sans-serif;">
                📊 Trend Transaksi & Pergerakan Kas Berdasarkan Periode
              </h3>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.775rem; color: var(--text-tertiary);">
                Visualisasi perbandingan kas masuk (Inflow) dan kas keluar (Outflow) per periode transaksi
              </p>
            </div>

            <!-- Period Filter Selector -->
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              <button class="btn btn-sm ${selectedPeriod === 'ALL' ? 'btn-primary' : 'btn-secondary'} period-filter-btn" data-period="ALL">
                Semua Periode
              </button>
              <button class="btn btn-sm ${selectedPeriod === 'THIS_MONTH' ? 'btn-primary' : 'btn-secondary'} period-filter-btn" data-period="THIS_MONTH">
                Bulan Ini
              </button>
              <button class="btn btn-sm ${selectedPeriod === 'LAST_3_MONTHS' ? 'btn-primary' : 'btn-secondary'} period-filter-btn" data-period="LAST_3_MONTHS">
                3 Bulan Terakhir
              </button>
              <button class="btn btn-sm ${selectedPeriod === 'THIS_YEAR' ? 'btn-primary' : 'btn-secondary'} period-filter-btn" data-period="THIS_YEAR">
                Tahun Ini
              </button>
            </div>
          </div>

          <!-- Visual Bar Trend Chart -->
          ${renderVisualTrendChart(monthlyTrend, cashFlowSummary)}

        </div>

        <!-- Section: Executive Overview of All Loan Portfolios (Read-Only) -->
        <div class="card" style="margin-bottom: 1.75rem;">
          <div class="card-header">
            <h3 class="card-title">
              <span>📋 Portofolio Pinjaman & Pengawasan Fasilitas Pembiayaan</span>
            </h3>
            <span class="badge badge-primary">
              ${allLoansData.length} Fasilitas Tercatat
            </span>
          </div>

          ${allLoansData.length > 0 ? `
            <div class="table-responsive">
              <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin: 0;">
                <thead>
                  <tr style="background: var(--bg-subtle); border-bottom: 2px solid var(--border-color); text-align: left;">
                    <th style="padding: 0.75rem 1rem;">No. Pinjaman</th>
                    <th style="padding: 0.75rem 1rem;">Peminjam</th>
                    <th style="padding: 0.75rem 1rem;">Pokok Pinjaman</th>
                    <th style="padding: 0.75rem 1rem;">Sisa Pokok</th>
                    <th style="padding: 0.75rem 1rem;">Tenor & Skema</th>
                    <th style="padding: 0.75rem 1rem;">Status Portofolio</th>
                  </tr>
                </thead>
                <tbody>
                  ${allLoansData.map(item => {
                    const l = item.loan;
                    const m = item.member;
                    return `
                      <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.75rem 1rem; font-family: monospace; font-weight: 700; color: var(--primary-700);">
                          ${l.loan_number}
                        </td>
                        <td style="padding: 0.75rem 1rem;">
                          <div style="font-weight: 700; color: var(--text-primary);">${m ? m.full_name : 'Anggota #' + l.member_id}</div>
                          <div style="font-size: 0.75rem; color: var(--text-tertiary);">${m ? `${m.member_type} &bull; ${m.identity_number}` : '-'}</div>
                        </td>
                        <td style="padding: 0.75rem 1rem; font-weight: 800; color: var(--text-primary);">
                          Rp ${l.principal_amount.toLocaleString('id-ID')}
                        </td>
                        <td style="padding: 0.75rem 1rem; font-weight: 800; color: ${l.remaining_principal > 0 ? 'var(--warning-dark)' : 'var(--success)'};">
                          Rp ${l.remaining_principal.toLocaleString('id-ID')}
                        </td>
                        <td style="padding: 0.75rem 1rem;">
                          <strong>${l.tenure} Bulan</strong>
                          <div style="font-size: 0.75rem; color: var(--text-secondary);">${l.interest_type} (${l.interest_rate}%)</div>
                        </td>
                        <td style="padding: 0.75rem 1rem;">
                          ${getChairmanStatusBadge(l.status)}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-tertiary); font-size: 0.85rem;">
              Belum ada data portofolio pinjaman yang tercatat.
            </div>
          `}
        </div>

        <!-- Section: Problematic / Overdue Loans Risk Oversight -->
        <div class="card" style="border: 1px solid var(--danger-border); margin-bottom: 1.75rem;">
          <div class="card-header" style="background: var(--danger-light); margin: -1.25rem -1.25rem 1.25rem -1.25rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--danger-border);">
            <h3 class="card-title" style="color: var(--danger-text);">
              <span>⚠️ Pengawasan Risiko Kredit Macet & Tagihan Overdue</span>
            </h3>
            <span class="badge badge-danger">${overdueList.length} Tagihan Menunggak</span>
          </div>

          ${overdueList.length > 0 ? `
            <div class="table-responsive">
              <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin: 0;">
                <thead>
                  <tr style="background: var(--bg-subtle); border-bottom: 2px solid var(--border-color); text-align: left;">
                    <th style="padding: 0.75rem 1rem;">No. Pinjaman</th>
                    <th style="padding: 0.75rem 1rem;">Peminjam</th>
                    <th style="padding: 0.75rem 1rem;">Jatuh Tempo</th>
                    <th style="padding: 0.75rem 1rem;">Sisa Tagihan</th>
                    <th style="padding: 0.75rem 1rem;">Status Risiko</th>
                  </tr>
                </thead>
                <tbody>
                  ${overdueList.map(item => {
                    const inst = item.installment;
                    const loan = item.loan;
                    const member = item.member;
                    return `
                      <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.75rem 1rem; font-family: monospace; font-weight: 700; color: var(--danger);">
                          ${loan ? loan.loan_number : inst.loan_id}
                        </td>
                        <td style="padding: 0.75rem 1rem;">
                          <strong>${member ? member.full_name : '-'}</strong>
                          <div style="font-size: 0.75rem; color: var(--text-tertiary);">${member ? `${member.member_type} &bull; ${member.phone || '-'}` : '-'}</div>
                        </td>
                        <td style="padding: 0.75rem 1rem; color: var(--danger); font-weight: 700;">
                          ${inst.due_date} (Angsuran Ke-${inst.installment_number})
                        </td>
                        <td style="padding: 0.75rem 1rem; font-weight: 800; color: var(--danger);">
                          Rp ${inst.getRemainingDue().toLocaleString('id-ID')}
                        </td>
                        <td style="padding: 0.75rem 1rem;">
                          <span class="badge badge-danger">PERLU TINDAKAN PENAGIHAN</span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="padding: 2.5rem 1rem; text-align: center; color: var(--success-text); font-size: 0.85rem;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">🌟</div>
              Kualitas portofolio pembiayaan prima! Tidak ada tagihan angsuran menunggak saat ini.
            </div>
          `}
        </div>

      </div>
    `;

    attachChairmanEvents();
  }

  function getChairmanStatusBadge(status) {
    switch (status) {
      case LOAN_STATUS.ACTIVE:
      case LOAN_STATUS.DISBURSED:
        return `<span class="badge badge-success">● AKTIF BERJALAN</span>`;
      case LOAN_STATUS.PAID_OFF:
        return `<span class="badge badge-purple" style="background: #e0e7ff; color: #4338ca;">★ LUNAS</span>`;
      case LOAN_STATUS.PENDING:
        return `<span class="badge badge-warning">⏳ REVIEW OPERASIONAL</span>`;
      case LOAN_STATUS.APPROVED:
        return `<span class="badge badge-primary">✓ SIAP PENCAIRAN</span>`;
      case LOAN_STATUS.REJECTED:
        return `<span class="badge badge-danger">✕ DITOLAK</span>`;
      case LOAN_STATUS.CANCELLED:
        return `<span class="badge badge-neutral">⊘ DIBATALKAN</span>`;
      default:
        return `<span class="badge badge-neutral">${status}</span>`;
    }
  }

  function renderVisualTrendChart(monthlyTrend, cashFlowSummary) {
    if (!monthlyTrend || monthlyTrend.length === 0) {
      return `
        <div style="padding: 2.5rem; text-align: center; color: var(--text-tertiary); font-size: 0.85rem;">
          Belum ada catatan mutasi transaksi pada rentang periode yang dipilih.
        </div>
      `;
    }

    // Find highest value for chart scaling
    let maxVal = 1;
    monthlyTrend.forEach(b => {
      if (b.inflow > maxVal) maxVal = b.inflow;
      if (b.outflow > maxVal) maxVal = b.outflow;
    });

    return `
      <div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; align-items: end; padding: 1rem 0; min-height: 180px;">
          ${monthlyTrend.map(b => {
            const inPct = Math.round((b.inflow / maxVal) * 100);
            const outPct = Math.round((b.outflow / maxVal) * 100);

            return `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                
                <div style="height: 140px; display: flex; align-items: flex-end; gap: 0.5rem; width: 100%; justify-content: center; background: var(--bg-subtle); padding: 0.5rem; border-radius: var(--radius-md);">
                  <!-- Inflow Bar -->
                  <div style="width: 24px; height: ${Math.max(8, inPct)}%; background: linear-gradient(180deg, #10b981, #059669); border-radius: 4px 4px 0 0; transition: height 0.4s; position: relative;" title="Kas Masuk (${b.label}): Rp ${b.inflow.toLocaleString('id-ID')}"></div>
                  <!-- Outflow Bar -->
                  <div style="width: 24px; height: ${Math.max(8, outPct)}%; background: linear-gradient(180deg, #ef4444, #dc2626); border-radius: 4px 4px 0 0; transition: height 0.4s; position: relative;" title="Kas Keluar (${b.label}): Rp ${b.outflow.toLocaleString('id-ID')}"></div>
                </div>

                <div style="text-align: center;">
                  <div style="font-weight: 700; font-size: 0.775rem; color: var(--text-primary);">${b.label}</div>
                  <div style="font-size: 0.675rem; color: var(--success); font-weight: 600;">+Rp ${(b.inflow/1000000).toFixed(1)}M</div>
                  <div style="font-size: 0.675rem; color: var(--danger); font-weight: 600;">-Rp ${(b.outflow/1000000).toFixed(1)}M</div>
                </div>

              </div>
            `;
          }).join('')}
        </div>

        <!-- Legend & Quick Summary -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; background: var(--bg-subtle); padding: 0.85rem 1.25rem; border-radius: var(--radius-md); font-size: 0.8rem;">
          <div style="display: flex; gap: 1.25rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span style="width: 12px; height: 12px; background: #10b981; border-radius: 2px; display: inline-block;"></span>
              <span>Kas Masuk (Simpanan, Angsuran, Pendapatan)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span style="width: 12px; height: 12px; background: #ef4444; border-radius: 2px; display: inline-block;"></span>
              <span>Kas Keluar (Penyaluran Pinjaman, Penarikan, Beban)</span>
            </div>
          </div>
          <div>
            <strong>Surplus Kas Bersih Periode:</strong> <span style="font-weight: 800; color: ${cashFlowSummary.netSurplus >= 0 ? 'var(--success)' : 'var(--danger)'};">Rp ${cashFlowSummary.netSurplus.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>
    `;
  }

  function buildMonthlyTrendData(transactions) {
    const buckets = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    transactions.forEach(t => {
      const d = new Date(t.transaction_date);
      if (isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

      if (!buckets[key]) {
        buckets[key] = { key, label, inflow: 0, outflow: 0, count: 0 };
      }

      const amt = Number(t.amount || 0);
      if (t.flow === 'IN') {
        buckets[key].inflow += amt;
      } else {
        buckets[key].outflow += amt;
      }
      buckets[key].count++;
    });

    const sortedKeys = Object.keys(buckets).sort();
    return sortedKeys.map(k => buckets[k]);
  }

  function attachChairmanEvents() {
    // Period filter buttons
    container.querySelectorAll('.period-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedPeriod = btn.dataset.period;
        startDate = '';
        endDate = '';
        render();
      });
    });
  }

  await render();
}
