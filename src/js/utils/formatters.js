// Utility Formatters for Currency, Dates, and UI Badges

export function formatRupiah(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateStr, includeDay = true) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  if (includeDay) {
    options.weekday = 'short';
  }
  return new Intl.DateTimeFormat('id-ID', options).format(date);
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function getStatusBadge(status) {
  const map = {
    'aktif': { label: 'Aktif', class: 'badge-success' },
    'nonaktif': { label: 'Nonaktif', class: 'badge-neutral' },
    'pending': { label: 'Menunggu Persetujuan', class: 'badge-warning' },
    'approved': { label: 'Disetujui', class: 'badge-info' },
    'disbursed': { label: 'Dicairkan / Berjalan', class: 'badge-primary' },
    'lunas': { label: 'Lunas', class: 'badge-success' },
    'rejected': { label: 'Ditolak', class: 'badge-danger' },
    'menunggak': { label: 'Menunggak', class: 'badge-danger' },
    'lancar': { label: 'Lancar', class: 'badge-success' },
    'masuk': { label: 'Pemasukan', class: 'badge-success' },
    'keluar': { label: 'Pengeluaran', class: 'badge-danger' },
    'pokok': { label: 'Pokok', class: 'badge-primary' },
    'wajib': { label: 'Wajib', class: 'badge-purple' },
    'sukarela': { label: 'Sukarela', class: 'badge-info' }
  };

  const key = (status || '').toLowerCase();
  const config = map[key] || { label: status, class: 'badge-neutral' };
  return `<span class="badge ${config.class}"><span class="badge-dot"></span>${config.label}</span>`;
}

export function getMemberTypeBadge(type) {
  const map = {
    'dosen': { label: 'Dosen', class: 'badge-primary' },
    'mahasiswa': { label: 'Mahasiswa', class: 'badge-warning' },
    'staf': { label: 'Staf / Karyawan', class: 'badge-info' },
    'admin': { label: 'Admin', class: 'badge-purple' },
    'ketua': { label: 'Ketua STMIK', class: 'badge-success' }
  };

  const key = (type || '').toLowerCase();
  const config = map[key] || { label: type, class: 'badge-neutral' };
  return `<span class="badge ${config.class}">${config.label}</span>`;
}

export function generateId(prefix = 'TX') {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timestamp}${random}`;
}

export function parseNumberInput(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
}
