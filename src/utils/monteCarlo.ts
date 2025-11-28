/**
 * Monte Carlo Simulation Engine
 * 
 * Implements rigorous Monte Carlo simulation for financial projections
 * using Geometric Brownian Motion (GBM) - the industry standard for
 * modeling asset prices with drift and volatility.
 * 
 * Key formula: S(t+1) = S(t) * exp((μ - σ²/2)Δt + σ * √Δt * Z)
 * Where:
 *   S(t) = asset value at time t
 *   μ = expected annual return (drift)
 *   σ = annual volatility (standard deviation)
 *   Δt = time step (1 year)
 *   Z = standard normal random variable
 */

import { Account } from '../App';

export interface SimulationPath {
  /** Array of values for each year */
  values: number[];
  /** Whether the simulation "died" (went to zero and stayed there) */
  died: boolean;
  /** Year at which the simulation died (-1 if survived) */
  deathYear: number;
  /** Final value at end of time horizon */
  finalValue: number;
}

export interface SimulationResult {
  /** All simulation paths */
  paths: SimulationPath[];
  /** Years array for x-axis */
  years: number[];
  /** Percentile lines (key = percentile, value = array of values per year) */
  percentiles: Record<number, number[]>;
  /** Statistics */
  stats: SimulationStats;
}

export interface SimulationStats {
  /** Number of simulations that survived (never hit zero) */
  survivedCount: number;
  /** Total number of simulations */
  totalCount: number;
  /** Survival rate as percentage */
  survivalRate: number;
  /** Final value statistics */
  finalValues: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    percentile1: number;
    percentile10: number;
    percentile25: number;
    percentile50: number;
    percentile75: number;
    percentile90: number;
    percentile99: number;
  };
}

/**
 * Box-Muller transform to generate standard normal random variables
 * More accurate than simple approximations
 */
function boxMullerRandom(): number {
  let u1 = 0, u2 = 0;
  // Ensure we don't get exactly 0 (would cause log(0) = -Infinity)
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
  // Linear interpolation
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
 * Run Monte Carlo simulation for a single account
 * 
 * @param account - The account to simulate
 * @param numSimulations - Number of simulation paths (10, 100, 1000)
 * @param volatilityOverride - Optional volatility override (0-100%)
 */
export function runMonteCarloSimulation(
  account: Account,
  numSimulations: number,
  volatilityOverride?: number
): SimulationResult {
  const startYear = new Date(account.date).getFullYear();
  const endYear = startYear + account.timeHorizon;
  const years: number[] = [];
  
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }

  // Convert percentage returns to decimals
  const mu = account.expectedReturn / 100; // Annual expected return
  
  // Get volatility - either from override, account setting, or default
  let sigma: number;
  if (volatilityOverride !== undefined) {
    sigma = volatilityOverride / 100;
  } else if (account.volatility) {
    // Map volatility labels to percentages
    const volMap: Record<string, number> = {
      'low': 0.05,
      'medium': 0.15,
      'high': 0.25,
    };
    sigma = volMap[account.volatility] || 0.15;
  } else {
    sigma = 0; // No volatility = deterministic
  }

  // Calculate annual cash flow
  const annualCashFlow = account.frequency === 'monthly' 
    ? account.transactionAmount * 12 
    : account.transactionAmount;
  const cashFlowSign = account.transactionType === 'withdraw' ? -1 : 1;
  const signedCashFlow = annualCashFlow * cashFlowSign;

  // Run simulations
  const paths: SimulationPath[] = [];

  for (let sim = 0; sim < numSimulations; sim++) {
    const values: number[] = [account.amount]; // Start with initial amount
    let everDied = false; // Track if simulation ever hit zero
    let deathYear = -1;
    let currentValue = account.amount;

    for (let yearIdx = 1; yearIdx < years.length; yearIdx++) {
      // If simulation has already died, it stays dead (no resurrection)
      if (everDied) {
        values.push(0);
        continue;
      }

      // Generate random return using GBM
      // S(t+1) = S(t) * exp((μ - σ²/2) + σ * Z)
      const Z = boxMullerRandom();
      const drift = mu - (sigma * sigma) / 2;
      const randomReturn = Math.exp(drift + sigma * Z);
      
      // Apply return to current value
      let newValue = currentValue * randomReturn;
      
      // Add cash flow (deposit or withdrawal)
      newValue += signedCashFlow;

      // Check for death - once dead, always dead
      if (newValue <= 0) {
        newValue = 0;
        everDied = true;
        deathYear = years[yearIdx];
      }

      currentValue = newValue;
      values.push(currentValue);
    }

    paths.push({
      values,
      died: everDied,
      deathYear,
      finalValue: values[values.length - 1],
    });
  }

  // Calculate percentiles for each year
  const percentileKeys = [1, 10, 25, 50, 75, 90, 99];
  const percentiles: Record<number, number[]> = {};
  
  for (const p of percentileKeys) {
    percentiles[p] = [];
  }

  for (let yearIdx = 0; yearIdx < years.length; yearIdx++) {
    const yearValues = paths.map(path => path.values[yearIdx]).sort((a, b) => a - b);
    
    for (const p of percentileKeys) {
      percentiles[p].push(percentile(yearValues, p));
    }
  }

  // Calculate statistics
  const finalValues = paths.map(p => p.finalValue).sort((a, b) => a - b);
  const survivedCount = paths.filter(p => !p.died).length;

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

  return {
    paths,
    years,
    percentiles,
    stats,
  };
}

/**
 * Generate histogram bins from final values
 */
export function generateHistogramBins(
  finalValues: number[],
  numBins: number
): { binStart: number; binEnd: number; count: number; percentage: number }[] {
  if (finalValues.length === 0) return [];

  const sorted = [...finalValues].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  // Handle edge case where all values are the same
  if (min === max) {
    return [{
      binStart: min,
      binEnd: max,
      count: finalValues.length,
      percentage: 100,
    }];
  }

  const binWidth = (max - min) / numBins;
  const bins: { binStart: number; binEnd: number; count: number; percentage: number }[] = [];

  for (let i = 0; i < numBins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = min + (i + 1) * binWidth;
    const count = finalValues.filter(v => {
      if (i === numBins - 1) {
        // Last bin includes the max value
        return v >= binStart && v <= binEnd;
      }
      return v >= binStart && v < binEnd;
    }).length;

    bins.push({
      binStart,
      binEnd,
      count,
      percentage: (count / finalValues.length) * 100,
    });
  }

  return bins;
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `£${(value / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `£${(value / 1000).toFixed(1)}k`;
  }
  return `£${value.toFixed(0)}`;
}
