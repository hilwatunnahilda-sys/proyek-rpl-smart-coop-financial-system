/**
 * Client-Side Telegram Notification Service
 * Coordinates frontend interaction with backend /api/telegram/* endpoints
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { ENV } from '../../config/env.js';
import { auth } from '../auth/authService.js';

class TelegramClientService {
  constructor() {
    this.sessionKey = ENV.AUTH.SESSION_KEY;
  }

  /**
   * Helper to retrieve active session token
   */
  _getToken() {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.sessionKey);
    }
    return null;
  }

  /**
   * Helper for authenticated fetch
   */
  async _fetchApi(endpoint, options = {}) {
    const token = this._getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Session-Token'] = token;
      try {
        const u = auth?.getUser ? auth.getUser() : null;
        if (u) {
          headers['X-Session-User-Id'] = u.id;
          headers['X-Session-User-Role'] = u.role;
        }
      } catch {}
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      ok: response.ok,
      ...data
    };
  }

  /**
   * Fetches public status of Telegram Bot (without exposing token)
   */
  async getStatus() {
    try {
      const res = await fetch('/api/telegram/status');
      return await res.json();
    } catch (e) {
      return { success: false, configured: false, error: e.message };
    }
  }

  /**
   * Gets current user's linked Telegram account and preferences
   */
  async getAccount() {
    try {
      return await this._fetchApi('/api/telegram/account');
    } catch (e) {
      return { success: false, linked: false, error: e.message };
    }
  }

  /**
   * Generates a new one-time expiring link code (OTP)
   */
  async createLinkCode() {
    try {
      return await this._fetchApi('/api/telegram/link-code', {
        method: 'POST'
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Verifies OTP code and links Telegram account (manual link fallback)
   */
  async verifyCode(code, chatId, username = '', firstName = '') {
    try {
      return await this._fetchApi('/api/telegram/verify-code', {
        method: 'POST',
        body: JSON.stringify({ code, chatId, telegramUsername: username, firstName })
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Unlinks current user's Telegram account
   */
  async unlink() {
    try {
      return await this._fetchApi('/api/telegram/unlink', {
        method: 'POST'
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Updates notification preferences
   */
  async updatePreferences(preferences = {}) {
    try {
      return await this._fetchApi('/api/telegram/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences })
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Sends a test notification to the linked Telegram account
   */
  async sendTestNotification() {
    try {
      return await this._fetchApi('/api/telegram/test-send', {
        method: 'POST'
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Dispatches a domain event notification safely and non-blockingly.
   * GUARANTEE: Never throws or interrupts core caller flow!
   * @param {string} eventType
   * @param {Object} eventData
   */
  async notifyEvent(eventType, eventData = {}) {
    // Fail-safe check: only dispatch if in browser environment or fetch is available
    if (typeof fetch === 'undefined') {
      return { success: false, skipped: true };
    }

    try {
      const res = await this._fetchApi('/api/telegram/notify-event', {
        method: 'POST',
        body: JSON.stringify({ eventType, eventData })
      });
      return res;
    } catch (err) {
      console.warn(`[TelegramClient] Non-blocking dispatch notice (${eventType}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Triggers daily/monthly executive summary report
   */
  async triggerSummaryReport(periodType = 'Harian') {
    try {
      return await this._fetchApi('/api/telegram/summary-report', {
        method: 'POST',
        body: JSON.stringify({ periodType })
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Triggers installment reminder scan and dispatch
   */
  async triggerInstallmentReminders() {
    try {
      return await this._fetchApi('/api/telegram/installment-reminders', {
        method: 'POST'
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

export const telegramClient = new TelegramClientService();
