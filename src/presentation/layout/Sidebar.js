/**
 * Sidebar Layout Component
 * Dynamically filters navigation links based on current user role & RBAC
 */

import { rbac } from '../../infrastructure/rbac/rbacEngine.js';
import { ROUTES } from '../router/routes.js';
import { router } from '../router/router.js';

export function renderSidebar(sidebarElement, { currentPath, user }) {
  const allowedRoutes = ROUTES.filter(r => {
    if (r.isPublic || r.redirect || r.hidden) return false;
    const access = rbac.evaluateRouteAccess(user, r);
    return access.allowed;
  });

  sidebarElement.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">IKMI</div>
      <div class="sidebar-brand-text">
        <h2>Smart Co-op</h2>
        <p>STMIK IKMI Cirebon</p>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-title">Navigasi Utama</div>
      ${allowedRoutes.map(r => {
        const isActive = currentPath === r.path;
        return `
          <a class="nav-item ${isActive ? 'active' : ''}" data-path="${r.path}" href="#${r.path}">
            ${getNavIcon(r)}
            <span>${r.title}</span>
          </a>
        `;
      }).join('')}
    </nav>

    <div class="sidebar-footer">
      <div class="user-avatar" style="background: linear-gradient(135deg, #3b82f6, #1e40af);">${getInitials(user ? user.name : 'IK')}</div>
      <div class="user-info">
        <div class="user-name" title="${user ? user.name : 'User'}">${user ? user.name : 'User'}</div>
        <div class="user-role-badge">${user ? user.role : 'GUEST'}</div>
      </div>
    </div>
  `;

  sidebarElement.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const path = item.dataset.path;
      router.navigate(path);
    });
  });
}

function getInitials(name) {
  if (!name) return 'IK';
  const clean = name.replace(/Dr\.|H\.|Ir\.|M\.Kom\.|S\.Kom\.|M\.Ak\.|S\.E\.|S\.AP\.|M\.T\.|A\.Md\./gi, '').trim().split(' ');
  if (clean.length >= 2) {
    return (clean[0][0] + clean[1][0]).toUpperCase();
  }
  return (name[0] + (name[1] || '')).toUpperCase();
}

function getNavIcon(route) {
  const path = route.path || '';
  if (path.includes('dashboard')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
  }
  if (path.includes('loans')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`;
  }
  if (path.includes('members')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
  }
  if (path.includes('chairman') || path.includes('monitoring')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 10h6"></path><path d="M9 14h6"></path><path d="M9 18h6"></path></svg>`;
  }
  if (path.includes('ai-control') || path.includes('ai')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>`;
  }
  if (path.includes('admin') || path.includes('console')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
  }
  if (path.includes('transactions')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
  }
  if (path.includes('reports')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
  }
  if (path.includes('profile')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
  }
  if (path.includes('about')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }
  if (path.includes('telegram')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>`;
  }
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>`;
}
