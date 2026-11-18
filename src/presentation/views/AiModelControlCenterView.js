/**
 * AI Model Control Center View
 * Dedicated Admin Management Interface for Multi-Model AI Engine
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { auth } from '../../infrastructure/auth/authService.js';
import { requireAuthorization } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { ROLES } from '../../config/constants.js';
import { aiAdminClient } from '../../infrastructure/ai/aiAdminClientService.js';
import { toast } from '../components/Toast.js';

export async function renderAiModelControlCenterView(container, { user, navigate }) {
  const currentUser = user || auth.getUser();
  if (!currentUser) {
    navigate('/login');
    return;
  }

  // Strict RBAC service-level enforcement
  requireAuthorization(currentUser, [ROLES.ADMIN]);

  let configData = { providers: [], routing: {} };
  let usageMetrics = null;
  let activeTab = 'providers'; // 'providers', 'routing', 'usage'
  let testingProviderId = null;

  async function loadData() {
    try {
      const [cfg, metrics] = await Promise.all([
        aiAdminClient.getConfig(),
        aiAdminClient.getUsageMetrics()
      ]);
      configData = cfg;
      usageMetrics = metrics;
    } catch (err) {
      console.error('Failed loading AI Control Center data:', err);
      toast.error('Gagal memuat konfigurasi AI: ' + err.message);
    }
  }

  await loadData();

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num || 0);
  }

  function formatCurrencyIdr(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount || 0);
  }

  function getStatusBadge(status) {
    if (status === 'CONNECTED' || status === 'READY') {
      return `<span class="badge badge-success" style="font-weight: 700;">🟢 TERHUBUNG</span>`;
    }
    if (status === 'FAILED') {
      return `<span class="badge badge-danger" style="font-weight: 700;">🔴 GAGAL</span>`;
    }
    return `<span class="badge badge-warning" style="font-weight: 700;">⚪ BELUM DIKONFIGURASI</span>`;
  }

  function render() {
    const providers = configData.providers || [];
    const routing = configData.routing || {};

    container.innerHTML = `
      <div class="animate-fade-in" style="padding-bottom: 3.5rem;">
        
        <!-- Hero Header -->
        <div style="background: linear-gradient(135deg, #0A2540 0%, #1e3a8a 60%, #4338ca 100%); border-radius: var(--radius-xl); padding: 2.25rem 2rem; color: #fff; margin-bottom: 1.75rem; box-shadow: var(--shadow-lg); position: relative; overflow: hidden;">
          <div style="position: absolute; right: -15px; bottom: -25px; opacity: 0.1; font-size: 11rem; font-weight: 900; pointer-events: none; user-select: none;">AI</div>
          
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); padding: 0.35rem 0.9rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #fff;">
              <span>🤖 SMART CO-OP MULTI-MODEL AI ENGINE</span>
              <span style="opacity: 0.5;">&bull;</span>
              <span>ADMIN ONLY</span>
            </div>

            <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(16, 185, 129, 0.3); padding: 0.35rem 0.8rem; border-radius: var(--radius-full); font-size: 0.725rem; font-weight: 700; color: #a7f3d0;">
              <span>🛡️ RBAC PROTECTED (ADMIN SUPERUSER)</span>
            </div>
          </div>

          <h2 style="font-size: 1.85rem; color: #fff; margin-bottom: 0.4rem; font-family: 'Outfit', sans-serif;">
            AI MODEL CONTROL CENTER
          </h2>
          <p style="font-size: 0.875rem; color: rgba(255,255,255,0.92); max-width: 820px; line-height: 1.6; margin: 0;">
            Pusat manajemen arsitektur multi-provider AI resmi Koperasi STMIK IKMI Cirebon. Konfigurasi kredensial API secara aman di backend, atur routing otomatis dan mekanisme fallback, pantau konsumsi token, serta estimasi biaya real-time.
          </p>
        </div>

        <!-- Navigation Tabs -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
          <button type="button" class="btn ${activeTab === 'providers' ? 'btn-primary' : 'btn-outline'}" id="tab-btn-providers" style="display: inline-flex; align-items: center; gap: 0.4rem;">
            <span>🧩 Provider & Model AI (${providers.length})</span>
          </button>
          <button type="button" class="btn ${activeTab === 'routing' ? 'btn-primary' : 'btn-outline'}" id="tab-btn-routing" style="display: inline-flex; align-items: center; gap: 0.4rem;">
            <span>🔀 Pengaturan Routing & Fallback</span>
          </button>
          <button type="button" class="btn ${activeTab === 'usage' ? 'btn-primary' : 'btn-outline'}" id="tab-btn-usage" style="display: inline-flex; align-items: center; gap: 0.4rem;">
            <span>📊 Telemetri & Analitik Biaya</span>
          </button>
        </div>

        <!-- TAB 1: PROVIDERS & MODEL CONFIGURATION -->
        ${activeTab === 'providers' ? renderProvidersTab(providers) : ''}

        <!-- TAB 2: ROUTING & FALLBACK SETTINGS -->
        ${activeTab === 'routing' ? renderRoutingTab(routing, providers) : ''}

        <!-- TAB 3: USAGE MONITORING & COST ANALYTICS -->
        ${activeTab === 'usage' ? renderUsageTab(usageMetrics) : ''}

      </div>
    `;

    attachEvents();
  }

  function renderProvidersTab(providers) {
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem;">
        ${providers.map(p => {
          const isTesting = testingProviderId === p.id;
          return `
            <div class="card" style="box-shadow: var(--shadow-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <!-- Provider Card Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">
                        ${escapeHtml(p.name)}
                      </h3>
                      ${p.isPrimary ? '<span class="badge badge-primary" style="font-size: 0.65rem;">MODEL UTAMA</span>' : ''}
                      ${p.isBackup ? `<span class="badge badge-info" style="font-size: 0.65rem;">CADANGAN #${p.backupPriority}</span>` : ''}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.2rem;">
                      ID: <code>${p.id}</code> &bull; Base: <code>${escapeHtml(p.baseUrl)}</code>
                    </div>
                  </div>
                  <div>
                    ${getStatusBadge(p.status)}
                  </div>
                </div>

                <!-- Provider Configuration Form -->
                <form class="provider-form" data-provider-id="${p.id}" style="display: flex; flex-direction: column; gap: 0.75rem;">
                  
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <label style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.825rem; font-weight: 700; cursor: pointer;">
                      <input type="checkbox" name="isEnabled" ${p.isEnabled ? 'checked' : ''}>
                      <span>Aktifkan Provider</span>
                    </label>
                    <span style="opacity: 0.4;">|</span>
                    <label style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.825rem; font-weight: 700; cursor: pointer;">
                      <input type="radio" name="isPrimaryGroup" class="primary-radio" data-id="${p.id}" ${p.isPrimary ? 'checked' : ''}>
                      <span>Set Sebagai Utama</span>
                    </label>
                  </div>

                  <div>
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem;">
                      Model Aktif:
                    </label>
                    <input
                      type="text"
                      name="selectedModel"
                      value="${escapeHtml(p.selectedModel || p.defaultModel)}"
                      class="form-control"
                      style="width: 100%; font-size: 0.85rem;"
                      placeholder="Contoh: meta/llama-3.2-11b-vision-instruct"
                    />
                  </div>

                  <div>
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem;">
                      API Key (Tersimpan Aman di Backend):
                    </label>
                    <input
                      type="password"
                      name="apiKey"
                      value="${escapeHtml(p.apiKey)}"
                      class="form-control"
                      style="width: 100%; font-size: 0.85rem; font-family: monospace;"
                      placeholder="Ketik kunci API baru untuk memperbarui..."
                    />
                    <small style="font-size: 0.7rem; color: var(--text-tertiary);">
                      Kunci dirahasiakan (masked). Hanya disimpan di lingkungan server backend.
                    </small>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <div>
                      <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem;">
                        Temperature:
                      </label>
                      <input
                        type="number"
                        name="temperature"
                        step="0.05"
                        min="0"
                        max="1"
                        value="${p.temperature !== undefined ? p.temperature : 0.2}"
                        class="form-control"
                        style="width: 100%; font-size: 0.85rem;"
                      />
                    </div>
                    <div>
                      <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem;">
                        Max Tokens:
                      </label>
                      <input
                        type="number"
                        name="maxTokens"
                        step="50"
                        min="100"
                        max="4000"
                        value="${p.maxTokens || 1000}"
                        class="form-control"
                        style="width: 100%; font-size: 0.85rem;"
                      />
                    </div>
                  </div>

                  <div>
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem;">
                      Wewenang Role Pengguna (RBAC):
                    </label>
                    <div style="display: flex; gap: 0.75rem; font-size: 0.75rem; margin-top: 0.2rem;">
                      <label style="display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                        <input type="checkbox" name="role_admin" ${p.allowedRoles?.includes('ADMIN') ? 'checked' : ''}>
                        <span>Admin</span>
                      </label>
                      <label style="display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                        <input type="checkbox" name="role_chairman" ${p.allowedRoles?.includes('CHAIRMAN') ? 'checked' : ''}>
                        <span>Ketua</span>
                      </label>
                      <label style="display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                        <input type="checkbox" name="role_member" ${p.allowedRoles?.includes('MEMBER') ? 'checked' : ''}>
                        <span>Anggota</span>
                      </label>
                    </div>
                  </div>

                  <!-- Test Result Notice -->
                  ${p.lastTestedAt ? `
                    <div style="background: var(--bg-subtle); padding: 0.45rem 0.65rem; border-radius: var(--radius-sm); font-size: 0.725rem; border: 1px solid var(--border-color); margin-top: 0.25rem;">
                      <div><strong>Uji Terakhir:</strong> ${new Date(p.lastTestedAt).toLocaleString('id-ID')}</div>
                      <div style="color: ${p.status === 'CONNECTED' ? 'var(--success)' : 'var(--danger-text)'};">${escapeHtml(p.lastTestMessage || 'OK')}</div>
                    </div>
                  ` : ''}

                  <!-- Actions -->
                  <div style="display: flex; gap: 0.5rem; justify-content: space-between; align-items: center; margin-top: 0.5rem; pt: 0.5rem; border-top: 1px solid var(--border-color);">
                    <button type="button" class="btn btn-sm btn-outline test-connection-btn" data-id="${p.id}" ${isTesting ? 'disabled' : ''}>
                      ${isTesting ? '⏳ Menguji...' : '🔌 Uji Koneksi API'}
                    </button>
                    <div style="display: flex; gap: 0.35rem;">
                      <button type="button" class="btn btn-sm btn-danger delete-provider-btn" data-id="${p.id}" title="Reset / Kosongkan Kunci API">
                        🗑️ Reset
                      </button>
                      <button type="submit" class="btn btn-sm btn-primary save-provider-btn">
                        💾 Simpan
                      </button>
                    </div>
                  </div>

                </form>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderRoutingTab(routing, providers) {
    const mappings = routing.intentMappings || {};

    return `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <h3 class="card-title">Pengaturan Kebijakan AI Router & Fallback</h3>
        </div>

        <form id="routing-settings-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <label style="display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700; cursor: pointer;">
                <input type="checkbox" id="route-auto-routing" ${routing.autoRoutingEnabled ? 'checked' : ''}>
                <span>Automatic Model Routing</span>
              </label>
              <p style="font-size: 0.775rem; color: var(--text-secondary); margin: 0.3rem 0 0 1.5rem;">
                Menganalisis maksud pesan pengguna secara real-time dan mengarahkan otomatis ke model terbaik (cepat untuk percakapan, analitis untuk laporan).
              </p>
            </div>

            <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <label style="display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700; cursor: pointer;">
                <input type="checkbox" id="route-manual-selection" ${routing.allowManualSelection ? 'checked' : ''}>
                <span>Manual Model Selection oleh Pengguna</span>
              </label>
              <p style="font-size: 0.775rem; color: var(--text-secondary); margin: 0.3rem 0 0 1.5rem;">
                Mengizinkan pengguna memilih model secara manual pada antarmuka Chatbot sesuai role yang diotorisasi.
              </p>
            </div>

            <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
              <label style="display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.3rem;">
                Maksimal Percobaan Fallback:
              </label>
              <input type="number" id="route-max-fallback" min="1" max="5" value="${routing.maxFallbackAttempts || 2}" class="form-control" style="width: 100px;">
              <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.3rem;">
                Batas maksimal pengalihan ke provider cadangan saat provider utama mengalami error/timeout.
              </p>
            </div>
          </div>

          <h4 style="margin: 0.75rem 0 0.25rem 0; font-size: 1rem; color: var(--text-primary);">
            Pemetaan Kategori Maksud Pertanyaan (Intent Mapping):
          </h4>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Kategori Pertanyaan</th>
                  <th>Karakteristik Kebutuhan</th>
                  <th>Preferred Provider</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Percakapan Umum & Salam</strong></td>
                  <td>Cepat, ramah, dan hemat biaya token</td>
                  <td>
                    <select class="form-control intent-provider-select" data-intent="CONVERSATIONAL">
                      ${providers.map(p => `<option value="${p.id}" ${mappings.CONVERSATIONAL?.preferredProvider === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td><strong>Pertanyaan Database (Anggota & Simpanan)</strong></td>
                  <td>Presisi data aktual & kepatuhan anti-halusinasi</td>
                  <td>
                    <select class="form-control intent-provider-select" data-intent="MEMBER_QUERY">
                      ${providers.map(p => `<option value="${p.id}" ${mappings.MEMBER_QUERY?.preferredProvider === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td><strong>Analisis Keuangan & Arus Kas</strong></td>
                  <td>Penalaran matematis dan sintesis laporan</td>
                  <td>
                    <select class="form-control intent-provider-select" data-intent="FINANCIAL_ANALYSIS">
                      ${providers.map(p => `<option value="${p.id}" ${mappings.FINANCIAL_ANALYSIS?.preferredProvider === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td><strong>Penjelasan Sistem & Panduan Fitur</strong></td>
                  <td>Kemampuan naratif bahasa Indonesia yang jelas</td>
                  <td>
                    <select class="form-control intent-provider-select" data-intent="APP_EXPLANATION">
                      ${providers.map(p => `<option value="${p.id}" ${mappings.APP_EXPLANATION?.preferredProvider === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td><strong>Pertanyaan Kompleks & Kode Teknis</strong></td>
                  <td>Reasoning mendalam & pemahaman logika</td>
                  <td>
                    <select class="form-control intent-provider-select" data-intent="COMPLEX_REASONING">
                      ${providers.map(p => `<option value="${p.id}" ${mappings.COMPLEX_REASONING?.preferredProvider === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
            <button type="submit" class="btn btn-primary">
              💾 Simpan Pengaturan Routing
            </button>
          </div>

        </form>
      </div>
    `;
  }

  function renderUsageTab(metrics) {
    if (!metrics) {
      return `<div class="card"><p>Memuat analitik penggunaan...</p></div>`;
    }

    return `
      <div>
        <!-- Stats Summary Grid -->
        <div class="stats-grid" style="margin-bottom: 1.5rem;">
          
          <div class="stat-card" style="--stat-accent: #3b82f6;">
            <div class="stat-info">
              <span class="stat-label">Total Permintaan AI</span>
              <span class="stat-value" style="color: var(--primary-600);">${formatNumber(metrics.totalRequests)}</span>
              <span class="stat-subtext">Sukses: <strong>${metrics.successfulRequests}</strong> &bull; Gagal: <strong>${metrics.failedRequests}</strong></span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
              📈
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #10b981;">
            <div class="stat-info">
              <span class="stat-label">Tingkat Keberhasilan (SLA)</span>
              <span class="stat-value" style="color: var(--success);">${metrics.successRate}%</span>
              <span class="stat-subtext">Rata-rata Latensi: <strong>${metrics.avgLatencyMs}ms</strong></span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
              ⚡
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #8b5cf6;">
            <div class="stat-info">
              <span class="stat-label">Total Token Diproses</span>
              <span class="stat-value" style="color: #8b5cf6;">${formatNumber(metrics.totalTokens)}</span>
              <span class="stat-subtext">In: ${formatNumber(metrics.totalInputTokens)} &bull; Out: ${formatNumber(metrics.totalOutputTokens)}</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: #ede9fe; --stat-icon-color: #8b5cf6;">
              🔤
            </div>
          </div>

          <div class="stat-card" style="--stat-accent: #f59e0b;">
            <div class="stat-info">
              <span class="stat-label">Estimasi Biaya API</span>
              <span class="stat-value" style="color: #d97706;">${formatCurrencyIdr(metrics.totalCostIdr)}</span>
              <span class="stat-subtext">USD: <strong>$${metrics.totalCostUsd}</strong> (Kurs Rp 16.000)</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: #fef3c7; --stat-icon-color: #d97706;">
              💰
            </div>
          </div>

        </div>

        <!-- Breakdown & Recent Logs -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
          
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Penggunaan per Provider AI</h3>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Permintaan</th>
                    <th>Token</th>
                    <th>Estimasi Biaya</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(metrics.providerBreakdown || {}).length === 0 ? '<tr><td colspan="4" style="text-align: center;">Belum ada aktivitas.</td></tr>' : ''}
                  ${Object.entries(metrics.providerBreakdown || {}).map(([pId, data]) => `
                    <tr>
                      <td><strong>${escapeHtml(pId.toUpperCase())}</strong></td>
                      <td>${data.count} (Sukses: ${data.successCount})</td>
                      <td>${formatNumber(data.tokens)}</td>
                      <td>${formatCurrencyIdr(data.costIdr)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Aktivitas Terakhir (Log Telemetri)</h3>
            </div>
            <div style="max-height: 280px; overflow-y: auto; font-size: 0.775rem;">
              ${metrics.recentLogs?.length === 0 ? '<p style="color: var(--text-tertiary); text-align: center; padding: 1rem;">Belum ada riwayat permintaan.</p>' : ''}
              ${metrics.recentLogs?.map(log => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                  <div>
                    <div><strong>${escapeHtml(log.provider_id)}</strong> &bull; <code>${escapeHtml(log.model_id)}</code></div>
                    <div style="color: var(--text-tertiary); font-size: 0.7rem;">
                      ${new Date(log.timestamp).toLocaleTimeString('id-ID')} &bull; Intent: ${escapeHtml(log.intent)} &bull; ${log.latency_ms}ms
                    </div>
                  </div>
                  <div>
                    ${log.success ? '<span class="badge badge-success" style="font-size: 0.65rem;">SUKSES</span>' : '<span class="badge badge-danger" style="font-size: 0.65rem;">GAGAL</span>'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

      </div>
    `;
  }

  function attachEvents() {
    // Tab switching
    const btnProviders = container.querySelector('#tab-btn-providers');
    const btnRouting = container.querySelector('#tab-btn-routing');
    const btnUsage = container.querySelector('#tab-btn-usage');

    if (btnProviders) {
      btnProviders.addEventListener('click', () => {
        activeTab = 'providers';
        render();
      });
    }
    if (btnRouting) {
      btnRouting.addEventListener('click', () => {
        activeTab = 'routing';
        render();
      });
    }
    if (btnUsage) {
      btnUsage.addEventListener('click', () => {
        activeTab = 'usage';
        render();
      });
    }

    // Provider Form Submit
    container.querySelectorAll('.provider-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const providerId = form.dataset.providerId;
        const formData = new FormData(form);

        const allowedRoles = [];
        if (formData.get('role_admin')) allowedRoles.push('ADMIN');
        if (formData.get('role_chairman')) allowedRoles.push('CHAIRMAN');
        if (formData.get('role_member')) allowedRoles.push('MEMBER');

        const updates = {
          isEnabled: Boolean(formData.get('isEnabled')),
          selectedModel: formData.get('selectedModel'),
          apiKey: formData.get('apiKey'),
          temperature: parseFloat(formData.get('temperature')) || 0.2,
          maxTokens: parseInt(formData.get('maxTokens'), 10) || 1000,
          allowedRoles
        };

        try {
          const res = await aiAdminClient.updateProvider(providerId, updates);
          toast.success(res.message || 'Konfigurasi provider berhasil disimpan.');
          await loadData();
          render();
        } catch (err) {
          toast.error('Gagal menyimpan konfigurasi: ' + err.message);
        }
      });
    });

    // Primary Radio handler
    container.querySelectorAll('.primary-radio').forEach(radio => {
      radio.addEventListener('change', async () => {
        const providerId = radio.dataset.id;
        try {
          await aiAdminClient.updateProvider(providerId, { isPrimary: true });
          toast.success(`Provider "${providerId}" ditetapkan sebagai Model Utama.`);
          await loadData();
          render();
        } catch (err) {
          toast.error('Gagal mengubah model utama: ' + err.message);
        }
      });
    });

    // Test Connection Button
    container.querySelectorAll('.test-connection-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const providerId = btn.dataset.id;
        testingProviderId = providerId;
        render();

        try {
          const result = await aiAdminClient.testConnection(providerId);
          if (result.success) {
            toast.success(`Uji koneksi ${providerId} berhasil (${result.latencyMs}ms): ${result.message}`);
          } else {
            toast.error(`Uji koneksi ${providerId} gagal: ${result.message}`);
          }
        } catch (err) {
          toast.error('Gagal menguji koneksi: ' + err.message);
        } finally {
          testingProviderId = null;
          await loadData();
          render();
        }
      });
    });

    // Delete/Reset Provider Button
    container.querySelectorAll('.delete-provider-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const providerId = btn.dataset.id;
        if (confirm(`Yakin ingin mereset dan mengosongkan kunci API untuk provider "${providerId}"?`)) {
          try {
            await aiAdminClient.deleteProvider(providerId);
            toast.success(`Konfigurasi provider "${providerId}" berhasil direset.`);
            await loadData();
            render();
          } catch (err) {
            toast.error('Gagal mereset provider: ' + err.message);
          }
        }
      });
    });

    // Routing Settings Form Submit
    const routingForm = container.querySelector('#routing-settings-form');
    if (routingForm) {
      routingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const autoRouting = container.querySelector('#route-auto-routing').checked;
        const manualSelection = container.querySelector('#route-manual-selection').checked;
        const maxFallback = parseInt(container.querySelector('#route-max-fallback').value, 10) || 2;

        const intentMappings = {};
        container.querySelectorAll('.intent-provider-select').forEach(select => {
          const intentCat = select.dataset.intent;
          intentMappings[intentCat] = { preferredProvider: select.value };
        });

        try {
          await aiAdminClient.updateRouting({
            autoRoutingEnabled: autoRouting,
            allowManualSelection: manualSelection,
            maxFallbackAttempts: maxFallback,
            intentMappings
          });
          toast.success('Pengaturan model routing berhasil disimpan.');
          await loadData();
          render();
        } catch (err) {
          toast.error('Gagal menyimpan routing: ' + err.message);
        }
      });
    }
  }

  render();
}

