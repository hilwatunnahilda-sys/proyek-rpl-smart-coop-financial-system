/**
 * Institutional Constants, Roles & System Statuses
 * STMIK IKMI Cirebon Cooperative System
 */

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  CHAIRMAN: 'CHAIRMAN',
  DOSEN: 'DOSEN',
  MAHASISWA: 'MAHASISWA',
  STAF: 'STAF',
  MEMBER: 'MEMBER'
});

export const AI_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  CHAIRMAN: 'CHAIRMAN',
  DOSEN: 'DOSEN',
  MAHASISWA: 'MAHASISWA',
  STAF: 'STAF'
});

export const MEMBER_TYPES = Object.freeze({
  DOSEN: 'DOSEN',
  MAHASISWA: 'MAHASISWA',
  STAF: 'STAF'
});

export const SAVING_TYPES = Object.freeze({
  POKOK: 'POKOK',
  WAJIB: 'WAJIB',
  SUKARELA: 'SUKARELA'
});

export const TRANSACTION_TYPES = Object.freeze({
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL'
});

export const USER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
});

export const MEMBER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
});

export const INSTITUTION = Object.freeze({
  NAME: 'STMIK IKMI Cirebon',
  COOP_NAME: 'Koperasi Pegawai & Civitas STMIK IKMI Cirebon',
  LEGAL_NUMBER: '518/BH/DISKOP-UKM/2020',
  ADDRESS: 'Jl. Perjuangan No. 10B, Karyamulya, Kec. Kesambi, Kota Cirebon, Jawa Barat 45131',
  PHONE: '(0231) 490480',
  EMAIL: 'koperasi@ikmi.ac.id',
  WEBSITE: 'https://ikmi.ac.id'
});

export const DB_CONNECTION_STATUS = Object.freeze({
  CONNECTED: 'CONNECTED',
  CONNECTING: 'CONNECTING',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR'
});

export const LOAN_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  DISBURSED: 'DISBURSED',
  ACTIVE: 'ACTIVE',
  PAID_OFF: 'PAID_OFF',
  CANCELLED: 'CANCELLED'
});

export const INSTALLMENT_STATUS = Object.freeze({
  UNPAID: 'UNPAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE'
});

export const INTEREST_CALCULATION_TYPE = Object.freeze({
  FLAT: 'FLAT',             // Bunga Flat (Tetap)
  DECLINING: 'DECLINING',   // Bunga Efektif / Menurun
  ANNUITY: 'ANNUITY',       // Bunga Anuitas
  ZERO_INTEREST: 'ZERO_INTEREST' // Bunga 0% / Syariah Qardh
});

export const FINANCIAL_TRANSACTION_TYPES = Object.freeze({
  SAVING_DEPOSIT: 'SAVING_DEPOSIT',
  SAVING_WITHDRAWAL: 'SAVING_WITHDRAWAL',
  LOAN_DISBURSEMENT: 'LOAN_DISBURSEMENT',
  INSTALLMENT_PAYMENT: 'INSTALLMENT_PAYMENT',
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  ADJUSTMENT: 'ADJUSTMENT',
  REVERSAL: 'REVERSAL'
});

export const TRANSACTION_FLOW = Object.freeze({
  IN: 'IN',   // Kas bertambah (Debit Kas / Kredit Sumber)
  OUT: 'OUT' // Kas berkurang (Kredit Kas / Debit Beban/Aset)
});

export const TRANSACTION_REFERENCE_TYPES = Object.freeze({
  SAVINGS: 'SAVINGS',
  LOANS: 'LOANS',
  INSTALLMENTS: 'INSTALLMENTS',
  OPERATIONAL: 'OPERATIONAL',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
  TRANSACTION_REVERSAL: 'TRANSACTION_REVERSAL'
});


