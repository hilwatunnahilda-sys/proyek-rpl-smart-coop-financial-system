/**
 * Installment Domain Entity
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { INSTALLMENT_STATUS } from '../../config/constants.js';

export class InstallmentEntity {
  constructor(data = {}) {
    this.id = data.id || `INS-${crypto.randomUUID()}`;
    this.loan_id = data.loan_id;
    this.installment_number = parseInt(data.installment_number || 1, 10);
    this.due_date = data.due_date || '';
    this.principal = Number(data.principal || 0);
    this.interest = Number(data.interest || 0);
    this.total_due = Number(data.total_due || (this.principal + this.interest));
    this.paid_amount = Number(data.paid_amount || 0);
    this.paid_date = data.paid_date || null;
    this.status = data.status || INSTALLMENT_STATUS.UNPAID;
    this.payment_method = data.payment_method || null;
    this.payment_receipt = data.payment_receipt || null;
    this.notes = data.notes || '';
    this.is_deleted = Boolean(data.is_deleted || false);
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  isPaid() {
    return this.status === INSTALLMENT_STATUS.PAID;
  }

  isOverdue() {
    return this.status === INSTALLMENT_STATUS.OVERDUE;
  }

  isPartiallyPaid() {
    return this.status === INSTALLMENT_STATUS.PARTIALLY_PAID;
  }

  getRemainingDue() {
    return Math.max(0, this.total_due - this.paid_amount);
  }

  checkAndUpdateOverdue(referenceDate = new Date()) {
    if (this.isPaid()) return this.status;

    const due = new Date(this.due_date);
    const ref = new Date(referenceDate);
    // Compare YYYY-MM-DD
    due.setHours(23, 59, 59, 999);

    if (ref > due) {
      this.status = INSTALLMENT_STATUS.OVERDUE;
    }
    return this.status;
  }

  toJSON() {
    return {
      id: this.id,
      loan_id: this.loan_id,
      installment_number: this.installment_number,
      due_date: this.due_date,
      principal: this.principal,
      interest: this.interest,
      total_due: this.total_due,
      paid_amount: this.paid_amount,
      paid_date: this.paid_date,
      status: this.status,
      payment_method: this.payment_method,
      payment_receipt: this.payment_receipt,
      notes: this.notes,
      is_deleted: this.is_deleted,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
