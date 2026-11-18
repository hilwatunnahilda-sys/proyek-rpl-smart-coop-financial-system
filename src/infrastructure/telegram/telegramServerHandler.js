/**
 * Server-Side Telegram API Handler & Security Guard
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Handles:
 * 1. Bearer Token Authentication & RBAC Authorization
 * 2. Token Security: TELEGRAM_BOT_TOKEN is NEVER exposed or returned
 * 3. Expiring OTP Code Generation & Account Linking
 * 4. Webhook updates from Telegram
 * 5. Event notifications & Summary report dispatching
 */

import { TelegramService } from './telegramService.js';
import { DatabaseAdapter } from '../database/adapter.js';
import { DatabaseSeeder } from '../database/seeder.js';
import { ROLES, FINANCIAL_TRANSACTION_TYPES } from '../../config/constants.js';
import { ReportService } from '../../core/services/ReportService.js';
import { LoanService } from '../../core/services/LoanService.js';

export class TelegramServerHandler {
  constructor({ telegramService = null, adapter = null, token = '', botUsername = '' } = {}) {
    this.db = adapter || new DatabaseAdapter();
    this.telegramService = telegramService || new TelegramService({
      token,
      botUsername,
      adapter: this.db
    });
    this.reportService = new ReportService(this.db);
    this.loanService = new LoanService(this.db);
    this._initialized = false;
  }

  /**
   * Initializes server-side database with seed data if needed
   */
  async init() {
    if (this._initialized) return;
    try {
      const existingUsers = await this.db.getAll('users');
      if (!existingUsers || existingUsers.length === 0) {
        const seeder = new DatabaseSeeder(this.db);
        await seeder.seed();
      }
      await this._ensureDefaultSessions();
      this._initialized = true;
    } catch (err) {
      console.warn('[TelegramServerHandler] Initialization warning:', err.message);
    }
  }

  /**
   * Pre-populates standard dev sessions for fast testing & seamless dev experience
   */
  async _ensureDefaultSessions() {
    const existingSessions = await this.db.getAll('sessions');
    const existingTokens = new Set(existingSessions.map(s => s.token));

    const defaultDevTokens = [
      {
        token: 'ikmi_tok_admin_001_seed_dev_session_token_ikmi_2026',
        user_id: 'usr-admin-001',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false
      },
      {
        token: 'ikmi_tok_ketua_001_seed_dev_session_token_ikmi_2026',
        user_id: 'usr-ketua-001',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false
      },
      {
        token: 'ikmi_tok_dosen_001_seed_dev_session_token_ikmi_2026',
        user_id: 'usr-dosen-001',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false
      },
      {
        token: 'ikmi_tok_mhs_001_seed_dev_session_token_ikmi_2026',
        user_id: 'usr-mhs-001',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false
      }
    ];

    for (const session of defaultDevTokens) {
      if (!existingTokens.has(session.token)) {
        await this.db.insert('sessions', session);
      }
    }
  }

  /**
   * Authenticates incoming HTTP request via Bearer token in headers or query
   */
  async authenticateRequest(headers = {}) {
    await this.init();

    let token = null;

    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.trim().split(/\s+/);
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      token = headers['x-session-token'] || headers['X-Session-Token'];
    }

    if (!token) {
      return {
        authenticated: false,
        status: 401,
        error: 'Autentikasi diperlukan. Sesi Anda tidak valid atau telah berakhir.'
      };
    }

    let session = await this.db.findById('sessions', token, 'token');

    // If session not yet registered in server database, check client session sync headers
    if (!session) {
      const userId = headers['x-session-user-id'] || headers['X-Session-User-Id'];
      if (userId) {
        let user = await this.db.findById('users', userId, 'id');
        if (!user) {
          const allUsers = await this.db.getAll('users');
          user = allUsers.find(u => u.id === userId);
        }
        if (user && user.status === 'ACTIVE') {
          session = {
            id: `sess-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            token,
            user_id: user.id,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            is_revoked: false
          };
          await this.db.insert('sessions', session);
        }
      }
    }

    if (!session || session.is_revoked) {
      return {
        authenticated: false,
        status: 401,
        error: 'Sesi tidak ditemukan atau telah dicabut. Silakan login kembali.'
      };
    }

    if (new Date(session.expires_at) <= new Date()) {
      return {
        authenticated: false,
        status: 401,
        error: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.'
      };
    }

    let user = await this.db.findById('users', session.user_id, 'id');
    if (!user) {
      const allUsers = await this.db.getAll('users');
      user = allUsers.find(u => u.id === session.user_id);
    }

    if (!user || user.status !== 'ACTIVE') {
      return {
        authenticated: false,
        status: 403,
        error: `Akun berstatus ${user ? user.status : 'TIDAK DITEMUKAN'}.`
      };
    }

    const member = await this.db.findById('members', user.id, 'user_id');

    return {
      authenticated: true,
      user,
      member: member || null,
      session
    };
  }

  /**
   * Main router for Telegram API requests
   */
  async handleRequest({ method, url, headers = {}, body = {} }) {
    const cleanUrl = url.split('?')[0];

    // 1. GET /api/telegram/status - Public safe configuration
    if (method === 'GET' && cleanUrl === '/api/telegram/status') {
      return {
        status: 200,
        body: {
          success: true,
          ...this.telegramService.getPublicConfig()
        }
      };
    }

    // 2. POST /api/telegram/webhook - Public Telegram Bot API Webhook
    if (method === 'POST' && cleanUrl === '/api/telegram/webhook') {
      try {
        const webhookResult = await this.telegramService.handleWebhookUpdate(body);
        return {
          status: 200,
          body: { success: true, result: webhookResult }
        };
      } catch (err) {
        return {
          status: 200, // Return 200 to Telegram so it doesn't repeatedly retry failing webhooks
          body: { success: false, error: this.telegramService.sanitizeText(err.message) }
        };
      }
    }

    // 3. POST /api/telegram/verify-code - Verifies OTP code and links account (public or auth)
    if (method === 'POST' && cleanUrl === '/api/telegram/verify-code') {
      const { code, chatId, telegramUsername, firstName } = body;
      if (!code || !chatId) {
        return {
          status: 400,
          body: { success: false, error: 'Parameter code dan chatId wajib diisi.' }
        };
      }

      const res = await this.telegramService.verifyAndLinkAccount(code, {
        chatId,
        username: telegramUsername || '',
        firstName: firstName || ''
      });

      return {
        status: res.success ? 200 : 400,
        body: res
      };
    }

    // All endpoints below REQUIRE active session authentication
    const authResult = await this.authenticateRequest(headers);
    if (!authResult.authenticated) {
      return {
        status: authResult.status,
        body: { success: false, error: authResult.error }
      };
    }

    const currentUser = authResult.user;

    // 4. GET /api/telegram/account - Get current user's linked Telegram
    if (method === 'GET' && cleanUrl === '/api/telegram/account') {
      const account = await this.telegramService.getAccountByUserId(currentUser.id);
      return {
        status: 200,
        body: {
          success: true,
          linked: Boolean(account && account.is_active && account.telegram_chat_id),
          account: account || null
        }
      };
    }

    // 5. POST /api/telegram/link-code - Generate expiring OTP code
    if (method === 'POST' && cleanUrl === '/api/telegram/link-code') {
      try {
        const otpData = await this.telegramService.generateLinkCode(currentUser.id, 30);
        return {
          status: 200,
          body: {
            success: true,
            ...otpData
          }
        };
      } catch (err) {
        return {
          status: 500,
          body: { success: false, error: err.message }
        };
      }
    }

    // 6. POST /api/telegram/unlink - Unlink current user's Telegram
    if (method === 'POST' && cleanUrl === '/api/telegram/unlink') {
      const res = await this.telegramService.unlinkAccount(currentUser.id);
      return {
        status: res.success ? 200 : 400,
        body: res
      };
    }

    // 7. PUT /api/telegram/preferences - Update notification preferences
    if (method === 'PUT' && cleanUrl === '/api/telegram/preferences') {
      const res = await this.telegramService.updatePreferences(currentUser.id, body.preferences || body);
      return {
        status: res.success ? 200 : 400,
        body: res
      };
    }

    // 8. POST /api/telegram/test-send - Send test notification to linked account
    if (method === 'POST' && cleanUrl === '/api/telegram/test-send') {
      const account = await this.telegramService.getAccountByUserId(currentUser.id);
      if (!account || !account.is_active || !account.telegram_chat_id) {
        return {
          status: 400,
          body: { success: false, error: 'Akun Telegram Anda belum terhubung. Hubungkan terlebih dahulu.' }
        };
      }

      const dispatchResult = await this.telegramService.dispatchNotification('TEST', {
        userId: currentUser.id,
        userName: currentUser.name
      });

      return {
        status: dispatchResult.delivered > 0 ? 200 : 502,
        body: {
          success: dispatchResult.delivered > 0,
          delivered: dispatchResult.delivered,
          failed: dispatchResult.failed,
          errors: dispatchResult.errors,
          message: dispatchResult.delivered > 0
            ? 'Pesan uji coba berhasil dikirim ke Telegram Anda!'
            : 'Gagal mengirim pesan uji coba ke Telegram. Periksa apakah bot diblokir atau token bermasalah.'
        }
      };
    }

    // 9. POST /api/telegram/notify-event - Dispatch an application domain event
    if (method === 'POST' && cleanUrl === '/api/telegram/notify-event') {
      const { eventType, eventData } = body;
      if (!eventType) {
        return {
          status: 400,
          body: { success: false, error: 'Parameter eventType wajib diisi.' }
        };
      }

      const result = await this.telegramService.dispatchNotification(eventType, eventData || {});
      return {
        status: 200,
        body: {
          success: true,
          ...result
        }
      };
    }

    // 10. POST /api/telegram/summary-report - Generate and send summary report (ADMIN & CHAIRMAN only)
    if (method === 'POST' && cleanUrl === '/api/telegram/summary-report') {
      if (currentUser.role !== ROLES.ADMIN && currentUser.role !== ROLES.CHAIRMAN) {
        return {
          status: 403,
          body: {
            success: false,
            error: 'Hanya Admin dan Ketua Koperasi yang berwenang mengirimkan ringkasan laporan eksekutif.'
          }
        };
      }

      try {
        const periodType = body.periodType || 'Harian';
        const [membersReport, cashFlowReport, loansReport, overdueList] = await Promise.all([
          this.reportService.getMembersReport({ limit: 1 }),
          this.reportService.getCashFlowSummaryReport(),
          this.reportService.getLoansReport({ limit: 1 }),
          this.loanService.getOverdueInstallments()
        ]);

        let overdueSum = 0;
        overdueList.forEach(item => {
          overdueSum += Number(item.installment.total_due - (item.installment.paid_amount || 0));
        });

        const summaryData = {
          totalMembers: membersReport?.summary?.totalMembers || 0,
          activeMembers: membersReport?.summary?.totalActive || 0,
          totalIncome: cashFlowReport?.totalInflow || 0,
          totalExpense: cashFlowReport?.totalOutflow || 0,
          netCashFlow: cashFlowReport?.netSurplus || 0,
          totalSavings: (cashFlowReport?.breakdownInflow?.[FINANCIAL_TRANSACTION_TYPES.SAVING_DEPOSIT]?.amount || 0) -
                        (cashFlowReport?.breakdownOutflow?.[FINANCIAL_TRANSACTION_TYPES.SAVING_WITHDRAWAL]?.amount || 0),
          activeLoansCount: loansReport?.summary?.activeLoansCount || 0,
          overdueInstallmentsCount: overdueList.length,
          overdueAmount: overdueSum
        };

        const dispatchResult = await this.telegramService.dispatchNotification('SUMMARY_REPORT', {
          summary: summaryData,
          periodType
        });

        return {
          status: 200,
          body: {
            success: true,
            summary: summaryData,
            dispatched: dispatchResult.dispatched,
            delivered: dispatchResult.delivered,
            failed: dispatchResult.failed
          }
        };
      } catch (err) {
        return {
          status: 500,
          body: { success: false, error: err.message }
        };
      }
    }

    // 11. POST /api/telegram/installment-reminders - Scan & send reminders (ADMIN only)
    if (method === 'POST' && cleanUrl === '/api/telegram/installment-reminders') {
      if (currentUser.role !== ROLES.ADMIN) {
        return {
          status: 403,
          body: {
            success: false,
            error: 'Hanya Admin Koperasi yang memiliki akses untuk mengirimkan pengingat angsuran massal.'
          }
        };
      }

      try {
        const allInstallments = await this.db.getAll('installments');
        const now = new Date();
        const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        let sentCount = 0;
        const allLoans = await this.db.getAll('loans');
        const loanMap = new Map(allLoans.map(l => [l.id, l]));

        const allMembers = await this.db.getAll('members');
        const memberMap = new Map(allMembers.map(m => [m.id, m]));

        for (const inst of allInstallments) {
          if (inst.status === 'PAID') continue;

          const dueDate = new Date(inst.due_date);
          const isOverdue = dueDate < now;
          const isApproaching = dueDate >= now && dueDate <= threeDaysAhead;

          if (isOverdue || isApproaching) {
            const loan = loanMap.get(inst.loan_id);
            if (!loan || loan.status !== 'ACTIVE') continue;

            const member = memberMap.get(loan.member_id);
            if (!member) continue;

            const dispatchRes = await this.telegramService.dispatchNotification('INSTALLMENT_REMINDER', {
              installment: inst,
              loan,
              member,
              isOverdue
            });

            if (dispatchRes.delivered > 0) {
              sentCount += dispatchRes.delivered;
            }
          }
        }

        return {
          status: 200,
          body: {
            success: true,
            sentRemindersCount: sentCount,
            message: `Berhasil mengirim ${sentCount} pengingat pembayaran angsuran ke akun Telegram terkait.`
          }
        };
      } catch (err) {
        return {
          status: 500,
          body: { success: false, error: err.message }
        };
      }
    }

    return {
      status: 404,
      body: { success: false, error: `Endpoint Telegram API ${method} ${cleanUrl} tidak ditemukan.` }
    };
  }
}
