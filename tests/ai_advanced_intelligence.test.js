/**
 * Test Suite: Advanced Intelligence, Intent Detection, Context-Aware Multi-Turn,
 * and Anti-Raw-JSON Regression Safety for Smart Co-op AI Assistant
 * 
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

describe('Advanced Intelligence & Anti-JSON Regression Test Suite', () => {
  let testAdapter;
  let dataService;
  let serverHandler;

  const ADMIN_TOKEN = 'ikmi_tok_admin_adv_intel_token_2026';
  const CHAIRMAN_TOKEN = 'ikmi_tok_ketua_adv_intel_token_2026';
  const DOSEN_TOKEN = 'ikmi_tok_dosen_adv_intel_token_2026';
  const MHS_TOKEN = 'ikmi_tok_mhs_adv_intel_token_2026';

  beforeEach(async () => {
    testAdapter = new DatabaseAdapter(`test_ai_adv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
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

  // TEST 1: REGRESSION TEST FOR SCREENSHOT BUG ("Jelaskan aplikasi ini dan sistem ini?")
  it('1. Regression: "Jelaskan aplikasi ini dan sistem ini?" returns natural narrative with ZERO raw JSON', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Jelaskan aplikasi ini dan sistem ini?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    const reply = response.body.reply;

    // Strict Anti-JSON Checks:
    assert.ok(!reply.includes('{"authorized"'), 'Must NEVER leak {"authorized"');
    assert.ok(!reply.includes('"totalTerdaftar"'), 'Must NEVER leak raw JSON keys');
    assert.ok(!reply.includes('timestamp'), 'Must NEVER leak raw timestamp JSON field');
    assert.ok(!reply.includes('Informasi data koperasi: {'), 'Must NOT return stringified object');
    assert.ok(!reply.startsWith('{') && !reply.endsWith('}'), 'Must not be a JSON block');

    // Natural narrative checks:
    assert.ok(reply.includes('Smart Co-op Financial System') || reply.includes('STMIK IKMI Cirebon'), 'Must explain application name/institution');
    assert.ok(reply.includes('Simpanan') || reply.includes('Pinjaman') || reply.includes('Anggota'), 'Must mention core modules');
  });

  // TEST 2: "Siapa saya?" responds strictly with session identity
  it('2. "Siapa saya?" responds strictly with session identity and no stats', async () => {
    const resAdmin = await serverHandler.handleChatRequest(
      { message: 'Siapa saya?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.ok(resAdmin.body.reply.includes('Admin Koperasi IKMI'));
    assert.ok(!resAdmin.body.reply.includes('5 orang'), 'Must not leak member stats for identity question');

    const resMhs = await serverHandler.handleChatRequest(
      { message: 'Saya login sebagai apa?' },
      { authorization: `Bearer ${MHS_TOKEN}` }
    );
    assert.ok(resMhs.body.reply.includes('Mahasiswa') || resMhs.body.reply.includes('Anggota'));
  });

  // TEST 3: "Halo" returns polite greeting without database query
  it('3. "Halo" returns greeting without statistical database queries', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Halo, selamat pagi!' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.strictEqual(response.status, 200);
    const reply = response.body.reply;
    assert.ok(reply.includes('Halo') || reply.includes('Selamat') || reply.includes('bantu'));
    assert.ok(!reply.includes('totalTerdaftar'));
    assert.ok(!reply.includes('Rp '));
  });

  // TEST 4: "Berapa total anggota?" uses actual database figures
  it('4. "Berapa total anggota?" retrieves actual database counts', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Berapa total anggota?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.strictEqual(response.status, 200);
    const reply = response.body.reply;
    assert.ok(reply.includes('5'), 'Must state 5 registered members from seeded DB');
    assert.ok(!reply.includes('{'), 'Must not contain raw braces');
  });

  // TEST 5: "Jelaskan fitur pinjaman" explains only verified features
  it('5. "Jelaskan fitur pinjaman" explains only actual verified loan workflow', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Jelaskan fitur pinjaman' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.strictEqual(response.status, 200);
    const reply = response.body.reply;
    assert.ok(reply.includes('Pinjaman') || reply.includes('pinjaman'));
    assert.ok(reply.includes('Pengajuan') || reply.includes('Persetujuan') || reply.includes('Angsuran'));
    assert.ok(!reply.includes('{'), 'Must not contain JSON');
  });

  // TEST 6: Multi-Turn Sequence: "Berapa total anggota?" -> "Berapa yang aktif?"
  it('6. Multi-Turn: "Berapa total anggota?" followed by "Berapa yang aktif?"', async () => {
    // Turn 1
    const res1 = await serverHandler.handleChatRequest(
      { message: 'Berapa total anggota?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.strictEqual(res1.status, 200);
    assert.ok(res1.body.reply.includes('5'));

    // Turn 2: User asks "Berapa yang aktif?" with context history
    const history = [
      { role: 'user', content: 'Berapa total anggota?' },
      { role: 'assistant', content: res1.body.reply }
    ];
    const res2 = await serverHandler.handleChatRequest(
      { message: 'Berapa yang aktif?', conversation: history },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.strictEqual(res2.status, 200);
    assert.ok(res2.body.reply.includes('aktif') || res2.body.reply.includes('5'), 'Must specifically answer active members count');
    assert.ok(!res2.body.reply.includes('{'), 'Must be clean natural text');
  });

  // TEST 7: Multi-Turn Sequence: "Jelaskan sistem pinjaman" -> "Bagaimana cara menyetujuinya?"
  it('7. Multi-Turn: "Jelaskan sistem pinjaman" followed by "Bagaimana cara menyetujuinya?"', async () => {
    const history = [
      { role: 'user', content: 'Jelaskan sistem pinjaman' },
      { role: 'assistant', content: 'Alur pinjaman mencakup pengajuan, verifikasi, dan persetujuan.' }
    ];

    // Admin asks
    const adminRes = await serverHandler.handleChatRequest(
      { message: 'Bagaimana cara menyetujuinya?', conversation: history },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.ok(adminRes.body.reply.includes('persetujuan') || adminRes.body.reply.includes('Persetujuan') || adminRes.body.reply.includes('Ketua') || adminRes.body.reply.includes('Admin'));

    // Member asks (RBAC check in guide)
    const mhsRes = await serverHandler.handleChatRequest(
      { message: 'Bagaimana cara menyetujuinya?', conversation: history },
      { authorization: `Bearer ${MHS_TOKEN}` }
    );
    assert.ok(mhsRes.body.reply.includes('khusus') || mhsRes.body.reply.includes('Pengurus') || mhsRes.body.reply.includes('Ketua') || mhsRes.body.reply.includes('hanya'));
  });

  // TEST 8: Multi-Turn Sequence: "Bandingkan pendaftaran bulan ini dan bulan lalu" -> "Kenapa menurun?"
  it('8. Multi-Turn: "Kenapa menurun?" explains factual difference without hallucination', async () => {
    const history = [
      { role: 'user', content: 'Bandingkan pendaftaran bulan ini dengan bulan lalu' },
      { role: 'assistant', content: 'Pendaftaran bulan ini adalah 0 orang, sedangkan bulan lalu 5 orang.' }
    ];

    const res = await serverHandler.handleChatRequest(
      { message: 'Kenapa menurun?', conversation: history },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.ok(res.body.reply.toLowerCase().includes('selisih') || res.body.reply.toLowerCase().includes('penurunan') || res.body.reply.toLowerCase().includes('faktor'), 'Must explain factual numerical delta');
    assert.ok(!res.body.reply.includes('{'), 'Must not contain raw JSON');
  });

  // TEST 9: Workflow Guides: "Bagaimana menambahkan anggota?" & "Bagaimana mencatat simpanan?"
  it('9. Workflow Guides: step-by-step guidance for adding members and recording savings', async () => {
    const resAddMember = await serverHandler.handleChatRequest(
      { message: 'Bagaimana menambahkan anggota baru?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.ok(resAddMember.body.reply.includes('Tambah Anggota') || resAddMember.body.reply.includes('Master Data'));

    const resRecordSaving = await serverHandler.handleChatRequest(
      { message: 'Bagaimana mencatat simpanan?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.ok(resRecordSaving.body.reply.includes('Setor') || resRecordSaving.body.reply.includes('Simpanan'));
  });

  // TEST 10: Technical Question: "Bagaimana sistem autentikasi bekerja?"
  it('10. Technical explanation: Explains PBKDF2 and sessions without leaking sensitive data', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Bagaimana sistem autentikasi bekerja?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.strictEqual(response.status, 200);
    const reply = response.body.reply;
    assert.ok(reply.includes('PBKDF2') || reply.includes('token') || reply.includes('Session') || reply.includes('autentikasi'));
    assert.ok(!reply.includes('ikmi_tok_'), 'Must NEVER leak session token string');
  });

  // TEST 11: Non-Active Module: Inventory/Stock query clarifies accurately
  it('11. Non-Active Module: Physical stock/inventory query states module is not active', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Bagaimana cara cek persediaan barang atau stok barang?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );
    assert.strictEqual(response.status, 200);
    const reply = response.body.reply;
    assert.ok(reply.includes('belum') || reply.includes('tidak') || reply.includes('fokus') || reply.includes('Simpan Pinjam'), 'Must clarify inventory is not active');
    assert.ok(!reply.includes('{'), 'Must not contain JSON');
  });

  // TEST 12: RBAC Protection: Member cannot access general members or loan lists
  it('12. RBAC Data Isolation: Member receives access restriction notice when querying member list', async () => {
    const response = await serverHandler.handleChatRequest(
      { message: 'Tampilkan daftar semua anggota koperasi' },
      { authorization: `Bearer ${MHS_TOKEN}` }
    );
    assert.strictEqual(response.status, 200);
    const reply = response.body.reply;
    assert.ok(reply.includes('Akses Terbatas') || reply.includes('khusus') || reply.includes('Admin') || reply.includes('Pengurus'));
    assert.ok(!reply.includes('Budi Santoso'), 'Must not expose other members to general member role');
  });

  // TEST 13: History Isolation Between Users
  it('13. Multi-User Session Isolation: Chat histories do not leak across users', async () => {
    // Admin asks about unpaid installments
    await serverHandler.handleChatRequest(
      { message: 'Siapa yang belum bayar angsuran?' },
      { authorization: `Bearer ${ADMIN_TOKEN}` }
    );

    // Member asks "Siapa saya?" with empty history
    const mhsRes = await serverHandler.handleChatRequest(
      { message: 'Siapa saya?' },
      { authorization: `Bearer ${MHS_TOKEN}` }
    );
    assert.ok(!mhsRes.body.reply.includes('angsuran'), 'Member response must not contain remnants of Admin context');
    assert.ok(mhsRes.body.reply.includes('Mahasiswa') || mhsRes.body.reply.includes('Anggota'));
  });

  // TEST 14: Malformed LLM Output Sanitization
  it('14. Resilient Sanitizer: Cleans accidental raw JSON string from external model', async () => {
    const coordinator = serverHandler.coordinator;
    
    // Test raw JSON sanitizer directly
    const rawJsonInput = '{"authorized":true,"timestamp":"2026-10-23T01:00:00.000Z","summary":{"totalTerdaftar":5,"totalAktif":5},"definisi":"Smart Co-op Financial System adalah aplikasi pengelolaan koperasi."}';
    const sanitized = coordinator._sanitizeAssistantOutput(rawJsonInput);
    
    assert.ok(!sanitized.startsWith('{'), 'Sanitizer must unpack raw JSON');
    assert.ok(sanitized.includes('Smart Co-op Financial System'), 'Must extract definition or summary');
  });
});
