/**
 * savingsCalculations.ts — Pure calculation functions for Savings Calculator
 *
 * Handles:
 * - Monthly value normalization (annual → monthly)
 * - Category aggregation
 * - Subcategory support
 * - Custom section support
 * - Savings rate computation
 * - Waterfall chart data generation
 */

import { Currency, CURRENCY_SYMBOLS } from './investmentSimulation';

/** Subcategory structure (user-added items within a section) */
export interface Subcategory {
  id: string;
  name: string;
  amount: number;
}

/** Expenditure category structure */
export interface ExpenseCategory {
  id: string;
  label: string;
  amount: number;
  /** For vehicle items: 'annual' or 'monthly' */
  frequency?: 'annual' | 'monthly';
}

/** Expenditure section structure */
export interface ExpenseSection {
  id: string;
  title: string;
  icon: string;
  categories: ExpenseCategory[];
  /** User-added subcategories */
  subcategories?: Subcategory[];
  /** Whether this is a custom (user-created) section */
  isCustom?: boolean;
}

/** Default expenditure sections configuration */
export const DEFAULT_EXPENSE_SECTIONS: ExpenseSection[] = [
  {
    id: 'household',
    title: 'Household',
    icon: 'Home',
    categories: [
      { id: 'mortgage', label: 'Mortgage', amount: 0 },
      { id: 'rent', label: 'Rent', amount: 0 },
      { id: 'utilities', label: 'Utilities', amount: 0 },
      { id: 'energy', label: 'Energy', amount: 0 },
      { id: 'council-tax', label: 'Council Tax', amount: 0 },
      { id: 'home-insurance', label: 'Home Insurance', amount: 0 },
      { id: 'groceries', label: 'Groceries', amount: 0 },
    ],
  },
  {
    id: 'vehicle',
    title: 'Vehicle',
    icon: 'Car',
    categories: [
      { id: 'car-payment', label: 'Car Payment', amount: 0, frequency: 'monthly' },
      { id: 'car-insurance', label: 'Insurance', amount: 0, frequency: 'monthly' },
      { id: 'mot', label: 'MOT', amount: 0, frequency: 'annual' },
    ],
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    icon: 'Tv',
    categories: [
      { id: 'phone', label: 'Phone Contract', amount: 0 },
      { id: 'internet', label: 'Internet', amount: 0 },
      { id: 'spotify', label: 'Spotify', amount: 0 },
      { id: 'netflix', label: 'Netflix', amount: 0 },
      { id: 'amazon-prime', label: 'Amazon Prime', amount: 0 },
      { id: 'other-subs', label: 'Other', amount: 0 },
    ],
  },
  {
    id: 'childcare',
    title: 'Childcare',
    icon: 'Baby',
    categories: [
      { id: 'nursery', label: 'Nursery Costs', amount: 0 },
      { id: 'carer', label: 'Carer/Nanny Costs', amount: 0 },
      { id: 'school', label: 'School Costs', amount: 0 },
    ],
  },
  {
    id: 'investments',
    title: 'Investments',
    icon: 'TrendingUp',
    categories: [
      { id: 'cash-savings', label: 'Cash Savings', amount: 0 },
      { id: 'lisa', label: 'LISA', amount: 0 },
      { id: 'isa', label: 'ISA (Cash or S&S)', amount: 0 },
      { id: 'premium-bonds', label: 'Premium Bonds', amount: 0 },
    ],
  },
];

/**
 * Convert annual amount to monthly
 */
export function annualToMonthly(amount: number): number {
  return amount / 12;
}

/**
 * Get monthly value for a category (handles annual/monthly frequency)
 */
export function getMonthlyValue(category: ExpenseCategory): number {
  if (category.frequency === 'annual') {
    return annualToMonthly(category.amount);
  }
  return category.amount;
}

/**
 * Calculate subcategories total for a section
 */
export function calculateSubcategoriesTotal(subcategories?: Subcategory[]): number {
  if (!subcategories || subcategories.length === 0) return 0;
  return subcategories.reduce((sum, sub) => sum + sub.amount, 0);
}

/**
 * Calculate total for a section (all categories + subcategories summed as monthly)
 */
export function calculateSectionTotal(section: ExpenseSection): number {
  const categoriesTotal = section.categories.reduce((sum, cat) => sum + getMonthlyValue(cat), 0);
  const subcategoriesTotal = calculateSubcategoriesTotal(section.subcategories);
  return categoriesTotal + subcategoriesTotal;
}

/**
 * Calculate total outgoings across all sections
 */
export function calculateTotalOutgoings(sections: ExpenseSection[]): number {
  return sections.reduce((sum, section) => sum + calculateSectionTotal(section), 0);
}

/**
 * Calculate monthly savings
 */
export function calculateMonthlySavings(income: number, outgoings: number): number {
  return income - outgoings;
}

/**
 * Calculate savings rate as a decimal (0.0 - 1.0+)
 */
export function calculateSavingsRate(savings: number, income: number): number {
  if (income === 0) return 0;
  return savings / income;
}

/**
 * Format savings rate as a friendly percentage string
 */
export function formatSavingsRate(rate: number): string {
  const percentage = rate * 100;
  if (percentage < 0) {
    return `${percentage.toFixed(1)}%`;
  }
  return `${percentage.toFixed(1)}%`;
}

/**
 * Get savings rate sentiment color
 */
export function getSavingsRateColor(rate: number): string {
  if (rate >= 0.20) return '#22c55e'; // Green: Excellent
  if (rate >= 0.10) return '#eab308'; // Yellow: Good
  if (rate >= 0) return '#f97316';    // Orange: Needs work
  return '#ef4444';                    // Red: Negative
}

/**
 * Get savings rate sentiment label
 */
export function getSavingsRateLabel(rate: number): string {
  if (rate >= 0.20) return 'Excellent';
  if (rate >= 0.10) return 'Good';
  if (rate >= 0) return 'Needs Improvement';
  return 'Overspending';
}

/** Pie chart data point */
export interface PieChartDataPoint {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

/** Section colors for charts */
export const SECTION_COLORS: Record<string, string> = {
  household: '#6366f1',    // Indigo
  vehicle: '#f59e0b',      // Amber
  subscriptions: '#ec4899', // Pink
  childcare: '#14b8a6',    // Teal
  investments: '#22c55e',  // Green
};

/** Color palette for custom sections */
const CUSTOM_SECTION_COLORS = [
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#84cc16', // Lime
  '#a855f7', // Purple
];

/**
 * Get color for a section (handles custom sections)
 */
export function getSectionColor(sectionId: string, customIndex = 0): string {
  if (SECTION_COLORS[sectionId]) {
    return SECTION_COLORS[sectionId];
  }
  return CUSTOM_SECTION_COLORS[customIndex % CUSTOM_SECTION_COLORS.length];
}

/**
 * Generate pie chart data for outflows
 */
export function generatePieChartData(sections: ExpenseSection[]): PieChartDataPoint[] {
  const totalOutgoings = calculateTotalOutgoings(sections);
  let customIndex = 0;
  
  return sections
    .map(section => {
      const value = calculateSectionTotal(section);
      const color = section.isCustom 
        ? getSectionColor(section.id, customIndex++)
        : getSectionColor(section.id);
      return {
        name: section.title,
        value,
        color,
        percentage: totalOutgoings > 0 ? (value / totalOutgoings) * 100 : 0,
      };
    })
    .filter(item => item.value > 0);
}

/** Waterfall chart bar data */
export interface WaterfallDataPoint {
  name: string;
  value: number;
  fill: string;
  /** For waterfall: running total before this bar */
  start: number;
  /** For waterfall: running total after this bar */
  end: number;
  /** Display value on bar */
  displayValue: number;
  isIncome?: boolean;
  isSavings?: boolean;
}

/**
 * Generate waterfall chart data
 * First bar = income, subsequent bars = expenses, final bar = savings
 */
export function generateWaterfallData(
  totalIncome: number,
  sections: ExpenseSection[]
): WaterfallDataPoint[] {
  const data: WaterfallDataPoint[] = [];
  let runningTotal = totalIncome;
  let customIndex = 0;
  
  // First bar: Total Income (starts at 0, ends at income)
  data.push({
    name: 'Income',
    value: totalIncome,
    fill: '#22c55e',
    start: 0,
    end: totalIncome,
    displayValue: totalIncome,
    isIncome: true,
  });
  
  // Expense bars (each reduces the running total)
  sections.forEach(section => {
    const sectionTotal = calculateSectionTotal(section);
    if (sectionTotal > 0) {
      const newRunningTotal = runningTotal - sectionTotal;
      const color = section.isCustom 
        ? getSectionColor(section.id, customIndex++)
        : getSectionColor(section.id);
      data.push({
        name: section.title,
        value: sectionTotal,
        fill: color,
        start: newRunningTotal,
        end: runningTotal,
        displayValue: sectionTotal,
      });
      runningTotal = newRunningTotal;
    }
  });
  
  // Final bar: Remaining Savings
  data.push({
    name: 'Savings',
    value: Math.abs(runningTotal),
    fill: runningTotal >= 0 ? '#10b981' : '#ef4444',
    start: 0,
    end: runningTotal,
    displayValue: runningTotal,
    isSavings: true,
  });
  
  return data;
}

/**
 * Format currency with symbol
 */
export function formatCurrencyValue(
  value: number,
  currency: Currency,
  compact = false
): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const absValue = Math.abs(value);
  
  if (compact) {
    if (absValue >= 1_000_000) {
      return `${value < 0 ? '-' : ''}${symbol}${(absValue / 1_000_000).toFixed(1)}M`;
    }
    if (absValue >= 1_000) {
      return `${value < 0 ? '-' : ''}${symbol}${(absValue / 1_000).toFixed(1)}K`;
    }
  }
  
  const formatted = Math.round(absValue).toLocaleString('en-US');
  return `${value < 0 ? '-' : ''}${symbol}${formatted}`;
}
