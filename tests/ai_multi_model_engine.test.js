/**
 * Comprehensive Test Suite: Multi-Model AI Engine
 * Tests Provider Adapters, AI Model Manager, Model Router, Fallback Engine,
 * RBAC Security, Telemetry, and Anti-Raw-JSON Integrity
 * 
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { DatabaseAdapter } from '../src/infrastructure/database/adapter.js';
import { DatabaseSeeder } from '../src/infrastructure/database/seeder.js';
import {
  BaseAiAdapter,
  NvidiaAiAdapter,
  OpenAiAdapter,
  GeminiAiAdapter,
  AnthropicAiAdapter,
  OpenRouterAiAdapter,
  OllamaAiAdapter
} from '../src/infrastructure/ai/adapters/index.js';
import {
  AiModelManager,
  AiModelRouter,
  AiUsageTracker
} from '../src/infrastructure/ai/manager/index.js';
import { AiChatServerHandler } from '../src/infrastructure/ai/aiChatServerHandler.js';
import { ROLES } from '../src/config/constants.js';

describe('Smart Co-op Multi-Model AI Engine Test Suite', () => {
  let testAdapter;
  let serverHandler;

  const ADMIN_TOKEN = 'ikmi_tok_admin_multimodel_test_2026';
  const CHAIRMAN_TOKEN = 'ikmi_tok_ketua_multimodel_test_2026';
  const MEMBER_TOKEN = 'ikmi_tok_mhs_multimodel_test_2026';

  beforeEach(async () => {
    testAdapter = new DatabaseAdapter(`test_ai_multi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    const seeder = new DatabaseSeeder(testAdapter);
    await seeder.seed();

    const now = new Date();
    const futureDate = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();

    const testSessions = [
      { token: ADMIN_TOKEN, user_id: 'usr-admin-001', created_at: now.toISOString(), expires_at: futureDate, is_revoked: false },
      { token: CHAIRMAN_TOKEN, user_id: 'usr-ketua-001', created_at: now.toISOString(), expires_at: futureDate, is_revoked: false },
      { token: MEMBER_TOKEN, user_id: 'usr-mhs-001', created_at: now.toISOString(), expires_at: futureDate, is_revoked: false }
    ];

    await testAdapter.saveAll('sessions', testSessions);
    serverHandler = new AiChatServerHandler({ adapter: testAdapter });
    await serverHandler.init();
  });

  // ==========================================
  // SECTION 1: PROVIDER ADAPTERS ARCHITECTURE
  // ==========================================
  describe('1. Standardized AI Provider Adapters', () => {
    it('1.1 BaseAiAdapter enforces required contract and provides system prompt formatting', () => {
      const adapter = new BaseAiAdapter({ id: 'custom', name: 'Custom' });
      assert.strictEqual(adapter.isConfigured(), false);

      const prompt = adapter.formatSystemPrompt(
        { name: 'Ahmad', role: 'ADMIN' },
        { totalAnggota: 5 },
        'Statistik Anggota'
      );
      assert.ok(prompt.includes('Smart Co-op AI Assistant'));
      assert.ok(prompt.includes('Informasi Pengguna Aktif:'));
      assert.ok(prompt.includes('Ahmad'));
      assert.ok(prompt.includes('DATA AKTUAL KOPERASI TEROTORISASI'));
      assert.ok(prompt.includes('JANGAN PERNAH menampilkan JSON'));
    });

    it('1.2 BaseAiAdapter cleans raw JSON leaks via sanitizeOutput()', () => {
      const adapter = new BaseAiAdapter();
      const rawJson = '{"reply": "Total anggota terdaftar adalah 5 orang."}';
      const clean = adapter.sanitizeOutput(rawJson);
      assert.strictEqual(clean, 'Total anggota terdaftar adalah 5 orang.');

      const stringifiedObject = 'Informasi data koperasi: {"description": "Sistem simpan pinjam STMIK IKMI"}';
      const cleanDesc = adapter.sanitizeOutput(stringifiedObject);
      assert.strictEqual(cleanDesc, 'Sistem simpan pinjam STMIK IKMI');
    });

    it('1.3 NvidiaAiAdapter initializes correctly and calculates token cost', () => {
      const nvidia = new NvidiaAiAdapter({ apiKey: 'nvapi-test-key-123' });
      assert.strictEqual(nvidia.id, 'nvidia');
      assert.strictEqual(nvidia.isConfigured(), true);
      assert.strictEqual(nvidia.defaultModel, 'meta/llama-3.2-11b-vision-instruct');

      const cost = nvidia.calculateCost(1000, 500, 'meta/llama-3.2-11b-vision-instruct');
      assert.ok(cost.costUsd > 0);
      assert.ok(cost.costIdr > 0);
      assert.strictEqual(cost.inputTokens, 1000);
      assert.strictEqual(cost.outputTokens, 500);
    });

    it('1.4 OpenAiAdapter initializes correctly and calculates token cost', () => {
      const openai = new OpenAiAdapter({ apiKey: 'sk-proj-test-key-123' });
      assert.strictEqual(openai.id, 'openai');
      assert.strictEqual(openai.isConfigured(), true);
      assert.strictEqual(openai.defaultModel, 'gpt-4o-mini');

      const cost = openai.calculateCost(2000, 1000, 'gpt-4o-mini');
      assert.ok(cost.costUsd > 0);
      assert.ok(cost.costIdr > 0);
    });

    it('1.5 GeminiAiAdapter initializes correctly and defines available models', async () => {
      const gemini = new GeminiAiAdapter({ apiKey: 'AIzaSy-test-gemini' });
      assert.strictEqual(gemini.id, 'gemini');
      assert.strictEqual(gemini.isConfigured(), true);
      assert.strictEqual(gemini.defaultModel, 'gemini-1.5-flash');

      const models = await gemini.getAvailableModels();
      assert.ok(Array.isArray(models));
      assert.ok(models.some(m => m.id === 'gemini-1.5-flash'));
      assert.ok(models.some(m => m.id === 'gemini-2.0-flash'));
    });

    it('1.6 AnthropicAiAdapter initializes correctly and supports Claude models', async () => {
      const anthropic = new AnthropicAiAdapter({ apiKey: 'sk-ant-test-key' });
      assert.strictEqual(anthropic.id, 'anthropic');
      assert.strictEqual(anthropic.isConfigured(), true);
      assert.strictEqual(anthropic.defaultModel, 'claude-3-5-haiku-20241022');

      const models = await anthropic.getAvailableModels();
      assert.ok(models.some(m => m.id === 'claude-3-5-haiku-20241022'));
      assert.ok(models.some(m => m.id === 'claude-3-5-sonnet-20241022'));
    });

    it('1.7 OpenRouterAiAdapter initializes correctly with unified models', async () => {
      const openrouter = new OpenRouterAiAdapter({ apiKey: 'sk-or-test-key' });
      assert.strictEqual(openrouter.id, 'openrouter');
      assert.strictEqual(openrouter.isConfigured(), true);

      const models = await openrouter.getAvailableModels();
      assert.ok(models.some(m => m.id === 'google/gemini-2.0-flash-001'));
      assert.ok(models.some(m => m.id === 'meta-llama/llama-3.3-70b-instruct'));
    });

    it('1.8 OllamaAiAdapter supports local zero-cost models without requiring API key', async () => {
      const ollama = new OllamaAiAdapter({ baseUrl: 'http://localhost:11434' });
      assert.strictEqual(ollama.id, 'ollama');
      assert.strictEqual(ollama.isConfigured(), true);

      const cost = ollama.calculateCost(5000, 2000);
      assert.strictEqual(cost.costUsd, 0, 'Local model cost must be 0 USD');
      assert.strictEqual(cost.costIdr, 0, 'Local model cost must be 0 IDR');

      const models = await ollama.getAvailableModels();
      assert.ok(Array.isArray(models));
      assert.ok(models.length > 0);
    });
  });

  // ==========================================
  // SECTION 2: AI MODEL MANAGER & SECURITY
  // ==========================================
  describe('2. AI Model Manager & API Key Masking', () => {
    it('2.1 Masks API Keys completely so secrets are NEVER exposed in plain text', () => {
      const secret = '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';
      const masked = AiModelManager.maskApiKey(secret);

      assert.ok(!masked.includes('truXoJXIH1_jJ9m6'), 'Must not reveal center part of key');
      assert.ok(masked.startsWith('nvapi-'));
      assert.ok(masked.endsWith('k3Ab'));
      assert.ok(masked.includes('****************'));
    });

    it('2.2 Manages primary and fallback provider designations', async () => {
      const manager = new AiModelManager({ adapter: testAdapter });
      await manager.init();

      // Configure mock keys for testing
      await manager.updateProviderConfig('nvidia', { apiKey: 'nvapi-mock-123', isEnabled: true, isPrimary: true });
      await manager.updateProviderConfig('gemini', { apiKey: 'gemini-mock-123', isEnabled: true, isBackup: true, backupPriority: 1 });
      await manager.updateProviderConfig('openai', { apiKey: 'openai-mock-123', isEnabled: true, isBackup: true, backupPriority: 2 });

      const primary = await manager.getPrimaryProvider();
      assert.ok(primary);
      assert.strictEqual(primary.config.id, 'nvidia');

      const fallbackChain = await manager.getFallbackChain();
      assert.strictEqual(fallbackChain.length, 2);
      assert.strictEqual(fallbackChain[0].config.id, 'gemini');
      assert.strictEqual(fallbackChain[1].config.id, 'openai');

      // Designating gemini as primary must unset nvidia as primary
      await manager.updateProviderConfig('gemini', { isPrimary: true });
      const newPrimary = await manager.getPrimaryProvider();
      assert.strictEqual(newPrimary.config.id, 'gemini');
      const nvidiaConfig = await manager.getProviderConfig('nvidia');
      assert.strictEqual(nvidiaConfig.isPrimary, false);
    });

    it('2.3 Filters models strictly according to user role (RBAC)', async () => {
      const manager = new AiModelManager({ adapter: testAdapter });
      await manager.init();

      await manager.updateProviderConfig('nvidia', {
        apiKey: 'nvapi-mock',
        isEnabled: true,
        allowedRoles: ['ADMIN', 'CHAIRMAN', 'MEMBER']
      });

      await manager.updateProviderConfig('anthropic', {
        apiKey: 'sk-ant-mock',
        isEnabled: true,
        allowedRoles: ['ADMIN'] // Restricted only to ADMIN
      });

      const memberProviders = await manager.getAllProviders({ forRole: 'MEMBER' });
      const memberProviderIds = memberProviders.map(p => p.id);
      assert.ok(memberProviderIds.includes('nvidia'), 'Member must have access to NVIDIA');
      assert.ok(!memberProviderIds.includes('anthropic'), 'Member MUST NOT have access to Anthropic');

      const adminProviders = await manager.getAllProviders({ forRole: 'ADMIN' });
      const adminProviderIds = adminProviders.map(p => p.id);
      assert.ok(adminProviderIds.includes('nvidia'));
      assert.ok(adminProviderIds.includes('anthropic'), 'Admin must have access to Anthropic');
    });

    it('2.4 Deleting provider config resets API key and disables provider', async () => {
      const manager = new AiModelManager({ adapter: testAdapter });
      await manager.init();

      await manager.updateProviderConfig('openrouter', { apiKey: 'sk-or-secret', isEnabled: true });
      assert.strictEqual(manager.getAdapter('openrouter').isConfigured(), true);

      await manager.deleteProviderConfig('openrouter');
      const config = await manager.getProviderConfig('openrouter');
      assert.strictEqual(config.isEnabled, false);
      assert.strictEqual(config.apiKey, '');
      assert.strictEqual(manager.getAdapter('openrouter').isConfigured(), false);
    });
  });

  // ==========================================
  // SECTION 3: MODEL ROUTING & FALLBACK ENGINE
  // ==========================================
  describe('3. Model Router & Automatic Fallback Engine', () => {
    it('3.1 Resolves route based on user intent (Conversational vs Financial Analysis)', async () => {
      const manager = new AiModelManager({ adapter: testAdapter });
      await manager.init();

      await manager.updateProviderConfig('gemini', { apiKey: 'gemini-key', isEnabled: true });
      await manager.updateProviderConfig('openai', { apiKey: 'openai-key', isEnabled: true });

      const router = new AiModelRouter({ manager, adapter: testAdapter });
      await router.init();

      // Conversational intent should route to Gemini
      const routeGreeting = await router.resolveRoute({ intent: 'GREETING', userRole: 'MEMBER' });
      assert.strictEqual(routeGreeting.providerId, 'gemini');
      assert.strictEqual(routeGreeting.mode, 'AUTO_INTENT');

      // Financial report intent should route to OpenAI
      const routeFinance = await router.resolveRoute({ intent: 'FINANCIAL_REPORT', userRole: 'ADMIN' });
      assert.strictEqual(routeFinance.providerId, 'openai');
      assert.strictEqual(routeFinance.mode, 'AUTO_INTENT');
    });

    it('3.2 Respects manual provider selection if enabled and authorized', async () => {
      const manager = new AiModelManager({ adapter: testAdapter });
      await manager.init();
      await manager.updateProviderConfig('nvidia', { apiKey: 'nv-key', isEnabled: true, allowedRoles: ['MEMBER'] });

      const router = new AiModelRouter({ manager, adapter: testAdapter });
      await router.init();

      const routeManual = await router.resolveRoute({
        intent: 'GENERAL',
        requestedProviderId: 'nvidia',
        userRole: 'MEMBER'
      });
      assert.strictEqual(routeManual.providerId, 'nvidia');
      assert.strictEqual(routeManual.mode, 'MANUAL');
    });

    it('3.3 Automatic Fallback: switches to backup provider on timeout/error', async () => {
      const manager = new AiModelManager({ adapter: testAdapter });
      await manager.init();

      // Configure primary provider with failing mock
      const failingAdapter = manager.getAdapter('nvidia');
      failingAdapter.apiKey = 'nv-fail-key';
      failingAdapter.chat = async () => {
        throw new Error('NVIDIA NIM request timeout setelah 20000ms.');
      };
      await manager.updateProviderConfig('nvidia', { isEnabled: true, isPrimary: true });

      // Configure backup provider with succeeding mock
      const backupAdapter = manager.getAdapter('gemini');
      backupAdapter.apiKey = 'gemini-ok-key';
      backupAdapter.chat = async ({ message }) => {
        return {
          reply: `Jawaban sukses dari Google Gemini: ${message}`,
          model: 'gemini-1.5-flash',
          provider: 'gemini',
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        };
      };
      await manager.updateProviderConfig('gemini', { isEnabled: true, isBackup: true, backupPriority: 1 });

      const router = new AiModelRouter({ manager, adapter: testAdapter });
      await router.init();

      const result = await router.executeChatWithFallback({
        message: 'Berapa total anggota?',
        intent: 'MEMBER_TOTAL',
        user: { id: 'usr-admin-001', role: 'ADMIN' }
      });

      assert.strictEqual(result.fallbackOccurred, true, 'Fallback MUST occur when primary times out');
      assert.strictEqual(result.providerId, 'gemini', 'Must fallback to Gemini');
      assert.ok(result.reply.includes('Jawaban sukses dari Google Gemini'));
      assert.strictEqual(result.attemptCount, 2);
    });

    it('3.4 Does NOT fallback on authentication or permission errors', async () => {
      const manager = new AiModelManager({ adapter: testAdapter });
      await manager.init();

      const adapter = manager.getAdapter('nvidia');
      adapter.apiKey = 'nv-key';
      adapter.chat = async () => {
        throw new Error('Autentikasi diperlukan. Sesi Anda tidak valid (401).');
      };
      await manager.updateProviderConfig('nvidia', { isEnabled: true, isPrimary: true });

      const router = new AiModelRouter({ manager, adapter: testAdapter });
      await router.init();

      await assert.rejects(async () => {
        await router.executeChatWithFallback({
          message: 'Halo',
          intent: 'GREETING',
          user: { id: 'usr-admin-001', role: 'ADMIN' }
        });
      }, /Autentikasi diperlukan/);
    });
  });

  // ==========================================
  // SECTION 4: AI USAGE & TELEMETRY TRACKER
  // ==========================================
  describe('4. AI Usage & Cost Telemetry', () => {
    it('4.1 Accurately tracks requests, token usage, and calculates costs in USD and IDR', async () => {
      const tracker = new AiUsageTracker(testAdapter);

      await tracker.recordUsage({
        providerId: 'openai',
        modelId: 'gpt-4o-mini',
        intent: 'MEMBER_QUERY',
        success: true,
        latencyMs: 320,
        inputTokens: 800,
        outputTokens: 400,
        costUsd: 0.00036,
        costIdr: 5.76,
        userId: 'usr-admin-001',
        userRole: 'ADMIN'
      });

      await tracker.recordUsage({
        providerId: 'nvidia',
        modelId: 'meta/llama-3.2-11b-vision-instruct',
        intent: 'FINANCIAL_REPORT',
        success: true,
        latencyMs: 450,
        inputTokens: 1200,
        outputTokens: 600,
        costUsd: 0.00036,
        costIdr: 5.76,
        userId: 'usr-admin-001',
        userRole: 'ADMIN'
      });

      const metrics = await tracker.getMetrics();
      assert.strictEqual(metrics.totalRequests, 2);
      assert.strictEqual(metrics.successfulRequests, 2);
      assert.strictEqual(metrics.failedRequests, 0);
      assert.strictEqual(metrics.successRate, 100);
      assert.strictEqual(metrics.totalInputTokens, 2000);
      assert.strictEqual(metrics.totalOutputTokens, 1000);
      assert.strictEqual(metrics.totalTokens, 3000);
      assert.ok(metrics.totalCostUsd > 0);
      assert.ok(metrics.totalCostIdr > 0);
      assert.ok(metrics.providerBreakdown.openai);
      assert.ok(metrics.providerBreakdown.nvidia);
    });
  });

  // ==========================================
  // SECTION 5: SERVER HANDLER ENDPOINTS & SECURITY
  // ==========================================
  describe('5. Authenticated Server Handler & RBAC Endpoints', () => {
    it('5.1 GET /api/ai/models returns available models for authenticated user without exposing API keys', async () => {
      const res = await serverHandler.handleGetModels({
        authorization: `Bearer ${ADMIN_TOKEN}`
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.providers));

      // Verify NO API keys are returned in model list
      for (const prov of res.body.providers) {
        assert.strictEqual(prov.apiKey, undefined, 'API key must never be exposed in /api/ai/models');
      }
    });

    it('5.2 GET /api/ai/admin/config is strictly protected by RBAC (Allows Admin, Rejects Member with 403)', async () => {
      // 1. Rejected for regular Member
      const memberRes = await serverHandler.handleGetAdminConfig({
        authorization: `Bearer ${MEMBER_TOKEN}`
      });
      assert.strictEqual(memberRes.status, 403, 'Member must receive 403 Forbidden');
      assert.strictEqual(memberRes.body.success, false);
      assert.ok(memberRes.body.error.includes('Akses ditolak'));

      // 2. Allowed for Admin
      const adminRes = await serverHandler.handleGetAdminConfig({
        authorization: `Bearer ${ADMIN_TOKEN}`
      });
      assert.strictEqual(adminRes.status, 200);
      assert.strictEqual(adminRes.body.success, true);
      assert.ok(Array.isArray(adminRes.body.providers));
      assert.ok(adminRes.body.routing);

      // Verify all API keys are securely masked
      for (const prov of adminRes.body.providers) {
        if (prov.apiKey) {
          assert.ok(prov.apiKey.includes('****'), 'Admin API key must be masked in response');
        }
      }
    });

    it('5.3 POST /api/ai/admin/config allows Admin to update provider settings safely', async () => {
      const updateRes = await serverHandler.handleUpdateAdminConfig(
        {
          providerId: 'gemini',
          updates: {
            temperature: 0.15,
            maxTokens: 1500,
            selectedModel: 'gemini-2.0-flash'
          }
        },
        { authorization: `Bearer ${ADMIN_TOKEN}` }
      );

      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.body.success, true);
      assert.strictEqual(updateRes.body.provider.selectedModel, 'gemini-2.0-flash');
      assert.strictEqual(updateRes.body.provider.temperature, 0.15);
      assert.strictEqual(updateRes.body.provider.maxTokens, 1500);
    });

    it('5.4 POST /api/ai/admin/routing updates routing policy and fallback settings', async () => {
      const routingRes = await serverHandler.handleUpdateAdminRouting(
        {
          settings: {
            autoRoutingEnabled: true,
            allowManualSelection: true,
            maxFallbackAttempts: 3
          }
        },
        { authorization: `Bearer ${ADMIN_TOKEN}` }
      );

      assert.strictEqual(routingRes.status, 200);
      assert.strictEqual(routingRes.body.success, true);
      assert.strictEqual(routingRes.body.routing.maxFallbackAttempts, 3);
    });

    it('5.5 POST /api/ai/chat supports multi-model selection and preserves conversation context', async () => {
      const response = await serverHandler.handleChatRequest(
        {
          message: 'Berapa total anggota?',
          providerId: 'auto'
        },
        { authorization: `Bearer ${ADMIN_TOKEN}` }
      );

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.ok(response.body.reply.includes('5 orang') || response.body.reply.includes('5'));
      assert.ok(response.body.model);

      // Follow-up question maintaining conversation history:
      const followUpResponse = await serverHandler.handleChatRequest(
        {
          message: 'Berapa yang aktif?',
          conversation: [
            { role: 'user', content: 'Berapa total anggota?' },
            { role: 'assistant', content: response.body.reply }
          ],
          providerId: 'auto'
        },
        { authorization: `Bearer ${ADMIN_TOKEN}` }
      );

      assert.strictEqual(followUpResponse.status, 200);
      assert.strictEqual(followUpResponse.body.success, true);
      assert.ok(followUpResponse.body.reply.includes('aktif') || followUpResponse.body.reply.includes('5 orang'));
    });
  });
});

