/**
 * Formatting Utilities for Net Worth
 */

/**
 * Format currency with commas and £ symbol
 */
export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const formatted = Math.round(absValue).toLocaleString('en-GB');
  return value < 0 ? `-£${formatted}` : `£${formatted}`;
}

/**
 * Format compact currency for chart axes
 */
export function formatCompactCurrency(value: number): string {
  const absValue = Math.abs(value);
  let formatted: string;
  
  if (absValue >= 1_000_000) {
    formatted = `£${(absValue / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    formatted = `£${(absValue / 1_000).toFixed(0)}K`;
  } else {
    formatted = `£${absValue.toFixed(0)}`;
  }
  
  return value < 0 ? `-${formatted}` : formatted;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB');
}
