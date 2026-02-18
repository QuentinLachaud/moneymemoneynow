/**
 * PercentSlider — Reusable percentage slider with numeric input
 */

import { useCallback } from 'react';
import { Slider } from '@quentinlachaud/app-component-library';

interface PercentSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
}

export function PercentSlider({
  value,
  onChange,
  min = 0,
  max = 50,
  step = 1,
  label,
  disabled = false,
}: PercentSliderProps) {
  const handleChange = useCallback((newValue: number) => {
    const clamped = Math.min(max, Math.max(min, newValue));
    onChange(clamped);
  }, [min, max, onChange]);

  return (
    <div className={`percent-slider ${disabled ? 'disabled' : ''}`}>
      <Slider
        label={label || ''}
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        formatValue={(v) => `${v}%`}
      />
    </div>
  );
}
