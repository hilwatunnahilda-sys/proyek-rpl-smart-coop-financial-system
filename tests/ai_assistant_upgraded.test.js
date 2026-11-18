/**
 * Test Suite: Upgraded Smart Co-op AI Assistant
 * Strict Precision, Context Awareness, Real Database Figures, and RBAC Security
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { DatabaseAdapter } from '../src/infrastructure/database/adapter.js';
import { DatabaseSeeder } from '../src/infrastructure/database/seeder.js';
import { AiAuthorizedDataService } from '../src/core/services/AiAuthorizedDataService.js';
import { AiBackendCoordinator } from '../src/infrastructure/ai/aiBackendCoordinator.js';
import { AiChatServerHandler } from '../src/infrastructure/ai/aiChatServerHandler.js';
import { ROLES, MEMBER_STATUS } from '../src/config/constants.js';

describe('Upgraded Smart Co-op AI Assistant Test Suite', () => {
  let testAdapter;
  let dataService;
  let serverHandler;

  const ADMIN_TOKEN = 'ikmi_tok_admin_upgraded_test_token_2026';
  const CHAIRMAN_TOKEN = 'ikmi_tok_ketua_upgraded_test_token_2026';
  const DOSEN_TOKEN = 'ikmi_tok_dosen_upgraded_test_token_2026';
  const MHS_TOKEN = 'ikmi_tok_mhs_upgraded_test_token_2026';

  beforeEach(async () => {
    testAdapter = new DatabaseAdapter(`test_ai_upgraded_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    const seeder = new DatabaseSeeder(testAdapter);
    await seeder.seed();

    const now = new Date();
    const futureDate = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();

    const testSessions = [
      { token: ADMIN_TOKEN, user_id: 'usr-admin-001', created_at: now.toISOString(), expires_at: futureDate, is_revoked: false },
      { token: CHAIRMAN_TOKEN, user_id: 'usr-ketua-001', created_at: now.toISOString(), expires_at: futureDate, is_revoked: false },
      { token: DOSEN_TOKEN, user_id: 'usr-dosen-001', created_at: now.toISOString(), expires_at: futureDate, is_revoked: false },
      { token: MHS_TOKEN, user_id: 'usr-mhs-001', created_at: now.toISOString(), expires_at: futureDate, is_revoked: false }
    ];

    await testAdapter.saveAll('sessions', testSessions);
    dataService = new AiAuthorizedDataService(testAdapter);
    serverHandler = new AiChatServerHandler({ adapter: testAdapter });
    await serverHandler.init();
  });

  // TEST 1: "Siapa saya?"
  it('1. "Siapa saya?" only answers user identity and role without database statistics', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Siapa saya?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.reply.includes('Admin Koperasi IKMI'), 'Reply must state user is logged in as Admin');
    assert.ok(!response.body.reply.includes('Total Anggota'), 'Must not include member stats');
    assert.ok(!response.body.reply.includes('Simpanan'), 'Must not include savings');
    assert.ok(!response.body.reply.includes('Pinjaman'), 'Must not include loans');
    assert.ok(!response.body.reply.includes('Laporan Keuangan'), 'Must not include financial reports');
  });

  // TEST 2: "Halo"
  it('2. "Halo" only answers with natural greeting without database statistics', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Halo' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.reply.includes('Halo! Ada yang bisa saya bantu terkait koperasi?'));
    assert.ok(!response.body.reply.includes('Total Anggota'), 'Must not include database stats');
    assert.ok(!response.body.reply.includes('Simpanan'), 'Must not include savings');
  });

  // TEST 3: "Terima kasih"
  it('3. "Terima kasih" only answers with courtesy without database statistics', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Terima kasih' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.reply.includes('Sama-sama! Silakan tanyakan jika ada yang ingin Anda ketahui.'));
    assert.ok(!response.body.reply.includes('Total Anggota'));
  });

  // TEST 4: "Berapa total anggota?"
  it('4. "Berapa total anggota?" answers only the member count from actual database', async () => {
    const members = await testAdapter.getAll('members');
    const expectedCount = members.length;

    const response = await serverHandler.handleChatRequest(
      { message: 'Berapa total anggota?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.reply.includes(String(expectedCount)), 'Must include exact count');
    assert.ok(response.body.reply.includes('Total Anggota Terdaftar saat ini adalah 5 orang') || response.body.reply.includes('5 orang'));
    // Should NOT include breakdowns of Dosen/Mahasiswa/Staf
    assert.ok(!response.body.reply.includes('Simpanan'), 'Must not include savings stats');
    assert.ok(!response.body.reply.includes('Pinjaman'), 'Must not include loan stats');
  });

  // TEST 5: "Berapa jumlah anggota aktif?"
  it('5. "Berapa jumlah anggota aktif?" answers only active member count', async () => {
    const members = await testAdapter.getAll('members');
    const activeCount = members.filter(m => m.status === MEMBER_STATUS.ACTIVE).length;

    const response = await serverHandler.handleChatRequest(
      { message: 'Berapa jumlah anggota aktif?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.reply.includes(`Jumlah anggota aktif saat ini adalah ${activeCount} orang.`));
    assert.ok(!response.body.reply.includes('nonaktif'), 'Must not give inactive count when not asked');
  });

  // TEST 6: "Berapa total simpanan wajib?"
  it('6. "Berapa total simpanan wajib?" uses actual database figures and correct calculation', async () => {
    // Calculate expected Simpanan Wajib from database
    const savingTrx = await testAdapter.getAll('saving_transactions');
    let expectedWajib = 0;
    savingTrx.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.saving_type === 'WAJIB') {
        if (t.transaction_type === 'DEPOSIT') expectedWajib += amt;
        else if (t.transaction_type === 'WITHDRAWAL') expectedWajib -= amt;
      }
    });
    const expectedFormatted = dataService.formatRupiah(expectedWajib);

    const response = await serverHandler.handleChatRequest(
      { message: 'Berapa total simpanan wajib?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.reply.includes(expectedFormatted), `Must include calculated wajib (${expectedFormatted})`);
    assert.ok(response.body.reply.includes('Total simpanan wajib saat ini adalah'));
    // Must NOT mix with Simpanan Pokok or Sukarela
    assert.ok(!response.body.reply.includes('Simpanan Pokok:'), 'Must not include Pokok breakdown');
    assert.ok(!response.body.reply.includes('Simpanan Sukarela:'), 'Must not include Sukarela breakdown');
  });

  // TEST 7: "Siapa anggota yang belum membayar angsuran?"
  it('7. "Siapa anggota yang belum membayar angsuran?" returns actual list of members with unpaid installments', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Siapa anggota yang belum membayar angsuran?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    // Budi Santoso (IKMI-MBR-004) has an OVERDUE installment in seed data
    assert.ok(response.body.reply.includes('Budi Santoso') || response.body.reply.includes('IKMI-MBR-004'), 'Must list borrower with overdue installment');
    assert.ok(response.body.reply.includes('OVERDUE') || response.body.reply.includes('Jatuh Tempo'), 'Must show due date or status');
  });

  // TEST 8: "Bandingkan pendaftaran anggota bulan ini dengan bulan lalu"
  it('8. "Bandingkan pendaftaran anggota bulan ini dengan bulan lalu" compares periods accurately', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Bandingkan pendaftaran anggota bulan ini dengan bulan lalu' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.reply.includes('Pendaftaran bulan ini'), 'Must mention this month');
    assert.ok(response.body.reply.includes('Pendaftaran bulan lalu'), 'Must mention last month');
    assert.ok(response.body.reply.includes('Selisih'), 'Must compute diff');
    assert.ok(!response.body.reply.includes('Pinjaman'), 'Must not include loan stats');
    assert.ok(!response.body.reply.includes('Simpanan'), 'Must not include savings stats');
  });

  // TEST 9: Multi-turn Context Memory ("Tampilkan daftarnya")
  it('9. "Tampilkan daftarnya" understands context from previous loan question', async () => {
    // Turn 1: Admin asks about unpaid loans
    const turn1 = await serverHandler.handleChatRequest(
      { message: 'Berapa total pinjaman belum lunas?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.strictEqual(turn1.status, 200);
    assert.ok(turn1.body.reply.includes('pinjaman berjalan') || turn1.body.reply.includes('pinjaman'));

    // Turn 2: Admin asks "Tampilkan daftarnya."
    const turn2 = await serverHandler.handleChatRequest(
      {
        message: 'Tampilkan daftarnya.',
        conversation: [
          { role: 'user', content: 'Berapa total pinjaman belum lunas?' },
          { role: 'assistant', content: turn1.body.reply }
        ]
      },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    assert.strictEqual(turn2.status, 200);
    assert.ok(turn2.body.reply.includes('Daftar pinjaman belum lunas') || turn2.body.reply.includes('LN-202601-0001'), 'Must display active loans list');
  });

  // TEST 10: Multi-turn Context Memory ("Kalau bulan lalu?")
  it('10. "Kalau bulan lalu?" understands previous registration query context', async () => {
    // Turn 1: Admin asks registrations this month
    const turn1 = await serverHandler.handleChatRequest(
      { message: 'Ada berapa orang yang baru daftar bulan ini?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.strictEqual(turn1.status, 200);

    // Turn 2: Admin asks "Kalau bulan lalu?"
    const turn2 = await serverHandler.handleChatRequest(
      {
        message: 'Kalau bulan lalu?',
        conversation: [
          { role: 'user', content: 'Ada berapa orang yang baru daftar bulan ini?' },
          { role: 'assistant', content: turn1.body.reply }
        ]
      },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    assert.strictEqual(turn2.status, 200);
    assert.ok(turn2.body.reply.includes('bulan lalu'), 'Must answer registration count for last month');
  });

  // TEST 11: Out of scope request refusal
  it('11. Out-of-scope question does not invent data and politely explains scope', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Bagaimana ramalan cuaca hari ini di Jakarta?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    assert.strictEqual(response.status, 200);
    // Should provide cooperative scope info or clarification without hallucinating weather data
    assert.ok(!response.body.reply.includes('cerah berawan'), 'Must never hallucinate weather');
  });

  // TEST 12: Database query failure does not produce fake numbers
  it('12. Database query failure cleanly informs user without producing fake figures', async () => {
    const faultyAdapter = {
      async getAll() {
        throw new Error('Database connection timeout (simulated)');
      },
      async findById(table, id) {
        if (table === 'sessions') {
          return { token: 'faulty-tok', user_id: 'usr-admin-001', expires_at: new Date(Date.now() + 60000).toISOString(), is_revoked: false };
        }
        if (table === 'users') {
          return { id: 'usr-admin-001', name: 'Admin Koperasi', role: 'ADMIN', status: 'ACTIVE' };
        }
        return null;
      }
    };

    const faultyHandler = new AiChatServerHandler({ adapter: faultyAdapter });
    faultyHandler._initialized = true;

    const response = await faultyHandler.handleChatRequest(
      { message: 'Berapa total anggota?' },
      { authorization: 'Bearer faulty-tok' }
    );

    assert.strictEqual(response.status, 200);
    assert.ok(response.body.reply.includes('belum dapat diperiksa') || response.body.reply.includes('Database connection timeout'));
    assert.ok(!response.body.reply.includes('5 orang'), 'Must not invent fake numbers on DB failure');
  });

  // TEST 13: RBAC protection for members
  it('13. Member cannot access other members unpaid installments or global stats', async () => {
    // Dosen tries to see unpaid installments of all members
    const response = await serverHandler.handleChatRequest(
      { message: 'Siapa anggota yang belum membayar angsuran?' },
      { authorization: `Bearer ${DOSEN_TOKEN}` }
    );

    assert.strictEqual(response.status, 200);
    // Dosen has no overdue installments themselves, so they should see only their own status (no other members like Budi Santoso)
    assert.ok(!response.body.reply.includes('Budi Santoso'), 'Member must never see other members unpaid installments');
  });
});
