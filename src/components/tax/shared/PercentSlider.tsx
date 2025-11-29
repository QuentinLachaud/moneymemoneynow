/**
 * PercentSlider — Reusable percentage slider with numeric input
 */

import { useCallback } from 'react';

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
      {label && <label className="slider-label">{label}</label>}
      <div className="slider-controls">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => handleChange(parseInt(e.target.value))}
          disabled={disabled}
          className="slider-track"
        />
        <div className="slider-input-group">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => handleChange(parseInt(e.target.value) || 0)}
            disabled={disabled}
            className="slider-input"
          />
          <span className="slider-unit">%</span>
        </div>
      </div>
    </div>
  );
}
