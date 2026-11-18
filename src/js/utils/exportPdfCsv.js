// Export to CSV & Official Print Helpers with STMIK IKMI Letterhead

export function exportToCSV(filename, headers, rows) {
  let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility

  // Add Headers
  csvContent += headers.map(h => `"${(h || '').replace(/"/g, '""')}"`).join(',') + '\r\n';

  // Add Data Rows
  rows.forEach(row => {
    const rowContent = row.map(val => {
      const formatted = (val === null || val === undefined) ? '' : String(val);
      return `"${formatted.replace(/"/g, '""')}"`;
    }).join(',');
    csvContent += rowContent + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printOfficialDocument(contentHtml) {
  let printContainer = document.getElementById('print-area');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'print-area';
    document.body.appendChild(printContainer);
  }

  printContainer.innerHTML = contentHtml;
  window.print();
}

export function getKopSuratHtml() {
  return `
    <div class="print-kop-header">
      <div class="print-logo-box">
        <svg width="70" height="70" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" fill="#0A2540" stroke="#f59e0b" stroke-width="4"/>
          <path d="M50 18L78 35V65L50 82L22 65V35L50 18Z" fill="#1e40af" stroke="#ffffff" stroke-width="2"/>
          <text x="50" y="58" font-family="'Outfit', sans-serif" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">IKMI</text>
        </svg>
      </div>
      <div class="print-kop-text">
        <h2>KOPERASI KELUARGA BESAR STMIK IKMI CIREBON</h2>
        <h3>SMART CO-OP FINANCIAL SYSTEM</h3>
        <p>Badan Hukum No: 518/BH/DISKOP-UKM/2020 | NPWP: 01.890.342.1-426.000</p>
        <p>Jl. Perjuangan No. 10B, Karyamulya, Kec. Kesambi, Kota Cirebon, Jawa Barat 45131</p>
        <p>Telp: (0231) 490480 | Website: ikmi.ac.id | Email: koperasi@ikmi.ac.id</p>
      </div>
    </div>
  `;
}
