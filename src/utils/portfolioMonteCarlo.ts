/**
 * Portfolio Monte Carlo Simulation Engine
 * 
 * Runs Monte Carlo simulations for an entire portfolio of accounts,
 * consolidating same-name accounts and aggregating results.
 * 
 * KEY FEATURES:
 * - Consolidates accounts by name (deposit + drawdown = single asset)
 * - Runs correlated simulations across all assets
 * - Computes portfolio-level statistics and survival rates
 */

import { Account } from '../App';
import { SimulationPath, SimulationResult, SimulationStats } from './monteCarlo';

/** Portfolio-specific simulation result */
export interface PortfolioSimulationResult extends SimulationResult {
  /** Individual account results for breakdown */
  accountResults: Map<string, SimulationResult>;
  /** Consolidated account groups */
  consolidatedAccounts: ConsolidatedAccount[];
}

/** Represents a consolidated account (same name, multiple entries) */
export interface ConsolidatedAccount {
  name: string;
  /** All individual accounts contributing to this consolidated account */
  accounts: Account[];
  /** Net initial value (sum of all deposits) */
  initialValue: number;
  /** Net annual cash flow (deposits - withdrawals) */
  netAnnualCashFlow: number;
  /** Weighted average expected return */
  weightedReturn: number;
  /** Start year (earliest account) */
  startYear: number;
  /** End year (latest end date) */
  endYear: number;
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
    
    // Calculate initial value (sum of deposits only)
    const initialValue = accs
      .filter(a => a.transactionType === 'deposit')
      .reduce((sum, a) => sum + a.amount, 0);
    
    // Calculate net annual cash flow
    const netAnnualCashFlow = accs.reduce((sum, acc) => {
      const annualAmount = acc.frequency === 'monthly' 
        ? acc.transactionAmount * 12 
        : acc.transactionAmount;
      return sum + (acc.transactionType === 'withdraw' ? -annualAmount : annualAmount);
    }, 0);
    
    // Weighted average return (by initial amount for deposits)
    const totalDeposits = accs
      .filter(a => a.transactionType === 'deposit')
      .reduce((sum, a) => sum + a.amount, 0);
    
    const weightedReturn = totalDeposits > 0
      ? accs
          .filter(a => a.transactionType === 'deposit')
          .reduce((sum, a) => sum + (a.expectedReturn * a.amount), 0) / totalDeposits
      : accs[0].expectedReturn;
    
    // Date range
    const startYear = Math.min(...accs.map(a => new Date(a.date).getFullYear()));
    const endYear = Math.max(...accs.map(a => new Date(a.date).getFullYear() + a.timeHorizon));
    
    consolidated.push({
      name,
      accounts: accs,
      initialValue,
      netAnnualCashFlow,
      weightedReturn,
      startYear,
      endYear,
    });
  });

  return consolidated;
}

/**
 * Run portfolio-wide Monte Carlo simulation
 * 
 * @param accounts - All accounts to simulate
 * @param numSimulations - Number of simulation paths
 * @param volatilityOverride - Optional volatility override (0-100%)
 */
export function runPortfolioMonteCarloSimulation(
  accounts: Account[],
  numSimulations: number,
  volatilityOverride?: number
): PortfolioSimulationResult {
  if (accounts.length === 0) {
    return createEmptyResult();
  }

  // Consolidate same-name accounts
  const consolidated = consolidateAccounts(accounts);
  
  // Determine simulation time range
  const startYear = Math.min(...consolidated.map(c => c.startYear));
  const endYear = Math.max(...consolidated.map(c => c.endYear));
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }

  // Get volatility
  const sigma = volatilityOverride !== undefined 
    ? volatilityOverride / 100 
    : 0.15; // Default 15%

  // Run simulations
  const portfolioPaths: SimulationPath[] = [];
  const accountResults = new Map<string, SimulationResult>();

  // Initialize per-account tracking
  const accountPaths: Map<string, SimulationPath[]> = new Map();
  consolidated.forEach(c => {
    accountPaths.set(c.name, []);
  });

  for (let sim = 0; sim < numSimulations; sim++) {
    const portfolioValues: number[] = [];
    let portfolioDied = false;
    let portfolioDeathYear = -1;
    
    // Track per-account values for this simulation
    const simAccountValues: Map<string, number[]> = new Map();
    const simAccountDied: Map<string, boolean> = new Map();
    const simAccountDeathYear: Map<string, number> = new Map();
    
    consolidated.forEach(c => {
      simAccountValues.set(c.name, []);
      simAccountDied.set(c.name, false);
      simAccountDeathYear.set(c.name, -1);
    });

    // Initialize starting values
    let portfolioTotal = 0;
    consolidated.forEach(c => {
      simAccountValues.get(c.name)!.push(c.initialValue);
      portfolioTotal += c.initialValue;
    });
    portfolioValues.push(portfolioTotal);

    // Simulate each year
    for (let yearIdx = 1; yearIdx < years.length; yearIdx++) {
      const currentYear = years[yearIdx];
      portfolioTotal = 0;

      consolidated.forEach(c => {
        const accValues = simAccountValues.get(c.name)!;
        const accDied = simAccountDied.get(c.name)!;
        const prevValue = accValues[accValues.length - 1];

        // Check if this account is active in this year
        const isActive = currentYear >= c.startYear && currentYear <= c.endYear;

        if (accDied || !isActive) {
          // Account is dead or not yet started/ended
          accValues.push(isActive ? 0 : prevValue);
          portfolioTotal += isActive ? 0 : prevValue;
          return;
        }

        // Generate random return using GBM
        const mu = c.weightedReturn / 100;
        const Z = boxMullerRandom();
        const drift = mu - (sigma * sigma) / 2;
        const randomReturn = Math.exp(drift + sigma * Z);

        // Apply return and cash flow
        let newValue = prevValue * randomReturn + c.netAnnualCashFlow;

        // Check for death
        if (newValue <= 0) {
          newValue = 0;
          simAccountDied.set(c.name, true);
          simAccountDeathYear.set(c.name, currentYear);
        }

        accValues.push(newValue);
        portfolioTotal += newValue;
      });

      // Check portfolio death
      if (portfolioTotal <= 0 && !portfolioDied) {
        portfolioDied = true;
        portfolioDeathYear = currentYear;
      }

      portfolioValues.push(portfolioTotal);
    }

    // Store portfolio path
    portfolioPaths.push({
      values: portfolioValues,
      died: portfolioDied,
      deathYear: portfolioDeathYear,
      finalValue: portfolioValues[portfolioValues.length - 1],
    });

    // Store per-account paths
    consolidated.forEach(c => {
      const accValues = simAccountValues.get(c.name)!;
      accountPaths.get(c.name)!.push({
        values: accValues,
        died: simAccountDied.get(c.name)!,
        deathYear: simAccountDeathYear.get(c.name)!,
        finalValue: accValues[accValues.length - 1],
      });
    });
  }

  // Calculate portfolio percentiles
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

  // Calculate portfolio statistics
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
      min: finalValues[0],
      max: finalValues[finalValues.length - 1],
      percentile1: percentile(finalValues, 1),
      percentile10: percentile(finalValues, 10),
      percentile25: percentile(finalValues, 25),
      percentile50: percentile(finalValues, 50),
      percentile75: percentile(finalValues, 75),
      percentile90: percentile(finalValues, 90),
      percentile99: percentile(finalValues, 99),
    },
  };

  // Build per-account results
  consolidated.forEach(c => {
    const paths = accountPaths.get(c.name)!;
    const accFinalValues = paths.map(p => p.finalValue).sort((a, b) => a - b);
    const accSurvived = paths.filter(p => !p.died).length;

    const accPercentiles: Record<number, number[]> = {};
    for (const p of percentileKeys) {
      accPercentiles[p] = [];
    }

    for (let yearIdx = 0; yearIdx < years.length; yearIdx++) {
      const yearValues = paths.map(path => path.values[yearIdx]).sort((a, b) => a - b);
      for (const p of percentileKeys) {
        accPercentiles[p].push(percentile(yearValues, p));
      }
    }

    accountResults.set(c.name, {
      paths,
      years,
      percentiles: accPercentiles,
      stats: {
        survivedCount: accSurvived,
        totalCount: numSimulations,
        survivalRate: (accSurvived / numSimulations) * 100,
        finalValues: {
          mean: accFinalValues.reduce((a, b) => a + b, 0) / accFinalValues.length,
          median: percentile(accFinalValues, 50),
          stdDev: standardDeviation(accFinalValues),
          min: accFinalValues[0] || 0,
          max: accFinalValues[accFinalValues.length - 1] || 0,
          percentile1: percentile(accFinalValues, 1),
          percentile10: percentile(accFinalValues, 10),
          percentile25: percentile(accFinalValues, 25),
          percentile50: percentile(accFinalValues, 50),
          percentile75: percentile(accFinalValues, 75),
          percentile90: percentile(accFinalValues, 90),
          percentile99: percentile(accFinalValues, 99),
        },
      },
    });
  });

  return {
    paths: portfolioPaths,
    years,
    percentiles,
    stats,
    accountResults,
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
