/**
 * Google Gemini API Provider Adapter
 * Official Google Gemini REST API Integration (v1beta)
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { BaseAiAdapter } from './BaseAiAdapter.js';

export class GeminiAiAdapter extends BaseAiAdapter {
  constructor(config = {}) {
    super({
      id: 'gemini',
      name: 'Google Gemini',
      baseUrl: config.baseUrl || process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: config.apiKey || process.env.GEMINI_API_KEY || '',
      defaultModel: config.defaultModel || process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      timeoutMs: config.timeoutMs || 20000,
      temperature: config.temperature !== undefined ? config.temperature : 0.2,
      maxTokens: config.maxTokens || 1000
    });
  }

  _getModelPricingCatalog() {
    return {
      'gemini-1.5-flash': { inputPer1k: 0.000075, outputPer1k: 0.0003 },
      'gemini-2.0-flash': { inputPer1k: 0.0001, outputPer1k: 0.0004 },
      'gemini-1.5-pro': { inputPer1k: 0.00125, outputPer1k: 0.005 }
    };
  }

  async getAvailableModels() {
    return [
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Model Google super cepat, berbobot ringan, hemat biaya dan memiliki konteks luas.',
        contextWindow: 1048576,
        costPer1kInput: 0.000075,
        costPer1kOutput: 0.0003,
        isDefault: true
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: 'Generasi terbaru Gemini dengan latensi sangat rendah dan penalaran multimodal kuat.',
        contextWindow: 1048576,
        costPer1kInput: 0.0001,
        costPer1kOutput: 0.0004,
        isDefault: false
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Penalaran tingkat tinggi untuk perbandingan laporan keuangan multi-periode dan audit sistem.',
        contextWindow: 2097152,
        costPer1kInput: 0.00125,
        costPer1kOutput: 0.005,
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
      throw new Error('Google Gemini API Key belum dikonfigurasi pada server backend.');
    }

    const startTime = Date.now();
    const systemPrompt = this.formatSystemPrompt(userContext, dataContext, queryDescription);

    // Build Gemini contents array
    const contents = [];

    if (Array.isArray(conversation) && conversation.length > 0) {
      const recent = conversation.slice(-10);
      recent.forEach(item => {
        if (item && item.role && item.content) {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(item.content) }]
          });
        }
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const targetModel = model || this.defaultModel;
    const cleanModelName = targetModel.replace(/^models\//, '');
    const endpoint = `${this.baseUrl}/models/${cleanModelName}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents,
      generationConfig: {
        temperature: generationConfig.temperature !== undefined ? generationConfig.temperature : this.temperature,
        topP: generationConfig.topP || 0.95,
        maxOutputTokens: generationConfig.maxTokens || this.maxTokens
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
          errDetails = errJson.error?.message || JSON.stringify(errJson);
        } catch {
          errDetails = await response.text();
        }
        throw new Error(`Google Gemini API Error (${response.status}): ${errDetails}`);
      }

      const data = await response.json();
      let rawReply = '';
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        rawReply = data.candidates[0].content.parts.map(p => p.text || '').join('');
      }

      const sanitizedReply = this.sanitizeOutput(rawReply);
      const latencyMs = Date.now() - startTime;

      const usageMeta = data.usageMetadata || {};
      const usage = {
        prompt_tokens: usageMeta.promptTokenCount || Math.round(message.length / 4),
        completion_tokens: usageMeta.candidatesTokenCount || Math.round(sanitizedReply.length / 4),
        total_tokens: usageMeta.totalTokenCount || (Math.round((message.length + sanitizedReply.length) / 4))
      };

      return {
        reply: sanitizedReply,
        model: targetModel,
        provider: this.id,
        usage,
        latencyMs
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Google Gemini request timeout setelah ${this.timeoutMs}ms.`);
      }
      throw err;
    }
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Google Gemini API Key belum diisi.'
      };
    }

    const startTime = Date.now();
    const cleanModelName = this.defaultModel.replace(/^models\//, '');
    const endpoint = `${this.baseUrl}/models/${cleanModelName}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 5 }
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
        message: 'Koneksi Google Gemini API berhasil terhubung.',
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

