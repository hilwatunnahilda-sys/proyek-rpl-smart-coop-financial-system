/**
 * Member Loan Self-Service Portal View
 * Enables members to:
 * - Apply for loans with real-time dynamic calculator (Flat, Declining, Annuity, 0% Syariah)
 * - View own loans & application statuses
 * - View installment schedules & upcoming due dates
 * - View remaining loan balance and payment history
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { LoanService } from '../../core/services/LoanService.js';
import { InterestCalculator } from '../../core/services/InterestCalculator.js';
import { auth } from '../../infrastructure/auth/authService.js';
import { requireAuthorization, enforceMemberDataIsolation } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { ROLES, LOAN_STATUS, INSTALLMENT_STATUS, INTEREST_CALCULATION_TYPE } from '../../config/constants.js';

export async function renderMemberLoanView(container, { user }) {
  requireAuthorization(user, [ROLES.MEMBER, ROLES.ADMIN]);

  const member = auth.getMember();
  if (member) {
    enforceMemberDataIsolation(user, member.user_id);
  }

  const memberId = member ? member.id : `mbr-${user.id}`;
  const loanService = new LoanService();

  let activeTab = 'my-loans'; // 'my-loans' | 'apply-loan'
  let selectedLoanId = null;

  async function render() {
    const memberLoansData = await loanService.getMemberLoans(memberId, user);

    // Compute member loan metrics
    let totalActiveLoans = 0;
    let totalRemainingPrincipal = 0;
    let totalPaidAllTime = 0;
    let totalPendingApplications = 0;

    memberLoansData.forEach(item => {
      const l = item.loan;
      if (l.isActive()) {
        totalActiveLoans++;
        totalRemainingPrincipal += Number(l.remaining_principal || 0);
      }
      if (l.isPending()) {
        totalPendingApplications++;
      }
      totalPaidAllTime += Number(l.paid_amount || 0);
    });

    container.innerHTML = `
      <div class="animate-fade-in" style="padding-bottom: 3rem;">
        
        <!-- Member Hero Banner -->
        <div style="background: linear-gradient(135deg, #0A2540 0%, #2563eb 50%, #4f46e5 100%); border-radius: var(--radius-xl); padding: 2rem; color: #fff; margin-bottom: 1.75rem; box-shadow: var(--shadow-lg); position: relative; overflow: hidden;">
          <div style="position: absolute; right: -20px; bottom: -20px; opacity: 0.08; font-size: 11rem; font-weight: 900; pointer-events: none;">PORTAL</div>
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); padding: 0.3rem 0.85rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #fff; margin-bottom: 0.75rem;">
            <span>👤 PORTAL PINJAMAN & ANGSURAN ANGGOTA</span>
            <span style="opacity: 0.5;">&bull;</span>
            <span>${member ? member.member_number : user.id}</span>
          </div>
          <h2 style="font-size: 1.75rem; color: #fff; margin-bottom: 0.4rem; font-family: 'Outfit', sans-serif;">
            Pinjaman & Jadwal Angsuran Mandiri
          </h2>
          <p style="font-size: 0.875rem; color: rgba(255,255,255,0.9); max-width: 800px; line-height: 1.6;">
            Pantau status pengajuan pinjaman Anda, jadwal pembayaran angsuran berkala per bulan, riwayat transaksi, serta ajukan pembiayaan baru dengan simulasi perhitungan yang transparan.
          </p>
        </div>

        <!-- Metric Highlights -->
        <div class="stats-grid">
          <div class="stat-card" style="--stat-accent: #3b82f6;">
            <div class="stat-info">
              <span class="stat-label">Sisa Pokok Pinjaman</span>
              <span class="stat-value" style="color: var(--primary-600);">Rp ${totalRemainingPrincipal.toLocaleString('id-ID')}</span>
              <span class="stat-subtext">${totalActiveLoans} Fasilitas Pinjaman Aktif</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #10b981;">
            <div class="stat-info">
              <span class="stat-label">Total Telah Dibayar</span>
              <span class="stat-value" style="color: var(--success);">Rp ${totalPaidAllTime.toLocaleString('id-ID')}</span>
              <span class="stat-subtext">Akumulasi Seluruh Pembayaran</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #f59e0b;">
            <div class="stat-info">
              <span class="stat-label">Pengajuan Dalam Proses</span>
              <span class="stat-value" style="color: var(--warning);">${totalPendingApplications}</span>
              <span class="stat-subtext">Menunggu Persetujuan Pengurus</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--warning-light); --stat-icon-color: var(--warning);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 0.75rem 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-sm ${activeTab === 'my-loans' ? 'btn-primary' : 'btn-secondary'} member-tab-nav" data-tab="my-loans">
                💳 Daftar Pinjaman Saya (${memberLoansData.length})
              </button>
              <button class="btn btn-sm ${activeTab === 'apply-loan' ? 'btn-success' : 'btn-secondary'} member-tab-nav" data-tab="apply-loan">
                ➕ Ajukan Pinjaman Baru
              </button>
            </div>
          </div>
        </div>

        <!-- Tab Content -->
        <div id="member-tab-content">
          ${activeTab === 'apply-loan' ? renderApplyLoanForm(member, user) : renderMyLoansList(memberLoansData)}
        </div>

        <!-- Details Modal Container -->
        <div id="member-loan-modal-container"></div>

      </div>
    `;

    attachEvents();
  }

  function renderMyLoansList(loansData) {
    if (!loansData || loansData.length === 0) {
      return `
        <div class="card" style="text-align: center; padding: 3rem 1rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🌱</div>
          <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">Belum Ada Riwayat Pinjaman</h4>
          <p style="margin: 0 0 1.25rem 0; font-size: 0.85rem; color: var(--text-secondary);">Anda belum memiliki fasilitas pinjaman aktif maupun riwayat pengajuan di Koperasi STMIK IKMI.</p>
          <button class="btn btn-primary btn-sm member-tab-nav" data-tab="apply-loan">
            ➕ Ajukan Pinjaman Sekarang
          </button>
        </div>
      `;
    }

    return `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        ${loansData.map(item => {
          const l = item.loan;
          const installments = item.installments;
          const statusBadge = getLoanStatusBadge(l.status);
          const pct = l.getRepaymentProgressPercentage();

          // Find upcoming unpaid installment
          const nextUnpaid = installments.find(i => i.status !== INSTALLMENT_STATUS.PAID);

          return `
            <div class="card" style="transition: all 0.2s;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-primary); font-family: 'Outfit', sans-serif;">
                      ${l.loan_number}
                    </h3>
                    ${statusBadge}
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                    Tujuan: <strong>${l.purpose}</strong> &bull; Diajukan: ${new Date(l.created_at).toLocaleDateString('id-ID')}
                  </div>
                </div>

                <button class="btn btn-sm btn-outline-primary view-detail-btn" data-id="${l.id}">
                  📋 Lihat Jadwal & Riwayat
                </button>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; font-size: 0.825rem; margin-bottom: 1rem;">
                <div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-md);">
                  <div style="color: var(--text-tertiary);">Pokok Pinjaman</div>
                  <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary); margin-top: 0.15rem;">
                    Rp ${l.principal_amount.toLocaleString('id-ID')}
                  </div>
                  <div style="font-size: 0.725rem; color: var(--text-tertiary); margin-top: 0.15rem;">
                    Tenor ${l.tenure} Bulan (${l.interest_type})
                  </div>
                </div>

                <div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-md);">
                  <div style="color: var(--text-tertiary);">Sisa Pokok Pinjaman</div>
                  <div style="font-weight: 800; font-size: 1.1rem; color: ${l.remaining_principal > 0 ? 'var(--warning-dark)' : 'var(--success)'}; margin-top: 0.15rem;">
                    Rp ${l.remaining_principal.toLocaleString('id-ID')}
                  </div>
                  <div style="font-size: 0.725rem; color: var(--text-tertiary); margin-top: 0.15rem;">
                    Total Tagihan: Rp ${l.total_repayment.toLocaleString('id-ID')}
                  </div>
                </div>

                <div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-md);">
                  <div style="color: var(--text-tertiary);">Angsuran Berikutnya</div>
                  <div style="font-weight: 800; font-size: 1.1rem; color: var(--primary-700); margin-top: 0.15rem;">
                    ${nextUnpaid ? `Rp ${nextUnpaid.getRemainingDue().toLocaleString('id-ID')}` : 'Semua Lunas 🎉'}
                  </div>
                  <div style="font-size: 0.725rem; color: var(--text-tertiary); margin-top: 0.15rem;">
                    ${nextUnpaid ? `Jatuh Tempo: ${nextUnpaid.due_date}` : 'Status: Lunas'}
                  </div>
                </div>
              </div>

              <!-- Repayment Progress Bar -->
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
                  <span>Progress Pelunasan Pinjaman</span>
                  <strong>${pct}% (Rp ${l.paid_amount.toLocaleString('id-ID')} / Rp ${l.total_repayment.toLocaleString('id-ID')})</strong>
                </div>
                <div style="height: 8px; background: var(--bg-subtle); border-radius: var(--radius-full); overflow: hidden;">
                  <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, var(--primary-500), var(--success)); transition: width 0.5s;"></div>
                </div>
              </div>

            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderApplyLoanForm(member, user) {
    return `
      <div class="card" style="max-width: 850px; margin: 0 auto; box-shadow: var(--shadow-md);">
        <div class="card-header">
          <h3 class="card-title">
            <span>📝 Formulir Pengajuan Pinjaman Mandiri</span>
          </h3>
          <span class="badge badge-success">SIMULASI REAL-TIME</span>
        </div>

        <form id="member-apply-loan-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <div style="padding: 0.85rem; background: var(--primary-50); border: 1px solid var(--primary-200); border-radius: var(--radius-md); font-size: 0.825rem; color: var(--primary-800);">
            <strong>Peminjam Terverifikasi:</strong> ${member ? member.full_name : user.name} (${member ? `${member.member_type} - ${member.member_number}` : user.role})
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Jumlah Pinjaman yang Diajukan (Rp)</label>
              <input type="number" id="m-principal" class="form-control" placeholder="Min. Rp 500.000" min="500000" max="50000000" step="100000" value="3000000" required />
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Jangka Waktu / Tenor (Bulan)</label>
              <select id="m-tenure" class="form-control" required>
                <option value="3">3 Bulan</option>
                <option value="6" selected>6 Bulan</option>
                <option value="10">10 Bulan</option>
                <option value="12">12 Bulan (1 Tahun)</option>
                <option value="24">24 Bulan (2 Tahun)</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Skema Bunga / Pembiayaan</label>
              <select id="m-interest-type" class="form-control" required>
                <option value="${INTEREST_CALCULATION_TYPE.FLAT}">Bunga Flat (Tetap) - 6% / Tahun</option>
                <option value="${INTEREST_CALCULATION_TYPE.DECLINING}">Bunga Menurun (Efektif) - 6% / Tahun</option>
                <option value="${INTEREST_CALCULATION_TYPE.ZERO_INTEREST}">Bunga 0% (Syariah Qardh Mahasiswa/Staf)</option>
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label required">Tujuan / Keperluan Pinjaman</label>
              <input type="text" id="m-purpose" class="form-control" placeholder="Contoh: Biaya Kuliah / Publikasi Riset" required />
            </div>
          </div>

          <div class="form-group" style="margin: 0;">
            <label class="form-label">Keterangan / Catatan Tambahan (Opsional)</label>
            <textarea id="m-notes" class="form-control" rows="2" placeholder="Informasi tambahan untuk pertimbangan komite..."></textarea>
          </div>

          <!-- Live Calculator Preview Box -->
          <div id="m-simulation-box" style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 1.25rem; border: 1px dashed var(--primary-400);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <strong style="color: var(--primary-700); font-size: 0.9rem;">📊 Rincian Simulasi Angsuran Bulanan Anda</strong>
              <span id="m-sim-badge" class="badge badge-primary">FLAT</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; font-size: 0.8rem;">
              <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-sm);">
                <div style="color: var(--text-tertiary);">Estimasi Cicilan Bulanan</div>
                <div id="m-sim-monthly" style="font-weight: 800; font-size: 1.15rem; color: var(--primary-600); margin-top: 0.2rem;">Rp 0</div>
              </div>
              <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-sm);">
                <div style="color: var(--text-tertiary);">Total Bunga/Jasa</div>
                <div id="m-sim-interest" style="font-weight: 800; font-size: 1.15rem; color: var(--purple-text); margin-top: 0.2rem;">Rp 0</div>
              </div>
              <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-sm);">
                <div style="color: var(--text-tertiary);">Total Pelunasan</div>
                <div id="m-sim-total" style="font-weight: 800; font-size: 1.15rem; color: var(--success-text); margin-top: 0.2rem;">Rp 0</div>
              </div>
            </div>

            <div id="m-sim-table" style="max-height: 180px; overflow-y: auto;"></div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
            <button type="button" class="btn btn-secondary member-tab-nav" data-tab="my-loans">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-submit-member-loan">
              🚀 Kirim Pengajuan Pinjaman
            </button>
          </div>

        </form>
      </div>
    `;
  }

  function getLoanStatusBadge(status) {
    switch (status) {
      case LOAN_STATUS.PENDING:
        return `<span class="badge badge-warning">⏳ DALAM REVIEW</span>`;
      case LOAN_STATUS.APPROVED:
        return `<span class="badge badge-primary">✓ DISETUJUI (SIAP DICAIRKAN)</span>`;
      case LOAN_STATUS.ACTIVE:
      case LOAN_STATUS.DISBURSED:
        return `<span class="badge badge-success">● PINJAMAN AKTIF</span>`;
      case LOAN_STATUS.PAID_OFF:
        return `<span class="badge badge-purple" style="background: #e0e7ff; color: #4338ca;">★ LUNAS</span>`;
      case LOAN_STATUS.REJECTED:
        return `<span class="badge badge-danger">✕ DITOLAK</span>`;
      case LOAN_STATUS.CANCELLED:
        return `<span class="badge badge-neutral">⊘ DIBATALKAN</span>`;
      default:
        return `<span class="badge badge-neutral">${status}</span>`;
    }
  }

  function updateMemberSimulation() {
    const principalInput = container.querySelector('#m-principal');
    const tenureInput = container.querySelector('#m-tenure');
    const typeInput = container.querySelector('#m-interest-type');

    if (!principalInput || !tenureInput || !typeInput) return;

    const principal = Number(principalInput.value) || 0;
    const tenure = parseInt(tenureInput.value, 10) || 1;
    const interestType = typeInput.value;
    const rate = interestType === INTEREST_CALCULATION_TYPE.ZERO_INTEREST ? 0 : 6;

    if (principal <= 0 || tenure <= 0) return;

    try {
      const result = InterestCalculator.generateSchedule({
        principal,
        annualInterestRate: rate,
        tenureMonths: tenure,
        interestType
      });

      const mMonthly = container.querySelector('#m-sim-monthly');
      const mInterest = container.querySelector('#m-sim-interest');
      const mTotal = container.querySelector('#m-sim-total');
      const mBadge = container.querySelector('#m-sim-badge');
      const mTable = container.querySelector('#m-sim-table');

      if (mMonthly) mMonthly.textContent = `Rp ${result.monthly_installment_estimate.toLocaleString('id-ID')}`;
      if (mInterest) mInterest.textContent = `Rp ${result.total_interest.toLocaleString('id-ID')}`;
      if (mTotal) mTotal.textContent = `Rp ${result.total_repayment.toLocaleString('id-ID')}`;
      if (mBadge) mBadge.textContent = interestType;

      if (mTable) {
        mTable.innerHTML = `
          <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; background: var(--bg-surface);">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: var(--bg-subtle);">
                <th style="padding: 0.35rem 0.5rem; text-align: left;">Bulan</th>
                <th style="padding: 0.35rem 0.5rem; text-align: left;">Jatuh Tempo</th>
                <th style="padding: 0.35rem 0.5rem; text-align: right;">Pokok</th>
                <th style="padding: 0.35rem 0.5rem; text-align: right;">Bunga/Jasa</th>
                <th style="padding: 0.35rem 0.5rem; text-align: right;">Total Angsuran</th>
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
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } catch (e) {
      console.warn('Simulation error:', e);
    }
  }

  function attachEvents() {
    container.querySelectorAll('.member-tab-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        render();
      });
    });

    if (activeTab === 'apply-loan') {
      const inputs = ['#m-principal', '#m-tenure', '#m-interest-type'];
      inputs.forEach(sel => {
        const el = container.querySelector(sel);
        if (el) {
          el.addEventListener('input', updateMemberSimulation);
          el.addEventListener('change', updateMemberSimulation);
        }
      });
      updateMemberSimulation();

      const form = container.querySelector('#member-apply-loan-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const principal_amount = Number(container.querySelector('#m-principal').value);
          const tenure = parseInt(container.querySelector('#m-tenure').value, 10);
          const interest_type = container.querySelector('#m-interest-type').value;
          const purpose = container.querySelector('#m-purpose').value;
          const notes = container.querySelector('#m-notes').value;
          const rate = interest_type === INTEREST_CALCULATION_TYPE.ZERO_INTEREST ? 0 : 6;

          try {
            const res = await loanService.applyLoan({
              member_id: memberId,
              principal_amount,
              tenure,
              interest_type,
              interest_rate: rate,
              purpose,
              notes,
              created_by: user.id,
              created_by_name: member ? member.full_name : user.name
            });

            alert(`✓ Pengajuan pinjaman ${res.loan_number} berhasil dikirim! Silakan menunggu review dari pengurus koperasi.`);
            activeTab = 'my-loans';
            render();
          } catch (err) {
            alert(`Gagal mengirim pengajuan: ${err.message}`);
          }
        });
      }
    }

    container.querySelectorAll('.view-detail-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await openMemberLoanDetailModal(id);
      });
    });
  }

  async function openMemberLoanDetailModal(loanId) {
    const modalContainer = container.querySelector('#member-loan-modal-container');
    const details = await loanService.getLoanDetails(loanId, user);
    if (!details) return;

    const { loan, installments, history } = details;

    modalContainer.innerHTML = `
      <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
        <div class="modal-content animate-slide-up" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 850px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 2rem; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color);">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <h3 style="margin: 0; font-size: 1.35rem; color: var(--text-primary); font-family: 'Outfit', sans-serif;">
                  Pinjaman: ${loan.loan_number}
                </h3>
                ${getLoanStatusBadge(loan.status)}
              </div>
              <p style="margin: 0.25rem 0 0 0; font-size: 0.825rem; color: var(--text-tertiary);">
                Tujuan: <strong>${loan.purpose}</strong> &bull; Tenor: ${loan.tenure} Bulan
              </p>
            </div>
            <button class="btn btn-sm btn-secondary close-m-modal-btn">✕ Tutup</button>
          </div>

          <!-- Quick Metrics -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; font-size: 0.825rem;">
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <span style="color: var(--text-tertiary);">Pokok Pinjaman</span>
              <div style="font-weight: 800; font-size: 1.1rem; color: var(--primary-700);">Rp ${loan.principal_amount.toLocaleString('id-ID')}</div>
            </div>
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <span style="color: var(--text-tertiary);">Sisa Pokok</span>
              <div style="font-weight: 800; font-size: 1.1rem; color: var(--warning-dark);">Rp ${loan.remaining_principal.toLocaleString('id-ID')}</div>
            </div>
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <span style="color: var(--text-tertiary);">Total Terbayar</span>
              <div style="font-weight: 800; font-size: 1.1rem; color: var(--success-text);">Rp ${loan.paid_amount.toLocaleString('id-ID')}</div>
            </div>
          </div>

          <!-- Schedule Table -->
          <h4 style="margin: 0 0 0.75rem 0; font-size: 1rem; color: var(--text-primary);">
            📅 Jadwal Angsuran & Riwayat Pembayaran
          </h4>

          ${installments.length > 0 ? `
            <div class="table-responsive" style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 1.5rem;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                <thead>
                  <tr style="background: var(--bg-subtle); border-bottom: 1px solid var(--border-color); text-align: left;">
                    <th style="padding: 0.5rem 0.75rem;">Bulan Ke</th>
                    <th style="padding: 0.5rem 0.75rem;">Jatuh Tempo</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right;">Pokok</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right;">Bunga/Jasa</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right;">Total Tagihan</th>
                    <th style="padding: 0.5rem 0.75rem;">Status</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right;">No. Kuitansi</th>
                  </tr>
                </thead>
                <tbody>
                  ${installments.map(inst => {
                    let stBadge = `<span class="badge badge-neutral">Belum Bayar</span>`;
                    if (inst.status === INSTALLMENT_STATUS.PAID) stBadge = `<span class="badge badge-success">✓ Lunas</span>`;
                    if (inst.status === INSTALLMENT_STATUS.OVERDUE) stBadge = `<span class="badge badge-danger">⚠️ Menunggak</span>`;

                    return `
                      <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.5rem 0.75rem; font-weight: 700;">Ke-${inst.installment_number}</td>
                        <td style="padding: 0.5rem 0.75rem;">${inst.due_date}</td>
                        <td style="padding: 0.5rem 0.75rem; text-align: right;">Rp ${inst.principal.toLocaleString('id-ID')}</td>
                        <td style="padding: 0.5rem 0.75rem; text-align: right;">Rp ${inst.interest.toLocaleString('id-ID')}</td>
                        <td style="padding: 0.5rem 0.75rem; text-align: right; font-weight: 700; color: var(--primary-700);">Rp ${inst.total_due.toLocaleString('id-ID')}</td>
                        <td style="padding: 0.5rem 0.75rem;">${stBadge}</td>
                        <td style="padding: 0.5rem 0.75rem; text-align: right; font-family: monospace; color: var(--text-tertiary);">
                          ${inst.payment_receipt || '-'}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md); font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 1.5rem; text-align: center;">
              Jadwal angsuran akan tampil setelah pengajuan pinjaman disetujui dan dicairkan.
            </div>
          `}

          <!-- Status Audit Trail -->
          <h4 style="margin: 0 0 0.75rem 0; font-size: 1rem; color: var(--text-primary);">
            📜 Riwayat Status Pengajuan
          </h4>
          <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.775rem;">
            ${history.map(h => `
              <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px dashed var(--border-color);">
                <div>
                  <strong>${h.new_status}</strong>: ${h.notes || '-'}
                </div>
                <div style="color: var(--text-tertiary);">
                  ${new Date(h.timestamp).toLocaleDateString('id-ID')}
                </div>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
            <button class="btn btn-secondary close-m-modal-btn">Tutup</button>
          </div>

        </div>
      </div>
    `;

    modalContainer.querySelectorAll('.close-m-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modalContainer.innerHTML = '';
      });
    });
  }

  // Initial render
  await render();
}
