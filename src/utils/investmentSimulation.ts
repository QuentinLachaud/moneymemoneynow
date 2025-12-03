/**
 * investmentSimulation.ts — Monte Carlo and deterministic investment projection utilities
 * 
 * Core functions for simulating asset growth over time with:
 * - Geometric Brownian Motion (GBM) for stochastic paths
 * - Deterministic compounding for zero-volatility assets
 * - Support for lump sum and monthly contribution modes
 */

/** Supported currencies */
export type Currency = 'USD' | 'GBP' | 'EUR' | 'JPY' | 'INR' | 'CHF' | 'CAD' | 'AUD';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  JPY: '¥',
  INR: '₹',
  CHF: 'Fr',
  CAD: 'C$',
  AUD: 'A$',
};

/** Asset type identifiers */
export type AssetTypeId = 
  | 'cash'
  | 'savings'
  | 'bonds'
  | 'index-fund'
  | 'pension'
  | 'car'
  | 'custom';

/** Investment mode */
export type InvestmentMode = 'lump-sum' | 'monthly';

/** Asset configuration */
export interface AssetConfig {
  id: AssetTypeId;
  name: string;
  color: string;
  expectedReturn: number;      // Annual return as decimal (0.07 = 7%)
  volatility: number;          // Annual volatility as decimal (0.15 = 15%)
  fee: number;                 // Annual fee as decimal (0.003 = 0.3%)
  isInflationSensitive?: boolean;
  isDepreciating?: boolean;
  isHistorical?: boolean;      // Uses historical defaults
  customOverride?: boolean;    // User has overridden defaults
}

/** Cash-specific configuration */
export interface CashConfig extends AssetConfig {
  applyInflation: boolean;
  inflationRate: number;       // As decimal (0.03 = 3%)
}

/** Pension-specific configuration */
export interface PensionConfig extends AssetConfig {
  marginalTaxRate: number;     // As decimal (0.45 = 45%)
}

/** Time point in simulation */
export interface TimePoint {
  year: number;
  month: number;
  totalMonths: number;
}

/** Single simulation path */
export interface SimulationPath {
  assetId: AssetTypeId;
  values: number[];            // Value at each time point
}

/** Simulation result with statistics */
export interface SimulationResult {
  assetId: AssetTypeId;
  timePoints: TimePoint[];
  paths: number[][];           // All Monte Carlo paths
  medianPath: number[];
  p10Path: number[];           // 10th percentile
  p90Path: number[];           // 90th percentile
  finalValue: number;          // Median final value
  totalContributed: number;    // Total amount invested (gross, includes tax relief for pensions)
  netContributed: number;      // Net amount paid by the user (excludes tax relief)
  totalTaxRelief: number;      // Tax relief amount included in totalContributed (if any)
}

/** Default asset configurations */
export const DEFAULT_ASSETS: Record<AssetTypeId, AssetConfig> = {
  cash: {
    id: 'cash',
    name: 'Cash',
    color: '#22c55e', // Green
    expectedReturn: 0,
    volatility: 0,
    fee: 0,
    isInflationSensitive: true,
  },
  savings: {
    id: 'savings',
    name: 'Savings Account',
    color: '#14b8a6', // Teal
    expectedReturn: 0.04, // 4%
    volatility: 0,
    fee: 0,
  },
  bonds: {
    id: 'bonds',
    name: 'Government Bonds',
    color: '#3b82f6', // Blue
    expectedReturn: 0.03, // 3%
    volatility: 0.05, // 5%
    fee: 0.002, // 0.2%
    isHistorical: true,
  },
  'index-fund': {
    id: 'index-fund',
    name: 'Global Index Fund',
    color: '#eab308', // Yellow
    expectedReturn: 0.07, // 7%
    volatility: 0.15, // 15% (will use global preset)
    fee: 0.002, // 0.2%
    isHistorical: true,
  },
  pension: {
    id: 'pension',
    name: 'Pension',
    color: '#a855f7', // Purple
    expectedReturn: 0.07, // Same as index fund
    volatility: 0.15,
    fee: 0.005, // 0.5%
  },
  car: {
    id: 'car',
    name: 'Car',
    color: '#6b7280', // Grey
    expectedReturn: -0.15, // -15% depreciation
    volatility: 0.05,
    fee: 0,
    isDepreciating: true,
  },
  custom: {
    id: 'custom',
    name: 'Custom Asset',
    color: '#f97316', // Orange
    expectedReturn: 0.05,
    volatility: 0.10,
    fee: 0,
  },
};

/**
 * Generate time points for simulation
 */
export function generateTimePoints(horizonYears: number): TimePoint[] {
  const points: TimePoint[] = [];
  const totalMonths = horizonYears * 12;
  
  for (let m = 0; m <= totalMonths; m++) {
    points.push({
      year: Math.floor(m / 12),
      month: m % 12,
      totalMonths: m,
    });
  }
  
  return points;
}

/**
 * Box-Muller transform for generating standard normal random numbers
 */
function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Simulate a single GBM path for an asset
 * Uses monthly timesteps with annual parameters converted
 */
function simulateSinglePath(
  initialValue: number,
  monthlyContribution: number,
  annualReturn: number,
  annualVolatility: number,
  annualFee: number,
  totalMonths: number,
): number[] {
  const values: number[] = [initialValue];
  const dt = 1 / 12; // Monthly timestep
  
  // Convert annual params to monthly
  const monthlyReturn = annualReturn / 12;
  const monthlyFee = annualFee / 12;
  const monthlyVol = annualVolatility / Math.sqrt(12);
  
  // Net monthly drift
  const drift = monthlyReturn - monthlyFee - 0.5 * monthlyVol * monthlyVol;
  
  let currentValue = initialValue;
  
  for (let m = 1; m <= totalMonths; m++) {
    // GBM step: S(t+dt) = S(t) * exp((μ - σ²/2)dt + σ√dt * Z)
    const randomShock = randomNormal();
    const growthFactor = Math.exp(drift * dt + monthlyVol * Math.sqrt(dt) * randomShock);
    
    // Apply growth to existing value
    currentValue = currentValue * growthFactor;
    
    // Add monthly contribution (at start of month)
    currentValue += monthlyContribution;
    
    values.push(Math.max(0, currentValue));
  }
  
  return values;
}

/**
 * Simulate deterministic path (zero volatility)
 */
function simulateDeterministicPath(
  initialValue: number,
  monthlyContribution: number,
  annualReturn: number,
  annualFee: number,
  totalMonths: number,
): number[] {
  const values: number[] = [initialValue];
  const monthlyRate = (annualReturn - annualFee) / 12;
  
  let currentValue = initialValue;
  
  for (let m = 1; m <= totalMonths; m++) {
    currentValue = currentValue * (1 + monthlyRate) + monthlyContribution;
    values.push(Math.max(0, currentValue));
  }
  
  return values;
}

/**
 * Simulate cash with optional inflation decay
 */
function simulateCashPath(
  initialValue: number,
  monthlyContribution: number,
  totalMonths: number,
  applyInflation: boolean,
  annualInflation: number,
): number[] {
  const values: number[] = [initialValue];
  const monthlyInflation = applyInflation ? annualInflation / 12 : 0;
  
  let nominalValue = initialValue;
  
  for (let m = 1; m <= totalMonths; m++) {
    nominalValue += monthlyContribution;
    // Show real value loss due to inflation
    const realValue = nominalValue * Math.pow(1 - monthlyInflation, m);
    values.push(applyInflation ? realValue : nominalValue);
  }
  
  return values;
}

/**
 * Simulate a single GBM path with contribution escalation
 * Monthly contribution increases by escalationRate% each year
 */
function simulateSinglePathWithEscalation(
  initialValue: number,
  monthlyContribution: number,
  annualReturn: number,
  annualVolatility: number,
  annualFee: number,
  totalMonths: number,
  escalationRate: number = 0,
): number[] {
  const values: number[] = [initialValue];
  const dt = 1 / 12;
  
  const monthlyReturn = annualReturn / 12;
  const monthlyFee = annualFee / 12;
  const monthlyVol = annualVolatility / Math.sqrt(12);
  const drift = monthlyReturn - monthlyFee - 0.5 * monthlyVol * monthlyVol;
  
  let currentValue = initialValue;
  
  for (let m = 1; m <= totalMonths; m++) {
    const randomShock = randomNormal();
    const growthFactor = Math.exp(drift * dt + monthlyVol * Math.sqrt(dt) * randomShock);
    
    currentValue = currentValue * growthFactor;
    
    // Calculate escalated contribution for this month
    const yearOfMonth = Math.floor((m - 1) / 12);
    const escalatedContribution = monthlyContribution * Math.pow(1 + escalationRate, yearOfMonth);
    currentValue += escalatedContribution;
    
    values.push(Math.max(0, currentValue));
  }
  
  return values;
}

/**
 * Simulate deterministic path with contribution escalation
 */
function simulateDeterministicPathWithEscalation(
  initialValue: number,
  monthlyContribution: number,
  annualReturn: number,
  annualFee: number,
  totalMonths: number,
  escalationRate: number = 0,
): number[] {
  const values: number[] = [initialValue];
  const monthlyRate = (annualReturn - annualFee) / 12;
  
  let currentValue = initialValue;
  
  for (let m = 1; m <= totalMonths; m++) {
    currentValue = currentValue * (1 + monthlyRate);
    
    // Calculate escalated contribution for this month
    const yearOfMonth = Math.floor((m - 1) / 12);
    const escalatedContribution = monthlyContribution * Math.pow(1 + escalationRate, yearOfMonth);
    currentValue += escalatedContribution;
    
    values.push(Math.max(0, currentValue));
  }
  
  return values;
}

/**
 * Simulate cash with optional inflation decay and contribution escalation
 */
function simulateCashPathWithEscalation(
  initialValue: number,
  monthlyContribution: number,
  totalMonths: number,
  applyInflation: boolean,
  annualInflation: number,
  escalationRate: number = 0,
): number[] {
  const values: number[] = [initialValue];
  const monthlyInflation = applyInflation ? annualInflation / 12 : 0;
  
  let nominalValue = initialValue;
  
  for (let m = 1; m <= totalMonths; m++) {
    // Calculate escalated contribution for this month
    const yearOfMonth = Math.floor((m - 1) / 12);
    const escalatedContribution = monthlyContribution * Math.pow(1 + escalationRate, yearOfMonth);
    nominalValue += escalatedContribution;
    
    // Show real value loss due to inflation
    const realValue = nominalValue * Math.pow(1 - monthlyInflation, m);
    values.push(applyInflation ? realValue : nominalValue);
  }
  
  return values;
}

/**
 * Simulate a pension path where monthly contributions are specified as net (user-paid)
 * and the pension receives tax relief immediately. Each month we add the gross amount
 * (net + relief) after applying growth for the month. Escalation applies to the net amount
 * and the relief scales proportionally.
 */
function simulatePensionPathWithEscalation(
  initialNetValue: number,
  monthlyNetContribution: number,
  marginalTaxRate: number,
  annualReturn: number,
  annualVolatility: number,
  annualFee: number,
  totalMonths: number,
  escalationRate: number = 0,
): number[] {
  // Start by grossing up the initial net (if any)
  const grossInitial = initialNetValue && initialNetValue > 0 ? initialNetValue / (1 - marginalTaxRate) : 0;
  const values: number[] = [grossInitial];
  const dt = 1 / 12;

  // Use annual parameters when converting to monthly GBM steps.
  // Drift should be (annualReturn - annualFee - 0.5 * vol^2), then multiplied by dt.
  const vol = annualVolatility;
  const drift = annualReturn - annualFee - 0.5 * vol * vol;

  let currentValue = grossInitial;
  let yearNetAccumulator = 0; // accumulate net contributions within the year

  for (let m = 1; m <= totalMonths; m++) {
    const randomShock = randomNormal();
    const growthFactor = Math.exp(drift * dt + vol * Math.sqrt(dt) * randomShock);

    // Apply growth to existing value
    currentValue = currentValue * growthFactor;

    // Calculate escalated net contribution for this month
    const yearOfMonth = Math.floor((m - 1) / 12);
    const escalatedNet = monthlyNetContribution * Math.pow(1 + escalationRate, yearOfMonth);

    // Add the net portion now
    currentValue += escalatedNet;
    yearNetAccumulator += escalatedNet;

    // At the end of each year, apply the tax relief lump-sum for the year's contributions
    if (m % 12 === 0 && yearNetAccumulator > 0) {
      const relief = yearNetAccumulator * (marginalTaxRate / (1 - marginalTaxRate));
      currentValue += relief;
      yearNetAccumulator = 0;
    }

    values.push(Math.max(0, currentValue));
  }

  return values;
}

/**
 * Compute percentile from array of values
 */
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

/**
 * Compute median path from multiple simulation paths
 */
function computeMedianPath(paths: number[][]): number[] {
  if (paths.length === 0) return [];
  
  const numPoints = paths[0].length;
  const medianPath: number[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    const valuesAtPoint = paths.map(p => p[i]);
    medianPath.push(percentile(valuesAtPoint, 50));
  }
  
  return medianPath;
}

/**
 * Compute percentile path
 */
function computePercentilePath(paths: number[][], p: number): number[] {
  if (paths.length === 0) return [];
  
  const numPoints = paths[0].length;
  const result: number[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    const valuesAtPoint = paths.map(path => path[i]);
    result.push(percentile(valuesAtPoint, p));
  }
  
  return result;
}

/**
 * Main simulation function for a single asset
 * 
 * Supports:
 * - Combined lump sum + monthly contributions
 * - Annual contribution escalation (monthly amount grows by escalation % each year)
 * - Per-asset volatility (no global override)
 */
export function simulateAsset(
  config: AssetConfig,
  mode: InvestmentMode,
  initialAmount: number,
  monthlyAmount: number,
  horizonYears: number,
  numPaths: number = 500,
  globalVolatility?: number,
  cashConfig?: { applyInflation: boolean; inflationRate: number },
  pensionConfig?: { marginalTaxRate: number },
  escalationRate: number = 0, // Annual % increase in monthly contributions
): SimulationResult {
  const timePoints = generateTimePoints(horizonYears);
  const totalMonths = horizonYears * 12;
  
  // Combined mode: always use both lump sum and monthly
  // (For backwards compatibility, if mode is 'monthly' we set initial to 0)
  let effectiveInitial = initialAmount;
  let effectiveMonthly = monthlyAmount;
  
  // For pension we'll handle grossing and per-period additions explicitly below
  
  // Calculate total contributed with escalation
  let totalContributed = effectiveInitial;
  for (let m = 1; m <= totalMonths; m++) {
    const yearOfMonth = Math.floor((m - 1) / 12);
    const escalatedMonthly = effectiveMonthly * Math.pow(1 + escalationRate, yearOfMonth);
    totalContributed += escalatedMonthly;
  }

  // Compute netContributed and tax relief breakdown (defaults)
  let netContributed = totalContributed;
  let totalTaxRelief = 0;
  
  // Each asset uses its own volatility unless a global override is provided (used by InvestmentOutcomesTab to disable volatility)
  const effectiveVolatility = (globalVolatility !== undefined) ? globalVolatility : config.volatility;
  
  let paths: number[][];
  
  // Cash uses special inflation-aware simulation
  if (config.id === 'cash' && cashConfig) {
    const path = simulateCashPathWithEscalation(
      effectiveInitial,
      effectiveMonthly,
      totalMonths,
      cashConfig.applyInflation,
      cashConfig.inflationRate,
      escalationRate,
    );
    paths = [path];
  }
  // Pension: simulate taking net monthly sacrifice and applying immediate tax relief
  else if (config.id === 'pension' && pensionConfig) {
    // Compute gross initial (if any) from net initial
    const netInitial = initialAmount && initialAmount > 0 ? initialAmount : 0;
    const grossInitial = netInitial > 0 ? netInitial / (1 - pensionConfig.marginalTaxRate) : 0;

    // Recalculate totalContributed/netContributed/totalTaxRelief precisely from escalation and the global monthly amount
    let recomputedTotalContributed = grossInitial;
    let recomputedNetContributed = netInitial;
    for (let m = 1; m <= totalMonths; m++) {
      const yearOfMonth = Math.floor((m - 1) / 12);
      const escalatedNetMonthly = effectiveMonthly * Math.pow(1 + escalationRate, yearOfMonth);
      const escalatedGrossMonthly = escalatedNetMonthly / (1 - pensionConfig.marginalTaxRate);
      recomputedNetContributed += escalatedNetMonthly;
      recomputedTotalContributed += escalatedGrossMonthly;
    }

    totalContributed = recomputedTotalContributed;
    netContributed = recomputedNetContributed;
    totalTaxRelief = totalContributed - netContributed;

    const effectiveVol = effectiveVolatility;

    if (effectiveVol === 0 || numPaths === 1) {
      const path = simulatePensionPathWithEscalation(
        netInitial,
        effectiveMonthly,
        pensionConfig.marginalTaxRate,
        config.expectedReturn,
        effectiveVol,
        config.fee,
        totalMonths,
        escalationRate,
      );
      paths = [path];
    } else {
      paths = [];
      for (let i = 0; i < numPaths; i++) {
        const path = simulatePensionPathWithEscalation(
          netInitial,
          effectiveMonthly,
          pensionConfig.marginalTaxRate,
          config.expectedReturn,
          effectiveVol,
          config.fee,
          totalMonths,
          escalationRate,
        );
        paths.push(path);
      }
    }
  }
  // Deterministic path for zero-volatility assets
  else if (effectiveVolatility === 0 || numPaths === 1) {
    const path = simulateDeterministicPathWithEscalation(
      effectiveInitial,
      effectiveMonthly,
      config.expectedReturn,
      config.fee,
      totalMonths,
      escalationRate,
    );
    paths = [path];
  }
  // Monte Carlo simulation for volatile assets
  else {
    paths = [];
    for (let i = 0; i < numPaths; i++) {
      const path = simulateSinglePathWithEscalation(
        effectiveInitial,
        effectiveMonthly,
        config.expectedReturn,
        effectiveVolatility,
        config.fee,
        totalMonths,
        escalationRate,
      );
      paths.push(path);
    }
  }
  
  const medianPath = computeMedianPath(paths);
  const p10Path = computePercentilePath(paths, 10);
  const p90Path = computePercentilePath(paths, 90);
  
  return {
    assetId: config.id,
    timePoints,
    paths,
    medianPath,
    p10Path,
    p90Path,
    finalValue: medianPath[medianPath.length - 1],
    totalContributed,
    netContributed,
    totalTaxRelief,
  };
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const absValue = Math.abs(value);
  
  // Format with appropriate precision
  let formatted: string;
  if (absValue >= 1_000_000) {
    formatted = `${(absValue / 1_000_000).toFixed(2)}M`;
  } else if (absValue >= 1_000) {
    formatted = `${(absValue / 1_000).toFixed(1)}K`;
  } else {
    formatted = absValue.toFixed(0);
  }
  
  return value < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Calculate gross pension contribution from net sacrifice
 */
export function calculateGrossPension(netSacrifice: number, marginalTaxRate: number): number {
  return netSacrifice / (1 - marginalTaxRate);
}
