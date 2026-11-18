/**
 * Report Export Service
 * Supports CSV export with Excel-compatible UTF-8 BOM and print-ready PDF views
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { INSTITUTION } from '../../config/constants.js';

export class ExportService {
  /**
   * Export array of data objects to CSV file
   * 
   * @param {string} filename - Base name for the download file (e.g. 'laporan_transaksi_2026')
   * @param {Array<{ key: string, label: string }>} columns - Header definition
   * @param {Array<Object>} rows - Data rows
   */
  static exportToCSV(filename, columns, rows) {
    if (!rows || rows.length === 0) {
      alert('Tidak ada data yang dapat diekspor.');
      return;
    }

    const cleanFilename = `${filename.replace(/[^a-z0-9_-]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

    // 1. Build Header
    const headerRow = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(';');

    // 2. Build Rows
    const dataRows = rows.map(row => {
      return columns.map(col => {
        let val = row[col.key];
        if (val === undefined || val === null) val = '';
        if (typeof val === 'number') {
          return `"${val}"`;
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(';');
    });

    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');

    // 3. Trigger Browser File Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', cleanFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates official print-ready PDF layout and invokes browser print dialog
   * 
   * @param {Object} options
   * @param {string} options.title - Report title
   * @param {string} options.subtitle - Period / Filter description
   * @param {Array<{ label: string, value: string }>} [options.summaryCards] - Summary statistics cards
   * @param {Array<{ label: string, key: string, align?: string }>} options.columns - Table headers
   * @param {Array<Object>} options.rows - Data items
   * @param {string} [options.signerName] - Name for signature block
   * @param {string} [options.signerRole] - Role for signature block
   */
  static printReport({
    title,
    subtitle = '',
    summaryCards = [],
    columns,
    rows,
    signerName = 'Dr. H. Dadang Sudrajat, S.Kom., M.Kom.',
    signerRole = 'Ketua Koperasi STMIK IKMI'
  }) {
    let printArea = document.getElementById('print-area');
    if (!printArea) {
      printArea = document.createElement('div');
      printArea.id = 'print-area';
      document.body.appendChild(printArea);
    }

    const currentDateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    printArea.innerHTML = `
      <div class="print-kop-header">
        <div class="print-kop-text">
          <h2>${INSTITUTION.COOP_NAME}</h2>
          <h3>${INSTITUTION.NAME}</h3>
          <p>${INSTITUTION.ADDRESS}</p>
          <p>Badan Hukum: ${INSTITUTION.LEGAL_NUMBER} | Telp: ${INSTITUTION.PHONE} | Email: ${INSTITUTION.EMAIL}</p>
        </div>
      </div>

      <div class="print-title">${title}</div>
      ${subtitle ? `<div class="print-subtitle">${subtitle}</div>` : ''}

      ${summaryCards.length > 0 ? `
        <div style="display: flex; gap: 15px; margin-bottom: 15px; border: 1px solid #000; padding: 10px;">
          ${summaryCards.map(c => `
            <div style="flex: 1; text-align: center;">
              <div style="font-size: 9pt; color: #555;">${c.label}</div>
              <div style="font-size: 11pt; font-weight: bold; margin-top: 2px;">${c.value}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 35px;">No.</th>
            ${columns.map(c => `<th style="text-align: ${c.align || 'left'};">${c.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows.map((r, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              ${columns.map(c => `
                <td style="text-align: ${c.align || 'left'};">
                  ${r[c.key] !== undefined && r[c.key] !== null ? r[c.key] : '-'}
                </td>
              `).join('')}
            </tr>
          `).join('') : `
            <tr>
              <td colspan="${columns.length + 1}" style="text-align: center; padding: 15px;">
                Tidak ada data pada periode ini.
              </td>
            </tr>
          `}
        </tbody>
      </table>

      <div class="print-signatures">
        <div class="print-sign-box">
          <p>Mengetahui,</p>
          <p class="print-sign-role">${signerRole}</p>
          <div class="print-sign-space"></div>
          <p class="print-sign-name">${signerName}</p>
        </div>

        <div class="print-sign-box">
          <p>Cirebon, ${currentDateStr}</p>
          <p class="print-sign-role">Petugas Administrasi & Keuangan</p>
          <div class="print-sign-space"></div>
          <p class="print-sign-name">Admin Koperasi IKMI</p>
        </div>
      </div>
    `;

    window.print();
  }
}
