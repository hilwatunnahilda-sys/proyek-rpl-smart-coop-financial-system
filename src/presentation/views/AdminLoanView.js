/**
 * Admin Loan & Installment Management View
 * Full Workflow: Pengajuan -> Review -> Persetujuan/Penolakan -> Pencairan -> Pembayaran Angsuran -> Pelunasan
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { LoanService } from '../../core/services/LoanService.js';
import { InterestCalculator } from '../../core/services/InterestCalculator.js';
import { MemberService } from '../../core/services/MemberService.js';
import { requireAuthorization } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { ROLES, LOAN_STATUS, INSTALLMENT_STATUS, INTEREST_CALCULATION_TYPE } from '../../config/constants.js';

export async function renderAdminLoanView(container, { user }) {
  requireAuthorization(user, [ROLES.ADMIN, ROLES.CHAIRMAN]);

  const loanService = new LoanService();
  const memberService = new MemberService();

  let activeTab = 'all-loans';
  let searchQuery = '';
  let statusFilter = '';
  let selectedLoanId = null;

  // Fetch initial data
  const metrics = await loanService.getExecutiveLoanMetrics();
  const allMembers = await memberService.getAll();

  async function render() {
    const loansData = await loanService.getAllLoans({
      search: searchQuery,
      status: statusFilter
    });
    const overdueList = await loanService.getOverdueInstallments();

    container.innerHTML = `
      <div class="animate-fade-in" style="padding-bottom: 3rem;">
        
        <!-- Hero Header -->
        <div style="background: linear-gradient(135deg, #0A2540 0%, #1e3a8a 50%, #0f766e 100%); border-radius: var(--radius-xl); padding: 2rem; color: #fff; margin-bottom: 1.75rem; box-shadow: var(--shadow-lg); position: relative; overflow: hidden;">
          <div style="position: absolute; right: -20px; bottom: -20px; opacity: 0.08; font-size: 11rem; font-weight: 900; pointer-events: none;">LOANS</div>
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); padding: 0.3rem 0.85rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #e0f2fe; margin-bottom: 0.75rem;">
            <span>💳 MODUL PINJAMAN & ANGSURAN RESMI</span>
            <span style="opacity: 0.5;">&bull;</span>
            <span>STMIK IKMI CIREBON</span>
          </div>
          <h2 style="font-size: 1.75rem; color: #fff; margin-bottom: 0.4rem; font-family: 'Outfit', sans-serif;">
            Manajemen Pinjaman & Jadwal Angsuran
          </h2>
          <p style="font-size: 0.875rem; color: rgba(255,255,255,0.9); max-width: 820px; line-height: 1.6;">
            Kelola seluruh siklus pembiayaan koperasi dari pengajuan, review kelayakan, persetujuan pimpinan, pencairan dana, pencatatan pembayaran angsuran berkala, hingga evaluasi pelunasan dan monitoring tunggakan.
          </p>

          <!-- Workflow Progress Indicator -->
          <div style="margin-top: 1.5rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; background: rgba(0,0,0,0.25); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.75rem; font-weight: 600;">
            <span style="color: #93c5fd;">Alur Pembiayaan:</span>
            <span class="badge" style="background: rgba(245, 158, 11, 0.3); color: #fde68a;">1. Pengajuan</span>
            <span style="color: rgba(255,255,255,0.4);">➔</span>
            <span class="badge" style="background: rgba(147, 197, 253, 0.3); color: #bfdbfe;">2. Review</span>
            <span style="color: rgba(255,255,255,0.4);">➔</span>
            <span class="badge" style="background: rgba(59, 130, 246, 0.3); color: #93c5fd;">3. Persetujuan</span>
            <span style="color: rgba(255,255,255,0.4);">➔</span>
            <span class="badge" style="background: rgba(16, 185, 129, 0.3); color: #a7f3d0;">4. Pencairan</span>
            <span style="color: rgba(255,255,255,0.4);">➔</span>
            <span class="badge" style="background: rgba(20, 184, 166, 0.3); color: #99f6e4;">5. Angsuran</span>
            <span style="color: rgba(255,255,255,0.4);">➔</span>
            <span class="badge" style="background: rgba(99, 102, 241, 0.3); color: #c7d2fe;">6. Pelunasan</span>
          </div>
        </div>

        <!-- Metrics Cards -->
        <div class="stats-grid">
          <div class="stat-card" style="--stat-accent: #3b82f6;">
            <div class="stat-info">
              <span class="stat-label">Total Dana Disalurkan</span>
              <span class="stat-value" style="color: var(--primary-600);">Rp ${metrics.totalDisbursedAmount.toLocaleString('id-ID')}</span>
              <span class="stat-subtext">Dari ${metrics.totalLoansCount} Total Pengajuan Pinjaman</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #10b981;">
            <div class="stat-info">
              <span class="stat-label">Sisa Pokok Aktif (Outstanding)</span>
              <span class="stat-value" style="color: var(--success);">Rp ${metrics.totalOutstandingPrincipal.toLocaleString('id-ID')}</span>
              <span class="stat-subtext">${metrics.totalActiveCount} Pinjaman Aktif Berjalan</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #f59e0b;">
            <div class="stat-info">
              <span class="stat-label">Pengajuan Baru (Pending)</span>
              <span class="stat-value" style="color: var(--warning);">${metrics.totalPendingCount}</span>
              <span class="stat-subtext">Menunggu Review & Approval Pimpinan</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--warning-light); --stat-icon-color: var(--warning);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #ef4444;">
            <div class="stat-info">
              <span class="stat-label">Tunggakan (Overdue)</span>
              <span class="stat-value" style="color: var(--danger);">Rp ${metrics.totalOverdueAmount.toLocaleString('id-ID')}</span>
              <span class="stat-subtext">${metrics.totalOverdueCount} Angsuran Menunggak (NPL: ${metrics.nplRate}%)</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--danger-light); --stat-icon-color: var(--danger);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs & Action Bar -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 0.75rem 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn btn-sm ${activeTab === 'all-loans' ? 'btn-primary' : 'btn-secondary'} tab-nav" data-tab="all-loans">
                📑 Semua Pinjaman (${loansData.length})
              </button>
              <button class="btn btn-sm ${activeTab === 'pending-loans' ? 'btn-warning' : 'btn-secondary'} tab-nav" data-tab="pending-loans">
                ⏳ Perlu Review/Approve (${metrics.totalPendingCount})
              </button>
              <button class="btn btn-sm ${activeTab === 'overdue-loans' ? 'btn-danger' : 'btn-secondary'} tab-nav" data-tab="overdue-loans">
                ⚠️ Tunggakan (${overdueList.length})
              </button>
              <button class="btn btn-sm ${activeTab === 'create-loan' ? 'btn-success' : 'btn-secondary'} tab-nav" data-tab="create-loan">
                ➕ Buat Pengajuan Pinjaman
              </button>
            </div>

            <!-- Search & Filters -->
            ${activeTab !== 'create-loan' ? `
              <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <input type="text" id="loan-search-input" class="form-control" style="width: 220px; font-size: 0.8rem; padding: 0.4rem 0.75rem;" placeholder="Cari No. Pinjaman / Nama..." value="${searchQuery}" />
                <select id="loan-status-filter" class="form-control" style="width: 150px; font-size: 0.8rem; padding: 0.4rem 0.75rem;">
                  <option value="">Semua Status</option>
                  <option value="PENDING" ${statusFilter === 'PENDING' ? 'selected' : ''}>PENDING</option>
                  <option value="APPROVED" ${statusFilter === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
                  <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                  <option value="PAID_OFF" ${statusFilter === 'PAID_OFF' ? 'selected' : ''}>PAID_OFF</option>
                  <option value="REJECTED" ${statusFilter === 'REJECTED' ? 'selected' : ''}>REJECTED</option>
                </select>
              </div>
            ` : ''}

          </div>
        </div>

        <!-- Dynamic Tab Content -->
        <div id="tab-content-area">
          ${renderTabContent(activeTab, { loansData, overdueList, allMembers, user })}
        </div>

        <!-- Modal Container -->
        <div id="loan-modal-container"></div>

      </div>
    `;

    attachEvents();
  }

  function renderTabContent(tab, { loansData, overdueList, allMembers, user }) {
    if (tab === 'create-loan') {
      return renderCreateLoanForm(allMembers, user);
    }

    if (tab === 'overdue-loans') {
      return renderOverdueTable(overdueList);
    }

    // Filter for pending tab
    let displayLoans = loansData;
    if (tab === 'pending-loans') {
      displayLoans = loansData.filter(item => item.loan.status === LOAN_STATUS.PENDING);
    }

    return renderLoansTable(displayLoans);
  }

  function renderLoansTable(loans) {
    if (!loans || loans.length === 0) {
      return `
        <div class="card" style="text-align: center; padding: 3rem 1rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📭</div>
          <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">Tidak Ada Data Pinjaman</h4>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Belum ada data pinjaman yang sesuai dengan filter atau kata kunci pencarian.</p>
        </div>
      `;
    }

    return `
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive">
          <table class="table" style="margin: 0; width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="background: var(--bg-subtle); border-bottom: 2px solid var(--border-color); text-align: left;">
                <th style="padding: 0.85rem 1rem;">No. Pinjaman</th>
                <th style="padding: 0.85rem 1rem;">Peminjam (Anggota)</th>
                <th style="padding: 0.85rem 1rem;">Pokok Pinjaman</th>
                <th style="padding: 0.85rem 1rem;">Metode / Suku Bunga</th>
                <th style="padding: 0.85rem 1rem;">Tenor</th>
                <th style="padding: 0.85rem 1rem;">Sisa Pokok</th>
                <th style="padding: 0.85rem 1rem;">Status</th>
                <th style="padding: 0.85rem 1rem; text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${loans.map(item => {
                const l = item.loan;
                const m = item.member;
                const statusBadge = getLoanStatusBadge(l.status);
                const pct = l.getRepaymentProgressPercentage();

                return `
                  <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s;" class="table-row-hover">
                    <td style="padding: 0.85rem 1rem; font-family: monospace; font-weight: 700; color: var(--primary-700);">
                      ${l.loan_number}
                    </td>
                    <td style="padding: 0.85rem 1rem;">
                      <div style="font-weight: 700; color: var(--text-primary);">${m ? m.full_name : 'Anggota #' + l.member_id}</div>
                      <div style="font-size: 0.75rem; color: var(--text-tertiary);">${m ? `${m.member_type} &bull; ${m.member_number}` : '-'}</div>
                    </td>
                    <td style="padding: 0.85rem 1rem; font-weight: 700; color: var(--text-primary);">
                      Rp ${l.principal_amount.toLocaleString('id-ID')}
                    </td>
                    <td style="padding: 0.85rem 1rem;">
                      <span class="badge badge-neutral" style="font-size: 0.7rem;">${l.interest_type}</span>
                      <span style="font-size: 0.75rem; color: var(--text-secondary); margin-left: 0.25rem;">(${l.interest_rate}%/thn)</span>
                    </td>
                    <td style="padding: 0.85rem 1rem;">
                      <strong>${l.tenure}</strong> Bulan
                    </td>
                    <td style="padding: 0.85rem 1rem;">
                      <div style="font-weight: 700; color: ${l.remaining_principal > 0 ? 'var(--warning-dark)' : 'var(--success)'};">
                        Rp ${l.remaining_principal.toLocaleString('id-ID')}
                      </div>
                      <div style="font-size: 0.7rem; color: var(--text-tertiary); display: flex; align-items: center; gap: 0.35rem; margin-top: 0.2rem;">
                        <div style="width: 40px; height: 5px; background: var(--bg-subtle); border-radius: 3px; overflow: hidden;">
                          <div style="width: ${pct}%; height: 100%; background: var(--primary-500);"></div>
                        </div>
                        <span>${pct}% lunas</span>
                      </div>
                    </td>
                    <td style="padding: 0.85rem 1rem;">
                      ${statusBadge}
                    </td>
                    <td style="padding: 0.85rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.35rem;">
                        <button class="btn btn-sm btn-secondary view-loan-btn" data-id="${l.id}" title="Lihat Rincian Pinjaman & Angsuran">
                          👁️ Rincian
                        </button>
                        ${l.status === LOAN_STATUS.PENDING ? `
                          <button class="btn btn-sm btn-success approve-loan-btn" data-id="${l.id}" title="Setujui Pinjaman">
                            ✓ Approve
                          </button>
                          <button class="btn btn-sm btn-danger reject-loan-btn" data-id="${l.id}" title="Tolak Pinjaman">
                            ✕ Reject
                          </button>
                        ` : ''}
                        ${l.status === LOAN_STATUS.APPROVED ? `
                          <button class="btn btn-sm btn-primary disburse-loan-btn" data-id="${l.id}" title="Cairkan Pinjaman & Aktifkan Angsuran">
                            💸 Cairkan Dana
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderOverdueTable(overdueList) {
    if (!overdueList || overdueList.length === 0) {
      return `
        <div class="card" style="text-align: center; padding: 3rem 1rem; background: var(--success-light); border: 1px solid var(--success-border);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🎉</div>
          <h4 style="margin: 0 0 0.5rem 0; color: var(--success-text);">Nihil Tunggakan (Kredit Sangat Sehat)</h4>
          <p style="margin: 0; font-size: 0.85rem; color: var(--success-text);">Tidak ditemukan angsuran yang melewati batas jatuh tempo saat ini.</p>
        </div>
      `;
    }

    return `
      <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--danger-border);">
        <div style="padding: 1rem 1.25rem; background: var(--danger-light); border-bottom: 1px solid var(--danger-border); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 0.95rem; color: var(--danger-text); display: flex; align-items: center; gap: 0.5rem;">
            ⚠️ Daftar Angsuran Terlambat / Menunggak (NPL Alert)
          </h3>
          <span class="badge badge-danger">${overdueList.length} Tagihan Overdue</span>
        </div>

        <div class="table-responsive">
          <table class="table" style="margin: 0; width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="background: var(--bg-subtle); border-bottom: 2px solid var(--border-color); text-align: left;">
                <th style="padding: 0.85rem 1rem;">No. Pinjaman</th>
                <th style="padding: 0.85rem 1rem;">Peminjam</th>
                <th style="padding: 0.85rem 1rem;">Angsuran Ke</th>
                <th style="padding: 0.85rem 1rem;">Jatuh Tempo</th>
                <th style="padding: 0.85rem 1rem;">Total Tagihan</th>
                <th style="padding: 0.85rem 1rem;">Telah Dibayar</th>
                <th style="padding: 0.85rem 1rem;">Sisa Tunggakan</th>
                <th style="padding: 0.85rem 1rem; text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${overdueList.map(item => {
                const inst = item.installment;
                const loan = item.loan;
                const member = item.member;
                const remaining = inst.getRemainingDue();

                return `
                  <tr style="border-bottom: 1px solid var(--border-color); background: rgba(239, 68, 68, 0.03);">
                    <td style="padding: 0.85rem 1rem; font-family: monospace; font-weight: 700; color: var(--primary-700);">
                      ${loan ? loan.loan_number : inst.loan_id}
                    </td>
                    <td style="padding: 0.85rem 1rem;">
                      <div style="font-weight: 700; color: var(--text-primary);">${member ? member.full_name : '-'}</div>
                      <div style="font-size: 0.75rem; color: var(--text-tertiary);">${member ? `${member.member_type} &bull; ${member.phone || '-'}` : '-'}</div>
                    </td>
                    <td style="padding: 0.85rem 1rem; font-weight: 700;">
                      Bulan Ke-${inst.installment_number}
                    </td>
                    <td style="padding: 0.85rem 1rem; color: var(--danger); font-weight: 700;">
                      ${inst.due_date}
                    </td>
                    <td style="padding: 0.85rem 1rem;">
                      Rp ${inst.total_due.toLocaleString('id-ID')}
                    </td>
                    <td style="padding: 0.85rem 1rem; color: var(--text-secondary);">
                      Rp ${inst.paid_amount.toLocaleString('id-ID')}
                    </td>
                    <td style="padding: 0.85rem 1rem; font-weight: 800; color: var(--danger);">
                      Rp ${remaining.toLocaleString('id-ID')}
                    </td>
                    <td style="padding: 0.85rem 1rem; text-align: right;">
                      <button class="btn btn-sm btn-primary pay-installment-btn" data-loan-id="${loan ? loan.id : ''}" data-inst-id="${inst.id}">
                        💵 Catat Bayar
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderCreateLoanForm(members, user) {
    return `
      <div class="card" style="max-width: 900px; margin: 0 auto; box-shadow: var(--shadow-md);">
        <div class="card-header">
          <h3 class="card-title">
            <span>📝 Formulir Pengajuan Pinjaman & Simulasi Jadwal Angsuran</span>
          </h3>
          <span class="badge badge-purple">SIMULASI FLEKSIBEL</span>
        </div>

        <form id="create-loan-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Pilih Anggota Peminjam</label>
              <select id="form-member-id" class="form-control" required>
                <option value="">-- Pilih Anggota Koperasi --</option>
                ${members.map(m => `
                  <option value="${m.id}">${m.full_name} (${m.member_type} - ${m.member_number})</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Jumlah Pokok Pinjaman (Rp)</label>
              <input type="number" id="form-principal" class="form-control" placeholder="Contoh: 10000000" min="500000" step="100000" value="5000000" required />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Metode Perhitungan Bunga / Bagi Hasil</label>
              <select id="form-interest-type" class="form-control" required>
                <option value="${INTEREST_CALCULATION_TYPE.FLAT}">Bunga Flat (Tetap)</option>
                <option value="${INTEREST_CALCULATION_TYPE.DECLINING}">Bunga Efektif / Menurun</option>
                <option value="${INTEREST_CALCULATION_TYPE.ANNUITY}">Bunga Anuitas</option>
                <option value="${INTEREST_CALCULATION_TYPE.ZERO_INTEREST}">Bunga 0% (Syariah Qardh)</option>
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Suku Bunga (% per Tahun)</label>
              <input type="number" id="form-interest-rate" class="form-control" placeholder="0 - 20%" min="0" max="100" step="0.5" value="6" required />
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Jangka Waktu / Tenor (Bulan)</label>
              <input type="number" id="form-tenure" class="form-control" placeholder="1 - 60 Bulan" min="1" max="60" value="6" required />
            </div>
          </div>

          <div class="form-group" style="margin: 0;">
            <label class="form-label required">Tujuan / Keperluan Pinjaman</label>
            <textarea id="form-purpose" class="form-control" rows="2" placeholder="Jelaskan tujuan pembiayaan (misal: Biaya Riset, Publikasi Ilmiah, Pembelian Komputer, dsb.)" required></textarea>
          </div>

          <!-- Real-Time Calculation Simulation Box -->
          <div id="simulation-preview-box" style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 1.25rem; border: 1px dashed var(--primary-400);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <strong style="color: var(--primary-700); font-size: 0.9rem;">📊 Hasil Simulasi Jadwal Angsuran</strong>
              <span id="sim-method-badge" class="badge badge-primary">FLAT RATE</span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; font-size: 0.8rem;">
              <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-sm);">
                <div style="color: var(--text-tertiary);">Estimasi Angsuran / Bulan</div>
                <div id="sim-monthly-val" style="font-weight: 800; font-size: 1.1rem; color: var(--primary-600); margin-top: 0.2rem;">Rp 0</div>
              </div>
              <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-sm);">
                <div style="color: var(--text-tertiary);">Total Jasa / Bunga</div>
                <div id="sim-interest-val" style="font-weight: 800; font-size: 1.1rem; color: var(--purple-text); margin-top: 0.2rem;">Rp 0</div>
              </div>
              <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-sm);">
                <div style="color: var(--text-tertiary);">Total Pengembalian</div>
                <div id="sim-total-val" style="font-weight: 800; font-size: 1.1rem; color: var(--success-text); margin-top: 0.2rem;">Rp 0</div>
              </div>
            </div>

            <!-- Preview Schedule Table -->
            <div id="sim-schedule-table" style="max-height: 200px; overflow-y: auto;"></div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-create">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-submit-loan">
              💾 Simpan & Ajukan Pinjaman
            </button>
          </div>

        </form>
      </div>
    `;
  }

  function getLoanStatusBadge(status) {
    switch (status) {
      case LOAN_STATUS.PENDING:
        return `<span class="badge badge-warning">⏳ PENDING</span>`;
      case LOAN_STATUS.APPROVED:
        return `<span class="badge badge-primary">✓ APPROVED</span>`;
      case LOAN_STATUS.ACTIVE:
      case LOAN_STATUS.DISBURSED:
        return `<span class="badge badge-success">● ACTIVE</span>`;
      case LOAN_STATUS.PAID_OFF:
        return `<span class="badge badge-purple" style="background: #e0e7ff; color: #4338ca;">★ PAID OFF</span>`;
      case LOAN_STATUS.REJECTED:
        return `<span class="badge badge-danger">✕ REJECTED</span>`;
      case LOAN_STATUS.CANCELLED:
        return `<span class="badge badge-neutral">⊘ CANCELLED</span>`;
      default:
        return `<span class="badge badge-neutral">${status}</span>`;
    }
  }

  function updateSimulation() {
    const principalInput = container.querySelector('#form-principal');
    const interestTypeInput = container.querySelector('#form-interest-type');
    const interestRateInput = container.querySelector('#form-interest-rate');
    const tenureInput = container.querySelector('#form-tenure');

    if (!principalInput || !interestTypeInput || !tenureInput) return;

    const principal = Number(principalInput.value) || 0;
    const interestType = interestTypeInput.value;
    const interestRate = Number(interestRateInput ? interestRateInput.value : 0) || 0;
    const tenure = parseInt(tenureInput.value, 10) || 1;

    if (principal <= 0 || tenure <= 0) return;

    try {
      const result = InterestCalculator.generateSchedule({
        principal,
        annualInterestRate: interestRate,
        tenureMonths: tenure,
        interestType
      });

      const simMonthly = container.querySelector('#sim-monthly-val');
      const simInterest = container.querySelector('#sim-interest-val');
      const simTotal = container.querySelector('#sim-total-val');
      const simBadge = container.querySelector('#sim-method-badge');
      const simTable = container.querySelector('#sim-schedule-table');

      if (simMonthly) simMonthly.textContent = `Rp ${result.monthly_installment_estimate.toLocaleString('id-ID')}`;
      if (simInterest) simInterest.textContent = `Rp ${result.total_interest.toLocaleString('id-ID')}`;
      if (simTotal) simTotal.textContent = `Rp ${result.total_repayment.toLocaleString('id-ID')}`;
      if (simBadge) simBadge.textContent = interestType;

      if (simTable) {
        simTable.innerHTML = `
          <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; background: var(--bg-surface);">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: var(--bg-subtle);">
                <th style="padding: 0.35rem 0.5rem; text-align: left;">Bulan</th>
                <th style="padding: 0.35rem 0.5rem; text-align: left;">Jatuh Tempo</th>
                <th style="padding: 0.35rem 0.5rem; text-align: right;">Pokok</th>
                <th style="padding: 0.35rem 0.5rem; text-align: right;">Bunga/Jasa</th>
                <th style="padding: 0.35rem 0.5rem; text-align: right;">Total Tagihan</th>
                <th style="padding: 0.35rem 0.5rem; text-align: right;">Sisa Pokok</th>
              </tr>
            </thead>
            <tbody>
              ${result.schedule.map(s => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.35rem 0.5rem;">Ke-${s.installment_number}</td>
                  <td style="padding: 0.35rem 0.5rem;">${s.due_date}</td>
                  <td style="padding: 0.35rem 0.5rem; text-align: right;">Rp ${s.principal.toLocaleString('id-ID')}</td>
                  <td style="padding: 0.35rem 0.5rem; text-align: right;">Rp ${s.interest.toLocaleString('id-ID')}</td>
                  <td style="padding: 0.35rem 0.5rem; text-align: right; font-weight: 700; color: var(--primary-700);">Rp ${s.total_due.toLocaleString('id-ID')}</td>
                  <td style="padding: 0.35rem 0.5rem; text-align: right; color: var(--text-tertiary);">Rp ${s.remaining_balance.toLocaleString('id-ID')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } catch (e) {
      console.warn('Simulation calculation error:', e);
    }
  }

  function attachEvents() {
    // Tab Navigation
    container.querySelectorAll('.tab-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        render();
      });
    });

    // Search and filters
    const searchInput = container.querySelector('#loan-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
      });
    }

    const statusFilterSelect = container.querySelector('#loan-status-filter');
    if (statusFilterSelect) {
      statusFilterSelect.addEventListener('change', (e) => {
        statusFilter = e.target.value;
        render();
      });
    }

    // Dynamic Loan Creation Simulator
    if (activeTab === 'create-loan') {
      const inputs = ['#form-principal', '#form-interest-type', '#form-interest-rate', '#form-tenure'];
      inputs.forEach(sel => {
        const el = container.querySelector(sel);
        if (el) {
          el.addEventListener('input', updateSimulation);
          el.addEventListener('change', updateSimulation);
        }
      });
      updateSimulation();

      const cancelBtn = container.querySelector('#btn-cancel-create');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          activeTab = 'all-loans';
          render();
        });
      }

      const form = container.querySelector('#create-loan-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const member_id = container.querySelector('#form-member-id').value;
          const principal_amount = Number(container.querySelector('#form-principal').value);
          const interest_type = container.querySelector('#form-interest-type').value;
          const interest_rate = Number(container.querySelector('#form-interest-rate').value);
          const tenure = parseInt(container.querySelector('#form-tenure').value, 10);
          const purpose = container.querySelector('#form-purpose').value;

          try {
            const newLoan = await loanService.applyLoan({
              member_id,
              principal_amount,
              interest_type,
              interest_rate,
              tenure,
              purpose,
              created_by: user.id,
              created_by_name: user.name
            });

            alert(`✓ Pengajuan pinjaman ${newLoan.loan_number} berhasil dibuat dengan status PENDING.`);
            activeTab = 'all-loans';
            render();
          } catch (err) {
            alert(`Gagal membuat pengajuan: ${err.message}`);
          }
        });
      }
    }

    // Action: View Loan Details Modal
    container.querySelectorAll('.view-loan-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await openLoanDetailsModal(id);
      });
    });

    // Action: Approve Loan Modal
    container.querySelectorAll('.approve-loan-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await openApproveModal(id);
      });
    });

    // Action: Reject Loan Modal
    container.querySelectorAll('.reject-loan-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await openRejectModal(id);
      });
    });

    // Action: Disburse Loan Modal
    container.querySelectorAll('.disburse-loan-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await openDisburseModal(id);
      });
    });

    // Action: Pay Installment Modal
    container.querySelectorAll('.pay-installment-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const loanId = btn.dataset.loanId;
        const instId = btn.dataset.instId;
        await openPaymentModal(loanId, instId);
      });
    });
  }

  // --- MODAL CONTROLLERS ---

  async function openLoanDetailsModal(loanId) {
    const modalContainer = container.querySelector('#loan-modal-container');
    const details = await loanService.getLoanDetails(loanId);
    if (!details) return;

    const { loan, member, installments, history } = details;
    const statusBadge = getLoanStatusBadge(loan.status);

    modalContainer.innerHTML = `
      <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
        <div class="modal-content animate-slide-up" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 2rem; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color);">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <h3 style="margin: 0; font-size: 1.35rem; color: var(--text-primary); font-family: 'Outfit', sans-serif;">
                  Pinjaman: ${loan.loan_number}
                </h3>
                ${statusBadge}
              </div>
              <p style="margin: 0.25rem 0 0 0; font-size: 0.825rem; color: var(--text-tertiary);">
                Peminjam: <strong>${member ? member.full_name : '-'}</strong> (${member ? member.member_type : '-'} &bull; ${member ? member.member_number : '-'})
              </p>
            </div>
            <button class="btn btn-sm btn-secondary close-modal-btn">✕ Tutup</button>
          </div>

          <!-- Loan Summary Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; font-size: 0.825rem;">
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <span style="color: var(--text-tertiary);">Pokok Pinjaman</span>
              <div style="font-weight: 800; font-size: 1.1rem; color: var(--primary-700);">Rp ${loan.principal_amount.toLocaleString('id-ID')}</div>
            </div>
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <span style="color: var(--text-tertiary);">Total Pengembalian</span>
              <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary);">Rp ${loan.total_repayment.toLocaleString('id-ID')}</div>
            </div>
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <span style="color: var(--text-tertiary);">Total Telah Dibayar</span>
              <div style="font-weight: 800; font-size: 1.1rem; color: var(--success-text);">Rp ${loan.paid_amount.toLocaleString('id-ID')}</div>
            </div>
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <span style="color: var(--text-tertiary);">Sisa Pokok</span>
              <div style="font-weight: 800; font-size: 1.1rem; color: var(--warning-text);">Rp ${loan.remaining_principal.toLocaleString('id-ID')}</div>
            </div>
          </div>

          <!-- Additional Loan Details -->
          <div style="font-size: 0.825rem; color: var(--text-secondary); margin-bottom: 1.5rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div><strong>Metode Perhitungan:</strong> ${loan.interest_type} (${loan.interest_rate}% / Tahun)</div>
              <div><strong>Tenor:</strong> ${loan.tenure} Bulan</div>
              <div><strong>Tanggal Mulai:</strong> ${loan.start_date}</div>
              <div><strong>Tanggal Jatuh Tempo Akhir:</strong> ${loan.due_date}</div>
              <div><strong>Tujuan:</strong> ${loan.purpose}</div>
              <div><strong>Catatan:</strong> ${loan.notes || '-'}</div>
              ${loan.rejection_reason ? `<div style="grid-column: 1 / -1; color: var(--danger);"><strong>Alasan Penolakan:</strong> ${loan.rejection_reason}</div>` : ''}
            </div>
          </div>

          <!-- Installment Schedule Table -->
          <h4 style="margin: 0 0 0.75rem 0; font-size: 1rem; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center;">
            <span>📅 Jadwal & Status Pembayaran Angsuran</span>
            <span style="font-size: 0.8rem; color: var(--text-tertiary); font-weight: normal;">${installments.length} Angsuran</span>
          </h4>

          ${installments.length > 0 ? `
            <div class="table-responsive" style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 1.5rem;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                <thead>
                  <tr style="background: var(--bg-subtle); border-bottom: 1px solid var(--border-color); text-align: left;">
                    <th style="padding: 0.5rem 0.75rem;">No.</th>
                    <th style="padding: 0.5rem 0.75rem;">Jatuh Tempo</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right;">Pokok</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right;">Bunga/Jasa</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right;">Total Tagihan</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right;">Terbayar</th>
                    <th style="padding: 0.5rem 0.75rem;">Status</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right;">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  ${installments.map(inst => {
                    let instBadge = `<span class="badge badge-neutral">UNPAID</span>`;
                    if (inst.status === INSTALLMENT_STATUS.PAID) instBadge = `<span class="badge badge-success">✓ LUNAS</span>`;
                    if (inst.status === INSTALLMENT_STATUS.PARTIALLY_PAID) instBadge = `<span class="badge badge-warning">PARTIAL</span>`;
                    if (inst.status === INSTALLMENT_STATUS.OVERDUE) instBadge = `<span class="badge badge-danger">⚠️ OVERDUE</span>`;

                    return `
                      <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.5rem 0.75rem; font-weight: 700;">Ke-${inst.installment_number}</td>
                        <td style="padding: 0.5rem 0.75rem;">${inst.due_date}</td>
                        <td style="padding: 0.5rem 0.75rem; text-align: right;">Rp ${inst.principal.toLocaleString('id-ID')}</td>
                        <td style="padding: 0.5rem 0.75rem; text-align: right;">Rp ${inst.interest.toLocaleString('id-ID')}</td>
                        <td style="padding: 0.5rem 0.75rem; text-align: right; font-weight: 700; color: var(--primary-700);">Rp ${inst.total_due.toLocaleString('id-ID')}</td>
                        <td style="padding: 0.5rem 0.75rem; text-align: right;">Rp ${inst.paid_amount.toLocaleString('id-ID')}</td>
                        <td style="padding: 0.5rem 0.75rem;">${instBadge}</td>
                        <td style="padding: 0.5rem 0.75rem; text-align: right;">
                          ${inst.status !== INSTALLMENT_STATUS.PAID ? `
                            <button class="btn btn-sm btn-primary pay-modal-direct-btn" data-loan-id="${loan.id}" data-inst-id="${inst.id}">
                              💵 Bayar
                            </button>
                          ` : `
                            <span style="font-size: 0.7rem; color: var(--text-tertiary);">${inst.payment_receipt || 'Lunas'}</span>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md); font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 1.5rem; text-align: center;">
              Jadwal angsuran akan diaktifkan setelah pinjaman disetujui dan dicairkan.
            </div>
          `}

          <!-- Audit Trail History -->
          <h4 style="margin: 0 0 0.75rem 0; font-size: 1rem; color: var(--text-primary);">
            📜 Riwayat Perubahan Status (Audit Trail)
          </h4>
          <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.775rem;">
            ${history.map(h => `
              <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px dashed var(--border-color);">
                <div>
                  <span style="font-weight: 700; color: var(--text-primary);">${h.new_status}</span>
                  <span style="color: var(--text-tertiary); margin-left: 0.5rem;">oleh ${h.changed_by_name || h.changed_by}</span>
                  <div style="color: var(--text-secondary); margin-top: 0.15rem;">${h.notes || '-'}</div>
                </div>
                <div style="color: var(--text-tertiary); white-space: nowrap;">
                  ${new Date(h.timestamp).toLocaleString('id-ID')}
                </div>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
            <button class="btn btn-secondary close-modal-btn">Tutup</button>
          </div>

        </div>
      </div>
    `;

    modalContainer.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modalContainer.innerHTML = '';
      });
    });

    modalContainer.querySelectorAll('.pay-modal-direct-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const lId = btn.dataset.loanId;
        const iId = btn.dataset.instId;
        await openPaymentModal(lId, iId);
      });
    });
  }

  async function openApproveModal(loanId) {
    const modalContainer = container.querySelector('#loan-modal-container');
    const details = await loanService.getLoanDetails(loanId);
    if (!details) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
        <div class="modal-content animate-slide-up" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 500px; width: 100%; padding: 1.75rem; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color);">
          <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; color: var(--text-primary);">
            ✓ Persetujuan Pinjaman (Loan Approval)
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Anda akan menyetujui pengajuan pinjaman <strong>${details.loan.loan_number}</strong> atas nama <strong>${details.member ? details.member.full_name : '-'}</strong> sebesar <strong>Rp ${details.loan.principal_amount.toLocaleString('id-ID')}</strong>.
          </p>

          <form id="approve-form">
            <div class="form-group">
              <label class="form-label">Catatan Persetujuan / Rekomendasi Komite</label>
              <textarea id="approval-notes" class="form-control" rows="3" placeholder="Contoh: Berkas dan kemampuan bayar DSR terverifikasi layak."></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
              <button type="button" class="btn btn-secondary close-modal-btn">Batal</button>
              <button type="submit" class="btn btn-success">✓ Konfirmasi Setujui</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalContainer.querySelector('.close-modal-btn').addEventListener('click', () => modalContainer.innerHTML = '');
    modalContainer.querySelector('#approve-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const notes = modalContainer.querySelector('#approval-notes').value;
      try {
        await loanService.approveLoan(loanId, user, notes);
        alert('✓ Pinjaman berhasil disetujui.');
        modalContainer.innerHTML = '';
        render();
      } catch (err) {
        alert(`Gagal menyetujui: ${err.message}`);
      }
    });
  }

  async function openRejectModal(loanId) {
    const modalContainer = container.querySelector('#loan-modal-container');
    const details = await loanService.getLoanDetails(loanId);
    if (!details) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
        <div class="modal-content animate-slide-up" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 500px; width: 100%; padding: 1.75rem; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color);">
          <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; color: var(--danger);">
            ✕ Penolakan Pinjaman (Loan Rejection)
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Tolak pengajuan pinjaman <strong>${details.loan.loan_number}</strong> atas nama <strong>${details.member ? details.member.full_name : '-'}</strong>.
          </p>

          <form id="reject-form">
            <div class="form-group">
              <label class="form-label required">Alasan Penolakan</label>
              <textarea id="rejection-reason" class="form-control" rows="3" placeholder="Sebutkan alasan penolakan secara jelas..." required></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
              <button type="button" class="btn btn-secondary close-modal-btn">Batal</button>
              <button type="submit" class="btn btn-danger">✕ Konfirmasi Tolak</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalContainer.querySelector('.close-modal-btn').addEventListener('click', () => modalContainer.innerHTML = '');
    modalContainer.querySelector('#reject-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const reason = modalContainer.querySelector('#rejection-reason').value;
      try {
        await loanService.rejectLoan(loanId, user, reason);
        alert('Pengajuan pinjaman telah ditolak.');
        modalContainer.innerHTML = '';
        render();
      } catch (err) {
        alert(`Gagal menolak: ${err.message}`);
      }
    });
  }

  async function openDisburseModal(loanId) {
    const modalContainer = container.querySelector('#loan-modal-container');
    const details = await loanService.getLoanDetails(loanId);
    if (!details) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
        <div class="modal-content animate-slide-up" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 550px; width: 100%; padding: 1.75rem; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color);">
          <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; color: var(--text-primary);">
            💸 Pencairan Dana Pinjaman (Loan Disbursement)
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Pencairan akan mengaktifkan pinjaman dan membentuk jadwal angsuran resmi untuk pinjaman <strong>${details.loan.loan_number}</strong> sebesar <strong>Rp ${details.loan.principal_amount.toLocaleString('id-ID')}</strong>.
          </p>

          <form id="disburse-form">
            <div class="form-group">
              <label class="form-label required">Tanggal Pencairan</label>
              <input type="date" id="disburse-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required />
            </div>

            <div class="form-group">
              <label class="form-label required">Metode Penyaluran Dana</label>
              <select id="disburse-method" class="form-control" required>
                <option value="KAS_KOPERASI">Tunai / Kas Koperasi</option>
                <option value="TRANSFER_BANK_BJB">Transfer Rekening Bank BJB</option>
                <option value="TRANSFER_BANK_BRI">Transfer Rekening Bank BRI</option>
                <option value="TRANSFER_BANK_BSI">Transfer Rekening Bank BSI (Syariah)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Catatan / Bukti Nomor Transaksi</label>
              <input type="text" id="disburse-notes" class="form-control" placeholder="Contoh: No. Ref Trf 2026/IKMI/009" />
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
              <button type="button" class="btn btn-secondary close-modal-btn">Batal</button>
              <button type="submit" class="btn btn-primary">💸 Konfirmasi Cairkan Dana</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalContainer.querySelector('.close-modal-btn').addEventListener('click', () => modalContainer.innerHTML = '');
    modalContainer.querySelector('#disburse-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const disbursement_date = modalContainer.querySelector('#disburse-date').value;
      const disbursement_method = modalContainer.querySelector('#disburse-method').value;
      const notes = modalContainer.querySelector('#disburse-notes').value;

      try {
        const res = await loanService.disburseLoan(loanId, user, {
          disbursement_date,
          disbursement_method,
          notes
        });
        alert(`✓ Pinjaman berhasil dicairkan! Sebanyak ${res.installments.length} jadwal angsuran telah diaktifkan.`);
        modalContainer.innerHTML = '';
        render();
      } catch (err) {
        alert(`Gagal mencairkan: ${err.message}`);
      }
    });
  }

  async function openPaymentModal(loanId, installmentId) {
    const modalContainer = container.querySelector('#loan-modal-container');
    const details = await loanService.getLoanDetails(loanId);
    if (!details) return;

    const installment = details.installments.find(i => i.id === installmentId);
    if (!installment) return;

    const remaining = installment.getRemainingDue();

    modalContainer.innerHTML = `
      <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
        <div class="modal-content animate-slide-up" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 520px; width: 100%; padding: 1.75rem; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color);">
          <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; color: var(--text-primary);">
            💵 Catat Pembayaran Angsuran
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Peminjam: <strong>${details.member ? details.member.full_name : '-'}</strong> &bull; Angsuran ke-<strong>${installment.installment_number}</strong> (Jatuh Tempo: ${installment.due_date})
          </p>

          <div style="background: var(--bg-subtle); padding: 0.85rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; font-size: 0.825rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span style="color: var(--text-tertiary);">Total Tagihan Angsuran:</span>
              <strong>Rp ${installment.total_due.toLocaleString('id-ID')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span style="color: var(--text-tertiary);">Sudah Dibayar:</span>
              <span style="color: var(--success-text);">Rp ${installment.paid_amount.toLocaleString('id-ID')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 0.35rem; font-weight: 700;">
              <span style="color: var(--text-primary);">Sisa Tagihan:</span>
              <span style="color: var(--primary-700); font-size: 1rem;">Rp ${remaining.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <form id="payment-form">
            <div class="form-group">
              <label class="form-label required">Jumlah Pembayaran (Rp)</label>
              <input type="number" id="pay-amount" class="form-control" value="${remaining}" min="1000" max="${remaining}" step="1000" required />
            </div>

            <div class="form-group">
              <label class="form-label required">Metode Pembayaran</label>
              <select id="pay-method" class="form-control" required>
                <option value="TUNAI">Tunai / Teller Koperasi</option>
                <option value="TRANSFER_BANK">Transfer Bank</option>
                <option value="POTONG_GAJI">Potong Gaji Otomatis</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Catatan Transaksi</label>
              <input type="text" id="pay-notes" class="form-control" placeholder="Contoh: Pembayaran tepat waktu" />
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
              <button type="button" class="btn btn-secondary close-modal-btn">Batal</button>
              <button type="submit" class="btn btn-success">💾 Simpan Pembayaran</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalContainer.querySelector('.close-modal-btn').addEventListener('click', () => modalContainer.innerHTML = '');
    modalContainer.querySelector('#payment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const paid_amount = Number(modalContainer.querySelector('#pay-amount').value);
      const payment_method = modalContainer.querySelector('#pay-method').value;
      const notes = modalContainer.querySelector('#pay-notes').value;

      try {
        const result = await loanService.recordInstallmentPayment(installmentId, user, {
          paid_amount,
          payment_method,
          notes
        });

        if (result.isPaidOff) {
          alert(`🎉 SELURUH ANGSURAN LUNAS! Status pinjaman telah otomatis diperbarui menjadi LUNAS (PAID_OFF). No. Kuitansi: ${result.receiptNumber}`);
        } else {
          alert(`✓ Pembayaran angsuran sebesar Rp ${paid_amount.toLocaleString('id-ID')} berhasil dicatat. No. Kuitansi: ${result.receiptNumber}`);
        }

        modalContainer.innerHTML = '';
        render();
      } catch (err) {
        alert(`Gagal mencatat pembayaran: ${err.message}`);
      }
    });
  }

  // Initial render
  await render();
}
