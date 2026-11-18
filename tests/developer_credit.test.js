/**
 * Automated Test Suite: Developer Credit & About Application View
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ROUTES } from '../src/presentation/router/routes.js';
import { rbac } from '../src/infrastructure/rbac/rbacEngine.js';
import { ROLES } from '../src/config/constants.js';
import { renderFooter } from '../src/presentation/layout/Footer.js';
import { renderAboutView } from '../src/presentation/views/AboutView.js';

describe('Developer Credit & About Application Subsystem Tests', () => {
  it('1. Should register /about route in application routes configuration for all roles', () => {
    const aboutRoute = ROUTES.find(r => r.path === '/about');
    assert.ok(aboutRoute, 'Route /about must be registered');
    assert.strictEqual(aboutRoute.title, 'Tentang Aplikasi');
    assert.strictEqual(aboutRoute.view, 'AboutView');
    assert.ok(aboutRoute.allowedRoles.includes(ROLES.ADMIN));
    assert.ok(aboutRoute.allowedRoles.includes(ROLES.CHAIRMAN));
    assert.ok(aboutRoute.allowedRoles.includes(ROLES.MEMBER));
  });

  it('2. Should grant access to /about route for Admin, Chairman, and Member roles', () => {
    const aboutRoute = ROUTES.find(r => r.path === '/about');

    const adminUser = { id: 'usr-admin-001', role: ROLES.ADMIN };
    const chairmanUser = { id: 'usr-ketua-001', role: ROLES.CHAIRMAN };
    const memberUser = { id: 'usr-dosen-001', role: ROLES.MEMBER };

    assert.strictEqual(rbac.evaluateRouteAccess(adminUser, aboutRoute).allowed, true);
    assert.strictEqual(rbac.evaluateRouteAccess(chairmanUser, aboutRoute).allowed, true);
    assert.strictEqual(rbac.evaluateRouteAccess(memberUser, aboutRoute).allowed, true);
  });

  it('3. Footer component should render developer identity and academic credentials accurately', () => {
    const mockContainer = { innerHTML: '', querySelector: () => null };
    renderFooter(mockContainer);

    const html = mockContainer.innerHTML;
    assert.ok(html.includes('Smart Co-op Financial System'), 'Footer must contain app name');
    assert.ok(html.includes('Ahmad Maulana Ibrohim'), 'Footer must display developer name');
    assert.ok(html.includes('41257087'), 'Footer must display NIM');
    assert.ok(html.includes('TI-2025-KIP-1A'), 'Footer must display Kelas');
    assert.ok(html.includes('STMIK IKMI Cirebon'), 'Footer must display Institution');
    assert.ok(html.includes('2026'), 'Footer must display year 2026');
  });

  it('4. AboutView component should render full developer profile and cooperative system details', () => {
    const mockContainer = { innerHTML: '', querySelector: () => null };
    renderAboutView(mockContainer, { user: { name: 'Admin Koperasi', role: 'ADMIN' } });

    const html = mockContainer.innerHTML;
    assert.ok(html.includes('Smart Co-op Financial System'), 'About page must contain app name');
    assert.ok(html.includes('Ahmad Maulana Ibrohim'), 'About page must display developer name');
    assert.ok(html.includes('41257087'), 'About page must display NIM');
    assert.ok(html.includes('TI-2025-KIP-1A'), 'About page must display Kelas');
    assert.ok(html.includes('STMIK IKMI Cirebon'), 'About page must display Institution');
    assert.ok(html.includes('2026'), 'About page must display development year');
    assert.ok(html.includes('Sistem informasi keuangan koperasi berbasis web'), 'About page must contain description');
  });
});
