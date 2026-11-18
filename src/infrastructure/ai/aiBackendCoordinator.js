/**
 * AI Backend Coordinator & Intent Controller
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Orchestrates:
 * 1. Precision Intent Detection (General, System Explanation, Workflows, Data, Tech)
 * 2. Strict Role-Based Access Control (RBAC) Data Retrieval
 * 3. Human-Readable Natural Indonesian Responses (ZERO RAW JSON LEAKAGE)
 * 4. Context-Aware Multi-Turn Conversation Memory
 * 5. NVIDIA AI NIM Synthesis & Resilient Fallback Engine
 */

import { AiAuthorizedDataService } from '../../core/services/AiAuthorizedDataService.js';
import { AuditLogService } from '../../core/services/AuditLogService.js';
import { ROLES, AI_ROLES } from '../../config/constants.js';
import { resolveEffectiveRole } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { AiModelManager, AiModelRouter } from './manager/index.js';
import { IntelligentQueryUnderstanding } from './nlu/IntelligentQueryUnderstanding.js';
import { IntelligentAnswerFormatter } from './nlu/IntelligentAnswerFormatter.js';
import { ResponseValidator } from './validation/ResponseValidator.js';

export class AiBackendCoordinator {
  constructor({ aiService = null, dataService = null, adapter = null, modelManager = null, modelRouter = null, auditService = null } = {}) {
    this.aiService = aiService;
    this.db = adapter;
    this.auditService = auditService || new AuditLogService(adapter);
    this.dataService = dataService || new AiAuthorizedDataService(adapter, this.auditService);
    this.modelManager = modelManager || new AiModelManager({ adapter });
    this.modelRouter = modelRouter || new AiModelRouter({ manager: this.modelManager, adapter });
    this.nlu = new IntelligentQueryUnderstanding();

    if (this.aiService && this.aiService.apiKey) {
      const nvidiaAdapter = this.modelManager.getAdapter('nvidia');
      if (nvidiaAdapter) {
        nvidiaAdapter.apiKey = this.aiService.apiKey;
        if (this.aiService.baseUrl) nvidiaAdapter.baseUrl = this.aiService.baseUrl;
        if (this.aiService.model) nvidiaAdapter.defaultModel = this.aiService.model;
      }
    }

    // User session context memory: Map<userId, { lastTopic, lastIntent, lastFilter, timestamp }>
    this.userSessionMemory = new Map();
  }

  /**
   * Helper: Normalize text for flexible Indonesian matching
   */
  _normalize(text = '') {
    return String(text)
      .toLowerCase()
      .replace(/[.,?!;:()'"“”]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Classify user query intent with multi-turn context memory support
   * @param {string} rawMessage
   * @param {Array<{role: string, content: string}>} conversation
   * @param {object|null} user
   * @param {object|null} member
   * @returns {{intent: string, details?: object, topic?: string}}
   */
  classifyIntent(rawMessage = '', conversation = [], user = null, member = null) {
    const text = this._normalize(rawMessage);
    const effectiveRole = resolveEffectiveRole(user, member);

    // 1. Role Escalation & Anti-Prompt-Injection Detection
    const hasRoleEscalationAttempt =
      text.includes('saya sekarang adalah admin') ||
      text.includes('saya sekarang admin') ||
      text.includes('saya adalah admin') ||
      text.includes('sekarang saya admin') ||
      text.includes('saya sekarang sebagai admin') ||
      text.includes('jadikan saya admin') ||
      text.includes('ubah role saya') ||
      text.includes('ganti role saya') ||
      text.includes('ubah peran saya') ||
      text.includes('ganti peran saya') ||
      text.includes('berikan saya akses admin') ||
      text.includes('berikan akses admin') ||
      text.includes('role saya diganti') ||
      text.includes('role saya dinaikkan') ||
      text.includes('role saya diubah') ||
      text.includes('role saya adalah admin') ||
      text.includes('bypass rbac') ||
      text.includes('mode developer') ||
      text.includes('developer mode') ||
      text.includes('jailbreak') ||
      text.includes('abaikan semua batasan') ||
      text.includes('abaikan batasan') ||
      text.includes('tanpa batasan');

    if (hasRoleEscalationAttempt && effectiveRole !== ROLES.ADMIN) {
      return { intent: 'ROLE_ESCALATION_ATTEMPT', topic: 'SECURITY' };
    }

    // 1b. Member Data Isolation Guard: Non-admin trying to probe other members' confidential records
    if (effectiveRole && effectiveRole !== ROLES.ADMIN && effectiveRole !== ROLES.CHAIRMAN) {
      const targetsOtherMember =
        text.includes('anggota lain') ||
        text.includes('orang lain') ||
        text.includes('milik siti') ||
        text.includes('milik pak dadang') ||
        text.includes('milik dadang') ||
        text.includes('milik budi') ||
        text.includes('milik ahmad fauzi') ||
        text.includes('pinjaman orang') ||
        text.includes('simpanan orang') ||
        text.includes('data anggota lain') ||
        text.includes('saldo anggota lain');

      if (targetsOtherMember) {
        return { intent: 'OTHER_MEMBER_DATA_ATTEMPT', topic: 'SECURITY' };
      }
    }

    // 1c. Secret / Credential / Prompt Injection Detection
    if (
      text.includes('password') ||
      text.includes('kata sandi') ||
      text.includes('salt') ||
      text.includes('api_key') ||
      text.includes('apikey') ||
      text.includes('api key') ||
      text.includes('secret') ||
      text.includes('token sesi') ||
      text.includes('session token') ||
      text.includes('select * from') ||
      text.includes('drop table') ||
      text.includes('abaikan aturan') ||
      text.includes('abaikan instruksi') ||
      text.includes('ignore previous instructions') ||
      text.includes('tampilkan semua database') ||
      text.includes('dump database')
    ) {
      return { intent: 'SECURITY_ALERT', topic: 'SECURITY' };
    }

    // 2. Data Mutation Attempt (Read-Only Enforcement)
    if (
      text.startsWith('tambah ') ||
      text.includes('tambahkan ') ||
      text.includes('buatkan anggota') ||
      text.includes('buat anggota') ||
      text.startsWith('hapus ') ||
      text.startsWith('delete ') ||
      text.startsWith('ubah ') ||
      text.startsWith('update ') ||
      text.includes('setor uang') ||
      text.includes('tarik saldo') ||
      text.includes('setujui pinjaman') ||
      text.includes('cairkan pinjaman')
    ) {
      return { intent: 'MUTATION_ATTEMPT', topic: 'MUTATION' };
    }

    // 3. User Identity ("Siapa saya?")
    if (
      text === 'siapa saya' ||
      text === 'saya siapa' ||
      text === 'siapa aku' ||
      text === 'role saya' ||
      text === 'role saya apa' ||
      text === 'peran saya' ||
      text === 'peran saya apa' ||
      text === 'saya login sebagai' ||
      text === 'saya login sebagai apa' ||
      text === 'saya login sebagai siapa' ||
      text === 'akun saya' ||
      text === 'status login saya' ||
      text === 'siapa yang sedang login'
    ) {
      return { intent: 'WHO_AM_I', topic: 'IDENTITY' };
    }

    // 4. Greetings
    if (
      text === 'halo' ||
      text === 'hai' ||
      text === 'hei' ||
      text === 'hello' ||
      text === 'hi' ||
      text.startsWith('halo') ||
      text.startsWith('hai ') ||
      text.startsWith('hello ') ||
      text.includes('selamat pagi') ||
      text.includes('selamat siang') ||
      text.includes('selamat sore') ||
      text.includes('selamat malam') ||
      text.includes('assalamualaikum') ||
      text.includes('assalamu alaikum')
    ) {
      return { intent: 'GREETING', topic: 'CONVERSATIONAL' };
    }

    // 5. Courtesy / Thanks
    if (
      text === 'terima kasih' ||
      text === 'makasih' ||
      text === 'thanks' ||
      text === 'thank you' ||
      text === 'matur nuwun' ||
      text === 'syukran' ||
      text === 'terimakasih' ||
      text.startsWith('terima kasih') ||
      text.startsWith('makasih')
    ) {
      return { intent: 'THANKS', topic: 'CONVERSATIONAL' };
    }

    // 6. Bot Info / Capabilities
    if (
      text === 'siapa kamu' ||
      text === 'kamu siapa' ||
      text === 'siapa anda' ||
      text === 'anda siapa' ||
      text === 'bantuan' ||
      text === 'help' ||
      text === 'menu bantuan'
    ) {
      return { intent: 'BOT_INFO', topic: 'BOT_INFO' };
    }

    // 7. System & Application Overview ("Jelaskan aplikasi ini dan sistem ini?")
    if (
      text.includes('jelaskan aplikasi ini') ||
      text.includes('jelaskan sistem ini') ||
      text.includes('apa fungsi smart co-op') ||
      text.includes('apa fungsi smart coop') ||
      text.includes('apa fungsi aplikasi ini') ||
      text.includes('apa fungsi sistem ini') ||
      text.includes('bagaimana sistem koperasi ini bekerja') ||
      text.includes('bagaimana sistem ini bekerja') ||
      text.includes('bagaimana cara kerja sistem ini') ||
      text.includes('tentang aplikasi ini') ||
      text.includes('tentang smart co-op') ||
      text.includes('gambaran umum sistem') ||
      text.includes('apa saja fitur yang tersedia') ||
      text.includes('apa saja fitur aplikasi ini') ||
      text.includes('fitur yang tersedia') ||
      text.includes('fitur apa saja')
    ) {
      return { intent: 'APP_EXPLANATION', topic: 'SYSTEM_OVERVIEW' };
    }

    // 8. Specific Feature Explanations
    if (
      text.includes('jelaskan alur pinjaman') ||
      text.includes('jelaskan sistem pinjaman') ||
      text.includes('bagaimana alur pinjaman') ||
      text.includes('bagaimana sistem pinjaman') ||
      text.includes('jelaskan fitur pinjaman') ||
      text.includes('skema bunga pinjaman') ||
      text.includes('skema bunga') ||
      text.includes('perbedaan bunga flat')
    ) {
      return { intent: 'EXPLAIN_LOANS', topic: 'LOAN' };
    }

    if (
      text.includes('jelaskan alur simpanan') ||
      text.includes('bagaimana sistem simpanan') ||
      text.includes('jelaskan jenis simpanan') ||
      text.includes('perbedaan simpanan') ||
      text.includes('jenis-jenis simpanan') ||
      text.includes('jenis simpanan')
    ) {
      return { intent: 'EXPLAIN_SAVINGS', topic: 'SAVINGS' };
    }

    if (
      text.includes('jelaskan alur angsuran') ||
      text.includes('bagaimana sistem angsuran') ||
      text.includes('aturan jatuh tempo')
    ) {
      return { intent: 'EXPLAIN_INSTALLMENTS', topic: 'INSTALLMENT' };
    }

    if (
      text.includes('jelaskan laporan keuangan') ||
      text.includes('bagaimana pembukuan kas') ||
      text.includes('bagaimana arus kas dihitung')
    ) {
      return { intent: 'EXPLAIN_FINANCIAL', topic: 'FINANCIAL' };
    }

    if (
      text.includes('bagaimana keamanan sistem') ||
      text.includes('jelaskan autentikasi') ||
      text.includes('sistem autentikasi') ||
      text.includes('cara kerja autentikasi') ||
      text.includes('autentikasi') ||
      text.includes('keamanan') ||
      text.includes('sistem role') ||
      text.includes('rbac')
    ) {
      return { intent: 'EXPLAIN_SECURITY', topic: 'SECURITY' };
    }

    if (
      text.includes('jelaskan notifikasi telegram') ||
      text.includes('bagaimana bot telegram bekerja') ||
      text.includes('notifikasi telegram')
    ) {
      return { intent: 'EXPLAIN_TELEGRAM', topic: 'TELEGRAM' };
    }

    // 9. Workflow Guides (How-To)
    if (
      text.includes('bagaimana cara menyetujuinya') ||
      text.includes('cara menyetujuinya') ||
      text.includes('bagaimana menyetujui pinjaman') ||
      text.includes('cara menyetujui pinjaman')
    ) {
      return { intent: 'GUIDE_APPROVE_LOAN', topic: 'LOAN' };
    }

    if (
      text.includes('bagaimana menambahkan anggota') ||
      text.includes('bagaimana menambah anggota') ||
      text.includes('cara menambah anggota') ||
      text.includes('cara mendaftar anggota') ||
      text.includes('cara daftar anggota')
    ) {
      return { intent: 'GUIDE_REGISTER_MEMBER', topic: 'MEMBER' };
    }

    if (
      text.includes('bagaimana mencatat simpanan') ||
      text.includes('bagaimana menyetor simpanan') ||
      text.includes('cara setor simpanan') ||
      text.includes('cara menyetor simpanan')
    ) {
      return { intent: 'GUIDE_DEPOSIT_SAVINGS', topic: 'SAVINGS' };
    }

    if (
      text.includes('bagaimana mengajukan pinjaman') ||
      text.includes('cara mengajukan pinjaman') ||
      text.includes('cara pinjam uang')
    ) {
      return { intent: 'GUIDE_APPLY_LOAN', topic: 'LOAN' };
    }

    if (
      text.includes('bagaimana membayar angsuran') ||
      text.includes('cara bayar angsuran') ||
      text.includes('cara pembayaran angsuran')
    ) {
      return { intent: 'GUIDE_PAY_INSTALLMENT', topic: 'INSTALLMENT' };
    }

    if (
      text.includes('bagaimana membuat laporan') ||
      text.includes('cara membuat laporan') ||
      text.includes('cara cetak laporan')
    ) {
      return { intent: 'GUIDE_REPORTS', topic: 'FINANCIAL' };
    }

    if (
      text.includes('bagaimana cara menggunakan aplikasi ini') ||
      text.includes('bagaimana menggunakan aplikasi ini') ||
      text.includes('cara menggunakan aplikasi') ||
      text.includes('panduan aplikasi')
    ) {
      return { intent: 'APP_GUIDE', topic: 'GUIDE' };
    }

    // 10. Stock & Inventory (Honest unavailability)
    if (
      text.includes('stok') ||
      text.includes('inventaris') ||
      text.includes('barang habis') ||
      text.includes('barang masuk') ||
      text.includes('barang keluar') ||
      text.includes('gudang') ||
      text.includes('sisa barang')
    ) {
      return { intent: 'INVENTORY_QUERY', topic: 'INVENTORY' };
    }

    // 11. Cooperative Coding Assistance
    if (
      text.includes('contoh kode') ||
      text.includes('coding') ||
      text.includes('javascript') ||
      text.includes('python') ||
      text.includes('script login') ||
      text.includes('koding') ||
      text.includes('bikin kode')
    ) {
      return { intent: 'COOP_CODING', topic: 'CODING' };
    }

    // 12. Own Profile
    if (
      text.includes('profil saya') ||
      text.includes('identitas saya') ||
      text.includes('nomor anggota saya') ||
      text.includes('data diri saya') ||
      text.includes('status keanggotaan saya')
    ) {
      return { intent: 'OWN_PROFILE', topic: 'PROFILE' };
    }

    // 13. CONTEXT MEMORY: Multi-turn Follow-up queries & NLU Engine
    const previousContext = this._getRecentSessionContext(user, conversation);

    // Run high-precision NLU classifier with Indonesian slang, typos, and entity recognition
    const nluResult = this.nlu.classify(rawMessage, conversation, previousContext, effectiveRole);
    if (nluResult && nluResult.intent && nluResult.intent !== 'GENERAL_QUESTION') {
      return nluResult;
    }

    // Follow-up: "Berapa yang aktif?", "Yang aktif berapa?"
    if (
      (text.includes('yang aktif') || text.includes('berapa aktif') || text === 'aktif berapa' || text === 'berapa yang aktif?') &&
      previousContext && (previousContext.topic === 'MEMBER' || previousContext.intent.startsWith('MEMBER'))
    ) {
      return { intent: 'MEMBER_ACTIVE', topic: 'MEMBER' };
    }

    // Follow-up: "Kenapa menurun?", "Kenapa naik?", "Mengapa hasilnya berbeda?"
    if (
      text.includes('kenapa menurun') ||
      text.includes('mengapa menurun') ||
      text.includes('kenapa turun') ||
      text.includes('kenapa naik') ||
      text.includes('mengapa naik') ||
      text.includes('mengapa hasilnya berbeda') ||
      text.includes('kenapa hasilnya')
    ) {
      return { intent: 'EXPLAIN_DIFFERENCE', topic: 'REGISTRATION' };
    }

    // Follow-up: Period queries
    const isPeriodFollowUp =
      text.includes('kalau bulan lalu') ||
      text === 'bulan lalu' ||
      text === 'bulan lalu?' ||
      text === 'bagaimana bulan lalu' ||
      text === 'bagaimana dengan bulan lalu' ||
      text === 'lalu bulan lalu' ||
      text === 'kalau bulan ini' ||
      text === 'bulan ini?' ||
      text === 'bagaimana bulan ini';

    if (isPeriodFollowUp && previousContext) {
      if (previousContext.topic === 'REGISTRATION' || previousContext.intent.startsWith('REGISTRATION')) {
        if (text.includes('bulan lalu')) {
          return { intent: 'REGISTRATION_LAST_MONTH', topic: 'REGISTRATION' };
        }
        return { intent: 'REGISTRATION_THIS_MONTH', topic: 'REGISTRATION' };
      }
    }

    // Follow-up: List queries ("Tampilkan daftarnya", "Siapa saja mereka?")
    const isListFollowUp =
      text.includes('tampilkan daftarnya') ||
      text.includes('lihat daftarnya') ||
      text.includes('mana daftarnya') ||
      text === 'daftarnya' ||
      text === 'daftarnya?' ||
      text === 'daftarnya mana' ||
      text === 'daftarnya mana?' ||
      text.includes('siapa saja mereka') ||
      text === 'siapa saja' ||
      text === 'siapa saja?' ||
      text === 'siapa sajakah' ||
      text === 'siapa sajakah?' ||
      text.includes('tampilkan rinciannya') ||
      text === 'rinciannya' ||
      text === 'detailnya' ||
      text.includes('tampilkan detailnya');

    if (isListFollowUp) {
      if (previousContext) {
        if (previousContext.topic === 'MEMBER' || previousContext.intent.startsWith('MEMBER')) {
          return { intent: 'MEMBER_LIST', topic: 'MEMBER' };
        }
        if (previousContext.topic === 'LOAN' || previousContext.intent.startsWith('LOAN')) {
          return { intent: 'LOAN_LIST', topic: 'LOAN' };
        }
        if (previousContext.topic === 'INSTALLMENT' || previousContext.intent.startsWith('INSTALLMENT')) {
          return { intent: 'INSTALLMENT_UNPAID_MEMBERS', topic: 'INSTALLMENT' };
        }
        if (previousContext.topic === 'SAVINGS' || previousContext.intent.startsWith('SAVINGS')) {
          return { intent: 'SAVINGS_DETAIL', topic: 'SAVINGS' };
        }
      }
      return { intent: 'CLARIFICATION_NEEDED', details: { reason: 'list_target_unknown' }, topic: 'UNKNOWN' };
    }

    // 14. Specific Installments & Arrears Queries
    if (
      text.includes('siapa anggota yang belum membayar angsuran') ||
      text.includes('siapa yang belum bayar angsuran') ||
      text.includes('siapa yang belum bayar') ||
      text.includes('anggota yang belum bayar angsuran') ||
      text.includes('anggota yang belum membayar angsuran') ||
      text.includes('siapa yang menunggak') ||
      text.includes('daftar anggota menunggak')
    ) {
      return { intent: 'INSTALLMENT_UNPAID_MEMBERS', topic: 'INSTALLMENT' };
    }

    if (
      text.includes('total tunggakan') ||
      text.includes('nominal tunggakan') ||
      text.includes('angsuran menunggak') ||
      text.includes('angsuran jatuh tempo') ||
      text.includes('berapa tunggakan')
    ) {
      return { intent: 'INSTALLMENT_OVERDUE', topic: 'INSTALLMENT' };
    }

    if (
      text.includes('jadwal angsuran saya') ||
      text.includes('angsuran saya') ||
      text.includes('tagihan saya') ||
      text.includes('jadwal angsuran')
    ) {
      return { intent: 'INSTALLMENT_MY', topic: 'INSTALLMENT' };
    }

    if (text.includes('daftar angsuran') || text.includes('tampilkan angsuran')) {
      return { intent: 'INSTALLMENT_LIST', topic: 'INSTALLMENT' };
    }

    // 15. Specific Loan Queries
    if (
      text.includes('pinjaman yang belum lunas ada berapa') ||
      text.includes('pinjaman belum lunas') ||
      text.includes('berapa total pinjaman belum lunas') ||
      text.includes('pinjaman berjalan') ||
      text.includes('pinjaman aktif') ||
      text.includes('sisa pinjaman koperasi') ||
      text.includes('kondisi pinjaman koperasi')
    ) {
      return { intent: 'LOAN_UNPAID', topic: 'LOAN' };
    }

    if (
      text.includes('pinjaman pending') ||
      text.includes('menunggu persetujuan') ||
      text.includes('pinjaman yang belum disetujui')
    ) {
      return { intent: 'LOAN_PENDING', topic: 'LOAN' };
    }

    if (
      text.includes('status pinjaman saya') ||
      text.includes('pinjaman saya') ||
      text.includes('sisa pinjaman saya') ||
      text.includes('pengajuan pinjaman saya')
    ) {
      return { intent: 'LOAN_MY', topic: 'LOAN' };
    }

    if (text.includes('daftar pinjaman') || text.includes('tampilkan pinjaman')) {
      return { intent: 'LOAN_LIST', topic: 'LOAN' };
    }

    if (text.includes('total pinjaman') || text.includes('portofolio pinjaman')) {
      return { intent: 'LOAN_SUMMARY', topic: 'LOAN' };
    }

    // 16. Specific Savings Queries
    if (text.includes('simpanan wajib')) {
      return { intent: 'SAVINGS_WAJIB', topic: 'SAVINGS' };
    }

    if (text.includes('simpanan pokok')) {
      return { intent: 'SAVINGS_POKOK', topic: 'SAVINGS' };
    }

    if (text.includes('simpanan sukarela')) {
      return { intent: 'SAVINGS_SUKARELA', topic: 'SAVINGS' };
    }

    if (
      text.includes('saldo simpanan saya') ||
      text.includes('simpanan saya') ||
      text.includes('tabungan saya') ||
      text.includes('berapa saldo saya')
    ) {
      return { intent: 'SAVINGS_MY', topic: 'SAVINGS' };
    }

    if (
      text.includes('total simpanan') ||
      text.includes('total simpanan koperasi') ||
      text.includes('total saldo simpanan') ||
      text.includes('berapa saldo koperasi') ||
      text.includes('saldo koperasi') ||
      text.includes('apakah simpanan meningkat')
    ) {
      return { intent: 'SAVINGS_TOTAL', topic: 'SAVINGS' };
    }

    // 17. Registration Queries & Comparisons
    if (
      text.includes('bandingkan pendaftaran') ||
      text.includes('perbandingan pendaftaran') ||
      text.includes('pertumbuhan anggota') ||
      (text.includes('bulan ini') && text.includes('bulan lalu'))
    ) {
      return { intent: 'REGISTRATION_COMPARE', topic: 'REGISTRATION' };
    }

    if (
      text.includes('daftar bulan ini') ||
      text.includes('pendaftaran bulan ini') ||
      text.includes('orang yang baru daftar bulan ini') ||
      text.includes('anggota baru bulan ini') ||
      text.includes('pendaftaran anggota baru') ||
      text.includes('jumlah anggota bulan ini')
    ) {
      return { intent: 'REGISTRATION_THIS_MONTH', topic: 'REGISTRATION' };
    }

    if (
      text.includes('daftar bulan lalu') ||
      text.includes('pendaftaran bulan lalu') ||
      text.includes('anggota baru bulan lalu')
    ) {
      return { intent: 'REGISTRATION_LAST_MONTH', topic: 'REGISTRATION' };
    }

    // 18. Specific Member Queries
    if (
      text.includes('anggota aktif') ||
      text.includes('jumlah anggota aktif') ||
      text.includes('berapa jumlah anggota aktif') ||
      text.includes('berapa anggota yang aktif')
    ) {
      return { intent: 'MEMBER_ACTIVE', topic: 'MEMBER' };
    }

    if (
      text.includes('anggota nonaktif') ||
      text.includes('anggota belum aktif') ||
      text.includes('anggota tidak aktif') ||
      text.includes('berapa anggota nonaktif')
    ) {
      return { intent: 'MEMBER_INACTIVE', topic: 'MEMBER' };
    }

    if (
      text.includes('daftar anggota') ||
      text.includes('daftar semua anggota') ||
      text.includes('daftar seluruh anggota') ||
      text.includes('semua anggota') ||
      text.includes('seluruh anggota') ||
      text.includes('siapa saja anggotanya') ||
      text.includes('tampilkan daftar anggota') ||
      text.includes('lihat anggota')
    ) {
      return { intent: 'MEMBER_LIST', topic: 'MEMBER' };
    }

    if (
      text.includes('berapa total anggota') ||
      text.includes('total anggota') ||
      text.includes('jumlah anggota') ||
      text.includes('berapa anggota') ||
      text.includes('anggota kita sekarang') ||
      text.includes('total anggota terdaftar') ||
      text.includes('berapa banyak anggota')
    ) {
      return { intent: 'MEMBER_TOTAL', topic: 'MEMBER' };
    }

    // 19. Financial Reports
    if (
      text.includes('laporan keuangan') ||
      text.includes('arus kas') ||
      text.includes('buku kas') ||
      text.includes('pembukuan kas') ||
      text.includes('laporan kas') ||
      text.includes('surplus kas') ||
      text.includes('keuangan koperasi') ||
      text.includes('ringkasan keuangan')
    ) {
      return { intent: 'FINANCIAL_REPORT', topic: 'FINANCIAL' };
    }

    if (text.includes('total pemasukan') || text.includes('kas masuk') || text.includes('pemasukan kas')) {
      return { intent: 'FINANCIAL_INCOME', topic: 'FINANCIAL' };
    }

    if (text.includes('total pengeluaran') || text.includes('kas keluar') || text.includes('pengeluaran kas')) {
      return { intent: 'FINANCIAL_EXPENSE', topic: 'FINANCIAL' };
    }

    if (text.includes('transaksi bulan ini') || text.includes('jumlah transaksi')) {
      return { intent: 'TRANSACTION_SUMMARY', topic: 'FINANCIAL' };
    }

    // 20. Ambiguous / Short Unclear Queries
    if (text.length <= 4 || text === 'cek' || text === 'data' || text === 'koperasi') {
      return { intent: 'CLARIFICATION_NEEDED', topic: 'UNKNOWN' };
    }

    return { intent: 'GENERAL_QUESTION', topic: 'GENERAL' };
  }

  /**
   * Helper: Resolve previous context from memory or conversation
   */
  _getRecentSessionContext(user, conversation = []) {
    if (Array.isArray(conversation) && conversation.length > 0) {
      for (let i = conversation.length - 1; i >= 0; i--) {
        const item = conversation[i];
        if (item && item.role === 'user' && item.content) {
          const prevClassification = this.classifyIntent(item.content, [], null);
          if (prevClassification.topic && prevClassification.topic !== 'CONVERSATIONAL') {
            return prevClassification;
          }
        }
      }
    }

    if (user && this.userSessionMemory.has(user.id)) {
      return this.userSessionMemory.get(user.id);
    }

    return null;
  }

  /**
   * Main Dispatcher: Process incoming question with RBAC data retrieval and LLM context
   */
  async processChat({ message, conversation = [], user, member = null, providerId = null, modelId = null }) {
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Pesan (message) wajib diisi.');
    }

    if (!user) {
      throw new Error('Autentikasi diperlukan. Sesi Anda tidak valid atau telah berakhir.');
    }

    const effectiveRole = resolveEffectiveRole(user, member);
    const classification = this.classifyIntent(message, conversation, user, member);
    const { intent, topic, domain } = classification;

    // Track active topic in user session memory
    if (topic && topic !== 'CONVERSATIONAL') {
      this.userSessionMemory.set(user.id, {
        intent,
        topic,
        domain: domain || topic,
        timestamp: Date.now()
      });
    }

    // Initialize 5-stage Execution Pipeline (Real process indicators)
    const executionPipeline = [
      {
        step: 1,
        name: 'Memahami pertanyaan',
        status: 'completed',
        details: `Maksud: ${intent} | Topik: ${topic || 'SYSTEM'} | Input dianalisis via NLU`
      },
      {
        step: 2,
        name: 'Mengidentifikasi data',
        status: 'completed',
        details: `Domain: ${domain || topic || 'SYSTEM'} | Hak akses terverifikasi: ${effectiveRole}`
      },
      {
        step: 3,
        name: 'Mengambil data database',
        status: 'pending',
        details: 'Menyiapkan kueri database terotorisasi...'
      },
      {
        step: 4,
        name: 'Menganalisis hasil',
        status: 'pending',
        details: 'Validasi integritas data & kalkulasi metrik...'
      },
      {
        step: 5,
        name: 'Menyusun jawaban',
        status: 'pending',
        details: 'Memformulasikan jawaban faktual terstruktur...'
      }
    ];

    // Guard 1a: Role Escalation / Prompt Injection Attempt Detection
    if (intent === 'ROLE_ESCALATION_ATTEMPT') {
      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole,
        module: 'AI_SECURITY_GUARD',
        action: 'PROMPT_INJECTION_DEFENSE',
        status: 'DENIED',
        reason: 'Percobaan eskalasi hak akses / manipulasi prompt ditolak oleh backend guardrail',
        metadata: { message }
      });

      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Dilewati (Percobaan eskalasi diblokir)' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: 'Pelanggaran keamanan dicatat dalam audit log' };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Peringatan keamanan disajikan' };

      return {
        reply: `🛡️ **Peringatan Keamanan Sistem (Anti-Prompt Injection):**\nPermintaan eskalasi hak akses atau manipulasi instruksi sistem ditolak.\n\nSistem Smart Co-op mengunci hak akses berdasarkan **sesi terotentikasi server-side** Anda sebagai **${user.name}** (${effectiveRole}), bukan dari instruksi teks percakapan. Anda tidak dapat mengubah peran atau mengakses data di luar batas kewenangan yang sah.`,
        model: 'system-security-guard',
        intent,
        topic,
        executionPipeline,
        dataContext: { authorized: false, effectiveRole, reason: 'PROMPT_INJECTION_REJECTED' }
      };
    }

    // Guard 1b: Member Data Isolation Guard (attempting to read other members' data)
    if (intent === 'OTHER_MEMBER_DATA_ATTEMPT') {
      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole,
        module: 'AI_SECURITY_GUARD',
        action: 'DATA_ISOLATION_VIOLATION_ATTEMPT',
        status: 'DENIED',
        reason: `Percobaan akses data anggota lain oleh role ${effectiveRole} ditolak`,
        metadata: { message }
      });

      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Dilewati (Isolasi data antar-anggota)' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: 'Prinsip Least Privilege diberlakukan' };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Pemberitahuan isolasi data disajikan' };

      return {
        reply: `🔒 **Akses Ditolak (Isolasi Data Anggota):**\nBerdasarkan kebijakan privasi dan hak akses (RBAC), Anda hanya diizinkan untuk melihat data keuangan dan profil Anda sendiri. Anda tidak memiliki wewenang untuk memeriksa data anggota lain.\n\n*Prinsip Least Privilege diterapkan untuk menjamin kerahasiaan data seluruh civitas STMIK IKMI Cirebon.*`,
        model: 'system-security-guard',
        intent,
        topic,
        executionPipeline,
        dataContext: { authorized: false, effectiveRole, reason: 'MEMBER_DATA_ISOLATION_VIOLATION' }
      };
    }

    // Guard 1c: Anti-Credential Leak & Injection Protection
    if (intent === 'SECURITY_ALERT') {
      await this.auditService.logAccess({
        userId: user.id,
        userName: user.name,
        role: user.role,
        effectiveRole,
        module: 'AI_SECURITY_GUARD',
        action: 'SECURITY_ALERT',
        status: 'DENIED',
        reason: 'Percobaan akses kredensial / rahasia sistem ditolak',
        metadata: { message }
      });

      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Dilewati (Kredensial rahasia dilindungi)' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: 'Pencegahan kebocoran secret diterapkan' };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Pemberitahuan keamanan kredensial disajikan' };

      return {
        reply: `🛡️ **Pemberitahuan Keamanan Sistem:**
Permintaan Anda tidak dapat diproses. Sebagai asisten resmi Smart Co-op Financial System STMIK IKMI Cirebon, saya tidak diizinkan untuk membagikan informasi rahasia (seperti password akun, enkripsi cryptographic salt, session tokens, atau API Key) serta dilarang mengeksekusi instruksi yang melanggar batasan keamanan aplikasi.

Seluruh data dilindungi oleh enkripsi PBKDF2-SHA256 dan pengawasan hak akses terstruktur (RBAC). Ada hal seputar sistem koperasi yang dapat saya bantu?`,
        model: 'system-security-guard',
        intent,
        topic,
        executionPipeline,
        dataContext: null
      };
    }

    // Guard 2: Read-Only Enforcement
    if (intent === 'MUTATION_ATTEMPT') {
      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Dilewati (Mode Read-Only terproteksi)' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: 'AI dibatasi hanya membaca data (Prinsip Immutability)' };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Panduan navigasi menu operasional disajikan' };

      return {
        reply: `⚠️ **Aplikasi Berjalan dalam Mode Read-Only:**
Smart Co-op AI Assistant dirancang khusus sebagai asisten analitis dan informasi pembacaan data (**Read-Only**).

Demi integritas dan akuntabilitas keuangan koperasi, AI **tidak memiliki wewenang** untuk membuat, mengedit, atau menghapus data secara langsung (seperti menambah anggota, menyetujui pinjaman, atau mengubah saldo simpanan).

Silakan gunakan menu dan antarmuka resmi pada Dashboard:
- 👥 Pendaftaran Anggota Baru: Menu **Anggota &bull; Tambah Anggota**
- 💰 Setoran/Penarikan Simpanan: Menu **Simpanan & Operasional**
- 📝 Pengajuan & Persetujuan Pinjaman: Menu **Pinjaman**
- 💳 Pembayaran Angsuran: Menu **Angsuran**`,
        model: 'system-readonly-guard',
        intent,
        topic,
        executionPipeline,
        dataContext: null
      };
    }

    // Guard 3: User Identity ("Siapa saya?") -> Answer strictly identity without any DB stats!
    if (intent === 'WHO_AM_I') {
      let roleLabel = effectiveRole;
      if (effectiveRole === ROLES.ADMIN) {
        roleLabel = 'Admin Koperasi IKMI';
      } else if (effectiveRole === ROLES.CHAIRMAN) {
        roleLabel = 'Ketua STMIK IKMI Cirebon';
      } else if (member) {
        roleLabel = `${member.member_type || effectiveRole} (No. Anggota: ${member.member_number})`;
      }

      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Resolusi identitas sesi terotentikasi' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: `Pencocokan peran: ${effectiveRole}` };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Identitas pengguna disajikan' };

      return {
        reply: `Anda login sebagai **${user.name}** (${roleLabel}).`,
        model: 'system-identity-service',
        intent,
        topic,
        executionPipeline,
        dataContext: { name: user.name, role: user.role, effectiveRole }
      };
    }

    // Guard 4: Natural Sapaan ("Halo") -> Pure greeting without DB stats
    if (intent === 'GREETING') {
      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Dilewati (Pesan percakapan umum)' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: 'Penyiapan respons ramah' };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Sapaan resmi disajikan' };

      return {
        reply: 'Halo! Ada yang bisa saya bantu terkait koperasi?',
        model: 'system-greeter',
        intent,
        topic,
        executionPipeline,
        dataContext: null
      };
    }

    // Guard 5: Courtesy ("Terima kasih") -> Pure polite response
    if (intent === 'THANKS') {
      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Dilewati (Percakapan sopan)' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: 'Penyiapan respons kesopanan' };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Ucapan terima kasih disajikan' };

      return {
        reply: 'Sama-sama! Silakan tanyakan jika ada yang ingin Anda ketahui.',
        model: 'system-courtesy',
        intent,
        topic,
        executionPipeline,
        dataContext: null
      };
    }

    // Guard 6: Bot Info / Help
    if (intent === 'BOT_INFO') {
      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Dilewati (Informasi profil asisten)' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: 'Penyiapan kapabilitas sistem' };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Profil asisten disajikan' };

      return {
        reply: `Saya adalah **Smart Co-op AI Assistant** untuk Koperasi STMIK IKMI Cirebon. Saya dapat membantu Anda memahami fitur aplikasi, alur transaksi koperasi, memeriksa data keanggotaan, simpanan, pinjaman, jadwal angsuran, serta ringkasan laporan keuangan koperasi berdasarkan data aktual dari basis data sesuai hak akses Anda.`,
        model: 'system-info',
        intent,
        topic,
        executionPipeline,
        dataContext: null
      };
    }

    // Guard 7: Ambiguous Clarification Request
    if (intent === 'CLARIFICATION_NEEDED') {
      const reason = classification.details?.reason;
      let promptText = 'Mohon maaf, pertanyaan Anda belum cukup spesifik. Apakah Anda ingin menanyakan informasi terkait sistem aplikasi, data anggota, simpanan, pinjaman, angsuran, atau laporan keuangan koperasi?';
      if (reason === 'list_target_unknown') {
        promptText = 'Mohon klarifikasi, daftar apa yang ingin Anda tampilkan? (Contoh: daftar anggota terdaftar, daftar pinjaman belum lunas, atau daftar anggota yang belum membayar angsuran).';
      }
      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Dilewati (Menunggu klarifikasi pengguna)' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: 'Deteksi pertanyaan belum spesifik' };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Permintaan klarifikasi disajikan' };

      return {
        reply: promptText,
        model: 'system-clarifier',
        intent,
        topic,
        executionPipeline,
        dataContext: null
      };
    }

    // Guard 7b: Out of Domain Questions (Recipes, movies, weather, etc.)
    if (intent === 'OUT_OF_DOMAIN') {
      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Dilewati (Bukan data operasional koperasi)' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: 'Topik di luar lingkup sistem keuangan' };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Pemberitahuan domain resmi koperasi' };

      return {
        reply: `Mohon maaf, saya adalah **Smart Co-op AI Assistant** yang khusus melayani informasi dan analisis keuangan Koperasi STMIK IKMI Cirebon. Saya tidak dapat menjawab pertanyaan di luar ruang lingkup sistem koperasi (seperti resep makanan, film, atau cuaca).\n\nAda hal seputar data anggota, simpanan, pinjaman, angsuran, atau laporan keuangan koperasi yang dapat saya bantu?`,
        model: 'system-domain-guard',
        intent,
        topic,
        executionPipeline,
        dataContext: null
      };
    }

    // Guard 8: Stock / Inventory Inquiries (Honest unavailability)
    if (intent === 'INVENTORY_QUERY') {
      const invStatus = await this.dataService.getAuthorizedInventoryStatus(user);
      const reply = `Modul inventaris dan stok barang fisik saat ini **BELUM TERSEDIA** pada sistem Smart Co-op Financial System STMIK IKMI Cirebon.

Sistem difokuskan pada pengelolaan simpanan (pokok, wajib, sukarela), pinjaman & pembiayaan, angsuran, dan pembukuan kas. Tidak ada data stok fisik barang yang tercatat.`;

      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Kueri status modul inventaris/stok' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: 'Modul stok barang tercatat non-aktif' };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Penjelasan ketidaktersediaan stok disajikan' };

      return {
        reply,
        model: 'database-inventory-checker',
        intent,
        topic,
        executionPipeline,
        dataContext: invStatus
      };
    }

    // Guard 9: Cooperative Coding Assistance
    if (intent === 'COOP_CODING') {
      const codingResult = await this._handleCodingRequest(message, conversation, user, providerId, modelId);
      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Dilewati (Bantuan teknis pemodelan kode)' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: 'Standar PBKDF2 & sesi disiapkan' };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Contoh kode program disajikan' };

      return {
        ...codingResult,
        intent,
        topic,
        executionPipeline
      };
    }

    // Guard 10: Follow-up explanation of differences
    if (intent === 'EXPLAIN_DIFFERENCE') {
      const regStats = await this.dataService.getAuthorizedRegistrationStatistics(user, new Date(), member);
      const diffText = regStats.selisih >= 0
        ? `terdapat peningkatan pendaftaran dengan selisih +${regStats.selisih} anggota dibandingkan bulan lalu (${regStats.bulanIni} orang bulan ini berbanding ${regStats.bulanLalu} orang bulan lalu).`
        : `terdapat penurunan pendaftaran dengan selisih -${Math.abs(regStats.selisih)} anggota (${regStats.bulanIni} orang bulan ini berbanding ${regStats.bulanLalu} orang bulan lalu).`;

      const reply = `Berdasarkan data aktual yang tercatat di database koperasi, ${diffText}\n\nSistem Smart Co-op mencatat data berdasarkan tanggal pendaftaran dan verifikasi akun anggota yang sah. Faktor eksternal di luar operasional koperasi (seperti kalender akademik atau periode penerimaan mahasiswa baru) tidak terekam dalam basis data sistem.`;

      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: `Kueri statistik pendaftaran (${regStats.currentPeriod} & ${regStats.previousPeriod})` };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: `Perhitungan selisih: ${regStats.selisih >= 0 ? '+' : ''}${regStats.selisih} orang, pertumbuhan: ${regStats.pertumbuhan}` };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Penjelasan analitis komparasi pendaftaran disajikan' };

      return {
        reply,
        model: 'system-analytic-explainer',
        intent,
        topic,
        executionPipeline,
        dataContext: regStats
      };
    }

    // --- NON-DATABASE / DOCUMENTATION-BASED INTENTS (NO MEMBER STATS QUERY!) ---
    if (
      intent === 'APP_EXPLANATION' ||
      intent === 'EXPLAIN_LOANS' ||
      intent === 'EXPLAIN_SAVINGS' ||
      intent === 'EXPLAIN_INSTALLMENTS' ||
      intent === 'EXPLAIN_FINANCIAL' ||
      intent === 'EXPLAIN_SECURITY' ||
      intent === 'EXPLAIN_TELEGRAM' ||
      intent === 'APP_GUIDE' ||
      intent.startsWith('GUIDE_')
    ) {
      let docContext = null;
      let queryDescription = '';

      if (intent === 'APP_EXPLANATION') {
        docContext = await this.dataService.getApplicationOverview(user, member);
        queryDescription = 'Penjelasan dan Gambaran Umum Smart Co-op Financial System';
      } else if (intent.startsWith('GUIDE_') || intent === 'APP_GUIDE') {
        const topicName = intent.replace('GUIDE_', '');
        docContext = await this.dataService.getWorkflowGuide(topicName, user, member);
        queryDescription = `Panduan Alur Kerja ${docContext.title || topicName}`;
      } else {
        docContext = await this.dataService.getApplicationOverview(user, member);
        queryDescription = `Penjelasan Modul ${intent}`;
      }

      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'completed', details: 'Dilewati (Panduan operasional & dokumentasi)' };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'completed', details: 'Penyusunan referensi alur kerja aplikasi' };

      const synthesized = await this._synthesizeResponse({
        message,
        conversation,
        user,
        member,
        dataContext: docContext,
        queryDescription,
        intent,
        providerId,
        modelId
      });

      const userContext = { name: user.name, role: user.role, effectiveRole };
      const validated = ResponseValidator.validateAndSanitize(synthesized.reply, intent, docContext, userContext);
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: `Jawaban naratif diverifikasi sesuai panduan (Model: ${synthesized.model})` };

      return {
        ...synthesized,
        reply: validated.text,
        intent,
        topic,
        executionPipeline
      };
    }

    // --- DATA-DEPENDENT INTENTS: FETCH ONLY REQUIRED SLICE ---
    let dataContext = null;
    let queryDescription = '';

    try {
      if (intent === 'MEMBER_TOTAL' || intent === 'MEMBER_ACTIVE' || intent === 'MEMBER_INACTIVE') {
        dataContext = await this.dataService.getAuthorizedMemberStatistics(user, member);
        queryDescription = 'Statistik Jumlah Anggota Koperasi';
      } else if (intent === 'MEMBER_LIST') {
        dataContext = await this.dataService.getAuthorizedMemberList(user, {}, member);
        queryDescription = 'Daftar Anggota Koperasi';
      } else if (
        intent === 'REGISTRATION_THIS_MONTH' ||
        intent === 'REGISTRATION_LAST_MONTH' ||
        intent === 'REGISTRATION_COMPARE' ||
        intent === 'REGISTRATION_TODAY'
      ) {
        dataContext = await this.dataService.getAuthorizedRegistrationStatistics(user, new Date(), member);
        queryDescription = 'Statistik Pendaftaran Anggota Baru';
      } else if (intent === 'SAVINGS_TOP_SAVER') {
        dataContext = await this.dataService.getAuthorizedTopSavers(user, { limit: 5 }, member);
        queryDescription = 'Daftar Anggota dengan Simpanan Terbesar';
      } else if (intent === 'COOP_SUMMARY') {
        dataContext = await this.dataService.getAuthorizedCoopSummary(user, member);
        queryDescription = 'Ringkasan Eksekutif Kondisi Koperasi';
      } else if (intent === 'FINANCIAL_TREND') {
        dataContext = await this.dataService.getAuthorizedFinancialTrend(user, member);
        queryDescription = 'Tren dan Pertumbuhan Arus Kas Koperasi';
      } else if (
        intent === 'SAVINGS_WAJIB' ||
        intent === 'SAVINGS_POKOK' ||
        intent === 'SAVINGS_SUKARELA' ||
        intent === 'SAVINGS_TOTAL' ||
        intent === 'SAVINGS_MY' ||
        intent === 'SAVINGS_DETAIL'
      ) {
        dataContext = await this.dataService.getAuthorizedSavingsSummary(user, member);
        queryDescription = (effectiveRole === ROLES.ADMIN || effectiveRole === ROLES.CHAIRMAN)
          ? 'Rekapitulasi Simpanan Koperasi'
          : 'Saldo Simpanan Pribadi Anggota';
      } else if (intent === 'LOAN_UNPAID' || intent === 'LOAN_PENDING' || intent === 'LOAN_MY' || intent === 'LOAN_SUMMARY') {
        dataContext = await this.dataService.getAuthorizedLoanSummary(user, member);
        queryDescription = (effectiveRole === ROLES.ADMIN || effectiveRole === ROLES.CHAIRMAN)
          ? 'Portofolio Pinjaman Koperasi'
          : 'Status Pinjaman Pribadi Anggota';
      } else if (intent === 'LOAN_LIST') {
        dataContext = await this.dataService.getAuthorizedLoanList(user, { status: 'ACTIVE' }, member);
        queryDescription = 'Daftar Pinjaman Belum Lunas';
      } else if (intent === 'INSTALLMENT_UNPAID_MEMBERS') {
        dataContext = await this.dataService.getAuthorizedUnpaidInstallmentMembers(user, {}, member);
        queryDescription = 'Daftar Anggota Belum Membayar Angsuran';
      } else if (intent === 'INSTALLMENT_OVERDUE' || intent === 'INSTALLMENT_MY' || intent === 'INSTALLMENT_LIST' || intent === 'INSTALLMENT_SUMMARY') {
        dataContext = await this.dataService.getAuthorizedInstallmentSummary(user, member);
        queryDescription = 'Informasi Tagihan dan Tunggakan Angsuran';
      } else if (
        intent === 'FINANCIAL_REPORT' ||
        intent === 'FINANCIAL_INCOME' ||
        intent === 'FINANCIAL_EXPENSE' ||
        intent === 'TRANSACTION_SUMMARY'
      ) {
        dataContext = await this.dataService.getAuthorizedFinancialSummary(user, member);
        queryDescription = 'Laporan Arus Kas dan Keuangan Koperasi';
      } else if (intent === 'OWN_PROFILE') {
        dataContext = await this.dataService.getOwnMemberProfile(user, member);
        queryDescription = 'Profil Keanggotaan Pribadi';
      } else {
        // Fallback for general cooperative questions: provide application overview, NOT raw member stats
        dataContext = await this.dataService.getApplicationOverview(user, member);
        queryDescription = 'Informasi Umum Sistem Koperasi';
      }

      executionPipeline[2] = {
        step: 3,
        name: 'Mengambil data database',
        status: 'completed',
        details: `Kueri '${queryDescription}' berhasil dieksekusi (Status: ${dataContext?.authorized !== false ? 'DISETUJUI' : 'DITOLAK'})`
      };
      executionPipeline[3] = {
        step: 4,
        name: 'Menganalisis hasil',
        status: 'completed',
        details: 'Validasi integritas data, perhitungan delta, dan agregasi metrik selesai'
      };
    } catch (err) {
      console.error('[AiBackendCoordinator] Database query error:', err);
      executionPipeline[2] = { step: 3, name: 'Mengambil data database', status: 'error', details: `Error: ${err.message}` };
      executionPipeline[3] = { step: 4, name: 'Menganalisis hasil', status: 'error', details: 'Gagal mengeksekusi kueri' };
      executionPipeline[4] = { step: 5, name: 'Menyusun jawaban', status: 'completed', details: 'Penyajian pesan kesalahan basis data' };
      return {
        reply: `⚠️ Maaf, data belum dapat diperiksa dari basis data saat ini: ${err.message}.`,
        model: 'database-error-handler',
        intent,
        topic,
        executionPipeline,
        dataContext: null
      };
    }

    // Check RBAC Authorization
    if (dataContext && dataContext.authorized === false) {
      const reasonText = dataContext.message || dataContext.reason || 'Akses ditolak berdasarkan kebijakan wewenang pengguna (RBAC).';
      executionPipeline[4] = {
        step: 5,
        name: 'Menyusun jawaban',
        status: 'completed',
        details: 'Pemberitahuan pembatasan akses wewenang (RBAC) disajikan'
      };
      return {
        reply: `🔒 **Akses Ditolak (RBAC):**\n${reasonText}\n\n*Prinsip Least Privilege diterapkan untuk melindungi privasi data keuangan seluruh anggota Koperasi STMIK IKMI.*`,
        model: 'rbac-enforcement-guard',
        intent,
        topic,
        executionPipeline,
        dataContext
      };
    }

    // Synthesize response using Multi-Model Router, NVIDIA AI, or deterministic verified output
    const synthesized = await this._synthesizeResponse({
      message,
      conversation,
      user,
      member,
      dataContext,
      queryDescription,
      intent,
      providerId,
      modelId
    });

    const userContext = { name: user.name, role: user.role, effectiveRole };
    const validated = ResponseValidator.validateAndSanitize(synthesized.reply, intent, dataContext, userContext);
    executionPipeline[4] = {
      step: 5,
      name: 'Menyusun jawaban',
      status: 'completed',
      details: `Jawaban faktual diverifikasi bebas halusinasi (Model: ${synthesized.model})`
    };

    return {
      ...synthesized,
      reply: validated.text,
      intent,
      topic,
      executionPipeline
    };
  }

  /**
   * Synthesizes response using Multi-Model Router with graceful resilient fallback
   */
  async _synthesizeResponse({ message, conversation, user, member, dataContext, queryDescription, intent, providerId = null, modelId = null }) {
    const effectiveRole = resolveEffectiveRole(user, member);

    // 1. Try Multi-Model Router with Automatic Fallback Engine
    if (this.modelRouter) {
      try {
        const userContext = {
          name: user.name,
          role: user.role,
          effectiveRole,
          memberType: member ? member.member_type : '-',
          memberNumber: member ? member.member_number : '-'
        };

        const targetedData = this._extractTargetedData(intent, dataContext);

        const routerResult = await this.modelRouter.executeChatWithFallback({
          message,
          conversation,
          userContext,
          dataContext: targetedData,
          queryDescription,
          intent,
          requestedProviderId: providerId,
          requestedModelId: modelId,
          user
        });

        const sanitizedReply = this._sanitizeAssistantOutput(routerResult.reply);

        return {
          reply: sanitizedReply,
          model: routerResult.model,
          providerId: routerResult.providerId,
          providerName: routerResult.providerName,
          originalProviderId: routerResult.originalProviderId,
          originalProviderName: routerResult.originalProviderName,
          routingMode: routerResult.routingMode,
          usage: routerResult.usage,
          cost: routerResult.cost,
          fallbackOccurred: routerResult.fallbackOccurred,
          dataContext
        };
      } catch (err) {
        console.warn('[AiBackendCoordinator] Multi-Model Router unavailable, using verified database fallback:', err.message);
      }
    }

    // 2. Legacy fallback if standalone aiService is directly configured
    if (this.aiService && this.aiService.apiKey) {
      try {
        const userContext = {
          name: user.name,
          role: user.role,
          memberType: member ? member.member_type : '-',
          memberNumber: member ? member.member_number : '-'
        };

        const targetedData = this._extractTargetedData(intent, dataContext);

        const contextPrompt = `
[INFORMASI SISTEM / DATA AKTUAL TEROTORISASI KOPERASI STMIK IKMI]
Topik: ${queryDescription}
Waktu: ${new Date().toLocaleString('id-ID')}
Identitas Pengguna: ${user.name} (${user.role})
Rangkuman Data/Modul:
${JSON.stringify(targetedData, null, 2)}
[AKHIR INFORMASI]

PETUNJUK JAWABAN SANGAT PENTING:
1. Jawab pertanyaan pengguna menggunakan bahasa Indonesia yang mengalir, natural, dan mudah dipahami.
2. JANGAN PERNAH menampilkan format JSON, kurung kurawal, metadata teknis, atau objek mentah backend.
3. Jika pertanyaan berupa penjelasan sistem ("Jelaskan aplikasi ini dan sistem ini?"), jelaskan fungsi dan modul-modul koperasi yang tersedia secara naratif yang ramah.
4. Jika pertanyaan berupa angka spesifik (misal total anggota atau simpanan wajib), jawab langsung nilai angka dan satuannya secara ringkas.
`;

        const enrichedMessage = `${message}\n\n${contextPrompt}`;
        const aiResult = await this.aiService.chat(enrichedMessage, conversation, userContext);

        // Sanitize reply against any accidental raw JSON
        const sanitizedReply = this._sanitizeAssistantOutput(aiResult.reply);

        return {
          reply: sanitizedReply,
          model: aiResult.model,
          usage: aiResult.usage,
          dataContext
        };
      } catch (err) {
        console.warn('[AiBackendCoordinator] NVIDIA API unavailable, using verified database fallback:', err.message);
      }
    }

    // 3. Deterministic High-Precision Fallback (ZERO RAW JSON LEAKAGE GUARANTEED)
    const fallbackReply = this._generateDeterministicReply(intent, dataContext, user, message);
    return {
      reply: fallbackReply,
      model: 'smart-coop-database-engine',
      dataContext
    };
  }

  /**
   * Helper: Sanitize LLM reply to ensure no raw backend JSON leaks to frontend
   */
  _sanitizeAssistantOutput(reply = '') {
    if (!reply || typeof reply !== 'string') return '';
    let trimmed = reply.trim();

    // If output starts with raw JSON object or raw backend message wrapper
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('Informasi data koperasi: {') && trimmed.endsWith('}'))) {
      try {
        const jsonStr = trimmed.startsWith('Informasi data koperasi:') ? trimmed.replace('Informasi data koperasi:', '').trim() : trimmed;
        const parsed = JSON.parse(jsonStr);
        if (parsed.description) return parsed.description;
        if (parsed.reply) return parsed.reply;
        if (parsed.message) return parsed.message;
        if (parsed.definisi) {
          let text = `${parsed.appName || 'Smart Co-op Financial System'}: ${parsed.definisi}`;
          if (parsed.summary && parsed.summary.totalTerdaftar !== undefined) {
            text += `\n\nTotal anggota terdaftar di koperasi adalah **${parsed.summary.totalTerdaftar}** orang (Aktif: ${parsed.summary.totalAktif} orang).`;
          }
          return text;
        }
        if (parsed.summary && parsed.summary.totalTerdaftar !== undefined) {
          return `Total anggota terdaftar di koperasi saat ini adalah **${parsed.summary.totalTerdaftar}** orang (Aktif: ${parsed.summary.totalAktif} orang).`;
        }
      } catch {
        // Fallback to text
      }
    }

    return trimmed;
  }

  /**
   * Helper: Extracts only the relevant data slice for the specific intent
   */
  _extractTargetedData(intent, data) {
    if (!data) return {};

    switch (intent) {
      case 'APP_EXPLANATION':
        return {
          aplikasi: data.name,
          institusi: data.institution,
          deskripsi: data.description,
          modulAktif: data.activeModules ? data.activeModules.map(m => m.name) : []
        };
      case 'MEMBER_TOTAL':
        return { totalAnggotaTerdaftar: data.summary?.totalTerdaftar };
      case 'MEMBER_ACTIVE':
        return { totalAnggotaAktif: data.summary?.totalAktif };
      case 'MEMBER_INACTIVE':
        return { totalAnggotaNonaktif: data.summary?.totalNonaktif };
      case 'SAVINGS_WAJIB':
        return { totalSimpananWajib: data.formatted?.wajib || data.totalSimpananWajib };
      case 'SAVINGS_POKOK':
        return { totalSimpananPokok: data.formatted?.pokok || data.totalSimpananPokok };
      case 'SAVINGS_SUKARELA':
        return { totalSimpananSukarela: data.formatted?.sukarela || data.totalSimpananSukarela };
      case 'REGISTRATION_THIS_MONTH':
        return { periode: data.currentPeriod, pendaftaranBulanIni: data.bulanIni };
      case 'REGISTRATION_LAST_MONTH':
        return { periode: data.previousPeriod, pendaftaranBulanLalu: data.bulanLalu };
      case 'REGISTRATION_COMPARE':
        return {
          bulanIni: { periode: data.currentPeriod, jumlah: data.bulanIni },
          bulanLalu: { periode: data.previousPeriod, jumlah: data.bulanLalu },
          selisih: data.selisih,
          pertumbuhan: data.pertumbuhan
        };
      case 'LOAN_UNPAID':
        return {
          pinjamanBelumLunas: data.pinjamanBerjalan || data.pinjamanAktif,
          sisaPokokPinjaman: data.formatted?.sisaPokok
        };
      default:
        return data;
    }
  }

  /**
   * Generates deterministic, accurate, human-friendly formatted answers directly without raw JSON
   */
  _generateDeterministicReply(intent, data, user, originalMessage = '') {
    if (!data) {
      return 'Maaf, data tidak ditemukan dalam basis data koperasi.';
    }

    // 1. Penjelasan Lengkap Aplikasi & Sistem ("Jelaskan aplikasi ini dan sistem ini?")
    if (intent === 'APP_EXPLANATION') {
      return `**Smart Co-op Financial System** adalah aplikasi berbasis web yang dirancang untuk mendukung pengelolaan administrasi dan keuangan Koperasi Pegawai & Civitas STMIK IKMI Cirebon secara modern, transparan, dan akuntabel.

Sistem ini mengintegrasikan seluruh operasional koperasi ke dalam satu platform terpusat dengan modul-modul aktif:
1. 👥 **Manajemen Keanggotaan:** Pendaftaran dan pencatatan data identitas resmi anggota (Dosen, Mahasiswa, Staf Pegawai).
2. 💰 **Simpanan Koperasi:** Pengelolaan saldo Simpanan Pokok, Simpanan Wajib rutin, dan Simpanan Sukarela serta mutasi kas.
3. 📈 **Pinjaman & Pembiayaan:** Pengajuan pinjaman, evaluasi kelayakan, approval berjenjang, dan beragam skema perhitungan bunga (Flat, Menurun/Efektif, Anuitas, serta 0% Syariah Qardh).
4. 🗓️ **Angsuran & Tagihan:** Penjadwalan angsuran bulanan otomatis, monitoring jatuh tempo, dan pelunasan pinjaman.
5. 💳 **Buku Kas & Transaksi:** Pencatatan kas masuk (inflow) dan kas keluar (outflow) secara real-time dengan mekanisme reversal pembukuan yang aman.
6. 📑 **Laporan Keuangan:** Laporan komprehensif (Arus Kas, Surplus Bersih, Simpanan, dan Pinjaman) berbasis standar akuntansi SAK ETAP / PSAK 27.
7. 🤖 **Smart Co-op AI Assistant:** Asisten konsultatif terintegrasi NVIDIA AI NIM dan data aktual untuk membantu pengguna sesuai hak akses (Role-Based Access Control).

*Catatan:* Modul inventaris fisik/stok barang toko saat ini belum tersedia di sistem.`;
    }

    // 2. Penjelasan Alur Pinjaman
    if (intent === 'EXPLAIN_LOANS') {
      return `📈 **Alur Pengelolaan Pinjaman di Koperasi STMIK IKMI:**
1. **Pengajuan:** Anggota mengajukan pinjaman dengan memilih nominal pokok, jangka waktu (tenor), keperluan, dan skema bunga (Flat, Menurun/Efektif, Anuitas, atau 0% Syariah).
2. **Evaluasi:** Admin koperasi memeriksa kelayakan kredit, berkas keanggotaan, dan batas plafon pinjaman.
3. **Persetujuan (Approval):** Komite pembiayaan dan Ketua Koperasi meninjau pengajuan dan memberikan persetujuan resmi.
4. **Pencairan:** Dana pinjaman dicairkan ke anggota dan tercatat sebagai kas keluar (outflow) di buku kas koperasi.
5. **Jadwal Angsuran:** Sistem otomatis menerbitkan jadwal angsuran bulanan yang dapat dipantau pada menu **Angsuran**.`;
    }

    // 3. Penjelasan Alur Simpanan
    if (intent === 'EXPLAIN_SAVINGS') {
      return `💰 **Jenis & Alur Simpanan di Koperasi STMIK IKMI:**
1. **Simpanan Pokok:** Simpanan wajib yang disetorkan satu kali saat pertama kali mendaftar sebagai anggota koperasi dan tidak dapat ditarik selama menjadi anggota.
2. **Simpanan Wajib:** Simpanan rutin berkala (bulanan/semesteran) yang wajib disetorkan oleh setiap anggota aktif.
3. **Simpanan Sukarela:** Simpanan fleksibel yang dapat disetor maupun ditarik sewaktu-waktu oleh anggota sesuai saldo yang tersedia.

Seluruh setoran dan penarikan simpanan tercatat otomatis di buku kas umum koperasi.`;
    }

    // 4. Penjelasan Alur Angsuran
    if (intent === 'EXPLAIN_INSTALLMENTS') {
      return `🗓️ **Sistem & Jadwal Angsuran Koperasi STMIK IKMI:**
- Setiap pinjaman yang telah dicairkan akan memiliki jadwal pembayaran angsuran per bulan (angsuran pokok + bunga).
- Tanggal jatuh tempo ditetapkan setiap tanggal tertentu per bulan.
- Angsuran berstatus \`UNPAID\` sebelum jatuh tempo, \`PAID\` setelah dibayar lunas, atau \`OVERDUE\` jika telah melewati tanggal jatuh tempo pembayaran.`;
    }

    // 5. Penjelasan Laporan Keuangan
    if (intent === 'EXPLAIN_FINANCIAL') {
      return `📑 **Sistem Laporan Keuangan Koperasi STMIK IKMI:**
- Pembukuan keuangan koperasi dicatat berbasis kas (cash-basis) mengikuti standar akuntansi keuangan koperasi (SAK ETAP / PSAK 27).
- Melacak total kas masuk (inflow: setoran simpanan, pembayaran angsuran, pendapatan lain) dan total kas keluar (outflow: pencairan pinjaman, penarikan simpanan, beban operasional).
- Menghasilkan perhitungan surplus kas bersih yang menjadi dasar Sisa Hasil Usaha (SHU) tahunan.`;
    }

    // 6. Penjelasan Keamanan & Autentikasi
    if (intent === 'EXPLAIN_SECURITY') {
      return `🛡️ **Arsitektur Keamanan Smart Co-op Financial System:**
1. **Enkripsi Kata Sandi:** Menggunakan algoritma **PBKDF2-SHA256** dengan 100.000 iterasi dan random salt 16-byte unik per akun.
2. **Autentikasi Sesi:** Token sesi unik disimpan dan divalidasi langsung oleh basis data server.
3. **Role-Based Access Control (RBAC):** Menjamin pemisahan wewenang yang tegas antara Admin Koperasi, Ketua STMIK IKMI, dan Anggota.
4. **Isolasi Data Keuangan:** Anggota hanya dapat membaca data pribadi miliknya sendiri.`;
    }

    // 7. Penjelasan Telegram Bot
    if (intent === 'EXPLAIN_TELEGRAM') {
      return `📱 **Notifikasi Telegram Bot Koperasi:**
- Anggota dapat menautkan akun koperasi ke Telegram menggunakan kode OTP 6 digit sekali pakai (berlaku 10 menit).
- Setelah terhubung, setiap transaksi simpanan, pengajuan pinjaman, atau pembayaran angsuran akan mengirimkan notifikasi instan langsung ke Telegram Anda.`;
    }

    // 8. Panduan Alur Kerja (Workflows)
    if (intent.startsWith('GUIDE_') || intent === 'APP_GUIDE') {
      if (data.steps && Array.isArray(data.steps)) {
        return `📌 **${data.title || 'Panduan Penggunaan'}:**\n` + data.steps.join('\n');
      }
      if (data.content) {
        return `📌 **${data.title || 'Panduan'}:**\n${data.content}`;
      }
      return `Untuk menggunakan fitur ini, silakan akses menu yang relevan pada sidebar navigasi aplikasi:
- 👥 Pendaftaran Anggota: Menu **Anggota** > **Tambah Anggota**
- 💰 Simpanan: Menu **Simpanan & Operasional**
- 📈 Pinjaman: Menu **Pinjaman** > **Ajukan Pinjaman**
- 💳 Angsuran: Menu **Angsuran** > **Bayar Angsuran**
- 📑 Laporan: Menu **Laporan Keuangan**`;
    }

    // 9. Total Anggota
    if (intent === 'MEMBER_TOTAL') {
      const total = data.summary?.totalTerdaftar ?? 0;
      return `Total Anggota Terdaftar saat ini adalah ${total} orang.`;
    }

    // 10. Anggota Aktif
    if (intent === 'MEMBER_ACTIVE') {
      const aktif = data.summary?.totalAktif ?? 0;
      return `Jumlah anggota aktif saat ini adalah ${aktif} orang.`;
    }

    // 11. Anggota Nonaktif
    if (intent === 'MEMBER_INACTIVE') {
      const nonaktif = data.summary?.totalNonaktif ?? 0;
      return `Jumlah anggota nonaktif saat ini adalah ${nonaktif} orang.`;
    }

    // 12. Daftar Anggota
    if (intent === 'MEMBER_LIST') {
      if (data.authorized === false) {
        return data.message || 'Akses Terbatas: Hanya Admin dan Pengurus/Ketua yang berwenang melihat daftar seluruh anggota koperasi.';
      }
      if (!data.members || data.members.length === 0) {
        return 'Saat ini belum ada anggota yang terdaftar di basis data.';
      }
      return `Berikut daftar anggota terdaftar (${data.total} orang):\n` +
        data.members.map((m, i) => `${i + 1}. **${m.fullName}** (\`${m.memberNumber}\`) &bull; ${m.memberType} &bull; Status: \`${m.status}\``).join('\n');
    }

    // 13. Pendaftaran Bulan Ini
    if (intent === 'REGISTRATION_THIS_MONTH') {
      return `Statistik Pendaftaran: Jumlah anggota yang mendaftar bulan ini (${data.currentPeriod}) adalah ${data.bulanIni} orang.`;
    }

    // 14. Pendaftaran Bulan Lalu
    if (intent === 'REGISTRATION_LAST_MONTH') {
      return `Jumlah pendaftaran anggota baru pada bulan lalu (${data.previousPeriod}) adalah ${data.bulanLalu} orang.`;
    }

    // 15. Perbandingan Pendaftaran Periode
    if (intent === 'REGISTRATION_COMPARE') {
      const diffSign = data.selisih >= 0 ? '+' : '';
      return `Perbandingan pendaftaran anggota:\n- Pendaftaran bulan ini (${data.currentPeriod}): **${data.bulanIni}** orang\n- Pendaftaran bulan lalu (${data.previousPeriod}): **${data.bulanLalu}** orang\n\nSelisih: **${diffSign}${data.selisih}** orang (Pertumbuhan: **${data.pertumbuhan}**).`;
    }

    // 16. Simpanan Wajib
    if (intent === 'SAVINGS_WAJIB') {
      const nominal = data.formatted?.wajib || 'Rp 0';
      if (data.scope === 'PERSONAL') {
        return `Total simpanan wajib Anda saat ini adalah ${nominal}.`;
      }
      return `Total simpanan wajib saat ini adalah ${nominal}.`;
    }

    // 17. Simpanan Pokok
    if (intent === 'SAVINGS_POKOK') {
      const nominal = data.formatted?.pokok || 'Rp 0';
      if (data.scope === 'PERSONAL') {
        return `Total simpanan pokok Anda saat ini adalah ${nominal}.`;
      }
      return `Total simpanan pokok saat ini adalah ${nominal}.`;
    }

    // 18. Simpanan Sukarela
    if (intent === 'SAVINGS_SUKARELA') {
      const nominal = data.formatted?.sukarela || 'Rp 0';
      if (data.scope === 'PERSONAL') {
        return `Total simpanan sukarela Anda saat ini adalah ${nominal}.`;
      }
      return `Total simpanan sukarela saat ini adalah ${nominal}.`;
    }

    // 19. Saldo Simpanan Pribadi
    if (intent === 'SAVINGS_MY') {
      return `Rincian Saldo Simpanan Anda (${data.memberName}):\n- Simpanan Pokok: **${data.formatted.pokok}**\n- Simpanan Wajib: **${data.formatted.wajib}**\n- Simpanan Sukarela: **${data.formatted.sukarela}**\n- Total Saldo Simpanan: **${data.formatted.total}**`;
    }

    // 20. Total Simpanan Koperasi
    if (intent === 'SAVINGS_TOTAL' || intent === 'SAVINGS_DETAIL') {
      if (data.scope === 'PERSONAL') {
        return `Total saldo simpanan Anda saat ini adalah ${data.formatted.total}.`;
      }
      return `Total saldo simpanan koperasi saat ini adalah ${data.formatted.total} (Pokok: ${data.formatted.pokok}, Wajib: ${data.formatted.wajib}, Sukarela: ${data.formatted.sukarela}).`;
    }

    // 21. Pinjaman Belum Lunas
    if (intent === 'LOAN_UNPAID') {
      if (data.scope === 'PERSONAL') {
        return `Saat ini Anda memiliki ${data.pinjamanAktif} pinjaman belum lunas dengan total sisa pokok sebesar ${data.formatted.sisaPokok}.`;
      }
      return `Saat ini terdapat **${data.pinjamanBerjalan}** pinjaman berjalan (belum lunas) dengan total sisa pokok pinjaman sebesar **${data.formatted.sisaPokok}**.`;
    }

    // 22. Pinjaman Pending
    if (intent === 'LOAN_PENDING') {
      if (data.scope === 'PERSONAL') {
        return `Anda memiliki ${data.menungguPersetujuan} pengajuan pinjaman yang sedang menunggu persetujuan.`;
      }
      return `Terdapat **${data.pinjamanPending}** pinjaman yang sedang menunggu persetujuan.`;
    }

    // 23. Daftar Pinjaman
    if (intent === 'LOAN_LIST') {
      if (!data.loans || data.loans.length === 0) {
        return 'Saat ini tidak ada pinjaman aktif/berjalan yang tercatat.';
      }
      return `Daftar pinjaman belum lunas (${data.total} pinjaman):\n` +
        data.loans.map((l, i) =>
          `${i + 1}. **${l.loanNumber}** &bull; ${l.memberName} (\`${l.memberNumber}\`) &bull; Pokok: ${l.formattedPrincipal} &bull; Sisa Pokok: **${l.formattedRemaining}** &bull; Status: \`${l.status}\``
        ).join('\n');
    }

    // 24. Pinjaman Saya
    if (intent === 'LOAN_MY') {
      let itemsStr = '';
      if (data.daftarPinjaman && data.daftarPinjaman.length > 0) {
        itemsStr = '\n\nDaftar Pinjaman Anda:\n' + data.daftarPinjaman.map(p =>
          `- **${p.loanNumber}** &bull; Sisa Pokok: **${p.sisaPokok}** &bull; Status: \`${p.status}\``
        ).join('\n');
      }
      return `Status pinjaman Anda (${data.memberName}): ${data.pinjamanAktif} pinjaman aktif dengan total sisa pokok **${data.formatted.sisaPokok}**.${itemsStr}`;
    }

    // 25. Anggota Yang Belum Membayar Angsuran
    if (intent === 'INSTALLMENT_UNPAID_MEMBERS') {
      if (!data.items || data.items.length === 0) {
        return 'Saat ini seluruh anggota telah membayar angsuran dan tidak ada tunggakan.';
      }
      return `Berikut adalah daftar anggota yang belum membayar angsuran:\n` +
        data.items.map((it, i) =>
          `${i + 1}. **${it.memberName}** (\`${it.memberNumber}\`) &bull; Pinjaman ${it.loanNumber}, Angsuran ke-${it.installmentNumber}, Jatuh Tempo: ${it.dueDate}, Sisa Tagihan: **${it.formattedRemaining}** (Status: \`${it.status}\`)`
        ).join('\n');
    }

    // 26. Total Tunggakan Angsuran
    if (intent === 'INSTALLMENT_OVERDUE') {
      if (data.scope === 'PERSONAL') {
        return `Total tunggakan angsuran Anda saat ini adalah ${data.formatted.totalTunggakan} (${data.tunggakanCount} angsuran jatuh tempo).`;
      }
      return `Total nominal tunggakan angsuran koperasi saat ini adalah ${data.formatted.nominalTunggakan} (${data.tunggakanCount} angsuran dari ${data.pinjamanMenunggakCount} pinjaman).`;
    }

    // 27. Jadwal Angsuran Saya
    if (intent === 'INSTALLMENT_MY') {
      return `Informasi Angsuran Anda: Total ${data.totalAngsuran} jadwal angsuran (Lunas: ${data.telahDibayar}, Belum Lunas: ${data.belumDibayar}, Tunggakan: ${data.tunggakanCount} senilai ${data.formatted.totalTunggakan}).`;
    }

    // 28. Laporan Keuangan
    if (intent === 'FINANCIAL_REPORT') {
      return `📑 **Ringkasan Laporan Arus Kas & Keuangan Koperasi:**

- 📥 **Total Kas Masuk (Inflow):** **${data.formatted.pemasukan}**
  - Setoran Simpanan: ${data.formatted.simpananMasuk}
  - Penerimaan Angsuran: ${data.formatted.angsuranMasuk}
  - Pendapatan Lain-lain: ${data.formatted.pendapatanLain}

- 📤 **Total Kas Keluar (Outflow):** **${data.formatted.pengeluaran}**
  - Pencairan Pinjaman: ${data.formatted.pencairanPinjaman}
  - Penarikan Simpanan: ${data.formatted.penarikanSimpanan}
  - Beban Operasional: ${data.formatted.bebanOperasional}

- 🏆 **Surplus Kas Bersih:** **${data.formatted.surplusBersih}**
- 📝 Total Transaksi: ${data.totalTransaksiBukuKas} transaksi pembukuan kas.`;
    }

    // 29. Total Pemasukan
    if (intent === 'FINANCIAL_INCOME') {
      return `Total pemasukan kas koperasi saat ini adalah **${data.formatted.pemasukan}**.`;
    }

    // 30. Total Pengeluaran
    if (intent === 'FINANCIAL_EXPENSE') {
      return `Total pengeluaran kas koperasi saat ini adalah **${data.formatted.pengeluaran}**.`;
    }

    // 31. Profil Saya
    if (intent === 'OWN_PROFILE') {
      return `👤 **Data Profil Keanggotaan Anda:**
- **Nama:** ${data.name}
- **Email:** ${data.email}
- **Role:** \`${data.role}\`
- **Nomor Anggota:** \`${data.memberNumber}\`
- **Kategori:** ${data.memberType}
- **Nomor Identitas:** ${data.identityNumber}
- **No. Telepon:** ${data.phone}
- **Tanggal Bergabung:** ${data.joinDate}
- **Status:** **${data.statusAnggota}**`;
    }

    // 32. Dynamic Intelligent Formatting for Advanced Intelligent Intents
    const effectiveRole = resolveEffectiveRole(user);
    const userContext = { name: user?.name, role: user?.role, effectiveRole };
    const formatted = IntelligentAnswerFormatter.formatAnswer(intent, data, userContext);
    if (formatted && !formatted.includes('belum dapat ditemukan')) {
      return formatted;
    }

    // Default: Polite conversational guidance (NEVER JSON.stringify!)
    return `Smart Co-op Financial System STMIK IKMI Cirebon menyediakan layanan informasi untuk:
- 👥 **Anggota:** Mengetahui total anggota terdaftar, anggota aktif, atau pendaftaran baru.
- 💰 **Simpanan:** Memeriksa saldo simpanan pribadi, total simpanan pokok, wajib, dan sukarela.
- 📈 **Pinjaman & Angsuran:** Melihat pinjaman aktif, persetujuan pinjaman, jadwal angsuran, atau tunggakan.
- 📑 **Laporan Keuangan:** Ringkasan arus kas masuk, kas keluar, dan surplus kas bersih.

Silakan ajukan pertanyaan yang lebih spesifik terkait kebutuhan informasi Anda.`;
  }

  /**
   * Helper for Cooperative Coding Example
   */
  async _handleCodingRequest(message, conversation, user, providerId = null, modelId = null) {
    if (this.modelRouter) {
      try {
        const routerResult = await this.modelRouter.executeChatWithFallback({
          message,
          conversation,
          userContext: { name: user.name, role: user.role },
          dataContext: null,
          queryDescription: 'Contoh Coding Sistem Koperasi STMIK IKMI',
          intent: 'COOP_CODING',
          requestedProviderId: providerId,
          requestedModelId: modelId,
          user
        });
        return {
          reply: routerResult.reply,
          model: routerResult.model,
          providerId: routerResult.providerId,
          providerName: routerResult.providerName,
          routingMode: routerResult.routingMode,
          usage: routerResult.usage,
          cost: routerResult.cost,
          fallbackOccurred: routerResult.fallbackOccurred,
          dataContext: null
        };
      } catch (e) {
        console.warn('[AiBackendCoordinator] AI coding request fallback:', e.message);
      }
    }

    if (this.aiService && this.aiService.apiKey) {
      try {
        const aiResult = await this.aiService.chat(message, conversation, user);
        return {
          reply: aiResult.reply,
          model: aiResult.model,
          usage: aiResult.usage,
          dataContext: null
        };
      } catch (e) {
        console.warn('[AiBackendCoordinator] AI coding request fallback:', e.message);
      }
    }

    const codeReply = `💻 **Contoh Kode Login Menggunakan JavaScript (PBKDF2 & Validasi Sesi Koperasi STMIK IKMI):**

Berikut contoh implementasi fungsi autentikasi login yang aman sesuai dengan standar yang digunakan pada aplikasi Smart Co-op:

\`\`\`javascript
/**
 * Contoh Fungsi Otentikasi Login Koperasi STMIK IKMI
 * Menggunakan fetch API ke endpoint otentikasi
 */
async function loginKoperasi(email, password) {
  // 1. Validasi input awal di client-side
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error("Email dan password wajib diisi.");
  }

  try {
    // 2. Kirim payload login ke backend service
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: cleanEmail,
        password: password
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Login gagal. Periksa email atau password Anda.');
    }

    // 3. Simpan token sesi aman yang diterbitkan server
    localStorage.setItem('ikmi_coop_session', result.token);
    console.log(\`Selamat datang, \${result.user.name} (\${result.user.role})!\`);
    
    return {
      user: result.user,
      token: result.token
    };
  } catch (error) {
    console.error("Gagal melakukan login:", error.message);
    throw error;
  }
}
\`\`\`

Fitur keamanan yang diterapkan pada sistem ini:
1. Verifikasi hash menggunakan algoritma **PBKDF2-SHA256** dengan 100.000 iterasi dan random salt 16-byte.
2. Token sesi unik yang diautentikasi oleh tabel database \`sessions\`.
3. Pemeriksaan hak akses berbasis peran (**RBAC**) sebelum membuka portal Admin, Ketua, atau Anggota.`;

    return {
      reply: codeReply,
      model: 'smart-coop-code-assistant',
      dataContext: null
    };
  }
}
