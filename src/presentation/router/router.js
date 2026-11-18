/**
 * Client-Side Router with Middleware Guards & RBAC Pipeline
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { ROUTES } from './routes.js';
import { auth } from '../../infrastructure/auth/authService.js';
import { rbac } from '../../infrastructure/rbac/rbacEngine.js';

class Router {
  constructor(routes = ROUTES) {
    this.routes = routes;
    this.currentRoute = null;
    this.history = [];
    this.viewRegistry = {};
    this.container = null;
    this.guardHooks = [];

    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => this.handleRouting());
    }
  }

  registerView(viewName, renderFn) {
    this.viewRegistry[viewName] = renderFn;
  }

  setContainer(containerElement) {
    this.container = containerElement;
  }

  init() {
    if (typeof window === 'undefined') return;
    if (!window.location.hash) {
      window.location.hash = '#/dashboard';
    } else {
      this.handleRouting();
    }
  }

  navigate(path) {
    if (typeof window !== 'undefined') {
      window.location.hash = `#${path}`;
    }
  }

  getCurrentPath() {
    if (typeof window === 'undefined') return '/';
    const hash = window.location.hash.slice(1); // remove '#'
    return hash.split('?')[0] || '/';
  }

  findRoute(path) {
    const match = this.routes.find(r => r.path === path);
    if (match && match.redirect) {
      return this.findRoute(match.redirect);
    }
    return match || null;
  }

  async handleRouting() {
    const path = this.getCurrentPath();
    const user = auth.getUser();
    let route = this.findRoute(path);

    if (!route) {
      route = this.findRoute('/not-found');
    }

    // Evaluate RBAC & Auth Guard
    const access = rbac.evaluateRouteAccess(user, route);

    if (!access.allowed) {
      if (access.redirect === '/login') {
        window.location.hash = '#/login';
        return;
      }
      if (access.redirect === '/forbidden') {
        window.location.hash = '#/forbidden';
        return;
      }
    }

    this.currentRoute = route;
    document.title = `${route.title || 'Smart Co-op'} - STMIK IKMI Cirebon`;

    // Notify listeners / render views
    if (this.onRouteChanged) {
      this.onRouteChanged(route, user);
    }

    this.renderCurrentView();
  }

  renderCurrentView() {
    if (!this.container || !this.currentRoute) return;

    const renderFn = this.viewRegistry[this.currentRoute.view];
    if (renderFn) {
      renderFn(this.container, {
        route: this.currentRoute,
        user: auth.getUser(),
        navigate: (p) => this.navigate(p)
      });
    } else {
      this.container.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <h3>Modul Sedang Disiapkan</h3>
          <p>Tampilan untuk <code>${this.currentRoute.view}</code> belum didaftarkan pada view registry.</p>
        </div>
      `;
    }
  }
}

export const router = new Router();
