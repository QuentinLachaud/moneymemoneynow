/**
 * StartingValueSlider — Vertical slider to adjust initial portfolio value
 * 
 * Allows users to experiment with different starting balances
 * and see how it affects the Monte Carlo simulation results.
 * 
 * Fixed range: £0 to £1,000,000 in £50,000 increments
 */

import { useState, useCallback, useMemo } from 'react';

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
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  }, [onChange]);

  const percentage = (value / SLIDER_MAX) * 100;

  // Generate graduated marks
  const marks = useMemo(() => {
    const markValues = [1000000, 750000, 500000, 250000, 0];
    return markValues.map(v => ({
      value: v,
      label: formatCurrency(v),
      position: 100 - (v / SLIDER_MAX) * 100,
    }));
  }, []);

  return (
    <div className={`starting-value-slider wide ${disabled ? 'disabled' : ''} ${isDragging ? 'dragging' : ''}`}>
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
            min={0}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
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
        
        <div className="slider-marks graduated">
          {marks.map(mark => (
            <span 
              key={mark.value} 
              className="mark-label"
              style={{ top: `${mark.position}%` }}
            >
              {mark.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
