/**
 * AI Usage & Telemetry Tracker
 * Tracks token usage, costs (USD/IDR), latencies, and success/failure metrics
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

export class AiUsageTracker {
  constructor(adapter = null) {
    this.db = adapter;
    this.memoryLogs = [];
  }

  /**
   * Set database adapter if initialized late
   * @param {object} adapter
   */
  setAdapter(adapter) {
    this.db = adapter;
  }

  /**
   * Record a single AI request interaction
   */
  async recordUsage({
    providerId,
    modelId,
    intent = 'GENERAL',
    success = true,
    latencyMs = 0,
    inputTokens = 0,
    outputTokens = 0,
    costUsd = 0,
    costIdr = 0,
    userId = null,
    userRole = null,
    error = null
  }) {
    const entry = {
      id: `usage-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      provider_id: providerId || 'unknown',
      model_id: modelId || 'unknown',
      intent: intent || 'GENERAL',
      success: Boolean(success),
      latency_ms: Number(latencyMs) || 0,
      input_tokens: Number(inputTokens) || 0,
      output_tokens: Number(outputTokens) || 0,
      total_tokens: (Number(inputTokens) || 0) + (Number(outputTokens) || 0),
      cost_usd: Number(costUsd) || 0,
      cost_idr: Number(costIdr) || 0,
      user_id: userId || 'system',
      user_role: userRole || 'GUEST',
      error: error ? String(error) : null
    };

    this.memoryLogs.push(entry);

    if (this.db && typeof this.db.insert === 'function') {
      try {
        await this.db.insert('ai_usage_logs', entry);
      } catch (err) {
        console.warn('[AiUsageTracker] Failed saving usage to DB:', err.message);
      }
    }

    return entry;
  }

  /**
   * Get all logs from DB or memory
   */
  async getLogs() {
    if (this.db && typeof this.db.getAll === 'function') {
      try {
        const dbLogs = await this.db.getAll('ai_usage_logs');
        if (Array.isArray(dbLogs) && dbLogs.length > 0) {
          return dbLogs;
        }
      } catch {
        // Fallback to memory
      }
    }
    return this.memoryLogs;
  }

  /**
   * Calculate aggregated usage analytics
   */
  async getMetrics() {
    const logs = await this.getLogs();

    let totalRequests = logs.length;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalLatency = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;
    let totalCostIdr = 0;

    const providerBreakdown = {};
    const modelBreakdown = {};

    for (const log of logs) {
      if (log.success) {
        successfulRequests++;
      } else {
        failedRequests++;
      }

      totalLatency += Number(log.latency_ms) || 0;
      totalInputTokens += Number(log.input_tokens) || 0;
      totalOutputTokens += Number(log.output_tokens) || 0;
      totalCostUsd += Number(log.cost_usd) || 0;
      totalCostIdr += Number(log.cost_idr) || 0;

      // Provider breakdown
      const pId = log.provider_id || 'unknown';
      if (!providerBreakdown[pId]) {
        providerBreakdown[pId] = {
          count: 0,
          successCount: 0,
          failCount: 0,
          tokens: 0,
          costUsd: 0,
          costIdr: 0
        };
      }
      providerBreakdown[pId].count++;
      if (log.success) providerBreakdown[pId].successCount++;
      else providerBreakdown[pId].failCount++;
      providerBreakdown[pId].tokens += (Number(log.input_tokens) || 0) + (Number(log.output_tokens) || 0);
      providerBreakdown[pId].costUsd += Number(log.cost_usd) || 0;
      providerBreakdown[pId].costIdr += Number(log.cost_idr) || 0;

      // Model breakdown
      const mId = log.model_id || 'unknown';
      if (!modelBreakdown[mId]) {
        modelBreakdown[mId] = {
          count: 0,
          tokens: 0,
          costUsd: 0,
          costIdr: 0
        };
      }
      modelBreakdown[mId].count++;
      modelBreakdown[mId].tokens += (Number(log.input_tokens) || 0) + (Number(log.output_tokens) || 0);
      modelBreakdown[mId].costUsd += Number(log.cost_usd) || 0;
      modelBreakdown[mId].costIdr += Number(log.cost_idr) || 0;
    }

    // Determine top provider
    let topProvider = '-';
    let maxPCount = 0;
    for (const [pId, data] of Object.entries(providerBreakdown)) {
      if (data.count > maxPCount) {
        maxPCount = data.count;
        topProvider = pId;
      }
    }

    // Determine top model
    let topModel = '-';
    let maxMCount = 0;
    for (const [mId, data] of Object.entries(modelBreakdown)) {
      if (data.count > maxMCount) {
        maxMCount = data.count;
        topModel = mId;
      }
    }

    const successRate = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 1000) / 10 : 100;
    const avgLatencyMs = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      avgLatencyMs,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCostUsd: Math.round(totalCostUsd * 100000) / 100000,
      totalCostIdr: Math.round(totalCostIdr * 100) / 100,
      topProvider,
      topModel,
      providerBreakdown,
      modelBreakdown,
      recentLogs: logs.slice(-25).reverse()
    };
  }
}

