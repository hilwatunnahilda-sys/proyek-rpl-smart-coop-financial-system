// Loans Management & Loan Calculator View
import { store } from '../store.js';
import { auth } from '../auth.js';
import { formatRupiah, formatDate, getStatusBadge, parseNumberInput } from '../utils/formatters.js';
import { calculateLoan, generateInstallmentSchedule } from '../utils/loanCalc.js';
import { toast } from '../utils/toast.js';
import { printOfficialDocument, getKopSuratHtml, exportToCSV } from '../utils/exportPdfCsv.js';

let activeLoanTab = 'all'; // all, pending, disbursed, lunas, simulator

export function renderLoansView(container, navigateTo) {
  const isAdmin = auth.isAdmin();
  const isKetua = auth.isKetua();
  const isAnggota = auth.isAnggota();
  const currentUser = auth.getUser();

  function refresh() {
    let loansList = [...store.data.loans].reverse();

    if (isAnggota) {
      loansList = loansList.filter(l => l.memberId === currentUser.id);
    }

    if (activeLoanTab !== 'all' && activeLoanTab !== 'simulator') {
      loansList = loansList.filter(l => l.status === activeLoanTab);
    }

    const pendingCount = store.data.loans.filter(l => l.status === 'pending').length;
    const disbursedCount = store.data.loans.filter(l => l.status === 'disbursed').length;

    container.innerHTML = `
      <div class="animate-fade-in">
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">
              ${isAnggota ? 'Pinjaman Saya' : 'Manajemen Pinjaman Koperasi'}
            </h2>
            <p style="font-size: 0.825rem; color: var(--text-tertiary);">
              ${isAnggota ? 'Simulasi pinjaman, pengajuan online, dan status persetujuan' : 'Verifikasi pengajuan pinjaman anggota, persetujuan, dan pencairan dana'}
            </p>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="export-loans-csv" class="btn btn-secondary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export CSV
            </button>
            <button id="apply-loan-btn" class="btn btn-primary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              ${isAnggota ? 'Ajukan Pinjaman Baru' : 'Tambah Pengajuan Pinjaman'}
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="tabs-nav">
          <button class="tab-btn ${activeLoanTab === 'all' ? 'active' : ''}" data-tab="all">Semua Pinjaman</button>
          <button class="tab-btn ${activeLoanTab === 'pending' ? 'active' : ''}" data-tab="pending">
            Menunggu Verifikasi
            ${pendingCount > 0 ? `<span class="badge badge-warning" style="margin-left: 0.35rem;">${pendingCount}</span>` : ''}
          </button>
          <button class="tab-btn ${activeLoanTab === 'disbursed' ? 'active' : ''}" data-tab="disbursed">
            Pinjaman Berjalan
            ${disbursedCount > 0 ? `<span class="badge badge-primary" style="margin-left: 0.35rem;">${disbursedCount}</span>` : ''}
          </button>
          <button class="tab-btn ${activeLoanTab === 'lunas' ? 'active' : ''}" data-tab="lunas">Sudah Lunas</button>
          <button class="tab-btn ${activeLoanTab === 'simulator' ? 'active' : ''}" data-tab="simulator">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="18"></line><line x1="8" y1="10" x2="10" y2="10"></line><line x1="8" y1="14" x2="10" y2="14"></line><line x1="8" y1="18" x2="10" y2="18"></line><line x1="12" y1="10" x2="12.01" y2="10"></line><line x1="12" y1="14" x2="12.01" y2="14"></line><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            Kalkulator & Simulasi
          </button>
        </div>

        <!-- Tab Body -->
        ${activeLoanTab === 'simulator' ? renderSimulatorTab() : renderLoansList(loansList)}

      </div>
    `;

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeLoanTab = btn.dataset.tab;
        refresh();
      });
    });

    const applyBtn = container.querySelector('#apply-loan-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => openApplyLoanModal(refresh));
    }

    container.querySelectorAll('.view-loan-detail-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const loanId = btn.dataset.id;
        openLoanDetailModal(loanId, refresh, navigateTo);
      });
    });

    const exportBtn = container.querySelector('#export-loans-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const headers = ['No. Pinjaman', 'ID Anggota', 'Nama Anggota', 'Plafon Pinjaman', 'Tenor (Bulan)', 'Suku Bunga (%)', 'Tgl Pengajuan', 'Tgl Disetujui', 'Tgl Pencairan', 'Status', 'Keperluan'];
        const rows = store.data.loans.map(l => {
          const m = store.data.members.find(mem => mem.id === l.memberId) || { name: '-' };
          return [
            l.id,
            l.memberId,
            m.name,
            l.amount,
            l.tenorMonths,
            l.interestRate,
            l.requestDate,
            l.approvedDate || '-',
            l.disbursedDate || '-',
            l.status,
            l.purpose
          ];
        });
        exportToCSV('Data_Pinjaman_Koperasi_IKMI', headers, rows);
        toast.success('File CSV Data Pinjaman berhasil diunduh.');
      });
    }

    if (activeLoanTab === 'simulator') {
      attachSimulatorEvents();
    }
  }

  function renderLoansList(loansList) {
    return `
      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>No. Pinjaman</th>
                <th>Tanggal</th>
                <th>Anggota</th>
                <th>Plafon Pinjaman</th>
                <th>Tenor</th>
                <th>Angsuran / Bln</th>
                <th>Status</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${loansList.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-tertiary);">
                    Tidak ada data pinjaman pada filter ini.
                  </td>
                </tr>
              ` : loansList.map(l => {
                const member = store.data.members.find(m => m.id === l.memberId) || { name: l.memberId, department: '-' };
                const calc = calculateLoan(l.amount, l.tenorMonths, l.interestRate);
                return `
                  <tr>
                    <td><code>${l.id}</code></td>
                    <td>${formatDate(l.requestDate, false)}</td>
                    <td>
                      <div style="font-weight: 700; color: var(--text-primary);">${member.name}</div>
                      <div style="font-size: 0.725rem; color: var(--text-tertiary);">${l.memberId} &bull; ${member.department}</div>
                    </td>
                    <td><strong>${formatRupiah(l.amount)}</strong></td>
                    <td>${l.tenorMonths} Bulan</td>
                    <td style="color: var(--primary-600); font-weight: 700;">${formatRupiah(calc.monthlyInstallment)}</td>
                    <td>${getStatusBadge(l.status)}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary btn-sm view-loan-detail-btn" data-id="${l.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        Detail & Jadwal
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

  function renderSimulatorTab() {
    return `
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem;">
        
        <!-- Controls -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Kalkulator Simulasi Pinjaman</h3>
              <p class="card-subtitle">Hitung estimasi angsuran pokok, jasa bunga, dan jadwal cicilan</p>
            </div>
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <label class="form-label required" style="margin-bottom: 0;">Plafon Pinjaman (Rp)</label>
              <span id="sim-amount-label" style="font-weight: 800; color: var(--primary-600); font-family: 'Outfit', sans-serif; font-size: 1.1rem;">Rp 10.000.000</span>
            </div>
            <input type="range" id="sim-amount-slider" min="1000000" max="50000000" step="500000" value="10000000" style="width: 100%;">
            <input type="number" id="sim-amount-input" class="form-control" style="margin-top: 0.5rem;" value="10000000" min="1000000" max="50000000" step="500000">
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <label class="form-label required" style="margin-bottom: 0;">Tenor / Jangka Waktu (Bulan)</label>
              <span id="sim-tenor-label" style="font-weight: 800; color: var(--primary-600); font-family: 'Outfit', sans-serif; font-size: 1.1rem;">12 Bulan</span>
            </div>
            <input type="range" id="sim-tenor-slider" min="3" max="36" step="1" value="12" style="width: 100%;">
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              <button class="btn btn-secondary btn-sm sim-tenor-preset" data-val="6">6 Bln</button>
              <button class="btn btn-secondary btn-sm sim-tenor-preset" data-val="12">12 Bln</button>
              <button class="btn btn-secondary btn-sm sim-tenor-preset" data-val="18">18 Bln</button>
              <button class="btn btn-secondary btn-sm sim-tenor-preset" data-val="24">24 Bln</button>
              <button class="btn btn-secondary btn-sm sim-tenor-preset" data-val="36">36 Bln</button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">Suku Bunga Jasa Koperasi (% Flat per Bulan)</label>
            <input type="number" id="sim-rate-input" class="form-control" value="1.2" step="0.1" min="0.5" max="5">
            <div class="form-hint">Standar suku bunga pinjaman Koperasi STMIK IKMI adalah 1.2% flat/bulan</div>
          </div>
        </div>

        <!-- Results Card -->
        <div class="card" style="background: linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-subtle) 100%); border: 1px solid var(--border-color);">
          <div class="card-header">
            <h3 class="card-title">Ringkasan Estimasi Pinjaman</h3>
          </div>

          <div style="margin-bottom: 1.5rem; text-align: center; padding: 1rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
            <div style="font-size: 0.8rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Estimasi Angsuran per Bulan</div>
            <div id="sim-res-monthly" style="font-size: 2.2rem; font-weight: 800; color: var(--primary-600); font-family: 'Outfit', sans-serif;">Rp 953.333</div>
            <div style="font-size: 0.75rem; color: var(--text-tertiary);">Pokok + Jasa Koperasi</div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.875rem; margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <span style="color: var(--text-secondary);">Pokok Pinjaman:</span>
              <strong id="sim-res-principal">Rp 10.000.000</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <span style="color: var(--text-secondary);">Angsuran Pokok / Bulan:</span>
              <strong id="sim-res-monthly-principal">Rp 833.333</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <span style="color: var(--text-secondary);">Jasa Koperasi / Bulan:</span>
              <strong id="sim-res-monthly-interest" style="color: var(--purple-text);">Rp 120.000</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <span style="color: var(--text-secondary);">Total Akumulasi Jasa Bunga:</span>
              <strong id="sim-res-total-interest">Rp 1.440.000</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1rem; font-weight: 800; color: var(--text-primary); padding-top: 0.25rem;">
              <span>Total Pengembalian:</span>
              <span id="sim-res-total-payment" style="color: var(--primary-700);">Rp 11.440.000</span>
            </div>
          </div>

          <button id="sim-apply-btn" class="btn btn-primary" style="width: 100%;">
            Ajukan Pinjaman dengan Simulasi Ini &rarr;
          </button>
        </div>

      </div>
    `;
  }

  function attachSimulatorEvents() {
    const amountSlider = container.querySelector('#sim-amount-slider');
    const amountInput = container.querySelector('#sim-amount-input');
    const amountLabel = container.querySelector('#sim-amount-label');
    const tenorSlider = container.querySelector('#sim-tenor-slider');
    const tenorLabel = container.querySelector('#sim-tenor-label');
    const rateInput = container.querySelector('#sim-rate-input');

    function updateCalc() {
      const p = parseFloat(amountInput.value) || 0;
      const t = parseInt(tenorSlider.value, 10) || 1;
      const r = parseFloat(rateInput.value) || 1.2;

      amountLabel.textContent = formatRupiah(p);
      tenorLabel.textContent = `${t} Bulan`;

      const result = calculateLoan(p, t, r);
      container.querySelector('#sim-res-monthly').textContent = formatRupiah(result.monthlyInstallment);
      container.querySelector('#sim-res-principal').textContent = formatRupiah(result.principal);
      container.querySelector('#sim-res-monthly-principal').textContent = formatRupiah(result.monthlyPrincipal);
      container.querySelector('#sim-res-monthly-interest').textContent = formatRupiah(result.monthlyInterest);
      container.querySelector('#sim-res-total-interest').textContent = formatRupiah(result.totalInterest);
      container.querySelector('#sim-res-total-payment').textContent = formatRupiah(result.totalPayment);
    }

    if (amountSlider) {
      amountSlider.addEventListener('input', (e) => {
        amountInput.value = e.target.value;
        updateCalc();
      });
      amountInput.addEventListener('input', (e) => {
        amountSlider.value = e.target.value;
        updateCalc();
      });
      tenorSlider.addEventListener('input', (e) => {
        updateCalc();
      });
      rateInput.addEventListener('input', () => {
        updateCalc();
      });
      container.querySelectorAll('.sim-tenor-preset').forEach(btn => {
        btn.addEventListener('click', () => {
          tenorSlider.value = btn.dataset.val;
          updateCalc();
        });
      });

      container.querySelector('#sim-apply-btn').addEventListener('click', () => {
        openApplyLoanModal(refresh, {
          amount: amountInput.value,
          tenorMonths: tenorSlider.value,
          interestRate: rateInput.value
        });
      });

      updateCalc();
    }
  }

  refresh();
}

function openApplyLoanModal(onSuccess, preset = null) {
  let modalBackdrop = document.getElementById('app-modal');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'app-modal';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  const currentUser = auth.getUser();
  const isAnggota = auth.isAnggota();
  const activeMembers = store.data.members.filter(m => m.status === 'aktif');

  modalBackdrop.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">Formulir Pengajuan Pinjaman Koperasi</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <form id="apply-loan-form">
        <div class="modal-body">
          
          ${isAnggota ? `
            <input type="hidden" name="memberId" value="${currentUser.id}">
            <div style="background: var(--bg-subtle); padding: 0.75rem 1rem; border-radius: var(--radius-md); margin-bottom: 1.15rem;">
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">Pemohon Pinjaman:</div>
              <div style="font-weight: 700; color: var(--text-primary);">${currentUser.name} (${currentUser.id})</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">${currentUser.department} &bull; ${currentUser.identifier}</div>
            </div>
          ` : `
            <div class="form-group">
              <label class="form-label required">Pilih Anggota Peminjam</label>
              <select name="memberId" class="form-control" required>
                <option value="">-- Pilih Anggota Koperasi --</option>
                ${activeMembers.map(m => `
                  <option value="${m.id}">${m.name} (${m.id} - ${m.type.toUpperCase()})</option>
                `).join('')}
              </select>
            </div>
          `}

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Plafon Pinjaman (Rp)</label>
              <div class="input-group">
                <span class="input-group-text">Rp</span>
                <input type="number" name="amount" class="form-control" min="500000" step="500000" value="${preset ? preset.amount : '5000000'}" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label required">Tenor (Bulan)</label>
              <select name="tenorMonths" class="form-control" required>
                <option value="3" ${preset && preset.tenorMonths == 3 ? 'selected' : ''}>3 Bulan</option>
                <option value="6" ${preset && preset.tenorMonths == 6 ? 'selected' : ''}>6 Bulan</option>
                <option value="10" ${preset && preset.tenorMonths == 10 ? 'selected' : ''}>10 Bulan</option>
                <option value="12" ${(!preset || preset.tenorMonths == 12) ? 'selected' : ''}>12 Bulan (1 Tahun)</option>
                <option value="18" ${preset && preset.tenorMonths == 18 ? 'selected' : ''}>18 Bulan</option>
                <option value="24" ${preset && preset.tenorMonths == 24 ? 'selected' : ''}>24 Bulan (2 Tahun)</option>
                <option value="36" ${preset && preset.tenorMonths == 36 ? 'selected' : ''}>36 Bulan (3 Tahun)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">Tujuan / Keperluan Pengajuan Pinjaman</label>
            <textarea name="purpose" class="form-control" rows="3" placeholder="contoh: Keperluan biaya penelitian dosen / biaya kuliah / pengadaan laptop..." required></textarea>
          </div>

          <div style="background: var(--info-light); border-left: 3px solid var(--info); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--info-text);">
            ℹ️ Pengajuan pinjaman akan ditinjau oleh Admin & Ketua Koperasi STMIK IKMI Cirebon sebelum dicairkan.
          </div>

        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Batal</button>
          <button type="submit" class="btn btn-primary">Kirim Pengajuan</button>
        </div>
      </form>
    </div>
  `;

  modalBackdrop.classList.add('active');

  const close = () => modalBackdrop.classList.remove('active');
  modalBackdrop.querySelector('#modal-close-btn').addEventListener('click', close);
  modalBackdrop.querySelector('#modal-cancel-btn').addEventListener('click', close);

  modalBackdrop.querySelector('#apply-loan-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newLoan = store.applyLoan({
      memberId: formData.get('memberId'),
      amount: parseNumberInput(formData.get('amount')),
      tenorMonths: parseInt(formData.get('tenorMonths'), 10),
      purpose: formData.get('purpose')
    });

    toast.success(`Pengajuan pinjaman ${newLoan.id} berhasil diajukan!`);
    close();
    if (onSuccess) onSuccess();
  });
}

function openLoanDetailModal(loanId, onSuccess, navigateTo) {
  const loan = store.data.loans.find(l => l.id === loanId);
  if (!loan) return;

  const member = store.data.members.find(m => m.id === loan.memberId) || { name: loan.memberId, department: '-', identifier: '-' };
  const isAdmin = auth.isAdmin();
  const isKetua = auth.isKetua();
  const calc = calculateLoan(loan.amount, loan.tenorMonths, loan.interestRate);

  let modalBackdrop = document.getElementById('app-modal');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'app-modal';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  modalBackdrop.innerHTML = `
    <div class="modal-container modal-xl">
      <div class="modal-header">
        <div>
          <h3 class="modal-title">Rincian Pinjaman (${loan.id})</h3>
          <div style="font-size: 0.75rem; color: var(--text-tertiary);">Pemohon: ${member.name} &bull; ${member.department}</div>
        </div>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>

      <div class="modal-body">
        
        <!-- Top Metrics Cards -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
            <span style="font-size: 0.725rem; color: var(--text-tertiary); text-transform: uppercase;">Plafon Pinjaman</span>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary-600);">${formatRupiah(loan.amount)}</div>
          </div>
          <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
            <span style="font-size: 0.725rem; color: var(--text-tertiary); text-transform: uppercase;">Tenor & Suku Bunga</span>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${loan.tenorMonths} Bulan (${loan.interestRate}%/bln)</div>
          </div>
          <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
            <span style="font-size: 0.725rem; color: var(--text-tertiary); text-transform: uppercase;">Angsuran / Bulan</span>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--success-dark);">${formatRupiah(calc.monthlyInstallment)}</div>
          </div>
          <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
            <span style="font-size: 0.725rem; color: var(--text-tertiary); text-transform: uppercase;">Status Pinjaman</span>
            <div style="margin-top: 0.25rem;">${getStatusBadge(loan.status)}</div>
          </div>
        </div>

        <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Keperluan Pinjaman:</div>
          <div style="font-size: 0.9rem; color: var(--text-primary); font-weight: 600;">${loan.purpose}</div>
          ${loan.adminNotes ? `<div style="font-size: 0.8rem; color: var(--primary-600); margin-top: 0.5rem;"><strong>Catatan Verifikasi:</strong> ${loan.adminNotes}</div>` : ''}
        </div>

        <!-- Installment Schedule Table -->
        <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">Jadwal Angsuran Bulanan</h4>
        <div class="table-responsive" style="max-height: 280px; overflow-y: auto;">
          <table class="table">
            <thead>
              <tr>
                <th>Ke-</th>
                <th>Jatuh Tempo</th>
                <th>Pokok</th>
                <th>Jasa (1.2%)</th>
                <th>Total Angsuran</th>
                <th>Sisa Pokok</th>
                <th>Status Bayar</th>
                <th>Tgl Bayar</th>
              </tr>
            </thead>
            <tbody>
              ${loan.schedule.map(s => `
                <tr>
                  <td><strong>#${s.installmentNumber}</strong></td>
                  <td>${formatDate(s.dueDate, false)}</td>
                  <td>${formatRupiah(s.principalAmount)}</td>
                  <td>${formatRupiah(s.interestAmount)}</td>
                  <td><strong>${formatRupiah(s.totalAmount)}</strong></td>
                  <td>${formatRupiah(s.remainingBalance)}</td>
                  <td>${getStatusBadge(s.status)}</td>
                  <td>${s.paidDate ? formatDate(s.paidDate, false) : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

      </div>

      <div class="modal-footer" style="justify-content: space-between;">
        <div>
          <button id="print-loan-agreement-btn" class="btn btn-secondary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Cetak Akad Pinjaman
          </button>
        </div>

        <div style="display: flex; gap: 0.75rem;">
          ${(isAdmin || isKetua) && loan.status === 'pending' ? `
            <button id="reject-loan-btn" class="btn btn-danger btn-sm">Tolak Pengajuan</button>
            <button id="approve-loan-btn" class="btn btn-success btn-sm">Setujui Pinjaman</button>
          ` : ''}

          ${isAdmin && loan.status === 'approved' ? `
            <button id="disburse-loan-btn" class="btn btn-primary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              Cairkan Dana ke Anggota
            </button>
          ` : ''}

          ${loan.status === 'disbursed' ? `
            <button id="goto-installments-btn" class="btn btn-primary btn-sm">
              Bayar Angsuran Pinjaman &rarr;
            </button>
          ` : ''}

          <button class="btn btn-secondary btn-sm" id="modal-close-footer-btn">Tutup</button>
        </div>
      </div>
    </div>
  `;

  modalBackdrop.classList.add('active');

  const close = () => modalBackdrop.classList.remove('active');
  modalBackdrop.querySelector('#modal-close-btn').addEventListener('click', close);
  modalBackdrop.querySelector('#modal-close-footer-btn').addEventListener('click', close);

  const approveBtn = modalBackdrop.querySelector('#approve-loan-btn');
  if (approveBtn) {
    approveBtn.addEventListener('click', () => {
      store.updateLoanStatus(loan.id, 'approved', 'Disetujui oleh pengurus STMIK IKMI');
      toast.success(`Pinjaman ${loan.id} berhasil disetujui! Siap untuk dicairkan.`);
      close();
      if (onSuccess) onSuccess();
    });
  }

  const rejectBtn = modalBackdrop.querySelector('#reject-loan-btn');
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => {
      const reason = prompt('Alasan penolakan pengajuan:');
      if (reason) {
        store.updateLoanStatus(loan.id, 'rejected', reason);
        toast.warning(`Pengajuan ${loan.id} ditolak.`);
        close();
        if (onSuccess) onSuccess();
      }
    });
  }

  const disburseBtn = modalBackdrop.querySelector('#disburse-loan-btn');
  if (disburseBtn) {
    disburseBtn.addEventListener('click', () => {
      const currentCash = store.getTotalCashBalance();
      if (currentCash < loan.amount) {
        toast.error(`Saldo kas koperasi (${formatRupiah(currentCash)}) tidak mencukupi untuk mencairkan ${formatRupiah(loan.amount)}!`);
        return;
      }
      store.updateLoanStatus(loan.id, 'disbursed', 'Dana telah dicairkan via kasir / transfer bank.');
      toast.success(`Dana pinjaman sebesar ${formatRupiah(loan.amount)} telah dicairkan dan dicatat ke buku kas!`);
      close();
      if (onSuccess) onSuccess();
    });
  }

  const gotoInstBtn = modalBackdrop.querySelector('#goto-installments-btn');
  if (gotoInstBtn) {
    gotoInstBtn.addEventListener('click', () => {
      close();
      if (navigateTo) navigateTo('installments');
    });
  }

  modalBackdrop.querySelector('#print-loan-agreement-btn').addEventListener('click', () => {
    const content = `
      ${getKopSuratHtml()}
      <div class="print-title">SURAT PERJANJIAN AKAD PINJAMAN KOPERASI</div>
      <div class="print-subtitle">Nomor Kontrak: ${loan.id} &bull; Tanggal: ${formatDate(loan.requestDate)}</div>

      <p style="margin: 15px 0;">Pada hari ini, telah disepakati akad pinjaman simpan pinjam antara pihak <strong>Koperasi STMIK IKMI Cirebon</strong> dengan anggota sebagai berikut:</p>

      <div class="receipt-box" style="margin: 15px 0;">
        <table style="width: 100%; border: none;">
          <tr>
            <td style="width: 180px; font-weight: bold; border: none;">Nama Lengkap</td>
            <td style="border: none;">: ${member.name}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Nomor Anggota / ID</td>
            <td style="border: none;">: ${member.id} (${member.identifier || '-'})</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Unit / Program Studi</td>
            <td style="border: none;">: ${member.department}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Jumlah Plafon</td>
            <td style="border: none; font-size: 13pt; font-weight: bold;">: ${formatRupiah(loan.amount)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Tenor Pinjaman</td>
            <td style="border: none;">: ${loan.tenorMonths} Bulan</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Jasa Koperasi</td>
            <td style="border: none;">: ${loan.interestRate}% Flat per Bulan</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Angsuran per Bulan</td>
            <td style="border: none; font-weight: bold;">: ${formatRupiah(calc.monthlyInstallment)} (Pokok: ${formatRupiah(calc.monthlyPrincipal)} + Jasa: ${formatRupiah(calc.monthlyInterest)})</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Tujuan Keperluan</td>
            <td style="border: none;">: ${loan.purpose}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 10pt; line-height: 1.5;">
        Peminjam berjanji dan sanggup untuk melunasi kewajiban angsuran setiap bulan sesuai jadwal yang telah ditentukan melalui pemotongan gaji / setor langsung ke Bendahara Koperasi STMIK IKMI Cirebon.
      </p>

      <div class="print-signatures">
        <div class="print-sign-box">
          <p>Peminjam (Anggota),</p>
          <div class="print-sign-space"></div>
          <p class="print-sign-name">${member.name}</p>
          <p class="print-sign-role">${member.id}</p>
        </div>
        <div class="print-sign-box">
          <p>Cirebon, ${formatDate(loan.requestDate)}</p>
          <p>Ketua Koperasi,</p>
          <div class="print-sign-space"></div>
          <p class="print-sign-name">${store.data.coopSettings.ketuaName}</p>
          <p class="print-sign-role">NIDN. 0412087501</p>
        </div>
      </div>
    `;
    printOfficialDocument(content);
  });
}
