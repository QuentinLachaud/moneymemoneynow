/**
 * CategoryInputRow.tsx — Single expenditure category input row
 *
 * Features:
 * - Label on left, input on right
 * - Optional annual/monthly frequency toggle for vehicle items
 * - Currency symbol prefix
 */

import { useRef } from 'react';
import { NumberInput, SegmentedToggle } from '@quentinlachaud/app-component-library';
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
        <NumberInput
          value={amount || undefined}
          onChange={(v) => onAmountChange(v ?? 0)}
          min={0}
        />
        
        {showFrequency && onFrequencyChange && (
          <SegmentedToggle
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'annual', label: 'Annual' },
            ]}
            value={frequency}
            onChange={(v) => onFrequencyChange(v as 'annual' | 'monthly')}
            size="sm"
          />
        )}
      </div>
    </div>
  );
}
