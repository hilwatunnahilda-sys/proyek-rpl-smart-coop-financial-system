/**
 * AI Admin Client Service
 * Front-end service for AI Model Control Center operations
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { auth } from '../auth/authService.js';
import { ENV } from '../../config/env.js';

class AiAdminClientService {
  _getHeaders() {
    const session = auth.getSession();
    const token = session ? session.token : localStorage.getItem(ENV.AUTH.SESSION_KEY);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async getConfig() {
    const res = await fetch('/api/ai/admin/config', {
      method: 'GET',
      headers: this._getHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed fetching AI config (${res.status})`);
    }
    return data;
  }

  async updateProvider(providerId, updates) {
    const res = await fetch('/api/ai/admin/config', {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ providerId, updates })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed updating provider (${res.status})`);
    }
    return data;
  }

  async testConnection(providerId) {
    const res = await fetch('/api/ai/admin/test', {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ providerId })
    });
    const data = await res.json();
    return data;
  }

  async getUsageMetrics() {
    const res = await fetch('/api/ai/admin/usage', {
      method: 'GET',
      headers: this._getHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed fetching usage (${res.status})`);
    }
    return data.metrics;
  }

  async updateRouting(settings) {
    const res = await fetch('/api/ai/admin/routing', {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ settings })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed updating routing (${res.status})`);
    }
    return data;
  }

  async deleteProvider(providerId) {
    const res = await fetch('/api/ai/admin/delete', {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ providerId })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed deleting provider (${res.status})`);
    }
    return data;
  }
}

export const aiAdminClient = new AiAdminClientService();

