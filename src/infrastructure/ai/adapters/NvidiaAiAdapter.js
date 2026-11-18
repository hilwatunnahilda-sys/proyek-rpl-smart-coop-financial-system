/**
 * NVIDIA NIM AI Provider Adapter
 * Interacts with NVIDIA Cloud Functions / NIM OpenAI-compatible API
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { BaseAiAdapter } from './BaseAiAdapter.js';

export class NvidiaAiAdapter extends BaseAiAdapter {
  constructor(config = {}) {
    super({
      id: 'nvidia',
      name: 'NVIDIA NIM',
      baseUrl: config.baseUrl || process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      apiKey: config.apiKey || process.env.NVIDIA_API_KEY || '',
      defaultModel: config.defaultModel || process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct',
      timeoutMs: config.timeoutMs || 20000,
      temperature: config.temperature !== undefined ? config.temperature : 0.2,
      maxTokens: config.maxTokens || 1000
    });
  }

  _getModelPricingCatalog() {
    return {
      'meta/llama-3.2-11b-vision-instruct': { inputPer1k: 0.0002, outputPer1k: 0.0002 },
      'meta/llama-3.1-70b-instruct': { inputPer1k: 0.0007, outputPer1k: 0.0009 },
      'meta/llama-3.1-8b-instruct': { inputPer1k: 0.0001, outputPer1k: 0.0001 },
      'mistralai/mixtral-8x22b-instruct-v0.1': { inputPer1k: 0.0006, outputPer1k: 0.0006 }
    };
  }

  async getAvailableModels() {
    return [
      {
        id: 'meta/llama-3.2-11b-vision-instruct',
        name: 'Llama 3.2 11B Vision Instruct',
        description: 'Model multimodal efisien, cepat, dan akurat untuk analisis data dan percakapan.',
        contextWindow: 128000,
        costPer1kInput: 0.0002,
        costPer1kOutput: 0.0002,
        isDefault: true
      },
      {
        id: 'meta/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B Instruct',
        description: 'Model reasoning tinggi untuk analisis keuangan mendalam dan sintesis kompleks.',
        contextWindow: 128000,
        costPer1kInput: 0.0007,
        costPer1kOutput: 0.0009,
        isDefault: false
      },
      {
        id: 'meta/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B Instruct',
        description: 'Model ultra cepat dan hemat biaya untuk percakapan umum dan panduan dasar.',
        contextWindow: 128000,
        costPer1kInput: 0.0001,
        costPer1kOutput: 0.0001,
        isDefault: false
      },
      {
        id: 'mistralai/mixtral-8x22b-instruct-v0.1',
        name: 'Mixtral 8x22B Instruct',
        description: 'Arsitektur Mixture-of-Experts serbaguna untuk tugas penalaran multi-domain.',
        contextWindow: 65536,
        costPer1kInput: 0.0006,
        costPer1kOutput: 0.0006,
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
      throw new Error('NVIDIA API Key belum dikonfigurasi pada server backend.');
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
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errDetails = '';
        try {
          const errJson = await response.json();
          errDetails = errJson.message || errJson.error?.message || JSON.stringify(errJson);
        } catch {
          errDetails = await response.text();
        }
        throw new Error(`NVIDIA NIM API Error (${response.status}): ${errDetails}`);
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
        throw new Error(`NVIDIA NIM request timeout setelah ${this.timeoutMs}ms.`);
      }
      throw err;
    }
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        latencyMs: 0,
        message: 'NVIDIA API Key belum diisi.'
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
          errorMsg = errData.error?.message || errData.message || errorMsg;
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
        message: 'Koneksi NVIDIA NIM berhasil terhubung dan siap digunakan.',
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

