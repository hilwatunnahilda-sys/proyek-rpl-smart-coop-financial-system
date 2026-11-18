/**
 * Member Self-Service Financial Transactions History View
 * Enforces Member Data Isolation: Members only view their own transactions (Savings, Loans, Installments)
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { FinancialTransactionService } from '../../core/services/FinancialTransactionService.js';
import { auth } from '../../infrastructure/auth/authService.js';
import { requireAuthorization, enforceMemberDataIsolation } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { ROLES, FINANCIAL_TRANSACTION_TYPES, TRANSACTION_FLOW } from '../../config/constants.js';

export async function renderMemberTransactionView(container, { user }) {
  requireAuthorization(user, [ROLES.MEMBER, ROLES.ADMIN]);

  const member = auth.getMember();
  if (member) {
    enforceMemberDataIsolation(user, member.user_id);
  }

  const memberId = member ? member.id : `mbr-${user.id}`;
  const transactionService = new FinancialTransactionService();

  let currentPage = 1;
  const pageLimit = 10;
  let startDate = '';
  let endDate = '';
  let transactionType = '';
  let searchQuery = '';

  async function render() {
    const result = await transactionService.getTransactions({
      page: currentPage,
      limit: pageLimit,
      memberId: memberId,
      startDate: startDate || null,
      endDate: endDate || null,
      transactionType: transactionType || null,
      search: searchQuery || null
    }, user);

    const { items, total, totalPages, summary } = result;

    container.innerHTML = `
      <div class="animate-fade-in" style="padding-bottom: 3rem;">
        
        <!-- Hero Header -->
        <div style="background: linear-gradient(135deg, #0A2540 0%, #2563eb 50%, #0284c7 100%); border-radius: var(--radius-xl); padding: 2rem; color: #fff; margin-bottom: 1.75rem; box-shadow: var(--shadow-lg); position: relative; overflow: hidden;">
          <div style="position: absolute; right: -20px; bottom: -20px; opacity: 0.08; font-size: 11rem; font-weight: 900; pointer-events: none;">MUTASI</div>
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); padding: 0.3rem 0.85rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #fff; margin-bottom: 0.75rem;">
            <span>📜 HISTORI & BUKU MUTASI ANGGOTA</span>
            <span style="opacity: 0.5;">&bull;</span>
            <span>${member ? member.member_number : user.id}</span>
          </div>
          <h2 style="font-size: 1.75rem; color: #fff; margin-bottom: 0.4rem; font-family: 'Outfit', sans-serif;">
            Riwayat Mutasi & Transaksi Keuangan Saya
          </h2>
          <p style="font-size: 0.875rem; color: rgba(255,255,255,0.9); max-width: 800px; line-height: 1.6;">
            Lacak seluruh aktivitas keuangan Anda secara transparan: setoran dan penarikan simpanan, pencairan pinjaman, hingga riwayat pembayaran cicilan angsuran bulanan.
          </p>
        </div>

        <!-- Metric Highlights -->
        <div class="stats-grid">
          <div class="stat-card" style="--stat-accent: #10b981;">
            <div class="stat-info">
              <span class="stat-label">Total Setoran & Angsuran Masuk</span>
              <span class="stat-value" style="color: var(--success);">Rp ${summary.totalInflow.toLocaleString('id-ID')}</span>
              <span class="stat-subtext">Akumulasi Transaksi Masuk</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #3b82f6;">
            <div class="stat-info">
              <span class="stat-label">Total Pinjaman & Penarikan Keluar</span>
              <span class="stat-value" style="color: var(--primary-600);">Rp ${summary.totalOutflow.toLocaleString('id-ID')}</span>
              <span class="stat-subtext">Akumulasi Transaksi Diterima</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #8b5cf6;">
            <div class="stat-info">
              <span class="stat-label">Jumlah Catatan Mutasi</span>
              <span class="stat-value" style="color: var(--purple);">${total}</span>
              <span class="stat-subtext">Tercatat dalam Buku Kas Resmi</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--purple-light); --stat-icon-color: var(--purple);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>
            </div>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 1rem 1.25rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; align-items: end;">
            
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.75rem;">Cari Mutasi</label>
              <input type="text" id="m-filter-search" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;" placeholder="Cari No. TRX / Keterangan..." value="${searchQuery}" />
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.75rem;">Dari Tanggal</label>
              <input type="date" id="m-filter-start" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;" value="${startDate}" />
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.75rem;">Sampai Tanggal</label>
              <input type="date" id="m-filter-end" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;" value="${endDate}" />
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.75rem;">Jenis Transaksi</label>
              <select id="m-filter-type" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;">
                <option value="">Semua Transaksi</option>
                <option value="${FINANCIAL_TRANSACTION_TYPES.SAVING_DEPOSIT}" ${transactionType === FINANCIAL_TRANSACTION_TYPES.SAVING_DEPOSIT ? 'selected' : ''}>Setoran Simpanan</option>
                <option value="${FINANCIAL_TRANSACTION_TYPES.SAVING_WITHDRAWAL}" ${transactionType === FINANCIAL_TRANSACTION_TYPES.SAVING_WITHDRAWAL ? 'selected' : ''}>Penarikan Simpanan</option>
                <option value="${FINANCIAL_TRANSACTION_TYPES.LOAN_DISBURSEMENT}" ${transactionType === FINANCIAL_TRANSACTION_TYPES.LOAN_DISBURSEMENT ? 'selected' : ''}>Pencairan Pinjaman</option>
                <option value="${FINANCIAL_TRANSACTION_TYPES.INSTALLMENT_PAYMENT}" ${transactionType === FINANCIAL_TRANSACTION_TYPES.INSTALLMENT_PAYMENT ? 'selected' : ''}>Pembayaran Angsuran</option>
              </select>
            </div>

            <div>
              <button class="btn btn-sm btn-secondary" id="m-btn-reset" style="width: 100%;">
                ↺ Reset
              </button>
            </div>

          </div>
        </div>

        <!-- Transactions Table -->
        <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 1.25rem;">
          <div class="table-responsive">
            <table class="table" style="margin: 0; width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="background: var(--bg-subtle); border-bottom: 2px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.85rem 1rem;">No. Transaksi</th>
                  <th style="padding: 0.85rem 1rem;">Tanggal & Waktu</th>
                  <th style="padding: 0.85rem 1rem;">Jenis & Kategori</th>
                  <th style="padding: 0.85rem 1rem;">Keterangan</th>
                  <th style="padding: 0.85rem 1rem; text-align: right;">Nominal</th>
                  <th style="padding: 0.85rem 1rem; text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${items.length > 0 ? items.map(item => {
                  const t = item.transaction;
                  const isIn = t.flow === TRANSACTION_FLOW.IN;

                  return `
                    <tr style="border-bottom: 1px solid var(--border-color);" class="table-row-hover">
                      <td style="padding: 0.85rem 1rem; font-family: monospace; font-weight: 700; color: var(--primary-700);">
                        ${t.transaction_number}
                      </td>
                      <td style="padding: 0.85rem 1rem; color: var(--text-secondary); font-size: 0.8rem;">
                        ${new Date(t.transaction_date).toLocaleString('id-ID')}
                      </td>
                      <td style="padding: 0.85rem 1rem;">
                        <span class="badge ${isIn ? 'badge-success' : 'badge-primary'}" style="font-size: 0.7rem;">
                          ${t.transaction_type}
                        </span>
                        <div style="font-size: 0.725rem; color: var(--text-tertiary); margin-top: 0.2rem;">
                          ${t.category}
                        </div>
                      </td>
                      <td style="padding: 0.85rem 1rem;">
                        <div style="font-weight: 600; color: var(--text-primary);">
                          ${t.description}
                        </div>
                        <div style="font-size: 0.725rem; color: var(--text-tertiary);">
                          Ref: ${t.reference_id || '-'}
                        </div>
                      </td>
                      <td style="padding: 0.85rem 1rem; text-align: right;">
                        <div style="font-weight: 800; color: ${isIn ? 'var(--success)' : 'var(--primary-600)'}; font-size: 0.95rem;">
                          ${isIn ? '+' : '-'} Rp ${t.amount.toLocaleString('id-ID')}
                        </div>
                      </td>
                      <td style="padding: 0.85rem 1rem; text-align: right;">
                        <button class="btn btn-sm btn-secondary m-view-detail-btn" data-id="${t.id}">
                          👁️ Rincian
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="6" style="padding: 3rem 1rem; text-align: center; color: var(--text-tertiary);">
                      <div style="font-size: 2rem; margin-bottom: 0.5rem;">📭</div>
                      Tidak ada riwayat transaksi keuangan yang ditemukan.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          ${totalPages > 1 ? `
            <div style="padding: 0.85rem 1.25rem; background: var(--bg-subtle); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
              <div>Halaman <strong>${currentPage}</strong> dari <strong>${totalPages}</strong></div>
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-sm btn-secondary m-page-prev" ${currentPage <= 1 ? 'disabled' : ''}>
                  ◀ Sebelumnya
                </button>
                <button class="btn btn-sm btn-secondary m-page-next" ${currentPage >= totalPages ? 'disabled' : ''}>
                  Berikutnya ▶
                </button>
              </div>
            </div>
          ` : ''}

        </div>

        <!-- Detail Modal Container -->
        <div id="m-trx-modal-container"></div>

      </div>
    `;

    attachMemberEvents();
  }

  function attachMemberEvents() {
    const searchInput = container.querySelector('#m-filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        render();
      });
    }

    const startInput = container.querySelector('#m-filter-start');
    if (startInput) {
      startInput.addEventListener('change', (e) => {
        startDate = e.target.value;
        currentPage = 1;
        render();
      });
    }

    const endInput = container.querySelector('#m-filter-end');
    if (endInput) {
      endInput.addEventListener('change', (e) => {
        endDate = e.target.value;
        currentPage = 1;
        render();
      });
    }

    const typeSelect = container.querySelector('#m-filter-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        transactionType = e.target.value;
        currentPage = 1;
        render();
      });
    }

    const resetBtn = container.querySelector('#m-btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        startDate = '';
        endDate = '';
        transactionType = '';
        searchQuery = '';
        currentPage = 1;
        render();
      });
    }

    const prevBtn = container.querySelector('.m-page-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          render();
        }
      });
    }

    const nextBtn = container.querySelector('.m-page-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentPage++;
        render();
      });
    }

    container.querySelectorAll('.m-view-detail-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await openMemberTrxDetailModal(id);
      });
    });
  }

  async function openMemberTrxDetailModal(trxId) {
    const modalContainer = container.querySelector('#m-trx-modal-container');
    const details = await transactionService.getTransactionDetails(trxId, user);
    if (!details) return;

    const t = details.transaction;
    const isIn = t.flow === TRANSACTION_FLOW.IN;

    modalContainer.innerHTML = `
      <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
        <div class="modal-content animate-slide-up" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 520px; width: 100%; padding: 2rem; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color);">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">BUKTI TRANSAKSI ANGGOTA</div>
              <h3 style="margin: 0.2rem 0 0 0; font-size: 1.25rem; color: var(--text-primary); font-family: monospace;">
                ${t.transaction_number}
              </h3>
            </div>
            <button class="btn btn-sm btn-secondary close-m-modal-btn">✕</button>
          </div>

          <div style="background: ${isIn ? 'var(--success-light)' : 'var(--primary-50)'}; border: 1px solid ${isIn ? 'var(--success-border)' : 'var(--primary-200)'}; border-radius: var(--radius-lg); padding: 1.25rem; text-align: center; margin-bottom: 1.25rem;">
            <div style="font-size: 0.8rem; font-weight: 700; color: ${isIn ? 'var(--success-text)' : 'var(--primary-700)'};">
              ${isIn ? 'MUTASI SETORAN / PEMBAYARAN' : 'MUTASI PENERIMAAN DANA'}
            </div>
            <div style="font-size: 1.8rem; font-weight: 900; color: ${isIn ? 'var(--success)' : 'var(--primary-700)'}; margin: 0.25rem 0;">
              ${isIn ? '+' : '-'} Rp ${t.amount.toLocaleString('id-ID')}
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.825rem; margin-bottom: 1.5rem; background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md);">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-tertiary);">Jenis:</span>
              <strong>${t.transaction_type}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-tertiary);">Kategori:</span>
              <span>${t.category}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-tertiary);">Deskripsi:</span>
              <strong>${t.description}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-tertiary);">Waktu:</span>
              <span>${new Date(t.transaction_date).toLocaleString('id-ID')}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-tertiary);">No. Referensi:</span>
              <code>${t.reference_id || '-'}</code>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <button class="btn btn-secondary close-m-modal-btn">Tutup</button>
          </div>

        </div>
      </div>
    `;

    modalContainer.querySelectorAll('.close-m-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
  }

  await render();
}
