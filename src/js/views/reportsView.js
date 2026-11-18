// Financial Reports & Statements View (Laporan Keuangan & Neraca)
import { store } from '../store.js';
import { auth } from '../auth.js';
import { formatRupiah, formatDate } from '../utils/formatters.js';
import { printOfficialDocument, getKopSuratHtml, exportToCSV } from '../utils/exportPdfCsv.js';
import { toast } from '../utils/toast.js';

let activeReportType = 'neraca'; // neraca, labarugi, simpanan, pinjaman, kas

export function renderReportsView(container) {
  const isKetua = auth.isKetua();
  const isAdmin = auth.isAdmin();

  function refresh() {
    const totalCash = store.getTotalCashBalance();
    const savings = store.getSavingsBreakdown();
    const activeLoans = store.getActiveLoansPrincipal();
    const totalDisbursed = store.getTotalDisbursedLoans();
    const interestEarned = store.getTotalInterestEarned();

    // Inflows & Outflows
    const totalInflow = store.data.transactions.filter(t => t.type === 'masuk').reduce((acc, t) => acc + t.amount, 0);
    const totalOutflow = store.data.transactions.filter(t => t.type === 'keluar').reduce((acc, t) => acc + t.amount, 0);
    const operationalExpenses = store.data.transactions
      .filter(t => t.type === 'keluar' && t.category !== 'Pencairan Pinjaman' && t.category !== 'Simpanan Sukarela')
      .reduce((acc, t) => acc + t.amount, 0);

    const netSurplus = interestEarned - operationalExpenses;

    container.innerHTML = `
      <div class="animate-fade-in">
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">Laporan Keuangan & Akuntansi Koperasi</h2>
            <p style="font-size: 0.825rem; color: var(--text-tertiary);">Laporan neraca, laba rugi, arus kas, dan rekapitulasi simpan pinjam STMIK IKMI Cirebon</p>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="print-current-report-btn" class="btn btn-primary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Cetak Laporan (Kop Resmi)
            </button>
          </div>
        </div>

        <!-- Report Tabs -->
        <div class="tabs-nav">
          <button class="tab-btn ${activeReportType === 'neraca' ? 'active' : ''}" data-type="neraca">Neraca Keuangan</button>
          <button class="tab-btn ${activeReportType === 'labarugi' ? 'active' : ''}" data-type="labarugi">Laporan Hasil Usaha (Laba/Rugi)</button>
          <button class="tab-btn ${activeReportType === 'kas' ? 'active' : ''}" data-type="kas">Rekapitulasi Arus Kas</button>
          <button class="tab-btn ${activeReportType === 'simpanan' ? 'active' : ''}" data-type="simpanan">Laporan Simpanan</button>
          <button class="tab-btn ${activeReportType === 'pinjaman' ? 'active' : ''}" data-type="pinjaman">Laporan Pinjaman</button>
        </div>

        <!-- Active Report Content Card -->
        <div class="card" id="report-view-content" style="padding: 2rem;">
          ${renderSpecificReport(activeReportType, {
            totalCash, savings, activeLoans, totalDisbursed, interestEarned, totalInflow, totalOutflow, operationalExpenses, netSurplus
          })}
        </div>

      </div>
    `;

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeReportType = btn.dataset.type;
        refresh();
      });
    });

    container.querySelector('#print-current-report-btn').addEventListener('click', () => {
      printReportDocument(activeReportType, {
        totalCash, savings, activeLoans, totalDisbursed, interestEarned, totalInflow, totalOutflow, operationalExpenses, netSurplus
      });
    });
  }

  function renderSpecificReport(type, data) {
    if (type === 'neraca') {
      const totalAktiva = data.totalCash + data.activeLoans;
      const totalPasiva = data.savings.total + data.netSurplus;
      return `
        <div style="text-align: center; margin-bottom: 2rem;">
          <h3 style="font-size: 1.25rem; font-weight: 800; text-transform: uppercase;">NERACA KEUANGAN KOPERASI</h3>
          <p style="font-size: 0.85rem; color: var(--text-tertiary);">Per ${formatDate(new Date())} &bull; Periode Tahun Buku 2026</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          
          <!-- AKTIVA / ASSETS -->
          <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; background: var(--bg-surface);">
            <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--primary-600); border-bottom: 2px solid var(--primary-500); padding-bottom: 0.5rem; margin-bottom: 1rem;">
              AKTIVA (ASET KOPERASI)
            </h4>
            
            <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.875rem;">
              <div style="display: flex; justify-content: space-between;">
                <span>Kas dan Setara Kas:</span>
                <strong>${formatRupiah(data.totalCash)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Piutang Pinjaman Anggota:</span>
                <strong>${formatRupiah(data.activeLoans)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
                <span style="font-weight: 600;">Total Aset Lancar:</span>
                <strong style="color: var(--primary-600);">${formatRupiah(totalAktiva)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Aset Tetap & Inventaris Kantor:</span>
                <strong>Rp 0</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 800; border-top: 2px solid var(--border-color); padding-top: 0.75rem; color: var(--text-primary); margin-top: 1rem;">
                <span>TOTAL AKTIVA:</span>
                <span style="color: var(--primary-700);">${formatRupiah(totalAktiva)}</span>
              </div>
            </div>
          </div>

          <!-- PASIVA / LIABILITIES & EQUITY -->
          <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; background: var(--bg-surface);">
            <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--purple); border-bottom: 2px solid var(--purple); padding-bottom: 0.5rem; margin-bottom: 1rem;">
              PASIVA (KEWAJIBAN & EKUITAS)
            </h4>

            <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.875rem;">
              <div style="display: flex; justify-content: space-between;">
                <span>Simpanan Pokok:</span>
                <strong>${formatRupiah(data.savings.pokok)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Simpanan Wajib:</span>
                <strong>${formatRupiah(data.savings.wajib)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Simpanan Sukarela (Hutang Anggota):</span>
                <strong>${formatRupiah(data.savings.sukarela)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
                <span style="font-weight: 600;">Total Modal Simpanan:</span>
                <strong style="color: var(--purple);">${formatRupiah(data.savings.total)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Sisa Hasil Usaha (SHU) Berjalan:</span>
                <strong style="color: var(--success);">${formatRupiah(data.netSurplus)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 800; border-top: 2px solid var(--border-color); padding-top: 0.75rem; color: var(--text-primary); margin-top: 1rem;">
                <span>TOTAL PASIVA:</span>
                <span style="color: var(--purple);">${formatRupiah(totalPasiva)}</span>
              </div>
            </div>
          </div>

        </div>
      `;
    } else if (type === 'labarugi') {
      return `
        <div style="text-align: center; margin-bottom: 2rem;">
          <h3 style="font-size: 1.25rem; font-weight: 800; text-transform: uppercase;">LAPORAN HASIL USAHA (LABA / RUGI)</h3>
          <p style="font-size: 0.85rem; color: var(--text-tertiary);">Periode Tahun Berjalan &bull; Koperasi STMIK IKMI Cirebon</p>
        </div>

        <div style="max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; font-size: 0.9rem;">
          
          <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
            <div style="font-weight: 700; color: var(--primary-600); margin-bottom: 0.5rem; text-transform: uppercase;">I. PENDAPATAN OPERASIONAL</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span>Pendapatan Jasa Bunga Pinjaman (1.2%):</span>
              <strong>${formatRupiah(data.interestEarned)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span>Pendapatan Administrasi & Usaha Koperasi:</span>
              <strong>Rp 0</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid var(--border-color); padding-top: 0.5rem; color: var(--success-dark);">
              <span>Total Pendapatan:</span>
              <span>${formatRupiah(data.interestEarned)}</span>
            </div>
          </div>

          <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
            <div style="font-weight: 700; color: var(--danger-dark); margin-bottom: 0.5rem; text-transform: uppercase;">II. BEBAN & BIAYA OPERASIONAL</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span>Biaya ATK, Cetak & Administrasi:</span>
              <strong>${formatRupiah(data.operationalExpenses)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span>Biaya Rapat & Pemeliharaan:</span>
              <strong>Rp 0</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid var(--border-color); padding-top: 0.5rem; color: var(--danger-dark);">
              <span>Total Beban Operasional:</span>
              <span>${formatRupiah(data.operationalExpenses)}</span>
            </div>
          </div>

          <div style="padding: 1.25rem; background: var(--primary-50); border: 1px solid var(--primary-200); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 800; font-size: 1.1rem; color: var(--primary-900);">SISA HASIL USAHA (SHU) BERSIH</div>
              <div style="font-size: 0.75rem; color: var(--primary-700);">Siap dialokasikan untuk Dana Anggota & Koperasi</div>
            </div>
            <div style="font-size: 1.5rem; font-weight: 900; color: var(--primary-700); font-family: 'Outfit', sans-serif;">
              ${formatRupiah(data.netSurplus)}
            </div>
          </div>

        </div>
      `;
    } else {
      // Default to general summary
      return `
        <div style="text-align: center; margin-bottom: 2rem;">
          <h3 style="font-size: 1.25rem; font-weight: 800; text-transform: uppercase;">REKAPITULASI KEUANGAN KOPERASI</h3>
          <p style="font-size: 0.85rem; color: var(--text-tertiary);">Posisi Keuangan & Simpan Pinjam Komprehensif</p>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Indikator Keuangan</th>
                <th>Kategori</th>
                <th style="text-align: right;">Jumlah Nilai (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Saldo Kas & Bank</strong></td>
                <td>Likuiditas Aset</td>
                <td style="text-align: right; font-weight: 700; color: var(--success);">${formatRupiah(data.totalCash)}</td>
              </tr>
              <tr>
                <td><strong>Simpanan Pokok Anggota</strong></td>
                <td>Ekuitas Modal</td>
                <td style="text-align: right; font-weight: 700;">${formatRupiah(data.savings.pokok)}</td>
              </tr>
              <tr>
                <td><strong>Simpanan Wajib Anggota</strong></td>
                <td>Ekuitas Modal</td>
                <td style="text-align: right; font-weight: 700;">${formatRupiah(data.savings.wajib)}</td>
              </tr>
              <tr>
                <td><strong>Simpanan Sukarela Anggota</strong></td>
                <td>Hutang Titipan</td>
                <td style="text-align: right; font-weight: 700;">${formatRupiah(data.savings.sukarela)}</td>
              </tr>
              <tr>
                <td><strong>Total Dana Simpanan</strong></td>
                <td>Akumulasi Simpanan</td>
                <td style="text-align: right; font-weight: 800; color: var(--primary-600);">${formatRupiah(data.savings.total)}</td>
              </tr>
              <tr>
                <td><strong>Total Pinjaman Disalurkan</strong></td>
                <td>Penyaluran Kredit</td>
                <td style="text-align: right; font-weight: 700;">${formatRupiah(data.totalDisbursed)}</td>
              </tr>
              <tr>
                <td><strong>Sisa Pokok Pinjaman Berjalan</strong></td>
                <td>Piutang Aktif</td>
                <td style="text-align: right; font-weight: 700; color: var(--warning-dark);">${formatRupiah(data.activeLoans)}</td>
              </tr>
              <tr>
                <td><strong>Pendapatan Jasa Bunga Koperasi</strong></td>
                <td>Pendapatan Usaha</td>
                <td style="text-align: right; font-weight: 700; color: var(--purple);">${formatRupiah(data.interestEarned)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }
  }

  function printReportDocument(type, data) {
    const content = `
      ${getKopSuratHtml()}
      <div class="print-title">LAPORAN KEUANGAN KOPERASI STMIK IKMI CIREBON</div>
      <div class="print-subtitle">Jenis Laporan: ${type.toUpperCase()} &bull; Tanggal Cetak: ${formatDate(new Date())}</div>

      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 50px;">No</th>
            <th>Pos Akun Keuangan</th>
            <th>Keterangan / Kategori</th>
            <th style="text-align: right;">Jumlah Nominal (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">1</td>
            <td><strong>Kas & Bank Koperasi</strong></td>
            <td>Likuiditas Kas Tunai & Rekening</td>
            <td style="text-align: right; font-weight: bold;">${formatRupiah(data.totalCash)}</td>
          </tr>
          <tr>
            <td style="text-align: center;">2</td>
            <td><strong>Simpanan Pokok</strong></td>
            <td>Setoran Awal Keanggotaan</td>
            <td style="text-align: right;">${formatRupiah(data.savings.pokok)}</td>
          </tr>
          <tr>
            <td style="text-align: center;">3</td>
            <td><strong>Simpanan Wajib</strong></td>
            <td>Iuran Wajib Bulanan Anggota</td>
            <td style="text-align: right;">${formatRupiah(data.savings.wajib)}</td>
          </tr>
          <tr>
            <td style="text-align: center;">4</td>
            <td><strong>Simpanan Sukarela</strong></td>
            <td>Simpanan Tabungan Sukarela Anggota</td>
            <td style="text-align: right;">${formatRupiah(data.savings.sukarela)}</td>
          </tr>
          <tr style="background-color: #f2f2f2;">
            <td style="text-align: center;"><strong>-</strong></td>
            <td><strong>TOTAL DANA SIMPANAN</strong></td>
            <td><strong>Akumulasi Modal Simpanan</strong></td>
            <td style="text-align: right; font-weight: bold;"><strong>${formatRupiah(data.savings.total)}</strong></td>
          </tr>
          <tr>
            <td style="text-align: center;">5</td>
            <td><strong>Pinjaman Berjalan</strong></td>
            <td>Sisa Pokok Piutang Anggota</td>
            <td style="text-align: right;">${formatRupiah(data.activeLoans)}</td>
          </tr>
          <tr>
            <td style="text-align: center;">6</td>
            <td><strong>Pendapatan Jasa Bunga</strong></td>
            <td>Pendapatan Jasa 1.2% Flat</td>
            <td style="text-align: right;">${formatRupiah(data.interestEarned)}</td>
          </tr>
          <tr>
            <td style="text-align: center;">7</td>
            <td><strong>Beban Operasional & ATK</strong></td>
            <td>Biaya Pemeliharaan & Operasional</td>
            <td style="text-align: right;">${formatRupiah(data.operationalExpenses)}</td>
          </tr>
          <tr style="background-color: #e6f0fa;">
            <td style="text-align: center;"><strong>*</strong></td>
            <td><strong>SISA HASIL USAHA (SHU)</strong></td>
            <td><strong>Surplus Hasil Usaha Berjalan</strong></td>
            <td style="text-align: right; font-weight: bold;"><strong>${formatRupiah(data.netSurplus)}</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="print-signatures">
        <div class="print-sign-box">
          <p>Bendahara Koperasi,</p>
          <div class="print-sign-space"></div>
          <p class="print-sign-name">${store.data.coopSettings.bendaharaName}</p>
          <p class="print-sign-role">NIP. 198902142012</p>
        </div>
        <div class="print-sign-box">
          <p>Cirebon, ${formatDate(new Date())}</p>
          <p>Ketua STMIK IKMI Cirebon,</p>
          <div class="print-sign-space"></div>
          <p class="print-sign-name">${store.data.coopSettings.ketuaName}</p>
          <p class="print-sign-role">NIDN. 0412087501</p>
        </div>
      </div>
    `;

    printOfficialDocument(content);
  }

  refresh();
}
