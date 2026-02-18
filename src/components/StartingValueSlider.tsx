/**
 * StartingValueSlider — Vertical slider to adjust initial portfolio value
 * 
 * Allows users to experiment with different starting balances
 * and see how it affects the Monte Carlo simulation results.
 * 
 * Fixed range: £0 to £1,000,000 in £50,000 increments
 */

import { Slider } from '@quentinlachaud/app-component-library';

interface StartingValueSliderProps {
  /** Current starting value */
  value: number;
  /** Maximum value (ignored - fixed at 1M) */
  max?: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Whether slider is disabled */
  disabled?: boolean;
}

const SLIDER_MAX = 1000000; // £1M
const SLIDER_STEP = 50000;  // £50k increments

function formatCurrency(value: number): string {
  if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
  return `£${value.toFixed(0)}`;
}

export function StartingValueSlider({
  value,
  onChange,
  disabled = false,
}: StartingValueSliderProps) {
  return (
    <div className={`starting-value-slider wide ${disabled ? 'disabled' : ''}`}>
      <Slider
        label="Starting Value"
        value={value}
        min={0}
        max={SLIDER_MAX}
        step={SLIDER_STEP}
        onChange={onChange}
        formatValue={formatCurrency}
        disabled={disabled}
        orientation="vertical"
      />
    </div>
  );
}
