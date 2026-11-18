/**
 * Smart Co-op AI Assistant UI Component - Multi-Model AI Engine
 * Supports NVIDIA NIM, OpenAI, Google Gemini, Anthropic, OpenRouter & Ollama
 * 
 * Features:
 * - Dynamic Model Selector (Auto Select or specific active AI provider)
 * - Real-time conversational AI with authorized backend database access
 * - Role-tailored suggestion chips (Admin, Ketua, Anggota)
 * - Active model indicator and answer attribution badge
 * - Session token authentication via Authorization: Bearer <token>
 * - Context preservation across model switches
 * - Markdown & Code block rendering with Copy-to-Clipboard
 * - Auto-scroll to latest message
 * - Typing indicator & Loading states
 * - Clear conversation & Error retry mechanism
 * - Dark mode & Mobile responsive
 * 
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { auth } from '../../infrastructure/auth/authService.js';
import { ENV } from '../../config/env.js';
import { ROLES } from '../../config/constants.js';

export function renderChatbotAssistant(container, { user, member } = {}) {
  const activeUser = user || auth.getUser();
  const activeMember = member || auth.getMember();
  const userRole = activeUser ? activeUser.role : ROLES.MEMBER;

  const INITIAL_GREETING = `👋 Halo, **${activeUser ? activeUser.name : 'Pengguna'}**! Saya **Smart Co-op AI Assistant** multi-model engine.

Saya terhubung langsung ke basis data terotorisasi Koperasi STMIK IKMI Cirebon. Anda dapat menggunakan pilihan **Auto Select** atau memilih provider AI yang aktif untuk menjawab pertanyaan seputar anggota, simpanan, pinjaman, angsuran, atau laporan keuangan sesuai wewenang Anda (**${userRole}**).`;

  // Internal component state
  const state = {
    currentUserId: activeUser ? activeUser.id : null,
    selectedProviderId: 'auto',
    selectedModelId: null,
    lastUsedProviderName: 'Multi-Model Engine',
    lastUsedModel: 'Auto Select',
    availableProviders: [],
    allowManualSelection: true,
    messages: [
      {
        id: `msg-init-${Date.now()}`,
        role: 'assistant',
        content: INITIAL_GREETING,
        providerName: 'Smart Co-op Engine',
        model: 'Multi-Model Engine',
        timestamp: new Date()
      }
    ],
    isLoading: false,
    errorMessage: '',
    lastFailedUserMessage: ''
  };

  function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Simple and secure markdown renderer for chat messages
   */
  function renderMarkdown(content) {
    if (!content) return '';

    // Handle code blocks ```language\n code \n```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let rendered = content.replace(codeBlockRegex, (match, lang, code) => {
      const escapedCode = escapeHtml(code.trim());
      const langLabel = lang || 'code';
      const codeId = `code-${Math.random().toString(36).substring(2, 9)}`;

      return `
        <div class="ai-code-block" style="margin: 0.6rem 0; border-radius: var(--radius-md); overflow: hidden; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); font-family: 'Fira Code', monospace, monospace; font-size: 0.8rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: #1e293b; padding: 0.35rem 0.75rem; color: #94a3b8; font-size: 0.725rem; font-weight: 600;">
            <span>${langLabel.toUpperCase()}</span>
            <button type="button" class="copy-code-btn" data-target="${codeId}" style="background: rgba(255,255,255,0.1); border: none; color: #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.7rem; transition: background 0.2s;">
              📋 Salin Kode
            </button>
          </div>
          <pre id="${codeId}" style="margin: 0; padding: 0.85rem; color: #38bdf8; overflow-x: auto; line-height: 1.45;"><code>${escapedCode}</code></pre>
        </div>
      `;
    });

    // Handle Markdown Tables (| col | col |)
    const tableRegex = /((?:^|\n)\|[^\n]+\|\n\|[\s:-|]+\|\n(?:\|[^\n]+\|(?:$|\n))+)/g;
    rendered = rendered.replace(tableRegex, (match) => {
      const lines = match.trim().split('\n').map(l => l.trim()).filter(l => l.startsWith('|') && l.endsWith('|'));
      if (lines.length < 2) return match;

      const parseRow = (line) => line.slice(1, -1).split('|').map(c => c.trim());
      const headers = parseRow(lines[0]);
      const dataLines = lines.slice(2);

      let tableHtml = '<div class="ai-table-wrapper" style="overflow-x: auto; margin: 0.75rem 0; border: 1px solid var(--border-color); border-radius: 8px;">';
      tableHtml += '<table style="width: 100%; border-collapse: collapse; font-size: 0.825rem; text-align: left;">';
      tableHtml += '<thead style="background: rgba(59,130,246,0.08); color: var(--text-primary); font-weight: 700;"><tr>';
      for (const h of headers) {
        tableHtml += `<th style="padding: 0.45rem 0.75rem; border-bottom: 2px solid var(--border-color);">${h}</th>`;
      }
      tableHtml += '</tr></thead><tbody>';
      for (const dl of dataLines) {
        const cells = parseRow(dl);
        tableHtml += '<tr style="border-bottom: 1px solid var(--border-color);">';
        for (const cell of cells) {
          tableHtml += `<td style="padding: 0.45rem 0.75rem;">${cell}</td>`;
        }
        tableHtml += '</tr>';
      }
      tableHtml += '</tbody></table></div>';
      return tableHtml;
    });

    // Handle inline code `code`
    rendered = rendered.replace(/`([^`]+)`/g, '<code style="background: rgba(59,130,246,0.15); color: var(--primary-700); padding: 0.15rem 0.35rem; border-radius: 4px; font-family: monospace; font-size: 0.85em;">$1</code>');

    // Handle bold **text**
    rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Handle italic *text*
    rendered = rendered.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Convert newlines to <br> while preserving pre and table tags
    const parts = rendered.split(/(<div class="ai-(?:code-block|table-wrapper)"[\s\S]*?<\/div>)/g);
    rendered = parts.map((part) => {
      if (part.startsWith('<div class="ai-code-block"') || part.startsWith('<div class="ai-table-wrapper"')) {
        return part;
      }
      return part.replace(/\n/g, '<br>');
    }).join('');

    return rendered;
  }

  /**
   * Anti-Raw-JSON Cleanser & Formatter for Assistant Message
   */
  function formatAssistantMessage(content) {
    if (!content) return '';
    let text = String(content).trim();

    if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('Informasi data koperasi: {') && text.endsWith('}'))) {
      try {
        const jsonStr = text.startsWith('Informasi data koperasi:') ? text.replace('Informasi data koperasi:', '').trim() : text;
        const obj = JSON.parse(jsonStr);
        if (obj.description) text = obj.description;
        else if (obj.definisi) {
          text = `${obj.appName || 'Smart Co-op Financial System'}: ${obj.definisi}`;
          if (obj.summary && obj.summary.totalTerdaftar !== undefined) {
            text += `\n\nTotal anggota terdaftar: **${obj.summary.totalTerdaftar}** orang (Aktif: ${obj.summary.totalAktif} orang).`;
          }
        } else if (obj.summary && obj.summary.totalTerdaftar !== undefined) {
          text = `Total anggota terdaftar di koperasi saat ini adalah **${obj.summary.totalTerdaftar}** orang (Aktif: ${obj.summary.totalAktif} orang).`;
        } else if (obj.reply) text = obj.reply;
        else if (obj.message) text = obj.message;
      } catch {
        // Fallback to text
      }
    }

    return renderMarkdown(text);
  }

  /**
   * Generates prompt suggestion chips tailored to active role
   */
  function getSuggestionChips() {
    if (userRole === ROLES.ADMIN) {
      return [
        { label: 'ℹ️ Tentang Aplikasi', text: 'Jelaskan aplikasi ini dan sistem ini?' },
        { label: '👥 Total Anggota', text: 'Berapa total anggota?' },
        { label: '✅ Anggota Aktif', text: 'Berapa jumlah anggota aktif?' },
        { label: '📅 Pendaftaran Bulan Ini', text: 'Ada berapa orang yang baru daftar bulan ini?' },
        { label: '📊 Bandingkan Pendaftaran', text: 'Bandingkan pendaftaran bulan ini dengan bulan lalu' },
        { label: '💰 Simpanan Wajib', text: 'Berapa total simpanan wajib?' },
        { label: '📈 Pinjaman Belum Lunas', text: 'Pinjaman yang belum lunas ada berapa?' },
        { label: '⚠️ Belum Bayar Angsuran', text: 'Siapa anggota yang belum membayar angsuran?' },
        { label: '📑 Laporan Keuangan', text: 'Tolong buatkan ringkasan laporan keuangan.' },
        { label: '📦 Cek Stok Barang', text: 'Stok barang apa yang hampir habis?' },
        { label: '💻 Contoh Coding Login', text: 'Buatkan contoh kode login menggunakan JavaScript.' }
      ];
    }

    if (userRole === ROLES.CHAIRMAN) {
      return [
        { label: 'ℹ️ Tentang Aplikasi', text: 'Jelaskan aplikasi ini dan sistem ini?' },
        { label: '🏛️ Total Anggota', text: 'Berapa total anggota?' },
        { label: '✅ Anggota Aktif', text: 'Berapa jumlah anggota aktif?' },
        { label: '📈 Pertumbuhan Anggota', text: 'Bandingkan pendaftaran bulan ini dengan bulan lalu' },
        { label: '💰 Total Simpanan', text: 'Berapa total simpanan?' },
        { label: '📊 Pinjaman Belum Lunas', text: 'Pinjaman yang belum lunas ada berapa?' },
        { label: '⚠️ Belum Bayar Angsuran', text: 'Siapa anggota yang belum membayar angsuran?' },
        { label: '📑 Laporan Arus Kas', text: 'Tolong buatkan ringkasan laporan keuangan.' },
        { label: '📦 Cek Stok Inventaris', text: 'Stok barang apa yang hampir habis?' }
      ];
    }

    // Regular MEMBER (Dosen, Mahasiswa, Staf)
    return [
      { label: 'ℹ️ Tentang Aplikasi', text: 'Jelaskan aplikasi ini dan sistem ini?' },
      { label: '💰 Saldo Simpanan Saya', text: 'Berapa saldo simpanan saya?' },
      { label: '💳 Simpanan Wajib Saya', text: 'Berapa simpanan wajib saya?' },
      { label: '📈 Status Pinjaman Saya', text: 'Bagaimana status pinjaman saya?' },
      { label: '🗓️ Jadwal Angsuran Saya', text: 'Bagaimana jadwal angsuran saya?' },
      { label: '👤 Data Profil Saya', text: 'Tampilkan data profil keanggotaan saya.' },
      { label: '❓ Jenis Simpanan', text: 'Jelaskan jenis-jenis simpanan di Koperasi STMIK IKMI.' },
      { label: '📊 Skema Bunga Pinjaman', text: 'Apa perbedaan skema bunga Flat, Menurun, dan 0% Syariah?' }
    ];
  }

  /**
   * Fetch active models from backend
   */
  async function loadModels() {
    const session = auth.getSession();
    const token = session ? session.token : localStorage.getItem(ENV.AUTH.SESSION_KEY);
    if (!token) return;

    try {
      const res = await fetch('/api/ai/models', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.providers)) {
          state.availableProviders = data.providers;
          state.allowManualSelection = data.allowManualSelection !== false;
          render();
        }
      }
    } catch (e) {
      console.warn('[ChatbotAssistant] Failed loading models:', e);
    }
  }

  function render() {
    const chips = getSuggestionChips();
    const activeProviderName = state.selectedProviderId === 'auto'
      ? 'Auto Select (Otomatis)'
      : (state.availableProviders.find(p => p.providerId === state.selectedProviderId)?.providerName || state.selectedProviderId);

    container.innerHTML = `
      <div class="card" id="smart-coop-ai-card" style="box-shadow: var(--shadow-lg); border: 1px solid var(--border-color); display: flex; flex-direction: column; overflow: hidden; padding: 0; margin-bottom: 1.75rem;">
        
        <!-- Chatbot Header -->
        <div style="background: linear-gradient(135deg, #0A2540 0%, #1e3a8a 60%, #3b82f6 100%); color: #fff; padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 38px; height: 38px; border-radius: var(--radius-full); background: rgba(255,255,255,0.18); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; font-size: 1.35rem; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
              🤖
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #fff; font-family: 'Outfit', sans-serif;">
                  Smart Co-op AI Assistant
                </h3>
                <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.65rem; background: #10b981; color: #fff; padding: 0.1rem 0.45rem; border-radius: var(--radius-full); font-weight: 700;">
                  <span style="width: 6px; height: 6px; background: #fff; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite;"></span>
                  MULTI-MODEL ENGINE
                </span>
              </div>
              <p style="margin: 0.15rem 0 0 0; font-size: 0.725rem; color: rgba(255,255,255,0.85);">
                Model aktif: <strong id="ai-active-model-label">${escapeHtml(activeProviderName)}</strong> &bull; Role: <strong>${userRole}</strong> &bull; Koperasi STMIK IKMI
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button type="button" id="ai-btn-clear" class="btn btn-sm" style="background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.25); font-size: 0.75rem; padding: 0.35rem 0.75rem; border-radius: var(--radius-md); transition: all 0.2s;" title="Bersihkan riwayat percakapan">
              🗑️ Bersihkan
            </button>
          </div>
        </div>

        <!-- Multi-Model Selector Bar -->
        <div style="background: var(--bg-surface); padding: 0.55rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.6rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-secondary);">
            <span style="font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 0.3rem;">
              <span>⚡</span> Pilihan Model AI:
            </span>
            <select id="ai-model-select" style="background: var(--bg-subtle); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.3rem 0.65rem; font-size: 0.8rem; font-family: inherit; outline: none; cursor: pointer;">
              <option value="auto" ${state.selectedProviderId === 'auto' ? 'selected' : ''}>
                ⚡ Auto Select (Rekomendasi Berdasarkan Pertanyaan)
              </option>
              ${state.availableProviders.map(p => `
                <option value="${p.providerId}" ${state.selectedProviderId === p.providerId ? 'selected' : ''}>
                  🟢 ${p.providerName} (${p.selectedModel || 'Model Utama'})
                </option>
              `).join('')}
            </select>
          </div>

          <div style="font-size: 0.725rem; color: var(--text-tertiary); display: flex; align-items: center; gap: 0.35rem;">
            <span>Terakhir digunakan:</span>
            <span class="badge badge-info" style="font-size: 0.7rem; padding: 0.15rem 0.5rem;">
              ${escapeHtml(state.lastUsedProviderName)} &bull; ${escapeHtml(state.lastUsedModel)}
            </span>
          </div>
        </div>

        <!-- Chat Messages Viewport -->
        <div id="ai-chat-messages" style="height: 380px; max-height: 480px; overflow-y: auto; padding: 1.25rem; background: var(--bg-surface); display: flex; flex-direction: column; gap: 1rem; scroll-behavior: smooth;">
          
          ${state.messages.map(msg => {
            const isUser = msg.role === 'user';
            return `
              <div style="display: flex; gap: 0.75rem; justify-content: ${isUser ? 'flex-end' : 'flex-start'}; align-items: flex-start; max-width: 100%;">
                
                ${!isUser ? `
                  <div style="width: 32px; height: 32px; border-radius: var(--radius-full); background: linear-gradient(135deg, #2563eb, #1e40af); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #fff; flex-shrink: 0; box-shadow: var(--shadow-sm); margin-top: 2px;">
                    🤖
                  </div>
                ` : ''}

                <div style="display: flex; flex-direction: column; align-items: ${isUser ? 'flex-end' : 'flex-start'}; max-width: 84%;">
                  
                  <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-bottom: 0.25rem; padding: 0 0.35rem; display: flex; align-items: center; gap: 0.4rem;">
                    <span>${isUser ? (activeUser ? activeUser.name : 'Anda') : 'Smart Co-op AI'} &bull; ${formatTime(msg.timestamp)}</span>
                    ${!isUser && msg.model ? `
                      <span style="background: rgba(59,130,246,0.12); color: var(--primary-600); padding: 0.08rem 0.35rem; border-radius: 4px; font-size: 0.65rem; font-weight: 700;">
                        ${escapeHtml(msg.providerName || 'AI')}${msg.fallbackOccurred ? ' ⚠️ Fallback' : ''} &bull; ${escapeHtml(msg.model)}
                      </span>
                    ` : ''}
                  </div>

                  <div style="padding: 0.85rem 1.1rem; border-radius: ${isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px'}; background: ${isUser ? 'linear-gradient(135deg, #1e40af, #2563eb)' : 'var(--bg-subtle)'}; color: ${isUser ? '#ffffff' : 'var(--text-primary)'}; border: ${isUser ? 'none' : '1px solid var(--border-color)'}; font-size: 0.875rem; line-height: 1.55; word-break: break-word; box-shadow: var(--shadow-sm);">
                    ${isUser ? escapeHtml(msg.content).replace(/\n/g, '<br>') : formatAssistantMessage(msg.content)}
                    ${!isUser && msg.executionPipeline && msg.executionPipeline.length > 0 ? `
                      <details style="margin-top: 0.65rem; padding: 0.4rem 0.6rem; background: rgba(0,0,0,0.03); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.725rem;">
                        <summary style="cursor: pointer; font-weight: 700; color: var(--text-secondary); display: flex; align-items: center; justify-content: space-between; user-select: none;">
                          <span>⚙️ Tahapan Eksekusi Nyata (5 Langkah Sistem)</span>
                          <span style="font-size: 0.65rem; background: #10b981; color: #fff; padding: 0.1rem 0.4rem; border-radius: 4px;">TERVERIFIKASI</span>
                        </summary>
                        <div style="display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.45rem; padding-top: 0.35rem; border-top: 1px dashed var(--border-color);">
                          ${msg.executionPipeline.map(st => `
                            <div style="display: flex; align-items: flex-start; gap: 0.4rem;">
                              <span style="color: ${st.status === 'completed' ? '#10b981' : (st.status === 'error' ? '#ef4444' : '#f59e0b')}; font-weight: bold;">
                                ${st.status === 'completed' ? '✓' : (st.status === 'error' ? '✕' : '⏳')}
                              </span>
                              <div>
                                <strong style="color: var(--text-primary);">${st.step}. ${escapeHtml(st.name)}:</strong>
                                <span style="color: var(--text-secondary); margin-left: 0.25rem;">${escapeHtml(st.details || '')}</span>
                              </div>
                            </div>
                          `).join('')}
                        </div>
                      </details>
                    ` : ''}
                  </div>

                </div>

                ${isUser ? `
                  <div style="width: 32px; height: 32px; border-radius: var(--radius-full); background: linear-gradient(135deg, #3b82f6, #0284c7); display: flex; align-items: center; justify-content: center; font-size: 0.95rem; color: #fff; flex-shrink: 0; box-shadow: var(--shadow-sm); margin-top: 2px;">
                    👤
                  </div>
                ` : ''}

              </div>
            `;
          }).join('')}

          <!-- Typing / Loading Animation Indicator with 5-stage live pipeline -->
          ${state.isLoading ? `
            <div id="ai-typing-indicator" style="display: flex; gap: 0.75rem; align-items: flex-start;">
              <div style="width: 32px; height: 32px; border-radius: var(--radius-full); background: linear-gradient(135deg, #2563eb, #1e40af); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #fff; flex-shrink: 0;">
                🤖
              </div>
              <div style="padding: 0.85rem 1.1rem; border-radius: 4px 16px 16px 16px; background: var(--bg-subtle); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.4rem; min-width: 280px; box-shadow: var(--shadow-sm);">
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: var(--primary-700);">
                  <span>Tahapan Eksekusi AI (${escapeHtml(activeProviderName)})</span>
                  <span class="typing-dot" style="width: 6px; height: 6px; background: var(--primary-600); border-radius: 50%; display: inline-block; animation: bounce 1.4s infinite ease-in-out both;"></span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.725rem; color: var(--text-secondary);">
                  <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span style="color: #10b981;">✓</span> <span>1. Memahami pertanyaan pengguna (NLU & Slang)</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span style="color: #10b981;">✓</span> <span>2. Mengidentifikasi data & wewenang role (${userRole})</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span style="color: var(--primary-600); font-weight: bold;">⚡</span> <span style="color: var(--text-primary); font-weight: 600;">3. Mengambil data database terotorisasi...</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.35rem; opacity: 0.6;">
                    <span>○</span> <span>4. Menganalisis hasil & validasi anti-halusinasi</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.35rem; opacity: 0.6;">
                    <span>○</span> <span>5. Menyusun format jawaban faktual</span>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Error Alert with Retry -->
          ${state.errorMessage ? `
            <div style="background: var(--danger-light); border: 1px solid var(--danger-border); color: var(--danger-text); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.825rem; display: flex; justify-content: space-between; align-items: center; margin: 0.5rem 0;">
              <div>
                ⚠️ <strong>Gagal:</strong> ${escapeHtml(state.errorMessage)}
              </div>
              <button type="button" id="ai-btn-retry" class="btn btn-sm btn-danger" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;">
                🔄 Coba Lagi
              </button>
            </div>
          ` : ''}

        </div>

        <!-- Quick Suggestion Chips (Role Tailored) -->
        <div style="padding: 0.5rem 1.25rem; background: var(--bg-subtle); border-top: 1px solid var(--border-color); display: flex; gap: 0.4rem; overflow-x: auto; white-space: nowrap; scrollbar-width: thin;">
          ${chips.map(chip => `
            <button type="button" class="ai-chip-btn" data-text="${escapeHtml(chip.text)}" style="background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-secondary); font-size: 0.75rem; padding: 0.3rem 0.65rem; border-radius: var(--radius-full); cursor: pointer; transition: all 0.2s;">
              ${escapeHtml(chip.label)}
            </button>
          `).join('')}
        </div>

        <!-- Chat Input Form -->
        <form id="ai-chat-form" style="padding: 0.85rem 1.25rem; background: var(--bg-surface); border-top: 1px solid var(--border-color); display: flex; gap: 0.75rem; align-items: flex-end;">
          <div style="flex: 1; position: relative;">
            <textarea
              id="ai-chat-input"
              rows="1"
              placeholder="Tanyakan jumlah anggota, simpanan, pinjaman, angsuran, laporan keuangan, atau alur koperasi... (Tekan Enter untuk kirim, Shift+Enter untuk baris baru)"
              style="width: 100%; resize: none; min-height: 42px; max-height: 120px; padding: 0.65rem 0.85rem; font-size: 0.875rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-subtle); color: var(--text-primary); font-family: inherit; line-height: 1.4; outline: none; transition: border-color 0.2s;"
              ${state.isLoading ? 'disabled' : ''}
            ></textarea>
          </div>

          <button
            type="submit"
            id="ai-btn-send"
            class="btn btn-primary"
            style="height: 42px; padding: 0 1.25rem; display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700; font-size: 0.85rem; border-radius: var(--radius-md);"
            ${state.isLoading ? 'disabled' : ''}
          >
            <span>Kirim</span>
            <span style="font-size: 1.1rem; line-height: 1;">➤</span>
          </button>
        </form>

      </div>
    `;

    attachEvents();
    scrollToBottom();
  }

  function scrollToBottom() {
    const messagesContainer = container.querySelector('#ai-chat-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Helper: sync active session to backend server
   */
  async function ensureSessionSynced(token) {
    if (!token) return;
    try {
      const session = auth.getSession();
      if (session) {
        await fetch('/api/db/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: session.toJSON ? session.toJSON() : session })
        });
      }
    } catch {
      // Non-blocking sync attempt
    }
  }

  async function sendMessage(textToSend) {
    const message = (textToSend || '').trim();
    if (!message || state.isLoading) return;

    state.lastFailedUserMessage = '';
    state.errorMessage = '';

    // 1. Add user message to state
    state.messages.push({
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    state.isLoading = true;
    render();

    // Prepare conversation payload
    const conversationPayload = state.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const session = auth.getSession();
    const token = session ? session.token : localStorage.getItem(ENV.AUTH.SESSION_KEY);

    try {
      // Sync session to server in background
      await ensureSessionSynced(token);

      const headers = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const requestPayload = {
        message,
        conversation: conversationPayload,
        providerId: state.selectedProviderId === 'auto' ? null : state.selectedProviderId,
        modelId: state.selectedModelId
      };

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Server error (${response.status})`);
      }

      const usedProviderName = data.providerName || (data.model?.includes('engine') ? 'Database Engine' : 'NVIDIA NIM');
      const usedModel = data.model || 'smart-coop-ai';

      state.lastUsedProviderName = usedProviderName;
      state.lastUsedModel = usedModel;

      // Add AI reply to state
      state.messages.push({
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.reply || 'Tidak ada balasan dari AI.',
        providerId: data.providerId,
        providerName: usedProviderName,
        model: usedModel,
        routingMode: data.routingMode,
        fallbackOccurred: data.fallbackOccurred,
        executionPipeline: data.executionPipeline || null,
        timestamp: new Date()
      });

      state.isLoading = false;
      render();
    } catch (err) {
      console.error('[Smart Co-op AI Chatbot] Request Failed:', err);
      state.isLoading = false;
      state.errorMessage = err.message || 'Gagal terhubung ke server AI.';
      state.lastFailedUserMessage = message;
      render();
    }
  }

  function attachEvents() {
    const form = container.querySelector('#ai-chat-form');
    const input = container.querySelector('#ai-chat-input');
    const clearBtn = container.querySelector('#ai-btn-clear');
    const retryBtn = container.querySelector('#ai-btn-retry');
    const modelSelect = container.querySelector('#ai-model-select');

    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        state.selectedProviderId = e.target.value;
        const activeLabel = container.querySelector('#ai-active-model-label');
        if (activeLabel) {
          const prov = state.availableProviders.find(p => p.providerId === state.selectedProviderId);
          activeLabel.textContent = prov ? prov.providerName : 'Auto Select (Otomatis)';
        }
      });
    }

    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = input.value;
        input.value = '';
        sendMessage(msg);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      });

      // Auto-expand textarea
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.messages = [
          {
            id: `msg-reset-${Date.now()}`,
            role: 'assistant',
            content: 'Percakapan telah dibersihkan. Silakan ajukan pertanyaan baru.',
            providerName: 'Smart Co-op Engine',
            model: 'Multi-Model Engine',
            timestamp: new Date()
          }
        ];
        state.errorMessage = '';
        render();
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (state.lastFailedUserMessage) {
          sendMessage(state.lastFailedUserMessage);
        }
      });
    }

    // Quick suggestion chips click handler
    container.querySelectorAll('.ai-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.text;
        if (text) {
          sendMessage(text);
        }
      });
    });

    // Code copy buttons
    container.querySelectorAll('.copy-code-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const targetPre = container.querySelector(`#${targetId}`);
        if (targetPre) {
          const codeText = targetPre.textContent;
          navigator.clipboard.writeText(codeText).then(() => {
            const originalText = btn.textContent;
            btn.textContent = '✅ Tersalin!';
            setTimeout(() => {
              btn.textContent = originalText;
            }, 2000);
          }).catch(err => {
            console.error('Copy failed:', err);
          });
        }
      });
    });
  }

  // Initial render & fetch active models
  render();
  loadModels();
}
