import { SAVING_TYPES, TRANSACTION_TYPES } from '../../config/constants.js';

export class SavingTransactionEntity {
  constructor({
    id,
    member_id,
    saving_type,
    transaction_type,
    amount,
    description = '',
    created_by,
    created_at = new Date().toISOString()
  }) {
    this.id = id;
    this.member_id = member_id;
    this.saving_type = saving_type.toUpperCase();
    this.transaction_type = transaction_type.toUpperCase();
    this.amount = Number(amount);
    this.description = description;
    this.created_by = created_by; // Admin ID or system
    this.created_at = created_at;
  }

  isDeposit() {
    return this.transaction_type === TRANSACTION_TYPES.DEPOSIT;
  }

  isWithdrawal() {
    return this.transaction_type === TRANSACTION_TYPES.WITHDRAWAL;
  }

  toJSON() {
    return {
      id: this.id,
      member_id: this.member_id,
      saving_type: this.saving_type,
      transaction_type: this.transaction_type,
      amount: this.amount,
      description: this.description,
      created_by: this.created_by,
      created_at: this.created_at
    };
  }
}
