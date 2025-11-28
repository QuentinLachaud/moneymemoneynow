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
  /** Net initial value (sum of all deposits at their start) */
  initialValue: number;
  /** Weighted average expected return (used for gap periods) */
  weightedReturn: number;
  /** Weighted average volatility (used for gap periods) */
  weightedVolatility: number;
  /** Start year (earliest account) */
  startYear: number;
  /** End year (latest end date) */
  endYear: number;
  /** 
   * Per-year cash flow data: maps year -> net cash flow for that year
   * Years not in this map are "gap years" where returns apply but no cash flow
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
    // For deposits: use the amount field (current balance)
    // For drawdowns: also use the amount field (starting value for that drawdown)
    // This allows drawdowns to have a "pot" they draw from
    const initialValue = accs.reduce((sum, a) => sum + (a.amount || 0), 0);
    
    // Date range - from earliest start to latest end
    const startYear = Math.min(...accs.map(a => new Date(a.date).getFullYear()));
    const endYear = Math.max(...accs.map(a => new Date(a.date).getFullYear() + a.timeHorizon));
    
    // Build yearly data map
    const yearlyData = new Map<number, YearlyAccountData>();
    
    // Calculate weighted return and volatility for gap periods
    // Weight by amount (initial value contribution)
    const accountsWithAmount = accs.filter(a => a.amount > 0);
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
          
          // Calculate annual cash flow contribution
          // IMPORTANT: Deposits ADD to the pot, withdrawals SUBTRACT from it
          const annualAmount = acc.frequency === 'monthly' 
            ? acc.transactionAmount * 12 
            : acc.transactionAmount;
          const signedAmount = acc.transactionType === 'withdraw' ? -annualAmount : annualAmount;
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
 * @param accounts - All accounts to simulate
 * @param numSimulations - Number of simulation paths
 * @param globalVolatilityOverride - Default volatility override for all assets (0-100%)
 * @param assetVolatilityOverrides - Per-asset volatility overrides (asset name -> 0-100%)
 * @param projectionYears - Override projection length (years from start). If undefined, uses account end dates.
 */
export function runPortfolioMonteCarloSimulation(
  accounts: Account[],
  numSimulations: number,
  globalVolatilityOverride?: number,
  assetVolatilityOverrides?: Map<string, number | null>,
  projectionYears?: number
): PortfolioSimulationResult {
  if (accounts.length === 0) {
    return createEmptyResult();
  }

  // Consolidate same-name accounts
  const consolidated = consolidateAccounts(accounts);
  
  // Determine simulation time range
  const startYear = Math.min(...consolidated.map(c => c.startYear));
  // Use projectionYears override if provided, otherwise use natural end dates
  const naturalEndYear = Math.max(...consolidated.map(c => c.endYear));
  const endYear = projectionYears !== undefined 
    ? startYear + projectionYears 
    : naturalEndYear;
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }

  // Build per-asset volatility map
  // Priority: asset-specific override > global override > default 15%
  const defaultSigma = globalVolatilityOverride !== undefined 
    ? globalVolatilityOverride / 100 
    : 0.15; // Default 15%

  const assetVolatility = new Map<string, number>();
  consolidated.forEach(c => {
    const key = c.name.toLowerCase().trim();
    const assetOverride = assetVolatilityOverrides?.get(key);
    if (assetOverride !== undefined && assetOverride !== null) {
      assetVolatility.set(c.name, assetOverride / 100);
    } else {
      assetVolatility.set(c.name, defaultSigma);
    }
  });

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

        // Account is dead - stays at 0
        if (accDied) {
          accValues.push(0);
          return;
        }

        // Before account starts - value is 0
        if (currentYear < c.startYear) {
          accValues.push(0);
          return;
        }

        // Get year-specific data (or use defaults for gap years after account range)
        const yearData = c.yearlyData.get(currentYear);
        
        // Determine return and cash flow for this year
        // Key insight: even in gap years or after explicit horizon, 
        // the asset continues to grow with returns (just no new cash flow)
        const mu = yearData 
          ? yearData.expectedReturn / 100 
          : c.weightedReturn / 100;
        const cashFlow = yearData ? yearData.netCashFlow : 0;

        // Get volatility for this specific asset
        const sigma = assetVolatility.get(c.name) ?? defaultSigma;

        // Generate random return using GBM
        const Z = boxMullerRandom();
        const drift = mu - (sigma * sigma) / 2;
        const randomReturn = Math.exp(drift + sigma * Z);

        // Apply return and cash flow
        let newValue = prevValue * randomReturn + cashFlow;

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
