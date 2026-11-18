// Cooperative Info, Bylaws, Structure & Announcements View
import { store } from '../store.js';
import { auth } from '../auth.js';
import { formatDate } from '../utils/formatters.js';
import { toast } from '../utils/toast.js';

export function renderCoopInfoView(container) {
  const isAdmin = auth.isAdmin();
  const settings = store.data.coopSettings;

  function refresh() {
    container.innerHTML = `
      <div class="animate-fade-in">
        
        <!-- Hero Header -->
        <div style="background: linear-gradient(135deg, #0A2540 0%, #163e69 100%); border-radius: var(--radius-xl); padding: 2.25rem; color: #fff; margin-bottom: 2rem; box-shadow: var(--shadow-lg);">
          <div style="display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1.25rem;">
            <div style="width: 56px; height: 56px; border-radius: var(--radius-lg); background: #f59e0b; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #0A2540; font-size: 1.6rem; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);">
              IKMI
            </div>
            <div>
              <h2 style="font-size: 1.6rem; color: #fff; margin-bottom: 0.25rem;">${settings.coopName}</h2>
              <p style="font-size: 0.85rem; color: rgba(255,255,255,0.75);">
                Badan Hukum No: ${settings.legalNumber} &bull; STMIK IKMI Cirebon
              </p>
            </div>
          </div>
          <p style="font-size: 0.925rem; color: rgba(255,255,255,0.85); line-height: 1.6; max-width: 800px;">
            Wadah kesejahteraan ekonomi bersama berbasis kekeluargaan dan gotong royong yang melayani seluruh dosen, tenaga kependidikan, staf, serta mahasiswa di lingkungan kampus STMIK IKMI Cirebon.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 1.75rem;">
          
          <!-- Left Column: Visi Misi & Regulasi -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- Visi & Misi Card -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                  Visi & Misi Koperasi
                </h3>
              </div>
              <div style="font-size: 0.875rem; line-height: 1.6; color: var(--text-secondary);">
                <h4 style="color: var(--primary-600); font-weight: 700; margin-bottom: 0.35rem;">VISI:</h4>
                <p style="margin-bottom: 1rem;">
                  Menjadi koperasi institusi perguruan tinggi yang mandiri, terpercaya, transparan, dan berbasis teknologi digital guna meningkatkan kesejahteraan civitas akademika STMIK IKMI Cirebon.
                </p>

                <h4 style="color: var(--primary-600); font-weight: 700; margin-bottom: 0.35rem;">MISI:</h4>
                <ul style="padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.35rem;">
                  <li>Menyelenggarakan tata kelola simpan pinjam yang amanah, akuntabel, dan transparan.</li>
                  <li>Mendukung pembiayaan kebutuhan akademik, penelitian dosen, serta keperluan mendesak anggota.</li>
                  <li>Mengoptimalkan pemanfaatan platform digital (Smart Co-op) untuk kemudahan akses informasi anggota.</li>
                  <li>Membagikan Sisa Hasil Usaha (SHU) secara adil dan tepat waktu setiap tahun buku.</li>
                </ul>
              </div>
            </div>

            <!-- Regulasi & Ketentuan Pinjaman -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  Ketentuan Layanan Simpan Pinjam
                </h3>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.85rem; color: var(--text-secondary);">
                <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
                  <strong style="color: var(--text-primary);">Simpanan Pokok:</strong> Rp 100.000 (Dibayarkan satu kali pada saat pendaftaran).
                </div>
                <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
                  <strong style="color: var(--text-primary);">Simpanan Wajib:</strong> Rp 50.000 / bulan (Dapat dipotong langsung melalui payroll gaji).
                </div>
                <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
                  <strong style="color: var(--text-primary);">Simpanan Sukarela:</strong> Bebas nominal, fleksibel disetor & dapat ditarik sewaktu-waktu.
                </div>
                <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
                  <strong style="color: var(--text-primary);">Pinjaman Anggota:</strong> Plafon hingga Rp 50.000.000 dengan jasa 1.2% flat/bulan dan tenor fleksibel 3 s/d 36 bulan.
                </div>
              </div>
            </div>

          </div>

          <!-- Right Column: Struktur Pengurus & Pengumuman -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- Susunan Pengurus Card -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  Susunan Pengurus Koperasi
                </h3>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div class="user-avatar" style="background: #3b82f6;">DS</div>
                  <div>
                    <div style="font-weight: 700; font-size: 0.875rem;">${settings.ketuaName}</div>
                    <div style="font-size: 0.75rem; color: var(--text-tertiary);">Ketua Koperasi / Pembina</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div class="user-avatar" style="background: #10b981;">DF</div>
                  <div>
                    <div style="font-weight: 700; font-size: 0.875rem;">${settings.bendaharaName}</div>
                    <div style="font-size: 0.75rem; color: var(--text-tertiary);">Bendahara Koperasi</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div class="user-avatar" style="background: #8b5cf6;">RW</div>
                  <div>
                    <div style="font-weight: 700; font-size: 0.875rem;">${settings.secretaryName}</div>
                    <div style="font-size: 0.75rem; color: var(--text-tertiary);">Sekretaris Koperasi</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Papan Pengumuman Digital -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    Papan Pengumuman Digital
                  </h3>
                  <p class="card-subtitle">Informasi & agenda penting koperasi</p>
                </div>
                ${isAdmin ? `
                  <button id="add-ann-btn" class="btn btn-primary btn-sm">Tambah</button>
                ` : ''}
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                ${store.data.announcements.map(ann => `
                  <div style="padding: 0.85rem; border-radius: var(--radius-md); background: var(--bg-subtle); border-left: 3px solid ${ann.priority === 'high' ? 'var(--warning)' : 'var(--primary-500)'}; position: relative;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                      <span class="badge ${ann.priority === 'high' ? 'badge-warning' : 'badge-primary'}" style="font-size: 0.65rem;">${ann.category}</span>
                      <span style="font-size: 0.7rem; color: var(--text-tertiary);">${formatDate(ann.date, false)}</span>
                    </div>
                    <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">${ann.title}</h4>
                    <p style="font-size: 0.775rem; color: var(--text-secondary); line-height: 1.4;">${ann.content}</p>
                    ${isAdmin ? `
                      <button class="btn btn-icon btn-sm delete-ann-btn" data-id="${ann.id}" style="position: absolute; top: 0.5rem; right: 0.5rem; color: var(--danger);" title="Hapus Pengumuman">&times;</button>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    const addAnnBtn = container.querySelector('#add-ann-btn');
    if (addAnnBtn) {
      addAnnBtn.addEventListener('click', () => openAddAnnouncementModal(refresh));
    }

    container.querySelectorAll('.delete-ann-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        store.deleteAnnouncement(id);
        toast.info('Pengumuman dihapus.');
        refresh();
      });
    });
  }

  refresh();
}

function openAddAnnouncementModal(onSuccess) {
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
        <h3 class="modal-title">Tambah Pengumuman Koperasi</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <form id="add-ann-form">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label required">Judul Pengumuman</label>
            <input type="text" name="title" class="form-control" placeholder="contoh: Pembagian SHU Tahun Buku 2025/2026..." required>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Kategori</label>
              <select name="category" class="form-control" required>
                <option value="RAT Koperasi">RAT Koperasi</option>
                <option value="Promo Pinjaman">Promo Pinjaman</option>
                <option value="Pemberitahuan">Pemberitahuan Umum</option>
                <option value="Dividen/SHU">Dividen / SHU</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Prioritas</label>
              <select name="priority" class="form-control" required>
                <option value="normal">Normal</option>
                <option value="high">Penting / High</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">Isi Pengumuman</label>
            <textarea name="content" class="form-control" rows="4" placeholder="Tuliskan pengumuman lengkap..." required></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Batal</button>
          <button type="submit" class="btn btn-primary">Publikasikan</button>
        </div>
      </form>
    </div>
  `;

  modalBackdrop.classList.add('active');

  const close = () => modalBackdrop.classList.remove('active');
  modalBackdrop.querySelector('#modal-close-btn').addEventListener('click', close);
  modalBackdrop.querySelector('#modal-cancel-btn').addEventListener('click', close);

  modalBackdrop.querySelector('#add-ann-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    store.addAnnouncement({
      title: formData.get('title'),
      category: formData.get('category'),
      priority: formData.get('priority'),
      content: formData.get('content')
    });
    toast.success('Pengumuman baru berhasil dipublikasikan!');
    close();
    if (onSuccess) onSuccess();
  });
}
