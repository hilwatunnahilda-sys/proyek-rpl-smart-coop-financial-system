/**
 * Main Layout Shell Component
 * Coordinates Header, Sidebar, Content Canvas, and Mobile Drawer
 */

import { renderHeader } from './Header.js';
import { renderSidebar } from './Sidebar.js';
import { renderFooter } from './Footer.js';

export function renderLayout(appRoot, { route, user }) {
  appRoot.innerHTML = `
    <!-- Mobile Sidebar Backdrop Overlay -->
    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <!-- App Sidebar -->
    <aside class="app-sidebar" id="app-sidebar"></aside>

    <!-- Main Content Area -->
    <div class="app-main">
      <header class="app-header" id="app-header"></header>
      <main class="content-body" id="main-content-view"></main>
      <footer class="app-footer" id="app-footer"></footer>
    </div>
  `;

  const sidebarEl = appRoot.querySelector('#app-sidebar');
  const headerEl = appRoot.querySelector('#app-header');
  const footerEl = appRoot.querySelector('#app-footer');
  const overlayEl = appRoot.querySelector('#sidebar-overlay');

  renderSidebar(sidebarEl, { currentPath: route ? route.path : '/', user });
  renderHeader(headerEl, { route, user });
  renderFooter(footerEl);

  // Mobile sidebar events
  const newToggleBtn = headerEl.querySelector('#sidebar-toggle');
  if (newToggleBtn && sidebarEl && overlayEl) {
    newToggleBtn.addEventListener('click', () => {
      sidebarEl.classList.toggle('open');
      overlayEl.classList.toggle('open');
    });

    overlayEl.addEventListener('click', () => {
      sidebarEl.classList.remove('open');
      overlayEl.classList.remove('open');
    });
  }

  return appRoot.querySelector('#main-content-view');
}
