/**
 * Portfolio Monte Carlo Simulation Engine
 * 
 * Runs Monte Carlo simulations for an entire portfolio treated as a SINGLE UNIFIED VALUE.
 * All accounts contribute to one portfolio balance - deposits add, withdrawals subtract.
 * 
 * KEY FEATURES:
 * - Single portfolio balance (not per-account tracking)
 * - Returns applied to entire portfolio value each year
 * - Cash flows from all accounts aggregate into net annual flow
 * - Survival = portfolio stays above zero
 */

import { Account } from '../App';
import { SimulationPath, SimulationResult, SimulationStats } from './monteCarlo';

/** Portfolio-specific simulation result */
export interface PortfolioSimulationResult extends SimulationResult {
  /** Individual account results for breakdown */
  accountResults: Map<string, SimulationResult>;
  /** Consolidated account groups (for display) */
  consolidatedAccounts: ConsolidatedAccount[];
}

/** Represents a consolidated account (same name, multiple entries) */
export interface ConsolidatedAccount {
  name: string;
  /** All individual accounts contributing to this consolidated account */
  accounts: Account[];
  /** Net initial value (sum of all deposits at their start) */
  initialValue: number;
  /** Weighted average expected return */
  weightedReturn: number;
  /** Weighted average volatility */
  weightedVolatility: number;
  /** Start year (earliest account) */
  startYear: number;
  /** End year (latest end date) */
  endYear: number;
  /** 
   * Per-year cash flow data: maps year -> net cash flow for that year
   */
  yearlyData: Map<number, YearlyAccountData>;
}

/** Data for a specific year within an account */
export interface YearlyAccountData {
  /** Net cash flow for this year (deposits - withdrawals) */
  netCashFlow: number;
  /** Expected return for this year (weighted by active accounts) */
  expectedReturn: number;
  /** Is there active account data for this year? */
  hasActiveData: boolean;
}

/**
 * Box-Muller transform for standard normal random variables
 */
function boxMullerRandom(): number {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
}

/**
 * Calculate standard deviation
 */
function standardDeviation(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const squaredDiffs = arr.map(x => Math.pow(x - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

/**
 * Consolidate accounts by name
 * Same-name accounts are treated as a single logical asset
 * Builds per-year data to handle gap periods correctly
 */
export function consolidateAccounts(accounts: Account[]): ConsolidatedAccount[] {
  const groups = new Map<string, Account[]>();
  
  // Group by normalized name
  accounts.forEach(acc => {
    const key = acc.name.toLowerCase().trim();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(acc);
  });

  // Convert to consolidated accounts
  const consolidated: ConsolidatedAccount[] = [];
  
  groups.forEach((accs, _key) => {
    const name = accs[0].name; // Use original casing from first account
    
    // Calculate initial value
    // CRITICAL FIX: Only DEPOSITS contribute to initial value
    // Drawdowns represent WITHDRAWALS from the existing pot, not additional capital
    const depositAccounts = accs.filter(a => a.transactionType === 'deposit');
    const initialValue = depositAccounts.reduce((sum, a) => sum + (a.amount || 0), 0);
    
    // Date range - from earliest start to latest end
    const startYear = Math.min(...accs.map(a => new Date(a.date).getFullYear()));
    const endYear = Math.max(...accs.map(a => new Date(a.date).getFullYear() + a.timeHorizon));
    
    // Build yearly data map
    const yearlyData = new Map<number, YearlyAccountData>();
    
    // Calculate weighted return and volatility for gap periods
    // Weight by amount (only from deposits since they define the capital base)
    const accountsWithAmount = depositAccounts.filter(a => a.amount > 0);
    const totalAmount = accountsWithAmount.reduce((sum, a) => sum + a.amount, 0);
    
    const weightedReturn = totalAmount > 0
      ? accountsWithAmount.reduce((sum, a) => sum + (a.expectedReturn * a.amount), 0) / totalAmount
      : accs[0].expectedReturn;
    
    // Get volatility from accounts (convert label to number)
    const volMap: Record<string, number> = { 'low': 5, 'medium': 15, 'high': 25 };
    const weightedVolatility = totalAmount > 0
      ? accountsWithAmount.reduce((sum, a) => {
          const vol = a.volatility ? (volMap[a.volatility] || 15) : 15;
          return sum + (vol * a.amount);
        }, 0) / totalAmount
      : 15;
    
    // For each year in the range, determine what accounts are active
    for (let year = startYear; year <= endYear; year++) {
      let netCashFlow = 0;
      let yearReturn = weightedReturn; // Default to weighted average
      let hasActiveData = false;
      let activeAmount = 0;
      let weightedYearReturn = 0;
      
      accs.forEach(acc => {
        const accStart = new Date(acc.date).getFullYear();
        const accEnd = accStart + acc.timeHorizon;
        
        // Check if this account is active in this year
        if (year >= accStart && year < accEnd) {
          hasActiveData = true;
          
          // Calculate annual cash flow contribution with annual increase
          const baseCashFlow = acc.frequency === 'monthly' 
            ? acc.transactionAmount * 12 
            : acc.transactionAmount;
          const yearsElapsed = year - accStart;
          const annualIncreaseRate = (acc.annualIncreaseRate || 0) / 100;
          const adjustedCashFlow = baseCashFlow * Math.pow(1 + annualIncreaseRate, yearsElapsed);
          
          // IMPORTANT: Deposits ADD to the pot, withdrawals SUBTRACT from it
          const signedAmount = acc.transactionType === 'withdraw' ? -adjustedCashFlow : adjustedCashFlow;
          netCashFlow += signedAmount;
          
          // Track for weighted return calculation (use amount from all accounts)
          if (acc.amount > 0) {
            activeAmount += acc.amount;
            weightedYearReturn += acc.expectedReturn * acc.amount;
          }
        }
      });
      
      // Use active accounts' weighted return if available
      if (activeAmount > 0) {
        yearReturn = weightedYearReturn / activeAmount;
      }
      
      yearlyData.set(year, {
        netCashFlow,
        expectedReturn: yearReturn,
        hasActiveData,
      });
    }
    
    consolidated.push({
      name,
      accounts: accs,
      initialValue,
      weightedReturn,
      weightedVolatility,
      startYear,
      endYear,
      yearlyData,
    });
  });

  return consolidated;
}

/**
 * Run portfolio-wide Monte Carlo simulation
 * 
 * CRITICAL: This simulates the portfolio as ONE UNIFIED VALUE.
 * - All deposits contribute to starting value
 * - All cash flows (deposits & withdrawals) apply to the single portfolio
 * - Returns apply to total portfolio value
 * - Death = portfolio hits zero
 * 
 * @param accounts - All accounts to simulate
 * @param numSimulations - Number of simulation paths
 * @param globalVolatilityOverride - Volatility override (0-100%)
 * @param assetOverrides - Per-asset return/volatility overrides (for weighted calculation)
 * @param projectionYears - Override projection length (years from start)
 */
export function runPortfolioMonteCarloSimulation(
  accounts: Account[],
  numSimulations: number,
  globalVolatilityOverride?: number,
  assetOverrides?: Map<string, { returnOverride: number | null; volatilityOverride: number | null }>,
  projectionYears?: number
): PortfolioSimulationResult {
  if (accounts.length === 0) {
    return createEmptyResult();
  }

  // Consolidate accounts for display (but simulation uses unified approach)
  const consolidated = consolidateAccounts(accounts);
  
  // Determine simulation time range
  const startYear = Math.min(...accounts.map(a => new Date(a.date).getFullYear()));
  const naturalEndYear = Math.max(...accounts.map(a => {
    const start = new Date(a.date).getFullYear();
    return start + a.timeHorizon;
  }));
  const endYear = projectionYears !== undefined 
    ? startYear + projectionYears 
    : naturalEndYear;
  
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }

  // Calculate TOTAL initial value (sum of all deposit amounts)
  const totalInitialValue = accounts
    .filter(a => a.transactionType === 'deposit')
    .reduce((sum, a) => sum + (a.amount || 0), 0);

  // Build unified yearly cash flow map
  const yearlyCashFlow = new Map<number, number>();
  for (let y = startYear; y <= endYear; y++) {
    yearlyCashFlow.set(y, 0);
  }
  
  // Aggregate cash flows from ALL accounts (with annual increase support)
  accounts.forEach(acc => {
    const accStart = new Date(acc.date).getFullYear();
    const accEnd = accStart + acc.timeHorizon;
    
    const baseCashFlow = acc.frequency === 'monthly' 
      ? acc.transactionAmount * 12 
      : acc.transactionAmount;
    const annualIncreaseRate = (acc.annualIncreaseRate || 0) / 100;
    
    for (let y = accStart; y < accEnd && y <= endYear; y++) {
      const yearsElapsed = y - accStart;
      // Apply annual increase compound growth
      const adjustedCashFlow = baseCashFlow * Math.pow(1 + annualIncreaseRate, yearsElapsed);
      const signedCashFlow = acc.transactionType === 'withdraw' ? -adjustedCashFlow : adjustedCashFlow;
      
      const current = yearlyCashFlow.get(y) || 0;
      yearlyCashFlow.set(y, current + signedCashFlow);
    }
  });

  // Calculate weighted average return from deposit accounts
  const depositAccounts = accounts.filter(a => a.transactionType === 'deposit' && a.amount > 0);
  const totalDepositAmount = depositAccounts.reduce((sum, a) => sum + a.amount, 0);
  const weightedReturn = totalDepositAmount > 0
    ? depositAccounts.reduce((sum, a) => sum + (a.expectedReturn * a.amount), 0) / totalDepositAmount
    : 7; // Default 7%

  // Use global volatility override or calculate weighted average
  const sigma = globalVolatilityOverride !== undefined 
    ? globalVolatilityOverride / 100 
    : 0.15;
  
  const mu = weightedReturn / 100;

  // Run simulations
  const portfolioPaths: SimulationPath[] = [];

  for (let sim = 0; sim < numSimulations; sim++) {
    const values: number[] = [totalInitialValue];
    let currentValue = totalInitialValue;
    let everDied = false;
    let deathYear = -1;

    for (let yearIdx = 1; yearIdx < years.length; yearIdx++) {
      if (everDied) {
        values.push(0);
        continue;
      }

      const currentYear = years[yearIdx];
      
      // Generate random return using GBM
      const Z = boxMullerRandom();
      const drift = mu - (sigma * sigma) / 2;
      const randomReturn = Math.exp(drift + sigma * Z);
      
      // Apply return to portfolio value
      let newValue = currentValue * randomReturn;
      
      // Apply net cash flow for this year (deposits - withdrawals)
      const netCashFlow = yearlyCashFlow.get(currentYear) || 0;
      newValue += netCashFlow;

      // Check for death
      if (newValue <= 0) {
        newValue = 0;
        everDied = true;
        deathYear = currentYear;
      }

      currentValue = newValue;
      values.push(currentValue);
    }

    portfolioPaths.push({
      values,
      died: everDied,
      deathYear,
      finalValue: values[values.length - 1],
    });
  }

  // Calculate percentiles
  const percentileKeys = [1, 10, 25, 50, 75, 90, 99];
  const percentiles: Record<number, number[]> = {};
  for (const p of percentileKeys) {
    percentiles[p] = [];
  }

  for (let yearIdx = 0; yearIdx < years.length; yearIdx++) {
    const yearValues = portfolioPaths.map(path => path.values[yearIdx]).sort((a, b) => a - b);
    for (const p of percentileKeys) {
      percentiles[p].push(percentile(yearValues, p));
    }
  }

  // Calculate statistics
  const finalValues = portfolioPaths.map(p => p.finalValue).sort((a, b) => a - b);
  const survivedCount = portfolioPaths.filter(p => !p.died).length;

  const stats: SimulationStats = {
    survivedCount,
    totalCount: numSimulations,
    survivalRate: (survivedCount / numSimulations) * 100,
    finalValues: {
      mean: finalValues.reduce((a, b) => a + b, 0) / finalValues.length,
      median: percentile(finalValues, 50),
      stdDev: standardDeviation(finalValues),
      min: finalValues[0] || 0,
      max: finalValues[finalValues.length - 1] || 0,
      percentile1: percentile(finalValues, 1),
      percentile10: percentile(finalValues, 10),
      percentile25: percentile(finalValues, 25),
      percentile50: percentile(finalValues, 50),
      percentile75: percentile(finalValues, 75),
      percentile90: percentile(finalValues, 90),
      percentile99: percentile(finalValues, 99),
    },
  };

  return {
    paths: portfolioPaths,
    years,
    percentiles,
    stats,
    accountResults: new Map(),
    consolidatedAccounts: consolidated,
  };
}

/**
 * Create empty result for when no accounts are provided
 */
function createEmptyResult(): PortfolioSimulationResult {
  const currentYear = new Date().getFullYear();
  return {
    paths: [],
    years: [currentYear],
    percentiles: { 1: [0], 10: [0], 25: [0], 50: [0], 75: [0], 90: [0], 99: [0] },
    stats: {
      survivedCount: 0,
      totalCount: 0,
      survivalRate: 100,
      finalValues: {
        mean: 0, median: 0, stdDev: 0, min: 0, max: 0,
        percentile1: 0, percentile10: 0, percentile25: 0,
        percentile50: 0, percentile75: 0, percentile90: 0, percentile99: 0,
      },
    },
    accountResults: new Map(),
    consolidatedAccounts: [],
  };
}
