// Savings Management View (Manajemen Simpanan: Pokok, Wajib, Sukarela)
import { store } from '../store.js';
import { auth } from '../auth.js';
import { formatRupiah, formatDate, getStatusBadge, parseNumberInput } from '../utils/formatters.js';
import { toast } from '../utils/toast.js';
import { printOfficialDocument, getKopSuratHtml, exportToCSV } from '../utils/exportPdfCsv.js';

let activeSavingsTab = 'all'; // all, pokok, wajib, sukarela, balances

export function renderSavingsView(container) {
  const isAdmin = auth.isAdmin();
  const isKetua = auth.isKetua();
  const currentUser = auth.getUser();

  function refresh() {
    const savingsBreakdown = store.getSavingsBreakdown();
    let savingsList = [...store.data.savings].reverse();

    // If regular member, only show their savings
    if (auth.isAnggota()) {
      savingsList = savingsList.filter(s => s.memberId === currentUser.id);
    }

    if (activeSavingsTab !== 'all' && activeSavingsTab !== 'balances') {
      savingsList = savingsList.filter(s => s.type === activeSavingsTab);
    }

    container.innerHTML = `
      <div class="animate-fade-in">
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">
              ${auth.isAnggota() ? 'Simpanan Saya' : 'Manajemen Simpanan Anggota'}
            </h2>
            <p style="font-size: 0.825rem; color: var(--text-tertiary);">
              ${auth.isAnggota() ? 'Rincian simpanan pokok, wajib bulanan, dan tabungan sukarela Anda' : 'Pencatatan setoran & penarikan Simpanan Pokok, Wajib, dan Sukarela'}
            </p>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="export-savings-csv" class="btn btn-secondary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export CSV
            </button>
            ${isAdmin ? `
              <button id="batch-wajib-btn" class="btn btn-secondary btn-sm" title="Generate Simpanan Wajib Bulanan Serentak">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Setor Wajib Massal
              </button>
              <button id="add-saving-btn" class="btn btn-primary btn-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Catat Transaksi Simpanan
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="stats-grid">
          <div class="stat-card" style="--stat-accent: #3b82f6;">
            <div class="stat-info">
              <span class="stat-label">Simpanan Pokok</span>
              <span class="stat-value" style="color: var(--primary-600);">
                ${formatRupiah(auth.isAnggota() ? store.getMemberSavings(currentUser.id).pokok : savingsBreakdown.pokok)}
              </span>
              <span class="stat-subtext">Setoran awal saat pendaftaran</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #8b5cf6;">
            <div class="stat-info">
              <span class="stat-label">Simpanan Wajib</span>
              <span class="stat-value" style="color: var(--purple);">
                ${formatRupiah(auth.isAnggota() ? store.getMemberSavings(currentUser.id).wajib : savingsBreakdown.wajib)}
              </span>
              <span class="stat-subtext">Rp 50.000 / bulan</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--purple-light); --stat-icon-color: var(--purple);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #10b981;">
            <div class="stat-info">
              <span class="stat-label">Simpanan Sukarela</span>
              <span class="stat-value" style="color: var(--success);">
                ${formatRupiah(auth.isAnggota() ? store.getMemberSavings(currentUser.id).sukarela : savingsBreakdown.sukarela)}
              </span>
              <span class="stat-subtext">Fleksibel dapat ditarik</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #0A2540;">
            <div class="stat-info">
              <span class="stat-label">Total Akumulasi</span>
              <span class="stat-value">
                ${formatRupiah(auth.isAnggota() ? store.getMemberSavings(currentUser.id).total : savingsBreakdown.total)}
              </span>
              <span class="stat-subtext" style="color: var(--success-text);">Aset modal simpanan</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--bg-subtle); --stat-icon-color: var(--ikmi-navy);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path></svg>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="tabs-nav">
          <button class="tab-btn ${activeSavingsTab === 'all' ? 'active' : ''}" data-tab="all">Semua Riwayat</button>
          <button class="tab-btn ${activeSavingsTab === 'pokok' ? 'active' : ''}" data-tab="pokok">Simpanan Pokok</button>
          <button class="tab-btn ${activeSavingsTab === 'wajib' ? 'active' : ''}" data-tab="wajib">Simpanan Wajib</button>
          <button class="tab-btn ${activeSavingsTab === 'sukarela' ? 'active' : ''}" data-tab="sukarela">Simpanan Sukarela</button>
          ${!auth.isAnggota() ? `<button class="tab-btn ${activeSavingsTab === 'balances' ? 'active' : ''}" data-tab="balances">Rekap Saldo per Anggota</button>` : ''}
        </div>

        <!-- Table View -->
        ${activeSavingsTab === 'balances' ? renderBalancesTable() : renderSavingsHistoryTable(savingsList)}

      </div>
    `;

    // Tab switcher
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSavingsTab = btn.dataset.tab;
        refresh();
      });
    });

    const addBtn = container.querySelector('#add-saving-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => openAddSavingModal(refresh));
    }

    const batchBtn = container.querySelector('#batch-wajib-btn');
    if (batchBtn) {
      batchBtn.addEventListener('click', () => openBatchWajibModal(refresh));
    }

    container.querySelectorAll('.print-saving-receipt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        printSavingReceipt(id);
      });
    });

    const exportBtn = container.querySelector('#export-savings-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const headers = ['No. Bukti', 'Tanggal', 'ID Anggota', 'Nama Anggota', 'Jenis Simpanan', 'Aksi', 'Nominal', 'Keterangan', 'Petugas'];
        const rows = store.data.savings.map(s => {
          const m = store.data.members.find(mem => mem.id === s.memberId) || { name: '-' };
          return [
            s.id,
            s.date,
            s.memberId,
            m.name,
            s.type,
            s.action,
            s.amount,
            s.notes || '',
            s.recordedBy || 'Admin'
          ];
        });
        exportToCSV('Data_Simpanan_Koperasi_IKMI', headers, rows);
        toast.success('File CSV Simpanan berhasil diunduh.');
      });
    }
  }

  function renderSavingsHistoryTable(savingsList) {
    return `
      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>No. Bukti</th>
                <th>Tanggal</th>
                <th>Anggota</th>
                <th>Jenis Simpanan</th>
                <th>Tipe Aksi</th>
                <th>Keterangan</th>
                <th style="text-align: right;">Nominal</th>
                <th style="text-align: center;">Kwitansi</th>
              </tr>
            </thead>
            <tbody>
              ${savingsList.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                    Belum ada riwayat transaksi simpanan pada kategori ini.
                  </td>
                </tr>
              ` : savingsList.map(s => {
                const member = store.data.members.find(m => m.id === s.memberId) || { name: s.memberId, identifier: '-' };
                return `
                  <tr>
                    <td><code>${s.id}</code></td>
                    <td>${formatDate(s.date, false)}</td>
                    <td>
                      <div style="font-weight: 700; color: var(--text-primary);">${member.name}</div>
                      <div style="font-size: 0.725rem; color: var(--text-tertiary);">${s.memberId} &bull; ${member.identifier || ''}</div>
                    </td>
                    <td>${getStatusBadge(s.type)}</td>
                    <td>
                      <span class="badge ${s.action === 'setor' ? 'badge-success' : 'badge-danger'}">
                        ${s.action === 'setor' ? 'Setoran' : 'Penarikan'}
                      </span>
                    </td>
                    <td style="max-width: 240px; font-size: 0.8rem; color: var(--text-secondary);">${s.notes || '-'}</td>
                    <td style="text-align: right; font-weight: 700; color: ${s.action === 'setor' ? 'var(--success-dark)' : 'var(--danger-dark)'};">
                      ${s.action === 'setor' ? '+' : '-'} ${formatRupiah(s.amount)}
                    </td>
                    <td style="text-align: center;">
                      <button class="btn btn-secondary btn-sm print-saving-receipt-btn" data-id="${s.id}" title="Cetak Bukti Setor">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Cetak
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

  function renderBalancesTable() {
    const activeMembers = store.data.members.filter(m => m.status === 'aktif');
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Rekapitulasi Saldo Simpanan per Anggota</h3>
            <p class="card-subtitle">Total akumulasi modal simpanan civitas akademika STMIK IKMI</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>ID Anggota</th>
                <th>Nama Anggota</th>
                <th>Kategori</th>
                <th>Simpanan Pokok</th>
                <th>Simpanan Wajib</th>
                <th>Simpanan Sukarela</th>
                <th style="text-align: right;">Total Saldo</th>
              </tr>
            </thead>
            <tbody>
              ${activeMembers.map(m => {
                const s = store.getMemberSavings(m.id);
                return `
                  <tr>
                    <td><code>${m.id}</code></td>
                    <td>
                      <div style="font-weight: 700; color: var(--text-primary);">${m.name}</div>
                      <div style="font-size: 0.725rem; color: var(--text-tertiary);">${m.department}</div>
                    </td>
                    <td><span class="badge badge-neutral">${m.type}</span></td>
                    <td>${formatRupiah(s.pokok)}</td>
                    <td>${formatRupiah(s.wajib)}</td>
                    <td>${formatRupiah(s.sukarela)}</td>
                    <td style="text-align: right; font-weight: 800; color: var(--primary-600);">${formatRupiah(s.total)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  refresh();
}

function openAddSavingModal(onSuccess) {
  let modalBackdrop = document.getElementById('app-modal');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'app-modal';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  const activeMembers = store.data.members.filter(m => m.status === 'aktif');

  modalBackdrop.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">Catat Transaksi Simpanan</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <form id="add-saving-form">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label required">Pilih Anggota</label>
            <select name="memberId" id="modal-saving-member" class="form-control" required>
              <option value="">-- Pilih Anggota Koperasi --</option>
              ${activeMembers.map(m => `
                <option value="${m.id}">${m.name} (${m.id} - ${m.type.toUpperCase()})</option>
              `).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Jenis Simpanan</label>
              <select name="type" id="modal-saving-type" class="form-control" required>
                <option value="wajib">Simpanan Wajib (Rp 50.000 / bln)</option>
                <option value="sukarela">Simpanan Sukarela (Bebas)</option>
                <option value="pokok">Simpanan Pokok (Khusus Awal)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Tipe Transaksi</label>
              <select name="action" id="modal-saving-action" class="form-control" required>
                <option value="setor">Setoran Simpanan (+)</option>
                <option value="tarik">Penarikan Saldo (-)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">Nominal Transaksi (Rp)</label>
            <div class="input-group">
              <span class="input-group-text">Rp</span>
              <input type="number" name="amount" id="modal-saving-amount" class="form-control" placeholder="50000" min="5000" step="5000" value="50000" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Keterangan / Catatan</label>
            <input type="text" name="notes" class="form-control" placeholder="contoh: Setoran Simpanan Wajib Bulan Maret 2026">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan Transaksi</button>
        </div>
      </form>
    </div>
  `;

  modalBackdrop.classList.add('active');

  const close = () => modalBackdrop.classList.remove('active');
  modalBackdrop.querySelector('#modal-close-btn').addEventListener('click', close);
  modalBackdrop.querySelector('#modal-cancel-btn').addEventListener('click', close);

  const typeSelect = modalBackdrop.querySelector('#modal-saving-type');
  const actionSelect = modalBackdrop.querySelector('#modal-saving-action');
  const amountInput = modalBackdrop.querySelector('#modal-saving-amount');

  typeSelect.addEventListener('change', () => {
    if (typeSelect.value === 'wajib') {
      amountInput.value = store.data.coopSettings.monthlyWajib || 50000;
      actionSelect.value = 'setor';
    } else if (typeSelect.value === 'pokok') {
      amountInput.value = store.data.coopSettings.initialPokok || 100000;
      actionSelect.value = 'setor';
    }
  });

  modalBackdrop.querySelector('#add-saving-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const memberId = formData.get('memberId');
    const type = formData.get('type');
    const action = formData.get('action');
    const amount = parseNumberInput(formData.get('amount'));
    const notes = formData.get('notes') || `Transaksi Simpanan ${type}`;

    if (action === 'tarik') {
      if (type !== 'sukarela') {
        toast.error('Hanya Simpanan Sukarela yang dapat ditarik sewaktu-waktu!');
        return;
      }
      const memberSavings = store.getMemberSavings(memberId);
      if (memberSavings.sukarela < amount) {
        toast.error(`Saldo sukarela anggota tidak mencukupi! (Saldo: ${formatRupiah(memberSavings.sukarela)})`);
        return;
      }
    }

    const created = store.addSavingRecord({
      memberId,
      type,
      action,
      amount,
      notes
    });

    toast.success(`Transaksi simpanan ${created.id} berhasil dicatat!`);
    close();
    if (onSuccess) onSuccess();
  });
}

function openBatchWajibModal(onSuccess) {
  let modalBackdrop = document.getElementById('app-modal');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'app-modal';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  const activeMembers = store.data.members.filter(m => m.status === 'aktif');
  const wajibPerMember = store.data.coopSettings.monthlyWajib || 50000;
  const totalBatch = activeMembers.length * wajibPerMember;

  modalBackdrop.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">Setoran Simpanan Wajib Massal</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
          Fitur ini akan mencatat setoran <strong>Simpanan Wajib Bulanan</strong> serentak untuk seluruh <strong>${activeMembers.length} anggota aktif</strong> melalui pemotongan payroll / kas koperasi.
        </p>

        <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem;">
            <span>Jumlah Anggota Aktif:</span>
            <strong>${activeMembers.length} Anggota</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem;">
            <span>Nominal per Anggota:</span>
            <strong>${formatRupiah(wajibPerMember)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1rem; font-weight: 800; border-top: 1px solid var(--border-color); padding-top: 0.5rem; color: var(--primary-600);">
            <span>Total Pemasukan Kas:</span>
            <span>${formatRupiah(totalBatch)}</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">Bulan & Tahun Pembukuan</label>
          <input type="text" id="batch-month-input" class="form-control" value="Maret 2026">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Batal</button>
        <button type="button" class="btn btn-primary" id="confirm-batch-btn">Proses Setoran Massal</button>
      </div>
    </div>
  `;

  modalBackdrop.classList.add('active');

  const close = () => modalBackdrop.classList.remove('active');
  modalBackdrop.querySelector('#modal-close-btn').addEventListener('click', close);
  modalBackdrop.querySelector('#modal-cancel-btn').addEventListener('click', close);

  modalBackdrop.querySelector('#confirm-batch-btn').addEventListener('click', () => {
    const month = modalBackdrop.querySelector('#batch-month-input').value;
    activeMembers.forEach(m => {
      store.addSavingRecord({
        memberId: m.id,
        type: 'wajib',
        action: 'setor',
        amount: wajibPerMember,
        notes: `Simpanan Wajib Bulanan (${month}) - Pemotongan Gaji / Payroll`
      });
    });

    toast.success(`Berhasil mencatat Simpanan Wajib untuk ${activeMembers.length} anggota!`);
    close();
    if (onSuccess) onSuccess();
  });
}

function printSavingReceipt(savingId) {
  const saving = store.data.savings.find(s => s.id === savingId);
  if (!saving) return;

  const member = store.data.members.find(m => m.id === saving.memberId) || { name: saving.memberId, identifier: '-', department: '-' };

  const content = `
    ${getKopSuratHtml()}
    <div class="print-title">BUKTI ${saving.action === 'setor' ? 'SETORAN' : 'PENARIKAN'} SIMPANAN KOPERASI</div>
    <div class="print-subtitle">No. Transaksi: ${saving.id} &bull; Tanggal: ${formatDate(saving.date)}</div>

    <div class="receipt-box" style="margin: 20px 0;">
      <table style="width: 100%; border: none;">
        <tr>
          <td style="width: 180px; font-weight: bold; border: none;">Nomor Anggota</td>
          <td style="border: none;">: <strong>${member.id}</strong></td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Nama Lengkap</td>
          <td style="border: none;">: ${member.name}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Identitas / Unit</td>
          <td style="border: none;">: ${member.identifier} / ${member.department}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Jenis Simpanan</td>
          <td style="border: none;">: <strong>SIMPANAN ${saving.type.toUpperCase()}</strong></td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Jenis Transaksi</td>
          <td style="border: none;">: ${saving.action === 'setor' ? 'SETORAN SIMPANAN (+)' : 'PENARIKAN SIMPANAN (-)'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Jumlah Nominal</td>
          <td style="border: none; font-size: 14pt; font-weight: bold; color: #0A2540;">: ${formatRupiah(saving.amount)}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Keterangan</td>
          <td style="border: none;">: ${saving.notes || '-'}</td>
        </tr>
      </table>
    </div>

    <div class="print-signatures">
      <div class="print-sign-box">
        <p>Penyetor / Anggota,</p>
        <div class="print-sign-space"></div>
        <p class="print-sign-name">${member.name}</p>
        <p class="print-sign-role">${member.id}</p>
      </div>
      <div class="print-sign-box">
        <p>Cirebon, ${formatDate(saving.date)}</p>
        <p>Petugas Kasir / Bendahara,</p>
        <div class="print-sign-space"></div>
        <p class="print-sign-name">${saving.recordedBy || 'Admin Koperasi'}</p>
        <p class="print-sign-role">Koperasi STMIK IKMI Cirebon</p>
      </div>
    </div>
  `;

  printOfficialDocument(content);
}
