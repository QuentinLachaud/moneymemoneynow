/**
 * CategoryInputRow.tsx — Single expenditure category input row
 *
 * Features:
 * - Label on left, input on right
 * - Optional annual/monthly frequency toggle for vehicle items
 * - Currency symbol prefix
 */

import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
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
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFrequencyDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <div className="frequency-selector" ref={dropdownRef}>
            <button
              type="button"
              className="frequency-toggle"
              onClick={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
            >
              <span className="frequency-label">
                {frequency === 'annual' ? '/yr' : '/mo'}
              </span>
              <ChevronDown size={12} />
            </button>
            
            {showFrequencyDropdown && (
              <div className="frequency-dropdown">
                <button
                  type="button"
                  className={`frequency-option ${frequency === 'monthly' ? 'active' : ''}`}
                  onClick={() => {
                    onFrequencyChange('monthly');
                    setShowFrequencyDropdown(false);
                  }}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`frequency-option ${frequency === 'annual' ? 'active' : ''}`}
                  onClick={() => {
                    onFrequencyChange('annual');
                    setShowFrequencyDropdown(false);
                  }}
                >
                  Annual
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
