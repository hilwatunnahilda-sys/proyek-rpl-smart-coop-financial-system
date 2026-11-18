/**
 * Telegram Bot Notification Subsystem Test Suite
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Tests cover:
 * 1. Token Security & Redaction (No leakage in configs, logs, or error responses)
 * 2. One-Time Expiring Code (OTP) Account Linking Lifecycle
 * 3. Role-Based Access Control & Recipient Isolation (Admin vs Chairman vs Member)
 * 4. Message Formatting according to institutional standards
 * 5. Failure Resilience: Financial transactions NEVER fail if Telegram is down
 * 6. Server Handler & Webhook Routing
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TelegramService } from '../src/infrastructure/telegram/telegramService.js';
import { TelegramServerHandler } from '../src/infrastructure/telegram/telegramServerHandler.js';
import { DatabaseAdapter } from '../src/infrastructure/database/adapter.js';
import { ROLES, LOAN_STATUS } from '../src/config/constants.js';

describe('Telegram Bot Notification Subsystem Tests', () => {
  let adapter;
  let testBotToken;
  let telegramService;
  let mockFetchCalls;

  beforeEach(async () => {
    // Isolated in-memory storage adapter for each test
    adapter = new DatabaseAdapter(`test_tg_db_${Date.now()}_${Math.random()}`);
    testBotToken = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz_TEST_TOKEN';
    mockFetchCalls = [];

    // Mock fetch that records calls and returns successful Telegram API responses
    const mockFetch = async (url, options = {}) => {
      mockFetchCalls.push({ url, options });

      // Simulate Telegram getMe
      if (url.includes('/getMe')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            ok: true,
            result: { id: 123456789, is_bot: true, first_name: 'SmartCoopBot', username: 'IkmiCoopBot' }
          })
        };
      }

      // Simulate Telegram sendMessage
      if (url.includes('/sendMessage')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            ok: true,
            result: { message_id: Math.floor(Math.random() * 10000), date: Math.floor(Date.now() / 1000) }
          })
        };
      }

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, result: {} })
      };
    };

    telegramService = new TelegramService({
      token: testBotToken,
      botUsername: 'IkmiCoopBot',
      adapter,
      fetchFn: mockFetch
    });

    // Seed test users
    await adapter.insert('users', {
      id: 'usr-admin-01',
      name: 'Admin Koperasi',
      email: 'admin@ikmi.ac.id',
      role: ROLES.ADMIN,
      status: 'ACTIVE'
    });

    await adapter.insert('users', {
      id: 'usr-ketua-01',
      name: 'Dr. H. Dadang Sudrajat (Ketua)',
      email: 'ketua@ikmi.ac.id',
      role: ROLES.CHAIRMAN,
      status: 'ACTIVE'
    });

    await adapter.insert('users', {
      id: 'usr-member-01',
      name: 'Ahmad Fauzi',
      email: 'mahasiswa@ikmi.ac.id',
      role: ROLES.MEMBER,
      status: 'ACTIVE'
    });

    await adapter.insert('users', {
      id: 'usr-member-02',
      name: 'Dr. Siti Nurhaliza',
      email: 'dosen@ikmi.ac.id',
      role: ROLES.MEMBER,
      status: 'ACTIVE'
    });
  });

  // =========================================================================
  // 1. TOKEN SECURITY & REDACTION TESTS
  // =========================================================================
  describe('1. Token Security & Redaction', () => {
    test('Public configuration MUST NEVER expose the actual Telegram Bot Token', () => {
      const publicConfig = telegramService.getPublicConfig();
      assert.strictEqual(publicConfig.configured, true);
      assert.strictEqual(publicConfig.botUsername, 'IkmiCoopBot');
      assert.strictEqual(publicConfig.token, undefined, 'Token field must not exist in public config');
      assert.strictEqual(JSON.stringify(publicConfig).includes(testBotToken), false, 'Token string must never appear in public config JSON');
    });

    test('sanitizeText() must redact bot tokens from URLs and log messages', () => {
      const sensitiveUrl = `https://api.telegram.org/bot${testBotToken}/sendMessage`;
      const sanitized = telegramService.sanitizeText(sensitiveUrl);
      assert.strictEqual(sanitized.includes(testBotToken), false);
      assert.strictEqual(sanitized.includes('[REDACTED_TELEGRAM_TOKEN]'), true);
    });

    test('sanitizeText() must also redact arbitrary bot token patterns', () => {
      const foreignLog = 'Error contacting bot987654321:XYZ987654321_other_token/getMe';
      const sanitized = telegramService.sanitizeText(foreignLog);
      assert.strictEqual(sanitized.includes('XYZ987654321'), false);
      assert.strictEqual(sanitized.includes('bot[REDACTED_TELEGRAM_TOKEN]'), true);
    });
  });

  // =========================================================================
  // 2. EXPIRING ONE-TIME LINK CODE (OTP) LIFECYCLE
  // =========================================================================
  describe('2. One-Time Expiring Code (OTP) Account Linking Lifecycle', () => {
    test('Should generate an expiring OTP code with valid format and expiration', async () => {
      const otpData = await telegramService.generateLinkCode('usr-member-01', 10);
      assert.ok(otpData.code);
      assert.ok(otpData.code.startsWith('IKMI-'));
      assert.strictEqual(otpData.expiresInMinutes, 10);
      assert.ok(otpData.deepLink.includes(otpData.code));

      // Check database record
      const records = await adapter.find('telegram_link_codes', { code: otpData.code });
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0].used, false);
      assert.strictEqual(records[0].user_id, 'usr-member-01');
    });

    test('Should link account successfully using valid OTP code', async () => {
      const otpData = await telegramService.generateLinkCode('usr-member-01');
      const linkResult = await telegramService.verifyAndLinkAccount(otpData.code, {
        chatId: '99887766',
        username: 'ahmadfauzi_tg',
        firstName: 'Ahmad Fauzi'
      });

      assert.strictEqual(linkResult.success, true);
      assert.strictEqual(linkResult.user.id, 'usr-member-01');

      // Verify telegram_accounts record
      const account = await telegramService.getAccountByUserId('usr-member-01');
      assert.ok(account);
      assert.strictEqual(account.telegram_chat_id, '99887766');
      assert.strictEqual(account.telegram_username, 'ahmadfauzi_tg');
      assert.strictEqual(account.is_active, true);

      // Verify code is marked as used
      const codeRecord = await adapter.findById('telegram_link_codes', otpData.code, 'code');
      assert.strictEqual(codeRecord.used, true);
      assert.ok(codeRecord.used_at);
    });

    test('Should reject reuse of already used OTP code (Single-Use Guarantee)', async () => {
      const otpData = await telegramService.generateLinkCode('usr-member-01');

      // First use - succeeds
      const firstRes = await telegramService.verifyAndLinkAccount(otpData.code, {
        chatId: '99887766'
      });
      assert.strictEqual(firstRes.success, true);

      // Second use - must be rejected
      const secondRes = await telegramService.verifyAndLinkAccount(otpData.code, {
        chatId: '11223344'
      });
      assert.strictEqual(secondRes.success, false);
      assert.ok(secondRes.error.includes('sudah pernah digunakan'));
    });

    test('Should reject expired OTP code', async () => {
      const otpData = await telegramService.generateLinkCode('usr-member-01');

      // Manually set expiration to past
      const codeRecord = await adapter.findById('telegram_link_codes', otpData.code, 'code');
      await adapter.update('telegram_link_codes', codeRecord.id, {
        expires_at: new Date(Date.now() - 1000 * 60).toISOString() // 1 minute in the past
      });

      const res = await telegramService.verifyAndLinkAccount(otpData.code, {
        chatId: '99887766'
      });
      assert.strictEqual(res.success, false);
      assert.ok(res.error.includes('kedaluwarsa'));
    });

    test('Should reject invalid or non-existent code', async () => {
      const res = await telegramService.verifyAndLinkAccount('IKMI-INVALID-99', {
        chatId: '99887766'
      });
      assert.strictEqual(res.success, false);
      assert.ok(res.error.includes('tidak ditemukan'));
    });

    test('Should successfully unlink account', async () => {
      const otpData = await telegramService.generateLinkCode('usr-member-01');
      await telegramService.verifyAndLinkAccount(otpData.code, { chatId: '99887766' });

      const unlinkRes = await telegramService.unlinkAccount('usr-member-01');
      assert.strictEqual(unlinkRes.success, true);

      const account = await telegramService.getAccountByUserId('usr-member-01');
      assert.strictEqual(account.is_active, false);
    });
  });

  // =========================================================================
  // 3. RBAC RECIPIENT AUTHORIZATION & DATA ISOLATION TESTS
  // =========================================================================
  describe('3. RBAC Recipient Authorization & Data Isolation', () => {
    beforeEach(async () => {
      // Link all test users to distinct Telegram chat IDs
      const otpAdmin = await telegramService.generateLinkCode('usr-admin-01');
      await telegramService.verifyAndLinkAccount(otpAdmin.code, { chatId: '1001', username: 'admin_tg' });

      const otpKetua = await telegramService.generateLinkCode('usr-ketua-01');
      await telegramService.verifyAndLinkAccount(otpKetua.code, { chatId: '1002', username: 'ketua_tg' });

      const otpMbr1 = await telegramService.generateLinkCode('usr-member-01');
      await telegramService.verifyAndLinkAccount(otpMbr1.code, { chatId: '1003', username: 'member1_tg' });

      const otpMbr2 = await telegramService.generateLinkCode('usr-member-02');
      await telegramService.verifyAndLinkAccount(otpMbr2.code, { chatId: '1004', username: 'member2_tg' });
    });

    test('NEW_MEMBER event must only target ADMIN role', async () => {
      const recipients = await telegramService.getRecipientsForEvent('NEW_MEMBER', {
        member: { full_name: 'Budi Santoso' }
      });

      assert.strictEqual(recipients.length, 1);
      assert.strictEqual(recipients[0].role, ROLES.ADMIN);
      assert.strictEqual(recipients[0].account.telegram_chat_id, '1001');
    });

    test('LOAN_APPLICATION event must target ADMIN and CHAIRMAN for review/approval', async () => {
      const recipients = await telegramService.getRecipientsForEvent('LOAN_APPLICATION', {
        loan: { loan_number: 'LN-202610-001' }
      });

      const roles = recipients.map(r => r.role);
      assert.ok(roles.includes(ROLES.ADMIN));
      assert.ok(roles.includes(ROLES.CHAIRMAN));
      assert.strictEqual(roles.includes(ROLES.MEMBER), false, 'Regular members must not receive other members loan applications');
    });

    test('LOAN_STATUS_CHANGE must notify the borrower member and management, but NEVER other members', async () => {
      // Loan belongs to Member 1 (usr-member-01)
      const recipients = await telegramService.getRecipientsForEvent('LOAN_STATUS_CHANGE', {
        borrowerUserId: 'usr-member-01',
        loan: { loan_number: 'LN-202610-001' }
      });

      const userIds = recipients.map(r => r.user.id);
      assert.ok(userIds.includes('usr-member-01'), 'Borrower member must be notified');
      assert.ok(userIds.includes('usr-admin-01'), 'Admin must be notified');
      assert.ok(userIds.includes('usr-ketua-01'), 'Chairman must be notified');
      assert.strictEqual(userIds.includes('usr-member-02'), false, 'Member 2 MUST NOT be notified of Member 1 loan update (Strict Data Isolation)');
    });

    test('TRANSACTION_SUCCESS must notify only the owner member and admin, isolating other members', async () => {
      // Transaction belongs to Member 1 (usr-member-01)
      const recipients = await telegramService.getRecipientsForEvent('TRANSACTION_SUCCESS', {
        memberUserId: 'usr-member-01',
        transaction: { transaction_number: 'TRX-202610-001', amount: 500000 }
      });

      const userIds = recipients.map(r => r.user.id);
      assert.ok(userIds.includes('usr-member-01'), 'Owner member must receive notification');
      assert.ok(userIds.includes('usr-admin-01'), 'Admin must receive ledger notification');
      assert.strictEqual(userIds.includes('usr-member-02'), false, 'Other members must not receive notification');
    });

    test('SUMMARY_REPORT must only be delivered to ADMIN and CHAIRMAN', async () => {
      const recipients = await telegramService.getRecipientsForEvent('SUMMARY_REPORT', {});
      const roles = recipients.map(r => r.role);
      assert.ok(roles.includes(ROLES.ADMIN));
      assert.ok(roles.includes(ROLES.CHAIRMAN));
      assert.strictEqual(roles.includes(ROLES.MEMBER), false, 'Members must not receive cooperative executive summary reports');
    });
  });

  // =========================================================================
  // 4. MESSAGE FORMATTING & DISPATCH TESTS
  // =========================================================================
  describe('4. Institutional Message Formatting & Dispatching', () => {
    test('formatNewMemberMessage() contains institutional header and member details', () => {
      const msg = telegramService.formatNewMemberMessage({
        member_number: 'IKMI-MBR-005',
        full_name: 'Rina Novita',
        member_type: 'MAHASISWA',
        identity_number: 'NIM: 20240199001',
        phone: '089612345678',
        join_date: '2026-10-16'
      });

      assert.ok(msg.includes('SMART CO-OP STMIK IKMI CIREBON'));
      assert.ok(msg.includes('IKMI-MBR-005'));
      assert.ok(msg.includes('Rina Novita'));
      assert.ok(msg.includes('MAHASISWA'));
    });

    test('formatLoanStatusChangeMessage() reflects new status correctly (APPROVED, REJECTED, PAID_OFF)', () => {
      const approvedMsg = telegramService.formatLoanStatusChangeMessage(
        { loan_number: 'LN-202610-0001', principal_amount: 5000000 },
        { full_name: 'Ahmad Fauzi' },
        LOAN_STATUS.PENDING,
        LOAN_STATUS.APPROVED,
        'Syarat lengkap'
      );
      assert.ok(approvedMsg.includes('DISETUJUI (APPROVED)'));
      assert.ok(approvedMsg.includes('Syarat lengkap'));

      const paidOffMsg = telegramService.formatLoanStatusChangeMessage(
        { loan_number: 'LN-202610-0001', principal_amount: 5000000 },
        { full_name: 'Ahmad Fauzi' },
        LOAN_STATUS.ACTIVE,
        LOAN_STATUS.PAID_OFF,
        'Lunas penuh'
      );
      assert.ok(paidOffMsg.includes('LUNAS PENUH (PAID OFF)'));
    });

    test('formatSummaryReportMessage() aggregates figures correctly', () => {
      const summaryMsg = telegramService.formatSummaryReportMessage({
        totalMembers: 45,
        activeMembers: 42,
        totalIncome: 15000000,
        totalExpense: 8000000,
        netCashFlow: 7000000,
        totalSavings: 25000000,
        activeLoansCount: 12,
        overdueInstallmentsCount: 2,
        overdueAmount: 1100000
      }, 'Harian');

      assert.ok(summaryMsg.includes('Ringkasan Laporan Keuangan Eksekutif (Harian)'));
      assert.ok(summaryMsg.includes('42 Aktif'));
      assert.ok(summaryMsg.includes('Rp 15.000.000'));
      assert.ok(summaryMsg.includes('Rp 7.000.000'));
    });
  });

  // =========================================================================
  // 5. RESILIENCE AGAINST TELEGRAM FAILURES (NON-BLOCKING GUARANTEE)
  // =========================================================================
  describe('5. Failure Resilience: Financial Transactions NEVER Fail on Telegram Outage', () => {
    test('dispatchNotification() must NOT throw even if Telegram API throws a network error', async () => {
      // Inject failing fetch that throws network failure
      const failingTelegramService = new TelegramService({
        token: testBotToken,
        adapter,
        fetchFn: async () => {
          throw new Error('ETIMEDOUT: Connection to api.telegram.org timed out');
        }
      });

      // Link an admin
      const otp = await failingTelegramService.generateLinkCode('usr-admin-01');
      // Link directly in db
      await adapter.insert('telegram_accounts', {
        id: 'tga-test-admin',
        user_id: 'usr-admin-01',
        telegram_chat_id: '99999',
        is_active: true,
        notify_new_member: true
      });

      // Attempt dispatch - MUST NOT THROW!
      let dispatchResult;
      assert.doesNotThrow(async () => {
        dispatchResult = await failingTelegramService.dispatchNotification('NEW_MEMBER', {
          member: { full_name: 'Test Anggota Baru', member_number: 'IKMI-MBR-999' }
        });
      });

      dispatchResult = await failingTelegramService.dispatchNotification('NEW_MEMBER', {
        member: { full_name: 'Test Anggota Baru', member_number: 'IKMI-MBR-999' }
      });

      assert.strictEqual(dispatchResult.dispatched, 1);
      assert.strictEqual(dispatchResult.delivered, 0);
      assert.strictEqual(dispatchResult.failed, 1);
      assert.ok(dispatchResult.errors.length > 0);

      // Verify failure log recorded in audit trail
      const logs = await adapter.find('telegram_notification_logs', { status: 'FAILED' });
      assert.ok(logs.length > 0);
      assert.ok(logs[0].error_message.includes('ETIMEDOUT'));
    });

    test('dispatchNotification() handles Telegram HTTP 403 (Bot Blocked by User) gracefully', async () => {
      const blockedTelegramService = new TelegramService({
        token: testBotToken,
        adapter,
        fetchFn: async () => ({
          ok: false,
          status: 403,
          text: async () => JSON.stringify({
            ok: false,
            error_code: 403,
            description: 'Forbidden: bot was blocked by the user'
          })
        })
      });

      await adapter.insert('telegram_accounts', {
        id: 'tga-test-block',
        user_id: 'usr-admin-01',
        telegram_chat_id: '88888',
        is_active: true,
        notify_new_member: true
      });

      const res = await blockedTelegramService.dispatchNotification('NEW_MEMBER', {
        member: { full_name: 'Budi' }
      });

      assert.strictEqual(res.delivered, 0);
      assert.strictEqual(res.failed, 1);
      assert.ok(res.errors[0].includes('bot was blocked by the user'));
    });
  });

  // =========================================================================
  // 6. SERVER HANDLER & WEBHOOK INTEGRATION TESTS
  // =========================================================================
  describe('6. Telegram Server Handler & Webhook Routing', () => {
    let serverHandler;

    beforeEach(async () => {
      serverHandler = new TelegramServerHandler({
        telegramService,
        adapter
      });

      // Create session for admin
      await adapter.insert('sessions', {
        token: 'test_admin_session_token_123',
        user_id: 'usr-admin-01',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        is_revoked: false
      });

      // Create session for member
      await adapter.insert('sessions', {
        token: 'test_member_session_token_456',
        user_id: 'usr-member-01',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        is_revoked: false
      });
    });

    test('GET /api/telegram/status returns public configuration without token', async () => {
      const res = await serverHandler.handleRequest({
        method: 'GET',
        url: '/api/telegram/status'
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.configured, true);
      assert.strictEqual(res.body.botUsername, 'IkmiCoopBot');
      assert.strictEqual(res.body.token, undefined);
    });

    test('POST /api/telegram/link-code requires valid session authentication', async () => {
      // Unauthenticated request
      const unauthRes = await serverHandler.handleRequest({
        method: 'POST',
        url: '/api/telegram/link-code',
        headers: {}
      });
      assert.strictEqual(unauthRes.status, 401);

      // Authenticated request
      const authRes = await serverHandler.handleRequest({
        method: 'POST',
        url: '/api/telegram/link-code',
        headers: { 'Authorization': 'Bearer test_member_session_token_456' }
      });
      assert.strictEqual(authRes.status, 200);
      assert.ok(authRes.body.code);
      assert.ok(authRes.body.deepLink);
    });

    test('POST /api/telegram/webhook processes /start <OTP_CODE> command', async () => {
      // Generate OTP
      const otp = await telegramService.generateLinkCode('usr-member-01');

      // Webhook payload from Telegram
      const webhookPayload = {
        update_id: 10001,
        message: {
          message_id: 55,
          from: { id: 777666, first_name: 'Ahmad', username: 'ahmad_tg' },
          chat: { id: 777666, first_name: 'Ahmad', type: 'private' },
          text: `/start ${otp.code}`
        }
      };

      const webhookRes = await serverHandler.handleRequest({
        method: 'POST',
        url: '/api/telegram/webhook',
        body: webhookPayload
      });

      assert.strictEqual(webhookRes.status, 200);
      assert.strictEqual(webhookRes.body.success, true);

      // Verify account is now linked in database
      const account = await telegramService.getAccountByUserId('usr-member-01');
      assert.ok(account);
      assert.strictEqual(account.telegram_chat_id, '777666');
      assert.strictEqual(account.is_active, true);
    });

    test('POST /api/telegram/summary-report enforces RBAC (Rejects Member, Allows Admin)', async () => {
      // 1. Regular Member attempt - Must be rejected 403
      const memberRes = await serverHandler.handleRequest({
        method: 'POST',
        url: '/api/telegram/summary-report',
        headers: { 'Authorization': 'Bearer test_member_session_token_456' },
        body: { periodType: 'Harian' }
      });
      assert.strictEqual(memberRes.status, 403);
      assert.strictEqual(memberRes.body.success, false);

      // 2. Admin attempt - Must succeed 200
      const adminRes = await serverHandler.handleRequest({
        method: 'POST',
        url: '/api/telegram/summary-report',
        headers: { 'Authorization': 'Bearer test_admin_session_token_123' },
        body: { periodType: 'Harian' }
      });
      assert.strictEqual(adminRes.status, 200);
      assert.strictEqual(adminRes.body.success, true);
      assert.ok(adminRes.body.summary);
    });
  });
});
