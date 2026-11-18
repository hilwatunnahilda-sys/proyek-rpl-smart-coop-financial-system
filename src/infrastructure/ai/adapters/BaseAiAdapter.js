/**
 * Base AI Adapter Interface
 * Standardized contract for all AI providers in Smart Co-op Financial System
 * STMIK IKMI Cirebon
 */

export class BaseAiAdapter {
  /**
   * @param {object} config
   * @param {string} config.id - Provider ID ('nvidia', 'openai', 'gemini', 'anthropic', 'openrouter', 'ollama')
   * @param {string} config.name - Display name
   * @param {string} config.apiKey - API Key (server-side only)
   * @param {string} config.baseUrl - API Base URL
   * @param {string} config.defaultModel - Default model ID
   * @param {number} [config.timeoutMs=20000] - Request timeout in milliseconds
   * @param {number} [config.temperature=0.2]
   * @param {number} [config.maxTokens=1000]
   */
  constructor(config = {}) {
    this.id = config.id || 'base';
    this.name = config.name || 'Base Provider';
    this.apiKey = config.apiKey || '';
    this.baseUrl = (config.baseUrl || '').replace(/\/+$/, '');
    this.defaultModel = config.defaultModel || '';
    this.timeoutMs = config.timeoutMs || 20000;
    this.temperature = config.temperature !== undefined ? config.temperature : 0.2;
    this.maxTokens = config.maxTokens || 1000;
  }

  /**
   * Check whether the provider has the minimum configuration required to make requests
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Formats a standardized system prompt embedding cooperative guardrails and user context
   * @param {object|null} userContext
   * @param {object|null} dataContext
   * @param {string} [queryDescription='']
   * @returns {string}
   */
  formatSystemPrompt(userContext = null, dataContext = null, queryDescription = '') {
    let contextStr = '';
    if (userContext) {
      contextStr = `\nInformasi Pengguna Aktif:\n- Nama: ${userContext.name || 'Pengguna'}\n- Role: ${userContext.role || 'MEMBER'}\n- Tipe Anggota: ${userContext.memberType || '-'}\n- No. Anggota: ${userContext.memberNumber || '-'}`;
    }

    let dataSection = '';
    if (dataContext) {
      dataSection = `\n\n[DATA AKTUAL KOPERASI TEROTORISASI - ${queryDescription || 'SISTEM'}]\n${JSON.stringify(dataContext, null, 2)}\n[AKHIR DATA]`;
    }

    return `Anda adalah "Smart Co-op AI Assistant", asisten kecerdasan buatan resmi khusus untuk aplikasi "Smart Co-op Financial System" di STMIK IKMI Cirebon.

Tugas utama Anda adalah membantu pengguna memahami aplikasi, menggunakan fitur koperasi, dan memperoleh informasi yang relevan berdasarkan data aktual yang boleh mereka akses.

PRINSIP UTAMA:
1. Pahami maksud pertanyaan sebelum menjawab.
2. Jawab pertanyaan yang benar-benar diajukan secara tepat sasaran.
3. Gunakan bahasa Indonesia yang natural, profesional, dan mudah dipahami.
4. JANGAN PERNAH menampilkan JSON, object internal, query SQL, kurung kurawal metadata, stack trace, atau response API internal kepada pengguna.
5. Jangan memberikan statistik database jika pengguna tidak memintanya.
6. Untuk pertanyaan tentang fungsi atau penjelasan sistem (contoh: "Jelaskan aplikasi ini dan sistem ini?", "Apa fungsi Smart Co-op?"), jelaskan fitur, alur kerja, dan perannya secara komprehensif dalam kalimat naratif yang mudah dipahami manusia, BUKAN data mentah database atau JSON.
7. Untuk pertanyaan tentang data koperasi, gunakan hasil query backend yang sah dan aktual yang disertakan dalam konteks.
8. Jangan pernah mengarang angka, anggota, transaksi, fitur, atau status.
9. Jika data tidak tersedia atau modul fisik belum aktif (seperti stok barang/inventaris), sampaikan secara jujur tanpa berhalusinasi.
10. Jangan mengungkap informasi rahasia yang tidak boleh diakses oleh role pengguna (terapkan Least Privilege).
11. Jangan mengungkap token, password, cryptographic salt, API key, atau rahasia konfigurasi sistem.
12. AI berjalan dalam mode Read-Only: jangan mengeksekusi perubahan/mutasi transaksi keuangan secara langsung.${contextStr}${dataSection}`;
  }

  /**
   * Sanitizes error messages to prevent any API key or credential leakage
   * @param {string|Error} err
   * @returns {string}
   */
  static sanitizeErrorMessage(err = '') {
    if (!err) return 'Terjadi kesalahan sistem.';
    let msg = typeof err === 'string' ? err : (err.message || String(err));

    // Redact NVIDIA NIM API keys
    msg = msg.replace(/nvapi-[A-Za-z0-9_-]{10,}/gi, '[REDACTED_NVIDIA_KEY]');

    // Redact OpenAI / OpenRouter API keys
    msg = msg.replace(/sk-[A-Za-z0-9_-]{10,}/gi, '[REDACTED_API_KEY]');

    // Redact Google API keys
    msg = msg.replace(/AIza[0-9A-Za-z-_]{20,}/gi, '[REDACTED_GEMINI_KEY]');
    msg = msg.replace(/([?&]key=)[^&]+/gi, '$1[REDACTED_KEY]');

    // Redact Authorization headers or raw tokens
    msg = msg.replace(/Bearer\s+[A-Za-z0-9_.-]{15,}/gi, 'Bearer [REDACTED_TOKEN]');

    return msg;
  }

  /**
   * Cleans raw JSON leaks from LLM response
   * @param {string} reply
   * @returns {string}
   */
  sanitizeOutput(reply = '') {
    if (!reply || typeof reply !== 'string') return '';
    let trimmed = reply.trim();

    // Check if reply is wrapped in a raw JSON object
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('Informasi data koperasi: {') && trimmed.endsWith('}'))) {
      try {
        const jsonStr = trimmed.startsWith('Informasi data koperasi:')
          ? trimmed.replace('Informasi data koperasi:', '').trim()
          : trimmed;
        const parsed = JSON.parse(jsonStr);
        if (parsed.reply) return parsed.reply;
        if (parsed.description) return parsed.description;
        if (parsed.message) return parsed.message;
        if (parsed.definisi) {
          let text = `${parsed.appName || 'Smart Co-op Financial System'}: ${parsed.definisi}`;
          if (parsed.summary && parsed.summary.totalTerdaftar !== undefined) {
            text += `\n\nTotal anggota terdaftar di koperasi adalah **${parsed.summary.totalTerdaftar}** orang (Aktif: ${parsed.summary.totalAktif} orang).`;
          }
          return text;
        }
        if (parsed.summary && parsed.summary.totalTerdaftar !== undefined) {
          return `Total anggota terdaftar di koperasi saat ini adalah **${parsed.summary.totalTerdaftar}** orang (Aktif: ${parsed.summary.totalAktif} orang).`;
        }
      } catch {
        // Leave as is if parse fails
      }
    }

    return trimmed;
  }

  /**
   * Primary Chat Completion Contract
   * Must be implemented by subclasses
   * @param {object} params
   * @param {string} params.message
   * @param {Array<{role: string, content: string}>} [params.conversation=[]]
   * @param {object|null} [params.userContext=null]
   * @param {object|null} [params.dataContext=null]
   * @param {string} [params.queryDescription='']
   * @param {string} [params.model]
   * @param {object} [params.generationConfig]
   * @returns {Promise<{reply: string, model: string, usage: object|null, latencyMs: number, provider: string}>}
   */
  async chat() {
    throw new Error(`chat() method must be implemented by ${this.constructor.name}`);
  }

  /**
   * Test Connection Contract
   * Verifies API credentials and connectivity
   * @returns {Promise<{success: boolean, latencyMs: number, message: string, model?: string}>}
   */
  async testConnection() {
    throw new Error(`testConnection() method must be implemented by ${this.constructor.name}`);
  }

  /**
   * Returns list of supported models with metadata
   * @returns {Promise<Array<{id: string, name: string, description: string, contextWindow: number, costPer1kInput: number, costPer1kOutput: number, isDefault?: boolean}>>}
   */
  async getAvailableModels() {
    return [];
  }

  /**
   * Calculates estimated cost in USD and IDR (exchange rate ~16,000 IDR/USD)
   * @param {number} inputTokens
   * @param {number} outputTokens
   * @param {string} [model]
   * @returns {{costUsd: number, costIdr: number, inputTokens: number, outputTokens: number}}
   */
  calculateCost(inputTokens = 0, outputTokens = 0, model = null) {
    const models = this._getModelPricingCatalog();
    const pricing = models[model || this.defaultModel] || { inputPer1k: 0.001, outputPer1k: 0.002 };

    const costUsd = (inputTokens / 1000) * pricing.inputPer1k + (outputTokens / 1000) * pricing.outputPer1k;
    const costIdr = Math.round(costUsd * 16000 * 100) / 100;

    return {
      costUsd: Math.round(costUsd * 100000) / 100000,
      costIdr,
      inputTokens,
      outputTokens
    };
  }

  /**
   * Default pricing map per 1,000 tokens
   */
  _getModelPricingCatalog() {
    return {};
  }
}

