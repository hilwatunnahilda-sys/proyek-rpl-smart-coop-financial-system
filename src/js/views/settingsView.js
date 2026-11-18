// System Settings & Data Backup/Restore View
import { store } from '../store.js';
import { auth } from '../auth.js';
import { toast } from '../utils/toast.js';

export function renderSettingsView(container) {
  const settings = store.data.coopSettings;
  const isAdmin = auth.isAdmin();

  function refresh() {
    container.innerHTML = `
      <div class="animate-fade-in">
        
        <!-- Header -->
        <div style="margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">Pengaturan Sistem & Konfigurasi Koperasi</h2>
          <p style="font-size: 0.825rem; color: var(--text-tertiary);">Kelola parameter simpan pinjam, pengurus, serta cadangan data (backup/restore)</p>
        </div>

        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 1.75rem;">
          
          <!-- Configuration Form -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Parameter Koperasi & Suku Bunga
              </h3>
            </div>

            <form id="coop-settings-form">
              <div class="form-group">
                <label class="form-label required">Nama Institusi Koperasi</label>
                <input type="text" name="coopName" class="form-control" value="${settings.coopName}" ${!isAdmin ? 'disabled' : ''} required>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label required">Nomor Badan Hukum</label>
                  <input type="text" name="legalNumber" class="form-control" value="${settings.legalNumber}" ${!isAdmin ? 'disabled' : ''} required>
                </div>
                <div class="form-group">
                  <label class="form-label required">Suku Bunga Pinjaman (% Flat/Bln)</label>
                  <input type="number" step="0.1" name="defaultLoanInterest" class="form-control" value="${settings.defaultLoanInterest}" ${!isAdmin ? 'disabled' : ''} required>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label required">Tarif Simpanan Pokok (Rp)</label>
                  <input type="number" name="initialPokok" class="form-control" value="${settings.initialPokok}" ${!isAdmin ? 'disabled' : ''} required>
                </div>
                <div class="form-group">
                  <label class="form-label required">Tarif Simpanan Wajib (Rp/Bln)</label>
                  <input type="number" name="monthlyWajib" class="form-control" value="${settings.monthlyWajib}" ${!isAdmin ? 'disabled' : ''} required>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label required">Nama Ketua STMIK / Pembina</label>
                  <input type="text" name="ketuaName" class="form-control" value="${settings.ketuaName}" ${!isAdmin ? 'disabled' : ''} required>
                </div>
                <div class="form-group">
                  <label class="form-label required">Nama Bendahara Koperasi</label>
                  <input type="text" name="bendaharaName" class="form-control" value="${settings.bendaharaName}" ${!isAdmin ? 'disabled' : ''} required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label required">Alamat Kantor Koperasi</label>
                <textarea name="address" class="form-control" rows="2" ${!isAdmin ? 'disabled' : ''} required>${settings.address}</textarea>
              </div>

              ${isAdmin ? `
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
                  Simpan Pengaturan Koperasi
                </button>
              ` : `
                <div class="badge badge-neutral" style="width: 100%; padding: 0.5rem; justify-content: center;">
                  Hanya Administrator Koperasi yang dapat mengubah konfigurasi sistem.
                </div>
              `}
            </form>
          </div>

          <!-- Data Backup, Restore & Reset -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- Backup & Export JSON -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Backup & Restore Basis Data
                </h3>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
                Simpan seluruh data transaksi, keanggotaan, simpanan, dan pinjaman ke dalam berkas JSON mandiri.
              </p>

              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <button id="backup-db-btn" class="btn btn-secondary" style="justify-content: flex-start;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Unduh Cadangan JSON (Backup Database)
                </button>

                ${isAdmin ? `
                  <label class="btn btn-secondary" style="justify-content: flex-start; cursor: pointer; margin: 0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Pulihkan dari File JSON (Restore Database)
                    <input type="file" id="restore-file-input" accept=".json" style="display: none;">
                  </label>
                ` : ''}
              </div>
            </div>

            <!-- Reset to Defaults -->
            ${isAdmin ? `
              <div class="card" style="border-left: 4px solid var(--danger);">
                <div class="card-header">
                  <h3 class="card-title" style="color: var(--danger-dark);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Reset Data Demo STMIK IKMI
                  </h3>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
                  Mengembalikan seluruh database ke kondisi awal demo STMIK IKMI Cirebon yang lengkap dengan data dosen, mahasiswa, staf, dan buku kas.
                </p>
                <button id="reset-db-btn" class="btn btn-danger btn-sm">
                  Reset ke Data Awal Demo
                </button>
              </div>
            ` : ''}

          </div>

        </div>

      </div>
    `;

    const form = container.querySelector('#coop-settings-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        store.updateSettings({
          coopName: formData.get('coopName'),
          legalNumber: formData.get('legalNumber'),
          defaultLoanInterest: parseFloat(formData.get('defaultLoanInterest')) || 1.2,
          initialPokok: parseInt(formData.get('initialPokok'), 10) || 100000,
          monthlyWajib: parseInt(formData.get('monthlyWajib'), 10) || 50000,
          ketuaName: formData.get('ketuaName'),
          bendaharaName: formData.get('bendaharaName'),
          address: formData.get('address')
        });
        toast.success('Pengaturan koperasi berhasil diperbarui!');
      });
    }

    container.querySelector('#backup-db-btn').addEventListener('click', () => {
      const dataStr = JSON.stringify(store.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `backup_smart_coop_ikmi_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Cadangan basis data JSON berhasil diunduh.');
    });

    const restoreInput = container.querySelector('#restore-file-input');
    if (restoreInput) {
      restoreInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const restoredData = JSON.parse(event.target.result);
            if (restoredData.members && restoredData.savings && restoredData.loans) {
              store.saveData(restoredData);
              toast.success('Database berhasil dipulihkan dari file backup!');
              refresh();
            } else {
              toast.error('Format berkas JSON backup tidak valid.');
            }
          } catch (err) {
            toast.error('Gagal membaca berkas JSON backup.');
          }
        };
        reader.readAsText(file);
      });
    }

    const resetBtn = container.querySelector('#reset-db-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin mereset seluruh database ke data awal STMIK IKMI? Tindakan ini akan mengembalikan data default.')) {
          store.resetToDefault();
          toast.success('Database berhasil direset ke data default STMIK IKMI!');
          refresh();
        }
      });
    }
  }

  refresh();
}
