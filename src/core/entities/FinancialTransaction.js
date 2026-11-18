/**
 * Financial Transaction Domain Entity
 * Represents immutable double-entry style financial transaction ledger record
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { FINANCIAL_TRANSACTION_TYPES, TRANSACTION_FLOW, TRANSACTION_REFERENCE_TYPES } from '../../config/constants.js';

export class FinancialTransactionEntity {
  constructor(data = {}) {
    this.id = data.id || `TRX-${crypto.randomUUID()}`;
    this.transaction_number = data.transaction_number || '';
    this.transaction_date = data.transaction_date || new Date().toISOString();
    this.transaction_type = data.transaction_type || FINANCIAL_TRANSACTION_TYPES.INCOME;
    this.flow = data.flow || (this._determineDefaultFlow(this.transaction_type));
    this.amount = Number(data.amount || 0);
    this.reference_type = data.reference_type || TRANSACTION_REFERENCE_TYPES.OPERATIONAL;
    this.reference_id = data.reference_id || null;
    this.member_id = data.member_id || null;
    this.category = data.category || 'Umum';
    this.description = data.description || '';
    this.notes = data.notes || '';
    this.is_reversed = Boolean(data.is_reversed || false);
    this.reversed_by_transaction_id = data.reversed_by_transaction_id || null;
    this.original_transaction_id = data.original_transaction_id || null;
    this.reversal_reason = data.reversal_reason || null;
    this.created_by = data.created_by || '';
    this.created_by_name = data.created_by_name || '';
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  _determineDefaultFlow(type) {
    switch (type) {
      case FINANCIAL_TRANSACTION_TYPES.SAVING_DEPOSIT:
      case FINANCIAL_TRANSACTION_TYPES.INSTALLMENT_PAYMENT:
      case FINANCIAL_TRANSACTION_TYPES.INCOME:
        return TRANSACTION_FLOW.IN;
      case FINANCIAL_TRANSACTION_TYPES.SAVING_WITHDRAWAL:
      case FINANCIAL_TRANSACTION_TYPES.LOAN_DISBURSEMENT:
      case FINANCIAL_TRANSACTION_TYPES.EXPENSE:
        return TRANSACTION_FLOW.OUT;
      default:
        return TRANSACTION_FLOW.IN;
    }
  }

  isIncomeOrInflow() {
    return this.flow === TRANSACTION_FLOW.IN;
  }

  isExpenseOrOutflow() {
    return this.flow === TRANSACTION_FLOW.OUT;
  }

  isReversed() {
    return Boolean(this.is_reversed);
  }

  isReversalTransaction() {
    return this.transaction_type === FINANCIAL_TRANSACTION_TYPES.REVERSAL || Boolean(this.original_transaction_id);
  }

  toJSON() {
    return {
      id: this.id,
      transaction_number: this.transaction_number,
      transaction_date: this.transaction_date,
      transaction_type: this.transaction_type,
      flow: this.flow,
      amount: this.amount,
      reference_type: this.reference_type,
      reference_id: this.reference_id,
      member_id: this.member_id,
      category: this.category,
      description: this.description,
      notes: this.notes,
      is_reversed: this.is_reversed,
      reversed_by_transaction_id: this.reversed_by_transaction_id,
      original_transaction_id: this.original_transaction_id,
      reversal_reason: this.reversal_reason,
      created_by: this.created_by,
      created_by_name: this.created_by_name,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
