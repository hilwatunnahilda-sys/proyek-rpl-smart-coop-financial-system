/**
 * Header Layout Component
 * STMIK IKMI Cirebon Institutional Navbar
 */

import { renderDbStatusBadge } from '../components/DbStatusBadge.js';
import { initThemeToggle } from '../components/ThemeToggle.js';
import { auth } from '../../infrastructure/auth/authService.js';
import { router } from '../router/router.js';
import { toast } from '../components/Toast.js';

export function renderHeader(headerElement, { route, user }) {
  headerElement.innerHTML = `
    <div class="header-left">
      <button class="sidebar-toggle-btn" id="sidebar-toggle" aria-label="Toggle Menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
      <div class="page-title-box">
        <h1 id="header-page-title">${route ? route.title : 'Smart Co-op'}</h1>
        <span class="page-breadcrumb">Smart Co-op &bull; STMIK IKMI Cirebon</span>
      </div>
    </div>

    <div class="header-right">
      <!-- Live Database Status Badge -->
      <div id="db-status-container"></div>

      <!-- Quick Role Demo Switcher -->
      <div class="role-switcher-box" style="display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 0.75rem; color: var(--text-tertiary); display: none; @media(min-width:768px){display:inline;}">Role Demo:</span>
        <select id="quick-role-select" class="role-switcher-select">
          <option value="admin@ikmi.ac.id" ${user && user.email === 'admin@ikmi.ac.id' ? 'selected' : ''}>Admin Koperasi</option>
          <option value="ketua@ikmi.ac.id" ${user && user.email === 'ketua@ikmi.ac.id' ? 'selected' : ''}>Ketua STMIK</option>
          <option value="dosen@ikmi.ac.id" ${user && user.email === 'dosen@ikmi.ac.id' ? 'selected' : ''}>Dosen (Anggota)</option>
          <option value="mahasiswa@ikmi.ac.id" ${user && user.email === 'mahasiswa@ikmi.ac.id' ? 'selected' : ''}>Mahasiswa</option>
          <option value="staf@ikmi.ac.id" ${user && user.email === 'staf@ikmi.ac.id' ? 'selected' : ''}>Staf (Anggota)</option>
        </select>
      </div>

      <!-- Telegram Notifications Shortcut -->
      <a href="#/settings/telegram" class="btn btn-secondary btn-icon" id="telegram-nav-btn" title="Notifikasi Telegram" style="color: #0088cc; text-decoration: none; display: flex; align-items: center; justify-content: center;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
      </a>

      <!-- Theme Toggle Button -->
      <button class="btn btn-secondary btn-icon" id="theme-toggle-btn" title="Ganti Tema Gelap/Terang"></button>

      <!-- Logout Button -->
      <button class="btn btn-secondary btn-sm" id="header-logout-btn" title="Keluar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        <span style="display: none; @media(min-width:640px){display:inline;}">Keluar</span>
      </button>
    </div>
  `;

  // Attach components
  const dbContainer = headerElement.querySelector('#db-status-container');
  if (dbContainer) renderDbStatusBadge(dbContainer);

  const themeBtn = headerElement.querySelector('#theme-toggle-btn');
  if (themeBtn) initThemeToggle(themeBtn);

  // Quick Role Selector
  const roleSelect = headerElement.querySelector('#quick-role-select');
  if (roleSelect) {
    roleSelect.addEventListener('change', async (e) => {
      const email = e.target.value;
      const res = await auth.switchDemoAccount(email);
      if (res.success) {
        toast.success(`Beralih ke akun ${res.user.name} (${res.user.role})`);
        router.navigate('/dashboard');
      }
    });
  }

  // Logout
  const logoutBtn = headerElement.querySelector('#header-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await auth.logout();
      toast.info('Anda telah keluar dari sistem.');
      router.navigate('/login');
    });
  }
}
