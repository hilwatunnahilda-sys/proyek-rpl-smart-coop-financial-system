/**
 * Intelligent Query Understanding & Natural Language Understanding (NLU) Engine
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Capabilities:
 * 1. Indonesian Colloquial & Informal Slang Normalizer (brp, skrg, bln, member, smpanan, dll.)
 * 2. Typo-tolerant Entity Extractor (Domain, Time Period, Metric, Category)
 * 3. Multi-Turn Context-Aware Conversation Memory & Follow-up Resolver
 *    - "Berapa anggota baru bulan ini?" -> "Kalau bulan lalu?" -> "Berapa selisihnya?"
 * 4. Deterministic Intent Classifier with Zero Hallucination Routing
 */

export class IntelligentQueryUnderstanding {
  constructor() {
    // Slang and typo dictionary mapping informal words to normalized tokens
    this.slangDictionary = {
      'brp': 'berapa',
      'brapa': 'berapa',
      'berapah': 'berapa',
      'piro': 'berapa',
      'skrg': 'sekarang',
      'skrang': 'sekarang',
      'skg': 'sekarang',
      'saat ini': 'sekarang',
      'kini': 'sekarang',
      'bln': 'bulan',
      'blan': 'bulan',
      'bln ini': 'bulan ini',
      'thn': 'tahun',
      'thun': 'tahun',
      'kmrn': 'kemarin',
      'kemaren': 'kemarin',
      'sblmnya': 'sebelumnya',
      'sblm': 'sebelum',
      'lalu': 'lalu',
      'lampau': 'lalu',
      'anggta': 'anggota',
      'angota': 'anggota',
      'member': 'anggota',
      'members': 'anggota',
      'nasabah': 'anggota',
      'orang': 'anggota',
      'smpanan': 'simpanan',
      'simpenan': 'simpanan',
      'tabungan': 'simpanan',
      'tabunganku': 'simpanan saya',
      'saldo': 'saldo simpanan',
      'wjb': 'wajib',
      'pnjaman': 'pinjaman',
      'pinjem': 'pinjaman',
      'pinjemin': 'pinjaman',
      'kredit': 'pinjaman',
      'utang': 'pinjaman',
      'hutang': 'pinjaman',
      'blm': 'belum',
      'blom': 'belum',
      'angsrn': 'angsuran',
      'cicilan': 'angsuran',
      'angsurn': 'angsuran',
      'tagihan': 'angsuran',
      'tunggkn': 'tunggakan',
      'nunggak': 'tunggakan',
      'menungak': 'tunggakan',
      'menunggak': 'tunggakan',
      'telat': 'tunggakan',
      'kprasi': 'koperasi',
      'koprasi': 'koperasi',
      'pngeluaran': 'pengeluaran',
      'keluar': 'pengeluaran',
      'outflow': 'pengeluaran',
      'beban': 'pengeluaran',
      'biaya': 'pengeluaran',
      'pmsukan': 'pemasukan',
      'masuk': 'pemasukan',
      'inflow': 'pemasukan',
      'pendapatan': 'pemasukan',
      'duit': 'kas',
      'uang': 'kas',
      'keuangan': 'keuangan',
      'buku kas': 'buku kas',
      'arus kas': 'arus kas',
      'stok': 'stok barang',
      'barang': 'stok barang',
      'gudang': 'stok barang',
      'inventori': 'stok barang',
      'inventaris': 'stok barang',
      'terbanyak': 'terbesar',
      'paling banyak': 'terbesar',
      'paling besar': 'terbesar',
      'top': 'terbesar',
      'juara': 'terbesar',
      'beda': 'selisih',
      'perbedaan': 'selisih',
      'kenaikan': 'selisih',
      'penurunan': 'selisih',
      'pertumbuhan': 'selisih',
      'komparasi': 'bandingkan',
      'perbandingan': 'bandingkan',
      'vs': 'bandingkan',
      'bandingin': 'bandingkan'
    };
  }

  /**
   * Normalize input text: lowercase, remove punctuation, expand typos and informal slang
   */
  normalizeText(rawText = '') {
    if (!rawText || typeof rawText !== 'string') return '';

    let clean = rawText
      .toLowerCase()
      .replace(/[.,?!;:()'"“”’`]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Word boundary replace for registered slang
    for (const [slang, replacement] of Object.entries(this.slangDictionary)) {
      const regex = new RegExp(`\\b${slang}\\b`, 'gi');
      clean = clean.replace(regex, replacement);
    }

    return clean.replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract key entities: domain, time period, metric, subcategory
   */
  extractEntities(normalizedText = '', sessionContext = null) {
    const text = normalizedText;
    const entities = {
      domain: null,          // MEMBER | SAVINGS | LOAN | INSTALLMENT | FINANCIAL | INVENTORY | WORKFLOW | SYSTEM
      period: 'CURRENT',     // THIS_MONTH | LAST_MONTH | TODAY | COMPARE_MONTHS | ALL_TIME
      metric: null,          // TOTAL | ACTIVE | INACTIVE | NEW | TOP_RANK | LIST | OVERDUE | DIFFERENCE | UNPAID
      subCategory: null,     // POKOK | WAJIB | SUKARELA | DISBURSED | REVERSAL | INFLOW | OUTFLOW
      isFollowUp: false,
      isComparison: false
    };

    // 1. Detect Time Period
    if (text.includes('bulan ini dan bulan lalu') || (text.includes('bulan ini') && text.includes('bulan lalu')) || text.includes('bandingkan')) {
      entities.period = 'COMPARE_MONTHS';
      entities.isComparison = true;
    } else if (text.includes('bulan ini') || text.includes('sekarang') || text.includes('bulan berjalan')) {
      entities.period = 'THIS_MONTH';
    } else if (text.includes('bulan lalu') || text.includes('bulan sebelumnya') || text.includes('kemarin')) {
      entities.period = 'LAST_MONTH';
    } else if (text.includes('hari ini')) {
      entities.period = 'TODAY';
    } else {
      entities.period = 'ALL_TIME';
    }

    // 2. Detect Domain
    if (
      text.includes('anggota') ||
      text.includes('dosen') ||
      text.includes('mahasiswa') ||
      text.includes('staf') ||
      text.includes('pendaftaran') ||
      text.includes('daftar anggota')
    ) {
      entities.domain = 'MEMBER';
    } else if (
      text.includes('simpanan') ||
      text.includes('tabungan') ||
      text.includes('saldo') ||
      text.includes('setoran') ||
      text.includes('penarikan')
    ) {
      entities.domain = 'SAVINGS';
    } else if (
      text.includes('pinjaman') ||
      text.includes('pokok pinjaman') ||
      text.includes('pembiayaan') ||
      text.includes('bunga flat') ||
      text.includes('sisa pinjaman')
    ) {
      entities.domain = 'LOAN';
    } else if (
      text.includes('angsuran') ||
      text.includes('tunggakan') ||
      text.includes('jatuh tempo') ||
      text.includes('jadwal bayar')
    ) {
      entities.domain = 'INSTALLMENT';
    } else if (
      text.includes('keuangan') ||
      text.includes('pemasukan') ||
      text.includes('pengeluaran') ||
      text.includes('arus kas') ||
      text.includes('buku kas') ||
      text.includes('surplus') ||
      text.includes('defisit')
    ) {
      entities.domain = 'FINANCIAL';
    } else if (
      text.includes('stok') ||
      text.includes('inventaris') ||
      text.includes('barang')
    ) {
      entities.domain = 'INVENTORY';
    }

    // 3. Detect Metric & Subcategory
    if (text.includes('pokok')) entities.subCategory = 'POKOK';
    if (text.includes('wajib')) entities.subCategory = 'WAJIB';
    if (text.includes('sukarela')) entities.subCategory = 'SUKARELA';

    if (text.includes('terbesar') || text.includes('paling banyak')) entities.metric = 'TOP_RANK';
    if (text.includes('nonaktif') || text.includes('tidak aktif')) {
      entities.metric = 'INACTIVE';
    } else if (text.includes('aktif')) {
      entities.metric = 'ACTIVE';
    }
    if (text.includes('baru') || text.includes('pendaftaran')) entities.metric = 'NEW';
    if (text.includes('selisih') || text.includes('pertumbuhan') || text.includes('perubahan')) entities.metric = 'DIFFERENCE';
    if (text.includes('daftar') || text.includes('siapa saja') || text.includes('rincian')) entities.metric = 'LIST';
    if (text.includes('menunggak') || text.includes('tunggakan') || text.includes('belum bayar')) entities.metric = 'OVERDUE';

    return entities;
  }

  /**
   * Resolves elliptical / follow-up queries based on previous session memory
   */
  resolveFollowUp(normalizedText = '', conversation = [], sessionContext = null) {
    const text = normalizedText;

    // Follow-up 1: Period probe ("Kalau bulan sebelumnya?", "Bulan lalu?", "Bulan ini?")
    const isPeriodFollowUp =
      text === 'kalau bulan sebelumnya' ||
      text === 'kalau bulan lalu' ||
      text === 'bulan lalu' ||
      text === 'bulan sebelumnya' ||
      text === 'bagaimana bulan lalu' ||
      text === 'lalu bulan lalu' ||
      text === 'kalau bulan ini' ||
      text === 'bulan ini';

    if (isPeriodFollowUp && sessionContext) {
      const targetPeriod = (text.includes('lalu') || text.includes('sebelumnya')) ? 'LAST_MONTH' : 'THIS_MONTH';

      if (sessionContext.domain === 'MEMBER' || sessionContext.intent.startsWith('REGISTRATION')) {
        return {
          intent: targetPeriod === 'LAST_MONTH' ? 'REGISTRATION_LAST_MONTH' : 'REGISTRATION_THIS_MONTH',
          domain: 'MEMBER',
          topic: 'REGISTRATION',
          period: targetPeriod,
          isFollowUp: true
        };
      }

      if (sessionContext.domain === 'FINANCIAL' || sessionContext.intent.startsWith('FINANCIAL')) {
        return {
          intent: targetPeriod === 'LAST_MONTH' ? 'FINANCIAL_LAST_MONTH' : 'FINANCIAL_THIS_MONTH',
          domain: 'FINANCIAL',
          topic: 'FINANCIAL',
          period: targetPeriod,
          isFollowUp: true
        };
      }
    }

    // Follow-up 2: Difference / Growth calculation ("Berapa selisihnya?", "Selisihnya berapa?", "Kenapa naik/turun?")
    const isDiffFollowUp =
      text.includes('berapa selisihnya') ||
      text.includes('selisihnya berapa') ||
      text.includes('berapa selisih') ||
      text.includes('selisihnya') ||
      text.includes('berapa pertumbuhannya') ||
      text.includes('kenapa menurun') ||
      text.includes('mengapa menurun') ||
      text.includes('kenapa naik') ||
      text.includes('mengapa naik') ||
      text.includes('kenapa berbeda') ||
      text.includes('mengapa berbeda');

    if (isDiffFollowUp) {
      return {
        intent: 'EXPLAIN_DIFFERENCE',
        domain: sessionContext ? sessionContext.domain : 'MEMBER',
        topic: 'REGISTRATION',
        isFollowUp: true
      };
    }

    // Follow-up 3: List / Breakdown ("Siapa saja mereka?", "Tampilkan daftarnya", "Rinciannya?")
    const isListFollowUp =
      text.includes('siapa saja mereka') ||
      text === 'siapa saja' ||
      text.includes('tampilkan daftarnya') ||
      text === 'daftarnya' ||
      text === 'rinciannya' ||
      text === 'detailnya' ||
      text.includes('lihat daftarnya');

    if (isListFollowUp && sessionContext) {
      if (sessionContext.domain === 'MEMBER' || sessionContext.topic === 'MEMBER') {
        return { intent: 'MEMBER_LIST', domain: 'MEMBER', topic: 'MEMBER', isFollowUp: true };
      }
      if (sessionContext.domain === 'LOAN' || sessionContext.topic === 'LOAN') {
        return { intent: 'LOAN_LIST', domain: 'LOAN', topic: 'LOAN', isFollowUp: true };
      }
      if (sessionContext.domain === 'INSTALLMENT' || sessionContext.topic === 'INSTALLMENT') {
        return { intent: 'INSTALLMENT_UNPAID_MEMBERS', domain: 'INSTALLMENT', topic: 'INSTALLMENT', isFollowUp: true };
      }
      if (sessionContext.domain === 'SAVINGS' || sessionContext.topic === 'SAVINGS') {
        return { intent: 'SAVINGS_DETAIL', domain: 'SAVINGS', topic: 'SAVINGS', isFollowUp: true };
      }
    }

    // Follow-up 4: Subcategory shift ("Kalau simpanan wajibnya?", "Simpanan pokoknya?")
    if (text.includes('simpanan wajib') && sessionContext && sessionContext.domain === 'SAVINGS') {
      return { intent: 'SAVINGS_WAJIB', domain: 'SAVINGS', topic: 'SAVINGS', isFollowUp: true };
    }
    if (text.includes('simpanan pokok') && sessionContext && sessionContext.domain === 'SAVINGS') {
      return { intent: 'SAVINGS_POKOK', domain: 'SAVINGS', topic: 'SAVINGS', isFollowUp: true };
    }
    if (text.includes('simpanan sukarela') && sessionContext && sessionContext.domain === 'SAVINGS') {
      return { intent: 'SAVINGS_SUKARELA', domain: 'SAVINGS', topic: 'SAVINGS', isFollowUp: true };
    }

    // Follow-up 5: Workflow next step ("Bagaimana cara menyetujuinya?" after loan explanation)
    if (
      (text.includes('bagaimana cara menyetujuinya') || text.includes('cara menyetujui')) &&
      sessionContext && (sessionContext.topic === 'LOAN' || sessionContext.intent === 'EXPLAIN_LOANS')
    ) {
      return { intent: 'GUIDE_APPROVE_LOAN', domain: 'LOAN', topic: 'LOAN', isFollowUp: true };
    }

    return null;
  }

  /**
   * Main Classification Pipeline: Maps user message to exact system intent
   */
  classify(rawMessage = '', conversation = [], sessionContext = null, userRole = 'MEMBER') {
    const text = this.normalizeText(rawMessage);

    // 1. Check for follow-up questions first
    const followUp = this.resolveFollowUp(text, conversation, sessionContext);
    if (followUp) {
      return followUp;
    }

    // 2. Extract entities
    const entities = this.extractEntities(text, sessionContext);

    // 3. Security, Injection, & Mutation Guards
    if (
      text.includes('password') ||
      text.includes('kata sandi') ||
      text.includes('salt') ||
      text.includes('api key') ||
      text.includes('apikey') ||
      text.includes('secret') ||
      text.includes('token sesi') ||
      text.includes('session token') ||
      text.includes('select * from') ||
      text.includes('drop table') ||
      text.includes('dump database') ||
      text.includes('tampilkan semua database')
    ) {
      return { intent: 'SECURITY_ALERT', domain: 'SECURITY', topic: 'SECURITY' };
    }

    if (
      text.startsWith('tambah ') ||
      text.startsWith('tambahkan ') ||
      text.startsWith('hapus ') ||
      text.startsWith('delete ') ||
      text.startsWith('ubah ') ||
      text.startsWith('update ') ||
      text.includes('setor uang') ||
      text.includes('tarik saldo') ||
      text.includes('setujui pinjaman') ||
      text.includes('cairkan pinjaman')
    ) {
      return { intent: 'MUTATION_ATTEMPT', domain: 'SECURITY', topic: 'MUTATION' };
    }

    // 4. Identity & Conversational
    if (text === 'siapa saya' || text === 'saya siapa' || text === 'role saya' || text === 'akun saya' || text === 'peran saya') {
      return { intent: 'WHO_AM_I', domain: 'SYSTEM', topic: 'IDENTITY' };
    }

    if (text.startsWith('halo') || text.startsWith('hai') || text === 'selamat pagi' || text === 'selamat siang' || text === 'assalamualaikum') {
      return { intent: 'GREETING', domain: 'CONVERSATIONAL', topic: 'CONVERSATIONAL' };
    }

    if (text.startsWith('terima kasih') || text === 'makasih' || text === 'thanks') {
      return { intent: 'THANKS', domain: 'CONVERSATIONAL', topic: 'CONVERSATIONAL' };
    }

    if (text === 'bantuan' || text === 'menu bantuan' || text === 'siapa kamu' || text === 'kamu siapa') {
      return { intent: 'BOT_INFO', domain: 'SYSTEM', topic: 'BOT_INFO' };
    }

    // 5. Cooperative Overview / Summary ("Ringkasan kondisi koperasi")
    if (
      text.includes('ringkasan kondisi koperasi') ||
      text.includes('kondisi koperasi') ||
      text.includes('rekapitulasi koperasi') ||
      text.includes('gambaran umum koperasi') ||
      text.includes('kondisi umum koperasi') ||
      text.includes('laporan umum koperasi') ||
      text.includes('status koperasi saat ini')
    ) {
      return { intent: 'COOP_SUMMARY', domain: 'FINANCIAL', topic: 'FINANCIAL' };
    }

    // 6. Member Domain Queries
    if (entities.domain === 'MEMBER' || text.includes('anggota')) {
      if (entities.isComparison || (text.includes('bulan ini') && text.includes('bulan lalu'))) {
        return { intent: 'REGISTRATION_COMPARE', domain: 'MEMBER', topic: 'REGISTRATION' };
      }
      if (entities.period === 'THIS_MONTH' && (entities.metric === 'NEW' || text.includes('daftar') || text.includes('baru'))) {
        return { intent: 'REGISTRATION_THIS_MONTH', domain: 'MEMBER', topic: 'REGISTRATION' };
      }
      if (entities.period === 'LAST_MONTH' && (entities.metric === 'NEW' || text.includes('daftar') || text.includes('baru'))) {
        return { intent: 'REGISTRATION_LAST_MONTH', domain: 'MEMBER', topic: 'REGISTRATION' };
      }
      if (entities.period === 'TODAY' && (entities.metric === 'NEW' || text.includes('daftar') || text.includes('baru'))) {
        return { intent: 'REGISTRATION_TODAY', domain: 'MEMBER', topic: 'REGISTRATION' };
      }
      if (entities.metric === 'INACTIVE' || text.includes('nonaktif') || text.includes('tidak aktif')) {
        return { intent: 'MEMBER_INACTIVE', domain: 'MEMBER', topic: 'MEMBER' };
      }
      if (entities.metric === 'ACTIVE' || (text.includes('aktif') && !text.includes('nonaktif') && !text.includes('tidak aktif'))) {
        return { intent: 'MEMBER_ACTIVE', domain: 'MEMBER', topic: 'MEMBER' };
      }
      if (entities.metric === 'LIST' || text.includes('daftar')) {
        return { intent: 'MEMBER_LIST', domain: 'MEMBER', topic: 'MEMBER' };
      }
      if (
        text.includes('total') ||
        text.includes('jumlah') ||
        text.includes('ada berapa') ||
        text.includes('berapa') ||
        text.includes('sekarang') ||
        text.includes('saat ini') ||
        text.includes('kini') ||
        text.includes('anggota kita') ||
        text === 'anggota'
      ) {
        return { intent: 'MEMBER_TOTAL', domain: 'MEMBER', topic: 'MEMBER' };
      }
    }

    // 7. Savings Domain Queries
    if (entities.domain === 'SAVINGS' || text.includes('simpanan')) {
      if (entities.metric === 'TOP_RANK' || text.includes('terbesar') || text.includes('paling banyak')) {
        return { intent: 'SAVINGS_TOP_SAVER', domain: 'SAVINGS', topic: 'SAVINGS' };
      }
      if (text.includes('saya') || text.includes('tabungan saya') || text.includes('saldo saya')) {
        return { intent: 'SAVINGS_MY', domain: 'SAVINGS', topic: 'SAVINGS' };
      }
      if (entities.subCategory === 'POKOK') {
        return { intent: 'SAVINGS_POKOK', domain: 'SAVINGS', topic: 'SAVINGS' };
      }
      if (entities.subCategory === 'WAJIB') {
        return { intent: 'SAVINGS_WAJIB', domain: 'SAVINGS', topic: 'SAVINGS' };
      }
      if (entities.subCategory === 'SUKARELA') {
        return { intent: 'SAVINGS_SUKARELA', domain: 'SAVINGS', topic: 'SAVINGS' };
      }
      if (text.includes('total') || text.includes('saldo') || text.includes('koperasi')) {
        return { intent: 'SAVINGS_TOTAL', domain: 'SAVINGS', topic: 'SAVINGS' };
      }
    }

    // 8. Loan Domain Queries
    if (entities.domain === 'LOAN' || text.includes('pinjaman')) {
      if (text.includes('saya') || text.includes('pengajuan saya')) {
        return { intent: 'LOAN_MY', domain: 'LOAN', topic: 'LOAN' };
      }
      if (text.includes('belum lunas') || text.includes('berjalan') || text.includes('aktif')) {
        return { intent: 'LOAN_UNPAID', domain: 'LOAN', topic: 'LOAN' };
      }
      if (text.includes('pending') || text.includes('menunggu')) {
        return { intent: 'LOAN_PENDING', domain: 'LOAN', topic: 'LOAN' };
      }
      if (entities.metric === 'LIST' || text.includes('daftar')) {
        return { intent: 'LOAN_LIST', domain: 'LOAN', topic: 'LOAN' };
      }
      if (text.includes('total') || text.includes('portofolio') || text.includes('kondisi pinjaman')) {
        return { intent: 'LOAN_SUMMARY', domain: 'LOAN', topic: 'LOAN' };
      }
    }

    // 9. Installment Domain Queries
    if (entities.domain === 'INSTALLMENT' || text.includes('angsuran')) {
      if (text.includes('siapa') || text.includes('anggota yang belum bayar') || text.includes('belum bayar')) {
        return { intent: 'INSTALLMENT_UNPAID_MEMBERS', domain: 'INSTALLMENT', topic: 'INSTALLMENT' };
      }
      if (text.includes('tunggakan') || text.includes('terlambat') || text.includes('jatuh tempo')) {
        return { intent: 'INSTALLMENT_OVERDUE', domain: 'INSTALLMENT', topic: 'INSTALLMENT' };
      }
      if (text.includes('saya')) {
        return { intent: 'INSTALLMENT_MY', domain: 'INSTALLMENT', topic: 'INSTALLMENT' };
      }
      return { intent: 'INSTALLMENT_SUMMARY', domain: 'INSTALLMENT', topic: 'INSTALLMENT' };
    }

    // 10. Financial Reports & Cash Book Queries
    if (entities.domain === 'FINANCIAL' || text.includes('keuangan') || text.includes('kas')) {
      if (text.includes('pemasukan') || text.includes('masuk')) {
        return { intent: 'FINANCIAL_INCOME', domain: 'FINANCIAL', topic: 'FINANCIAL' };
      }
      if (text.includes('pengeluaran') || text.includes('keluar') || text.includes('beban')) {
        return { intent: 'FINANCIAL_EXPENSE', domain: 'FINANCIAL', topic: 'FINANCIAL' };
      }
      if (text.includes('meningkat') || text.includes('tren') || text.includes('bandingkan')) {
        return { intent: 'FINANCIAL_TREND', domain: 'FINANCIAL', topic: 'FINANCIAL' };
      }
      return { intent: 'FINANCIAL_REPORT', domain: 'FINANCIAL', topic: 'FINANCIAL' };
    }

    // 11. Stock / Inventory Queries
    if (entities.domain === 'INVENTORY' || text.includes('stok') || text.includes('barang')) {
      return { intent: 'INVENTORY_QUERY', domain: 'INVENTORY', topic: 'INVENTORY' };
    }

    // 12. Own Profile Queries
    if (text.includes('profil saya') || text.includes('data diri saya') || text.includes('nomor anggota saya')) {
      return { intent: 'OWN_PROFILE', domain: 'SYSTEM', topic: 'PROFILE' };
    }

    // 13. System Explanation & Workflow Guides
    if (text.includes('jelaskan aplikasi') || text.includes('tentang aplikasi') || text.includes('apa fungsi smart co-op') || text.includes('apa fungsi sistem')) {
      return { intent: 'APP_EXPLANATION', domain: 'SYSTEM', topic: 'SYSTEM_OVERVIEW' };
    }
    if (text.includes('jelaskan alur pinjaman') || text.includes('jelaskan fitur pinjaman') || text.includes('jelaskan sistem pinjaman') || text.includes('skema bunga')) {
      return { intent: 'EXPLAIN_LOANS', domain: 'LOAN', topic: 'LOAN' };
    }
    if (text.includes('jelaskan alur simpanan') || text.includes('jelaskan fitur simpanan') || text.includes('jelaskan jenis simpanan') || text.includes('perbedaan simpanan')) {
      return { intent: 'EXPLAIN_SAVINGS', domain: 'SAVINGS', topic: 'SAVINGS' };
    }
    if (text.includes('cara mengajukan pinjaman') || text.includes('bagaimana mengajukan pinjaman')) {
      return { intent: 'GUIDE_APPLY_LOAN', domain: 'LOAN', topic: 'LOAN' };
    }
    if (text.includes('cara setor simpanan') || text.includes('bagaimana menyetor simpanan')) {
      return { intent: 'GUIDE_DEPOSIT_SAVINGS', domain: 'SAVINGS', topic: 'SAVINGS' };
    }
    if (text.includes('cara bayar angsuran') || text.includes('bagaimana membayar angsuran')) {
      return { intent: 'GUIDE_PAY_INSTALLMENT', domain: 'INSTALLMENT', topic: 'INSTALLMENT' };
    }
    if (text.includes('cara menambah anggota') || text.includes('bagaimana menambah anggota')) {
      return { intent: 'GUIDE_REGISTER_MEMBER', domain: 'MEMBER', topic: 'MEMBER' };
    }

    // 14. Coding / Technical Help
    if (text.includes('contoh kode') || text.includes('coding') || text.includes('javascript') || text.includes('python')) {
      return { intent: 'COOP_CODING', domain: 'SYSTEM', topic: 'CODING' };
    }

    // 15. Ambiguous or Short Queries
    if (text.length <= 4 || text === 'cek' || text === 'data' || text === 'koperasi') {
      return { intent: 'CLARIFICATION_NEEDED', domain: 'SYSTEM', topic: 'UNKNOWN' };
    }

    // 16. Out of Domain
    if (text.includes('resep') || text.includes('masak') || text.includes('cuaca') || text.includes('film') || text.includes('lagu')) {
      return { intent: 'OUT_OF_DOMAIN', domain: 'SYSTEM', topic: 'OUT_OF_DOMAIN' };
    }

    // Default Fallback
    return { intent: 'GENERAL_QUESTION', domain: 'SYSTEM', topic: 'GENERAL' };
  }
}

