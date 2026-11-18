/**
 * Login View
 * Credential Authentication with PBKDF2 Password Verification
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { auth } from '../../infrastructure/auth/authService.js';
import { toast } from '../components/Toast.js';
import { router } from '../router/router.js';

export function renderLoginView(container) {
  container.innerHTML = `
    <div class="login-view-wrapper">
      <div class="login-card-container">
        
        <!-- Left Branding & Security Panel -->
        <div class="login-branding-panel">
          <div>
            <div style="display: flex; align-items: center; gap: 0.85rem; margin-bottom: 2rem;">
              <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: #f59e0b; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #0A2540; font-size: 1.3rem;">IKMI</div>
              <div>
                <h2 style="font-size: 1.15rem; color: #fff; margin: 0;">Smart Co-op</h2>
                <p style="font-size: 0.75rem; color: rgba(255,255,255,0.7); margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">STMIK IKMI Cirebon</p>
              </div>
            </div>

            <h3 style="font-size: 1.45rem; font-weight: 700; margin-bottom: 1rem; line-height: 1.3; color: #ffffff;">
              Sistem Keuangan & Keanggotaan Terenkripsi
            </h3>
            <p style="font-size: 0.875rem; color: rgba(255,255,255,0.8); line-height: 1.6; margin-bottom: 1.5rem;">
              Sistem autentikasi aman dengan enkripsi password standar industri (PBKDF2-SHA256, 100.000 iterasi, 16-byte salt acak), manajemen token sesi, dan Role-Based Access Control terpadu.
            </p>

            <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.825rem; color: rgba(255,255,255,0.9);">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Password Ter-hash Aman (Tanpa Plaintext)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>3 Peran Utama: ADMIN, CHAIRMAN, MEMBER</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Proteksi Route Guards & Isolasi Data Anggota</span>
              </div>
            </div>
          </div>

          <div style="border-top: 1px solid rgba(255,255,255,0.15); padding-top: 1rem; margin-top: 2rem; font-size: 0.75rem; color: rgba(255,255,255,0.7); display: flex; flex-direction: column; gap: 0.25rem;">
            <div>&copy; 2026 STMIK IKMI Cirebon &bull; Smart Co-op</div>
            <div style="color: #93c5fd; font-weight: 600;">Developed by Ahmad Maulana Ibrohim | TI-2025-KIP-1A</div>
          </div>
        </div>

        <!-- Right Form Panel: Direct Credential Form -->
        <div class="login-form-panel">
          <div style="margin-bottom: 2rem;">
            <h2 class="login-form-title">Masuk ke Akun Anda</h2>
            <p class="login-form-subtitle">Masukkan email institusi dan kata sandi Anda untuk melanjutkan.</p>
          </div>

          <!-- Form Login Langsung -->
          <form id="login-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label for="login-email" class="form-label required">Email Terdaftar STMIK IKMI</label>
              <div class="login-input-group">
                <span class="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </span>
                <input 
                  type="email" 
                  id="login-email" 
                  name="email" 
                  class="form-control login-input-field" 
                  placeholder="nama@ikmi.ac.id" 
                  autocomplete="username email" 
                  required
                >
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label for="login-password" class="form-label required">Kata Sandi</label>
              <div class="login-input-group">
                <span class="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </span>
                <input 
                  type="password" 
                  id="login-password" 
                  name="password" 
                  class="form-control login-input-field" 
                  placeholder="Masukkan kata sandi" 
                  autocomplete="current-password" 
                  required
                >
                <button 
                  type="button" 
                  id="toggle-password-btn" 
                  class="login-toggle-password-btn" 
                  aria-label="Lihat atau sembunyikan kata sandi" 
                  title="Lihat/Sembunyikan Kata Sandi"
                >
                  <svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" id="submit-login-btn" class="btn btn-primary login-submit-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              <span>Masuk & Verifikasi Hash</span>
            </button>
          </form>

          <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.775rem; color: var(--text-tertiary); text-align: center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>Sistem Terenkripsi PBKDF2-SHA256 &bull; Sesi Aman</span>
          </div>

        </div>

      </div>

      <!-- Developer Identity Bottom Credit -->
      <div class="login-footer-credit">
        Developed by <strong style="color: var(--primary-600);">Ahmad Maulana Ibrohim</strong> | <strong style="color: var(--text-secondary);">TI-2025-KIP-1A</strong> &bull; STMIK IKMI Cirebon
      </div>

    </div>
  `;

  // Password visibility toggle with dynamic eye icon state
  const togglePassBtn = container.querySelector('#toggle-password-btn');
  const passInput = container.querySelector('#login-password');
  const eyeIcon = container.querySelector('#eye-icon');

  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener('click', () => {
      const isPassword = passInput.type === 'password';
      passInput.type = isPassword ? 'text' : 'password';
      togglePassBtn.style.color = isPassword ? 'var(--primary-600)' : 'var(--text-tertiary)';
      if (eyeIcon) {
        eyeIcon.innerHTML = isPassword
          ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`
          : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
      }
    });
  }

  // Handle submit login
  const form = container.querySelector('#login-form');
  const submitBtn = container.querySelector('#submit-login-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = container.querySelector('#login-email');
      const passwordInput = container.querySelector('#login-password');
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) {
        toast.error('Email dan kata sandi wajib diisi.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid #ffffff; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 0.5rem; vertical-align: middle;"></span>
        <span>Memverifikasi Hash PBKDF2...</span>
      `;

      try {
        const res = await auth.login(email, password);

        if (res.success) {
          toast.success(`Login berhasil! Selamat datang, ${res.user.name} (${res.user.role})`);
          router.navigate('/dashboard');
        } else {
          toast.error(res.message || 'Email atau kata sandi yang Anda masukkan salah.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            <span>Masuk & Verifikasi Hash</span>
          `;
          if (passwordInput) {
            passwordInput.focus();
            passwordInput.select();
          }
        }
      } catch (err) {
        console.error('[LoginView] Authentication error:', err);
        toast.error('Terjadi kendala pada sistem autentikasi. Silakan coba kembali.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
          <span>Masuk & Verifikasi Hash</span>
        `;
      }
    });
  }
}

