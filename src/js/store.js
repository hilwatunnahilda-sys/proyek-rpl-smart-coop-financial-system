// Central State Store for Smart Co-op Financial System STMIK IKMI Cirebon
import { generateInstallmentSchedule } from './utils/loanCalc.js';
import { generateId } from './utils/formatters.js';

const STORAGE_KEY = 'ikmi_smart_coop_data_v1';

class CoopStore {
  constructor() {
    this.subscribers = [];
    this.data = this.loadData();
  }

  getDefaultData() {
    const members = [
      {
        id: 'IKMI-MBR-001',
        name: 'Dr. H. Dadang Sudrajat, S.Kom., M.Kom.',
        type: 'ketua',
        role: 'ketua',
        identifier: 'NIDN: 0412087501',
        department: 'Ketua STMIK IKMI Cirebon',
        email: 'ketua@ikmi.ac.id',
        phone: '081222119001',
        joinDate: '2019-01-10',
        status: 'aktif',
        address: 'Jl. Pemuda No. 45, Kesambi, Kota Cirebon'
      },
      {
        id: 'IKMI-MBR-002',
        name: 'Admin Koperasi IKMI',
        type: 'admin',
        role: 'admin',
        identifier: 'NIP: 198504122008',
        department: 'Unit Pengelola Koperasi',
        email: 'admin@ikmi.ac.id',
        phone: '081222119002',
        joinDate: '2019-01-10',
        status: 'aktif',
        address: 'Komplek Kampus STMIK IKMI Cirebon'
      },
      {
        id: 'IKMI-MBR-003',
        name: 'Dr. Siti Nurhaliza, M.Kom.',
        type: 'dosen',
        role: 'anggota',
        identifier: 'NIDN: 0423058202',
        department: 'Teknik Informatika (S1)',
        email: 'dosen@ikmi.ac.id',
        phone: '081394551234',
        joinDate: '2020-03-15',
        status: 'aktif',
        address: 'Jl. Brigjend Dharsono No. 12, Cirebon'
      },
      {
        id: 'IKMI-MBR-004',
        name: 'Ahmad Fauzi',
        type: 'mahasiswa',
        role: 'anggota',
        identifier: 'NIM: 20210123004',
        department: 'Rekayasa Perangkat Lunak (S1)',
        email: 'mahasiswa@ikmi.ac.id',
        phone: '085721345678',
        joinDate: '2022-09-01',
        status: 'aktif',
        address: 'Jl. Kanggraksan Gg. Mawar No. 7, Cirebon'
      },
      {
        id: 'IKMI-MBR-005',
        name: 'Budi Santoso, S.AP.',
        type: 'staf',
        role: 'anggota',
        identifier: 'NIP: 199108192015',
        department: 'Bagian Administrasi Akademik (BAAK)',
        email: 'staf@ikmi.ac.id',
        phone: '081804567890',
        joinDate: '2020-06-01',
        status: 'aktif',
        address: 'Jl. Tuparev Gg. Melati No. 18, Cirebon'
      },
      {
        id: 'IKMI-MBR-006',
        name: 'Ir. Hendra Gunawan, M.T.',
        type: 'dosen',
        role: 'anggota',
        identifier: 'NIDN: 0418077901',
        department: 'Sistem Informasi (S1)',
        email: 'hendra@ikmi.ac.id',
        phone: '081298765432',
        joinDate: '2020-01-10',
        status: 'aktif',
        address: 'Perumahan Permata Harjamukti Blok B2, Cirebon'
      },
      {
        id: 'IKMI-MBR-007',
        name: 'Ratna Dewi, S.E., M.Ak.',
        type: 'dosen',
        role: 'anggota',
        identifier: 'NIDN: 0429118503',
        department: 'Komputerisasi Akuntansi (D3)',
        email: 'ratna@ikmi.ac.id',
        phone: '081324567812',
        joinDate: '2021-02-15',
        status: 'aktif',
        address: 'Jl. Sutawinangun No. 88, Cirebon'
      },
      {
        id: 'IKMI-MBR-008',
        name: 'Rian Wardana, M.Kom.',
        type: 'dosen',
        role: 'anggota',
        identifier: 'NIDN: 0405098801',
        department: 'Manajemen Informatika (D3)',
        email: 'rian@ikmi.ac.id',
        phone: '081234567899',
        joinDate: '2021-04-10',
        status: 'aktif',
        address: 'Jl. Kartini No. 24, Cirebon'
      },
      {
        id: 'IKMI-MBR-009',
        name: 'Putri Maharani',
        type: 'mahasiswa',
        role: 'anggota',
        identifier: 'NIM: 20220201019',
        department: 'Teknik Informatika (S1)',
        email: 'putri@ikmi.ac.id',
        phone: '087812349911',
        joinDate: '2023-02-01',
        status: 'aktif',
        address: 'Jl. Pangeran Drajat No. 15, Cirebon'
      },
      {
        id: 'IKMI-MBR-010',
        name: 'Yusuf Maulana, A.Md.',
        type: 'staf',
        role: 'anggota',
        identifier: 'NIP: 199512032018',
        department: 'Unit Pelayanan IT & Laboratorium',
        email: 'yusuf@ikmi.ac.id',
        phone: '082123456789',
        joinDate: '2021-08-15',
        status: 'aktif',
        address: 'Jl. Perjuangan No. 50, Cirebon'
      }
    ];

    const savings = [
      // Simpanan Pokok (Rp 100.000)
      { id: 'SV-1001', memberId: 'IKMI-MBR-001', type: 'pokok', action: 'setor', amount: 100000, date: '2019-01-10', notes: 'Setoran Simpanan Pokok Keanggotaan', recordedBy: 'Admin Koperasi' },
      { id: 'SV-1002', memberId: 'IKMI-MBR-002', type: 'pokok', action: 'setor', amount: 100000, date: '2019-01-10', notes: 'Setoran Simpanan Pokok Keanggotaan', recordedBy: 'Admin Koperasi' },
      { id: 'SV-1003', memberId: 'IKMI-MBR-003', type: 'pokok', action: 'setor', amount: 100000, date: '2020-03-15', notes: 'Setoran Simpanan Pokok Keanggotaan', recordedBy: 'Admin Koperasi' },
      { id: 'SV-1004', memberId: 'IKMI-MBR-004', type: 'pokok', action: 'setor', amount: 100000, date: '2022-09-01', notes: 'Setoran Simpanan Pokok Keanggotaan', recordedBy: 'Admin Koperasi' },
      { id: 'SV-1005', memberId: 'IKMI-MBR-005', type: 'pokok', action: 'setor', amount: 100000, date: '2020-06-01', notes: 'Setoran Simpanan Pokok Keanggotaan', recordedBy: 'Admin Koperasi' },
      { id: 'SV-1006', memberId: 'IKMI-MBR-006', type: 'pokok', action: 'setor', amount: 100000, date: '2020-01-10', notes: 'Setoran Simpanan Pokok Keanggotaan', recordedBy: 'Admin Koperasi' },
      { id: 'SV-1007', memberId: 'IKMI-MBR-007', type: 'pokok', action: 'setor', amount: 100000, date: '2021-02-15', notes: 'Setoran Simpanan Pokok Keanggotaan', recordedBy: 'Admin Koperasi' },
      { id: 'SV-1008', memberId: 'IKMI-MBR-008', type: 'pokok', action: 'setor', amount: 100000, date: '2021-04-10', notes: 'Setoran Simpanan Pokok Keanggotaan', recordedBy: 'Admin Koperasi' },
      { id: 'SV-1009', memberId: 'IKMI-MBR-009', type: 'pokok', action: 'setor', amount: 100000, date: '2023-02-01', notes: 'Setoran Simpanan Pokok Keanggotaan', recordedBy: 'Admin Koperasi' },
      { id: 'SV-1010', memberId: 'IKMI-MBR-010', type: 'pokok', action: 'setor', amount: 100000, date: '2021-08-15', notes: 'Setoran Simpanan Pokok Keanggotaan', recordedBy: 'Admin Koperasi' },

      // Simpanan Wajib
      { id: 'SV-2001', memberId: 'IKMI-MBR-003', type: 'wajib', action: 'setor', amount: 1200000, date: '2025-12-28', notes: 'Simpanan Wajib 24 Bulan Akumulasi', recordedBy: 'Admin Koperasi' },
      { id: 'SV-2002', memberId: 'IKMI-MBR-004', type: 'wajib', action: 'setor', amount: 500000, date: '2026-01-05', notes: 'Simpanan Wajib 10 Bulan Mahasiswa', recordedBy: 'Admin Koperasi' },
      { id: 'SV-2003', memberId: 'IKMI-MBR-005', type: 'wajib', action: 'setor', amount: 1000000, date: '2026-01-10', notes: 'Simpanan Wajib Staf Akumulasi', recordedBy: 'Admin Koperasi' },
      { id: 'SV-2004', memberId: 'IKMI-MBR-006', type: 'wajib', action: 'setor', amount: 1500000, date: '2026-02-01', notes: 'Simpanan Wajib Dosen Akumulasi', recordedBy: 'Admin Koperasi' },
      { id: 'SV-2005', memberId: 'IKMI-MBR-007', type: 'wajib', action: 'setor', amount: 1100000, date: '2026-02-05', notes: 'Simpanan Wajib Dosen Akumulasi', recordedBy: 'Admin Koperasi' },
      { id: 'SV-2006', memberId: 'IKMI-MBR-001', type: 'wajib', action: 'setor', amount: 2000000, date: '2026-02-10', notes: 'Simpanan Wajib Ketua Akumulasi', recordedBy: 'Admin Koperasi' },
      { id: 'SV-2007', memberId: 'IKMI-MBR-008', type: 'wajib', action: 'setor', amount: 900000, date: '2026-02-15', notes: 'Simpanan Wajib Dosen Akumulasi', recordedBy: 'Admin Koperasi' },

      // Simpanan Sukarela
      { id: 'SV-3001', memberId: 'IKMI-MBR-003', type: 'sukarela', action: 'setor', amount: 5000000, date: '2026-01-15', notes: 'Setoran Tabungan Qurban Koperasi', recordedBy: 'Admin Koperasi' },
      { id: 'SV-3002', memberId: 'IKMI-MBR-001', type: 'sukarela', action: 'setor', amount: 15000000, date: '2026-01-20', notes: 'Penyertaan Simpanan Sukarela Modal Koperasi', recordedBy: 'Admin Koperasi' },
      { id: 'SV-3003', memberId: 'IKMI-MBR-005', type: 'sukarela', action: 'setor', amount: 2500000, date: '2026-02-10', notes: 'Tabungan Hari Raya Staf', recordedBy: 'Admin Koperasi' },
      { id: 'SV-3004', memberId: 'IKMI-MBR-006', type: 'sukarela', action: 'setor', amount: 8000000, date: '2026-02-18', notes: 'Simpanan Berjangka Sukarela', recordedBy: 'Admin Koperasi' }
    ];

    // Pre-populate Loans
    const loan1Schedule = generateInstallmentSchedule('LN-2026-001', 10000000, 10, 1.2, new Date('2025-10-01'));
    // Mark first 5 installments as paid
    for (let i = 0; i < 5; i++) {
      loan1Schedule[i].status = 'paid';
      loan1Schedule[i].paidDate = loan1Schedule[i].dueDate;
      loan1Schedule[i].paidAmount = loan1Schedule[i].totalAmount;
      loan1Schedule[i].receiptNumber = `KW-2026-00${i+1}`;
      loan1Schedule[i].paymentMethod = 'Potong Gaji / Transfer Bank';
    }

    const loan2Schedule = generateInstallmentSchedule('LN-2026-002', 3000000, 6, 1.2, new Date('2026-01-10'));
    // Mark first 2 installments as paid
    for (let i = 0; i < 2; i++) {
      loan2Schedule[i].status = 'paid';
      loan2Schedule[i].paidDate = loan2Schedule[i].dueDate;
      loan2Schedule[i].paidAmount = loan2Schedule[i].totalAmount;
      loan2Schedule[i].receiptNumber = `KW-2026-10${i+1}`;
      loan2Schedule[i].paymentMethod = 'Tunai Kasir';
    }

    const loan3Schedule = generateInstallmentSchedule('LN-2026-003', 15000000, 12, 1.2, new Date('2026-02-01'));
    loan3Schedule[0].status = 'paid';
    loan3Schedule[0].paidDate = '2026-03-01';
    loan3Schedule[0].paidAmount = loan3Schedule[0].totalAmount;
    loan3Schedule[0].receiptNumber = `KW-2026-201`;
    loan3Schedule[0].paymentMethod = 'Transfer Bank BCA';

    const loans = [
      {
        id: 'LN-2026-001',
        memberId: 'IKMI-MBR-003',
        amount: 10000000,
        tenorMonths: 10,
        interestRate: 1.2,
        purpose: 'Pengadaan Perangkat Laptop Penelitian Dosen',
        requestDate: '2025-09-20',
        approvedDate: '2025-09-25',
        disbursedDate: '2025-10-01',
        status: 'disbursed',
        adminNotes: 'Pengajuan disetujui penuh oleh Ketua STMIK IKMI.',
        schedule: loan1Schedule
      },
      {
        id: 'LN-2026-002',
        memberId: 'IKMI-MBR-004',
        amount: 3000000,
        tenorMonths: 6,
        interestRate: 1.2,
        purpose: 'Biaya Ujian Skripsi & Sertifikasi Internasional BNSP',
        requestDate: '2026-01-05',
        approvedDate: '2026-01-08',
        disbursedDate: '2026-01-10',
        status: 'disbursed',
        adminNotes: 'Disetujui untuk bantuan biaya kelulusan mahasiswa.',
        schedule: loan2Schedule
      },
      {
        id: 'LN-2026-003',
        memberId: 'IKMI-MBR-005',
        amount: 15000000,
        tenorMonths: 12,
        interestRate: 1.2,
        purpose: 'Renovasi Rumah Tinggal Staf',
        requestDate: '2026-01-20',
        approvedDate: '2026-01-25',
        disbursedDate: '2026-02-01',
        status: 'disbursed',
        adminNotes: 'Syarat slip gaji dan masa kerja staf memenuhi kriteria.',
        schedule: loan3Schedule
      },
      {
        id: 'LN-2026-004',
        memberId: 'IKMI-MBR-006',
        amount: 20000000,
        tenorMonths: 24,
        interestRate: 1.2,
        purpose: 'Pendidikan Doktoral (S3) Ilmu Komputer',
        requestDate: '2026-02-20',
        approvedDate: null,
        disbursedDate: null,
        status: 'pending',
        adminNotes: 'Menunggu peninjauan dan tanda tangan Ketua STMIK IKMI.',
        schedule: generateInstallmentSchedule('LN-2026-004', 20000000, 24, 1.2, new Date())
      }
    ];

    // Transactions / Buku Kas Ledger
    const transactions = [
      { id: 'TX-20260101', date: '2026-01-02', type: 'masuk', category: 'Saldo Awal Koperasi', amount: 85000000, memberId: null, description: 'Saldo Kas & Bank Pembukuan Tahun Baru 2026', recordedBy: 'Admin Koperasi' },
      { id: 'TX-20260105', date: '2026-01-05', type: 'masuk', category: 'Simpanan Wajib', amount: 500000, memberId: 'IKMI-MBR-004', description: 'Setoran Simpanan Wajib Ahmad Fauzi', recordedBy: 'Admin Koperasi' },
      { id: 'TX-20260110', date: '2026-01-10', type: 'keluar', category: 'Pencairan Pinjaman', amount: 3000000, memberId: 'IKMI-MBR-004', description: 'Pencairan Pinjaman LN-2026-002 Ahmad Fauzi', recordedBy: 'Admin Koperasi' },
      { id: 'TX-20260115', date: '2026-01-15', type: 'masuk', category: 'Simpanan Sukarela', amount: 5000000, memberId: 'IKMI-MBR-003', description: 'Setoran Sukarela Dr. Siti Nurhaliza', recordedBy: 'Admin Koperasi' },
      { id: 'TX-20260120', date: '2026-01-20', type: 'masuk', category: 'Simpanan Sukarela', amount: 15000000, memberId: 'IKMI-MBR-001', description: 'Setoran Modal Sukarela Ketua Dr. H. Dadang Sudrajat', recordedBy: 'Admin Koperasi' },
      { id: 'TX-20260128', date: '2026-01-28', type: 'keluar', category: 'Biaya Operasional', amount: 1250000, memberId: null, description: 'Pembelian Kertas ATK & Pemeliharaan Sistem Komputer Koperasi', recordedBy: 'Admin Koperasi' },
      { id: 'TX-20260201', date: '2026-02-01', type: 'keluar', category: 'Pencairan Pinjaman', amount: 15000000, memberId: 'IKMI-MBR-005', description: 'Pencairan Pinjaman LN-2026-003 Budi Santoso', recordedBy: 'Admin Koperasi' },
      { id: 'TX-20260210', date: '2026-02-10', type: 'masuk', category: 'Pembayaran Angsuran', amount: 1120000, memberId: 'IKMI-MBR-003', description: 'Angsuran Ke-5 Pinjaman LN-2026-001 Dr. Siti Nurhaliza', recordedBy: 'Admin Koperasi' },
      { id: 'TX-20260215', date: '2026-02-15', type: 'masuk', category: 'Pembayaran Angsuran', amount: 536000, memberId: 'IKMI-MBR-004', description: 'Angsuran Ke-2 Pinjaman LN-2026-002 Ahmad Fauzi', recordedBy: 'Admin Koperasi' },
      { id: 'TX-20260220', date: '2026-02-20', type: 'masuk', category: 'Simpanan Sukarela', amount: 8000000, memberId: 'IKMI-MBR-006', description: 'Setoran Sukarela Ir. Hendra Gunawan', recordedBy: 'Admin Koperasi' },
      { id: 'TX-20260301', date: '2026-03-01', type: 'masuk', category: 'Pembayaran Angsuran', amount: 1430000, memberId: 'IKMI-MBR-005', description: 'Angsuran Ke-1 Pinjaman LN-2026-003 Budi Santoso', recordedBy: 'Admin Koperasi' }
    ];

    const announcements = [
      {
        id: 'ANN-001',
        title: 'Undangan Rapat Anggota Tahunan (RAT) Tahun Buku 2025/2026',
        category: 'RAT Koperasi',
        date: '2026-08-15',
        priority: 'high',
        content: 'Diberitahukan kepada seluruh anggota Koperasi STMIK IKMI Cirebon bahwa RAT akan diselenggarakan pada Sabtu, 28 Agustus 2026 di Aula Utama Kampus. Agenda utama: Laporan Pertanggungjawaban Pengurus dan Pembagian Sisa Hasil Usaha (SHU).'
      },
      {
        id: 'ANN-002',
        title: 'Program Pinjaman Lunak Khusus Biaya Pendidikan & Tugas Akhir',
        category: 'Promo Pinjaman',
        date: '2026-08-01',
        priority: 'normal',
        content: 'Koperasi membuka kuota pinjaman khusus mahasiswa semester akhir dan dosen yang menempuh studi lanjut dengan jasa kompetitif 1.0% flat per bulan.'
      },
      {
        id: 'ANN-003',
        title: 'Digitalisasi Layanan Koperasi via Smart Co-op Financial System',
        category: 'Sistem Informasi',
        date: '2026-07-20',
        priority: 'normal',
        content: 'Anggota kini dapat memantau saldo simpanan, riwayat transaksi, simulasi angsuran, serta mencetak Kartu Tanda Anggota (KTA) Digital secara mandiri melalui web ini.'
      }
    ];

    const coopSettings = {
      coopName: 'KOPERASI KELUARGA BESAR STMIK IKMI CIREBON',
      legalNumber: '518/BH/DISKOP-UKM/2020',
      address: 'Jl. Perjuangan No. 10B, Karyamulya, Kec. Kesambi, Kota Cirebon, Jawa Barat 45131',
      phone: '(0231) 490480',
      email: 'koperasi@ikmi.ac.id',
      initialPokok: 100000,
      monthlyWajib: 50000,
      defaultLoanInterest: 1.2,
      ketuaName: 'Dr. H. Dadang Sudrajat, S.Kom., M.Kom.',
      bendaharaName: 'Hj. Diana Fatmawati, S.E., M.Ak.',
      secretaryName: 'Rian Wardana, M.Kom.',
      shuAllocation: {
        modal: 40,      // 40% Jasa Modal (Simpanan)
        anggota: 30,    // 30% Jasa Usaha/Anggota
        cadangan: 20,   // 20% Cadangan Koperasi
        pengurus: 5,    // 5% Pengurus & Pengawas
        pendidikan: 5   // 5% Dana Pendidikan & Sosial
      }
    };

    return {
      members,
      savings,
      loans,
      transactions,
      announcements,
      coopSettings
    };
  }

  loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error loading localStorage data, using defaults', e);
    }
    const defaultData = this.getDefaultData();
    this.saveData(defaultData);
    return defaultData;
  }

  saveData(newData) {
    this.data = newData;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
    this.notifySubscribers();
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => {
      try {
        cb(this.data);
      } catch (e) {
        console.error('Error in subscriber callback', e);
      }
    });
  }

  resetToDefault() {
    const defaultData = this.getDefaultData();
    this.saveData(defaultData);
  }

  // --- Financial Computations ---

  getTotalCashBalance() {
    return this.data.transactions.reduce((acc, tx) => {
      return tx.type === 'masuk' ? acc + tx.amount : acc - tx.amount;
    }, 0);
  }

  getTotalSavings() {
    return this.data.savings.reduce((acc, s) => {
      return s.action === 'setor' ? acc + s.amount : acc - s.amount;
    }, 0);
  }

  getSavingsBreakdown() {
    let pokok = 0, wajib = 0, sukarela = 0;
    this.data.savings.forEach(s => {
      const amt = s.action === 'setor' ? s.amount : -s.amount;
      if (s.type === 'pokok') pokok += amt;
      else if (s.type === 'wajib') wajib += amt;
      else if (s.type === 'sukarela') sukarela += amt;
    });
    return { pokok, wajib, sukarela, total: pokok + wajib + sukarela };
  }

  getMemberSavings(memberId) {
    let pokok = 0, wajib = 0, sukarela = 0;
    this.data.savings.filter(s => s.memberId === memberId).forEach(s => {
      const amt = s.action === 'setor' ? s.amount : -s.amount;
      if (s.type === 'pokok') pokok += amt;
      else if (s.type === 'wajib') wajib += amt;
      else if (s.type === 'sukarela') sukarela += amt;
    });
    return { pokok, wajib, sukarela, total: pokok + wajib + sukarela };
  }

  getTotalDisbursedLoans() {
    return this.data.loans
      .filter(l => l.status === 'disbursed' || l.status === 'lunas')
      .reduce((acc, l) => acc + l.amount, 0);
  }

  getActiveLoansPrincipal() {
    return this.data.loans
      .filter(l => l.status === 'disbursed')
      .reduce((acc, l) => {
        const remaining = l.schedule.reduce((subAcc, item) => {
          return item.status !== 'paid' ? subAcc + item.principalAmount : subAcc;
        }, 0);
        return acc + remaining;
      }, 0);
  }

  getTotalInterestEarned() {
    let totalInterest = 0;
    this.data.loans.forEach(l => {
      l.schedule.forEach(item => {
        if (item.status === 'paid') {
          totalInterest += (item.interestAmount || 0);
        }
      });
    });
    return totalInterest;
  }

  // --- CRUD Operations ---

  // Members
  addMember(memberData) {
    const newId = `IKMI-MBR-${String(this.data.members.length + 1).padStart(3, '0')}`;
    const newMember = {
      id: newId,
      status: 'aktif',
      joinDate: new Date().toISOString().split('T')[0],
      ...memberData
    };
    
    const updatedMembers = [...this.data.members, newMember];
    
    // Automatically record Simpanan Pokok
    const pokokAmount = this.data.coopSettings.initialPokok || 100000;
    const newSaving = {
      id: generateId('SV'),
      memberId: newId,
      type: 'pokok',
      action: 'setor',
      amount: pokokAmount,
      date: newMember.joinDate,
      notes: `Setoran Awal Simpanan Pokok Anggota Baru (${newMember.name})`,
      recordedBy: 'Admin Koperasi'
    };

    const newTx = {
      id: generateId('TX'),
      date: newMember.joinDate,
      type: 'masuk',
      category: 'Simpanan Pokok',
      amount: pokokAmount,
      memberId: newId,
      description: `Simpanan Pokok ${newMember.name} (${newId})`,
      recordedBy: 'Admin Koperasi'
    };

    this.saveData({
      ...this.data,
      members: updatedMembers,
      savings: [...this.data.savings, newSaving],
      transactions: [...this.data.transactions, newTx]
    });

    return newMember;
  }

  updateMember(memberId, fields) {
    const updated = this.data.members.map(m => m.id === memberId ? { ...m, ...fields } : m);
    this.saveData({ ...this.data, members: updated });
  }

  deleteMember(memberId) {
    // Soft toggle or remove
    const updated = this.data.members.map(m => m.id === memberId ? { ...m, status: m.status === 'aktif' ? 'nonaktif' : 'aktif' } : m);
    this.saveData({ ...this.data, members: updated });
  }

  // Savings
  addSavingRecord(savingData) {
    const newSaving = {
      id: generateId('SV'),
      date: new Date().toISOString().split('T')[0],
      recordedBy: 'Admin Koperasi',
      ...savingData
    };

    const member = this.data.members.find(m => m.id === newSaving.memberId);
    const memberName = member ? member.name : newSaving.memberId;

    const txType = newSaving.action === 'setor' ? 'masuk' : 'keluar';
    const txCategory = `Simpanan ${newSaving.type.charAt(0).toUpperCase() + newSaving.type.slice(1)}`;

    const newTx = {
      id: generateId('TX'),
      date: newSaving.date,
      type: txType,
      category: txCategory,
      amount: newSaving.amount,
      memberId: newSaving.memberId,
      description: `${newSaving.action === 'setor' ? 'Setoran' : 'Penarikan'} ${txCategory} - ${memberName}`,
      recordedBy: newSaving.recordedBy
    };

    this.saveData({
      ...this.data,
      savings: [...this.data.savings, newSaving],
      transactions: [...this.data.transactions, newTx]
    });

    return newSaving;
  }

  // Loans
  applyLoan(loanData) {
    const newLoanId = generateId('LN-2026');
    const schedule = generateInstallmentSchedule(
      newLoanId,
      loanData.amount,
      loanData.tenorMonths,
      loanData.interestRate || this.data.coopSettings.defaultLoanInterest,
      new Date()
    );

    const newLoan = {
      id: newLoanId,
      requestDate: new Date().toISOString().split('T')[0],
      approvedDate: null,
      disbursedDate: null,
      status: 'pending',
      adminNotes: '',
      interestRate: this.data.coopSettings.defaultLoanInterest,
      schedule,
      ...loanData
    };

    this.saveData({
      ...this.data,
      loans: [...this.data.loans, newLoan]
    });

    return newLoan;
  }

  updateLoanStatus(loanId, status, adminNotes = '') {
    const today = new Date().toISOString().split('T')[0];
    let txToAdd = null;

    const updatedLoans = this.data.loans.map(loan => {
      if (loan.id === loanId) {
        const updated = { ...loan, status, adminNotes: adminNotes || loan.adminNotes };
        if (status === 'approved') {
          updated.approvedDate = today;
        } else if (status === 'disbursed') {
          updated.disbursedDate = today;
          // Regenerate schedule starting from today
          updated.schedule = generateInstallmentSchedule(
            loan.id,
            loan.amount,
            loan.tenorMonths,
            loan.interestRate,
            new Date()
          );

          const member = this.data.members.find(m => m.id === loan.memberId);
          txToAdd = {
            id: generateId('TX'),
            date: today,
            type: 'keluar',
            category: 'Pencairan Pinjaman',
            amount: loan.amount,
            memberId: loan.memberId,
            description: `Pencairan Pinjaman ${loan.id} untuk ${member ? member.name : loan.memberId}`,
            recordedBy: 'Admin Koperasi'
          };
        }
        return updated;
      }
      return loan;
    });

    const updatedTransactions = txToAdd 
      ? [...this.data.transactions, txToAdd]
      : this.data.transactions;

    this.saveData({
      ...this.data,
      loans: updatedLoans,
      transactions: updatedTransactions
    });
  }

  // Pay Installment
  payInstallment(loanId, installmentNumber, paymentMethod = 'Tunai / Transfer') {
    const today = new Date().toISOString().split('T')[0];
    const receiptNum = generateId('KW-2026');
    let txRecord = null;
    let memberName = '';

    const updatedLoans = this.data.loans.map(loan => {
      if (loan.id === loanId) {
        const member = this.data.members.find(m => m.id === loan.memberId);
        memberName = member ? member.name : loan.memberId;

        const updatedSchedule = loan.schedule.map(item => {
          if (item.installmentNumber === parseInt(installmentNumber, 10)) {
            item.status = 'paid';
            item.paidDate = today;
            item.paidAmount = item.totalAmount;
            item.receiptNumber = receiptNum;
            item.paymentMethod = paymentMethod;

            txRecord = {
              id: generateId('TX'),
              date: today,
              type: 'masuk',
              category: 'Pembayaran Angsuran',
              amount: item.totalAmount,
              memberId: loan.memberId,
              description: `Angsuran Ke-${installmentNumber} Pinjaman ${loan.id} - ${memberName} (Pokok: ${item.principalAmount}, Jasa: ${item.interestAmount})`,
              recordedBy: 'Admin Koperasi'
            };
          }
          return item;
        });

        // Check if all installments are paid
        const allPaid = updatedSchedule.every(i => i.status === 'paid');
        return {
          ...loan,
          status: allPaid ? 'lunas' : loan.status,
          schedule: updatedSchedule
        };
      }
      return loan;
    });

    const updatedTransactions = txRecord 
      ? [...this.data.transactions, txRecord]
      : this.data.transactions;

    this.saveData({
      ...this.data,
      loans: updatedLoans,
      transactions: updatedTransactions
    });

    return { receiptNum, loanId, installmentNumber };
  }

  // Transactions Ledger
  addTransaction(txData) {
    const newTx = {
      id: generateId('TX'),
      date: new Date().toISOString().split('T')[0],
      recordedBy: 'Admin Koperasi',
      ...txData
    };

    this.saveData({
      ...this.data,
      transactions: [...this.data.transactions, newTx]
    });

    return newTx;
  }

  // Settings
  updateSettings(newSettings) {
    this.saveData({
      ...this.data,
      coopSettings: {
        ...this.data.coopSettings,
        ...newSettings
      }
    });
  }

  // Announcements
  addAnnouncement(annData) {
    const newAnn = {
      id: generateId('ANN'),
      date: new Date().toISOString().split('T')[0],
      ...annData
    };
    this.saveData({
      ...this.data,
      announcements: [newAnn, ...this.data.announcements]
    });
  }

  deleteAnnouncement(id) {
    this.saveData({
      ...this.data,
      announcements: this.data.announcements.filter(a => a.id !== id)
    });
  }
}

export const store = new CoopStore();
