/**
 * Development Database Seeder
 * Seeds test accounts with secure PBKDF2 hashed passwords and corresponding Member records
 * STMIK IKMI Cirebon
 */

import { ROLES, MEMBER_TYPES, USER_STATUS, MEMBER_STATUS } from '../../config/constants.js';
import { CryptoService } from '../security/cryptoService.js';

export const DEFAULT_DEV_PASSWORD = 'IKMI@Coop2026!';

export class DatabaseSeeder {
  constructor(adapter) {
    this.adapter = adapter;
  }

  async seed() {
    const existingUsers = await this.adapter.getAll('users');
    if (existingUsers && existingUsers.length > 0) {
      console.log('[Seeder] Database already contains user records. Skipping seed.');
      return;
    }

    console.log('[Seeder] Generating securely hashed test accounts (PBKDF2-SHA256, 100k iterations)...');

    const seedAccounts = [
      {
        id: 'usr-admin-001',
        name: 'Admin Koperasi IKMI',
        email: 'admin@ikmi.ac.id',
        role: ROLES.ADMIN,
        memberData: null
      },
      {
        id: 'usr-ketua-001',
        name: 'Dr. H. Dadang Sudrajat, S.Kom., M.Kom.',
        email: 'ketua@ikmi.ac.id',
        role: ROLES.CHAIRMAN,
        memberData: {
          member_number: 'IKMI-MBR-001',
          identity_number: 'NIDN: 0412087501',
          member_type: MEMBER_TYPES.DOSEN,
          phone: '081222119001',
          address: 'Jl. Pemuda No. 45, Kesambi, Kota Cirebon',
          join_date: '2019-01-10'
        }
      },
      {
        id: 'usr-dosen-001',
        name: 'Dr. Siti Nurhaliza, M.Kom.',
        email: 'dosen@ikmi.ac.id',
        role: ROLES.MEMBER,
        memberData: {
          member_number: 'IKMI-MBR-002',
          identity_number: 'NIDN: 0423058202',
          member_type: MEMBER_TYPES.DOSEN,
          phone: '081394551234',
          address: 'Jl. Brigjend Dharsono No. 12, Cirebon',
          join_date: '2020-03-15'
        }
      },
      {
        id: 'usr-mhs-001',
        name: 'Ahmad Fauzi',
        email: 'mahasiswa@ikmi.ac.id',
        role: ROLES.MEMBER,
        memberData: {
          member_number: 'IKMI-MBR-003',
          identity_number: 'NIM: 20210123004',
          member_type: MEMBER_TYPES.MAHASISWA,
          phone: '085721345678',
          address: 'Jl. Kanggraksan Gg. Mawar No. 7, Cirebon',
          join_date: '2022-09-01'
        }
      },
      {
        id: 'usr-staf-001',
        name: 'Budi Santoso, S.AP.',
        email: 'staf@ikmi.ac.id',
        role: ROLES.MEMBER,
        memberData: {
          member_number: 'IKMI-MBR-004',
          identity_number: 'NIP: 199108192015',
          member_type: MEMBER_TYPES.STAF,
          phone: '081804567890',
          address: 'Jl. Tuparev Gg. Melati No. 18, Cirebon',
          join_date: '2020-06-01'
        }
      },
      {
        id: 'usr-baru-001',
        name: 'Rina Novita (Anggota Baru)',
        email: 'anggotabaru@ikmi.ac.id',
        role: ROLES.MEMBER,
        memberData: {
          member_number: 'IKMI-MBR-005',
          identity_number: 'NIM: 20240199001',
          member_type: MEMBER_TYPES.MAHASISWA,
          phone: '089612345678',
          address: 'Jl. Perjuangan No. 88, Karyamulya, Kota Cirebon',
          join_date: '2026-03-01'
        }
      }
    ];

    const usersToInsert = [];
    const membersToInsert = [];

    for (const account of seedAccounts) {
      // Generate individual random salt and hash
      const { hash, salt } = await CryptoService.hashPassword(DEFAULT_DEV_PASSWORD);

      const userRecord = {
        id: account.id,
        name: account.name,
        email: account.email,
        password_hash: hash,
        salt: salt,
        role: account.role,
        status: USER_STATUS.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      usersToInsert.push(userRecord);

      if (account.memberData) {
        membersToInsert.push({
          id: `mbr-${account.id}`,
          member_number: account.memberData.member_number,
          user_id: account.id,
          full_name: account.name,
          identity_number: account.memberData.identity_number,
          member_type: account.memberData.member_type,
          phone: account.memberData.phone,
          address: account.memberData.address,
          join_date: account.memberData.join_date,
          status: MEMBER_STATUS.ACTIVE,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    // Seed roles lookup
    const rolesToInsert = [
      { code: ROLES.ADMIN, name: 'Administrator Koperasi', description: 'Hak akses penuh pengelolaan sistem koperasi dan laporan' },
      { code: ROLES.CHAIRMAN, name: 'Ketua STMIK IKMI', description: 'Monitoring eksekutif dan audit laporan keuangan' },
      { code: ROLES.DOSEN, name: 'Anggota Dosen', description: 'Akses portal mandiri data pribadi dan keuangan dosen' },
      { code: ROLES.MAHASISWA, name: 'Anggota Mahasiswa', description: 'Akses portal mandiri data pribadi dan keuangan mahasiswa' },
      { code: ROLES.STAF, name: 'Anggota Staf', description: 'Akses portal mandiri data pribadi dan keuangan staf' },
      { code: ROLES.MEMBER, name: 'Anggota Koperasi (Legacy)', description: 'Akses portal mandiri untuk Dosen, Mahasiswa, dan Staf' }
    ];

    await this.adapter.saveAll('roles', rolesToInsert);
    await this.adapter.saveAll('users', usersToInsert);
    await this.adapter.saveAll('members', membersToInsert);
    await this.adapter.saveAll('sessions', []);
    await this.adapter.saveAll('audit_logs', []);

    // Seed Initial Realistic Loans & Installments
    const seedLoans = [
      {
        id: 'ln-seed-001',
        member_id: 'mbr-usr-dosen-001',
        loan_number: 'LN-202601-0001',
        principal_amount: 12000000,
        interest_rate: 6,
        interest_type: 'FLAT',
        tenure: 12,
        start_date: '2026-01-10',
        due_date: '2027-01-10',
        status: 'ACTIVE',
        purpose: 'Pembiayaan Riset dan Publikasi Scopus',
        notes: 'Disetujui komite pembiayaan IKMI',
        total_interest: 720000,
        total_repayment: 12720000,
        paid_amount: 2120000,
        remaining_principal: 10000000,
        created_by: 'usr-dosen-001',
        created_at: '2026-01-05T08:30:00.000Z',
        reviewed_by: 'usr-admin-001',
        reviewed_at: '2026-01-06T10:00:00.000Z',
        approved_by: 'usr-ketua-001',
        approved_at: '2026-01-07T14:20:00.000Z',
        disbursed_by: 'usr-admin-001',
        disbursed_at: '2026-01-10T09:00:00.000Z',
        is_deleted: false,
        updated_at: new Date().toISOString()
      },
      {
        id: 'ln-seed-002',
        member_id: 'mbr-usr-mhs-001',
        loan_number: 'LN-202602-0002',
        principal_amount: 3000000,
        interest_rate: 0,
        interest_type: 'ZERO_INTEREST',
        tenure: 6,
        start_date: '2026-02-01',
        due_date: '2026-08-01',
        status: 'PENDING',
        purpose: 'Bantuan Biaya Tugas Akhir & Wisuda',
        notes: 'Menunggu verifikasi berkas akademik',
        total_interest: 0,
        total_repayment: 3000000,
        paid_amount: 0,
        remaining_principal: 3000000,
        created_by: 'usr-mhs-001',
        created_at: '2026-02-01T11:15:00.000Z',
        is_deleted: false,
        updated_at: new Date().toISOString()
      },
      {
        id: 'ln-seed-003',
        member_id: 'mbr-usr-staf-001',
        loan_number: 'LN-202511-0003',
        principal_amount: 5000000,
        interest_rate: 6,
        interest_type: 'FLAT',
        tenure: 5,
        start_date: '2025-11-01',
        due_date: '2026-04-01',
        status: 'ACTIVE',
        purpose: 'Renovasi Rumah Pegawai',
        notes: 'Pencairan via rekening Bank BJB',
        total_interest: 125000,
        total_repayment: 5125000,
        paid_amount: 3075000,
        remaining_principal: 2000000,
        created_by: 'usr-staf-001',
        created_at: '2025-10-25T09:00:00.000Z',
        approved_by: 'usr-ketua-001',
        approved_at: '2025-10-28T10:00:00.000Z',
        disbursed_by: 'usr-admin-001',
        disbursed_at: '2025-11-01T08:00:00.000Z',
        is_deleted: false,
        updated_at: new Date().toISOString()
      }
    ];

    // Seed installments for ln-seed-001 (12 months)
    const seedInstallments = [];
    for (let i = 1; i <= 12; i++) {
      const month = String(i).padStart(2, '0');
      const isPaid = i <= 2;
      seedInstallments.push({
        id: `ins-seed-001-${i}`,
        loan_id: 'ln-seed-001',
        installment_number: i,
        due_date: `2026-${month}-10`,
        principal: 1000000,
        interest: 60000,
        total_due: 1060000,
        paid_amount: isPaid ? 1060000 : 0,
        paid_date: isPaid ? `2026-${month}-09T10:00:00.000Z` : null,
        status: isPaid ? 'PAID' : (i === 3 ? 'UNPAID' : 'UNPAID'),
        payment_method: isPaid ? 'TRANSFER_BANK' : null,
        payment_receipt: isPaid ? `RCP-2026${month}10` : null,
        notes: isPaid ? 'Lunas tepat waktu' : '',
        is_deleted: false,
        created_at: '2026-01-10T09:00:00.000Z',
        updated_at: new Date().toISOString()
      });
    }

    // Seed installments for ln-seed-003 (5 months) - including 1 overdue for demonstration
    for (let i = 1; i <= 5; i++) {
      const isPaid = i <= 3;
      const isOverdue = i === 4;
      seedInstallments.push({
        id: `ins-seed-003-${i}`,
        loan_id: 'ln-seed-003',
        installment_number: i,
        due_date: i <= 2 ? `2025-1${i}-01` : (i === 3 ? '2026-01-01' : (i === 4 ? '2026-02-01' : '2026-03-01')),
        principal: 1000000,
        interest: 25000,
        total_due: 1025000,
        paid_amount: isPaid ? 1025000 : 0,
        paid_date: isPaid ? `2025-12-01T10:00:00.000Z` : null,
        status: isPaid ? 'PAID' : (isOverdue ? 'OVERDUE' : 'UNPAID'),
        payment_method: isPaid ? 'TUNAI' : null,
        payment_receipt: isPaid ? `RCP-STAF-00${i}` : null,
        notes: isOverdue ? 'Tunggakan jatuh tempo' : '',
        is_deleted: false,
        created_at: '2025-11-01T08:00:00.000Z',
        updated_at: new Date().toISOString()
      });
    }

    // Seed history trail
    const seedHistory = [
      {
        id: 'hst-seed-001',
        loan_id: 'ln-seed-001',
        previous_status: null,
        new_status: 'PENDING',
        changed_by: 'usr-dosen-001',
        changed_by_name: 'Dr. Siti Nurhaliza, M.Kom.',
        notes: 'Pengajuan pinjaman baru dibuat',
        timestamp: '2026-01-05T08:30:00.000Z'
      },
      {
        id: 'hst-seed-002',
        loan_id: 'ln-seed-001',
        previous_status: 'PENDING',
        new_status: 'APPROVED',
        changed_by: 'usr-ketua-001',
        changed_by_name: 'Dr. H. Dadang Sudrajat, S.Kom., M.Kom.',
        notes: 'Disetujui komite pembiayaan IKMI',
        timestamp: '2026-01-07T14:20:00.000Z'
      },
      {
        id: 'hst-seed-003',
        loan_id: 'ln-seed-001',
        previous_status: 'APPROVED',
        new_status: 'ACTIVE',
        changed_by: 'usr-admin-001',
        changed_by_name: 'Admin Koperasi IKMI',
        notes: 'Dana dicairkan via transfer bank. Jadwal angsuran diaktifkan.',
        timestamp: '2026-01-10T09:00:00.000Z'
      },
      {
        id: 'hst-seed-004',
        loan_id: 'ln-seed-002',
        previous_status: null,
        new_status: 'PENDING',
        changed_by: 'usr-mhs-001',
        changed_by_name: 'Ahmad Fauzi',
        notes: 'Pengajuan pinjaman biaya tugas akhir',
        timestamp: '2026-02-01T11:15:00.000Z'
      }
    ];

    await this.adapter.saveAll('loans', seedLoans);
    await this.adapter.saveAll('installments', seedInstallments);
    await this.adapter.saveAll('loan_status_history', seedHistory);

    // Seed General Financial Transactions Ledger
    const seedTransactions = [
      {
        id: 'trx-seed-001',
        transaction_number: 'TRX-202601-0001',
        transaction_date: '2026-01-05T08:00:00.000Z',
        transaction_type: 'SAVING_DEPOSIT',
        flow: 'IN',
        amount: 2500000,
        reference_type: 'SAVINGS',
        reference_id: 'TRX-DEP-001001',
        member_id: 'mbr-usr-dosen-001',
        category: 'Simpanan Wajib & Pokok',
        description: 'Setoran Simpanan Pokok dan Wajib Awal Tahun',
        notes: 'Setoran via Teller Koperasi',
        is_reversed: false,
        created_by: 'usr-admin-001',
        created_by_name: 'Admin Koperasi IKMI',
        created_at: '2026-01-05T08:00:00.000Z',
        updated_at: '2026-01-05T08:00:00.000Z'
      },
      {
        id: 'trx-seed-002',
        transaction_number: 'TRX-202601-0002',
        transaction_date: '2026-01-10T09:00:00.000Z',
        transaction_type: 'LOAN_DISBURSEMENT',
        flow: 'OUT',
        amount: 12000000,
        reference_type: 'LOANS',
        reference_id: 'LN-202601-0001',
        member_id: 'mbr-usr-dosen-001',
        category: 'Penyaluran Pinjaman',
        description: 'Pencairan Pinjaman Riset Dosen LN-202601-0001',
        notes: 'Transfer Bank BJB',
        is_reversed: false,
        created_by: 'usr-admin-001',
        created_by_name: 'Admin Koperasi IKMI',
        created_at: '2026-01-10T09:00:00.000Z',
        updated_at: '2026-01-10T09:00:00.000Z'
      },
      {
        id: 'trx-seed-003',
        transaction_number: 'TRX-202601-0003',
        transaction_date: '2026-01-15T10:30:00.000Z',
        transaction_type: 'INCOME',
        flow: 'IN',
        amount: 1500000,
        reference_type: 'OPERATIONAL',
        reference_id: null,
        member_id: null,
        category: 'Pendapatan Administrasi & Kemitraan',
        description: 'Penerimaan Biaya Administrasi Pendaftaran Anggota Baru & Unit Kantin',
        notes: 'Penerimaan rutin',
        is_reversed: false,
        created_by: 'usr-admin-001',
        created_by_name: 'Admin Koperasi IKMI',
        created_at: '2026-01-15T10:30:00.000Z',
        updated_at: '2026-01-15T10:30:00.000Z'
      },
      {
        id: 'trx-seed-004',
        transaction_number: 'TRX-202601-0004',
        transaction_date: '2026-01-20T14:00:00.000Z',
        transaction_type: 'EXPENSE',
        flow: 'OUT',
        amount: 450000,
        reference_type: 'OPERATIONAL',
        reference_id: null,
        member_id: null,
        category: 'Beban Operasional & ATK',
        description: 'Pembelian Kertas, Toner Printer, dan Perlengkapan Kantor Koperasi',
        notes: 'Nota Toko Buku Bahagia Cirebon',
        is_reversed: false,
        created_by: 'usr-admin-001',
        created_by_name: 'Admin Koperasi IKMI',
        created_at: '2026-01-20T14:00:00.000Z',
        updated_at: '2026-01-20T14:00:00.000Z'
      },
      {
        id: 'trx-seed-005',
        transaction_number: 'TRX-202602-0005',
        transaction_date: '2026-02-09T10:00:00.000Z',
        transaction_type: 'INSTALLMENT_PAYMENT',
        flow: 'IN',
        amount: 1060000,
        reference_type: 'INSTALLMENTS',
        reference_id: 'RCP-20260210',
        member_id: 'mbr-usr-dosen-001',
        category: 'Angsuran Pinjaman',
        description: 'Pembayaran Angsuran ke-2 Pinjaman LN-202601-0001',
        notes: 'Transfer Bank BJB',
        is_reversed: false,
        created_by: 'usr-admin-001',
        created_by_name: 'Admin Koperasi IKMI',
        created_at: '2026-02-09T10:00:00.000Z',
        updated_at: '2026-02-09T10:00:00.000Z'
      },
      {
        id: 'trx-seed-006',
        transaction_number: 'TRX-202602-0006',
        transaction_date: '2026-02-12T11:00:00.000Z',
        transaction_type: 'EXPENSE',
        flow: 'OUT',
        amount: 250000,
        reference_type: 'OPERATIONAL',
        reference_id: null,
        member_id: null,
        category: 'Beban Operasional & Konsumsi',
        description: 'Konsumsi Rapat Koordinasi Pengurus Koperasi',
        notes: 'Salah catat nominal (seharusnya Rp 150.000)',
        is_reversed: true,
        reversed_by_transaction_id: 'trx-seed-007',
        reversal_reason: 'Koreksi salah input nominal konsumsi',
        created_by: 'usr-admin-001',
        created_by_name: 'Admin Koperasi IKMI',
        created_at: '2026-02-12T11:00:00.000Z',
        updated_at: '2026-02-12T11:30:00.000Z'
      },
      {
        id: 'trx-seed-007',
        transaction_number: 'TRX-202602-0007',
        transaction_date: '2026-02-12T11:30:00.000Z',
        transaction_type: 'REVERSAL',
        flow: 'IN',
        amount: 250000,
        reference_type: 'TRANSACTION_REVERSAL',
        reference_id: 'TRX-202602-0006',
        member_id: null,
        category: 'Koreksi / Reversal Transaksi',
        description: '[REVERSAL] Koreksi Pembatalan Transaksi TRX-202602-0006 (Konsumsi Rapat)',
        notes: 'Koreksi salah input nominal konsumsi',
        is_reversed: false,
        original_transaction_id: 'trx-seed-006',
        reversal_reason: 'Koreksi salah input nominal konsumsi',
        created_by: 'usr-admin-001',
        created_by_name: 'Admin Koperasi IKMI',
        created_at: '2026-02-12T11:30:00.000Z',
        updated_at: '2026-02-12T11:30:00.000Z'
      }
    ];

    await this.adapter.saveAll('financial_transactions', seedTransactions);

    // Seed Saving Transactions Table
    const seedSavings = [
      {
        id: 'TRX-DEP-001001',
        member_id: 'mbr-usr-dosen-001',
        saving_type: 'POKOK',
        transaction_type: 'DEPOSIT',
        amount: 1000000,
        description: 'Setoran Simpanan Pokok Awal Keanggotaan',
        created_by: 'usr-admin-001',
        created_at: '2020-03-15T08:00:00.000Z'
      },
      {
        id: 'TRX-DEP-001002',
        member_id: 'mbr-usr-dosen-001',
        saving_type: 'WAJIB',
        transaction_type: 'DEPOSIT',
        amount: 1500000,
        description: 'Setoran Simpanan Wajib Berkala',
        created_by: 'usr-admin-001',
        created_at: '2026-01-05T08:00:00.000Z'
      },
      {
        id: 'TRX-DEP-001003',
        member_id: 'mbr-usr-dosen-001',
        saving_type: 'SUKARELA',
        transaction_type: 'DEPOSIT',
        amount: 2500000,
        description: 'Setoran Simpanan Sukarela Suksesif',
        created_by: 'usr-admin-001',
        created_at: '2026-01-20T09:30:00.000Z'
      },
      {
        id: 'TRX-DEP-002001',
        member_id: 'mbr-usr-staf-001',
        saving_type: 'POKOK',
        transaction_type: 'DEPOSIT',
        amount: 500000,
        description: 'Setoran Simpanan Pokok Awal Keanggotaan',
        created_by: 'usr-admin-001',
        created_at: '2020-06-01T08:00:00.000Z'
      },
      {
        id: 'TRX-DEP-002002',
        member_id: 'mbr-usr-staf-001',
        saving_type: 'WAJIB',
        transaction_type: 'DEPOSIT',
        amount: 1200000,
        description: 'Setoran Simpanan Wajib Rutin Bulanan',
        created_by: 'usr-admin-001',
        created_at: '2025-11-01T08:00:00.000Z'
      },
      {
        id: 'TRX-DEP-002003',
        member_id: 'mbr-usr-staf-001',
        saving_type: 'SUKARELA',
        transaction_type: 'DEPOSIT',
        amount: 800000,
        description: 'Setoran Simpanan Sukarela Tabungan Hari Raya',
        created_by: 'usr-admin-001',
        created_at: '2026-01-10T10:00:00.000Z'
      },
      {
        id: 'TRX-DEP-003001',
        member_id: 'mbr-usr-mhs-001',
        saving_type: 'POKOK',
        transaction_type: 'DEPOSIT',
        amount: 100000,
        description: 'Setoran Simpanan Pokok Mahasiswa',
        created_by: 'usr-admin-001',
        created_at: '2022-09-01T08:00:00.000Z'
      },
      {
        id: 'TRX-DEP-003002',
        member_id: 'mbr-usr-mhs-001',
        saving_type: 'WAJIB',
        transaction_type: 'DEPOSIT',
        amount: 250000,
        description: 'Setoran Simpanan Wajib Semesteran',
        created_by: 'usr-admin-001',
        created_at: '2025-10-01T08:00:00.000Z'
      }
    ];

    await this.adapter.saveAll('saving_transactions', seedSavings);

    console.log(`[Seeder] Seeded ${usersToInsert.length} users, ${membersToInsert.length} members, ${seedLoans.length} loans, ${seedInstallments.length} installments, ${seedSavings.length} savings, and ${seedTransactions.length} financial transactions.`);
  }

  async resetSeed() {
    await this.adapter.clearTable('users');
    await this.adapter.clearTable('members');
    await this.adapter.clearTable('roles');
    await this.adapter.clearTable('sessions');
    await this.adapter.clearTable('audit_logs');
    await this.adapter.clearTable('loans');
    await this.adapter.clearTable('installments');
    await this.adapter.clearTable('loan_status_history');
    await this.adapter.clearTable('financial_transactions');
    await this.adapter.clearTable('saving_transactions');
    await this.seed();
  }
}


