/**
 * calculations.ts — Financial projection calculations
 *
 * FUNCTIONS:
 * - calculateProjections: Generate yearly projections for all accounts
 * - calculateAccountValue: Calculate single account value at a given year
 *
 * CUSTOMIZATION:
 * - To change volatility levels: modify volatilityValues mapping
 * - To add new compounding methods: modify calculateAccountValue
 * - To change projection granularity: modify the loop in calculateProjections
 */

import { Account } from '../App';

/** Volatility levels mapped to percentage values */
const volatilityValues: Record<string, number> = {
  low: 0.05,
  medium: 0.15,
  high: 0.25,
};

/**
 * Generate yearly projections for multiple accounts
 *
 * @param accounts - Array of accounts to project
 * @param maxYears - Number of years to project forward
 * @returns Array of yearly data points with each account's value and total
 *
 * Each row contains:
 * - year: Calendar year
 * - [accountId]: Projected value for that account
 * - Total: Sum of all accounts
 */
export function calculateProjections(accounts: Account[], maxYears: number) {
  const projections: Array<Record<string, number | string>> = [];

  // Use earliest account start year as base calendar year
  const baseYear = accounts.length
    ? Math.min(...accounts.map((a) => new Date(a.date).getFullYear()))
    : new Date().getFullYear();

  for (let year = 0; year <= maxYears; year++) {
    const calendarYear = baseYear + year;
    const row: Record<string, number | string> = { year: calendarYear };
    let total = 0;

    accounts.forEach((account) => {
      const effectiveYears = Math.min(year, account.timeHorizon);
      const value = calculateAccountValue(account, effectiveYears);
      // Use account.id as key to prevent name collisions
      row[account.id] = value;
      total += value;
    });

    row.Total = total;
    projections.push(row);
  }

  return projections;
}

/**
 * Calculate the projected value of a single account
 *
 * @param account - Account with amount, return, transactions, etc.
 * @param years - Number of years to project
 * @returns Projected value (minimum 0)
 *
 * FORMULA:
 * - Compounds returns monthly or annually based on frequency
 * - Applies recurring deposits/withdrawals each period
 * - Adjusts for volatility (higher volatility = slightly lower expected value)
 */
export function calculateAccountValue(account: Account, years: number): number {
  const {
    amount,
    expectedReturn,
    transactionAmount,
    transactionType,
    frequency,
    volatility,
  } = account;

  // Convert percentage to decimal (e.g., 7 -> 0.07)
  const annualReturn = expectedReturn / 100;
  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

  let value = amount;
  const periodsPerYear = frequency === 'monthly' ? 12 : 1;
  const totalPeriods = years * periodsPerYear;
  const returnPerPeriod = frequency === 'monthly' ? monthlyReturn : annualReturn;

  // Volatility reduces expected value slightly for conservative estimate
  let volatilityFactor = 1;
  if (volatility) {
    const vol = volatilityValues[volatility] || 0;
    volatilityFactor = 1 - vol * 0.1;
  }

  // Compound each period
  for (let period = 0; period < totalPeriods; period++) {
    // Apply return for this period
    value = value * (1 + returnPerPeriod * volatilityFactor);

    // Apply recurring transaction (deposit adds, withdraw subtracts)
    const amt = Number(transactionAmount) || 0;
    const signed = transactionType === 'withdraw' ? -Math.abs(amt) : Math.abs(amt);
    value += signed;
  }

  return Math.max(0, value);
}
