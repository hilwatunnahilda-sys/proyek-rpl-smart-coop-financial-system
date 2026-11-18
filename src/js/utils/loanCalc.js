// Loan & Installment Calculator with Amortization Logic

export function calculateLoan(principal, tenorMonths, monthlyInterestRatePercent = 1.2, method = 'flat') {
  const p = parseFloat(principal) || 0;
  const t = parseInt(tenorMonths, 10) || 1;
  const rate = (parseFloat(monthlyInterestRatePercent) || 0) / 100;

  if (p <= 0 || t <= 0) {
    return {
      principal: 0,
      tenorMonths: t,
      monthlyInterestRate: rate,
      monthlyPrincipal: 0,
      monthlyInterest: 0,
      monthlyInstallment: 0,
      totalInterest: 0,
      totalPayment: 0
    };
  }

  if (method === 'flat') {
    const monthlyPrincipal = p / t;
    const monthlyInterest = p * rate;
    const monthlyInstallment = monthlyPrincipal + monthlyInterest;
    const totalInterest = monthlyInterest * t;
    const totalPayment = p + totalInterest;

    return {
      principal: p,
      tenorMonths: t,
      monthlyInterestRatePercent,
      monthlyPrincipal: Math.round(monthlyPrincipal),
      monthlyInterest: Math.round(monthlyInterest),
      monthlyInstallment: Math.round(monthlyInstallment),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment)
    };
  } else {
    // Annuity method
    const r = rate;
    const factor = Math.pow(1 + r, t);
    const monthlyInstallment = (p * r * factor) / (factor - 1);
    const totalPayment = monthlyInstallment * t;
    const totalInterest = totalPayment - p;

    return {
      principal: p,
      tenorMonths: t,
      monthlyInterestRatePercent,
      monthlyPrincipal: Math.round(p / t),
      monthlyInterest: Math.round(totalInterest / t),
      monthlyInstallment: Math.round(monthlyInstallment),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment)
    };
  }
}

export function generateInstallmentSchedule(loanId, principal, tenorMonths, monthlyInterestRatePercent = 1.2, startDate = new Date()) {
  const calc = calculateLoan(principal, tenorMonths, monthlyInterestRatePercent);
  const schedule = [];
  const start = new Date(startDate);

  let remainingPrincipal = calc.principal;

  for (let i = 1; i <= calc.tenorMonths; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);

    const isLast = (i === calc.tenorMonths);
    const principalPortion = isLast ? remainingPrincipal : calc.monthlyPrincipal;
    remainingPrincipal = Math.max(0, remainingPrincipal - principalPortion);

    schedule.push({
      installmentNumber: i,
      dueDate: dueDate.toISOString().split('T')[0],
      principalAmount: principalPortion,
      interestAmount: calc.monthlyInterest,
      totalAmount: principalPortion + calc.monthlyInterest,
      remainingBalance: remainingPrincipal,
      status: 'pending', // pending, paid, overdue
      paidDate: null,
      paidAmount: 0,
      receiptNumber: null,
      paymentMethod: null
    });
  }

  return schedule;
}
