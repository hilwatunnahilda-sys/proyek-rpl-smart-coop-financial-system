// Dashboard View (Customized for Admin, Ketua STMIK, and Anggota)
import { store } from '../store.js';
import { auth } from '../auth.js';
import { formatRupiah, formatDate, getStatusBadge, getMemberTypeBadge } from '../utils/formatters.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

let activeCharts = [];

function destroyCharts() {
  activeCharts.forEach(c => {
    if (c) c.destroy();
  });
  activeCharts = [];
}

export function renderDashboardView(container, navigateTo) {
  destroyCharts();

  const user = auth.getUser();
  const isAdmin = auth.isAdmin();
  const isKetua = auth.isKetua();
  const isAnggota = auth.isAnggota();

  if (isAdmin) {
    renderAdminDashboard(container, navigateTo);
  } else if (isKetua) {
    renderKetuaDashboard(container, navigateTo);
  } else {
    renderAnggotaDashboard(container, user, navigateTo);
  }
}

// ----------------------------------------------------
// 1. ADMIN DASHBOARD
// ----------------------------------------------------
function renderAdminDashboard(container, navigateTo) {
  const totalMembers = store.data.members.filter(m => m.status === 'aktif').length;
  const totalCash = store.getTotalCashBalance();
  const savingsBreakdown = store.getSavingsBreakdown();
  const activeLoansPrincipal = store.getActiveLoansPrincipal();
  const totalDisbursed = store.getTotalDisbursedLoans();
  const pendingLoans = store.data.loans.filter(l => l.status === 'pending');
  const recentTxs = [...store.data.transactions].slice(-6).reverse();

  container.innerHTML = `
    <div class="animate-fade-in">
      
      <!-- Welcome Banner -->
      <div style="background: linear-gradient(135deg, #0A2540 0%, #1e3a8a 100%); border-radius: var(--radius-xl); padding: 1.75rem; color: #fff; margin-bottom: 1.75rem; display: flex; align-items: center; justify-content: space-between; box-shadow: var(--shadow-md);">
        <div>
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(59, 130, 246, 0.25); padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #93c5fd; margin-bottom: 0.6rem;">
            <span>🛡️ PANEL ADMINISTRATOR KOPERASI</span>
          </div>
          <h2 style="font-size: 1.6rem; color: #fff; margin-bottom: 0.35rem;">Selamat Datang di Smart Co-op IKMI</h2>
          <p style="font-size: 0.875rem; color: rgba(255,255,255,0.8); max-width: 650px;">
            Sistem Informasi Pengelolaan Keuangan, Keanggotaan, Simpan Pinjam, dan Buku Kas Koperasi STMIK IKMI Cirebon.
          </p>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm quick-action-btn" data-target="savings" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); backdrop-filter: blur(8px);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
            Catat Simpanan
          </button>
          <button class="btn btn-success btn-sm quick-action-btn" data-target="loans">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Pengajuan Pinjaman
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        
        <div class="stat-card" style="--stat-accent: #3b82f6;">
          <div class="stat-info">
            <span class="stat-label">Total Anggota Aktif</span>
            <span class="stat-value">${totalMembers} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-tertiary);">Orang</span></span>
            <span class="stat-subtext" style="color: var(--success-text);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              Dosen, Staf & Mahasiswa
            </span>
          </div>
          <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
        </div>

        <div class="stat-card" style="--stat-accent: #10b981;">
          <div class="stat-info">
            <span class="stat-label">Saldo Kas & Bank</span>
            <span class="stat-value" style="color: var(--success);">${formatRupiah(totalCash)}</span>
            <span class="stat-subtext">
              <span class="badge badge-success" style="font-size: 0.65rem;">Likuiditas Baik</span>
            </span>
          </div>
          <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
          </div>
        </div>

        <div class="stat-card" style="--stat-accent: #8b5cf6;">
          <div class="stat-info">
            <span class="stat-label">Total Dana Simpanan</span>
            <span class="stat-value">${formatRupiah(savingsBreakdown.total)}</span>
            <span class="stat-subtext" style="color: var(--purple-text);">
              Pokok + Wajib + Sukarela
            </span>
          </div>
          <div class="stat-icon" style="--stat-icon-bg: var(--purple-light); --stat-icon-color: var(--purple);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          </div>
        </div>

        <div class="stat-card" style="--stat-accent: #f59e0b;">
          <div class="stat-info">
            <span class="stat-label">Pinjaman Berjalan</span>
            <span class="stat-value">${formatRupiah(activeLoansPrincipal)}</span>
            <span class="stat-subtext">
              ${pendingLoans.length > 0 ? `<span class="badge badge-warning" style="font-size: 0.65rem;">${pendingLoans.length} Pengajuan Pending</span>` : 'Semua diproses'}
            </span>
          </div>
          <div class="stat-icon" style="--stat-icon-bg: var(--warning-light); --stat-icon-color: var(--warning-dark);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
        </div>

      </div>

      <!-- Pending Approval Notification if any -->
      ${pendingLoans.length > 0 ? `
        <div class="card" style="margin-bottom: 1.75rem; border-left: 4px solid var(--warning); background: var(--bg-surface);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--warning-light); color: var(--warning-dark); display: flex; align-items: center; justify-content: center;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <div>
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Terdapat ${pendingLoans.length} Pengajuan Pinjaman Baru yang Memerlukan Verifikasi</h4>
                <p style="font-size: 0.8rem; color: var(--text-tertiary);">Mohon verifikasi kelayakan dokumen dan plafon sebelum persetujuan dan pencairan dana.</p>
              </div>
            </div>
            <button class="btn btn-warning btn-sm quick-action-btn" data-target="loans">
              Tinjau Pengajuan Sekarang &rarr;
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Visual Charts Section -->
      <div style="display: grid; grid-template-columns: 2fr 1.2fr; gap: 1.5rem; margin-bottom: 1.75rem;">
        
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                Arus Kas Koperasi (Pemasukan vs Pengeluaran)
              </h3>
              <p class="card-subtitle">Perbandingan arus kas masuk & keluar 6 bulan terakhir</p>
            </div>
          </div>
          <div style="height: 280px; position: relative;">
            <canvas id="cashflow-chart"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                Komposisi Dana Simpanan
              </h3>
              <p class="card-subtitle">Proporsi Pokok, Wajib & Sukarela</p>
            </div>
          </div>
          <div style="height: 280px; position: relative; display: flex; align-items: center; justify-content: center;">
            <canvas id="savings-chart"></canvas>
          </div>
        </div>

      </div>

      <!-- Recent Transactions Table -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
              Aktivitas Transaksi Finansial Terkini
            </h3>
            <p class="card-subtitle">Mutasi buku kas dan transaksi simpan pinjam terbaru</p>
          </div>
          <button class="btn btn-secondary btn-sm quick-action-btn" data-target="transactions">
            Lihat Semua Transaksi &rarr;
          </button>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>No. Referensi</th>
                <th>Tanggal</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th>Tipe</th>
                <th style="text-align: right;">Nominal</th>
              </tr>
            </thead>
            <tbody>
              ${recentTxs.map(tx => `
                <tr>
                  <td><code>${tx.id}</code></td>
                  <td>${formatDate(tx.date, false)}</td>
                  <td><strong>${tx.category}</strong></td>
                  <td>${tx.description}</td>
                  <td>${getStatusBadge(tx.type)}</td>
                  <td style="text-align: right; font-weight: 700; color: ${tx.type === 'masuk' ? 'var(--success-dark)' : 'var(--danger-dark)'};">
                    ${tx.type === 'masuk' ? '+' : '-'} ${formatRupiah(tx.amount)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  // Attach quick navigation
  container.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (navigateTo) navigateTo(target);
    });
  });

  // Render Charts
  setTimeout(() => {
    renderAdminCharts(savingsBreakdown);
  }, 50);
}

function renderAdminCharts(savingsBreakdown) {
  const cashflowCtx = document.getElementById('cashflow-chart');
  if (cashflowCtx) {
    const cashChart = new Chart(cashflowCtx, {
      type: 'bar',
      data: {
        labels: ['Okt 2025', 'Nov 2025', 'Des 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026'],
        datasets: [
          {
            label: 'Pemasukan (Simpanan & Angsuran)',
            data: [25400000, 31200000, 28900000, 42500000, 38100000, 29400000],
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderRadius: 6
          },
          {
            label: 'Pengeluaran (Pencairan & Operasional)',
            data: [15000000, 18000000, 12500000, 22000000, 19250000, 15000000],
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          y: {
            ticks: {
              callback: val => 'Rp ' + (val / 1000000) + ' Jt'
            }
          }
        }
      }
    });
    activeCharts.push(cashChart);
  }

  const savingsCtx = document.getElementById('savings-chart');
  if (savingsCtx) {
    const sChart = new Chart(savingsCtx, {
      type: 'doughnut',
      data: {
        labels: ['Simpanan Pokok', 'Simpanan Wajib', 'Simpanan Sukarela'],
        datasets: [{
          data: [savingsBreakdown.pokok, savingsBreakdown.wajib, savingsBreakdown.sukarela],
          backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
    activeCharts.push(sChart);
  }
}

// ----------------------------------------------------
// 2. KETUA STMIK IKMI DASHBOARD
// ----------------------------------------------------
function renderKetuaDashboard(container, navigateTo) {
  const totalMembers = store.data.members.filter(m => m.status === 'aktif').length;
  const totalCash = store.getTotalCashBalance();
  const totalSavings = store.getTotalSavings();
  const activeLoans = store.getActiveLoansPrincipal();
  const interestEarned = store.getTotalInterestEarned();
  const pendingLoans = store.data.loans.filter(l => l.status === 'pending');

  container.innerHTML = `
    <div class="animate-fade-in">
      
      <!-- Ketua Banner -->
      <div style="background: linear-gradient(135deg, #0A2540 0%, #1e3a8a 60%, #059669 100%); border-radius: var(--radius-xl); padding: 1.75rem; color: #fff; margin-bottom: 1.75rem; box-shadow: var(--shadow-md);">
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(16, 185, 129, 0.25); padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #6ee7b7; margin-bottom: 0.6rem;">
          <span>🏛️ EXECUTIVE FINANCIAL MONITORING - KETUA STMIK IKMI</span>
        </div>
        <h2 style="font-size: 1.6rem; color: #fff; margin-bottom: 0.35rem;">Ringkasan Eksekutif & Kesehatan Koperasi</h2>
        <p style="font-size: 0.875rem; color: rgba(255,255,255,0.85); max-width: 700px;">
          Pantau likuiditas kas, solvabilitas pinjaman anggota, tren pertumbuhan simpanan, serta evaluasi kinerja keuangan secara komprehensif.
        </p>
      </div>

      <!-- Key Metrics -->
      <div class="stats-grid">
        <div class="stat-card" style="--stat-accent: #10b981;">
          <div class="stat-info">
            <span class="stat-label">Likuiditas Kas Koperasi</span>
            <span class="stat-value" style="color: var(--success);">${formatRupiah(totalCash)}</span>
            <span class="stat-subtext" style="color: var(--success-text);">Posisi kas sangat sehat</span>
          </div>
          <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          </div>
        </div>

        <div class="stat-card" style="--stat-accent: #3b82f6;">
          <div class="stat-info">
            <span class="stat-label">Total Aset Simpanan</span>
            <span class="stat-value">${formatRupiah(totalSavings)}</span>
            <span class="stat-subtext">${totalMembers} Anggota Civitas IKMI</span>
          </div>
          <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
        </div>

        <div class="stat-card" style="--stat-accent: #f59e0b;">
          <div class="stat-info">
            <span class="stat-label">Portofolio Pinjaman</span>
            <span class="stat-value">${formatRupiah(activeLoans)}</span>
            <span class="stat-subtext" style="color: var(--warning-text);">Tingkat Kelancaran: 98.5%</span>
          </div>
          <div class="stat-icon" style="--stat-icon-bg: var(--warning-light); --stat-icon-color: var(--warning-dark);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
        </div>

        <div class="stat-card" style="--stat-accent: #8b5cf6;">
          <div class="stat-info">
            <span class="stat-label">Pendapatan Jasa Koperasi</span>
            <span class="stat-value" style="color: var(--purple-text);">${formatRupiah(interestEarned)}</span>
            <span class="stat-subtext">Akumulasi SHU Berjalan</span>
          </div>
          <div class="stat-icon" style="--stat-icon-bg: var(--purple-light); --stat-icon-color: var(--purple);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
        </div>
      </div>

      <!-- Action Required: Approval & Loan Oversight -->
      <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 1.5rem; margin-bottom: 1.75rem;">
        
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                Persetujuan Pinjaman Khusus & Evaluasi
              </h3>
              <p class="card-subtitle">Pengajuan pinjaman dengan plafon besar yang membutuhkan persetujuan pimpinan</p>
            </div>
            <button class="btn btn-outline-primary btn-sm quick-action-btn" data-target="loans">Semua Pinjaman</button>
          </div>

          ${pendingLoans.length === 0 ? `
            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-tertiary);">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem;"><circle cx="12" cy="12" r="10"></circle><polyline points="9 12 12 15 16 10"></polyline></svg>
              <p style="font-size: 0.9rem; font-weight: 600;">Tidak ada pengajuan pinjaman tertunda saat ini.</p>
              <p style="font-size: 0.8rem;">Seluruh permohonan anggota telah diverifikasi dan disetujui.</p>
            </div>
          ` : `
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Pemohon</th>
                    <th>Nominal</th>
                    <th>Tenor</th>
                    <th>Keperluan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  ${pendingLoans.map(loan => {
                    const member = store.data.members.find(m => m.id === loan.memberId) || { name: loan.memberId, department: '-' };
                    return `
                      <tr>
                        <td>
                          <strong>${member.name}</strong><br>
                          <small style="color: var(--text-tertiary);">${member.department}</small>
                        </td>
                        <td><strong>${formatRupiah(loan.amount)}</strong></td>
                        <td>${loan.tenorMonths} Bulan</td>
                        <td style="max-width: 200px;">${loan.purpose}</td>
                        <td>
                          <button class="btn btn-success btn-sm quick-action-btn" data-target="loans">
                            Review & Setujui
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Laporan & Monitoring Cepat
              </h3>
              <p class="card-subtitle">Akses instan berkas laporan keuangan</p>
            </div>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <button class="btn btn-secondary quick-action-btn" data-target="reports" style="justify-content: flex-start; padding: 0.85rem;">
              <div style="width: 32px; height: 32px; border-radius: var(--radius-md); background: var(--primary-50); color: var(--primary-600); display: flex; align-items: center; justify-content: center; margin-right: 0.5rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
              </div>
              <div style="text-align: left;">
                <div style="font-weight: 700; font-size: 0.85rem;">Laporan Rekapitulasi Neraca & Kas</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary);">Cetak dengan Kop Resmi STMIK IKMI</div>
              </div>
            </button>

            <button class="btn btn-secondary quick-action-btn" data-target="shu" style="justify-content: flex-start; padding: 0.85rem;">
              <div style="width: 32px; height: 32px; border-radius: var(--radius-md); background: var(--purple-light); color: var(--purple); display: flex; align-items: center; justify-content: center; margin-right: 0.5rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <div style="text-align: left;">
                <div style="font-weight: 700; font-size: 0.85rem;">Simulasi Pembagian SHU Anggota</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary);">Alokasi Jasa Modal & Usaha Anggota</div>
              </div>
            </button>

            <button class="btn btn-secondary quick-action-btn" data-target="members" style="justify-content: flex-start; padding: 0.85rem;">
              <div style="width: 32px; height: 32px; border-radius: var(--radius-md); background: var(--success-light); color: var(--success); display: flex; align-items: center; justify-content: center; margin-right: 0.5rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
              </div>
              <div style="text-align: left;">
                <div style="font-weight: 700; font-size: 0.85rem;">Daftar Anggota Civitas IKMI</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary);">${totalMembers} Anggota Terdaftar Aktif</div>
              </div>
            </button>
          </div>
        </div>

      </div>

    </div>
  `;

  container.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (navigateTo) navigateTo(target);
    });
  });
}

// ----------------------------------------------------
// 3. ANGGOTA DASHBOARD (Dosen, Mahasiswa, Staf)
// ----------------------------------------------------
function renderAnggotaDashboard(container, user, navigateTo) {
  const memberSavings = store.getMemberSavings(user.id);
  const myLoans = store.data.loans.filter(l => l.memberId === user.id);
  const activeLoan = myLoans.find(l => l.status === 'disbursed' || l.status === 'approved' || l.status === 'pending');
  const myTxs = store.data.transactions.filter(t => t.memberId === user.id).slice(-5).reverse();
  const announcements = store.data.announcements.slice(0, 2);

  container.innerHTML = `
    <div class="animate-fade-in">
      
      <!-- Top Row: Welcome & Digital KTA Card -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem; margin-bottom: 1.75rem;">
        
        <!-- Welcome Card & Quick Stats -->
        <div style="display: flex; flex-direction: column; justify-content: space-between;">
          <div class="card" style="background: linear-gradient(135deg, #0A2540 0%, #1e3a8a 100%); color: #fff; padding: 1.75rem; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
              <span class="badge badge-warning" style="font-size: 0.75rem;">ANGGOTA RESMI KOPERASI</span>
              <span style="font-size: 0.75rem; color: rgba(255,255,255,0.7);">Bergabung sejak ${formatDate(user.joinDate, false)}</span>
            </div>
            <h2 style="font-size: 1.5rem; color: #fff; margin-bottom: 0.35rem;">Halo, ${user.name}</h2>
            <p style="font-size: 0.85rem; color: rgba(255,255,255,0.8); margin-bottom: 1.25rem;">
              ${user.identifier} &bull; ${user.department}
            </p>
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <button class="btn btn-primary btn-sm quick-action-btn" data-target="savings" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); backdrop-filter: blur(8px);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
                Lihat Simpanan Saya
              </button>
              <button class="btn btn-success btn-sm quick-action-btn" data-target="loans">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Ajukan Pinjaman
              </button>
            </div>
          </div>

          <!-- My Total Savings Summary -->
          <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Total Saldo Simpanan Anda</span>
              <span class="badge badge-success">Terverifikasi</span>
            </div>
            <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary-600); font-family: 'Outfit', sans-serif; margin-bottom: 1rem;">
              ${formatRupiah(memberSavings.total)}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; text-align: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
              <div>
                <div style="font-size: 0.7rem; color: var(--text-tertiary);">POKOK</div>
                <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${formatRupiah(memberSavings.pokok)}</div>
              </div>
              <div style="border-left: 1px solid var(--border-color); border-right: 1px solid var(--border-color);">
                <div style="font-size: 0.7rem; color: var(--text-tertiary);">WAJIB</div>
                <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${formatRupiah(memberSavings.wajib)}</div>
              </div>
              <div>
                <div style="font-size: 0.7rem; color: var(--text-tertiary);">SUKARELA</div>
                <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${formatRupiah(memberSavings.sukarela)}</div>
              </div>
            </div>
          </div>

        </div>

        <!-- Digital KTA Card -->
        <div>
          <div class="member-kta-card">
            <div class="kta-header">
              <div class="kta-brand">
                <div class="kta-logo-icon">IKMI</div>
                <div class="kta-title">
                  <h3>KARTU TANDA ANGGOTA</h3>
                  <p>Koperasi STMIK IKMI Cirebon</p>
                </div>
              </div>
              <div class="kta-chip"></div>
            </div>

            <div class="kta-body">
              <div class="kta-number">${user.id}</div>
              <div class="kta-details-grid">
                <div class="kta-detail-item">
                  <p>Nama Anggota</p>
                  <h4>${user.name}</h4>
                </div>
                <div class="kta-detail-item">
                  <p>Status Keanggotaan</p>
                  <h4>${getMemberTypeBadge(user.type)}</h4>
                </div>
                <div class="kta-detail-item" style="grid-column: span 2; margin-top: 0.35rem;">
                  <p>Unit / Prodi / ID</p>
                  <h4 style="font-size: 0.85rem;">${user.department} (${user.identifier})</h4>
                </div>
              </div>
            </div>

            <div class="kta-footer">
              <span class="kta-status-badge">● KEANGGOTAAN AKTIF</span>
              <span style="font-size: 0.7rem; color: rgba(255,255,255,0.7); font-family: monospace;">SMART CO-OP CARD</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Bottom Row: Active Loan & Personal History -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem;">
        
        <!-- Active Loan Status Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Status Pinjaman Saya
              </h3>
              <p class="card-subtitle">Informasi pinjaman berjalan & jadwal angsuran</p>
            </div>
            <button class="btn btn-outline-primary btn-sm quick-action-btn" data-target="loans">Rincian</button>
          </div>

          ${!activeLoan ? `
            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-tertiary);">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <p style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">Anda tidak memiliki pinjaman aktif saat ini.</p>
              <p style="font-size: 0.8rem; margin-bottom: 1rem;">Butuh dana untuk keperluan pendidikan, penelitian, atau usaha?</p>
              <button class="btn btn-primary btn-sm quick-action-btn" data-target="loans">
                Simulasi & Ajukan Pinjaman Sekarang
              </button>
            </div>
          ` : `
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
                <div>
                  <span style="font-size: 0.75rem; color: var(--text-tertiary);">Nomor Pinjaman</span>
                  <div style="font-weight: 700; font-size: 0.95rem;">${activeLoan.id}</div>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--text-tertiary);">Status</span>
                  <div>${getStatusBadge(activeLoan.status)}</div>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--text-tertiary);">Plafon Pinjaman</span>
                  <div style="font-weight: 800; font-size: 1.05rem; color: var(--primary-600);">${formatRupiah(activeLoan.amount)}</div>
                </div>
              </div>

              <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">
                <strong>Keperluan:</strong> ${activeLoan.purpose}
              </p>

              ${activeLoan.status === 'disbursed' ? `
                <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 1rem;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.35rem;">
                    <span>Progres Pelunasan Angsuran:</span>
                    <strong>${activeLoan.schedule.filter(s => s.status === 'paid').length} dari ${activeLoan.tenorMonths} Bulan</strong>
                  </div>
                  <div style="height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${(activeLoan.schedule.filter(s => s.status === 'paid').length / activeLoan.tenorMonths) * 100}%; background: var(--success); transition: width 0.3s;"></div>
                  </div>
                </div>
                <button class="btn btn-primary btn-sm quick-action-btn" data-target="installments" style="width: 100%;">
                  Lihat Jadwal Angsuran & Kwitansi &rarr;
                </button>
              ` : `
                <div class="badge badge-warning" style="width: 100%; padding: 0.5rem; justify-content: center;">
                  Pengajuan pinjaman sedang dalam tahap verifikasi oleh Admin & Ketua STMIK IKMI.
                </div>
              `}
            </div>
          `}
        </div>

        <!-- Announcements Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                Pengumuman Koperasi IKMI
              </h3>
              <p class="card-subtitle">Informasi & agenda terkini</p>
            </div>
            <button class="btn btn-secondary btn-sm quick-action-btn" data-target="coop-info">Info Lengkap</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            ${announcements.map(ann => `
              <div style="padding: 0.85rem; border-radius: var(--radius-md); background: var(--bg-subtle); border-left: 3px solid var(--primary-500);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span class="badge badge-primary" style="font-size: 0.65rem;">${ann.category}</span>
                  <span style="font-size: 0.7rem; color: var(--text-tertiary);">${formatDate(ann.date, false)}</span>
                </div>
                <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.25rem; color: var(--text-primary);">${ann.title}</h4>
                <p style="font-size: 0.775rem; color: var(--text-secondary); line-height: 1.4;">${ann.content}</p>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

    </div>
  `;

  container.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (navigateTo) navigateTo(target);
    });
  });
}
