/**
 * 403 Forbidden / Access Denied View
 * Rendered when RBAC Route Guard intercepts unauthorized navigation
 */

import { router } from '../router/router.js';

export function renderForbiddenView(container, { user }) {
  container.innerHTML = `
    <div class="animate-fade-in" style="min-height: 65vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 2rem;">
      <div style="max-width: 550px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 2.5rem; box-shadow: var(--shadow-lg);">
        
        <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--danger-light); color: var(--danger); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        </div>

        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem;">403 - Akses Ditolak (RBAC Guard)</h2>
        <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem;">
          Akun Anda saat ini (<strong>${user ? user.name : 'Pengguna'}</strong> &bull; Role: <span class="badge badge-danger">${user ? user.role : 'GUEST'}</span>) tidak memiliki izin atau hak akses untuk membuka halaman ini.
        </p>

        <div style="background: var(--bg-subtle); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.775rem; color: var(--text-tertiary); margin-bottom: 1.5rem; text-align: left;">
          <strong>Mengapa ini terjadi?</strong><br>
          Sistem Role-Based Access Control (RBAC) STMIK IKMI membatasi modul administratif khusus bagi role yang berwenang. Untuk menguji halaman ini, silakan beralih ke role yang sesuai melalui menu di header.
        </div>

        <button id="back-to-dashboard-btn" class="btn btn-primary" style="width: 100%;">
          &larr; Kembali ke Dashboard Utama
        </button>

      </div>
    </div>
  `;

  const btn = container.querySelector('#back-to-dashboard-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      router.navigate('/dashboard');
    });
  }
}
