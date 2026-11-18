/**
 * Dashboard Shell View
 * Features Active Session Token Inspector, Live Auth Test Suite, and RBAC Guard Tester
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { ENV } from '../../config/env.js';
import { db } from '../../infrastructure/database/connection.js';
import { auth } from '../../infrastructure/auth/authService.js';
import { rbac } from '../../infrastructure/rbac/rbacEngine.js';
import { renderAuthTestSuite } from '../components/AuthTestSuite.js';
import { renderChatbotAssistant } from '../components/ChatbotAssistant.js';
import { router } from '../router/router.js';

export function renderDashboardShellView(container, { user }) {
  const health = db.getHealthStatus();
  const session = auth.getSession();
  const member = auth.getMember();
  const permissions = rbac.getPermissionsForRole(user ? user.role : '');

  container.innerHTML = `
    <div class="animate-fade-in">
      
      <!-- Welcome Hero Banner -->
      <div style="background: linear-gradient(135deg, #0A2540 0%, #1e3a8a 100%); border-radius: var(--radius-xl); padding: 2rem; color: #fff; margin-bottom: 1.75rem; box-shadow: var(--shadow-md);">
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(59, 130, 246, 0.25); padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #93c5fd; margin-bottom: 0.6rem;">
          <span>🏛️ SUBSISTEM DATABASE & AUTENTIKASI TERENKRIPSI</span>
        </div>
        <h2 style="font-size: 1.6rem; color: #fff; margin-bottom: 0.35rem;">
          Selamat Datang, ${user ? user.name : 'Pengguna'}
        </h2>
        <p style="font-size: 0.875rem; color: rgba(255,255,255,0.85); max-width: 750px; line-height: 1.6;">
          Akun Anda terotentikasi dengan peran <strong>${user ? user.role : 'GUEST'}</strong> ${member ? `(${member.member_type} &bull; ${member.identity_number})` : ''}. Seluruh kredensial dilindungi oleh hashing <strong>PBKDF2-SHA256</strong> dan sesi token aktif.
        </p>
      </div>

      <!-- Health & Session Metrics Grid -->
      <div class="stats-grid">
        
        <div class="stat-card" style="--stat-accent: #10b981;">
          <div class="stat-info">
            <span class="stat-label">Status Database</span>
            <span class="stat-value" style="color: var(--success); font-size: 1.3rem;">${health.status}</span>
            <span class="stat-subtext">Latency: <strong>${health.latencyMs}ms</strong> &bull; Latency Ping OK</span>
          </div>
          <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
          </div>
        </div>

        <div class="stat-card" style="--stat-accent: #3b82f6;">
          <div class="stat-info">
            <span class="stat-label">Sesi & Token Aktif</span>
            <span class="stat-value" style="color: var(--primary-600); font-size: 1.15rem; font-family: monospace;">${session ? session.token.slice(0, 15) + '...' : 'TIDAK AKTIF'}</span>
            <span class="stat-subtext">Kedaluwarsa: 8 Jam &bull; Valid</span>
          </div>
          <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
        </div>

        <div class="stat-card" style="--stat-accent: #8b5cf6;">
          <div class="stat-info">
            <span class="stat-label">Hak Akses (RBAC)</span>
            <span class="stat-value" style="color: var(--purple); font-size: 1.3rem;">${user ? user.role : 'GUEST'}</span>
            <span class="stat-subtext"><strong>${permissions.length}</strong> Izin Fitur Aktif</span>
          </div>
          <div class="stat-icon" style="--stat-icon-bg: var(--purple-light); --stat-icon-color: var(--purple);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
        </div>

      </div>

      <!-- Top Section: Session Inspector & Route Guard Tester -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem; margin-bottom: 1.75rem;">
        
        <!-- Active Session Token Inspector -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Active Session & Security Inspector
            </h3>
            <span class="badge badge-success">SESI VALID</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.825rem;">
            <div>
              <span style="color: var(--text-tertiary);">Session Token (Cryptographically Secure):</span>
              <div style="font-family: monospace; background: var(--bg-subtle); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); word-break: break-all; margin-top: 0.2rem; color: var(--primary-700);">
                ${session ? session.token : '-'}
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div style="padding: 0.6rem; background: var(--bg-subtle); border-radius: var(--radius-sm);">
                <div style="font-size: 0.7rem; color: var(--text-tertiary);">USER ID</div>
                <strong><code>${user ? user.id : '-'}</code></strong>
              </div>
              <div style="padding: 0.6rem; background: var(--bg-subtle); border-radius: var(--radius-sm);">
                <div style="font-size: 0.7rem; color: var(--text-tertiary);">MEMBER NUMBER</div>
                <strong><code>${member ? member.member_number : 'BUKAN MEMBER'}</code></strong>
              </div>
            </div>

            <div style="padding: 0.6rem; background: var(--bg-subtle); border-radius: var(--radius-sm);">
              <div style="font-size: 0.7rem; color: var(--text-tertiary);">ALGORITMA HASHING & ENKRIPSI</div>
              <strong style="color: var(--success-text);">PBKDF2 (SHA-256) &bull; 100.000 Iterations &bull; 16-byte Random Salt</strong>
            </div>
          </div>
        </div>

        <!-- Protected Route Guard Tester -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Pengujian Route Guard & RBAC
            </h3>
          </div>

          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.85rem;">
            Uji apakah router memproteksi akses sesuai role aktif Anda (<strong>${user ? user.role : 'GUEST'}</strong>):
          </p>

          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <button class="btn btn-secondary test-route-btn" data-path="/admin/console" style="justify-content: space-between; text-align: left; font-size: 0.8rem;">
              <span>🛡️ Buka Konsol Admin (<code>/admin/console</code>)</span>
              <span class="badge ${user && user.role === 'ADMIN' ? 'badge-success' : 'badge-danger'}" style="font-size: 0.65rem;">
                ${user && user.role === 'ADMIN' ? 'Diizinkan' : 'Ditolak (403)'}
              </span>
            </button>

            <button class="btn btn-secondary test-route-btn" data-path="/chairman/monitoring" style="justify-content: space-between; text-align: left; font-size: 0.8rem;">
              <span>🏛️ Buka Area Ketua (<code>/chairman/monitoring</code>)</span>
              <span class="badge ${user && (user.role === 'CHAIRMAN' || user.role === 'ADMIN') ? 'badge-success' : 'badge-danger'}" style="font-size: 0.65rem;">
                ${user && (user.role === 'CHAIRMAN' || user.role === 'ADMIN') ? 'Diizinkan' : 'Ditolak (403)'}
              </span>
            </button>

            <button class="btn btn-secondary test-route-btn" data-path="/member/profile" style="justify-content: space-between; text-align: left; font-size: 0.8rem;">
              <span>👤 Buka Portal Anggota (<code>/member/profile</code>)</span>
              <span class="badge ${user && (user.role === 'MEMBER' || user.role === 'ADMIN') ? 'badge-success' : 'badge-danger'}" style="font-size: 0.65rem;">
                ${user && (user.role === 'MEMBER' || user.role === 'ADMIN') ? 'Diizinkan' : 'Ditolak (403)'}
              </span>
            </button>
          </div>
        </div>

      </div>

      <!-- Smart Co-op AI Chatbot Assistant Section -->
      <div id="ai-assistant-chatbot-container"></div>

      <!-- Bottom Section: Interactive Automated Test Suite -->
      <div id="auth-test-suite-container" style="margin-bottom: 1.5rem;"></div>

    </div>
  `;

  // Attach test route buttons
  container.querySelectorAll('.test-route-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = btn.dataset.path;
      router.navigate(path);
    });
  });

  // Mount Smart Co-op AI Assistant Chatbot Component
  const chatbotContainer = container.querySelector('#ai-assistant-chatbot-container');
  if (chatbotContainer) {
    renderChatbotAssistant(chatbotContainer, { user, member });
  }

  // Mount Auth Test Suite Component
  const testSuiteContainer = container.querySelector('#auth-test-suite-container');
  if (testSuiteContainer) {
    renderAuthTestSuite(testSuiteContainer);
  }
}
