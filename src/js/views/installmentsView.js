// Installments Management View (Manajemen Angsuran & Pelunasan)
import { store } from '../store.js';
import { auth } from '../auth.js';
import { formatRupiah, formatDate, getStatusBadge } from '../utils/formatters.js';
import { toast } from '../utils/toast.js';
import { printOfficialDocument, getKopSuratHtml, exportToCSV } from '../utils/exportPdfCsv.js';
import confetti from 'canvas-confetti';

let activeInstFilter = 'all'; // all, pending, paid

export function renderInstallmentsView(container) {
  const isAdmin = auth.isAdmin();
  const isKetua = auth.isKetua();
  const isAnggota = auth.isAnggota();
  const currentUser = auth.getUser();

  function refresh() {
    let disbursedLoans = store.data.loans.filter(l => l.status === 'disbursed' || l.status === 'lunas');

    if (isAnggota) {
      disbursedLoans = disbursedLoans.filter(l => l.memberId === currentUser.id);
    }

    // Flatten installment items
    let allInstallments = [];
    disbursedLoans.forEach(loan => {
      const member = store.data.members.find(m => m.id === loan.memberId) || { name: loan.memberId, department: '-' };
      loan.schedule.forEach(item => {
        allInstallments.push({
          loanId: loan.id,
          memberId: loan.memberId,
          memberName: member.name,
          department: member.department,
          ...item
        });
      });
    });

    // Filter by pending/paid
    if (activeInstFilter === 'pending') {
      allInstallments = allInstallments.filter(i => i.status === 'pending');
    } else if (activeInstFilter === 'paid') {
      allInstallments = allInstallments.filter(i => i.status === 'paid');
    }

    // Sort by dueDate
    allInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const totalCollected = allInstallments
      .filter(i => i.status === 'paid')
      .reduce((acc, i) => acc + i.totalAmount, 0);

    const totalOutstanding = allInstallments
      .filter(i => i.status === 'pending')
      .reduce((acc, i) => acc + i.totalAmount, 0);

    container.innerHTML = `
      <div class="animate-fade-in">
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">
              ${isAnggota ? 'Jadwal & Riwayat Angsuran Saya' : 'Manajemen Pembayaran Angsuran'}
            </h2>
            <p style="font-size: 0.825rem; color: var(--text-tertiary);">
              Kelola pembayaran cicilan pokok dan jasa bunga koperasi, cetak kuitansi resmi
            </p>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="export-inst-csv" class="btn btn-secondary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export CSV
            </button>
            ${isAdmin ? `
              <button id="quick-pay-inst-btn" class="btn btn-primary btn-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                Proses Pembayaran Angsuran
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Metric Cards -->
        <div class="stats-grid">
          <div class="stat-card" style="--stat-accent: #10b981;">
            <div class="stat-info">
              <span class="stat-label">Total Angsuran Diterima</span>
              <span class="stat-value" style="color: var(--success);">${formatRupiah(totalCollected)}</span>
              <span class="stat-subtext">Sudah masuk ke kas koperasi</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #f59e0b;">
            <div class="stat-info">
              <span class="stat-label">Piutang Angsuran Berjalan</span>
              <span class="stat-value">${formatRupiah(totalOutstanding)}</span>
              <span class="stat-subtext">Sisa jadwal cicilan</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--warning-light); --stat-icon-color: var(--warning-dark);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="tabs-nav">
          <button class="tab-btn ${activeInstFilter === 'all' ? 'active' : ''}" data-filter="all">Semua Jadwal Angsuran</button>
          <button class="tab-btn ${activeInstFilter === 'pending' ? 'active' : ''}" data-filter="pending">Belum Dibayar / Tagihan</button>
          <button class="tab-btn ${activeInstFilter === 'paid' ? 'active' : ''}" data-filter="paid">Sudah Lunas Terbayar</button>
        </div>

        <!-- Installments Table -->
        <div class="card">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>No. Pinjaman</th>
                  <th>Anggota</th>
                  <th>Angsuran Ke</th>
                  <th>Jatuh Tempo</th>
                  <th>Pokok</th>
                  <th>Jasa (1.2%)</th>
                  <th>Total Tagihan</th>
                  <th>Status</th>
                  <th style="text-align: center;">Aksi / Kuitansi</th>
                </tr>
              </thead>
              <tbody>
                ${allInstallments.length === 0 ? `
                  <tr>
                    <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-tertiary);">
                      Tidak ada data angsuran pada kategori ini.
                    </td>
                  </tr>
                ` : allInstallments.map(item => `
                  <tr>
                    <td><code>${item.loanId}</code></td>
                    <td>
                      <div style="font-weight: 700; color: var(--text-primary);">${item.memberName}</div>
                      <div style="font-size: 0.725rem; color: var(--text-tertiary);">${item.department}</div>
                    </td>
                    <td><span class="badge badge-purple">Bulan Ke-${item.installmentNumber}</span></td>
                    <td>${formatDate(item.dueDate, false)}</td>
                    <td>${formatRupiah(item.principalAmount)}</td>
                    <td style="color: var(--purple-text);">${formatRupiah(item.interestAmount)}</td>
                    <td><strong>${formatRupiah(item.totalAmount)}</strong></td>
                    <td>${getStatusBadge(item.status)}</td>
                    <td style="text-align: center;">
                      ${item.status === 'paid' ? `
                        <button class="btn btn-secondary btn-sm print-inst-receipt-btn" data-loan="${item.loanId}" data-num="${item.installmentNumber}" title="Cetak Kuitansi Resmi">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                          Kuitansi
                        </button>
                      ` : (isAdmin ? `
                        <button class="btn btn-success btn-sm pay-single-inst-btn" data-loan="${item.loanId}" data-num="${item.installmentNumber}">
                          Bayar Sekarang
                        </button>
                      ` : `
                        <span style="font-size: 0.75rem; color: var(--text-tertiary);">Menunggu Pembayaran</span>
                      `)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeInstFilter = btn.dataset.filter;
        refresh();
      });
    });

    const quickPayBtn = container.querySelector('#quick-pay-inst-btn');
    if (quickPayBtn) {
      quickPayBtn.addEventListener('click', () => openPayInstallmentModal(refresh));
    }

    container.querySelectorAll('.pay-single-inst-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const loanId = btn.dataset.loan;
        const num = btn.dataset.num;
        openPayInstallmentModal(refresh, loanId, num);
      });
    });

    container.querySelectorAll('.print-inst-receipt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const loanId = btn.dataset.loan;
        const num = btn.dataset.num;
        printInstallmentReceipt(loanId, num);
      });
    });

    const exportBtn = container.querySelector('#export-inst-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const headers = ['No. Pinjaman', 'ID Anggota', 'Nama Anggota', 'Angsuran Ke', 'Jatuh Tempo', 'Pokok', 'Jasa Bunga', 'Total Angsuran', 'Status', 'Tgl Bayar', 'Metode Bayar', 'No. Kuitansi'];
        const rows = allInstallments.map(i => [
          i.loanId,
          i.memberId,
          i.memberName,
          i.installmentNumber,
          i.dueDate,
          i.principalAmount,
          i.interestAmount,
          i.totalAmount,
          i.status,
          i.paidDate || '-',
          i.paymentMethod || '-',
          i.receiptNumber || '-'
        ]);
        exportToCSV('Data_Jadwal_Angsuran_Koperasi_IKMI', headers, rows);
        toast.success('File CSV Angsuran berhasil diunduh.');
      });
    }
  }

  refresh();
}

function openPayInstallmentModal(onSuccess, presetLoanId = null, presetNum = null) {
  let modalBackdrop = document.getElementById('app-modal');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'app-modal';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  const activeLoans = store.data.loans.filter(l => l.status === 'disbursed');

  if (activeLoans.length === 0) {
    toast.info('Tidak ada pinjaman berjalan yang memiliki tagihan angsuran saat ini.');
    return;
  }

  const selectedLoan = presetLoanId ? activeLoans.find(l => l.id === presetLoanId) || activeLoans[0] : activeLoans[0];
  const pendingItems = selectedLoan.schedule.filter(s => s.status === 'pending');

  modalBackdrop.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">Proses Pembayaran Angsuran Pinjaman</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <form id="pay-inst-form">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label required">Pilih Pinjaman Berjalan</label>
            <select name="loanId" id="modal-pay-loan-select" class="form-control" required>
              ${activeLoans.map(l => {
                const member = store.data.members.find(m => m.id === l.memberId) || { name: l.memberId };
                return `
                  <option value="${l.id}" ${l.id === selectedLoan.id ? 'selected' : ''}>
                    ${l.id} - ${member.name} (${formatRupiah(l.amount)})
                  </option>
                `;
              }).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">Pilih Bulan Angsuran Tagihan</label>
            <select name="installmentNumber" id="modal-pay-num-select" class="form-control" required>
              ${pendingItems.map(p => `
                <option value="${p.installmentNumber}" ${presetNum && p.installmentNumber == presetNum ? 'selected' : ''}>
                  Angsuran Ke-${p.installmentNumber} (Jatuh Tempo: ${formatDate(p.dueDate, false)}) - ${formatRupiah(p.totalAmount)}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">Metode Pembayaran</label>
            <select name="paymentMethod" class="form-control" required>
              <option value="Potong Payroll / Gaji">Potong Gaji / Payroll STMIK IKMI</option>
              <option value="Transfer Bank BCA / Mandiri">Transfer Virtual Account / Bank</option>
              <option value="Tunai Kasir Koperasi">Tunai / Cash di Kasir Koperasi</option>
            </select>
          </div>

          <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem;">
              <span>Alokasi Pokok:</span>
              <strong id="modal-pay-pokok">-</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem;">
              <span>Alokasi Jasa Koperasi (1.2%):</span>
              <strong id="modal-pay-jasa" style="color: var(--purple-text);">-</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 800; border-top: 1px solid var(--border-color); padding-top: 0.5rem; color: var(--primary-600);">
              <span>Total Bayar:</span>
              <span id="modal-pay-total">-</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Batal</button>
          <button type="submit" class="btn btn-success">Konfirmasi & Cetak Kuitansi</button>
        </div>
      </form>
    </div>
  `;

  modalBackdrop.classList.add('active');

  const close = () => modalBackdrop.classList.remove('active');
  modalBackdrop.querySelector('#modal-close-btn').addEventListener('click', close);
  modalBackdrop.querySelector('#modal-cancel-btn').addEventListener('click', close);

  const loanSelect = modalBackdrop.querySelector('#modal-pay-loan-select');
  const numSelect = modalBackdrop.querySelector('#modal-pay-num-select');

  function updateBreakdown() {
    const curLoan = activeLoans.find(l => l.id === loanSelect.value);
    if (!curLoan) return;
    const curNum = parseInt(numSelect.value, 10);
    const item = curLoan.schedule.find(s => s.installmentNumber === curNum);
    if (item) {
      modalBackdrop.querySelector('#modal-pay-pokok').textContent = formatRupiah(item.principalAmount);
      modalBackdrop.querySelector('#modal-pay-jasa').textContent = formatRupiah(item.interestAmount);
      modalBackdrop.querySelector('#modal-pay-total').textContent = formatRupiah(item.totalAmount);
    }
  }

  loanSelect.addEventListener('change', () => {
    const curLoan = activeLoans.find(l => l.id === loanSelect.value);
    if (!curLoan) return;
    const pending = curLoan.schedule.filter(s => s.status === 'pending');
    numSelect.innerHTML = pending.map(p => `
      <option value="${p.installmentNumber}">
        Angsuran Ke-${p.installmentNumber} (Jatuh Tempo: ${formatDate(p.dueDate, false)}) - ${formatRupiah(p.totalAmount)}
      </option>
    `).join('');
    updateBreakdown();
  });

  numSelect.addEventListener('change', updateBreakdown);
  updateBreakdown();

  modalBackdrop.querySelector('#pay-inst-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const loanId = formData.get('loanId');
    const num = formData.get('installmentNumber');
    const method = formData.get('paymentMethod');

    const result = store.payInstallment(loanId, num, method);

    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 }
    });

    toast.success(`Pembayaran Angsuran #${num} (${loanId}) berhasil dicatat! No. Kuitansi: ${result.receiptNum}`);
    close();
    if (onSuccess) onSuccess();

    // Offer instant receipt printing
    setTimeout(() => {
      printInstallmentReceipt(loanId, num);
    }, 400);
  });
}

function printInstallmentReceipt(loanId, installmentNumber) {
  const loan = store.data.loans.find(l => l.id === loanId);
  if (!loan) return;

  const item = loan.schedule.find(s => s.installmentNumber === parseInt(installmentNumber, 10));
  if (!item) return;

  const member = store.data.members.find(m => m.id === loan.memberId) || { name: loan.memberId, identifier: '-', department: '-' };

  const content = `
    ${getKopSuratHtml()}
    <div class="print-title">KUITANSI RESMI PEMBAYARAN ANGSURAN PINJAMAN</div>
    <div class="print-subtitle">Nomor Kuitansi: ${item.receiptNumber || 'KW-2026-IKMI'} &bull; Tanggal: ${formatDate(item.paidDate || new Date())}</div>

    <div class="receipt-box" style="margin: 20px 0;">
      <table style="width: 100%; border: none;">
        <tr>
          <td style="width: 180px; font-weight: bold; border: none;">Sudah Terima Dari</td>
          <td style="border: none;">: <strong>${member.name}</strong> (${member.id})</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Unit / Jurusan</td>
          <td style="border: none;">: ${member.department} (${member.identifier || '-'})</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Nomor Pinjaman</td>
          <td style="border: none;">: <strong>${loan.id}</strong> (Plafon: ${formatRupiah(loan.amount)})</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Pembayaran Untuk</td>
          <td style="border: none;">: <strong>Angsuran Ke-${item.installmentNumber} dari ${loan.tenorMonths} Bulan</strong></td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Rincian Angsuran</td>
          <td style="border: none;">: Pokok: ${formatRupiah(item.principalAmount)} + Jasa Koperasi (1.2%): ${formatRupiah(item.interestAmount)}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Jumlah Pembayaran</td>
          <td style="border: none; font-size: 14pt; font-weight: bold; color: #0A2540;">: ${formatRupiah(item.totalAmount)}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Sisa Pokok Pinjaman</td>
          <td style="border: none; font-weight: bold;">: ${formatRupiah(item.remainingBalance)}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none;">Metode Pembayaran</td>
          <td style="border: none;">: ${item.paymentMethod || 'Potong Gaji / Transfer Bank'}</td>
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
        <p>Cirebon, ${formatDate(item.paidDate || new Date())}</p>
        <p>Bendahara Koperasi STMIK IKMI,</p>
        <div class="print-sign-space"></div>
        <p class="print-sign-name">${store.data.coopSettings.bendaharaName}</p>
        <p class="print-sign-role">NIP. 198902142012</p>
      </div>
    </div>
  `;

  printOfficialDocument(content);
}
