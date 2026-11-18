/**
 * Centralized AI Model Manager
 * Manages all AI providers, API keys, models, test pings, and configuration persistence
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import {
  BaseAiAdapter,
  NvidiaAiAdapter,
  OpenAiAdapter,
  GeminiAiAdapter,
  AnthropicAiAdapter,
  OpenRouterAiAdapter,
  OllamaAiAdapter
} from '../adapters/index.js';
import { AiUsageTracker } from './AiUsageTracker.js';

export class AiModelManager {
  /**
   * @param {object} [options]
   * @param {object} [options.adapter] - Database adapter for persistent storage
   * @param {object} [options.env] - Environment variables
   */
  constructor({ adapter = null, env = {} } = {}) {
    this.db = adapter;
    this.env = env || (typeof process !== 'undefined' ? process.env : {}) || {};
    this.usageTracker = new AiUsageTracker(this.db);
    this.adapters = new Map();
    this.providerConfigs = new Map();
    this._initialized = false;

    this._initializeDefaultProviders();
  }

  /**
   * Safe masking of API Keys so secrets are NEVER exposed in plain text
   * @param {string} key
   * @returns {string}
   */
  static maskApiKey(key = '') {
    if (!key || typeof key !== 'string') return '';
    const trimmed = key.trim();
    if (trimmed.length <= 8) return '********';
    const prefix = trimmed.slice(0, 6);
    const suffix = trimmed.slice(-4);
    return `${prefix}****************${suffix}`;
  }

  /**
   * Registers default providers using environment variables
   */
  _initializeDefaultProviders() {
    const defaultDefinitions = [
      {
        id: 'nvidia',
        name: 'NVIDIA NIM',
        adapterClass: NvidiaAiAdapter,
        apiKey: this.env.NVIDIA_API_KEY || (typeof process !== 'undefined' ? process.env.NVIDIA_API_KEY : '') || '',
        baseUrl: this.env.NVIDIA_BASE_URL || (typeof process !== 'undefined' ? process.env.NVIDIA_BASE_URL : '') || 'https://integrate.api.nvidia.com/v1',
        defaultModel: this.env.NVIDIA_MODEL || (typeof process !== 'undefined' ? process.env.NVIDIA_MODEL : '') || 'meta/llama-3.2-11b-vision-instruct',
        selectedModel: this.env.NVIDIA_MODEL || (typeof process !== 'undefined' ? process.env.NVIDIA_MODEL : '') || 'meta/llama-3.2-11b-vision-instruct',
        isEnabled: true,
        isPrimary: true,
        isBackup: false,
        backupPriority: 1,
        temperature: 0.2,
        maxTokens: 1000,
        allowedRoles: ['ADMIN', 'CHAIRMAN', 'MEMBER'],
        status: 'UNCONFIGURED'
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        adapterClass: GeminiAiAdapter,
        apiKey: this.env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || '',
        baseUrl: this.env.GEMINI_BASE_URL || (typeof process !== 'undefined' ? process.env.GEMINI_BASE_URL : '') || 'https://generativelanguage.googleapis.com/v1beta',
        defaultModel: this.env.GEMINI_MODEL || (typeof process !== 'undefined' ? process.env.GEMINI_MODEL : '') || 'gemini-1.5-flash',
        selectedModel: this.env.GEMINI_MODEL || (typeof process !== 'undefined' ? process.env.GEMINI_MODEL : '') || 'gemini-1.5-flash',
        isEnabled: true,
        isPrimary: false,
        isBackup: true,
        backupPriority: 1,
        temperature: 0.2,
        maxTokens: 1000,
        allowedRoles: ['ADMIN', 'CHAIRMAN', 'MEMBER'],
        status: 'UNCONFIGURED'
      },
      {
        id: 'openai',
        name: 'OpenAI API',
        adapterClass: OpenAiAdapter,
        apiKey: this.env.OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : '') || '',
        baseUrl: this.env.OPENAI_BASE_URL || (typeof process !== 'undefined' ? process.env.OPENAI_BASE_URL : '') || 'https://api.openai.com/v1',
        defaultModel: this.env.OPENAI_MODEL || (typeof process !== 'undefined' ? process.env.OPENAI_MODEL : '') || 'gpt-4o-mini',
        selectedModel: this.env.OPENAI_MODEL || (typeof process !== 'undefined' ? process.env.OPENAI_MODEL : '') || 'gpt-4o-mini',
        isEnabled: true,
        isPrimary: false,
        isBackup: true,
        backupPriority: 2,
        temperature: 0.2,
        maxTokens: 1000,
        allowedRoles: ['ADMIN', 'CHAIRMAN', 'MEMBER'],
        status: 'UNCONFIGURED'
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        adapterClass: AnthropicAiAdapter,
        apiKey: this.env.ANTHROPIC_API_KEY || (typeof process !== 'undefined' ? process.env.ANTHROPIC_API_KEY : '') || '',
        baseUrl: this.env.ANTHROPIC_BASE_URL || (typeof process !== 'undefined' ? process.env.ANTHROPIC_BASE_URL : '') || 'https://api.anthropic.com/v1',
        defaultModel: this.env.ANTHROPIC_MODEL || (typeof process !== 'undefined' ? process.env.ANTHROPIC_MODEL : '') || 'claude-3-5-haiku-20241022',
        selectedModel: this.env.ANTHROPIC_MODEL || (typeof process !== 'undefined' ? process.env.ANTHROPIC_MODEL : '') || 'claude-3-5-haiku-20241022',
        isEnabled: true,
        isPrimary: false,
        isBackup: true,
        backupPriority: 3,
        temperature: 0.2,
        maxTokens: 1000,
        allowedRoles: ['ADMIN', 'CHAIRMAN', 'MEMBER'],
        status: 'UNCONFIGURED'
      },
      {
        id: 'openrouter',
        name: 'OpenRouter',
        adapterClass: OpenRouterAiAdapter,
        apiKey: this.env.OPENROUTER_API_KEY || (typeof process !== 'undefined' ? process.env.OPENROUTER_API_KEY : '') || '',
        baseUrl: this.env.OPENROUTER_BASE_URL || (typeof process !== 'undefined' ? process.env.OPENROUTER_BASE_URL : '') || 'https://openrouter.ai/api/v1',
        defaultModel: this.env.OPENROUTER_MODEL || (typeof process !== 'undefined' ? process.env.OPENROUTER_MODEL : '') || 'google/gemini-2.0-flash-001',
        selectedModel: this.env.OPENROUTER_MODEL || (typeof process !== 'undefined' ? process.env.OPENROUTER_MODEL : '') || 'google/gemini-2.0-flash-001',
        isEnabled: true,
        isPrimary: false,
        isBackup: true,
        backupPriority: 4,
        temperature: 0.2,
        maxTokens: 1000,
        allowedRoles: ['ADMIN', 'CHAIRMAN', 'MEMBER'],
        status: 'UNCONFIGURED'
      },
      {
        id: 'ollama',
        name: 'Ollama (Local)',
        adapterClass: OllamaAiAdapter,
        apiKey: 'local-no-key',
        baseUrl: this.env.OLLAMA_BASE_URL || (typeof process !== 'undefined' ? process.env.OLLAMA_BASE_URL : '') || 'http://localhost:11434',
        defaultModel: this.env.OLLAMA_MODEL || (typeof process !== 'undefined' ? process.env.OLLAMA_MODEL : '') || 'llama3.2:latest',
        selectedModel: this.env.OLLAMA_MODEL || (typeof process !== 'undefined' ? process.env.OLLAMA_MODEL : '') || 'llama3.2:latest',
        isEnabled: false, // Default off unless local daemon is verified
        isPrimary: false,
        isBackup: false,
        backupPriority: 5,
        temperature: 0.2,
        maxTokens: 1000,
        allowedRoles: ['ADMIN', 'CHAIRMAN', 'MEMBER'],
        status: 'UNCONFIGURED'
      }
    ];

    for (const def of defaultDefinitions) {
      const adapterInstance = new def.adapterClass({
        apiKey: def.apiKey,
        baseUrl: def.baseUrl,
        defaultModel: def.defaultModel,
        temperature: def.temperature,
        maxTokens: def.maxTokens
      });

      if (adapterInstance.isConfigured()) {
        def.status = 'READY';
      }

      this.adapters.set(def.id, adapterInstance);
      this.providerConfigs.set(def.id, def);
    }
  }

  /**
   * Load overrides from persistent storage (database table ai_provider_configs)
   */
  async init() {
    if (this._initialized) return;

    if (this.db && typeof this.db.getAll === 'function') {
      try {
        const storedConfigs = await this.db.getAll('ai_provider_configs');
        if (Array.isArray(storedConfigs)) {
          for (const item of storedConfigs) {
            if (this.providerConfigs.has(item.id)) {
              const current = this.providerConfigs.get(item.id);
              const merged = { ...current, ...item };
              // Preserve API key if item.apiKey is empty or masked
              if (!item.apiKey || item.apiKey.includes('***')) {
                merged.apiKey = current.apiKey;
              }
              this.providerConfigs.set(item.id, merged);

              // Update active adapter
              const adapter = this.adapters.get(item.id);
              if (adapter) {
                adapter.apiKey = merged.apiKey;
                adapter.baseUrl = merged.baseUrl;
                adapter.defaultModel = merged.selectedModel || merged.defaultModel;
                adapter.temperature = merged.temperature;
                adapter.maxTokens = merged.maxTokens;
              }
            }
          }
        }
      } catch (err) {
        console.warn('[AiModelManager] DB load warning:', err.message);
      }
    }

    this._initialized = true;
  }

  /**
   * Retrieves all provider configurations
   * @param {object} [options]
   * @param {boolean} [options.maskKeys=true]
   * @param {string|null} [options.forRole=null]
   */
  async getAllProviders({ maskKeys = true, forRole = null } = {}) {
    await this.init();

    const result = [];
    for (const [id, config] of this.providerConfigs.entries()) {
      const adapter = this.adapters.get(id);
      const isConfigured = adapter ? adapter.isConfigured() : false;

      // Filter by role if specified
      if (forRole) {
        if (!config.isEnabled) continue;
        if (!isConfigured) continue;
        if (Array.isArray(config.allowedRoles) && !config.allowedRoles.includes(forRole)) {
          continue;
        }
      }

      result.push({
        id: config.id,
        name: config.name,
        baseUrl: config.baseUrl,
        selectedModel: config.selectedModel || config.defaultModel,
        defaultModel: config.defaultModel,
        isEnabled: Boolean(config.isEnabled),
        isConfigured,
        isPrimary: Boolean(config.isPrimary),
        isBackup: Boolean(config.isBackup),
        backupPriority: config.backupPriority || 99,
        temperature: config.temperature !== undefined ? config.temperature : 0.2,
        maxTokens: config.maxTokens || 1000,
        status: config.status || (isConfigured ? 'READY' : 'UNCONFIGURED'),
        lastTestedAt: config.lastTestedAt || null,
        lastTestMessage: config.lastTestMessage || null,
        allowedRoles: config.allowedRoles || ['ADMIN', 'CHAIRMAN', 'MEMBER'],
        apiKey: maskKeys ? AiModelManager.maskApiKey(config.apiKey) : config.apiKey
      });
    }

    return result;
  }

  /**
   * Get single provider adapter by ID
   * @param {string} id
   * @returns {BaseAiAdapter|null}
   */
  getAdapter(id) {
    return this.adapters.get(id) || null;
  }

  /**
   * Get single provider configuration
   * @param {string} id
   * @param {boolean} [maskKeys=true]
   */
  async getProviderConfig(id, maskKeys = true) {
    await this.init();
    const config = this.providerConfigs.get(id);
    if (!config) return null;

    const copy = { ...config };
    if (maskKeys) {
      copy.apiKey = AiModelManager.maskApiKey(copy.apiKey);
    }
    return copy;
  }

  /**
   * Helper: Persist all provider configurations to database
   */
  async _persistConfigs() {
    if (this.db && typeof this.db.saveAll === 'function') {
      try {
        const recordsToSave = [];
        for (const [pId, conf] of this.providerConfigs.entries()) {
          recordsToSave.push({
            id: pId,
            name: conf.name,
            apiKey: conf.apiKey,
            baseUrl: conf.baseUrl,
            defaultModel: conf.defaultModel,
            selectedModel: conf.selectedModel,
            isEnabled: Boolean(conf.isEnabled),
            isPrimary: Boolean(conf.isPrimary),
            isBackup: Boolean(conf.isBackup),
            backupPriority: Number(conf.backupPriority) || 1,
            temperature: conf.temperature !== undefined ? conf.temperature : 0.2,
            maxTokens: conf.maxTokens || 1000,
            status: conf.status,
            lastTestedAt: conf.lastTestedAt || null,
            lastTestMessage: conf.lastTestMessage || null,
            allowedRoles: conf.allowedRoles || ['ADMIN', 'CHAIRMAN', 'MEMBER']
          });
        }
        await this.db.saveAll('ai_provider_configs', recordsToSave);
      } catch (err) {
        console.warn('[AiModelManager] Failed persisting provider config:', err.message);
      }
    }
  }

  /**
   * Update provider configuration & re-sync adapter
   */
  async updateProviderConfig(id, updates = {}) {
    await this.init();
    if (!this.providerConfigs.has(id)) {
      throw new Error(`Provider dengan ID "${id}" tidak ditemukan.`);
    }

    const current = this.providerConfigs.get(id);
    const adapter = this.adapters.get(id);

    // If new API key provided and not masked, update it
    if (updates.apiKey !== undefined && typeof updates.apiKey === 'string') {
      const cleanKey = updates.apiKey.trim();
      if (!cleanKey.includes('***') && cleanKey.length > 0) {
        current.apiKey = cleanKey;
        if (adapter) adapter.apiKey = cleanKey;
      }
    }

    if (updates.baseUrl !== undefined) {
      const cleanBase = String(updates.baseUrl).trim().replace(/\/+$/, '');
      if (cleanBase.length > 0) {
        current.baseUrl = cleanBase;
        if (adapter) adapter.baseUrl = cleanBase;
      }
    }

    // Validation: Selected Model ID
    if (updates.selectedModel !== undefined) {
      const cleanModel = String(updates.selectedModel).trim();
      if (cleanModel.length === 0) {
        throw new Error(`Model ID untuk provider "${id}" wajib diisi.`);
      }
      current.selectedModel = cleanModel;
      if (adapter) adapter.defaultModel = cleanModel;
    }

    // Validation: Temperature (0.0 to 1.0)
    if (updates.temperature !== undefined) {
      const temp = parseFloat(updates.temperature);
      if (isNaN(temp) || temp < 0 || temp > 1.0) {
        throw new Error(`Parameter Temperature untuk ${current.name} harus berupa angka antara 0.0 dan 1.0 (diterima: ${updates.temperature}).`);
      }
      current.temperature = Math.round(temp * 100) / 100;
      if (adapter) adapter.temperature = current.temperature;
    }

    // Validation: Max Tokens (50 to 16384)
    if (updates.maxTokens !== undefined) {
      const tokens = parseInt(updates.maxTokens, 10);
      if (isNaN(tokens) || tokens < 50 || tokens > 16384) {
        throw new Error(`Parameter Max Tokens untuk ${current.name} harus berada di antara 50 dan 16.384 token (diterima: ${updates.maxTokens}).`);
      }
      current.maxTokens = tokens;
      if (adapter) adapter.maxTokens = current.maxTokens;
    }

    if (updates.isEnabled !== undefined) current.isEnabled = Boolean(updates.isEnabled);

    // Enforce SINGLE Primary Model guarantee
    if (updates.isPrimary !== undefined) {
      const isPri = Boolean(updates.isPrimary);
      current.isPrimary = isPri;
      if (isPri) {
        current.isBackup = false; // Primary model cannot be backup
        for (const [otherId, otherConf] of this.providerConfigs.entries()) {
          if (otherId !== id) {
            otherConf.isPrimary = false;
          }
        }
      }
    }

    if (updates.isBackup !== undefined) {
      const isBak = Boolean(updates.isBackup);
      current.isBackup = isBak;
      if (isBak) {
        current.isPrimary = false; // Backup model cannot be primary
      }
    }

    if (updates.backupPriority !== undefined) {
      const prio = parseInt(updates.backupPriority, 10);
      current.backupPriority = !isNaN(prio) && prio > 0 ? prio : 1;
    }

    if (Array.isArray(updates.allowedRoles)) {
      current.allowedRoles = updates.allowedRoles.filter(r => ['ADMIN', 'CHAIRMAN', 'MEMBER'].includes(r));
    }

    // Persist changes permanently
    await this._persistConfigs();

    return this.getProviderConfig(id, true);
  }

  /**
   * Tests API connection for a provider
   */
  async testProviderConnection(id) {
    await this.init();
    const adapter = this.adapters.get(id);
    const config = this.providerConfigs.get(id);

    if (!adapter || !config) {
      return {
        success: false,
        latencyMs: 0,
        message: `Provider "${id}" tidak ditemukan.`
      };
    }

    const testResult = await adapter.testConnection();

    // Sanitize any API key that might be leaked in the error message
    const safeMessage = BaseAiAdapter.sanitizeErrorMessage(testResult.message);

    config.lastTestedAt = new Date().toISOString();
    config.lastTestMessage = safeMessage;

    // Status ONLY changes to CONNECTED if testConnection succeeded!
    config.status = testResult.success ? 'CONNECTED' : (adapter.isConfigured() ? 'FAILED' : 'UNCONFIGURED');

    await this._persistConfigs();

    return {
      success: testResult.success,
      latencyMs: testResult.latencyMs,
      message: safeMessage,
      model: testResult.model || config.selectedModel || config.defaultModel
    };
  }

  /**
   * Get available models for a provider
   */
  async getAvailableModelsForProvider(id) {
    await this.init();
    const adapter = this.adapters.get(id);
    if (!adapter) return [];
    return adapter.getAvailableModels();
  }

  /**
   * Resets / deletes a provider configuration
   */
  async deleteProviderConfig(id) {
    await this.init();
    if (!this.providerConfigs.has(id)) return false;

    const config = this.providerConfigs.get(id);
    config.apiKey = '';
    config.isEnabled = false;
    config.isPrimary = false;
    config.isBackup = false;
    config.status = 'UNCONFIGURED';

    const adapter = this.adapters.get(id);
    if (adapter) {
      adapter.apiKey = '';
    }

    await this._persistConfigs();
    return true;
  }

  /**
   * Get the primary configured provider
   */
  async getPrimaryProvider() {
    await this.init();

    // 1. Look for provider marked isPrimary and isEnabled & isConfigured
    for (const [id, config] of this.providerConfigs.entries()) {
      if (config.isPrimary && config.isEnabled) {
        const adapter = this.adapters.get(id);
        if (adapter && adapter.isConfigured()) {
          return { provider: adapter, config };
        }
      }
    }

    // 2. Fallback: first enabled & configured provider
    for (const [id, config] of this.providerConfigs.entries()) {
      if (config.isEnabled) {
        const adapter = this.adapters.get(id);
        if (adapter && adapter.isConfigured()) {
          return { provider: adapter, config };
        }
      }
    }

    return null;
  }

  /**
   * Get ordered fallback providers
   */
  async getFallbackChain() {
    await this.init();

    const chain = [];
    for (const [id, config] of this.providerConfigs.entries()) {
      if (config.isEnabled && config.isBackup) {
        const adapter = this.adapters.get(id);
        if (adapter && adapter.isConfigured()) {
          chain.push({
            provider: adapter,
            config,
            priority: config.backupPriority || 99
          });
        }
      }
    }

    chain.sort((a, b) => a.priority - b.priority);
    return chain;
  }
}

