// Transactions Ledger View (Buku Kas & Transaksi Keuangan)
import { store } from '../store.js';
import { auth } from '../auth.js';
import { formatRupiah, formatDate, getStatusBadge, parseNumberInput } from '../utils/formatters.js';
import { toast } from '../utils/toast.js';
import { exportToCSV } from '../utils/exportPdfCsv.js';

let activeTxFilter = 'all'; // all, masuk, keluar
let currentTxSearch = '';

export function renderTransactionsView(container) {
  const isAdmin = auth.isAdmin();
  const isKetua = auth.isKetua();
  const isAnggota = auth.isAnggota();
  const currentUser = auth.getUser();

  function refresh() {
    let txList = [...store.data.transactions].reverse();

    if (isAnggota) {
      txList = txList.filter(t => t.memberId === currentUser.id);
    }

    if (activeTxFilter !== 'all') {
      txList = txList.filter(t => t.type === activeTxFilter);
    }

    if (currentTxSearch.trim() !== '') {
      const q = currentTxSearch.toLowerCase();
      txList = txList.filter(t => 
        t.id.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    const totalInflow = store.data.transactions
      .filter(t => t.type === 'masuk')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalOutflow = store.data.transactions
      .filter(t => t.type === 'keluar')
      .reduce((acc, t) => acc + t.amount, 0);

    const currentBalance = totalInflow - totalOutflow;

    container.innerHTML = `
      <div class="animate-fade-in">
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">
              ${isAnggota ? 'Riwayat Transaksi Keuangan Saya' : 'Buku Kas & Transaksi Keuangan'}
            </h2>
            <p style="font-size: 0.825rem; color: var(--text-tertiary);">
              Pencatatan arus kas masuk dan keluar koperasi secara real-time dan terstruktur
            </p>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="export-tx-csv" class="btn btn-secondary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export CSV
            </button>
            ${isAdmin ? `
              <button id="add-manual-tx-btn" class="btn btn-primary btn-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Catat Pengeluaran / Pemasukan Kas
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Metric Cards -->
        <div class="stats-grid">
          <div class="stat-card" style="--stat-accent: #10b981;">
            <div class="stat-info">
              <span class="stat-label">Total Kas Masuk (Inflow)</span>
              <span class="stat-value" style="color: var(--success);">${formatRupiah(totalInflow)}</span>
              <span class="stat-subtext">Setoran & Angsuran Anggota</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #ef4444;">
            <div class="stat-info">
              <span class="stat-label">Total Kas Keluar (Outflow)</span>
              <span class="stat-value" style="color: var(--danger);">${formatRupiah(totalOutflow)}</span>
              <span class="stat-subtext">Pencairan & Biaya Operasional</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--danger-light); --stat-icon-color: var(--danger);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #3b82f6;">
            <div class="stat-info">
              <span class="stat-label">Saldo Kas Akhir</span>
              <span class="stat-value" style="color: var(--primary-600);">${formatRupiah(currentBalance)}</span>
              <span class="stat-subtext" style="color: var(--success-text);">Posisi kas real-time</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
            </div>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 1rem;">
          <div style="display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
            
            <div style="flex: 1; min-width: 250px;">
              <input type="text" id="tx-search" class="form-control" placeholder="Cari No. Referensi, Kategori, atau Keterangan..." value="${currentTxSearch}">
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn btn-sm tx-filter-btn ${activeTxFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" data-filter="all">Semua Transaksi</button>
              <button class="btn btn-sm tx-filter-btn ${activeTxFilter === 'masuk' ? 'btn-primary' : 'btn-secondary'}" data-filter="masuk">Pemasukan (+)</button>
              <button class="btn btn-sm tx-filter-btn ${activeTxFilter === 'keluar' ? 'btn-primary' : 'btn-secondary'}" data-filter="keluar">Pengeluaran (-)</button>
            </div>

          </div>
        </div>

        <!-- Transactions Table -->
        <div class="card">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>No. Referensi</th>
                  <th>Tanggal</th>
                  <th>Kategori Akun</th>
                  <th>Keterangan / Uraian</th>
                  <th>Pihak Terkait</th>
                  <th>Jenis</th>
                  <th style="text-align: right;">Nominal</th>
                  <th>Petugas</th>
                </tr>
              </thead>
              <tbody>
                ${txList.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-tertiary);">
                      Tidak ada data transaksi yang ditemukan.
                    </td>
                  </tr>
                ` : txList.map(tx => {
                  const member = tx.memberId ? store.data.members.find(m => m.id === tx.memberId) : null;
                  return `
                    <tr>
                      <td><code>${tx.id}</code></td>
                      <td>${formatDate(tx.date, false)}</td>
                      <td><strong>${tx.category}</strong></td>
                      <td style="max-width: 280px; font-size: 0.825rem;">${tx.description}</td>
                      <td>
                        ${member ? `
                          <div><strong>${member.name}</strong></div>
                          <div style="font-size: 0.725rem; color: var(--text-tertiary);">${member.department}</div>
                        ` : `<span style="color: var(--text-tertiary);">-</span>`}
                      </td>
                      <td>${getStatusBadge(tx.type)}</td>
                      <td style="text-align: right; font-weight: 800; color: ${tx.type === 'masuk' ? 'var(--success-dark)' : 'var(--danger-dark)'};">
                        ${tx.type === 'masuk' ? '+' : '-'} ${formatRupiah(tx.amount)}
                      </td>
                      <td style="font-size: 0.75rem; color: var(--text-secondary);">${tx.recordedBy || 'Admin'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    // Event Listeners
    const searchInput = container.querySelector('#tx-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentTxSearch = e.target.value;
        refresh();
        const inputAfter = container.querySelector('#tx-search');
        if (inputAfter) {
          inputAfter.focus();
          inputAfter.selectionStart = inputAfter.selectionEnd = inputAfter.value.length;
        }
      });
    }

    container.querySelectorAll('.tx-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTxFilter = btn.dataset.filter;
        refresh();
      });
    });

    const addManualBtn = container.querySelector('#add-manual-tx-btn');
    if (addManualBtn) {
      addManualBtn.addEventListener('click', () => openAddManualTxModal(refresh));
    }

    const exportBtn = container.querySelector('#export-tx-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const headers = ['No. Referensi', 'Tanggal', 'Jenis', 'Kategori Akun', 'Nominal', 'ID Anggota', 'Nama Anggota', 'Keterangan', 'Petugas'];
        const rows = store.data.transactions.map(t => {
          const m = t.memberId ? store.data.members.find(mem => mem.id === t.memberId) : null;
          return [
            t.id,
            t.date,
            t.type,
            t.category,
            t.amount,
            t.memberId || '-',
            m ? m.name : '-',
            t.description,
            t.recordedBy || 'Admin'
          ];
        });
        exportToCSV('Buku_Kas_Transaksi_Koperasi_IKMI', headers, rows);
        toast.success('File CSV Buku Kas berhasil diunduh.');
      });
    }
  }

  refresh();
}

function openAddManualTxModal(onSuccess) {
  let modalBackdrop = document.getElementById('app-modal');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'app-modal';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  modalBackdrop.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">Catat Transaksi Buku Kas Umum</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <form id="add-manual-tx-form">
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Jenis Arus Kas</label>
              <select name="type" id="modal-tx-type" class="form-control" required>
                <option value="keluar">Pengeluaran Kas (-)</option>
                <option value="masuk">Pemasukan Kas (+)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Kategori Akun</label>
              <select name="category" id="modal-tx-category" class="form-control" required>
                <option value="Biaya Operasional">Biaya Operasional Koperasi</option>
                <option value="ATK & Administrasi">ATK & Administrasi Kantor</option>
                <option value="Konsumsi & Rapat Pengurus">Konsumsi & Rapat Pengurus</option>
                <option value="Biaya Listrik & Internet">Biaya Listrik, Air & Internet</option>
                <option value="Dana Pendidikan & Sosial">Dana Pendidikan & Sosial Anggota</option>
                <option value="Pendapatan Usaha Koperasi">Pendapatan Usaha / Toko Koperasi</option>
                <option value="Pendapatan Lain-lain">Pendapatan Lain-lain</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">Nominal Transaksi (Rp)</label>
            <div class="input-group">
              <span class="input-group-text">Rp</span>
              <input type="number" name="amount" class="form-control" placeholder="100000" min="1000" step="1000" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">Uraian / Keterangan Transaksi</label>
            <textarea name="description" class="form-control" rows="3" placeholder="contoh: Pembelian kertas F4, tinta printer & snack rapat pengurus bulanan..." required></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan ke Buku Kas</button>
        </div>
      </form>
    </div>
  `;

  modalBackdrop.classList.add('active');

  const close = () => modalBackdrop.classList.remove('active');
  modalBackdrop.querySelector('#modal-close-btn').addEventListener('click', close);
  modalBackdrop.querySelector('#modal-cancel-btn').addEventListener('click', close);

  modalBackdrop.querySelector('#add-manual-tx-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const type = formData.get('type');
    const amount = parseNumberInput(formData.get('amount'));

    if (type === 'keluar') {
      const curCash = store.getTotalCashBalance();
      if (curCash < amount) {
        toast.error(`Saldo kas koperasi (${formatRupiah(curCash)}) tidak mencukupi untuk pengeluaran sebesar ${formatRupiah(amount)}!`);
        return;
      }
    }

    const created = store.addTransaction({
      type,
      category: formData.get('category'),
      amount,
      memberId: null,
      description: formData.get('description')
    });

    toast.success(`Transaksi ${created.id} berhasil dicatat ke buku kas!`);
    close();
    if (onSuccess) onSuccess();
  });
}
