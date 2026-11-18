// SHU (Sisa Hasil Usaha) Calculation & Distribution Simulation View
import { store } from '../store.js';
import { auth } from '../auth.js';
import { formatRupiah, formatDate, parseNumberInput } from '../utils/formatters.js';
import { printOfficialDocument, getKopSuratHtml, exportToCSV } from '../utils/exportPdfCsv.js';
import { toast } from '../utils/toast.js';

export function renderShuView(container) {
  let customShuNet = 25000000; // Default simulated annual SHU: 25 Juta Rupiah

  function refresh() {
    const settings = store.data.coopSettings;
    const alloc = settings.shuAllocation || { modal: 40, anggota: 30, cadangan: 20, pengurus: 5, pendidikan: 5 };

    const shuJasaModal = (customShuNet * alloc.modal) / 100;
    const shuJasaUsaha = (customShuNet * alloc.anggota) / 100;
    const shuCadangan = (customShuNet * alloc.cadangan) / 100;
    const shuPengurus = (customShuNet * alloc.pengurus) / 100;
    const shuPendidikan = (customShuNet * alloc.pendidikan) / 100;

    const totalSavingsCoop = store.getTotalSavings();
    const totalInterestCoop = store.getTotalInterestEarned() || 1;

    const activeMembers = store.data.members.filter(m => m.status === 'aktif');

    // Calculate each member's share
    const memberDistribution = activeMembers.map(m => {
      const memSavings = store.getMemberSavings(m.id).total;
      
      // Calculate member's total paid interest
      let memPaidInterest = 0;
      store.data.loans.filter(l => l.memberId === m.id).forEach(l => {
        l.schedule.filter(s => s.status === 'paid').forEach(s => {
          memPaidInterest += (s.interestAmount || 0);
        });
      });

      const partModal = totalSavingsCoop > 0 ? (memSavings / totalSavingsCoop) * shuJasaModal : 0;
      const partUsaha = totalInterestCoop > 0 ? (memPaidInterest / totalInterestCoop) * shuJasaUsaha : 0;
      const totalMemberShu = partModal + partUsaha;

      return {
        id: m.id,
        name: m.name,
        type: m.type,
        department: m.department,
        savings: memSavings,
        interestPaid: memPaidInterest,
        partModal: Math.round(partModal),
        partUsaha: Math.round(partUsaha),
        totalShu: Math.round(totalMemberShu)
      };
    });

    container.innerHTML = `
      <div class="animate-fade-in">
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">Perhitungan & Pembagian Sisa Hasil Usaha (SHU)</h2>
            <p style="font-size: 0.825rem; color: var(--text-tertiary);">Simulasi alokasi SHU Jasa Modal & Jasa Usaha per anggota sesuai AD/ART Koperasi STMIK IKMI</p>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="export-shu-csv" class="btn btn-secondary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export CSV
            </button>
            <button id="print-shu-btn" class="btn btn-primary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Cetak Rekap SHU RAT
            </button>
          </div>
        </div>

        <!-- Simulation Input Control -->
        <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-subtle) 100%);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h3 class="card-title">Total SHU Bersih untuk Dibagikan</h3>
              <p class="card-subtitle">Masukkan nilai laba bersih tahun buku yang akan didistribusikan ke anggota</p>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="input-group" style="max-width: 250px;">
                <span class="input-group-text">Rp</span>
                <input type="number" id="custom-shu-input" class="form-control" value="${customShuNet}" min="1000000" step="1000000">
              </div>
              <button id="recalc-shu-btn" class="btn btn-primary">Hitung Distribusi</button>
            </div>
          </div>
        </div>

        <!-- Allocation Distribution Grid -->
        <div class="stats-grid">
          <div class="stat-card" style="--stat-accent: #3b82f6;">
            <div class="stat-info">
              <span class="stat-label">Jasa Modal Simpanan (${alloc.modal}%)</span>
              <span class="stat-value" style="color: var(--primary-600);">${formatRupiah(shuJasaModal)}</span>
              <span class="stat-subtext">Proporsional saldo simpanan</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #10b981;">
            <div class="stat-info">
              <span class="stat-label">Jasa Anggota / Usaha (${alloc.anggota}%)</span>
              <span class="stat-value" style="color: var(--success);">${formatRupiah(shuJasaUsaha)}</span>
              <span class="stat-subtext">Partisipasi pinjaman & belanja</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #8b5cf6;">
            <div class="stat-info">
              <span class="stat-label">Cadangan Koperasi (${alloc.cadangan}%)</span>
              <span class="stat-value" style="color: var(--purple);">${formatRupiah(shuCadangan)}</span>
              <span class="stat-subtext">Pengembangan modal usaha</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--purple-light); --stat-icon-color: var(--purple);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #f59e0b;">
            <div class="stat-info">
              <span class="stat-label">Pengurus & Pendidikan (${alloc.pengurus + alloc.pendidikan}%)</span>
              <span class="stat-value" style="color: var(--warning-dark);">${formatRupiah(shuPengurus + shuPendidikan)}</span>
              <span class="stat-subtext">Insentif & dana sosial</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--warning-light); --stat-icon-color: var(--warning-dark);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
            </div>
          </div>
        </div>

        <!-- Member SHU Table -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Daftar Estimasi Hak SHU Masing-Masing Anggota</h3>
              <p class="card-subtitle">Rincian bagian Jasa Modal (Simpanan) + Bagian Jasa Usaha per orang</p>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>ID Anggota</th>
                  <th>Nama Anggota</th>
                  <th>Unit / Jurusan</th>
                  <th style="text-align: right;">Total Simpanan</th>
                  <th style="text-align: right;">SHU Jasa Modal</th>
                  <th style="text-align: right;">SHU Jasa Usaha</th>
                  <th style="text-align: right;">Total Hak SHU</th>
                </tr>
              </thead>
              <tbody>
                ${memberDistribution.map(m => `
                  <tr>
                    <td><code>${m.id}</code></td>
                    <td><strong>${m.name}</strong></td>
                    <td>${m.department}</td>
                    <td style="text-align: right;">${formatRupiah(m.savings)}</td>
                    <td style="text-align: right; color: var(--primary-600);">${formatRupiah(m.partModal)}</td>
                    <td style="text-align: right; color: var(--success);">${formatRupiah(m.partUsaha)}</td>
                    <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: var(--purple-text);">
                      ${formatRupiah(m.totalShu)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    container.querySelector('#recalc-shu-btn').addEventListener('click', () => {
      customShuNet = parseNumberInput(container.querySelector('#custom-shu-input').value);
      toast.success('Simulasi pembagian SHU diperbarui!');
      refresh();
    });

    const exportBtn = container.querySelector('#export-shu-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const headers = ['ID Anggota', 'Nama Anggota', 'Kategori', 'Unit/Prodi', 'Total Simpanan', 'SHU Jasa Modal', 'SHU Jasa Usaha', 'Total SHU Diterima'];
        const rows = memberDistribution.map(m => [
          m.id,
          m.name,
          m.type,
          m.department,
          m.savings,
          m.partModal,
          m.partUsaha,
          m.totalShu
        ]);
        exportToCSV('Distribusi_SHU_Koperasi_IKMI', headers, rows);
        toast.success('File CSV Distribusi SHU berhasil diunduh.');
      });
    }

    container.querySelector('#print-shu-btn').addEventListener('click', () => {
      const content = `
        ${getKopSuratHtml()}
        <div class="print-title">DAFTAR PEMBAGIAN SISA HASIL USAHA (SHU)</div>
        <div class="print-subtitle">Rapat Anggota Tahunan (RAT) &bull; Total SHU Bersih: ${formatRupiah(customShuNet)}</div>

        <table class="print-table">
          <thead>
            <tr>
              <th>No</th>
              <th>ID Anggota</th>
              <th>Nama Anggota</th>
              <th>Total Simpanan</th>
              <th>SHU Modal (40%)</th>
              <th>SHU Usaha (30%)</th>
              <th style="text-align: right;">Total SHU (Rp)</th>
              <th style="width: 100px;">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>
            ${memberDistribution.map((m, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${m.id}</td>
                <td><strong>${m.name}</strong></td>
                <td style="text-align: right;">${formatRupiah(m.savings)}</td>
                <td style="text-align: right;">${formatRupiah(m.partModal)}</td>
                <td style="text-align: right;">${formatRupiah(m.partUsaha)}</td>
                <td style="text-align: right; font-weight: bold;">${formatRupiah(m.totalShu)}</td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="print-signatures">
          <div class="print-sign-box">
            <p>Bendahara Koperasi,</p>
            <div class="print-sign-space"></div>
            <p class="print-sign-name">${settings.bendaharaName}</p>
            <p class="print-sign-role">NIP. 198902142012</p>
          </div>
          <div class="print-sign-box">
            <p>Cirebon, ${formatDate(new Date())}</p>
            <p>Ketua Koperasi,</p>
            <div class="print-sign-space"></div>
            <p class="print-sign-name">${settings.ketuaName}</p>
            <p class="print-sign-role">NIDN. 0412087501</p>
          </div>
        </div>
      `;
      printOfficialDocument(content);
    });
  }

  refresh();
}
