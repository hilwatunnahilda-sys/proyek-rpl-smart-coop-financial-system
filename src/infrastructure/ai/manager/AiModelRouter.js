/**
 * AI Model Routing & Resilient Fallback Engine
 * Resolves optimal model based on intent, role permissions, and executes automatic fallback
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

export class AiModelRouter {
  /**
   * @param {object} options
   * @param {import('./AiModelManager.js').AiModelManager} options.manager
   * @param {object} [options.adapter] - Database adapter
   */
  constructor({ manager, adapter = null }) {
    this.manager = manager;
    this.db = adapter;
    this.settings = {
      autoRoutingEnabled: true,
      allowManualSelection: true,
      defaultProviderId: 'nvidia',
      maxFallbackAttempts: 2,
      intentMappings: {
        // Fast & light models for conversations
        CONVERSATIONAL: { preferredProvider: 'gemini', preferredModel: 'gemini-1.5-flash' },
        IDENTITY: { preferredProvider: 'nvidia', preferredModel: 'meta/llama-3.2-11b-vision-instruct' },
        BOT_INFO: { preferredProvider: 'gemini', preferredModel: 'gemini-1.5-flash' },
        
        // Narrative models for system overview & guides
        APP_EXPLANATION: { preferredProvider: 'nvidia', preferredModel: 'meta/llama-3.2-11b-vision-instruct' },
        GUIDE: { preferredProvider: 'anthropic', preferredModel: 'claude-3-5-haiku-20241022' },
        
        // Precision tool processing for database entities
        MEMBER_QUERY: { preferredProvider: 'nvidia', preferredModel: 'meta/llama-3.2-11b-vision-instruct' },
        LOAN_QUERY: { preferredProvider: 'openai', preferredModel: 'gpt-4o-mini' },
        SAVINGS_QUERY: { preferredProvider: 'nvidia', preferredModel: 'meta/llama-3.2-11b-vision-instruct' },
        INSTALLMENT_QUERY: { preferredProvider: 'openai', preferredModel: 'gpt-4o-mini' },
        
        // Deep reasoning & financial analysis
        FINANCIAL_ANALYSIS: { preferredProvider: 'openai', preferredModel: 'gpt-4o' },
        COMPLEX_REASONING: { preferredProvider: 'anthropic', preferredModel: 'claude-3-5-sonnet-20241022' }
      }
    };
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;

    if (this.db && typeof this.db.findById === 'function') {
      try {
        const stored = await this.db.findById('ai_routing_settings', 'default', 'id');
        if (stored && stored.config) {
          this.settings = { ...this.settings, ...stored.config };
        }
      } catch (err) {
        console.warn('[AiModelRouter] DB load warning:', err.message);
      }
    }

    this._initialized = true;
  }

  /**
   * Save routing settings
   */
  async updateSettings(newSettings = {}) {
    await this.init();
    this.settings = {
      ...this.settings,
      ...newSettings,
      intentMappings: {
        ...this.settings.intentMappings,
        ...(newSettings.intentMappings || {})
      }
    };

    if (this.db && typeof this.db.saveAll === 'function') {
      try {
        await this.db.saveAll('ai_routing_settings', [
          { id: 'default', config: this.settings, updated_at: new Date().toISOString() }
        ]);
      } catch (err) {
        console.warn('[AiModelRouter] Failed saving settings to DB:', err.message);
      }
    }

    return this.settings;
  }

  getSettings() {
    return { ...this.settings };
  }

  /**
   * Maps detailed intent string to coarse intent category
   */
  categorizeIntent(intent = '') {
    const it = String(intent).toUpperCase();

    if (it === 'GREETING' || it === 'THANKS' || it === 'CONVERSATIONAL') return 'CONVERSATIONAL';
    if (it === 'WHO_AM_I' || it === 'IDENTITY') return 'IDENTITY';
    if (it === 'BOT_INFO') return 'BOT_INFO';
    if (it === 'APP_EXPLANATION' || it.startsWith('EXPLAIN_')) return 'APP_EXPLANATION';
    if (it.startsWith('GUIDE_') || it === 'APP_GUIDE') return 'GUIDE';
    if (it.startsWith('MEMBER_') || it.startsWith('REGISTRATION_')) return 'MEMBER_QUERY';
    if (it.startsWith('LOAN_')) return 'LOAN_QUERY';
    if (it.startsWith('SAVINGS_')) return 'SAVINGS_QUERY';
    if (it.startsWith('INSTALLMENT_')) return 'INSTALLMENT_QUERY';
    if (it.startsWith('FINANCIAL_') || it === 'TRANSACTION_SUMMARY') return 'FINANCIAL_ANALYSIS';
    if (it === 'COOP_CODING' || it === 'EXPLAIN_DIFFERENCE') return 'COMPLEX_REASONING';

    return 'GENERAL';
  }

  /**
   * Resolves the provider and model to be used
   */
  async resolveRoute({
    intent = 'GENERAL',
    requestedProviderId = null,
    requestedModelId = null,
    userRole = 'MEMBER'
  }) {
    await this.init();

    // 1. Check for manual selection if allowed
    if (
      requestedProviderId &&
      requestedProviderId !== 'auto' &&
      requestedProviderId !== 'default'
    ) {
      if (!this.settings.allowManualSelection) {
        throw new Error('Pemilihan model AI manual saat ini dinonaktifkan oleh Administrator. Silakan gunakan mode Auto Select.');
      }

      const config = await this.manager.getProviderConfig(requestedProviderId, false);
      const adapter = this.manager.getAdapter(requestedProviderId);

      if (!config || !adapter || !config.isEnabled || !adapter.isConfigured()) {
        throw new Error(`Provider AI "${requestedProviderId}" tidak aktif atau belum dikonfigurasi.`);
      }

      // Enforce Strict Role-Based Access Control (RBAC) on Provider Selection:
      const isRoleAllowed = !Array.isArray(config.allowedRoles) || config.allowedRoles.includes(userRole);
      if (!isRoleAllowed) {
        throw new Error(`Akses ditolak (RBAC): Peran Anda (${userRole}) tidak memiliki izin untuk menggunakan model AI "${config.name}".`);
      }

      return {
        provider: adapter,
        providerId: config.id,
        providerName: config.name,
        model: requestedModelId || config.selectedModel || config.defaultModel,
        mode: 'MANUAL',
        intentCategory: this.categorizeIntent(intent)
      };
    }

    // 2. Automated Intent-Based Model Routing
    const category = this.categorizeIntent(intent);
    if (this.settings.autoRoutingEnabled && this.settings.intentMappings[category]) {
      const mapping = this.settings.intentMappings[category];
      const preferredAdapter = this.manager.getAdapter(mapping.preferredProvider);
      const preferredConfig = await this.manager.getProviderConfig(mapping.preferredProvider, false);

      if (
        preferredAdapter &&
        preferredConfig &&
        preferredConfig.isEnabled &&
        preferredAdapter.isConfigured()
      ) {
        const isRoleAllowed = !Array.isArray(preferredConfig.allowedRoles) || preferredConfig.allowedRoles.includes(userRole);
        if (isRoleAllowed) {
          return {
            provider: preferredAdapter,
            providerId: preferredConfig.id,
            providerName: preferredConfig.name,
            model: mapping.preferredModel || preferredConfig.selectedModel || preferredConfig.defaultModel,
            mode: 'AUTO_INTENT',
            intentCategory: category
          };
        }
      }
    }

    // 3. Fallback to Primary Provider
    const primary = await this.manager.getPrimaryProvider();
    if (primary && primary.provider) {
      const isRoleAllowed = !Array.isArray(primary.config.allowedRoles) || primary.config.allowedRoles.includes(userRole);
      if (isRoleAllowed) {
        return {
          provider: primary.provider,
          providerId: primary.config.id,
          providerName: primary.config.name,
          model: primary.config.selectedModel || primary.config.defaultModel,
          mode: 'PRIMARY_DEFAULT',
          intentCategory: category
        };
      }
    }

    // 4. Any available configured provider allowed for this role
    const allProviders = await this.manager.getAllProviders({ maskKeys: false, forRole: userRole });
    for (const p of allProviders) {
      if (p.isEnabled && p.isConfigured) {
        const adapter = this.manager.getAdapter(p.id);
        if (adapter) {
          return {
            provider: adapter,
            providerId: p.id,
            providerName: p.name,
            model: p.selectedModel || p.defaultModel,
            mode: 'FALLBACK_ANY',
            intentCategory: category
          };
        }
      }
    }

    return null;
  }

  /**
   * Determine if an error is recoverable and warrants a fallback
   */
  isRecoverableError(err) {
    if (!err) return false;
    const msg = String(err.message || err).toLowerCase();

    // Do NOT fallback on user authentication, RBAC permission denial, or validation errors
    if (
      msg.includes('autentikasi') ||
      msg.includes('sesi') ||
      msg.includes('401') ||
      msg.includes('403') ||
      msg.includes('akses ditolak') ||
      msg.includes('permission') ||
      msg.includes('forbidden') ||
      msg.includes('unauthorized') ||
      msg.includes('tidak memiliki wewenang') ||
      msg.includes('tidak memiliki izin') ||
      msg.includes('pesan (message) wajib diisi') ||
      msg.includes('melebihi batas maksimal')
    ) {
      return false;
    }

    // Fallback on timeout, rate limit, server error, network disruption
    return (
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('etimedout') ||
      msg.includes('rate limit') ||
      msg.includes('quota') ||
      msg.includes('resource exhausted') ||
      msg.includes('too many requests') ||
      msg.includes('429') ||
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504') ||
      msg.includes('bad gateway') ||
      msg.includes('service unavailable') ||
      msg.includes('gateway timeout') ||
      msg.includes('aborted') ||
      msg.includes('fetch failed') ||
      msg.includes('network') ||
      msg.includes('connection') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('socket hang up') ||
      msg.includes('overloaded') ||
      msg.includes('temporarily unavailable')
    );
  }

  /**
   * Dispatches chat execution with automatic resilient fallback
   */
  async executeChatWithFallback({
    message,
    conversation = [],
    userContext = null,
    dataContext = null,
    queryDescription = '',
    intent = 'GENERAL',
    requestedProviderId = null,
    requestedModelId = null,
    user = null,
    generationConfig = {}
  }) {
    const userRole = user ? user.role : 'MEMBER';
    const primaryRoute = await this.resolveRoute({
      intent,
      requestedProviderId,
      requestedModelId,
      userRole
    });

    if (!primaryRoute || !primaryRoute.provider) {
      throw new Error('Tidak ada AI provider yang aktif dan terkonfigurasi untuk peran Anda.');
    }

    const fallbackChain = await this.manager.getFallbackChain();
    // Exclude primary provider from fallback list to prevent duplicate attempts
    const backupCandidates = fallbackChain.filter(
      b => b.provider.id !== primaryRoute.providerId && (!b.config.allowedRoles || b.config.allowedRoles.includes(userRole))
    );

    const attempts = [
      {
        provider: primaryRoute.provider,
        providerId: primaryRoute.providerId,
        providerName: primaryRoute.providerName,
        model: primaryRoute.model,
        mode: primaryRoute.mode
      },
      ...backupCandidates.slice(0, this.settings.maxFallbackAttempts).map(b => ({
        provider: b.provider,
        providerId: b.config.id,
        providerName: b.config.name,
        model: b.config.selectedModel || b.config.defaultModel,
        mode: 'FALLBACK'
      }))
    ];

    let lastError = null;
    const executionHistory = [];

    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      const isFallback = i > 0;
      const startTime = Date.now();

      try {
        const result = await attempt.provider.chat({
          message,
          conversation,
          userContext,
          dataContext,
          queryDescription,
          model: attempt.model,
          generationConfig
        });

        const latencyMs = Date.now() - startTime;
        const cost = attempt.provider.calculateCost(
          result.usage?.prompt_tokens || 0,
          result.usage?.completion_tokens || 0,
          result.model
        );

        // Record successful usage
        await this.manager.usageTracker.recordUsage({
          providerId: attempt.providerId,
          modelId: result.model || attempt.model,
          intent,
          success: true,
          latencyMs,
          inputTokens: result.usage?.prompt_tokens || 0,
          outputTokens: result.usage?.completion_tokens || 0,
          costUsd: cost.costUsd,
          costIdr: cost.costIdr,
          userId: user?.id,
          userRole: user?.role
        });

        return {
          reply: result.reply,
          model: result.model || attempt.model,
          providerId: attempt.providerId,
          providerName: attempt.providerName,
          routingMode: attempt.mode,
          usage: result.usage,
          cost,
          fallbackOccurred: isFallback,
          originalProviderId: attempts[0].providerId,
          originalProviderName: attempts[0].providerName,
          attemptCount: i + 1,
          executionHistory
        };
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        lastError = err;
        executionHistory.push({
          providerId: attempt.providerId,
          model: attempt.model,
          error: err.message,
          latencyMs
        });

        // Record failed usage
        await this.manager.usageTracker.recordUsage({
          providerId: attempt.providerId,
          modelId: attempt.model,
          intent,
          success: false,
          latencyMs,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
          costIdr: 0,
          userId: user?.id,
          userRole: user?.role,
          error: err.message
        });

        console.warn(`[AiModelRouter] Provider ${attempt.providerId} failed:`, err.message);

        // If error is not recoverable (e.g. auth/permission), do not attempt fallbacks
        if (!this.isRecoverableError(err)) {
          throw err;
        }

        // Otherwise, continue to next backup candidate
      }
    }

    // If all providers failed, rethrow last error
    throw lastError || new Error('Seluruh penyedia AI mengalami kegagalan.');
  }
}

