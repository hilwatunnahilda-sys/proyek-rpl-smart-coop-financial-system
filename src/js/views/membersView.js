// Members Management View (Manajemen Anggota)
import { store } from '../store.js';
import { auth } from '../auth.js';
import { formatRupiah, formatDate, getStatusBadge, getMemberTypeBadge } from '../utils/formatters.js';
import { toast } from '../utils/toast.js';
import { printOfficialDocument, getKopSuratHtml, exportToCSV } from '../utils/exportPdfCsv.js';

let currentFilterType = 'all';
let currentSearch = '';

export function renderMembersView(container) {
  const isAdmin = auth.isAdmin();
  const isKetua = auth.isKetua();

  function refresh() {
    let members = store.data.members;

    if (currentFilterType !== 'all') {
      members = members.filter(m => m.type === currentFilterType);
    }

    if (currentSearch.trim() !== '') {
      const q = currentSearch.toLowerCase();
      members = members.filter(m => 
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.identifier && m.identifier.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q))
      );
    }

    container.innerHTML = `
      <div class="animate-fade-in">
        
        <!-- Header & Actions -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">Manajemen Anggota Koperasi</h2>
            <p style="font-size: 0.825rem; color: var(--text-tertiary);">Kelola data anggota dosen, staf, dan mahasiswa STMIK IKMI Cirebon</p>
          </div>
          
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="export-members-csv" class="btn btn-secondary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export CSV
            </button>
            ${isAdmin ? `
              <button id="add-member-btn" class="btn btn-primary btn-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Tambah Anggota Baru
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 1rem;">
          <div style="display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
            
            <div style="flex: 1; min-width: 250px; position: relative;">
              <input type="text" id="member-search" class="form-control" placeholder="Cari nama, ID Anggota, NIK/NIM/NIDN, atau Prodi..." value="${currentSearch}">
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn btn-sm filter-type-btn ${currentFilterType === 'all' ? 'btn-primary' : 'btn-secondary'}" data-type="all">Semua (${store.data.members.length})</button>
              <button class="btn btn-sm filter-type-btn ${currentFilterType === 'dosen' ? 'btn-primary' : 'btn-secondary'}" data-type="dosen">Dosen</button>
              <button class="btn btn-sm filter-type-btn ${currentFilterType === 'mahasiswa' ? 'btn-primary' : 'btn-secondary'}" data-type="mahasiswa">Mahasiswa</button>
              <button class="btn btn-sm filter-type-btn ${currentFilterType === 'staf' ? 'btn-primary' : 'btn-secondary'}" data-type="staf">Staf</button>
            </div>

          </div>
        </div>

        <!-- Members Table -->
        <div class="card">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>ID Anggota</th>
                  <th>Nama Lengkap</th>
                  <th>Kategori</th>
                  <th>Identitas (NIDN/NIM/NIP)</th>
                  <th>Unit / Program Studi</th>
                  <th>Total Simpanan</th>
                  <th>Status</th>
                  <th style="text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${members.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                      Tidak ada data anggota yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ` : members.map(m => {
                  const savings = store.getMemberSavings(m.id);
                  return `
                    <tr>
                      <td><code>${m.id}</code></td>
                      <td>
                        <div style="font-weight: 700; color: var(--text-primary);">${m.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-tertiary);">${m.email}</div>
                      </td>
                      <td>${getMemberTypeBadge(m.type)}</td>
                      <td><code>${m.identifier || '-'}</code></td>
                      <td>${m.department || '-'}</td>
                      <td><strong>${formatRupiah(savings.total)}</strong></td>
                      <td>${getStatusBadge(m.status)}</td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 0.35rem;">
                          <button class="btn btn-secondary btn-sm view-member-btn" data-id="${m.id}" title="Detail Anggota & KTA">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            Detail
                          </button>
                          ${isAdmin ? `
                            <button class="btn btn-secondary btn-sm edit-member-btn" data-id="${m.id}" title="Edit Data">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn ${m.status === 'aktif' ? 'btn-secondary' : 'btn-success'} btn-sm toggle-status-btn" data-id="${m.id}" title="${m.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}">
                              ${m.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    // Attach Event Listeners
    const searchInput = container.querySelector('#member-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        refresh();
        const inputAfter = container.querySelector('#member-search');
        if (inputAfter) {
          inputAfter.focus();
          inputAfter.selectionStart = inputAfter.selectionEnd = inputAfter.value.length;
        }
      });
    }

    container.querySelectorAll('.filter-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentFilterType = btn.dataset.type;
        refresh();
      });
    });

    const addBtn = container.querySelector('#add-member-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => openAddMemberModal(refresh));
    }

    container.querySelectorAll('.view-member-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const memberId = btn.dataset.id;
        openMemberDetailModal(memberId);
      });
    });

    container.querySelectorAll('.edit-member-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const memberId = btn.dataset.id;
        openEditMemberModal(memberId, refresh);
      });
    });

    container.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const memberId = btn.dataset.id;
        store.deleteMember(memberId);
        toast.info('Status anggota berhasil diperbarui.');
        refresh();
      });
    });

    const exportBtn = container.querySelector('#export-members-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const headers = ['ID Anggota', 'Nama Lengkap', 'Kategori', 'Identitas', 'Unit/Prodi', 'Email', 'No Telepon', 'Tanggal Bergabung', 'Status', 'Simpanan Pokok', 'Simpanan Wajib', 'Simpanan Sukarela', 'Total Simpanan'];
        const rows = store.data.members.map(m => {
          const s = store.getMemberSavings(m.id);
          return [
            m.id,
            m.name,
            m.type,
            m.identifier,
            m.department,
            m.email,
            m.phone,
            m.joinDate,
            m.status,
            s.pokok,
            s.wajib,
            s.sukarela,
            s.total
          ];
        });
        exportToCSV('Data_Anggota_Koperasi_STMIK_IKMI', headers, rows);
        toast.success('File CSV Data Anggota berhasil diunduh.');
      });
    }
  }

  refresh();
}

// ---------------------------------------------
// Modals
// ---------------------------------------------

function openAddMemberModal(onSuccess) {
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
        <h3 class="modal-title">Tambah Anggota Koperasi Baru</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <form id="add-member-form">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label required">Nama Lengkap & Gelar</label>
            <input type="text" name="name" class="form-control" placeholder="contoh: Dr. Rian Pratama, M.Kom." required>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Kategori Anggota</label>
              <select name="type" class="form-control" required>
                <option value="dosen">Dosen</option>
                <option value="mahasiswa">Mahasiswa</option>
                <option value="staf">Staf / Karyawan</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Nomor Identitas (NIDN/NIM/NIP)</label>
              <input type="text" name="identifier" class="form-control" placeholder="contoh: NIDN 0411223301" required>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Unit Kerja / Program Studi</label>
              <input type="text" name="department" class="form-control" placeholder="contoh: Teknik Informatika (S1)" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Email STMIK IKMI</label>
              <input type="email" name="email" class="form-control" placeholder="contoh: rian@ikmi.ac.id" required>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">No. WhatsApp / HP</label>
              <input type="tel" name="phone" class="form-control" placeholder="contoh: 08123456789" required>
            </div>
            <div class="form-group">
              <label class="form-label">Simpanan Pokok Awal (Wajib)</label>
              <input type="text" class="form-control" value="${formatRupiah(store.data.coopSettings.initialPokok || 100000)}" disabled>
              <div class="form-hint">Otomatis dicatat ke buku kas koperasi</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Alamat Tinggal</label>
            <textarea name="address" class="form-control" rows="2" placeholder="Jl. ..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan Anggota Baru</button>
        </div>
      </form>
    </div>
  `;

  modalBackdrop.classList.add('active');

  const close = () => modalBackdrop.classList.remove('active');
  modalBackdrop.querySelector('#modal-close-btn').addEventListener('click', close);
  modalBackdrop.querySelector('#modal-cancel-btn').addEventListener('click', close);

  modalBackdrop.querySelector('#add-member-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newMemberData = {
      name: formData.get('name'),
      type: formData.get('type'),
      role: 'anggota',
      identifier: formData.get('identifier'),
      department: formData.get('department'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      address: formData.get('address') || '-'
    };

    const created = store.addMember(newMemberData);
    toast.success(`Anggota baru ${created.name} (${created.id}) berhasil ditambahkan!`);
    close();
    if (onSuccess) onSuccess();
  });
}

function openEditMemberModal(memberId, onSuccess) {
  const member = store.data.members.find(m => m.id === memberId);
  if (!member) return;

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
        <h3 class="modal-title">Edit Data Anggota (${member.id})</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <form id="edit-member-form">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label required">Nama Lengkap & Gelar</label>
            <input type="text" name="name" class="form-control" value="${member.name}" required>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Kategori Anggota</label>
              <select name="type" class="form-control" required>
                <option value="dosen" ${member.type === 'dosen' ? 'selected' : ''}>Dosen</option>
                <option value="mahasiswa" ${member.type === 'mahasiswa' ? 'selected' : ''}>Mahasiswa</option>
                <option value="staf" ${member.type === 'staf' ? 'selected' : ''}>Staf / Karyawan</option>
                <option value="admin" ${member.type === 'admin' ? 'selected' : ''}>Admin</option>
                <option value="ketua" ${member.type === 'ketua' ? 'selected' : ''}>Ketua</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Nomor Identitas</label>
              <input type="text" name="identifier" class="form-control" value="${member.identifier || ''}" required>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Unit Kerja / Program Studi</label>
              <input type="text" name="department" class="form-control" value="${member.department || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Email STMIK IKMI</label>
              <input type="email" name="email" class="form-control" value="${member.email || ''}" required>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">No. WhatsApp / HP</label>
              <input type="tel" name="phone" class="form-control" value="${member.phone || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Status Keanggotaan</label>
              <select name="status" class="form-control">
                <option value="aktif" ${member.status === 'aktif' ? 'selected' : ''}>Aktif</option>
                <option value="nonaktif" ${member.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Alamat Tinggal</label>
            <textarea name="address" class="form-control" rows="2">${member.address || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  `;

  modalBackdrop.classList.add('active');

  const close = () => modalBackdrop.classList.remove('active');
  modalBackdrop.querySelector('#modal-close-btn').addEventListener('click', close);
  modalBackdrop.querySelector('#modal-cancel-btn').addEventListener('click', close);

  modalBackdrop.querySelector('#edit-member-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    store.updateMember(memberId, {
      name: formData.get('name'),
      type: formData.get('type'),
      identifier: formData.get('identifier'),
      department: formData.get('department'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      status: formData.get('status'),
      address: formData.get('address')
    });
    toast.success('Data anggota berhasil diperbarui.');
    close();
    if (onSuccess) onSuccess();
  });
}

function openMemberDetailModal(memberId) {
  const member = store.data.members.find(m => m.id === memberId);
  if (!member) return;

  const savings = store.getMemberSavings(memberId);
  const memberLoans = store.data.loans.filter(l => l.memberId === memberId);
  const memberSavingsList = store.data.savings.filter(s => s.memberId === memberId);

  let modalBackdrop = document.getElementById('app-modal');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'app-modal';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  modalBackdrop.innerHTML = `
    <div class="modal-container modal-lg">
      <div class="modal-header">
        <h3 class="modal-title">Profil & Kartu Anggota Koperasi</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        
        <!-- Top: Digital KTA Preview -->
        <div style="margin-bottom: 2rem;">
          <div class="member-kta-card" id="kta-card-element">
            <div class="kta-header">
              <div class="kta-brand">
                <div class="kta-logo-icon">IKMI</div>
                <div class="kta-title">
                  <h3>KARTU TANDA ANGGOTA</h3>
                  <p>Koperasi STMIK IKMI Cirebon</p>
                </div>
              </div>
              <div class="kta-chip"></div>
            </div>

            <div class="kta-body">
              <div class="kta-number">${member.id}</div>
              <div class="kta-details-grid">
                <div class="kta-detail-item">
                  <p>Nama Lengkap</p>
                  <h4>${member.name}</h4>
                </div>
                <div class="kta-detail-item">
                  <p>Kategori</p>
                  <h4>${getMemberTypeBadge(member.type)}</h4>
                </div>
                <div class="kta-detail-item" style="grid-column: span 2; margin-top: 0.35rem;">
                  <p>Identitas & Unit Kerja</p>
                  <h4 style="font-size: 0.85rem;">${member.department} (${member.identifier || '-'})</h4>
                </div>
              </div>
            </div>

            <div class="kta-footer">
              <span class="kta-status-badge">● ${member.status.toUpperCase()}</span>
              <span style="font-size: 0.7rem; color: rgba(255,255,255,0.7); font-family: monospace;">TERDAFTAR ${formatDate(member.joinDate, false)}</span>
            </div>
          </div>

          <div style="text-align: center; margin-top: 1rem;">
            <button id="print-kta-btn" class="btn btn-outline-primary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Cetak Kartu Tanda Anggota (KTA)
            </button>
          </div>
        </div>

        <!-- Savings Summary Cards -->
        <div style="margin-bottom: 2rem;">
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">Ringkasan Simpanan Anggota</h4>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;">
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 0.7rem; color: var(--text-tertiary);">POKOK</div>
              <div style="font-weight: 700; color: var(--primary-600);">${formatRupiah(savings.pokok)}</div>
            </div>
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 0.7rem; color: var(--text-tertiary);">WAJIB</div>
              <div style="font-weight: 700; color: var(--purple);">${formatRupiah(savings.wajib)}</div>
            </div>
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 0.7rem; color: var(--text-tertiary);">SUKARELA</div>
              <div style="font-weight: 700; color: var(--success);">${formatRupiah(savings.sukarela)}</div>
            </div>
            <div style="padding: 0.75rem; background: var(--primary-50); border: 1px solid var(--primary-200); border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 0.7rem; color: var(--primary-800); font-weight: 600;">TOTAL SALDO</div>
              <div style="font-weight: 800; color: var(--primary-700);">${formatRupiah(savings.total)}</div>
            </div>
          </div>
        </div>

        <!-- Loans History -->
        <div>
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">Riwayat Pinjaman</h4>
          ${memberLoans.length === 0 ? `
            <p style="font-size: 0.85rem; color: var(--text-tertiary);">Anggota ini belum memiliki riwayat pinjaman.</p>
          ` : `
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>No. Pinjaman</th>
                    <th>Tanggal Pengajuan</th>
                    <th>Plafon</th>
                    <th>Tenor</th>
                    <th>Keperluan</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${memberLoans.map(l => `
                    <tr>
                      <td><code>${l.id}</code></td>
                      <td>${formatDate(l.requestDate, false)}</td>
                      <td><strong>${formatRupiah(l.amount)}</strong></td>
                      <td>${l.tenorMonths} Bulan</td>
                      <td>${l.purpose}</td>
                      <td>${getStatusBadge(l.status)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-close-footer-btn">Tutup</button>
      </div>
    </div>
  `;

  modalBackdrop.classList.add('active');

  const close = () => modalBackdrop.classList.remove('active');
  modalBackdrop.querySelector('#modal-close-btn').addEventListener('click', close);
  modalBackdrop.querySelector('#modal-close-footer-btn').addEventListener('click', close);

  modalBackdrop.querySelector('#print-kta-btn').addEventListener('click', () => {
    const printContent = `
      ${getKopSuratHtml()}
      <div class="print-title">KARTU TANDA ANGGOTA (KTA) KOPERASI</div>
      <div class="print-subtitle">STMIK IKMI Cirebon &bull; ID: ${member.id}</div>
      
      <div class="receipt-box" style="max-width: 480px; margin: 20px auto; padding: 20px; border: 2px solid #0A2540; border-radius: 8px;">
        <table style="width: 100%; border: none;">
          <tr>
            <td style="width: 130px; font-weight: bold; border: none;">Nomor Anggota</td>
            <td style="border: none;">: <strong>${member.id}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Nama Lengkap</td>
            <td style="border: none;">: ${member.name}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Kategori</td>
            <td style="border: none;">: ${member.type.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Nomor Identitas</td>
            <td style="border: none;">: ${member.identifier || '-'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Unit / Jurusan</td>
            <td style="border: none;">: ${member.department || '-'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Tanggal Terdaftar</td>
            <td style="border: none;">: ${formatDate(member.joinDate)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border: none;">Status</td>
            <td style="border: none;">: <strong>${member.status.toUpperCase()}</strong></td>
          </tr>
        </table>
      </div>

      <div class="print-signatures">
        <div class="print-sign-box">
          <p>Pemegang Kartu,</p>
          <div class="print-sign-space"></div>
          <p class="print-sign-name">${member.name}</p>
          <p class="print-sign-role">Anggota Koperasi</p>
        </div>
        <div class="print-sign-box">
          <p>Cirebon, ${formatDate(new Date())}</p>
          <p>Ketua Koperasi,</p>
          <div class="print-sign-space"></div>
          <p class="print-sign-name">${store.data.coopSettings.ketuaName}</p>
          <p class="print-sign-role">NIDN. 0412087501</p>
        </div>
      </div>
    `;
    printOfficialDocument(printContent);
  });
}
