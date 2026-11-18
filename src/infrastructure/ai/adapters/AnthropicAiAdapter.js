/**
 * Anthropic Claude API Provider Adapter
 * Official Anthropic Messages API Integration
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { BaseAiAdapter } from './BaseAiAdapter.js';

export class AnthropicAiAdapter extends BaseAiAdapter {
  constructor(config = {}) {
    super({
      id: 'anthropic',
      name: 'Anthropic Claude',
      baseUrl: config.baseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      defaultModel: config.defaultModel || process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
      timeoutMs: config.timeoutMs || 20000,
      temperature: config.temperature !== undefined ? config.temperature : 0.2,
      maxTokens: config.maxTokens || 1000
    });
  }

  _getModelPricingCatalog() {
    return {
      'claude-3-5-haiku-20241022': { inputPer1k: 0.0008, outputPer1k: 0.004 },
      'claude-3-5-sonnet-20241022': { inputPer1k: 0.003, outputPer1k: 0.015 },
      'claude-3-opus-20240229': { inputPer1k: 0.015, outputPer1k: 0.075 }
    };
  }

  async getAvailableModels() {
    return [
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        description: 'Model ultra cepat dan cerdas dengan kemampuan percakapan alami bahasa Indonesia yang mengalir.',
        contextWindow: 200000,
        costPer1kInput: 0.0008,
        costPer1kOutput: 0.004,
        isDefault: true
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'Standar tertinggi industri untuk penalaran logis, instruksi kompleks, dan analisis audit keuangan.',
        contextWindow: 200000,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
        isDefault: false
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Model pemikir mendalam untuk sintesis kebijakan regulasi koperasi dan analisis komprehensif.',
        contextWindow: 200000,
        costPer1kInput: 0.015,
        costPer1kOutput: 0.075,
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
      throw new Error('Anthropic API Key belum dikonfigurasi pada server backend.');
    }

    const startTime = Date.now();
    const systemPrompt = this.formatSystemPrompt(userContext, dataContext, queryDescription);

    const messages = [];

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
    const endpoint = `${this.baseUrl}/messages`;

    const payload = {
      model: targetModel,
      system: systemPrompt,
      messages,
      max_tokens: generationConfig.maxTokens || this.maxTokens,
      temperature: generationConfig.temperature !== undefined ? generationConfig.temperature : this.temperature
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
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
        throw new Error(`Anthropic Claude API Error (${response.status}): ${errDetails}`);
      }

      const data = await response.json();
      let rawReply = '';
      if (Array.isArray(data.content) && data.content.length > 0) {
        rawReply = data.content.map(c => c.text || '').join('');
      }

      const sanitizedReply = this.sanitizeOutput(rawReply);
      const latencyMs = Date.now() - startTime;

      const usage = {
        prompt_tokens: data.usage?.input_tokens || Math.round(message.length / 4),
        completion_tokens: data.usage?.output_tokens || Math.round(sanitizedReply.length / 4),
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
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
        throw new Error(`Anthropic request timeout setelah ${this.timeoutMs}ms.`);
      }
      throw err;
    }
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Anthropic API Key belum diisi.'
      };
    }

    const startTime = Date.now();
    const endpoint = `${this.baseUrl}/messages`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: this.defaultModel,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Ping' }]
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
        message: 'Koneksi Anthropic Claude API berhasil terhubung.',
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

