/**
 * OpenRouter AI Provider Adapter
 * OpenRouter Multi-Model Unified Gateway API Integration
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { BaseAiAdapter } from './BaseAiAdapter.js';

export class OpenRouterAiAdapter extends BaseAiAdapter {
  constructor(config = {}) {
    super({
      id: 'openrouter',
      name: 'OpenRouter',
      baseUrl: config.baseUrl || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey || process.env.OPENROUTER_API_KEY || '',
      defaultModel: config.defaultModel || process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
      timeoutMs: config.timeoutMs || 20000,
      temperature: config.temperature !== undefined ? config.temperature : 0.2,
      maxTokens: config.maxTokens || 1000
    });
  }

  _getModelPricingCatalog() {
    return {
      'google/gemini-2.0-flash-001': { inputPer1k: 0.0001, outputPer1k: 0.0004 },
      'meta-llama/llama-3.3-70b-instruct': { inputPer1k: 0.0004, outputPer1k: 0.0004 },
      'deepseek/deepseek-chat': { inputPer1k: 0.00014, outputPer1k: 0.00028 },
      'anthropic/claude-3.5-haiku': { inputPer1k: 0.0008, outputPer1k: 0.004 }
    };
  }

  async getAvailableModels() {
    return [
      {
        id: 'google/gemini-2.0-flash-001',
        name: 'Gemini 2.0 Flash (OpenRouter)',
        description: 'Model cepat serbaguna dengan biaya sangat ekonomis via gerbang OpenRouter.',
        contextWindow: 1048576,
        costPer1kInput: 0.0001,
        costPer1kOutput: 0.0004,
        isDefault: true
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B Instruct',
        description: 'Model open-weight terkemuka dengan kecerdasan setara proprietary frontier.',
        contextWindow: 128000,
        costPer1kInput: 0.0004,
        costPer1kOutput: 0.0004,
        isDefault: false
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek V3 (Chat)',
        description: 'Arsitektur MoE inovatif untuk penalaran matematika, kode, dan analisis keuangan.',
        contextWindow: 64000,
        costPer1kInput: 0.00014,
        costPer1kOutput: 0.00028,
        isDefault: false
      },
      {
        id: 'anthropic/claude-3.5-haiku',
        name: 'Claude 3.5 Haiku (OpenRouter)',
        description: 'Claude 3.5 Haiku yang di-hosting pada OpenRouter untuk throughput tinggi.',
        contextWindow: 200000,
        costPer1kInput: 0.0008,
        costPer1kOutput: 0.004,
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
      throw new Error('OpenRouter API Key belum dikonfigurasi pada server backend.');
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
    const endpoint = `${this.baseUrl}/chat/completions`;

    const payload = {
      model: targetModel,
      messages,
      temperature: generationConfig.temperature !== undefined ? generationConfig.temperature : this.temperature,
      top_p: generationConfig.topP || 0.9,
      max_tokens: generationConfig.maxTokens || this.maxTokens
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Smart Co-op Financial System STMIK IKMI',
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
          errDetails = errJson.error?.message || errJson.message || JSON.stringify(errJson);
        } catch {
          errDetails = await response.text();
        }
        throw new Error(`OpenRouter API Error (${response.status}): ${errDetails}`);
      }

      const data = await response.json();
      const rawReply = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';

      const sanitizedReply = this.sanitizeOutput(rawReply);
      const latencyMs = Date.now() - startTime;

      return {
        reply: sanitizedReply,
        model: data.model || targetModel,
        provider: this.id,
        usage: data.usage || {
          prompt_tokens: Math.round(message.length / 4),
          completion_tokens: Math.round(sanitizedReply.length / 4),
          total_tokens: Math.round((message.length + sanitizedReply.length) / 4)
        },
        latencyMs
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`OpenRouter request timeout setelah ${this.timeoutMs}ms.`);
      }
      throw err;
    }
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        latencyMs: 0,
        message: 'OpenRouter API Key belum diisi.'
      };
    }

    const startTime = Date.now();
    const endpoint = `${this.baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Smart Co-op Financial System STMIK IKMI',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5,
          temperature: 0.1
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.error?.message || errorMsg;
        } catch {
          // ignore
        }
        return {
          success: false,
          latencyMs,
          message: `Koneksi gagal: ${errorMsg}`
        };
      }

      return {
        success: true,
        latencyMs,
        message: 'Koneksi OpenRouter API berhasil terhubung.',
        model: this.defaultModel
      };
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: `Koneksi gagal: ${err.message}`
      };
    }
  }
}

