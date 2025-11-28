/**
 * format.ts — Locale and currency formatting utilities
 *
 * USAGE:
 * - Call setLocaleCurrency() once at app start to set defaults
 * - Use formatCurrency() anywhere you display money values
 *
 * CUSTOMIZATION:
 * - Default locale/currency can be changed below
 * - formatCurrency accepts overrides per-call if needed
 */

/** Current locale setting (default: British English) */
let _locale = 'en-GB';

/** Current currency setting (default: British Pounds) */
let _currency = 'GBP';

/**
 * Set the global locale and currency for formatting
 * @param locale - BCP 47 locale code (e.g., 'en-US', 'en-GB')
 * @param currency - ISO 4217 currency code (e.g., 'USD', 'GBP', 'EUR')
 */
export function setLocaleCurrency(locale: string, currency: string): void {
  _locale = locale;
  _currency = currency;
}

/**
 * Get current locale and currency settings
 * @returns Object with locale and currency strings
 */
export function getLocaleCurrency(): { locale: string; currency: string } {
  return { locale: _locale, currency: _currency };
}

/**
 * Format a number as currency
 *
 * @param value - Number to format
 * @param options - Optional overrides for currency/locale
 * @returns Formatted string (e.g., "£1,234" or "$1,234")
 */
export function formatCurrency(
  value: number,
  options?: { currency?: string; locale?: string }
): string {
  const currency = options?.currency || _currency;
  const locale = options?.locale || _locale;
  return value.toLocaleString(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  });
}

export default { setLocaleCurrency, getLocaleCurrency, formatCurrency };
