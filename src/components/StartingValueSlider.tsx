/**
 * StartingValueSlider — Vertical slider to adjust initial portfolio value
 * 
 * Allows users to experiment with different starting balances
 * and see how it affects the Monte Carlo simulation results.
 */

import { useState, useCallback } from 'react';

interface StartingValueSliderProps {
  /** Current starting value */
  value: number;
  /** Minimum value (0) */
  min?: number;
  /** Maximum value (calculated from account data) */
  max: number;
  /** Step size */
  step?: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Whether slider is disabled */
  disabled?: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
  return `£${value.toFixed(0)}`;
}

export function StartingValueSlider({
  value,
  min = 0,
  max,
  step,
  onChange,
  disabled = false,
}: StartingValueSliderProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Calculate appropriate step size based on max value
  const calculatedStep = step ?? Math.max(1000, Math.floor(max / 100));

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  }, [onChange]);

  const percentage = max > 0 ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className={`starting-value-slider ${disabled ? 'disabled' : ''} ${isDragging ? 'dragging' : ''}`}>
      <div className="slider-header">
        <span className="slider-label">Starting Value</span>
        <span className="slider-value">{formatCurrency(value)}</span>
      </div>
      
      <div className="slider-track-container">
        <div className="slider-track">
          <div 
            className="slider-fill" 
            style={{ height: `${percentage}%` }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={calculatedStep}
            value={value}
            onChange={handleChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            className="vertical-slider"
            disabled={disabled}
          />
        </div>
        
        <div className="slider-marks">
          <span className="mark-label">{formatCurrency(max)}</span>
          <span className="mark-label">{formatCurrency(max * 0.5)}</span>
          <span className="mark-label">{formatCurrency(min)}</span>
        </div>
      </div>
    </div>
  );
}
