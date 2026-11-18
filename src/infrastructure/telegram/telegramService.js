/**
 * Telegram Bot Notification Backend Service
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Features:
 * 1. Strict Token Security: TELEGRAM_BOT_TOKEN is NEVER exposed to frontend, client, logs, or error responses.
 * 2. Asynchronous, Non-Blocking Message Dispatching with failure resilience (financial transactions NEVER fail if Telegram is down).
 * 3. Secure One-Time Expiring Code (OTP) Account Linking Lifecycle.
 * 4. Granular RBAC Recipient Isolation: Admin, Chairman, and Member only receive authorized alerts.
 * 5. Full Notification Coverage:
 *    - New Member Registered (Anggota baru terdaftar)
 *    - Loan Application & Status Changes (Pengajuan & perubahan status pinjaman)
 *    - Savings & Financial Transactions Successful (Simpanan & transaksi berhasil)
 *    - Installment Payment Reminders (Pengingat pembayaran angsuran)
 *    - Daily & Monthly Executive Summary Reports (Ringkasan laporan harian/bulanan)
 */

import { DatabaseAdapter } from '../database/adapter.js';
import { ROLES, INSTITUTION, LOAN_STATUS } from '../../config/constants.js';

export class TelegramService {
  /**
   * @param {Object} options
   * @param {string} [options.token] - Telegram Bot API Token
   * @param {string} [options.botUsername] - Telegram Bot Username (without @)
   * @param {DatabaseAdapter} [options.adapter] - Database storage adapter
   * @param {Function} [options.fetchFn] - Custom fetch function for testing / mocking
   */
  constructor({ token = '', botUsername = '', adapter = null, fetchFn = null } = {}) {
    this._token = token || (typeof process !== 'undefined' ? process.env?.TELEGRAM_BOT_TOKEN : '') || '';
    this._botUsername = botUsername || (typeof process !== 'undefined' ? process.env?.TELEGRAM_BOT_USERNAME : '') || '';
    this.db = adapter || new DatabaseAdapter();
    this.fetch = fetchFn || (typeof globalThis !== 'undefined' && globalThis.fetch ? globalThis.fetch.bind(globalThis) : null);
    this.apiBaseUrl = 'https://api.telegram.org';
    this._isPolling = false;
    this._pollOffset = 0;
  }

  /**
   * Sanitizes strings, URLs and error messages to ensure bot token is NEVER printed or leaked
   * @param {string} text
   * @returns {string}
   */
  sanitizeText(text) {
    if (!text) return '';
    let sanitized = String(text);
    if (this._token && this._token.length > 5) {
      sanitized = sanitized.replaceAll(this._token, '[REDACTED_TELEGRAM_TOKEN]');
    }
    // Also catch any generic Telegram bot token patterns: bot<digits>:<alphanumeric>
    sanitized = sanitized.replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot[REDACTED_TELEGRAM_TOKEN]');
    return sanitized;
  }

  /**
   * Checks if Telegram Bot is configured with a valid token
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(this._token && this._token.trim().length > 0 && this._token !== 'your_telegram_bot_token_here');
  }

  /**
   * Public-safe configuration metadata for clients (NEVER returns token!)
   */
  getPublicConfig() {
    return {
      configured: this.isConfigured(),
      botUsername: this._botUsername ? this._botUsername.replace(/^@/, '') : '',
      deepLinkBase: this._botUsername ? `https://t.me/${this._botUsername.replace(/^@/, '')}` : null
    };
  }

  /**
   * Sends HTTP request to Telegram Bot API with token redaction in all catch blocks
   * @param {string} method
   * @param {Object} payload
   */
  async _callApi(method, payload = {}) {
    if (!this.isConfigured()) {
      return {
        ok: false,
        error: 'Telegram Bot Token belum dikonfigurasi di backend (.env).'
      };
    }

    if (!this.fetch) {
      return {
        ok: false,
        error: 'Fetch API tidak tersedia di environment runtime ini.'
      };
    }

    const endpoint = `${this.apiBaseUrl}/bot${this._token}/${method}`;

    try {
      const response = await this.fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { ok: false, description: responseText };
      }

      if (!response.ok || !data.ok) {
        const errorDesc = this.sanitizeText(data.description || `HTTP ${response.status}: ${response.statusText}`);
        return {
          ok: false,
          status: response.status,
          error: errorDesc
        };
      }

      return {
        ok: true,
        result: data.result
      };
    } catch (err) {
      const sanitizedError = this.sanitizeText(err.message || String(err));
      return {
        ok: false,
        error: `Gagal menghubungi Telegram Bot API: ${sanitizedError}`
      };
    }
  }

  /**
   * Sends a message to a Telegram chat
   * @param {string|number} chatId
   * @param {string} text
   * @param {Object} [options]
   */
  async sendMessage(chatId, text, { parseMode = 'HTML', disableWebPagePreview = true } = {}) {
    if (!chatId) {
      return { ok: false, error: 'Chat ID tidak valid.' };
    }

    const res = await this._callApi('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview
    });

    return res;
  }

  /**
   * Verifies bot credentials using getMe endpoint
   */
  async verifyCredentials() {
    if (!this.isConfigured()) {
      return { ok: false, error: 'TELEGRAM_BOT_TOKEN belum disetel.' };
    }
    const res = await this._callApi('getMe');
    if (res.ok && res.result) {
      if (!this._botUsername && res.result.username) {
        this._botUsername = res.result.username;
      }
      return {
        ok: true,
        bot: {
          id: res.result.id,
          username: res.result.username,
          firstName: res.result.first_name
        }
      };
    }
    return res;
  }

  // =========================================================================
  // TELEGRAM LONG POLLING WORKER (FOR LOCALHOST & DEV REAL-TIME RESPONSE)
  // =========================================================================

  /**
   * Starts background long polling loop to receive messages on localhost
   * @param {Object} [options]
   * @param {number} [options.timeoutSeconds=15]
   */
  async startPolling({ timeoutSeconds = 15 } = {}) {
    if (this._isPolling || !this.isConfigured() || !this.fetch) return;
    this._isPolling = true;

    // Delete any lingering webhook so Telegram Bot API allows getUpdates
    try {
      await this._callApi('deleteWebhook', { drop_pending_updates: false });
      console.log(`[Telegram Polling] Webhook disabled. Background long-polling activated for @${this._botUsername || 'bot'}.`);
    } catch (e) {
      console.warn('[Telegram Polling] deleteWebhook warning:', e.message);
    }

    const poll = async () => {
      while (this._isPolling) {
        try {
          const res = await this._callApi('getUpdates', {
            offset: this._pollOffset,
            timeout: timeoutSeconds,
            allowed_updates: ['message']
          });

          if (res.ok && Array.isArray(res.result)) {
            for (const update of res.result) {
              this._pollOffset = update.update_id + 1;
              try {
                await this.handleWebhookUpdate(update);
              } catch (handleErr) {
                console.error('[Telegram Polling] Error handling update:', handleErr.message);
              }
            }
          } else if (!res.ok) {
            await new Promise(r => setTimeout(r, 2000));
          }
        } catch {
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    };

    poll().catch(err => {
      console.error('[Telegram Polling Worker Error]:', err);
      this._isPolling = false;
    });
  }

  stopPolling() {
    this._isPolling = false;
    console.log('[Telegram Polling] Stopped.');
  }

  // =========================================================================
  // SECURE ONE-TIME EXPIRING CODE (OTP) LINKING LIFECYCLE
  // =========================================================================

  /**
   * Generates a 6-8 character random alphanumeric OTP code
   */
  _generateOtpCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'IKMI-';
    for (let i = 0; i < 6; i++) {
      const randIndex = Math.floor(Math.random() * chars.length);
      code += chars[randIndex];
    }
    return code;
  }

  /**
   * Creates an expiring one-time link code for a user (valid 30 minutes)
   * @param {string} userId
   * @param {number} [ttlMinutes=30]
   */
  async generateLinkCode(userId, ttlMinutes = 30) {
    if (!userId) {
      throw new Error('User ID wajib disertakan untuk membuat kode verifikasi Telegram.');
    }

    // Invalidate any existing unused codes for this user
    const existingCodes = await this.db.find('telegram_link_codes', { user_id: userId, used: false });
    for (const codeRecord of existingCodes) {
      await this.db.update('telegram_link_codes', codeRecord.id, { used: true });
    }

    const code = this._generateOtpCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();

    const linkCodeRecord = {
      id: `tlc-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      user_id: userId,
      code,
      created_at: now.toISOString(),
      expires_at: expiresAt,
      used: false,
      used_at: null
    };

    await this.db.insert('telegram_link_codes', linkCodeRecord);

    const botUser = this._botUsername ? this._botUsername.replace(/^@/, '') : '';
    const deepLink = botUser ? `https://t.me/${botUser}?start=${code}` : null;

    return {
      code,
      expiresAt,
      expiresInMinutes: ttlMinutes,
      deepLink,
      botUsername: botUser
    };
  }

  /**
   * Verifies OTP code and links Telegram account to the user
   * @param {string} code - The OTP code
   * @param {Object} telegramInfo - { chatId, username, firstName }
   */
  async verifyAndLinkAccount(code, { chatId, username = '', firstName = '' } = {}) {
    if (!code || typeof code !== 'string') {
      return { success: false, error: 'Kode verifikasi tidak boleh kosong.' };
    }
    if (!chatId) {
      return { success: false, error: 'Chat ID Telegram tidak valid.' };
    }

    const normalizedCode = code.trim().toUpperCase();
    const records = await this.db.find('telegram_link_codes', { code: normalizedCode });

    if (!records || records.length === 0) {
      return {
        success: false,
        error: 'Kode verifikasi tidak ditemukan atau salah. Pastikan kode diketik dengan benar.'
      };
    }

    const linkRecord = records[0];

    if (linkRecord.used) {
      return {
        success: false,
        error: 'Kode verifikasi ini sudah pernah digunakan. Silakan buat kode baru di aplikasi.'
      };
    }

    const now = new Date();
    if (new Date(linkRecord.expires_at) < now) {
      return {
        success: false,
        error: `Kode verifikasi ${normalizedCode} telah kedaluwarsa. Silakan minta kode baru di aplikasi Smart Co-op.`
      };
    }

    // Verify user existence in database
    let user = await this.db.findById('users', linkRecord.user_id);
    if (!user) {
      const allUsers = await this.db.getAll('users');
      user = allUsers.find(u => u.id === linkRecord.user_id);
    }
    if (!user) {
      return {
        success: false,
        error: 'Akun pengguna terkait tidak ditemukan dalam basis data sistem.'
      };
    }

    // Mark code as used
    await this.db.update('telegram_link_codes', linkRecord.id, {
      used: true,
      used_at: now.toISOString()
    });

    // Check if account already exists in telegram_accounts
    const existingAccounts = await this.db.find('telegram_accounts', { user_id: user.id });
    let accountRecord;

    if (existingAccounts && existingAccounts.length > 0) {
      accountRecord = await this.db.update('telegram_accounts', existingAccounts[0].id, {
        telegram_chat_id: String(chatId),
        telegram_username: username ? username.replace(/^@/, '') : existingAccounts[0].telegram_username,
        first_name: firstName || existingAccounts[0].first_name,
        linked_at: now.toISOString(),
        is_active: true,
        updated_at: now.toISOString()
      });
    } else {
      accountRecord = {
        id: `tga-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        user_id: user.id,
        telegram_chat_id: String(chatId),
        telegram_username: username ? username.replace(/^@/, '') : '',
        first_name: firstName || user.name,
        linked_at: now.toISOString(),
        is_active: true,
        notify_new_member: true,
        notify_loan_updates: true,
        notify_transactions: true,
        notify_installment_reminders: true,
        notify_reports_summary: true,
        updated_at: now.toISOString()
      };
      await this.db.insert('telegram_accounts', accountRecord);
    }

    // Send confirmation welcome message to Telegram chat
    const welcomeMessage = [
      `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
      `🎉 <b>Koneksi Akun Berhasil!</b>`,
      ``,
      `Halo <b>${user.name}</b>,`,
      `Akun Telegram Anda telah berhasil terhubung dengan sistem <b>Smart Co-op STMIK IKMI Cirebon</b>.`,
      ``,
      `• <b>Peran Akun:</b> ${user.role}`,
      `• <b>Email:</b> ${user.email}`,
      `• <b>Waktu Terhubung:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
      ``,
      `🔔 <i>Anda sekarang akan menerima notifikasi otomatis untuk transaksi, pinjaman, dan laporan sesuai dengan hak akses Anda.</i>`,
      ``,
      `Ketik /status untuk melihat status akun atau /help untuk daftar perintah.`
    ].join('\n');

    await this.sendMessage(chatId, welcomeMessage);

    return {
      success: true,
      account: accountRecord,
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    };
  }

  /**
   * Retrieves linked Telegram account by user ID
   * @param {string} userId
   */
  async getAccountByUserId(userId) {
    if (!userId) return null;
    const records = await this.db.find('telegram_accounts', { user_id: userId });
    return records && records.length > 0 ? records[0] : null;
  }

  /**
   * Unlinks Telegram account for a user
   * @param {string} userId
   */
  async unlinkAccount(userId) {
    if (!userId) return { success: false, error: 'User ID tidak valid.' };
    const records = await this.db.find('telegram_accounts', { user_id: userId });
    if (!records || records.length === 0) {
      return { success: false, error: 'Akun Telegram tidak ditemukan.' };
    }

    const account = records[0];
    await this.db.update('telegram_accounts', account.id, {
      is_active: false,
      telegram_chat_id: '',
      updated_at: new Date().toISOString()
    });

    if (account.telegram_chat_id) {
      const farewellMsg = [
        `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
        `⚠️ <b>Koneksi Akun Diputuskan</b>`,
        ``,
        `Akun Telegram ini telah diputuskan hubungannya dari sistem koperasi. Anda tidak akan lagi menerima notifikasi.`,
        `Untuk menghubungkan kembali, silakan buat kode verifikasi baru melalui aplikasi Smart Co-op.`
      ].join('\n');
      await this.sendMessage(account.telegram_chat_id, farewellMsg);
    }

    return { success: true, message: 'Akun Telegram berhasil diputuskan.' };
  }

  /**
   * Updates notification preferences for a user
   * @param {string} userId
   * @param {Object} preferences
   */
  async updatePreferences(userId, preferences = {}) {
    const account = await this.getAccountByUserId(userId);
    if (!account) {
      return { success: false, error: 'Akun Telegram belum terhubung.' };
    }

    const updated = await this.db.update('telegram_accounts', account.id, {
      notify_new_member: preferences.notify_new_member ?? account.notify_new_member ?? true,
      notify_loan_updates: preferences.notify_loan_updates ?? account.notify_loan_updates ?? true,
      notify_transactions: preferences.notify_transactions ?? account.notify_transactions ?? true,
      notify_installment_reminders: preferences.notify_installment_reminders ?? account.notify_installment_reminders ?? true,
      notify_reports_summary: preferences.notify_reports_summary ?? account.notify_reports_summary ?? true,
      updated_at: new Date().toISOString()
    });

    return { success: true, account: updated };
  }

  // =========================================================================
  // RBAC RECIPIENT RESOLUTION & MESSAGE FORMATTING
  // =========================================================================

  /**
   * Resolves list of eligible linked Telegram recipients for a specific event based on RBAC
   * @param {string} eventType - NEW_MEMBER, LOAN_APPLICATION, LOAN_STATUS_CHANGE, TRANSACTION_SUCCESS, INSTALLMENT_REMINDER, SUMMARY_REPORT
   * @param {Object} contextData - Event payload context
   * @returns {Promise<Array<{ account: Object, user: Object, role: string }>>}
   */
  async getRecipientsForEvent(eventType, contextData = {}) {
    const allLinkedAccounts = await this.db.find('telegram_accounts', { is_active: true });
    if (!allLinkedAccounts || allLinkedAccounts.length === 0) {
      return [];
    }

    const recipients = [];
    const allUsers = await this.db.getAll('users');
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    for (const account of allLinkedAccounts) {
      if (!account.telegram_chat_id) continue;
      const user = userMap.get(account.user_id);
      if (!user || user.status !== 'ACTIVE') continue;

      const role = (user.role || '').toUpperCase();
      let isEligible = false;

      switch (eventType) {
        // 1. Anggota Baru Terdaftar: Hanya Admin Koperasi
        case 'NEW_MEMBER':
          if (role === ROLES.ADMIN && account.notify_new_member !== false) {
            isEligible = true;
          }
          break;

        // 2. Pengajuan Pinjaman: Admin & Chairman (Ketua memiliki wewenang persetujuan)
        case 'LOAN_APPLICATION':
          if ((role === ROLES.ADMIN || role === ROLES.CHAIRMAN) && account.notify_loan_updates !== false) {
            isEligible = true;
          }
          break;

        // 3. Perubahan Status Pinjaman (Approved, Rejected, Disbursed, Paid Off)
        case 'LOAN_STATUS_CHANGE':
          // A. The borrower Member itself (strictly their own loan!)
          if (contextData.borrowerUserId === user.id && account.notify_loan_updates !== false) {
            isEligible = true;
          }
          // B. Admin & Chairman for operational tracking & executive oversight
          if ((role === ROLES.ADMIN || role === ROLES.CHAIRMAN) && account.notify_loan_updates !== false) {
            isEligible = true;
          }
          break;

        // 4. Simpanan & Transaksi Keuangan Berhasil
        case 'TRANSACTION_SUCCESS':
          // A. The member owner of the transaction
          if (contextData.memberUserId === user.id && account.notify_transactions !== false) {
            isEligible = true;
          }
          // B. Admin for general ledger & system recording
          if (role === ROLES.ADMIN && account.notify_transactions !== false) {
            isEligible = true;
          }
          break;

        // 5. Pengingat Pembayaran Angsuran
        case 'INSTALLMENT_REMINDER':
          // A. The borrower Member
          if (contextData.borrowerUserId === user.id && account.notify_installment_reminders !== false) {
            isEligible = true;
          }
          // B. Admin for monitoring overdue accounts
          if (role === ROLES.ADMIN && contextData.isOverdue && account.notify_installment_reminders !== false) {
            isEligible = true;
          }
          break;

        // 6. Ringkasan Laporan Harian / Bulanan
        case 'SUMMARY_REPORT':
          // Strictly ADMIN and CHAIRMAN (who hold REPORTS_VIEW permission)
          if ((role === ROLES.ADMIN || role === ROLES.CHAIRMAN) && account.notify_reports_summary !== false) {
            isEligible = true;
          }
          break;

        case 'TEST':
          // Test ping to the specific requesting user
          if (contextData.userId === user.id) {
            isEligible = true;
          }
          break;

        default:
          isEligible = false;
      }

      if (isEligible) {
        recipients.push({ account, user, role });
      }
    }

    return recipients;
  }

  // =========================================================================
  // MESSAGE FORMATTERS (INSTITUTIONAL BRANDING)
  // =========================================================================

  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return `Rp ${num.toLocaleString('id-ID')}`;
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return String(dateStr);
    }
  }

  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      }) + ' WIB';
    } catch {
      return String(dateStr);
    }
  }

  formatNewMemberMessage(member) {
    return [
      `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
      `📋 <b>Notifikasi: Anggota Baru Terdaftar</b>`,
      ``,
      `Halo Admin, terdapat anggota baru yang telah didaftarkan ke sistem:`,
      `• <b>Nomor Anggota:</b> <code>${member.member_number || '-'}</code>`,
      `• <b>Nama Lengkap:</b> <b>${member.full_name || '-'}</b>`,
      `• <b>Tipe Anggota:</b> ${member.member_type || '-'}`,
      `• <b>Nomor Identitas:</b> ${member.identity_number || '-'}`,
      `• <b>Nomor Telepon:</b> ${member.phone || '-'}`,
      `• <b>Tanggal Bergabung:</b> ${this.formatDate(member.join_date || member.created_at)}`,
      ``,
      `<i>Status keanggotaan aktif dan siap melakukan transaksi simpan pinjam.</i>`
    ].join('\n');
  }

  formatLoanApplicationMessage(loan, member) {
    return [
      `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
      `💳 <b>Pemberitahuan: Pengajuan Pinjaman Baru</b>`,
      ``,
      `Terdapat pengajuan pinjaman baru yang memerlukan review dan persetujuan:`,
      `• <b>Nomor Pinjaman:</b> <code>${loan.loan_number || '-'}</code>`,
      `• <b>Nama Peminjam:</b> <b>${member.full_name || member.name || '-'}</b>`,
      `• <b>Nomor Anggota:</b> <code>${member.member_number || '-'}</code>`,
      `• <b>Plafon Pinjaman:</b> <b>${this.formatCurrency(loan.principal_amount)}</b>`,
      `• <b>Tenor:</b> ${loan.tenure} Bulan`,
      `• <b>Jenis Perhitungan:</b> ${loan.interest_type} (${loan.interest_rate}% / tahun)`,
      `• <b>Estimasi Total Pengembalian:</b> ${this.formatCurrency(loan.total_repayment)}`,
      `• <b>Tujuan Pinjaman:</b> ${loan.purpose || '-'}`,
      `• <b>Status Saat Ini:</b> ⏳ <b>MENUNGGU PERSETUJUAN (PENDING)</b>`,
      ``,
      `<i>Silakan masuk ke Konsol Pinjaman untuk meninjau kelayakan dan memberikan persetujuan.</i>`
    ].join('\n');
  }

  formatLoanStatusChangeMessage(loan, member, previousStatus, newStatus, notesOrReason = '') {
    let statusBadge = newStatus;
    let icon = '📢';

    if (newStatus === LOAN_STATUS.APPROVED) {
      statusBadge = '✅ DISETUJUI (APPROVED)';
      icon = '🎉';
    } else if (newStatus === LOAN_STATUS.REJECTED) {
      statusBadge = '❌ DITOLAK (REJECTED)';
      icon = '⚠️';
    } else if (newStatus === LOAN_STATUS.ACTIVE || newStatus === LOAN_STATUS.DISBURSED) {
      statusBadge = '💰 DICAIRKAN & AKTIF (DISBURSED)';
      icon = '💵';
    } else if (newStatus === LOAN_STATUS.PAID_OFF) {
      statusBadge = '🌟 LUNAS PENUH (PAID OFF)';
      icon = '🏆';
    } else if (newStatus === LOAN_STATUS.CANCELLED) {
      statusBadge = '🚫 DIBATALKAN (CANCELLED)';
      icon = '⛔';
    }

    const lines = [
      `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
      `${icon} <b>Pembaruan Status Pinjaman</b>`,
      ``,
      `Status pinjaman berikut telah diperbarui dalam sistem:`,
      `• <b>Nomor Pinjaman:</b> <code>${loan.loan_number || '-'}</code>`,
      `• <b>Peminjam:</b> <b>${member.full_name || member.name || '-'}</b>`,
      `• <b>Plafon Pinjaman:</b> ${this.formatCurrency(loan.principal_amount)}`,
      `• <b>Status Sebelumnya:</b> ${previousStatus || 'PENDING'}`,
      `• <b>Status Terkini:</b> <b>${statusBadge}</b>`
    ];

    if (notesOrReason) {
      lines.push(`• <b>Keterangan / Alasan:</b> ${notesOrReason}`);
    }

    lines.push(``);
    lines.push(`• <b>Waktu Pembaruan:</b> ${this.formatDateTime(new Date())}`);
    lines.push(``);
    lines.push(`<i>Koperasi Civitas Akademika STMIK IKMI Cirebon &bull; Transparan & Akuntabel</i>`);

    return lines.join('\n');
  }

  formatTransactionSuccessMessage(trx, member) {
    const isIncome = trx.flow === 'IN' || trx.transaction_type === 'DEPOSIT' || trx.transaction_type === 'SAVING_DEPOSIT' || trx.transaction_type === 'INSTALLMENT_PAYMENT';
    const flowIcon = isIncome ? '📥' : '📤';

    return [
      `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
      `💰 <b>Bukti Transaksi Keuangan Berhasil</b>`,
      ``,
      `Transaksi keuangan telah berhasil dicatatkan ke dalam buku kas koperasi:`,
      `• <b>Nomor Bukti:</b> <code>${trx.transaction_number || trx.id || '-'}</code>`,
      `• <b>Jenis Transaksi:</b> <b>${trx.transaction_type || 'TRANSAKSI'}</b>`,
      `• <b>Aliran Dana:</b> ${flowIcon} ${trx.flow === 'IN' ? 'KAS MASUK (IN)' : 'KAS KELUAR (OUT)'}`,
      `• <b>Nominal:</b> <b>${this.formatCurrency(trx.amount)}</b>`,
      member ? `• <b>Anggota Terkait:</b> ${member.full_name || member.name} (${member.member_number || '-'})` : `• <b>Kategori:</b> ${trx.category || 'Operasional'}`,
      `• <b>Deskripsi:</b> ${trx.description || '-'}`,
      `• <b>Waktu Transaksi:</b> ${this.formatDateTime(trx.transaction_date || trx.created_at || new Date())}`,
      `• <b>Status Pencatatan:</b> 🟢 <b>BERHASIL (MUTASI RESMI)</b>`,
      ``,
      `<i>Pemberitahuan ini merupakan bukti pencatatan digital sah sistem keuangan Smart Co-op.</i>`
    ].join('\n');
  }

  formatInstallmentReminderMessage(installment, loan, member, isOverdue = false) {
    const icon = isOverdue ? '🚨' : '⏰';
    const statusText = isOverdue ? '🔴 <b>TELAH MELEWATI JATUH TEMPO (MENUNGGAK)</b>' : '⚠️ <b>MENDEKATI JATUH TEMPO</b>';

    return [
      `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
      `${icon} <b>Pengingat Pembayaran Angsuran Pinjaman</b>`,
      ``,
      `Yth. <b>${member.full_name || member.name}</b> (${member.member_number || '-'}),`,
      `Berikut adalah rincian tagihan angsuran pinjaman Anda:`,
      `• <b>Nomor Pinjaman:</b> <code>${loan.loan_number || '-'}</code>`,
      `• <b>Angsuran Ke:</b> ${installment.installment_number} dari ${loan.tenure} Bulan`,
      `• <b>Tanggal Jatuh Tempo:</b> <b>${this.formatDate(installment.due_date)}</b>`,
      `• <b>Pokok Angsuran:</b> ${this.formatCurrency(installment.principal)}`,
      `• <b>Bunga Angsuran:</b> ${this.formatCurrency(installment.interest)}`,
      `• <b>Total Tagihan Bulan Ini:</b> <b>${this.formatCurrency(installment.total_due)}</b>`,
      `• <b>Status:</b> ${statusText}`,
      ``,
      `💳 <i>Pembayaran dapat dilakukan melalui kasir koperasi di kampus STMIK IKMI atau transfer rekening resmi koperasi.</i>`,
      `<i>Abaikan pesan ini jika Anda telah melakukan pembayaran hari ini.</i>`
    ].join('\n');
  }

  formatSummaryReportMessage(summary, periodType = 'Harian') {
    const dateTitle = periodType.toLowerCase() === 'bulanan'
      ? new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      : this.formatDate(new Date());

    return [
      `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
      `📊 <b>Ringkasan Laporan Keuangan Eksekutif (${periodType})</b>`,
      `<i>Periode: ${dateTitle}</i>`,
      ``,
      `Berikut rekapitulasi data keuangan dan operasional terkini:`,
      `👥 <b>Total Anggota:</b> ${summary.totalMembers || 0} Orang (${summary.activeMembers || 0} Aktif)`,
      `📥 <b>Total Kas Masuk:</b> ${this.formatCurrency(summary.totalIncome || summary.cashIn || 0)}`,
      `📤 <b>Total Kas Keluar:</b> ${this.formatCurrency(summary.totalExpense || summary.cashOut || 0)}`,
      `💵 <b>Saldo Kas Bersih:</b> <b>${this.formatCurrency(summary.netCashFlow || 0)}</b>`,
      `💳 <b>Total Simpanan Terhimpun:</b> ${this.formatCurrency(summary.totalSavings || 0)}`,
      `📑 <b>Pinjaman Aktif Berjalan:</b> ${summary.activeLoansCount || 0} Pinjaman`,
      `⚠️ <b>Angsuran Menunggak:</b> ${summary.overdueInstallmentsCount || 0} Tagihan (${this.formatCurrency(summary.overdueAmount || 0)})`,
      ``,
      `• <b>Waktu Rekapitulasi:</b> ${this.formatDateTime(new Date())}`,
      ``,
      `<i>Laporan eksekutif ini dikirimkan khusus kepada Ketua dan Administrator Koperasi STMIK IKMI.</i>`
    ].join('\n');
  }

  // =========================================================================
  // SAFE NON-BLOCKING EVENT DISPATCHING (FAIL-SAFE TRANSACTION INTEGRITY)
  // =========================================================================

  /**
   * Dispatches a notification to authorized recipients for a specific domain event.
   * NEVER throws unhandled errors to caller, guaranteeing financial operations NEVER fail if Telegram is down.
   * @param {string} eventType
   * @param {Object} eventData
   * @returns {Promise<{ dispatched: number, delivered: number, failed: number, errors: string[] }>}
   */
  async dispatchNotification(eventType, eventData = {}) {
    const result = {
      eventType,
      dispatched: 0,
      delivered: 0,
      failed: 0,
      errors: []
    };

    try {
      if (!this.isConfigured()) {
        // Log skipped status
        await this._logNotification({
          event_type: eventType,
          status: 'SKIPPED',
          error_message: 'Telegram Bot Token tidak dikonfigurasi. Notifikasi dilewati.'
        });
        return result;
      }

      // 1. Identify recipient context
      let contextData = {};
      let formattedMessage = '';

      if (eventType === 'NEW_MEMBER') {
        formattedMessage = this.formatNewMemberMessage(eventData.member || eventData);
      } else if (eventType === 'LOAN_APPLICATION') {
        const loan = eventData.loan || eventData;
        const member = eventData.member || {};
        contextData = { borrowerUserId: member.user_id };
        formattedMessage = this.formatLoanApplicationMessage(loan, member);
      } else if (eventType === 'LOAN_STATUS_CHANGE') {
        const loan = eventData.loan || eventData;
        const member = eventData.member || {};
        contextData = { borrowerUserId: member.user_id };
        formattedMessage = this.formatLoanStatusChangeMessage(
          loan,
          member,
          eventData.previousStatus,
          eventData.newStatus,
          eventData.notesOrReason || eventData.notes || eventData.rejectionReason
        );
      } else if (eventType === 'TRANSACTION_SUCCESS') {
        const trx = eventData.transaction || eventData;
        const member = eventData.member || null;
        contextData = { memberUserId: member ? member.user_id : null };
        formattedMessage = this.formatTransactionSuccessMessage(trx, member);
      } else if (eventType === 'INSTALLMENT_REMINDER') {
        const installment = eventData.installment || {};
        const loan = eventData.loan || {};
        const member = eventData.member || {};
        contextData = {
          borrowerUserId: member.user_id,
          isOverdue: Boolean(eventData.isOverdue)
        };
        formattedMessage = this.formatInstallmentReminderMessage(
          installment,
          loan,
          member,
          Boolean(eventData.isOverdue)
        );
      } else if (eventType === 'SUMMARY_REPORT') {
        formattedMessage = this.formatSummaryReportMessage(
          eventData.summary || eventData,
          eventData.periodType || 'Harian'
        );
      } else if (eventType === 'TEST') {
        contextData = { userId: eventData.userId };
        formattedMessage = [
          `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
          `🔔 <b>Uji Coba Notifikasi Telegram Berhasil!</b>`,
          ``,
          `Halo <b>${eventData.userName || 'Pengguna'}</b>,`,
          `Layanan notifikasi Telegram Anda telah aktif dan berfungsi normal.`,
          `Waktu uji coba: ${this.formatDateTime(new Date())}`
        ].join('\n');
      }

      // 2. Resolve RBAC recipients
      const recipients = await this.getRecipientsForEvent(eventType, contextData);
      result.dispatched = recipients.length;

      // 3. Send message to each eligible recipient
      for (const { account, user, role } of recipients) {
        try {
          const sendRes = await this.sendMessage(account.telegram_chat_id, formattedMessage);
          if (sendRes.ok) {
            result.delivered++;
            await this._logNotification({
              user_id: user.id,
              telegram_chat_id: account.telegram_chat_id,
              event_type: eventType,
              recipient_role: role,
              message_snippet: formattedMessage.slice(0, 150),
              status: 'SENT',
              error_message: null
            });
          } else {
            result.failed++;
            const sanitizedErr = this.sanitizeText(sendRes.error || 'Pengiriman gagal.');
            result.errors.push(`Chat ${account.telegram_chat_id}: ${sanitizedErr}`);
            await this._logNotification({
              user_id: user.id,
              telegram_chat_id: account.telegram_chat_id,
              event_type: eventType,
              recipient_role: role,
              message_snippet: formattedMessage.slice(0, 150),
              status: 'FAILED',
              error_message: sanitizedErr
            });
          }
        } catch (sendErr) {
          result.failed++;
          const sanitizedErr = this.sanitizeText(sendErr.message || String(sendErr));
          result.errors.push(`Chat ${account.telegram_chat_id}: ${sanitizedErr}`);
          await this._logNotification({
            user_id: user.id,
            telegram_chat_id: account.telegram_chat_id,
            event_type: eventType,
            recipient_role: role,
            message_snippet: formattedMessage.slice(0, 150),
            status: 'FAILED',
            error_message: sanitizedErr
          });
        }
      }
    } catch (outerErr) {
      // Outer safety catch: Financial transaction is 100% safeguarded
      const sanitizedOuter = this.sanitizeText(outerErr.message || String(outerErr));
      console.warn('[TelegramService] Gracefully caught outer notification error:', sanitizedOuter);
      result.errors.push(sanitizedOuter);
    }

    return result;
  }

  /**
   * Internal logger helper for telegram_notification_logs
   */
  async _logNotification(logData = {}) {
    try {
      const record = {
        id: `tgl-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        user_id: logData.user_id || null,
        telegram_chat_id: String(logData.telegram_chat_id || 'NONE'),
        event_type: logData.event_type || 'UNKNOWN',
        recipient_role: logData.recipient_role || null,
        message_snippet: this.sanitizeText(logData.message_snippet || ''),
        status: logData.status || 'SENT',
        error_message: logData.error_message ? this.sanitizeText(logData.error_message) : null,
        timestamp: new Date().toISOString()
      };
      await this.db.insert('telegram_notification_logs', record);
    } catch (e) {
      // Ignore logging failure to avoid breaking anything
      console.warn('[TelegramService] Log insertion warning:', e.message);
    }
  }

  // =========================================================================
  // TELEGRAM BOT WEBHOOK & INCOMING COMMAND HANDLER
  // =========================================================================

  /**
   * Handles incoming update payload from Telegram Webhook (e.g. /start <OTP_CODE>)
   * @param {Object} update
   */
  async handleWebhookUpdate(update = {}) {
    if (!update || !update.message) {
      return { handled: false, reason: 'Bukan pesan teks.' };
    }

    const message = update.message;
    const text = (message.text || '').trim();
    const chatId = message.chat?.id;
    const fromUser = message.from || {};

    if (!chatId || !text) {
      return { handled: false, reason: 'Data pesan tidak lengkap.' };
    }

    // 1. Smart Extraction: Look for IKMI verification code anywhere in text
    // Handles: "/start IKMI-XXXXXX", "/star ikmi xxxxxx", "IKMI - XXXXXX", "IKMI-XXXXXX.", etc.
    const ikmiMatch = text.match(/IKMI\s*[-–—\s]?\s*([A-Za-z0-9]{6})/i);

    if (ikmiMatch) {
      const codeCandidate = `IKMI-${ikmiMatch[1].toUpperCase()}`;
      const linkResult = await this.verifyAndLinkAccount(codeCandidate, {
        chatId,
        username: fromUser.username || '',
        firstName: fromUser.first_name || ''
      });

      if (!linkResult.success) {
        const failMsg = [
          `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
          `⚠️ <b>Gagal Menyambungkan Akun</b>`,
          ``,
          `${linkResult.error}`,
          ``,
          `Silakan buka aplikasi Smart Co-op di browser Anda, klik menu <b>Notifikasi Telegram</b>, lalu buat kode verifikasi baru.`
        ].join('\n');
        await this.sendMessage(chatId, failMsg);
        return { handled: true, success: false, error: linkResult.error };
      }

      return { handled: true, success: true, linkedUser: linkResult.user };
    }

    // 2. Command: /start or /star without code: display welcoming help
    if (text.toLowerCase().startsWith('/start') || text.toLowerCase().startsWith('/star')) {
      const welcomeText = [
        `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
        `👋 Halo <b>${fromUser.first_name || 'Civitas IKMI'}</b>!`,
        ``,
        `Selamat datang di Bot Notifikasi Resmi <b>Smart Co-op STMIK IKMI Cirebon</b>.`,
        ``,
        `Untuk menyambungkan akun Telegram ini dengan akun koperasi Anda:`,
        `1. Buka aplikasi <b>Smart Co-op</b> di browser Anda (http://localhost:3000).`,
        `2. Masuk ke menu <b>Notifikasi Telegram</b>.`,
        `3. Klik tombol <b>Buat Kode Verifikasi Sekali Pakai (OTP)</b>.`,
        `4. Kirimkan kode tersebut ke bot ini, contoh:`,
        `   <code>/start IKMI-XXXXXX</code> atau langsung ketik <code>IKMI-XXXXXX</code>`,
        ``,
        `Ketik /help untuk panduan lengkap.`
      ].join('\n');
      await this.sendMessage(chatId, welcomeText);
      return { handled: true, action: 'welcome' };
    }

    // 3. Command: /status
    if (text.toLowerCase() === '/status') {
      const linked = await this.db.find('telegram_accounts', { telegram_chat_id: String(chatId), is_active: true });
      if (linked && linked.length > 0) {
        const account = linked[0];
        const user = await this.db.findById('users', account.user_id);
        const statusMsg = [
          `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
          `🟢 <b>Status: Akun Terhubung</b>`,
          ``,
          `• <b>Nama Pengguna:</b> <b>${user ? user.name : '-'}</b>`,
          `• <b>Peran (Role):</b> <code>${user ? user.role : '-'}</code>`,
          `• <b>Email:</b> ${user ? user.email : '-'}`,
          `• <b>Chat ID Telegram:</b> <code>${chatId}</code>`,
          `• <b>Terhubung Sejak:</b> ${this.formatDateTime(account.linked_at)}`,
          ``,
          `<i>Notifikasi aktif sesuai hak akses akun Anda.</i>`
        ].join('\n');
        await this.sendMessage(chatId, statusMsg);
      } else {
        const unlinkedMsg = [
          `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
          `⚪ <b>Status: Belum Terhubung</b>`,
          ``,
          `Akun Telegram ini belum ditautkan dengan akun aplikasi Smart Co-op mana pun.`,
          `Gunakan kode verifikasi dari aplikasi dengan mengetik:`,
          `<code>/start KODE_VERIFIKASI</code>`
        ].join('\n');
        await this.sendMessage(chatId, unlinkedMsg);
      }
      return { handled: true, action: 'status' };
    }

    // 4. Command: /unlink
    if (text.toLowerCase() === '/unlink') {
      const linked = await this.db.find('telegram_accounts', { telegram_chat_id: String(chatId), is_active: true });
      if (linked && linked.length > 0) {
        await this.unlinkAccount(linked[0].user_id);
      } else {
        await this.sendMessage(chatId, 'Akun Telegram ini tidak sedang terhubung ke akun aplikasi.');
      }
      return { handled: true, action: 'unlink' };
    }

    // 5. Command: /help
    if (text.toLowerCase() === '/help') {
      const helpMsg = [
        `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
        `📖 <b>Daftar Perintah Telegram Bot:</b>`,
        ``,
        `• <code>/start [KODE]</code> : Menghubungkan akun menggunakan kode OTP dari aplikasi.`,
        `• <code>IKMI-XXXXXX</code> : Anda juga dapat langsung mengetik kodenya tanpa perintah /start.`,
        `• <code>/status</code> : Memeriksa status koneksi dan informasi akun Anda.`,
        `• <code>/unlink</code> : Memutuskan tautan akun Telegram ini.`,
        `• <code>/help</code> : Menampilkan panduan bantuan ini.`,
        ``,
        `ℹ️ <i>Layanan Bantuan: ${INSTITUTION.PHONE} | ${INSTITUTION.EMAIL}</i>`
      ].join('\n');
      await this.sendMessage(chatId, helpMsg);
      return { handled: true, action: 'help' };
    }

    // 6. Fallback reply for any unhandled text
    const defaultHelpMsg = [
      `🏛️ <b>SMART CO-OP STMIK IKMI CIREBON</b>`,
      `👋 Halo! Untuk menghubungkan akun Telegram Anda:`,
      `Silakan kirim kode verifikasi dari aplikasi, contoh:`,
      `<code>/start IKMI-XXXXXX</code> atau langsung <code>IKMI-XXXXXX</code>`,
      ``,
      `Ketik <code>/help</code> untuk melihat daftar perintah yang tersedia.`
    ].join('\n');
    await this.sendMessage(chatId, defaultHelpMsg);
    return { handled: true, action: 'fallback' };
  }
}
