/**
 * Loan Domain Entity
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { LOAN_STATUS, INTEREST_CALCULATION_TYPE } from '../../config/constants.js';

export class LoanEntity {
  constructor(data = {}) {
    this.id = data.id || `LN-${crypto.randomUUID()}`;
    this.member_id = data.member_id;
    this.loan_number = data.loan_number || '';
    this.principal_amount = Number(data.principal_amount || 0);
    this.interest_rate = Number(data.interest_rate || 0);
    this.interest_type = data.interest_type || INTEREST_CALCULATION_TYPE.FLAT;
    this.tenure = parseInt(data.tenure || 1, 10);
    this.start_date = data.start_date || new Date().toISOString().split('T')[0];
    this.due_date = data.due_date || '';
    this.status = data.status || LOAN_STATUS.PENDING;
    this.purpose = data.purpose || '';
    this.notes = data.notes || '';
    this.total_interest = Number(data.total_interest || 0);
    this.total_repayment = Number(data.total_repayment || (this.principal_amount + this.total_interest));
    this.paid_amount = Number(data.paid_amount || 0);
    this.remaining_principal = Number(data.remaining_principal !== undefined ? data.remaining_principal : this.principal_amount);
    this.created_by = data.created_by || '';
    this.created_at = data.created_at || new Date().toISOString();
    this.reviewed_by = data.reviewed_by || null;
    this.reviewed_at = data.reviewed_at || null;
    this.approved_by = data.approved_by || null;
    this.approved_at = data.approved_at || null;
    this.disbursed_by = data.disbursed_by || null;
    this.disbursed_at = data.disbursed_at || null;
    this.rejection_reason = data.rejection_reason || null;
    this.is_deleted = Boolean(data.is_deleted || false);
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  isPending() {
    return this.status === LOAN_STATUS.PENDING;
  }

  isApproved() {
    return this.status === LOAN_STATUS.APPROVED;
  }

  isDisbursed() {
    return this.status === LOAN_STATUS.DISBURSED;
  }

  isActive() {
    return this.status === LOAN_STATUS.ACTIVE || this.status === LOAN_STATUS.DISBURSED;
  }

  isPaidOff() {
    return this.status === LOAN_STATUS.PAID_OFF;
  }

  isRejected() {
    return this.status === LOAN_STATUS.REJECTED;
  }

  isCancelled() {
    return this.status === LOAN_STATUS.CANCELLED;
  }

  getRepaymentProgressPercentage() {
    if (this.total_repayment <= 0) return 0;
    const pct = (this.paid_amount / this.total_repayment) * 100;
    return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
  }

  toJSON() {
    return {
      id: this.id,
      member_id: this.member_id,
      loan_number: this.loan_number,
      principal_amount: this.principal_amount,
      interest_rate: this.interest_rate,
      interest_type: this.interest_type,
      tenure: this.tenure,
      start_date: this.start_date,
      due_date: this.due_date,
      status: this.status,
      purpose: this.purpose,
      notes: this.notes,
      total_interest: this.total_interest,
      total_repayment: this.total_repayment,
      paid_amount: this.paid_amount,
      remaining_principal: this.remaining_principal,
      created_by: this.created_by,
      created_at: this.created_at,
      reviewed_by: this.reviewed_by,
      reviewed_at: this.reviewed_at,
      approved_by: this.approved_by,
      approved_at: this.approved_at,
      disbursed_by: this.disbursed_by,
      disbursed_at: this.disbursed_at,
      rejection_reason: this.rejection_reason,
      is_deleted: this.is_deleted,
      updated_at: this.updated_at
    };
  }
}
