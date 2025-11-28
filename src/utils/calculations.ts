import { Account } from '../App';

const volatilityValues: Record<string, number> = {
  low: 0.05,
  medium: 0.15,
  high: 0.25,
};

export function calculateProjections(accounts: Account[], maxYears: number) {
  const projections: Array<Record<string, number | string>> = [];

  // Use earliest account start year as the base calendar year for rows
  const baseYear = accounts.length ? Math.min(...accounts.map(a => new Date(a.date).getFullYear())) : new Date().getFullYear();

  for (let year = 0; year <= maxYears; year++) {
    const calendarYear = baseYear + year;
    const row: Record<string, number | string> = { year: calendarYear };
    let total = 0;

    accounts.forEach(account => {
      const effectiveYears = Math.min(year, account.timeHorizon);
      const value = calculateAccountValue(account, effectiveYears);
      // Use account.id so multiple scenarios with same name don't collide
      row[account.id] = value;
      total += value;
    });

    row.Total = total;
    projections.push(row);
  }

  return projections;
}

export function calculateAccountValue(account: Account, years: number): number {
  const {
    amount,
    expectedReturn,
    transactionAmount,
    transactionType,
    frequency,
    volatility,
  } = account;

  const annualReturn = expectedReturn / 100;
  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
  
  let value = amount;
  const periodsPerYear = frequency === 'monthly' ? 12 : 1;
  const totalPeriods = years * periodsPerYear;
  const returnPerPeriod = frequency === 'monthly' ? monthlyReturn : annualReturn;
  
  // Simple volatility adjustment (random walk simulation simplified)
  let volatilityFactor = 1;
  if (volatility) {
    const vol = volatilityValues[volatility] || 0;
    // Simplified volatility: reduces expected value slightly for high volatility
    volatilityFactor = 1 - (vol * 0.1);
  }

  for (let period = 0; period < totalPeriods; period++) {
    // Apply return
    value = value * (1 + returnPerPeriod * volatilityFactor);
    
    // Apply transaction
    // Normalize transaction amount and apply sign based on transactionType.
    // This ensures 'withdraw' reduces the balance and 'deposit' increases it.
    const amt = Number(transactionAmount) || 0;
    const signed = transactionType === 'withdraw' ? -Math.abs(amt) : Math.abs(amt);
    value += signed;
  }

  return Math.max(0, value);
}
