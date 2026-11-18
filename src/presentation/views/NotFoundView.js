/**
 * 404 Not Found View
 */

import { router } from '../router/router.js';

export function renderNotFoundView(container) {
  container.innerHTML = `
    <div class="animate-fade-in" style="min-height: 65vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 2rem;">
      <div style="max-width: 500px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 2.5rem; box-shadow: var(--shadow-lg);">
        
        <div style="font-size: 3.5rem; font-weight: 900; color: var(--primary-600); font-family: 'Outfit', sans-serif; line-height: 1; margin-bottom: 0.75rem;">
          404
        </div>

        <h2 style="font-size: 1.35rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">Halaman Tidak Ditemukan</h2>
        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.5rem;">
          Rute yang Anda tuju tidak terdaftar pada router Smart Co-op STMIK IKMI.
        </p>

        <button id="not-found-back-btn" class="btn btn-primary" style="width: 100%;">
          &larr; Kembali ke Dashboard
        </button>

      </div>
    </div>
  `;

  const btn = container.querySelector('#not-found-back-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      router.navigate('/dashboard');
    });
  }
}
