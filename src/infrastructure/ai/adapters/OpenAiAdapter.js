/**
 * OpenAI API Provider Adapter
 * Official OpenAI Chat Completions API Integration
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { BaseAiAdapter } from './BaseAiAdapter.js';

export class OpenAiAdapter extends BaseAiAdapter {
  constructor(config = {}) {
    super({
      id: 'openai',
      name: 'OpenAI API',
      baseUrl: config.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
      defaultModel: config.defaultModel || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      timeoutMs: config.timeoutMs || 20000,
      temperature: config.temperature !== undefined ? config.temperature : 0.2,
      maxTokens: config.maxTokens || 1000
    });
  }

  _getModelPricingCatalog() {
    return {
      'gpt-4o-mini': { inputPer1k: 0.00015, outputPer1k: 0.0006 },
      'gpt-4o': { inputPer1k: 0.0025, outputPer1k: 0.01 },
      'gpt-4-turbo': { inputPer1k: 0.01, outputPer1k: 0.03 }
    };
  }

  async getAvailableModels() {
    return [
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Model cerdas, sangat cepat, dan hemat biaya untuk pemrosesan data & percakapan harian.',
        contextWindow: 128000,
        costPer1kInput: 0.00015,
        costPer1kOutput: 0.0006,
        isDefault: true
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o (Omni)',
        description: 'Model flagship OpenAI dengan penalaran tinggi untuk analisis laporan keuangan dan audit.',
        contextWindow: 128000,
        costPer1kInput: 0.0025,
        costPer1kOutput: 0.01,
        isDefault: false
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Model analisis mendalam untuk sintesis kebijakan dan laporan kompleks.',
        contextWindow: 128000,
        costPer1kInput: 0.01,
        costPer1kOutput: 0.03,
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
      throw new Error('OpenAI API Key belum dikonfigurasi pada server backend.');
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
      max_tokens: generationConfig.maxTokens || this.maxTokens,
      stream: false
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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
        throw new Error(`OpenAI API Error (${response.status}): ${errDetails}`);
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
        throw new Error(`OpenAI request timeout setelah ${this.timeoutMs}ms.`);
      }
      throw err;
    }
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        latencyMs: 0,
        message: 'OpenAI API Key belum diisi.'
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
        message: 'Koneksi OpenAI API berhasil terhubung.',
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

