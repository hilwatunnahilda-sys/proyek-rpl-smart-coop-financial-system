/**
 * Reports & Financial Statement View
 * Provides 8 Official Cooperative Reports:
 * 1. Laporan Anggota
 * 2. Laporan Simpanan
 * 3. Laporan Pinjaman
 * 4. Laporan Angsuran
 * 5. Laporan Transaksi
 * 6. Laporan Pendapatan
 * 7. Laporan Pengeluaran
 * 8. Ringkasan Pemasukan dan Pengeluaran (Surplus / Cash Flow)
 * Features: Live DB Aggregation, Date/Member/Type Filters, Search, Pagination,
 * Excel/CSV Export, and Official PDF Print Views with Kop Surat
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { ReportService } from '../../core/services/ReportService.js';
import { ExportService } from '../../core/services/ExportService.js';
import { MemberService } from '../../core/services/MemberService.js';
import { auth } from '../../infrastructure/auth/authService.js';
import { requireAuthorization, enforceMemberDataIsolation } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { ROLES, MEMBER_TYPES, LOAN_STATUS, INSTALLMENT_STATUS, FINANCIAL_TRANSACTION_TYPES, SAVING_TYPES } from '../../config/constants.js';

export async function renderReportsView(container, { user }) {
  requireAuthorization(user, [ROLES.ADMIN, ROLES.CHAIRMAN], 'report.read');

  const reportService = new ReportService();
  const memberService = new MemberService();
  const isMember = false; // Internal reports are restricted to ADMIN & CHAIRMAN
  const loggedMember = auth.getMember();

  if (isMember && loggedMember) {
    enforceMemberDataIsolation(user, loggedMember.user_id);
  }

  const memberIdScope = isMember && loggedMember ? loggedMember.id : '';

  // Tab State
  let activeTab = isMember ? 'savings' : 'summary'; // default tab
  let startDate = '';
  let endDate = '';
  let selectedMemberId = memberIdScope;
  let selectedStatus = '';
  let selectedType = '';
  let searchQuery = '';
  let currentPage = 1;
  const pageLimit = 10;

  // Members list for dropdown filter
  const allMembers = isMember ? (loggedMember ? [loggedMember] : []) : await memberService.getAll();

  async function render() {
    let reportData = null;
    let title = '';
    let subtitle = '';
    let columns = [];
    let summaryCards = [];
    let csvFilename = '';

    const filterParams = {
      startDate: startDate || null,
      endDate: endDate || null,
      memberId: selectedMemberId || null,
      status: selectedStatus || null,
      savingType: selectedType || null,
      transactionType: selectedType || null,
      interestType: selectedType || null,
      category: selectedType || null,
      search: searchQuery || null,
      page: currentPage,
      limit: pageLimit
    };

    switch (activeTab) {
      case 'members':
        title = 'Laporan Data Keanggotaan Koperasi';
        subtitle = `Status: ${selectedStatus || 'Semua'} | Periode: ${startDate || 'Awal'} s.d ${endDate || 'Sekarang'}`;
        csvFilename = 'laporan_anggota_ikmi';
        reportData = await reportService.getMembersReport(filterParams);
        columns = [
          { key: 'member_number', label: 'No. Anggota' },
          { key: 'full_name', label: 'Nama Lengkap' },
          { key: 'identity_number', label: 'Identitas (NIDN/NIM/NIP)' },
          { key: 'member_type', label: 'Kategori' },
          { key: 'phone', label: 'No. Telepon' },
          { key: 'join_date', label: 'Tgl Bergabung' },
          { key: 'status', label: 'Status' }
        ];
        summaryCards = [
          { label: 'Total Anggota', value: `${reportData.summary.totalMembers} Orang` },
          { label: 'Anggota Aktif', value: `${reportData.summary.totalActive} Orang` },
          { label: 'Dosen / Staf / Mhs', value: `${reportData.summary.totalDosen} / ${reportData.summary.totalStaf} / ${reportData.summary.totalMahasiswa}` }
        ];
        break;

      case 'savings':
        title = 'Laporan Rekapitulasi Simpanan Koperasi';
        subtitle = `Periode: ${startDate || 'Awal'} s.d ${endDate || 'Sekarang'}`;
        csvFilename = 'laporan_simpanan_ikmi';
        reportData = await reportService.getSavingsReport(filterParams);
        columns = [
          { key: 'id', label: 'No. Transaksi' },
          { key: 'member_number', label: 'No. Anggota' },
          { key: 'member_name', label: 'Nama Anggota' },
          { key: 'saving_type', label: 'Jenis Simpanan' },
          { key: 'transaction_type', label: 'Mutasi' },
          { key: 'amount_formatted', label: 'Nominal (Rp)', align: 'right' },
          { key: 'created_at_formatted', label: 'Waktu Transaksi' }
        ];
        summaryCards = [
          { label: 'Total Saldo Simpanan', value: `Rp ${reportData.summary.netSavingsBalance.toLocaleString('id-ID')}` },
          { label: 'Total Setoran', value: `+Rp ${reportData.summary.totalDeposit.toLocaleString('id-ID')}` },
          { label: 'Total Penarikan', value: `-Rp ${reportData.summary.totalWithdrawal.toLocaleString('id-ID')}` },
          { label: 'Pokok / Wajib / Sukarela', value: `Rp ${(reportData.summary.totalPokok/1000000).toFixed(1)}M / ${(reportData.summary.totalWajib/1000000).toFixed(1)}M / ${(reportData.summary.totalSukarela/1000000).toFixed(1)}M` }
        ];
        break;

      case 'loans':
        title = 'Laporan Penyaluran & Portofolio Pinjaman';
        subtitle = `Status: ${selectedStatus || 'Semua'} | Periode: ${startDate || 'Awal'} s.d ${endDate || 'Sekarang'}`;
        csvFilename = 'laporan_pinjaman_ikmi';
        reportData = await reportService.getLoansReport(filterParams);
        columns = [
          { key: 'loan_number', label: 'No. Pinjaman' },
          { key: 'member_name', label: 'Nama Peminjam' },
          { key: 'principal_formatted', label: 'Pokok Pinjaman (Rp)', align: 'right' },
          { key: 'tenure_info', label: 'Tenor & Skema' },
          { key: 'total_repayment_formatted', label: 'Total Tagihan (Rp)', align: 'right' },
          { key: 'paid_amount_formatted', label: 'Telah Dibayar (Rp)', align: 'right' },
          { key: 'remaining_formatted', label: 'Sisa Pokok (Rp)', align: 'right' },
          { key: 'status', label: 'Status' }
        ];
        summaryCards = [
          { label: 'Total Dana Disalurkan', value: `Rp ${reportData.summary.totalPrincipalDisbursed.toLocaleString('id-ID')}` },
          { label: 'Sisa Pokok Aktif', value: `Rp ${reportData.summary.totalOutstandingPrincipal.toLocaleString('id-ID')}` },
          { label: 'Total Pengembalian', value: `Rp ${reportData.summary.totalRepaymentsCollected.toLocaleString('id-ID')}` },
          { label: 'Pinjaman Aktif / Lunas', value: `${reportData.summary.activeLoansCount} Aktif / ${reportData.summary.paidOffLoansCount} Lunas` }
        ];
        break;

      case 'installments':
        title = 'Laporan Realisasi & Tagihan Angsuran Pinjaman';
        subtitle = `Status: ${selectedStatus || 'Semua'} | Periode: ${startDate || 'Awal'} s.d ${endDate || 'Sekarang'}`;
        csvFilename = 'laporan_angsuran_ikmi';
        reportData = await reportService.getInstallmentsReport(filterParams);
        columns = [
          { key: 'loan_number', label: 'No. Pinjaman' },
          { key: 'member_name', label: 'Peminjam' },
          { key: 'installment_number_label', label: 'Angsuran Ke' },
          { key: 'due_date', label: 'Jatuh Tempo' },
          { key: 'principal_formatted', label: 'Pokok (Rp)', align: 'right' },
          { key: 'interest_formatted', label: 'Bunga/Jasa (Rp)', align: 'right' },
          { key: 'total_due_formatted', label: 'Total Tagihan (Rp)', align: 'right' },
          { key: 'paid_amount_formatted', label: 'Terbayar (Rp)', align: 'right' },
          { key: 'status', label: 'Status' }
        ];
        summaryCards = [
          { label: 'Total Tagihan Angsuran', value: `Rp ${reportData.summary.totalDueSum.toLocaleString('id-ID')}` },
          { label: 'Total Angsuran Diterima', value: `Rp ${reportData.summary.totalPaidSum.toLocaleString('id-ID')}` },
          { label: 'Total Tunggakan (Overdue)', value: `Rp ${reportData.summary.totalOverdueSum.toLocaleString('id-ID')}` },
          { label: 'Lunas / Overdue', value: `${reportData.summary.paidCount} Lunas / ${reportData.summary.overdueCount} Overdue` }
        ];
        break;

      case 'transactions':
        title = 'Laporan Mutasi Transaksi Buku Kas Umum';
        subtitle = `Periode: ${startDate || 'Awal'} s.d ${endDate || 'Sekarang'}`;
        csvFilename = 'laporan_transaksi_buku_kas';
        reportData = await reportService.getTransactionsReport(filterParams);
        columns = [
          { key: 'transaction_number', label: 'No. Transaksi' },
          { key: 'transaction_date_formatted', label: 'Tanggal & Waktu' },
          { key: 'transaction_type', label: 'Jenis' },
          { key: 'category', label: 'Kategori' },
          { key: 'description', label: 'Deskripsi' },
          { key: 'flow', label: 'Arus' },
          { key: 'amount_formatted', label: 'Nominal (Rp)', align: 'right' }
        ];
        summaryCards = [
          { label: 'Total Kas Masuk (IN)', value: `+Rp ${reportData.summary.totalInflow.toLocaleString('id-ID')}` },
          { label: 'Total Kas Keluar (OUT)', value: `-Rp ${reportData.summary.totalOutflow.toLocaleString('id-ID')}` },
          { label: 'Saldo Kas Bersih', value: `Rp ${reportData.summary.netBalance.toLocaleString('id-ID')}` }
        ];
        break;

      case 'income':
        title = 'Laporan Pemasukan & Pendapatan Operasional';
        subtitle = `Kategori: ${selectedType || 'Semua'} | Periode: ${startDate || 'Awal'} s.d ${endDate || 'Sekarang'}`;
        csvFilename = 'laporan_pendapatan_operasional';
        reportData = await reportService.getIncomeReport(filterParams);
        columns = [
          { key: 'transaction_number', label: 'No. Transaksi' },
          { key: 'transaction_date_formatted', label: 'Tanggal' },
          { key: 'category', label: 'Kategori Pendapatan' },
          { key: 'description', label: 'Keterangan' },
          { key: 'amount_formatted', label: 'Nominal (Rp)', align: 'right' },
          { key: 'created_by_name', label: 'Dicatat Oleh' }
        ];
        summaryCards = [
          { label: 'Total Pendapatan Operasional', value: `Rp ${reportData.summary.totalIncome.toLocaleString('id-ID')}` },
          { label: 'Jumlah Transaksi', value: `${reportData.summary.totalTransactions} Catatan` }
        ];
        break;

      case 'expense':
        title = 'Laporan Beban & Pengeluaran Operasional';
        subtitle = `Kategori: ${selectedType || 'Semua'} | Periode: ${startDate || 'Awal'} s.d ${endDate || 'Sekarang'}`;
        csvFilename = 'laporan_beban_operasional';
        reportData = await reportService.getExpenseReport(filterParams);
        columns = [
          { key: 'transaction_number', label: 'No. Transaksi' },
          { key: 'transaction_date_formatted', label: 'Tanggal' },
          { key: 'category', label: 'Kategori Beban' },
          { key: 'description', label: 'Keterangan' },
          { key: 'amount_formatted', label: 'Nominal (Rp)', align: 'right' },
          { key: 'created_by_name', label: 'Dicatat Oleh' }
        ];
        summaryCards = [
          { label: 'Total Beban Operasional', value: `Rp ${reportData.summary.totalExpense.toLocaleString('id-ID')}` },
          { label: 'Jumlah Transaksi', value: `${reportData.summary.totalTransactions} Catatan` }
        ];
        break;

      case 'summary':
      default:
        title = 'Laporan Ringkasan Arus Kas & Surplus Operasional';
        subtitle = `Periode: ${startDate || 'Awal Berdiri'} s.d ${endDate || 'Saat Ini'}`;
        csvFilename = 'laporan_ringkasan_arus_kas_surplus';
        reportData = await reportService.getCashFlowSummaryReport({ startDate, endDate });
        summaryCards = [
          { label: 'Total Pemasukan (Inflow)', value: `+Rp ${reportData.totalInflow.toLocaleString('id-ID')}` },
          { label: 'Total Pengeluaran (Outflow)', value: `-Rp ${reportData.totalOutflow.toLocaleString('id-ID')}` },
          { label: 'Surplus Kas Bersih (Net)', value: `Rp ${reportData.netSurplus.toLocaleString('id-ID')}` }
        ];
        break;
    }

    // Format rows for table presentation and CSV export
    let formattedRows = [];
    if (reportData && reportData.items) {
      formattedRows = reportData.items.map(row => {
        return {
          ...row,
          amount_formatted: row.amount ? `Rp ${Number(row.amount).toLocaleString('id-ID')}` : '-',
          principal_formatted: row.principal_amount ? `Rp ${Number(row.principal_amount).toLocaleString('id-ID')}` : (row.principal ? `Rp ${Number(row.principal).toLocaleString('id-ID')}` : '-'),
          interest_formatted: row.interest ? `Rp ${Number(row.interest).toLocaleString('id-ID')}` : '-',
          total_due_formatted: row.total_due ? `Rp ${Number(row.total_due).toLocaleString('id-ID')}` : '-',
          total_repayment_formatted: row.total_repayment ? `Rp ${Number(row.total_repayment).toLocaleString('id-ID')}` : '-',
          paid_amount_formatted: row.paid_amount !== undefined ? `Rp ${Number(row.paid_amount).toLocaleString('id-ID')}` : '-',
          remaining_formatted: row.remaining_principal !== undefined ? `Rp ${Number(row.remaining_principal).toLocaleString('id-ID')}` : '-',
          created_at_formatted: row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID') : '-',
          transaction_date_formatted: row.transaction_date ? new Date(row.transaction_date).toLocaleDateString('id-ID') : '-',
          tenure_info: row.tenure ? `${row.tenure} Bln (${row.interest_type})` : '-',
          installment_number_label: row.installment_number ? `Ke-${row.installment_number}` : '-'
        };
      });
    }

    container.innerHTML = `
      <div class="animate-fade-in" style="padding-bottom: 3rem;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #0A2540 0%, #1e40af 50%, #065f46 100%); border-radius: var(--radius-xl); padding: 2rem; color: #fff; margin-bottom: 1.75rem; box-shadow: var(--shadow-lg); position: relative; overflow: hidden;">
          <div style="position: absolute; right: -20px; bottom: -20px; opacity: 0.08; font-size: 11rem; font-weight: 900; pointer-events: none;">REPORTS</div>
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); padding: 0.3rem 0.85rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #a7f3d0; margin-bottom: 0.75rem;">
            <span>📊 PUSAT LAPORAN KEUANGAN RESMI</span>
            <span style="opacity: 0.5;">&bull;</span>
            <span>STMIK IKMI CIREBON</span>
          </div>
          <h2 style="font-size: 1.75rem; color: #fff; margin-bottom: 0.4rem; font-family: 'Outfit', sans-serif;">
            Laporan Keuangan & Rekapitulasi Koperasi
          </h2>
          <p style="font-size: 0.875rem; color: rgba(255,255,255,0.9); max-width: 820px; line-height: 1.6;">
            Seluruh data dan angka laporan dihitung langsung dari basis data transaksi riil koperasi. Dilengkapi ekspor CSV/Excel berstandar UTF-8 dan cetak PDF resmi ber-kop surat STMIK IKMI.
          </p>
        </div>

        <!-- 8 Reports Navigation Tabs -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 0.75rem 1rem;">
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            
            ${!isMember ? `
              <button class="btn btn-sm ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'} report-tab" data-tab="summary">
                📊 Ringkasan Arus Kas
              </button>
              <button class="btn btn-sm ${activeTab === 'members' ? 'btn-primary' : 'btn-secondary'} report-tab" data-tab="members">
                👥 Anggota
              </button>
            ` : ''}

            <button class="btn btn-sm ${activeTab === 'savings' ? 'btn-primary' : 'btn-secondary'} report-tab" data-tab="savings">
              💰 Simpanan
            </button>
            <button class="btn btn-sm ${activeTab === 'loans' ? 'btn-primary' : 'btn-secondary'} report-tab" data-tab="loans">
              💳 Pinjaman
            </button>
            <button class="btn btn-sm ${activeTab === 'installments' ? 'btn-primary' : 'btn-secondary'} report-tab" data-tab="installments">
              📅 Angsuran
            </button>
            <button class="btn btn-sm ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'} report-tab" data-tab="transactions">
              📒 Transaksi Buku Kas
            </button>

            ${!isMember ? `
              <button class="btn btn-sm ${activeTab === 'income' ? 'btn-primary' : 'btn-secondary'} report-tab" data-tab="income">
                📈 Pendapatan
              </button>
              <button class="btn btn-sm ${activeTab === 'expense' ? 'btn-primary' : 'btn-secondary'} report-tab" data-tab="expense">
                📉 Pengeluaran
              </button>
            ` : ''}

          </div>
        </div>

        <!-- Dynamic Filter Controls & Action Bar -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-primary);">${title}</h3>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.775rem; color: var(--text-tertiary);">${subtitle}</p>
            </div>

            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-sm btn-success" id="btn-export-csv">
                📥 Unduh CSV / Excel
              </button>
              <button class="btn btn-sm btn-primary" id="btn-print-pdf">
                🖨️ Cetak / PDF
              </button>
            </div>
          </div>

          <!-- Filters Form -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; align-items: end;">
            
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.75rem;">Dari Tanggal</label>
              <input type="date" id="rep-start-date" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;" value="${startDate}" />
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.75rem;">Sampai Tanggal</label>
              <input type="date" id="rep-end-date" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;" value="${endDate}" />
            </div>

            ${!isMember ? `
              <div class="form-group" style="margin: 0;">
                <label class="form-label" style="font-size: 0.75rem;">Filter Anggota</label>
                <select id="rep-member-id" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;">
                  <option value="">Semua Anggota</option>
                  ${allMembers.map(m => `
                    <option value="${m.id}" ${selectedMemberId === m.id ? 'selected' : ''}>${m.full_name} (${m.member_number})</option>
                  `).join('')}
                </select>
              </div>
            ` : ''}

            ${activeTab !== 'summary' ? `
              <div class="form-group" style="margin: 0;">
                <label class="form-label" style="font-size: 0.75rem;">Cari Kata Kunci</label>
                <input type="text" id="rep-search" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;" placeholder="Cari data..." value="${searchQuery}" />
              </div>
            ` : ''}

            <div>
              <button class="btn btn-sm btn-secondary" id="rep-btn-reset" style="width: 100%;">
                ↺ Reset Filter
              </button>
            </div>

          </div>
        </div>

        <!-- Summary KPI Cards -->
        <div class="stats-grid" style="margin-bottom: 1.5rem;">
          ${summaryCards.map((c, idx) => `
            <div class="stat-card" style="--stat-accent: ${idx === 0 ? '#10b981' : (idx === 1 ? '#3b82f6' : '#8b5cf6')};">
              <div class="stat-info">
                <span class="stat-label">${c.label}</span>
                <span class="stat-value" style="font-size: 1.35rem; color: var(--text-primary);">${c.value}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Tab 8 Special: Cash Flow & Surplus Summary Layout -->
        ${activeTab === 'summary' ? renderCashFlowSummaryTab(reportData) : renderTableReport(columns, formattedRows, reportData)}

      </div>
    `;

    attachReportEvents({ title, subtitle, summaryCards, columns, formattedRows, csvFilename, reportData });
  }

  function renderTableReport(columns, rows, reportData) {
    const totalPages = reportData ? reportData.totalPages : 1;
    const total = reportData ? reportData.total : 0;

    return `
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive">
          <table class="table" style="margin: 0; width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="background: var(--bg-subtle); border-bottom: 2px solid var(--border-color); text-align: left;">
                <th style="padding: 0.75rem 1rem; width: 45px;">No.</th>
                ${columns.map(c => `<th style="padding: 0.75rem 1rem; text-align: ${c.align || 'left'};">${c.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.length > 0 ? rows.map((row, idx) => `
                <tr style="border-bottom: 1px solid var(--border-color);" class="table-row-hover">
                  <td style="padding: 0.75rem 1rem; color: var(--text-tertiary);">${((currentPage - 1) * pageLimit) + idx + 1}</td>
                  ${columns.map(c => `
                    <td style="padding: 0.75rem 1rem; text-align: ${c.align || 'left'};">
                      ${row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : '-'}
                    </td>
                  `).join('')}
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="${columns.length + 1}" style="padding: 3rem 1rem; text-align: center; color: var(--text-tertiary);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📭</div>
                    Tidak ada catatan data pada laporan ini untuk periode yang dipilih.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        ${totalPages > 1 ? `
          <div style="padding: 0.85rem 1.25rem; background: var(--bg-subtle); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
            <div>Menampilkan halaman <strong>${currentPage}</strong> dari <strong>${totalPages}</strong> (${total} total baris)</div>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-sm btn-secondary rep-page-prev" ${currentPage <= 1 ? 'disabled' : ''}>
                ◀ Sebelumnya
              </button>
              <button class="btn btn-sm btn-secondary rep-page-next" ${currentPage >= totalPages ? 'disabled' : ''}>
                Berikutnya ▶
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderCashFlowSummaryTab(reportData) {
    const { totalInflow, totalOutflow, netSurplus, breakdownInflow, breakdownOutflow, accountingStandardNotice } = reportData;

    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
        
        <!-- Inflow Breakdown Card -->
        <div class="card" style="border-top: 4px solid var(--success);">
          <div class="card-header">
            <h3 class="card-title" style="color: var(--success); font-size: 1.1rem;">
              <span>📈 Rincian Pemasukan Kas (Inflow)</span>
            </h3>
            <span class="badge badge-success">+Rp ${totalInflow.toLocaleString('id-ID')}</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.85rem;">
            ${Object.values(breakdownInflow).map(b => `
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.4rem;">
                <div>
                  <div style="font-weight: 600; color: var(--text-primary);">${b.label}</div>
                  <div style="font-size: 0.725rem; color: var(--text-tertiary);">${b.count} Catatan Transaksi</div>
                </div>
                <strong style="color: var(--success);">+Rp ${b.amount.toLocaleString('id-ID')}</strong>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Outflow Breakdown Card -->
        <div class="card" style="border-top: 4px solid var(--danger);">
          <div class="card-header">
            <h3 class="card-title" style="color: var(--danger); font-size: 1.1rem;">
              <span>📉 Rincian Pengeluaran Kas (Outflow)</span>
            </h3>
            <span class="badge badge-danger">-Rp ${totalOutflow.toLocaleString('id-ID')}</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.85rem;">
            ${Object.values(breakdownOutflow).map(b => `
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.4rem;">
                <div>
                  <div style="font-weight: 600; color: var(--text-primary);">${b.label}</div>
                  <div style="font-size: 0.725rem; color: var(--text-tertiary);">${b.count} Catatan Transaksi</div>
                </div>
                <strong style="color: var(--danger);">-Rp ${b.amount.toLocaleString('id-ID')}</strong>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <!-- Accounting Standard Notice & Net Surplus Card -->
      <div class="card" style="background: var(--bg-subtle); border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-tertiary);">HASIL BERSIH KAS (NET OPERATIONAL SURPLUS)</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: ${netSurplus >= 0 ? 'var(--success)' : 'var(--danger)'};">
              Rp ${netSurplus.toLocaleString('id-ID')}
            </div>
          </div>
          <div style="max-width: 500px; font-size: 0.775rem; color: var(--text-secondary); line-height: 1.5; background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            ℹ️ <strong>Standar Koperasi:</strong> ${accountingStandardNotice}
          </div>
        </div>
      </div>
    `;
  }

  function attachReportEvents({ title, subtitle, summaryCards, columns, formattedRows, csvFilename, reportData }) {
    // Tab switching
    container.querySelectorAll('.report-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        currentPage = 1;
        searchQuery = '';
        render();
      });
    });

    // Date filters
    const startInput = container.querySelector('#rep-start-date');
    if (startInput) {
      startInput.addEventListener('change', (e) => {
        startDate = e.target.value;
        currentPage = 1;
        render();
      });
    }

    const endInput = container.querySelector('#rep-end-date');
    if (endInput) {
      endInput.addEventListener('change', (e) => {
        endDate = e.target.value;
        currentPage = 1;
        render();
      });
    }

    // Member dropdown filter
    const memberSelect = container.querySelector('#rep-member-id');
    if (memberSelect) {
      memberSelect.addEventListener('change', (e) => {
        selectedMemberId = e.target.value;
        currentPage = 1;
        render();
      });
    }

    // Search input
    const searchInput = container.querySelector('#rep-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        render();
      });
    }

    // Reset button
    const resetBtn = container.querySelector('#rep-btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        startDate = '';
        endDate = '';
        selectedMemberId = memberIdScope;
        selectedStatus = '';
        selectedType = '';
        searchQuery = '';
        currentPage = 1;
        render();
      });
    }

    // Pagination
    const prevBtn = container.querySelector('.rep-page-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          render();
        }
      });
    }

    const nextBtn = container.querySelector('.rep-page-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentPage++;
        render();
      });
    }

    // Export CSV Button
    const exportCsvBtn = container.querySelector('#btn-export-csv');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        if (activeTab === 'summary') {
          // Special export for summary
          const summaryRows = [
            ...Object.values(reportData.breakdownInflow).map(b => ({ kategori: 'Pemasukan', item: b.label, count: b.count, nominal: b.amount })),
            ...Object.values(reportData.breakdownOutflow).map(b => ({ kategori: 'Pengeluaran', item: b.label, count: b.count, nominal: b.amount })),
            { kategori: 'HASIL BERSIH', item: 'Surplus Kas Bersih', count: reportData.totalTransactions, nominal: reportData.netSurplus }
          ];
          ExportService.exportToCSV(csvFilename, [
            { key: 'kategori', label: 'Tipe' },
            { key: 'item', label: 'Rincian Arus Kas' },
            { key: 'count', label: 'Jumlah Transaksi' },
            { key: 'nominal', label: 'Nominal (Rp)' }
          ], summaryRows);
        } else {
          ExportService.exportToCSV(csvFilename, columns, formattedRows);
        }
      });
    }

    // Print PDF Button
    const printPdfBtn = container.querySelector('#btn-print-pdf');
    if (printPdfBtn) {
      printPdfBtn.addEventListener('click', () => {
        if (activeTab === 'summary') {
          const summaryPrintRows = [
            ...Object.values(reportData.breakdownInflow).map(b => ({ item: b.label, count: `${b.count} trx`, nominal: `+Rp ${b.amount.toLocaleString('id-ID')}` })),
            ...Object.values(reportData.breakdownOutflow).map(b => ({ item: b.label, count: `${b.count} trx`, nominal: `-Rp ${b.amount.toLocaleString('id-ID')}` })),
            { item: 'SURPLUS KAS BERSIH', count: `${reportData.totalTransactions} trx`, nominal: `Rp ${reportData.netSurplus.toLocaleString('id-ID')}` }
          ];
          ExportService.printReport({
            title,
            subtitle,
            summaryCards,
            columns: [
              { key: 'item', label: 'Rincian Pos Arus Kas' },
              { key: 'count', label: 'Frekuensi Mutasi' },
              { key: 'nominal', label: 'Nominal (Rp)', align: 'right' }
            ],
            rows: summaryPrintRows
          });
        } else {
          ExportService.printReport({
            title,
            subtitle,
            summaryCards,
            columns,
            rows: formattedRows
          });
        }
      });
    }
  }

  // Initial render
  await render();
}
