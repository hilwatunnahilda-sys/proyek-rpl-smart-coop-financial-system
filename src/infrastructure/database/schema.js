/**
 * Database Schema Definitions (DDL & Entity Structure)
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

export const DATABASE_SCHEMA = Object.freeze({
  version: 1,
  name: 'ikmi_smart_coop_db',

  tables: {
    // 1. User / Account Table
    users: {
      primaryKey: 'id',
      columns: {
        id: { type: 'VARCHAR(36)', nullable: false, unique: true },
        name: { type: 'VARCHAR(150)', nullable: false },
        email: { type: 'VARCHAR(100)', nullable: false, unique: true },
        password_hash: { type: 'VARCHAR(255)', nullable: false },
        salt: { type: 'VARCHAR(64)', nullable: false },
        role: { type: 'VARCHAR(20)', nullable: false }, // ADMIN, CHAIRMAN, MEMBER
        status: { type: 'VARCHAR(20)', defaultValue: 'ACTIVE' }, // ACTIVE, INACTIVE, SUSPENDED
        created_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
        updated_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' }
      },
      indexes: ['email', 'role', 'status']
    },

    // 2. Member Table
    members: {
      primaryKey: 'id',
      columns: {
        id: { type: 'VARCHAR(36)', nullable: false, unique: true },
        member_number: { type: 'VARCHAR(30)', nullable: false, unique: true }, // e.g. IKMI-MBR-001
        user_id: { type: 'VARCHAR(36)', nullable: false, foreignKey: 'users.id' },
        full_name: { type: 'VARCHAR(150)', nullable: false },
        identity_number: { type: 'VARCHAR(50)', nullable: true }, // NIDN, NIM, NIP, NIK
        member_type: { type: 'VARCHAR(20)', nullable: false }, // DOSEN, MAHASISWA, STAF
        phone: { type: 'VARCHAR(25)', nullable: true },
        address: { type: 'TEXT', nullable: true },
        join_date: { type: 'DATE', nullable: false },
        status: { type: 'VARCHAR(20)', defaultValue: 'ACTIVE' }, // ACTIVE, INACTIVE
        created_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
        updated_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' }
      },
      indexes: ['member_number', 'user_id', 'member_type', 'status']
    },

    // 3. Roles Lookup Table
    roles: {
      primaryKey: 'code',
      columns: {
        code: { type: 'VARCHAR(20)', nullable: false, unique: true },
        name: { type: 'VARCHAR(50)', nullable: false },
        description: { type: 'VARCHAR(255)', nullable: true }
      }
    },

    // 4. Session Tokens Table
    sessions: {
      primaryKey: 'token',
      columns: {
        token: { type: 'VARCHAR(64)', nullable: false, unique: true },
        user_id: { type: 'VARCHAR(36)', nullable: false, foreignKey: 'users.id' },
        created_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
        expires_at: { type: 'TIMESTAMP', nullable: false },
        is_revoked: { type: 'BOOLEAN', defaultValue: false }
      },
      indexes: ['token', 'user_id', 'is_revoked']
    },

    // 5. Audit Logs Table
    audit_logs: {
      primaryKey: 'id',
      columns: {
        id: { type: 'VARCHAR(36)', nullable: false, unique: true },
        user_id: { type: 'VARCHAR(36)', nullable: true },
        action: { type: 'VARCHAR(50)', nullable: false }, // LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, ACCESS_DENIED
        resource: { type: 'VARCHAR(50)', nullable: false },
        details: { type: 'TEXT', nullable: true },
        timestamp: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' }
      },
      indexes: ['user_id', 'action', 'timestamp']
    },

    // 6. Loans Table
    loans: {
      primaryKey: 'id',
      columns: {
        id: { type: 'VARCHAR(36)', nullable: false, unique: true },
        member_id: { type: 'VARCHAR(36)', nullable: false, foreignKey: 'members.id' },
        loan_number: { type: 'VARCHAR(30)', nullable: false, unique: true }, // e.g. LN-2026-0001
        principal_amount: { type: 'DECIMAL(15, 2)', nullable: false },
        interest_rate: { type: 'DECIMAL(5, 2)', nullable: false, defaultValue: 0 }, // annual %
        interest_type: { type: 'VARCHAR(20)', nullable: false, defaultValue: 'FLAT' }, // FLAT, DECLINING, ANNUITY, ZERO_INTEREST
        tenure: { type: 'INTEGER', nullable: false }, // months
        start_date: { type: 'DATE', nullable: false },
        due_date: { type: 'DATE', nullable: false },
        status: { type: 'VARCHAR(20)', defaultValue: 'PENDING' }, // PENDING, APPROVED, REJECTED, DISBURSED, ACTIVE, PAID_OFF, CANCELLED
        purpose: { type: 'TEXT', nullable: false },
        notes: { type: 'TEXT', nullable: true },
        total_interest: { type: 'DECIMAL(15, 2)', defaultValue: 0 },
        total_repayment: { type: 'DECIMAL(15, 2)', defaultValue: 0 },
        paid_amount: { type: 'DECIMAL(15, 2)', defaultValue: 0 },
        remaining_principal: { type: 'DECIMAL(15, 2)', defaultValue: 0 },
        created_by: { type: 'VARCHAR(36)', nullable: false },
        created_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
        reviewed_by: { type: 'VARCHAR(36)', nullable: true },
        reviewed_at: { type: 'TIMESTAMP', nullable: true },
        approved_by: { type: 'VARCHAR(36)', nullable: true },
        approved_at: { type: 'TIMESTAMP', nullable: true },
        disbursed_by: { type: 'VARCHAR(36)', nullable: true },
        disbursed_at: { type: 'TIMESTAMP', nullable: true },
        rejection_reason: { type: 'TEXT', nullable: true },
        is_deleted: { type: 'BOOLEAN', defaultValue: false },
        updated_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' }
      },
      indexes: ['member_id', 'loan_number', 'status', 'created_at']
    },

    // 7. Installments Table
    installments: {
      primaryKey: 'id',
      columns: {
        id: { type: 'VARCHAR(36)', nullable: false, unique: true },
        loan_id: { type: 'VARCHAR(36)', nullable: false, foreignKey: 'loans.id' },
        installment_number: { type: 'INTEGER', nullable: false },
        due_date: { type: 'DATE', nullable: false },
        principal: { type: 'DECIMAL(15, 2)', nullable: false },
        interest: { type: 'DECIMAL(15, 2)', nullable: false },
        total_due: { type: 'DECIMAL(15, 2)', nullable: false },
        paid_amount: { type: 'DECIMAL(15, 2)', defaultValue: 0 },
        paid_date: { type: 'TIMESTAMP', nullable: true },
        status: { type: 'VARCHAR(20)', defaultValue: 'UNPAID' }, // UNPAID, PARTIALLY_PAID, PAID, OVERDUE
        payment_method: { type: 'VARCHAR(50)', nullable: true },
        payment_receipt: { type: 'VARCHAR(100)', nullable: true },
        notes: { type: 'TEXT', nullable: true },
        is_deleted: { type: 'BOOLEAN', defaultValue: false },
        created_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
        updated_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' }
      },
      indexes: ['loan_id', 'installment_number', 'status', 'due_date']
    },

    // 8. Loan Status History (Audit Trail)
    loan_status_history: {
      primaryKey: 'id',
      columns: {
        id: { type: 'VARCHAR(36)', nullable: false, unique: true },
        loan_id: { type: 'VARCHAR(36)', nullable: false, foreignKey: 'loans.id' },
        previous_status: { type: 'VARCHAR(20)', nullable: true },
        new_status: { type: 'VARCHAR(20)', nullable: false },
        changed_by: { type: 'VARCHAR(36)', nullable: false },
        changed_by_name: { type: 'VARCHAR(150)', nullable: true },
        notes: { type: 'TEXT', nullable: true },
        timestamp: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' }
      },
      indexes: ['loan_id', 'timestamp']
    },

    // 9. General Financial Transactions Ledger (Immutable)
    financial_transactions: {
      primaryKey: 'id',
      columns: {
        id: { type: 'VARCHAR(36)', nullable: false, unique: true },
        transaction_number: { type: 'VARCHAR(30)', nullable: false, unique: true }, // e.g. TRX-202610-0001
        transaction_date: { type: 'TIMESTAMP', nullable: false },
        transaction_type: { type: 'VARCHAR(30)', nullable: false }, // SAVING_DEPOSIT, SAVING_WITHDRAWAL, LOAN_DISBURSEMENT, INSTALLMENT_PAYMENT, INCOME, EXPENSE, ADJUSTMENT, REVERSAL
        flow: { type: 'VARCHAR(10)', nullable: false }, // IN, OUT
        amount: { type: 'DECIMAL(15, 2)', nullable: false },
        reference_type: { type: 'VARCHAR(30)', nullable: false }, // SAVINGS, LOANS, INSTALLMENTS, OPERATIONAL, MANUAL_ADJUSTMENT, TRANSACTION_REVERSAL
        reference_id: { type: 'VARCHAR(50)', nullable: true },
        member_id: { type: 'VARCHAR(36)', nullable: true, foreignKey: 'members.id' },
        category: { type: 'VARCHAR(100)', nullable: true },
        description: { type: 'TEXT', nullable: false },
        notes: { type: 'TEXT', nullable: true },
        is_reversed: { type: 'BOOLEAN', defaultValue: false },
        reversed_by_transaction_id: { type: 'VARCHAR(36)', nullable: true },
        original_transaction_id: { type: 'VARCHAR(36)', nullable: true },
        reversal_reason: { type: 'TEXT', nullable: true },
        created_by: { type: 'VARCHAR(36)', nullable: false },
        created_by_name: { type: 'VARCHAR(150)', nullable: true },
        created_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
        updated_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' }
      },
      indexes: ['transaction_number', 'transaction_date', 'transaction_type', 'member_id', 'reference_id', 'is_reversed']
    },

    // 10. Saving Transactions Table
    saving_transactions: {
      primaryKey: 'id',
      columns: {
        id: { type: 'VARCHAR(36)', nullable: false, unique: true },
        member_id: { type: 'VARCHAR(36)', nullable: false, foreignKey: 'members.id' },
        saving_type: { type: 'VARCHAR(20)', nullable: false }, // POKOK, WAJIB, SUKARELA
        transaction_type: { type: 'VARCHAR(20)', nullable: false }, // DEPOSIT, WITHDRAWAL
        amount: { type: 'DECIMAL(15, 2)', nullable: false },
        description: { type: 'TEXT', nullable: true },
        created_by: { type: 'VARCHAR(36)', nullable: false },
        created_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' }
      },
      indexes: ['member_id', 'saving_type', 'transaction_type', 'created_at']
    },

    // 11. Telegram Linked Accounts Table
    telegram_accounts: {
      primaryKey: 'id',
      columns: {
        id: { type: 'VARCHAR(36)', nullable: false, unique: true },
        user_id: { type: 'VARCHAR(36)', nullable: false, foreignKey: 'users.id', unique: true },
        telegram_chat_id: { type: 'VARCHAR(50)', nullable: false },
        telegram_username: { type: 'VARCHAR(100)', nullable: true },
        first_name: { type: 'VARCHAR(100)', nullable: true },
        linked_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
        is_active: { type: 'BOOLEAN', defaultValue: true },
        notify_new_member: { type: 'BOOLEAN', defaultValue: true },
        notify_loan_updates: { type: 'BOOLEAN', defaultValue: true },
        notify_transactions: { type: 'BOOLEAN', defaultValue: true },
        notify_installment_reminders: { type: 'BOOLEAN', defaultValue: true },
        notify_reports_summary: { type: 'BOOLEAN', defaultValue: true },
        updated_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' }
      },
      indexes: ['user_id', 'telegram_chat_id', 'is_active']
    },

    // 12. Telegram One-Time Link Codes Table (Expiring OTP)
    telegram_link_codes: {
      primaryKey: 'id',
      columns: {
        id: { type: 'VARCHAR(36)', nullable: false, unique: true },
        user_id: { type: 'VARCHAR(36)', nullable: false, foreignKey: 'users.id' },
        code: { type: 'VARCHAR(20)', nullable: false, unique: true },
        created_at: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
        expires_at: { type: 'TIMESTAMP', nullable: false },
        used: { type: 'BOOLEAN', defaultValue: false },
        used_at: { type: 'TIMESTAMP', nullable: true }
      },
      indexes: ['code', 'user_id', 'used', 'expires_at']
    },

    // 13. Telegram Notification Audit Trail Logs
    telegram_notification_logs: {
      primaryKey: 'id',
      columns: {
        id: { type: 'VARCHAR(36)', nullable: false, unique: true },
        user_id: { type: 'VARCHAR(36)', nullable: true },
        telegram_chat_id: { type: 'VARCHAR(50)', nullable: false },
        event_type: { type: 'VARCHAR(50)', nullable: false }, // NEW_MEMBER, LOAN_APPLICATION, LOAN_STATUS_CHANGE, TRANSACTION_SUCCESS, INSTALLMENT_REMINDER, SUMMARY_REPORT, TEST
        recipient_role: { type: 'VARCHAR(30)', nullable: true },
        message_snippet: { type: 'TEXT', nullable: true },
        status: { type: 'VARCHAR(20)', defaultValue: 'SENT' }, // SENT, FAILED, SKIPPED
        error_message: { type: 'TEXT', nullable: true },
        timestamp: { type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' }
      },
      indexes: ['event_type', 'status', 'user_id', 'timestamp']
    }
  }
});


