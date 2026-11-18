import { DatabaseAdapter } from '../../infrastructure/database/adapter.js';
import { SavingTransactionEntity } from '../entities/SavingTransaction.js';
import { FinancialTransactionService } from './FinancialTransactionService.js';
import { TRANSACTION_TYPES, SAVING_TYPES, ROLES } from '../../config/constants.js';
import { AuthorizationError } from '../../infrastructure/rbac/authorizationMiddleware.js';

export class SavingService {
  constructor(adapter = null) {
    this.db = adapter || new DatabaseAdapter();
    this.tableName = 'saving_transactions';
    this.membersTable = 'members';
    this.finService = new FinancialTransactionService(this.db);
  }

  /**
   * Enforce member data isolation at backend database query layer
   */
  async _validateMemberAccess(user, requestedMemberId) {
    if (!user) return true;
    if (user.role === ROLES.ADMIN || user.role === ROLES.CHAIRMAN) return true;

    // Resolve user's actual member ID from database
    const memberRecord = await this.db.findById(this.membersTable, user.id, 'user_id');
    const actualMemberId = memberRecord ? memberRecord.id : `mbr-${user.id}`;

    if (requestedMemberId !== actualMemberId) {
      throw new AuthorizationError(
        'Isolasi Data Database: Anda tidak memiliki wewenang untuk mengakses data simpanan milik anggota lain.',
        'FORBIDDEN_DATA_ISOLATION'
      );
    }
  }

  async getAllTransactions(query = {}) {
    const records = await this.db.find(this.tableName, query);
    return records.map(record => new SavingTransactionEntity(record)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async getMemberTransactions(memberId, user = null) {
    if (user) {
      await this._validateMemberAccess(user, memberId);
    }
    return this.getAllTransactions({ member_id: memberId });
  }

  async getMemberBalances(memberId, user = null) {
    if (user) {
      await this._validateMemberAccess(user, memberId);
    }
    const transactions = await this.getAllTransactions({ member_id: memberId });
    
    const balances = {
      [SAVING_TYPES.POKOK]: 0,
      [SAVING_TYPES.WAJIB]: 0,
      [SAVING_TYPES.SUKARELA]: 0,
      total: 0
    };

    transactions.forEach(trx => {
      const amount = trx.amount;
      if (trx.isDeposit()) {
        balances[trx.saving_type] += amount;
        balances.total += amount;
      } else if (trx.isWithdrawal()) {
        balances[trx.saving_type] -= amount;
        balances.total -= amount;
      }
    });

    return balances;
  }

  async getGlobalBalances() {
    const allTransactions = await this.getAllTransactions();
    
    const balances = {
      [SAVING_TYPES.POKOK]: 0,
      [SAVING_TYPES.WAJIB]: 0,
      [SAVING_TYPES.SUKARELA]: 0,
      total: 0
    };

    allTransactions.forEach(trx => {
      const amount = trx.amount;
      if (trx.isDeposit()) {
        balances[trx.saving_type] += amount;
        balances.total += amount;
      } else if (trx.isWithdrawal()) {
        balances[trx.saving_type] -= amount;
        balances.total -= amount;
      }
    });

    return balances;
  }

  async recordTransaction({ member_id, saving_type, transaction_type, amount, description, created_by }, user = null) {
    if (user && user.role === ROLES.CHAIRMAN) {
      throw new AuthorizationError(
        'Ketua bersifat READ-ONLY dan tidak diperkenankan mengubah saldo atau mencatat transaksi operasional simpanan.',
        'CHAIRMAN_READONLY_VIOLATION'
      );
    }

    if (amount <= 0) {
      throw new Error('Jumlah transaksi harus lebih besar dari 0.');
    }

    if (!member_id) {
      throw new Error('Anggota tidak valid atau belum dipilih.');
    }

    // Business Rules: Withdrawal cannot exceed balance
    if (transaction_type === TRANSACTION_TYPES.WITHDRAWAL) {
      const balances = await this.getMemberBalances(member_id);
      if (amount > balances[saving_type]) {
        throw new Error(`Saldo simpanan ${saving_type.toLowerCase()} tidak mencukupi (Saldo: Rp ${balances[saving_type].toLocaleString('id-ID')}).`);
      }
    }

    const timestamp = new Date();
    const receiptStr = timestamp.getTime().toString().slice(-6);
    
    const transaction = new SavingTransactionEntity({
      id: `TRX-${transaction_type.substring(0, 3)}-${receiptStr}-${crypto.randomUUID().substring(0, 4)}`.toUpperCase(),
      member_id,
      saving_type,
      transaction_type,
      amount,
      description: description || `Otomatis: ${transaction_type} ${saving_type}`,
      created_by,
      created_at: timestamp.toISOString()
    });

    await this.db.insert(this.tableName, transaction.toJSON());

    // Record into General Financial Transactions Ledger
    try {
      if (transaction_type === TRANSACTION_TYPES.DEPOSIT) {
        await this.finService.recordSavingDeposit({
          member_id,
          saving_transaction_id: transaction.id,
          amount,
          saving_type,
          created_by,
          created_by_name: created_by
        });
      } else {
        await this.finService.recordSavingWithdrawal({
          member_id,
          saving_transaction_id: transaction.id,
          amount,
          saving_type,
          created_by,
          created_by_name: created_by
        });
      }
    } catch (e) {
      console.warn('[SavingService] Failed to post to general ledger:', e);
    }

    // Non-blocking Telegram notification (Simpanan & Mutasi Berhasil)
    (async () => {
      try {
        const member = await this.db.findById(this.membersTable, member_id);
        this._dispatchTelegramNotification('TRANSACTION_SUCCESS', {
          transaction: {
            transaction_number: transaction.id,
            transaction_type: `SIMPANAN_${saving_type}_${transaction_type}`,
            flow: transaction_type === TRANSACTION_TYPES.DEPOSIT ? 'IN' : 'OUT',
            amount,
            description: description || `Mutasi Simpanan ${saving_type} (${transaction_type})`
          },
          member: member || {}
        });
      } catch {}
    })();

    return transaction;
  }

  _dispatchTelegramNotification(eventType, eventData) {
    try {
      if (typeof fetch !== 'undefined') {
        fetch('/api/telegram/notify-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType, eventData })
        }).catch(() => {});
      }
    } catch {
      // Safe non-blocking catch: Financial transaction is 100% safeguarded
    }
  }
}


