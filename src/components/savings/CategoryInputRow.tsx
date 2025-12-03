/**
 * CategoryInputRow.tsx — Single expenditure category input row
 *
 * Features:
 * - Label on left, input on right
 * - Optional annual/monthly frequency toggle for vehicle items
 * - Currency symbol prefix
 */

import { useRef } from 'react';
import { Currency, CURRENCY_SYMBOLS } from '../../utils/investmentSimulation';

interface CategoryInputRowProps {
  categoryId: string;
  label: string;
  amount: number;
  currency: Currency;
  /** Optional frequency for vehicle items */
  frequency?: 'annual' | 'monthly';
  /** Show frequency selector */
  showFrequency?: boolean;
  onAmountChange: (amount: number) => void;
  onFrequencyChange?: (frequency: 'annual' | 'monthly') => void;
}

export function CategoryInputRow({
  categoryId,
  label,
  amount,
  currency,
  frequency = 'monthly',
  showFrequency = false,
  onAmountChange,
  onFrequencyChange,
}: CategoryInputRowProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const symbol = CURRENCY_SYMBOLS[currency];

  return (
    <div className="category-input-row">
      <label htmlFor={categoryId} className="category-label">
        {label}
      </label>
      
      <div className="category-input-wrapper">
        <div className="category-input-field">
          <span className="currency-prefix">{symbol}</span>
          <input
            id={categoryId}
            type="number"
            value={amount || ''}
            onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
            placeholder="0"
            min={0}
          />
        </div>
        
        {showFrequency && onFrequencyChange && (
          <div className="frequency-toggle-slider">
            <button
              type="button"
              className={`frequency-option ${frequency === 'monthly' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onFrequencyChange('monthly');
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`frequency-option ${frequency === 'annual' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onFrequencyChange('annual');
              }}
            >
              Annual
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
