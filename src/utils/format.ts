let _locale = 'en-GB';
let _currency = 'GBP';

export function setLocaleCurrency(locale: string, currency: string) {
  _locale = locale;
  _currency = currency;
}

export function getLocaleCurrency() {
  return { locale: _locale, currency: _currency };
}

export function formatCurrency(value: number, options?: { currency?: string; locale?: string }) {
  const currency = options?.currency || _currency;
  const locale = options?.locale || _locale;
  return value.toLocaleString(locale, { style: 'currency', currency, minimumFractionDigits: 0 });
}

export default { setLocaleCurrency, getLocaleCurrency, formatCurrency };
