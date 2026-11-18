/**
 * Ollama Local AI Provider Adapter
 * Local Self-Hosted LLM Integration
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { BaseAiAdapter } from './BaseAiAdapter.js';

export class OllamaAiAdapter extends BaseAiAdapter {
  constructor(config = {}) {
    super({
      id: 'ollama',
      name: 'Ollama (Local)',
      baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      apiKey: config.apiKey || 'local-no-key-required',
      defaultModel: config.defaultModel || process.env.OLLAMA_MODEL || 'llama3.2:latest',
      timeoutMs: config.timeoutMs || 25000,
      temperature: config.temperature !== undefined ? config.temperature : 0.2,
      maxTokens: config.maxTokens || 1000
    });
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.baseUrl.trim().length > 0);
  }

  _getModelPricingCatalog() {
    // Local models incur zero API cost!
    return {
      'llama3.2:latest': { inputPer1k: 0, outputPer1k: 0 },
      'llama3:latest': { inputPer1k: 0, outputPer1k: 0 },
      'mistral:latest': { inputPer1k: 0, outputPer1k: 0 },
      'deepseek-r1:latest': { inputPer1k: 0, outputPer1k: 0 }
    };
  }

  async getAvailableModels() {
    // Attempt dynamic discovery from local Ollama daemon
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models) && data.models.length > 0) {
          return data.models.map((m, idx) => ({
            id: m.name,
            name: m.name,
            description: `Model lokal Ollama (${m.details?.family || 'LLM'}, parameter size: ${m.details?.parameter_size || 'N/A'})`,
            contextWindow: 8192,
            costPer1kInput: 0,
            costPer1kOutput: 0,
            isDefault: idx === 0
          }));
        }
      }
    } catch {
      // Fallback to static catalog if Ollama service is offline
    }

    return [
      {
        id: 'llama3.2:latest',
        name: 'Llama 3.2 (Local Ollama)',
        description: 'Model lokal ringan, cepat, dan privasi 100% terjaga di server lokal IKMI tanpa koneksi internet.',
        contextWindow: 8192,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        isDefault: true
      },
      {
        id: 'llama3:latest',
        name: 'Llama 3 8B (Local Ollama)',
        description: 'Model umum Meta Llama 3 untuk penalaran lokal di kampus.',
        contextWindow: 8192,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        isDefault: false
      },
      {
        id: 'mistral:latest',
        name: 'Mistral 7B (Local Ollama)',
        description: 'Model bahasa efisien buatan Mistral AI untuk pemrosesan teks lokal.',
        contextWindow: 8192,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        isDefault: false
      },
      {
        id: 'deepseek-r1:latest',
        name: 'DeepSeek R1 (Local Ollama)',
        description: 'Model reasoning lokal berbasis CoT (Chain-of-Thought) untuk analisis logika mendalam.',
        contextWindow: 8192,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        isDefault: false
      }
    ];
  }

  async chat({
    message,
    conversation = [],
    userContext = null,
    dataContext = null,
    queryDescription = '',
    model = null,
    generationConfig = {}
  }) {
    if (!this.isConfigured()) {
      throw new Error('Ollama Base URL belum dikonfigurasi.');
    }

    const startTime = Date.now();
    const systemPrompt = this.formatSystemPrompt(userContext, dataContext, queryDescription);

    const messages = [{ role: 'system', content: systemPrompt }];

    if (Array.isArray(conversation) && conversation.length > 0) {
      const recent = conversation.slice(-10);
      recent.forEach(item => {
        if (item && item.role && item.content) {
          messages.push({
            role: item.role === 'user' ? 'user' : 'assistant',
            content: String(item.content)
          });
        }
      });
    }

    messages.push({
      role: 'user',
      content: message
    });

    const targetModel = model || this.defaultModel;
    const endpoint = `${this.baseUrl}/api/chat`;

    const payload = {
      model: targetModel,
      messages,
      stream: false,
      options: {
        temperature: generationConfig.temperature !== undefined ? generationConfig.temperature : this.temperature,
        top_p: generationConfig.topP || 0.9,
        num_predict: generationConfig.maxTokens || this.maxTokens
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errDetails = '';
        try {
          const errJson = await response.json();
          errDetails = errJson.error || JSON.stringify(errJson);
        } catch {
          errDetails = await response.text();
        }
        throw new Error(`Ollama Local API Error (${response.status}): ${errDetails}`);
      }

      const data = await response.json();
      const rawReply = data.message ? data.message.content : '';
      const sanitizedReply = this.sanitizeOutput(rawReply);
      const latencyMs = Date.now() - startTime;

      const usage = {
        prompt_tokens: data.prompt_eval_count || Math.round(message.length / 4),
        completion_tokens: data.eval_count || Math.round(sanitizedReply.length / 4),
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      };

      return {
        reply: sanitizedReply,
        model: data.model || targetModel,
        provider: this.id,
        usage,
        latencyMs
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Ollama local request timeout setelah ${this.timeoutMs}ms.`);
      }
      throw err;
    }
  }

  async testConnection() {
    const startTime = Date.now();
    const endpoint = `${this.baseUrl}/api/tags`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          latencyMs,
          message: `Layanan Ollama lokal merespons HTTP ${response.status}.`
        };
      }

      const data = await response.json();
      const availableModels = Array.isArray(data.models) ? data.models : [];
      const targetModel = this.defaultModel || 'llama3.2:latest';
      const targetBase = targetModel.split(':')[0].toLowerCase();

      // Check whether target model actually exists in downloaded local models
      const modelExists = availableModels.some(m => {
        const mName = String(m.name || '').toLowerCase();
        return mName === targetModel.toLowerCase() || mName.split(':')[0] === targetBase;
      });

      if (!modelExists) {
        const availableNames = availableModels.map(m => m.name).slice(0, 3).join(', ');
        return {
          success: false,
          latencyMs,
          message: `Layanan Ollama aktif (${availableModels.length} model), tetapi model "${targetModel}" belum diunduh. Silakan jalankan "ollama pull ${targetModel}" di server. (Tersedia: ${availableNames || 'belum ada'})`
        };
      }

      return {
        success: true,
        latencyMs,
        message: `Koneksi Ollama lokal aktif dan model "${targetModel}" siap digunakan.`,
        model: targetModel
      };
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: `Ollama lokal tidak dapat dijangkau di ${this.baseUrl}: ${err.message}`
      };
    }
  }
}

