/**
 * General Financial Transactions Ledger View
 * Features: Structured Ledger, Date Filter, Type Filter, Search, Pagination,
 * Transaction Details, Income/Expense Entry Modals, and Reversal Workflows
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { FinancialTransactionService } from '../../core/services/FinancialTransactionService.js';
import { requireAuthorization } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { ROLES, FINANCIAL_TRANSACTION_TYPES, TRANSACTION_FLOW, TRANSACTION_REFERENCE_TYPES } from '../../config/constants.js';

export async function renderTransactionListView(container, { user }) {
  requireAuthorization(user, [ROLES.ADMIN, ROLES.CHAIRMAN]);

  const transactionService = new FinancialTransactionService();
  const isAdmin = user.role === ROLES.ADMIN;

  let currentPage = 1;
  const pageLimit = 10;
  let startDate = '';
  let endDate = '';
  let transactionType = '';
  let flowFilter = '';
  let searchQuery = '';

  async function render() {
    const result = await transactionService.getTransactions({
      page: currentPage,
      limit: pageLimit,
      startDate: startDate || null,
      endDate: endDate || null,
      transactionType: transactionType || null,
      flow: flowFilter || null,
      search: searchQuery || null
    });

    const metrics = await transactionService.getCashMetrics();
    const { items, total, totalPages, summary } = result;

    container.innerHTML = `
      <div class="animate-fade-in" style="padding-bottom: 3rem;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #0A2540 0%, #1e3a8a 50%, #0369a1 100%); border-radius: var(--radius-xl); padding: 2rem; color: #fff; margin-bottom: 1.75rem; box-shadow: var(--shadow-lg); position: relative; overflow: hidden;">
          <div style="position: absolute; right: -20px; bottom: -20px; opacity: 0.08; font-size: 11rem; font-weight: 900; pointer-events: none;">LEDGER</div>
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); padding: 0.3rem 0.85rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #e0f2fe; margin-bottom: 0.75rem;">
            <span>📒 BUKU KAS & MUTASI TRANSAKSI RESMI</span>
            <span style="opacity: 0.5;">&bull;</span>
            <span>STMIK IKMI CIREBON</span>
          </div>
          <h2 style="font-size: 1.75rem; color: #fff; margin-bottom: 0.4rem; font-family: 'Outfit', sans-serif;">
            Buku Kas Umum & Transaksi Keuangan
          </h2>
          <p style="font-size: 0.875rem; color: rgba(255,255,255,0.9); max-width: 820px; line-height: 1.6;">
            Pencatatan seluruh arus transaksi keuangan koperasi secara terstruktur, terenkripsi, dan immutable. Mencakup mutasi simpanan, pencairan & angsuran pinjaman, pendapatan/beban operasional, serta koreksi reversal.
          </p>

          ${!isAdmin ? `
            <div style="margin-top: 1rem; display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(16, 185, 129, 0.25); padding: 0.4rem 0.85rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600; color: #a7f3d0;">
              <span>👁️ Mode Pengawasan Eksekutif (Read-Only)</span>
            </div>
          ` : ''}
        </div>

        <!-- Metric Highlight Cards -->
        <div class="stats-grid">
          <div class="stat-card" style="--stat-accent: #10b981;">
            <div class="stat-info">
              <span class="stat-label">Total Kas Masuk (Inflow)</span>
              <span class="stat-value" style="color: var(--success);">Rp ${metrics.totalInflow.toLocaleString('id-ID')}</span>
              <span class="stat-subtext">Setoran, Angsuran & Pemasukan</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #ef4444;">
            <div class="stat-info">
              <span class="stat-label">Total Kas Keluar (Outflow)</span>
              <span class="stat-value" style="color: var(--danger);">Rp ${metrics.totalOutflow.toLocaleString('id-ID')}</span>
              <span class="stat-subtext">Penarikan, Pencairan & Beban</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--danger-light); --stat-icon-color: var(--danger);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #3b82f6;">
            <div class="stat-info">
              <span class="stat-label">Saldo Kas Bersih (Net)</span>
              <span class="stat-value" style="color: ${metrics.netCashBalance >= 0 ? 'var(--primary-600)' : 'var(--danger)'};">
                Rp ${metrics.netCashBalance.toLocaleString('id-ID')}
              </span>
              <span class="stat-subtext">Posisi Likuiditas Kas Koperasi</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #8b5cf6;">
            <div class="stat-info">
              <span class="stat-label">Total Transaksi</span>
              <span class="stat-value" style="color: var(--purple);">${metrics.totalTransactionsCount}</span>
              <span class="stat-subtext">${metrics.totalReversalsCount} Reversal / Penyesuaian</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--purple-light); --stat-icon-color: var(--purple);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            </div>
          </div>
        </div>

        <!-- Filter Bar & Action Controls -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 1.25rem;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>🔍 Filter & Pencarian Buku Kas</span>
            </div>

            ${isAdmin ? `
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-sm btn-success" id="btn-add-income">
                  ➕ Catat Pemasukan (Income)
                </button>
                <button class="btn btn-sm btn-danger" id="btn-add-expense">
                  ➖ Catat Pengeluaran (Expense)
                </button>
              </div>
            ` : ''}
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; align-items: end;">
            
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.75rem;">Kata Kunci / Pencarian</label>
              <input type="text" id="filter-search" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;" placeholder="No. TRX / Deskripsi / Anggota..." value="${searchQuery}" />
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.75rem;">Dari Tanggal</label>
              <input type="date" id="filter-start-date" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;" value="${startDate}" />
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.75rem;">Sampai Tanggal</label>
              <input type="date" id="filter-end-date" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;" value="${endDate}" />
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.75rem;">Jenis Transaksi</label>
              <select id="filter-type" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;">
                <option value="">Semua Jenis Transaksi</option>
                <option value="${FINANCIAL_TRANSACTION_TYPES.SAVING_DEPOSIT}" ${transactionType === FINANCIAL_TRANSACTION_TYPES.SAVING_DEPOSIT ? 'selected' : ''}>Setoran Simpanan</option>
                <option value="${FINANCIAL_TRANSACTION_TYPES.SAVING_WITHDRAWAL}" ${transactionType === FINANCIAL_TRANSACTION_TYPES.SAVING_WITHDRAWAL ? 'selected' : ''}>Penarikan Simpanan</option>
                <option value="${FINANCIAL_TRANSACTION_TYPES.LOAN_DISBURSEMENT}" ${transactionType === FINANCIAL_TRANSACTION_TYPES.LOAN_DISBURSEMENT ? 'selected' : ''}>Pencairan Pinjaman</option>
                <option value="${FINANCIAL_TRANSACTION_TYPES.INSTALLMENT_PAYMENT}" ${transactionType === FINANCIAL_TRANSACTION_TYPES.INSTALLMENT_PAYMENT ? 'selected' : ''}>Pembayaran Angsuran</option>
                <option value="${FINANCIAL_TRANSACTION_TYPES.INCOME}" ${transactionType === FINANCIAL_TRANSACTION_TYPES.INCOME ? 'selected' : ''}>Pemasukan Operasional (Income)</option>
                <option value="${FINANCIAL_TRANSACTION_TYPES.EXPENSE}" ${transactionType === FINANCIAL_TRANSACTION_TYPES.EXPENSE ? 'selected' : ''}>Pengeluaran Operasional (Expense)</option>
                <option value="${FINANCIAL_TRANSACTION_TYPES.REVERSAL}" ${transactionType === FINANCIAL_TRANSACTION_TYPES.REVERSAL ? 'selected' : ''}>Reversal / Pembatalan</option>
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.75rem;">Arus Kas</label>
              <select id="filter-flow" class="form-control" style="font-size: 0.8rem; padding: 0.4rem 0.65rem;">
                <option value="">Semua Arus (IN & OUT)</option>
                <option value="${TRANSACTION_FLOW.IN}" ${flowFilter === TRANSACTION_FLOW.IN ? 'selected' : ''}>Masuk / IN (Debit)</option>
                <option value="${TRANSACTION_FLOW.OUT}" ${flowFilter === TRANSACTION_FLOW.OUT ? 'selected' : ''}>Keluar / OUT (Kredit)</option>
              </select>
            </div>

            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-sm btn-secondary" id="btn-reset-filters" style="width: 100%;" title="Reset Filter">
                ↺ Reset
              </button>
            </div>

          </div>
        </div>

        <!-- Transactions Ledger Table -->
        <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 1.25rem;">
          
          <div style="padding: 0.75rem 1.25rem; background: var(--bg-subtle); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 0.825rem;">
            <div>
              Menampilkan <strong>${items.length}</strong> dari <strong>${total}</strong> total mutasi transaksi
            </div>
            <div style="display: flex; gap: 1rem; color: var(--text-secondary); font-size: 0.775rem;">
              <span>Subtotal Masuk: <strong style="color: var(--success);">+Rp ${summary.totalInflow.toLocaleString('id-ID')}</strong></span>
              <span>Subtotal Keluar: <strong style="color: var(--danger);">-Rp ${summary.totalOutflow.toLocaleString('id-ID')}</strong></span>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table" style="margin: 0; width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="background: var(--bg-surface); border-bottom: 2px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.85rem 1rem;">No. Transaksi & Waktu</th>
                  <th style="padding: 0.85rem 1rem;">Jenis Transaksi</th>
                  <th style="padding: 0.85rem 1rem;">Kategori & Deskripsi</th>
                  <th style="padding: 0.85rem 1rem;">Anggota / Pihak Terkait</th>
                  <th style="padding: 0.85rem 1rem; text-align: right;">Nominal Mutasi</th>
                  <th style="padding: 0.85rem 1rem; text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${items.length > 0 ? items.map(item => {
                  const t = item.transaction;
                  const m = item.member;
                  const isIn = t.flow === TRANSACTION_FLOW.IN;
                  const isReversed = t.is_reversed;
                  const typeBadge = getTypeBadge(t.transaction_type, isReversed);

                  return `
                    <tr style="border-bottom: 1px solid var(--border-color); ${isReversed ? 'background: rgba(100, 116, 139, 0.05); opacity: 0.85;' : ''}" class="table-row-hover">
                      
                      <td style="padding: 0.85rem 1rem;">
                        <div style="font-family: monospace; font-weight: 700; color: var(--primary-700); font-size: 0.825rem;">
                          ${t.transaction_number}
                        </div>
                        <div style="font-size: 0.725rem; color: var(--text-tertiary); margin-top: 0.2rem;">
                          ${new Date(t.transaction_date).toLocaleString('id-ID')}
                        </div>
                      </td>

                      <td style="padding: 0.85rem 1rem;">
                        ${typeBadge}
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-top: 0.25rem;">
                          Ref: <code>${t.reference_type}</code>
                        </div>
                      </td>

                      <td style="padding: 0.85rem 1rem;">
                        <div style="font-weight: 600; color: var(--text-primary); ${isReversed ? 'text-decoration: line-through;' : ''}">
                          ${t.description}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">
                          Kategori: <em>${t.category}</em>
                        </div>
                        ${isReversed ? `
                          <div style="font-size: 0.7rem; color: var(--danger); font-weight: 700; margin-top: 0.2rem;">
                            ⚠️ Dibatalkan: ${t.reversal_reason || '-'}
                          </div>
                        ` : ''}
                      </td>

                      <td style="padding: 0.85rem 1rem;">
                        ${m ? `
                          <div style="font-weight: 700; color: var(--text-primary);">${m.full_name}</div>
                          <div style="font-size: 0.725rem; color: var(--text-tertiary);">${m.member_type} &bull; ${m.member_number}</div>
                        ` : `
                          <span style="color: var(--text-tertiary); font-size: 0.8rem;">- (Operasional)</span>
                        `}
                      </td>

                      <td style="padding: 0.85rem 1rem; text-align: right;">
                        <div style="font-weight: 800; font-size: 1rem; color: ${isIn ? 'var(--success)' : 'var(--danger)'};">
                          ${isIn ? '+' : '-'} Rp ${t.amount.toLocaleString('id-ID')}
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-top: 0.15rem;">
                          Arus: <strong>${t.flow}</strong>
                        </div>
                      </td>

                      <td style="padding: 0.85rem 1rem; text-align: right;">
                        <div style="display: inline-flex; gap: 0.35rem;">
                          <button class="btn btn-sm btn-secondary view-trx-btn" data-id="${t.id}" title="Lihat Detail Transaksi">
                            👁️ Detail
                          </button>
                          ${isAdmin && !isReversed && t.transaction_type !== FINANCIAL_TRANSACTION_TYPES.REVERSAL ? `
                            <button class="btn btn-sm btn-danger reverse-trx-btn" data-id="${t.id}" title="Batalkan Transaksi (Reversal)">
                              ↩️ Reversal
                            </button>
                          ` : ''}
                        </div>
                      </td>

                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="6" style="padding: 3rem 1rem; text-align: center; color: var(--text-tertiary);">
                      <div style="font-size: 2rem; margin-bottom: 0.5rem;">📭</div>
                      Tidak ditemukan transaksi keuangan yang sesuai dengan kriteria filter.
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
                <button class="btn btn-sm btn-secondary page-prev-btn" ${currentPage <= 1 ? 'disabled' : ''}>
                  ◀ Sebelumnya
                </button>
                <button class="btn btn-sm btn-secondary page-next-btn" ${currentPage >= totalPages ? 'disabled' : ''}>
                  Berikutnya ▶
                </button>
              </div>
            </div>
          ` : ''}

        </div>

        <!-- Modals Container -->
        <div id="trx-modal-container"></div>

      </div>
    `;

    attachEvents();
  }

  function getTypeBadge(type, isReversed) {
    if (isReversed) {
      return `<span class="badge badge-neutral" style="text-decoration: line-through;">${type} (REVERSED)</span>`;
    }
    switch (type) {
      case FINANCIAL_TRANSACTION_TYPES.SAVING_DEPOSIT:
        return `<span class="badge badge-success">💰 SIMPANAN MASUK</span>`;
      case FINANCIAL_TRANSACTION_TYPES.SAVING_WITHDRAWAL:
        return `<span class="badge badge-warning">🏧 PENARIKAN SIMPANAN</span>`;
      case FINANCIAL_TRANSACTION_TYPES.LOAN_DISBURSEMENT:
        return `<span class="badge badge-danger">💸 PENCAIRAN PINJAMAN</span>`;
      case FINANCIAL_TRANSACTION_TYPES.INSTALLMENT_PAYMENT:
        return `<span class="badge badge-primary">💳 ANGSURAN PINJAMAN</span>`;
      case FINANCIAL_TRANSACTION_TYPES.INCOME:
        return `<span class="badge badge-success">📈 PEMASUKAN OPERASIONAL</span>`;
      case FINANCIAL_TRANSACTION_TYPES.EXPENSE:
        return `<span class="badge badge-danger">📉 BEBAN OPERASIONAL</span>`;
      case FINANCIAL_TRANSACTION_TYPES.REVERSAL:
        return `<span class="badge badge-purple">↩️ REVERSAL KOREKSI</span>`;
      default:
        return `<span class="badge badge-neutral">${type}</span>`;
    }
  }

  function attachEvents() {
    // Search input
    const searchInput = container.querySelector('#filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        render();
      });
    }

    // Date filters
    const startInput = container.querySelector('#filter-start-date');
    if (startInput) {
      startInput.addEventListener('change', (e) => {
        startDate = e.target.value;
        currentPage = 1;
        render();
      });
    }

    const endInput = container.querySelector('#filter-end-date');
    if (endInput) {
      endInput.addEventListener('change', (e) => {
        endDate = e.target.value;
        currentPage = 1;
        render();
      });
    }

    // Type filter
    const typeSelect = container.querySelector('#filter-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        transactionType = e.target.value;
        currentPage = 1;
        render();
      });
    }

    // Flow filter
    const flowSelect = container.querySelector('#filter-flow');
    if (flowSelect) {
      flowSelect.addEventListener('change', (e) => {
        flowFilter = e.target.value;
        currentPage = 1;
        render();
      });
    }

    // Reset filters
    const resetBtn = container.querySelector('#btn-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        startDate = '';
        endDate = '';
        transactionType = '';
        flowFilter = '';
        searchQuery = '';
        currentPage = 1;
        render();
      });
    }

    // Pagination
    const prevBtn = container.querySelector('.page-prev-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          render();
        }
      });
    }

    const nextBtn = container.querySelector('.page-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentPage++;
        render();
      });
    }

    // Add Income Modal Button
    const addIncomeBtn = container.querySelector('#btn-add-income');
    if (addIncomeBtn) {
      addIncomeBtn.addEventListener('click', () => openIncomeModal());
    }

    // Add Expense Modal Button
    const addExpenseBtn = container.querySelector('#btn-add-expense');
    if (addExpenseBtn) {
      addExpenseBtn.addEventListener('click', () => openExpenseModal());
    }

    // View Transaction Details Button
    container.querySelectorAll('.view-trx-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await openTransactionDetailsModal(id);
      });
    });

    // Reversal Button
    container.querySelectorAll('.reverse-trx-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await openReversalModal(id);
      });
    });
  }

  // --- MODAL CONTROLLERS ---

  function openIncomeModal() {
    const modalContainer = container.querySelector('#trx-modal-container');
    modalContainer.innerHTML = `
      <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
        <div class="modal-content animate-slide-up" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 550px; width: 100%; padding: 1.75rem; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <h3 style="margin: 0; font-size: 1.25rem; color: var(--success);">
              ➕ Catat Pemasukan Kas Koperasi (Income)
            </h3>
            <button class="btn btn-sm btn-secondary close-modal-btn">✕</button>
          </div>

          <form id="form-income">
            <div class="form-group">
              <label class="form-label required">Nominal Pemasukan (Rp)</label>
              <input type="number" id="income-amount" class="form-control" placeholder="Contoh: 1500000" min="1000" step="1000" required />
            </div>

            <div class="form-group">
              <label class="form-label required">Kategori Pemasukan</label>
              <select id="income-category" class="form-control" required>
                <option value="Pendapatan Administrasi">Pendapatan Administrasi Pendaftaran / Layanan</option>
                <option value="Pendapatan Kemitraan / Unit Usaha">Pendapatan Kemitraan / Unit Kantin / Toko</option>
                <option value="Jasa Giro / Bunga Bank">Jasa Giro / Bagi Hasil Bank</option>
                <option value="Pendapatan Lain-lain">Pendapatan Operasional Lain-lain</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label required">Deskripsi / Keterangan Transaksi</label>
              <input type="text" id="income-desc" class="form-control" placeholder="Contoh: Penerimaan bagi hasil kemitraan kantin bulan berjalan" required />
            </div>

            <div class="form-group">
              <label class="form-label">Catatan Tambahan / No. Bukti Nota</label>
              <input type="text" id="income-notes" class="form-control" placeholder="Contoh: Bukti setor kasir No. KAS-998" />
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem;">
              <button type="button" class="btn btn-secondary close-modal-btn">Batal</button>
              <button type="submit" class="btn btn-success">💾 Simpan Pemasukan</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalContainer.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
    modalContainer.querySelector('#form-income').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = Number(modalContainer.querySelector('#income-amount').value);
      const category = modalContainer.querySelector('#income-category').value;
      const description = modalContainer.querySelector('#income-desc').value;
      const notes = modalContainer.querySelector('#income-notes').value;

      try {
        await transactionService.recordIncome({
          amount,
          category,
          description,
          notes,
          created_by: user.id,
          created_by_name: user.name
        });
        alert('✓ Pemasukan berhasil dicatat ke dalam buku kas.');
        modalContainer.innerHTML = '';
        render();
      } catch (err) {
        alert(`Gagal mencatat pemasukan: ${err.message}`);
      }
    });
  }

  function openExpenseModal() {
    const modalContainer = container.querySelector('#trx-modal-container');
    modalContainer.innerHTML = `
      <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
        <div class="modal-content animate-slide-up" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 550px; width: 100%; padding: 1.75rem; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <h3 style="margin: 0; font-size: 1.25rem; color: var(--danger);">
              ➖ Catat Pengeluaran Kas Koperasi (Expense)
            </h3>
            <button class="btn btn-sm btn-secondary close-modal-btn">✕</button>
          </div>

          <form id="form-expense">
            <div class="form-group">
              <label class="form-label required">Nominal Pengeluaran (Rp)</label>
              <input type="number" id="expense-amount" class="form-control" placeholder="Contoh: 450000" min="1000" step="1000" required />
            </div>

            <div class="form-group">
              <label class="form-label required">Kategori Beban Pengeluaran</label>
              <select id="expense-category" class="form-control" required>
                <option value="Beban ATK & Perlengkapan Kantor">Beban ATK & Perlengkapan Kantor</option>
                <option value="Beban Konsumsi & Rapat">Beban Konsumsi & Rapat Pengurus</option>
                <option value="Beban Utilitas Listrik & Internet">Beban Utilitas Listrik, Air, & Internet</option>
                <option value="Beban Transportasi & Operasional">Beban Transportasi & Operasional</option>
                <option value="Beban Pemeliharaan & Perbaikan">Beban Pemeliharaan & Perbaikan Sarana</option>
                <option value="Beban Operasional Lain-lain">Beban Operasional Lain-lain</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label required">Deskripsi / Keterangan Transaksi</label>
              <input type="text" id="expense-desc" class="form-control" placeholder="Contoh: Pembelian kertas F4 dan toner printer HP" required />
            </div>

            <div class="form-group">
              <label class="form-label">Catatan Tambahan / No. Nota / Toko</label>
              <input type="text" id="expense-notes" class="form-control" placeholder="Contoh: Nota Toko Gramedia Cirebon" />
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem;">
              <button type="button" class="btn btn-secondary close-modal-btn">Batal</button>
              <button type="submit" class="btn btn-danger">💾 Simpan Pengeluaran</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalContainer.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
    modalContainer.querySelector('#form-expense').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = Number(modalContainer.querySelector('#expense-amount').value);
      const category = modalContainer.querySelector('#expense-category').value;
      const description = modalContainer.querySelector('#expense-desc').value;
      const notes = modalContainer.querySelector('#expense-notes').value;

      try {
        await transactionService.recordExpense({
          amount,
          category,
          description,
          notes,
          created_by: user.id,
          created_by_name: user.name
        });
        alert('✓ Pengeluaran berhasil dicatat ke dalam buku kas.');
        modalContainer.innerHTML = '';
        render();
      } catch (err) {
        alert(`Gagal mencatat pengeluaran: ${err.message}`);
      }
    });
  }

  async function openTransactionDetailsModal(transactionId) {
    const modalContainer = container.querySelector('#trx-modal-container');
    const details = await transactionService.getTransactionDetails(transactionId);
    if (!details) return;

    const { transaction: t, member: m, originalTransaction: orig, reversalTransaction: rev } = details;
    const isIn = t.flow === TRANSACTION_FLOW.IN;

    modalContainer.innerHTML = `
      <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
        <div class="modal-content animate-slide-up" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 650px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 2rem; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color);">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">RINCIAN TRANSAKSI KEUANGAN</div>
              <h3 style="margin: 0.2rem 0 0 0; font-size: 1.35rem; color: var(--text-primary); font-family: monospace;">
                ${t.transaction_number}
              </h3>
            </div>
            <button class="btn btn-sm btn-secondary close-modal-btn">✕</button>
          </div>

          <!-- Main Amount & Flow Hero Box -->
          <div style="background: ${isIn ? 'var(--success-light)' : 'var(--danger-light)'}; border: 1px solid ${isIn ? 'var(--success-border)' : 'var(--danger-border)'}; border-radius: var(--radius-lg); padding: 1.25rem; text-align: center; margin-bottom: 1.5rem;">
            <div style="font-size: 0.8rem; font-weight: 700; color: ${isIn ? 'var(--success-text)' : 'var(--danger-text)'};">
              ${isIn ? 'KAS MASUK (INFLOW / DEBIT KAS)' : 'KAS KELUAR (OUTFLOW / KREDIT KAS)'}
            </div>
            <div style="font-size: 2rem; font-weight: 900; color: ${isIn ? 'var(--success)' : 'var(--danger)'}; margin: 0.25rem 0;">
              ${isIn ? '+' : '-'} Rp ${t.amount.toLocaleString('id-ID')}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">
              Status: <strong>${t.is_reversed ? '⚠️ SUDAH DI-REVERSE (BATAL)' : '✓ VALID & IMMUTABLE'}</strong>
            </div>
          </div>

          <!-- Detailed Key-Value Grid -->
          <div style="display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.85rem; margin-bottom: 1.5rem; background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md);">
            
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.35rem;">
              <span style="color: var(--text-tertiary);">Jenis Transaksi:</span>
              <strong>${t.transaction_type}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.35rem;">
              <span style="color: var(--text-tertiary);">Kategori Transaksi:</span>
              <span>${t.category}</span>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.35rem;">
              <span style="color: var(--text-tertiary);">Deskripsi:</span>
              <strong>${t.description}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.35rem;">
              <span style="color: var(--text-tertiary);">Anggota Terkait:</span>
              <span>${m ? `${m.full_name} (${m.member_type} &bull; ${m.member_number})` : '-'}</span>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.35rem;">
              <span style="color: var(--text-tertiary);">Tipe & ID Referensi:</span>
              <span><code>${t.reference_type}</code> &bull; <code>${t.reference_id || '-'}</code></span>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.35rem;">
              <span style="color: var(--text-tertiary);">Waktu Transaksi:</span>
              <span>${new Date(t.transaction_date).toLocaleString('id-ID')}</span>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.35rem;">
              <span style="color: var(--text-tertiary);">Petugas / Dicatat Oleh:</span>
              <span>${t.created_by_name || t.created_by || 'Admin'}</span>
            </div>

            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-tertiary);">Catatan:</span>
              <span>${t.notes || '-'}</span>
            </div>

          </div>

          <!-- Reversal Relation Details if applicable -->
          ${t.is_reversed && rev ? `
            <div style="background: var(--danger-light); border: 1px solid var(--danger-border); border-radius: var(--radius-md); padding: 0.85rem; font-size: 0.8rem; color: var(--danger-text); margin-bottom: 1.25rem;">
              <strong>⚠️ Informasi Pembatalan (Reversal):</strong>
              <div style="margin-top: 0.25rem;">Transaksi ini telah dibatalkan oleh Transaksi Koreksi <code>${rev.transaction_number}</code>.</div>
              <div style="margin-top: 0.25rem;">Alasan: <em>"${t.reversal_reason || '-'}"</em></div>
            </div>
          ` : ''}

          ${orig ? `
            <div style="background: var(--purple-light); border: 1px solid var(--purple-border); border-radius: var(--radius-md); padding: 0.85rem; font-size: 0.8rem; color: var(--purple-text); margin-bottom: 1.25rem;">
              <strong>↩️ Informasi Transaksi Asal (Original Record):</strong>
              <div style="margin-top: 0.25rem;">Transaksi ini merupakan pembatalan/koreksi terhadap transaksi <code>${orig.transaction_number}</code> (${orig.description}).</div>
              <div style="margin-top: 0.25rem;">Alasan Koreksi: <em>"${t.reversal_reason || '-'}"</em></div>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
            ${isAdmin && !t.is_reversed && t.transaction_type !== FINANCIAL_TRANSACTION_TYPES.REVERSAL ? `
              <button class="btn btn-danger reverse-modal-direct-btn" data-id="${t.id}">
                ↩️ Batalkan Transaksi Ini (Reversal)
              </button>
            ` : ''}
            <button class="btn btn-secondary close-modal-btn">Tutup</button>
          </div>

        </div>
      </div>
    `;

    modalContainer.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
    
    const reverseDirectBtn = modalContainer.querySelector('.reverse-modal-direct-btn');
    if (reverseDirectBtn) {
      reverseDirectBtn.addEventListener('click', async () => {
        const id = reverseDirectBtn.dataset.id;
        modalContainer.innerHTML = '';
        await openReversalModal(id);
      });
    }
  }

  async function openReversalModal(transactionId) {
    const modalContainer = container.querySelector('#trx-modal-container');
    const details = await transactionService.getTransactionDetails(transactionId);
    if (!details) return;

    const t = details.transaction;

    modalContainer.innerHTML = `
      <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
        <div class="modal-content animate-slide-up" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 520px; width: 100%; padding: 1.75rem; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color);">
          <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; color: var(--danger);">
            ↩️ Konfirmasi Reversal Transaksi Keuangan
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
            Sesuai prinsip ledger immutable, pembatalan <strong>TIDAK AKAN</strong> menghapus transaksi <code>${t.transaction_number}</code> melainkan membuat entitas pembalik (counter-transaction) otomatis sebesar <strong>Rp ${t.amount.toLocaleString('id-ID')}</strong>.
          </p>

          <form id="form-reversal">
            <div class="form-group">
              <label class="form-label required">Alasan Pembatalan / Reversal</label>
              <textarea id="reversal-reason" class="form-control" rows="3" placeholder="Sebutkan alasan pembatalan transaksi secara jelas (misal: Salah input nominal, double entry, dsb.)..." required></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
              <button type="button" class="btn btn-secondary close-modal-btn">Batal</button>
              <button type="submit" class="btn btn-danger">↩️ Eksekusi Reversal</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalContainer.querySelector('.close-modal-btn').addEventListener('click', () => modalContainer.innerHTML = '');
    modalContainer.querySelector('#form-reversal').addEventListener('submit', async (e) => {
      e.preventDefault();
      const reason = modalContainer.querySelector('#reversal-reason').value;

      try {
        const result = await transactionService.reverseTransaction(transactionId, user, { reason });
        alert(`✓ Transaksi berhasil di-reverse! Transaksi pembalik ${result.reversal.transaction_number} telah dicatat.`);
        modalContainer.innerHTML = '';
        render();
      } catch (err) {
        alert(`Gagal melakukan reversal: ${err.message}`);
      }
    });
  }

  // Initial render
  await render();
}
