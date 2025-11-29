/**
 * UK Tax Calculator Utilities
 * 
 * Provides accurate tax calculations for UK income tax and National Insurance
 * for both England/Wales/NI and Scotland tax regimes (2024/2025 tax year).
 * 
 * References:
 * - https://www.gov.uk/income-tax-rates
 * - https://www.gov.uk/scottish-income-tax
 * - https://www.gov.uk/national-insurance
 */

export type TaxRegion = 'england' | 'scotland';

export interface TaxBand {
  name: string;
  min: number;
  max: number | null;
  rate: number;
  taxDue?: number;
  incomeInBand?: number;
}

export interface NIBand {
  name: string;
  min: number;
  max: number | null;
  rate: number;
  niDue?: number;
  incomeInBand?: number;
}

export interface TaxCalculationResult {
  grossSalary: number;
  taxableIncome: number;
  totalTax: number;
  totalNI: number;
  netPay: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
  taxBands: TaxBand[];
  niBands: NIBand[];
  pensionContribution: number;
  employerPension: number;
  pensionTaxSaved: number;
  pensionNISaved: number;
  // Monthly equivalents
  monthlyGross: number;
  monthlyTax: number;
  monthlyNI: number;
  monthlyNet: number;
  monthlyPension: number;
}

// England/Wales/NI tax bands 2024/2025
const ENGLAND_TAX_BANDS: TaxBand[] = [
  { name: 'Personal Allowance', min: 0, max: 12570, rate: 0 },
  { name: 'Basic Rate', min: 12570, max: 50270, rate: 20 },
  { name: 'Higher Rate', min: 50270, max: 125140, rate: 40 },
  { name: 'Additional Rate', min: 125140, max: null, rate: 45 },
];

// Scotland tax bands 2024/2025
const SCOTLAND_TAX_BANDS: TaxBand[] = [
  { name: 'Personal Allowance', min: 0, max: 12570, rate: 0 },
  { name: 'Starter Rate', min: 12570, max: 14876, rate: 19 },
  { name: 'Basic Rate', min: 14876, max: 26561, rate: 20 },
  { name: 'Intermediate Rate', min: 26561, max: 43662, rate: 21 },
  { name: 'Higher Rate', min: 43662, max: 75000, rate: 42 },
  { name: 'Advanced Rate', min: 75000, max: 125140, rate: 45 },
  { name: 'Top Rate', min: 125140, max: null, rate: 48 },
];

// National Insurance bands 2024/2025 (same for all UK)
const NI_BANDS: NIBand[] = [
  { name: 'Below Primary Threshold', min: 0, max: 12570, rate: 0 },
  { name: 'Primary Rate', min: 12570, max: 50270, rate: 8 },
  { name: 'Upper Rate', min: 50270, max: null, rate: 2 },
];

// Personal allowance taper threshold
const PERSONAL_ALLOWANCE = 12570;
const PERSONAL_ALLOWANCE_TAPER_THRESHOLD = 100000;

/**
 * Calculate adjusted personal allowance (tapered for high earners)
 */
function calculatePersonalAllowance(grossSalary: number, pensionContribution: number): number {
  const adjustedIncome = grossSalary - pensionContribution;
  
  if (adjustedIncome <= PERSONAL_ALLOWANCE_TAPER_THRESHOLD) {
    return PERSONAL_ALLOWANCE;
  }
  
  const excessIncome = adjustedIncome - PERSONAL_ALLOWANCE_TAPER_THRESHOLD;
  const reduction = Math.floor(excessIncome / 2);
  return Math.max(0, PERSONAL_ALLOWANCE - reduction);
}

/**
 * Calculate income tax for a given salary and region
 */
export function calculateIncomeTax(
  grossSalary: number,
  region: TaxRegion,
  pensionContributionPercent: number = 0
): TaxCalculationResult {
  // Calculate pension contribution
  const pensionContribution = (grossSalary * pensionContributionPercent) / 100;
  const taxableIncomeBeforeAllowance = grossSalary - pensionContribution;
  
  // Get adjusted personal allowance
  const personalAllowance = calculatePersonalAllowance(grossSalary, pensionContribution);
  
  // Select appropriate tax bands and adjust for personal allowance
  const baseBands = region === 'scotland' ? SCOTLAND_TAX_BANDS : ENGLAND_TAX_BANDS;
  
  // Adjust bands based on personal allowance
  const taxBands: TaxBand[] = baseBands.map((band, index) => {
    if (index === 0) {
      return { ...band, max: personalAllowance };
    }
    // Adjust subsequent bands based on personal allowance
    const diff = PERSONAL_ALLOWANCE - personalAllowance;
    return {
      ...band,
      min: Math.max(0, band.min - diff),
      max: band.max ? Math.max(0, band.max - diff) : null,
    };
  });
  
  // Calculate tax for each band
  let totalTax = 0;
  let remainingIncome = taxableIncomeBeforeAllowance;
  
  const calculatedBands = taxBands.map(band => {
    const bandWidth = band.max !== null ? band.max - band.min : Infinity;
    const incomeInBand = Math.min(Math.max(0, remainingIncome - band.min), bandWidth);
    const taxDue = (incomeInBand * band.rate) / 100;
    
    remainingIncome = Math.max(0, remainingIncome - incomeInBand);
    totalTax += taxDue;
    
    return {
      ...band,
      incomeInBand,
      taxDue,
    };
  }).filter(band => band.incomeInBand > 0 || band.rate === 0);
  
  // Calculate National Insurance
  let totalNI = 0;
  remainingIncome = grossSalary - pensionContribution; // NI is on salary minus pension
  
  const calculatedNIBands = NI_BANDS.map(band => {
    const bandWidth = band.max !== null ? band.max - band.min : Infinity;
    const incomeInBand = Math.min(Math.max(0, remainingIncome - band.min), bandWidth);
    const niDue = (incomeInBand * band.rate) / 100;
    
    remainingIncome = Math.max(0, remainingIncome - incomeInBand);
    totalNI += niDue;
    
    return {
      ...band,
      incomeInBand,
      niDue,
    };
  }).filter(band => band.incomeInBand > 0 || band.rate === 0);
  
  // Calculate pension tax and NI savings
  const taxWithoutPension = calculateTaxOnly(grossSalary, region, 0);
  const niWithoutPension = calculateNIOnly(grossSalary, 0);
  const pensionTaxSaved = taxWithoutPension - totalTax;
  const pensionNISaved = niWithoutPension - totalNI;
  
  // Net pay
  const netPay = grossSalary - totalTax - totalNI - pensionContribution;
  
  // Calculate marginal rate (for next £1 earned)
  const marginalBand = calculatedBands.find(b => 
    b.max === null || taxableIncomeBeforeAllowance < b.max
  );
  const marginalTaxRate = marginalBand ? marginalBand.rate : 0;
  
  return {
    grossSalary,
    taxableIncome: Math.max(0, taxableIncomeBeforeAllowance - personalAllowance),
    totalTax,
    totalNI,
    netPay,
    effectiveTaxRate: grossSalary > 0 ? ((totalTax + totalNI) / grossSalary) * 100 : 0,
    marginalTaxRate,
    taxBands: calculatedBands,
    niBands: calculatedNIBands,
    pensionContribution,
    employerPension: 0, // Will be calculated separately if needed
    pensionTaxSaved,
    pensionNISaved,
    // Monthly
    monthlyGross: grossSalary / 12,
    monthlyTax: totalTax / 12,
    monthlyNI: totalNI / 12,
    monthlyNet: netPay / 12,
    monthlyPension: pensionContribution / 12,
  };
}

/**
 * Calculate tax only (helper function)
 */
function calculateTaxOnly(grossSalary: number, region: TaxRegion, pensionPercent: number): number {
  const pensionContribution = (grossSalary * pensionPercent) / 100;
  const taxableIncome = grossSalary - pensionContribution;
  const personalAllowance = calculatePersonalAllowance(grossSalary, pensionContribution);
  
  const bands = region === 'scotland' ? SCOTLAND_TAX_BANDS : ENGLAND_TAX_BANDS;
  let totalTax = 0;
  let remainingIncome = taxableIncome;
  
  bands.forEach((band, index) => {
    const adjustedMin = index === 0 ? 0 : Math.max(0, band.min - (PERSONAL_ALLOWANCE - personalAllowance));
    const adjustedMax = band.max ? Math.max(0, band.max - (PERSONAL_ALLOWANCE - personalAllowance)) : Infinity;
    const bandWidth = adjustedMax - adjustedMin;
    const incomeInBand = Math.min(Math.max(0, remainingIncome - adjustedMin), bandWidth);
    totalTax += (incomeInBand * band.rate) / 100;
    remainingIncome = Math.max(0, remainingIncome - incomeInBand);
  });
  
  return totalTax;
}

/**
 * Calculate NI only (helper function)
 */
function calculateNIOnly(grossSalary: number, pensionPercent: number): number {
  const pensionContribution = (grossSalary * pensionPercent) / 100;
  const niableIncome = grossSalary - pensionContribution;
  
  let totalNI = 0;
  let remainingIncome = niableIncome;
  
  NI_BANDS.forEach(band => {
    const bandWidth = band.max !== null ? band.max - band.min : Infinity;
    const incomeInBand = Math.min(Math.max(0, remainingIncome - band.min), bandWidth);
    totalNI += (incomeInBand * band.rate) / 100;
    remainingIncome = Math.max(0, remainingIncome - incomeInBand);
  });
  
  return totalNI;
}

/**
 * Calculate employer pension contribution
 */
export function calculateEmployerPension(
  grossSalary: number,
  employerContributionPercent: number,
  employerMatchPercent: number,
  employeeContributionPercent: number
): number {
  const baseContribution = (grossSalary * employerContributionPercent) / 100;
  const matchContribution = Math.min(
    (grossSalary * employerMatchPercent) / 100,
    (grossSalary * employeeContributionPercent) / 100
  );
  return baseContribution + matchContribution;
}

/**
 * Calculate compound growth of pension savings
 */
export function calculateCompoundGrowth(
  annualContribution: number,
  yearsToRetirement: number,
  growthRate: number = 7
): number {
  // Future value of annuity formula
  const r = growthRate / 100;
  if (r === 0) return annualContribution * yearsToRetirement;
  
  const fv = annualContribution * ((Math.pow(1 + r, yearsToRetirement) - 1) / r);
  return fv;
}

/**
 * Compare two tax scenarios (e.g., before/after raise or pension)
 */
export interface TaxComparison {
  baseline: TaxCalculationResult;
  scenario: TaxCalculationResult;
  differences: {
    grossSalary: number;
    totalTax: number;
    totalNI: number;
    netPay: number;
    effectiveTaxRate: number;
    pensionContribution: number;
    pensionTaxSaved: number;
    pensionNISaved: number;
  };
}

export function compareTaxScenarios(
  baseResult: TaxCalculationResult,
  scenarioResult: TaxCalculationResult
): TaxComparison {
  return {
    baseline: baseResult,
    scenario: scenarioResult,
    differences: {
      grossSalary: scenarioResult.grossSalary - baseResult.grossSalary,
      totalTax: scenarioResult.totalTax - baseResult.totalTax,
      totalNI: scenarioResult.totalNI - baseResult.totalNI,
      netPay: scenarioResult.netPay - baseResult.netPay,
      effectiveTaxRate: scenarioResult.effectiveTaxRate - baseResult.effectiveTaxRate,
      pensionContribution: scenarioResult.pensionContribution - baseResult.pensionContribution,
      pensionTaxSaved: scenarioResult.pensionTaxSaved - baseResult.pensionTaxSaved,
      pensionNISaved: scenarioResult.pensionNISaved - baseResult.pensionNISaved,
    },
  };
}

/**
 * Get tax bands for display (without calculation)
 */
export function getTaxBandsForDisplay(region: TaxRegion): TaxBand[] {
  return region === 'scotland' ? SCOTLAND_TAX_BANDS : ENGLAND_TAX_BANDS;
}

/**
 * Get NI bands for display
 */
export function getNIBandsForDisplay(): NIBand[] {
  return NI_BANDS;
}
