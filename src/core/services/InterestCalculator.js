/**
 * Configurable Interest & Installment Schedule Calculation Engine
 * Separates financial business logic from UI layer
 * Supports Flat, Declining (Effective), Annuity, and Zero-Interest (Syariah Qardh) models
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { INTEREST_CALCULATION_TYPE } from '../../config/constants.js';

export class InterestCalculator {
  /**
   * Generates a complete installment schedule based on configurable loan parameters
   * 
   * @param {Object} options
   * @param {number} options.principal - Principal loan amount (e.g. 10000000)
   * @param {number} options.annualInterestRate - Annual interest percentage (e.g. 12 for 12%/year)
   * @param {number} options.tenureMonths - Loan duration in months
   * @param {string} [options.interestType=FLAT] - Calculation method (FLAT, DECLINING, ANNUITY, ZERO_INTEREST)
   * @param {string|Date} [options.startDate] - Start date of the loan (defaults to today)
   * @returns {Object} { summary, schedule }
   */
  static generateSchedule({
    principal,
    annualInterestRate = 0,
    tenureMonths,
    interestType = INTEREST_CALCULATION_TYPE.FLAT,
    startDate = new Date()
  }) {
    const P = Number(principal);
    const n = parseInt(tenureMonths, 10);
    const annualRate = Number(annualInterestRate) || 0;

    if (!P || P <= 0) {
      throw new Error('Jumlah pokok pinjaman harus lebih besar dari 0.');
    }
    if (!n || n <= 0) {
      throw new Error('Tenor pinjaman harus minimal 1 bulan.');
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw new Error('Tanggal mulai pinjaman tidak valid.');
    }

    switch (interestType) {
      case INTEREST_CALCULATION_TYPE.ZERO_INTEREST:
        return this._calculateZeroInterestSchedule(P, n, start);

      case INTEREST_CALCULATION_TYPE.DECLINING:
        return this._calculateDecliningSchedule(P, annualRate, n, start);

      case INTEREST_CALCULATION_TYPE.ANNUITY:
        return this._calculateAnnuitySchedule(P, annualRate, n, start);

      case INTEREST_CALCULATION_TYPE.FLAT:
      default:
        return this._calculateFlatSchedule(P, annualRate, n, start);
    }
  }

  /**
   * Helper to compute future installment due date (1 month interval)
   */
  static getDueDate(startDate, monthOffset) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + monthOffset);
    return d.toISOString().split('T')[0];
  }

  /**
   * 1. FLAT RATE CALCULATION
   * Total Bunga = Pokok * (Bunga Per Tahun / 100) * (Tenor / 12)
   * Pokok Per Bulan = Pokok / Tenor
   * Bunga Per Bulan = Total Bunga / Tenor
   */
  static _calculateFlatSchedule(principal, annualRate, tenureMonths, startDate) {
    const monthlyPrincipal = Math.round(principal / tenureMonths);
    const monthlyInterestRate = (annualRate / 100) / 12;
    const monthlyInterest = Math.round(principal * monthlyInterestRate);
    const monthlyTotal = monthlyPrincipal + monthlyInterest;

    let totalPrincipalAllocated = 0;
    let totalInterest = 0;
    const schedule = [];
    let remainingPrincipal = principal;

    for (let i = 1; i <= tenureMonths; i++) {
      // For last installment, adjust rounding difference
      const isLast = i === tenureMonths;
      const principalPart = isLast ? (principal - totalPrincipalAllocated) : monthlyPrincipal;
      const interestPart = monthlyInterest;
      const totalDue = principalPart + interestPart;

      totalPrincipalAllocated += principalPart;
      totalInterest += interestPart;
      remainingPrincipal -= principalPart;

      schedule.push({
        installment_number: i,
        due_date: this.getDueDate(startDate, i),
        principal: principalPart,
        interest: interestPart,
        total_due: totalDue,
        remaining_balance: Math.max(0, remainingPrincipal)
      });
    }

    const totalRepayment = principal + totalInterest;

    return {
      interest_type: INTEREST_CALCULATION_TYPE.FLAT,
      principal,
      annual_interest_rate: annualRate,
      tenure_months: tenureMonths,
      total_interest: totalInterest,
      total_repayment: totalRepayment,
      monthly_installment_estimate: monthlyTotal,
      schedule
    };
  }

  /**
   * 2. DECLINING / EFFECTIVE RATE CALCULATION (Bunga Efektif / Menurun)
   * Bunga dihitung dari sisa pokok pinjaman setiap bulan
   * Pokok Per Bulan = Pokok / Tenor
   * Bunga Bulan ke-i = Sisa Pokok * (Bunga Per Tahun / 100) / 12
   */
  static _calculateDecliningSchedule(principal, annualRate, tenureMonths, startDate) {
    const monthlyPrincipal = Math.round(principal / tenureMonths);
    const monthlyRate = (annualRate / 100) / 12;

    let remainingPrincipal = principal;
    let totalPrincipalAllocated = 0;
    let totalInterest = 0;
    const schedule = [];

    for (let i = 1; i <= tenureMonths; i++) {
      const isLast = i === tenureMonths;
      const principalPart = isLast ? (principal - totalPrincipalAllocated) : monthlyPrincipal;
      const interestPart = Math.round(remainingPrincipal * monthlyRate);
      const totalDue = principalPart + interestPart;

      totalPrincipalAllocated += principalPart;
      totalInterest += interestPart;
      remainingPrincipal -= principalPart;

      schedule.push({
        installment_number: i,
        due_date: this.getDueDate(startDate, i),
        principal: principalPart,
        interest: interestPart,
        total_due: totalDue,
        remaining_balance: Math.max(0, remainingPrincipal)
      });
    }

    const totalRepayment = principal + totalInterest;

    return {
      interest_type: INTEREST_CALCULATION_TYPE.DECLINING,
      principal,
      annual_interest_rate: annualRate,
      tenure_months: tenureMonths,
      total_interest: totalInterest,
      total_repayment: totalRepayment,
      monthly_installment_estimate: schedule.length > 0 ? schedule[0].total_due : 0,
      schedule
    };
  }

  /**
   * 3. ANNUITY CALCULATION (Cicilan Bulanan Tetap)
   * A = P * [i * (1+i)^n] / [(1+i)^n - 1]
   */
  static _calculateAnnuitySchedule(principal, annualRate, tenureMonths, startDate) {
    if (annualRate === 0) {
      return this._calculateZeroInterestSchedule(principal, tenureMonths, startDate);
    }

    const i = (annualRate / 100) / 12;
    const factor = Math.pow(1 + i, tenureMonths);
    const monthlyPayment = Math.round((principal * i * factor) / (factor - 1));

    let remainingPrincipal = principal;
    let totalPrincipalAllocated = 0;
    let totalInterest = 0;
    const schedule = [];

    for (let k = 1; k <= tenureMonths; k++) {
      const isLast = k === tenureMonths;
      const interestPart = Math.round(remainingPrincipal * i);
      let principalPart = monthlyPayment - interestPart;

      if (isLast) {
        principalPart = principal - totalPrincipalAllocated;
      }

      const totalDue = isLast ? (principalPart + interestPart) : monthlyPayment;

      totalPrincipalAllocated += principalPart;
      totalInterest += interestPart;
      remainingPrincipal -= principalPart;

      schedule.push({
        installment_number: k,
        due_date: this.getDueDate(startDate, k),
        principal: principalPart,
        interest: interestPart,
        total_due: totalDue,
        remaining_balance: Math.max(0, remainingPrincipal)
      });
    }

    const totalRepayment = principal + totalInterest;

    return {
      interest_type: INTEREST_CALCULATION_TYPE.ANNUITY,
      principal,
      annual_interest_rate: annualRate,
      tenure_months: tenureMonths,
      total_interest: totalInterest,
      total_repayment: totalRepayment,
      monthly_installment_estimate: monthlyPayment,
      schedule
    };
  }

  /**
   * 4. ZERO INTEREST / SYARIAH QARDH (Bunga 0%)
   * Pokok Per Bulan = Pokok / Tenor
   * Bunga = 0
   */
  static _calculateZeroInterestSchedule(principal, tenureMonths, startDate) {
    const monthlyPrincipal = Math.round(principal / tenureMonths);
    let remainingPrincipal = principal;
    let totalPrincipalAllocated = 0;
    const schedule = [];

    for (let i = 1; i <= tenureMonths; i++) {
      const isLast = i === tenureMonths;
      const principalPart = isLast ? (principal - totalPrincipalAllocated) : monthlyPrincipal;
      const interestPart = 0;
      const totalDue = principalPart;

      totalPrincipalAllocated += principalPart;
      remainingPrincipal -= principalPart;

      schedule.push({
        installment_number: i,
        due_date: this.getDueDate(startDate, i),
        principal: principalPart,
        interest: 0,
        total_due: totalDue,
        remaining_balance: Math.max(0, remainingPrincipal)
      });
    }

    return {
      interest_type: INTEREST_CALCULATION_TYPE.ZERO_INTEREST,
      principal,
      annual_interest_rate: 0,
      tenure_months: tenureMonths,
      total_interest: 0,
      total_repayment: principal,
      monthly_installment_estimate: monthlyPrincipal,
      schedule
    };
  }
}
