// Main Application Router & Shell Bootstrap
import { store } from './store.js';
import { auth } from './auth.js';
import { toast } from './utils/toast.js';

// Views
import { renderLoginView } from './views/loginView.js';
import { renderDashboardView } from './views/dashboardView.js';
import { renderMembersView } from './views/membersView.js';
import { renderSavingsView } from './views/savingsView.js';
import { renderLoansView } from './views/loansView.js';
import { renderInstallmentsView } from './views/installmentsView.js';
import { renderTransactionsView } from './views/transactionsView.js';
import { renderReportsView } from './views/reportsView.js';
import { renderShuView } from './views/shuView.js';
import { renderCoopInfoView } from './views/coopInfoView.js';
import { renderSettingsView } from './views/settingsView.js';

class App {
  constructor() {
    this.currentRoute = 'dashboard';
    this.initTheme();
    this.init();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('ikmi_coop_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ikmi_coop_theme', next);
    this.updateThemeButton();
  }

  updateThemeButton() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    btn.innerHTML = current === 'dark' 
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  }

  init() {
    auth.subscribe(() => {
      this.renderApp();
    });

    store.subscribe(() => {
      this.renderCurrentView();
    });

    this.renderApp();
  }

  navigate(route) {
    this.currentRoute = route;
    this.renderCurrentView();
    this.updateSidebarActiveState();

    // Close mobile sidebar if open
    const sidebar = document.querySelector('.app-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderApp() {
    const user = auth.getUser();
    const appContainer = document.getElementById('app');

    if (!user) {
      renderLoginView(appContainer, () => {
        this.currentRoute = 'dashboard';
        this.renderApp();
      });
      return;
    }

    appContainer.innerHTML = `
      <!-- Mobile Sidebar Overlay -->
      <div class="sidebar-overlay"></div>

      <!-- App Sidebar -->
      <aside class="app-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">IKMI</div>
          <div class="sidebar-brand-text">
            <h2>Smart Co-op</h2>
            <p>STMIK IKMI Cirebon</p>
          </div>
        </div>

        <nav class="sidebar-nav">
          ${this.getSidebarNavHtml(user)}
        </nav>

        <div class="sidebar-footer">
          <div class="user-avatar">${this.getInitials(user.name)}</div>
          <div class="user-info">
            <div class="user-name" title="${user.name}">${user.name}</div>
            <div class="user-role-badge">${(user.role || user.type).toUpperCase()}</div>
          </div>
          <button id="logout-btn" class="btn btn-icon btn-sm" style="color: var(--sidebar-text-muted); background: transparent;" title="Keluar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </aside>

      <!-- App Main Content Area -->
      <div class="app-main">
        
        <!-- Header -->
        <header class="app-header">
          <div class="header-left">
            <button class="sidebar-toggle-btn" id="sidebar-toggle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div class="page-title-box">
              <h1 id="header-page-title">${this.getPageTitle(this.currentRoute)}</h1>
              <span class="page-breadcrumb" id="header-page-breadcrumb">Smart Co-op &bull; STMIK IKMI Cirebon</span>
            </div>
          </div>

          <div class="header-right">
            <!-- Quick Demo Role Switcher -->
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 0.75rem; color: var(--text-tertiary); display: none; @media(min-width: 640px){display:inline;}">Role Demo:</span>
              <select id="quick-role-select" class="role-switcher-select">
                <option value="admin@ikmi.ac.id" ${user.email === 'admin@ikmi.ac.id' ? 'selected' : ''}>Admin Koperasi</option>
                <option value="ketua@ikmi.ac.id" ${user.email === 'ketua@ikmi.ac.id' ? 'selected' : ''}>Ketua STMIK</option>
                <option value="dosen@ikmi.ac.id" ${user.email === 'dosen@ikmi.ac.id' ? 'selected' : ''}>Dosen (Anggota)</option>
                <option value="mahasiswa@ikmi.ac.id" ${user.email === 'mahasiswa@ikmi.ac.id' ? 'selected' : ''}>Mahasiswa</option>
                <option value="staf@ikmi.ac.id" ${user.email === 'staf@ikmi.ac.id' ? 'selected' : ''}>Staf (Anggota)</option>
              </select>
            </div>

            <!-- Theme Toggle -->
            <button class="btn btn-secondary btn-icon" id="theme-toggle-btn" title="Ganti Tema Gelap/Terang">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            </button>
          </div>
        </header>

        <!-- Dynamic Body Container -->
        <main class="content-body" id="main-content-view"></main>

      </div>
    `;

    this.attachShellListeners();
    this.updateThemeButton();
    this.renderCurrentView();
  }

  getSidebarNavHtml(user) {
    const isKetua = auth.isKetua();
    const isAdmin = auth.isAdmin();
    const isAnggota = auth.isAnggota();

    let html = `
      <div class="nav-section-title">Menu Utama</div>
      <a class="nav-item ${this.currentRoute === 'dashboard' ? 'active' : ''}" data-route="dashboard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        <span>Dashboard</span>
      </a>
    `;

    if (isAdmin) {
      html += `
        <div class="nav-section-title">Operasional Koperasi</div>
        <a class="nav-item ${this.currentRoute === 'members' ? 'active' : ''}" data-route="members">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span>Data Anggota</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'savings' ? 'active' : ''}" data-route="savings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          <span>Simpanan</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'loans' ? 'active' : ''}" data-route="loans">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>Pinjaman</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'installments' ? 'active' : ''}" data-route="installments">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          <span>Angsuran & Pelunasan</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'transactions' ? 'active' : ''}" data-route="transactions">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
          <span>Buku Kas & Ledger</span>
        </a>

        <div class="nav-section-title">Laporan & Evaluasi</div>
        <a class="nav-item ${this.currentRoute === 'reports' ? 'active' : ''}" data-route="reports">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>Laporan Keuangan</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'shu' ? 'active' : ''}" data-route="shu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
          <span>Perhitungan SHU</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'coop-info' ? 'active' : ''}" data-route="coop-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>Profil & Pengumuman</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span>Pengaturan & Backup</span>
        </a>
      `;
    } else if (isKetua) {
      html += `
        <div class="nav-section-title">Monitoring Eksekutif</div>
        <a class="nav-item ${this.currentRoute === 'members' ? 'active' : ''}" data-route="members">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          <span>Data Anggota</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'loans' ? 'active' : ''}" data-route="loans">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>Persetujuan Pinjaman</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'reports' ? 'active' : ''}" data-route="reports">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>Laporan Keuangan</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'shu' ? 'active' : ''}" data-route="shu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
          <span>Simulasi SHU</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'coop-info' ? 'active' : ''}" data-route="coop-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>Info Koperasi</span>
        </a>
      `;
    } else {
      // Anggota (Dosen / Mahasiswa / Staf)
      html += `
        <div class="nav-section-title">Layanan Anggota</div>
        <a class="nav-item ${this.currentRoute === 'savings' ? 'active' : ''}" data-route="savings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline></svg>
          <span>Simpanan Saya</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'loans' ? 'active' : ''}" data-route="loans">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>Pinjaman Saya</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'installments' ? 'active' : ''}" data-route="installments">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          <span>Jadwal Angsuran</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'transactions' ? 'active' : ''}" data-route="transactions">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
          <span>Riwayat Transaksi</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'shu' ? 'active' : ''}" data-route="shu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
          <span>Estimasi SHU Saya</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'coop-info' ? 'active' : ''}" data-route="coop-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>Info Koperasi</span>
        </a>
      `;
    }

    return html;
  }

  attachShellListeners() {
    // Navigation items
    document.querySelectorAll('.app-sidebar .nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const route = item.dataset.route;
        this.navigate(route);
      });
    });

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Quick Role Switcher
    const roleSelect = document.getElementById('quick-role-select');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        const email = e.target.value;
        const user = auth.quickSwitch(email);
        toast.success(`Beralih ke akun ${user.name} (${user.role})`);
        this.currentRoute = 'dashboard';
        this.renderApp();
      });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        auth.logout();
        toast.info('Anda telah keluar dari sistem.');
        this.renderApp();
      });
    }

    // Sidebar Mobile Toggle
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.app-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (toggleBtn && sidebar && overlay) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
      });
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      });
    }
  }

  updateSidebarActiveState() {
    document.querySelectorAll('.app-sidebar .nav-item').forEach(item => {
      if (item.dataset.route === this.currentRoute) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    const titleEl = document.getElementById('header-page-title');
    if (titleEl) {
      titleEl.textContent = this.getPageTitle(this.currentRoute);
    }
  }

  getPageTitle(route) {
    const titles = {
      'dashboard': 'Dashboard Informasi',
      'members': 'Manajemen Anggota Koperasi',
      'savings': 'Manajemen Simpanan Anggota',
      'loans': 'Manajemen Pinjaman & Simulasi',
      'installments': 'Jadwal & Pembayaran Angsuran',
      'transactions': 'Buku Kas & Transaksi Keuangan',
      'reports': 'Laporan Keuangan & Neraca',
      'shu': 'Perhitungan & Distribusi SHU',
      'coop-info': 'Profil & Papan Pengumuman Koperasi',
      'settings': 'Pengaturan & Cadangan Data'
    };
    return titles[route] || 'Smart Co-op Financial System';
  }

  renderCurrentView() {
    const viewContainer = document.getElementById('main-content-view');
    if (!viewContainer) return;

    switch (this.currentRoute) {
      case 'dashboard':
        renderDashboardView(viewContainer, (target) => this.navigate(target));
        break;
      case 'members':
        renderMembersView(viewContainer);
        break;
      case 'savings':
        renderSavingsView(viewContainer);
        break;
      case 'loans':
        renderLoansView(viewContainer, (target) => this.navigate(target));
        break;
      case 'installments':
        renderInstallmentsView(viewContainer);
        break;
      case 'transactions':
        renderTransactionsView(viewContainer);
        break;
      case 'reports':
        renderReportsView(viewContainer);
        break;
      case 'shu':
        renderShuView(viewContainer);
        break;
      case 'coop-info':
        renderCoopInfoView(viewContainer);
        break;
      case 'settings':
        renderSettingsView(viewContainer);
        break;
      default:
        renderDashboardView(viewContainer, (target) => this.navigate(target));
    }
  }

  getInitials(name) {
    if (!name) return 'IK';
    const words = name.replace(/Dr\.|H\.|Ir\.|M\.Kom\.|S\.Kom\.|M\.Ak\.|S\.E\.|S\.AP\.|M\.T\.|A\.Md\./gi, '').trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return (name[0] + (name[1] || '')).toUpperCase();
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
