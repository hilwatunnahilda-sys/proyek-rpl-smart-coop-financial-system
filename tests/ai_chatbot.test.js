/**
 * Automated Test Suite: Smart Co-op AI Chatbot Assistant & NVIDIA AI NIM Integration
 * Covers: Persona System Prompt, Payload Validation, Conversation History, Error Handling
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NvidiaAiService } from '../src/infrastructure/ai/nvidiaAiService.js';

describe('Smart Co-op AI Chatbot Assistant Test Suite', () => {
  describe('1. Service Initialization and System Prompt Configuration', () => {
    it('Should correctly instantiate NvidiaAiService with defaults or custom configs', () => {
      const service = new NvidiaAiService({
        apiKey: 'test-key-123',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        model: 'meta/llama-3.2-11b-vision-instruct'
      });

      assert.strictEqual(service.apiKey, 'test-key-123');
      assert.strictEqual(service.baseUrl, 'https://integrate.api.nvidia.com/v1');
      assert.strictEqual(service.model, 'meta/llama-3.2-11b-vision-instruct');
    });

    it('Should generate rich system prompt with cooperative domain knowledge, user context & strict scope guardrails', () => {
      const service = new NvidiaAiService({ apiKey: 'mock-key' });
      const prompt = service.getSystemPrompt({
        name: 'Dr. Siti Nurhaliza',
        role: 'MEMBER',
        memberType: 'DOSEN',
        memberNumber: 'IKMI-MBR-002'
      });

      assert.ok(prompt.includes('Smart Co-op AI Assistant'), 'Should identify persona as Smart Co-op AI Assistant');
      assert.ok(prompt.includes('STMIK IKMI Cirebon'), 'Should mention institution STMIK IKMI Cirebon');
      assert.ok(prompt.includes('BATASAN RUANG LINGKUP'), 'Should contain strict scope guardrails');
      assert.ok(prompt.includes('KEBIJAKAN PENOLAKAN KETAT'), 'Should contain out-of-scope refusal policy');
      assert.ok(prompt.includes('Simpanan (Pokok, Wajib, Sukarela'), 'Should describe cooperative savings');
      assert.ok(prompt.includes('Flat, Menurun/Efektif, Anuitas, 0% Syariah Qardh'), 'Should describe loan schemes');
      assert.ok(prompt.includes('Dr. Siti Nurhaliza'), 'Should inject user name into context');
      assert.ok(prompt.includes('IKMI-MBR-002'), 'Should inject member number into context');
    });
  });

  describe('2. Input Validation and Guardrails', () => {
    it('Should reject empty or whitespace-only messages', async () => {
      const service = new NvidiaAiService({ apiKey: 'mock-key' });

      await assert.rejects(async () => {
        await service.chat('');
      }, /Pesan tidak boleh kosong/);

      await assert.rejects(async () => {
        await service.chat('   ');
      }, /Pesan tidak boleh kosong/);

      await assert.rejects(async () => {
        await service.chat(null);
      }, /Pesan tidak boleh kosong/);
    });

    it('Should fail with informative error message when NVIDIA API key is missing', async () => {
      const service = new NvidiaAiService({ apiKey: '' });

      await assert.rejects(async () => {
        await service.chat('Halo');
      }, /NVIDIA API Key belum dikonfigurasi/);
    });
  });

  describe('3. Integration Payload & History Structure', () => {
    it('Should construct valid OpenAI-compatible message payload', async () => {
      // Create mock service with custom fetch interceptor
      let capturedPayload = null;
      let capturedHeaders = null;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, options) => {
        capturedPayload = JSON.parse(options.body);
        capturedHeaders = options.headers;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'chatcmpl-mock-123',
            model: 'meta/llama-3.1-70b-instruct',
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Halo! 👋 Saya Smart Co-op AI Assistant. Ada yang bisa saya bantu terkait Koperasi STMIK IKMI?'
                }
              }
            ],
            usage: { total_tokens: 150 }
          })
        };
      };

      try {
        const service = new NvidiaAiService({
          apiKey: 'nvapi-test-key-valid',
          baseUrl: 'https://integrate.api.nvidia.com/v1',
          model: 'meta/llama-3.1-70b-instruct'
        });

        const history = [
          { role: 'user', content: 'Selamat pagi' },
          { role: 'assistant', content: 'Selamat pagi! Ada yang bisa saya bantu?' }
        ];

        const response = await service.chat('Halo', history, { name: 'Admin', role: 'ADMIN' });

        assert.strictEqual(response.reply.includes('Smart Co-op AI Assistant'), true);
        assert.strictEqual(response.model, 'meta/llama-3.1-70b-instruct');
        assert.ok(capturedPayload, 'Payload must be sent');
        assert.strictEqual(capturedPayload.model, 'meta/llama-3.1-70b-instruct');
        assert.strictEqual(capturedHeaders['Authorization'], 'Bearer nvapi-test-key-valid');
        assert.strictEqual(capturedPayload.messages.length, 4); // System + 2 History + 1 Current User
        assert.strictEqual(capturedPayload.messages[0].role, 'system');
        assert.strictEqual(capturedPayload.messages[3].content, 'Halo');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
