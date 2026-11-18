/**
 * Application Footer Component
 * Displays Developer Identity & System Copyright
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { router } from '../router/router.js';

export function renderFooter(footerElement) {
  footerElement.innerHTML = `
    <div class="app-footer-container">
      
      <!-- Brand & Copyright -->
      <div class="app-footer-brand-section">
        <div class="footer-app-name">Smart Co-op Financial System</div>
        <div class="footer-subtext">
          <span>STMIK IKMI Cirebon</span>
          <span class="meta-dot">&bull;</span>
          <span>&copy; 2026 Smart Co-op Financial System</span>
        </div>
      </div>

      <!-- Developer Identity Credit -->
      <div class="app-footer-dev-section">
        <div class="footer-dev-title">
          <span>Developed by</span>
          <strong class="developer-name-highlight">Ahmad Maulana Ibrohim</strong>
        </div>
        <div class="footer-dev-meta">
          <span class="meta-badge">NIM: <strong>41257087</strong></span>
          <span class="meta-dot">&bull;</span>
          <span class="meta-badge">Kelas: <strong>TI-2025-KIP-1A</strong></span>
          <span class="meta-dot">&bull;</span>
          <span class="meta-badge">Tahun: <strong>2026</strong></span>
        </div>
      </div>

      <!-- Quick Action: About Link -->
      <div class="app-footer-actions">
        <button type="button" class="footer-about-link" id="footer-btn-about" title="Lihat informasi lengkap tentang aplikasi dan pengembang">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>Tentang Aplikasi</span>
        </button>
      </div>

    </div>
  `;

  const aboutBtn = footerElement.querySelector('#footer-btn-about');
  if (aboutBtn) {
    aboutBtn.addEventListener('click', () => {
      router.navigate('/about');
    });
  }
}
