// Login View
import { auth } from '../auth.js';
import { toast } from '../utils/toast.js';

export function renderLoginView(container, onLoginSuccess) {
  container.innerHTML = `
    <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem;">
      <div style="max-width: 900px; width: 100%; display: grid; grid-template-columns: 1.1fr 1.3fr; gap: 2rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-xl); box-shadow: var(--shadow-xl); overflow: hidden;">
        
        <!-- Left Branding Panel -->
        <div style="background: linear-gradient(145deg, #0A2540 0%, #163e69 100%); color: #ffffff; padding: 2.5rem; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.85rem; margin-bottom: 2rem;">
              <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: #f59e0b; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #0A2540; font-size: 1.3rem;">IKMI</div>
              <div>
                <h2 style="font-size: 1.15rem; color: #fff; margin: 0;">Smart Co-op</h2>
                <p style="font-size: 0.75rem; color: rgba(255,255,255,0.7); margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">STMIK IKMI Cirebon</p>
              </div>
            </div>

            <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; line-height: 1.3; color: #ffffff;">
              Digitalisasi Pengelolaan Finansial Koperasi Modern
            </h3>
            <p style="font-size: 0.875rem; color: rgba(255,255,255,0.8); line-height: 1.6; margin-bottom: 1.5rem;">
              Sistem informasi terpadu untuk transparansi simpanan, kemudahan pinjaman, pelaporan keuangan otomatis, dan tata kelola profesional bagi seluruh civitas akademika STMIK IKMI Cirebon.
            </p>

            <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.825rem; color: rgba(255,255,255,0.9);">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Akses Multi-Role: Admin, Ketua & Anggota</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Pencatatan Simpanan Pokok, Wajib & Sukarela</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Simulasi & Pencairan Pinjaman Terstruktur</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Cetak Kwitansi & Laporan Kop Resmi STMIK IKMI</span>
              </div>
            </div>
          </div>

          <div style="border-top: 1px solid rgba(255,255,255,0.15); padding-top: 1rem; margin-top: 2rem; font-size: 0.75rem; color: rgba(255,255,255,0.6);">
            &copy; 2026 STMIK IKMI Cirebon. All rights reserved.
          </div>
        </div>

        <!-- Right Login Panel: Direct Credential Form -->
        <div style="padding: 2.5rem; display: flex; flex-direction: column; justify-content: center;">
          <div style="margin-bottom: 2rem;">
            <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">Masuk ke Akun Anda</h2>
            <p style="font-size: 0.875rem; color: var(--text-tertiary); line-height: 1.5; margin: 0;">Masukkan email institusi dan kata sandi Anda untuk melanjutkan.</p>
          </div>

          <!-- Direct Form -->
          <form id="login-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label required">Email Terdaftar STMIK IKMI</label>
              <input type="email" id="login-email" class="form-control" placeholder="nama@ikmi.ac.id" autocomplete="username email" required>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label required">Kata Sandi</label>
              <div style="position: relative;">
                <input type="password" id="login-password" class="form-control" placeholder="Masukkan kata sandi" autocomplete="current-password" required style="padding-right: 2.5rem;">
                <button type="button" id="toggle-password-btn" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-tertiary);" title="Lihat/Sembunyikan Kata Sandi">
                  👁️
                </button>
              </div>
            </div>

            <button type="submit" id="submit-login-btn" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem; padding: 0.85rem; font-weight: 700;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              <span>Masuk & Verifikasi Hash</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  `;

  // Password visibility toggle
  const togglePassBtn = container.querySelector('#toggle-password-btn');
  const passInput = container.querySelector('#login-password');
  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener('click', () => {
      passInput.type = passInput.type === 'password' ? 'text' : 'password';
    });
  }

  const form = container.querySelector('#login-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = container.querySelector('#login-email').value;
      const result = auth.login(email);
      if (result.success) {
        toast.success(`Login berhasil sebagai ${result.user.name}`);
        if (onLoginSuccess) onLoginSuccess(result.user);
      } else {
        toast.error(result.message);
      }
    });
  }
}

