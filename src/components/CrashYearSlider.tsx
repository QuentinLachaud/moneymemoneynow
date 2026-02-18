/**
 * CrashYearSlider — Horizontal slider under Monte Carlo graph for crash timing
 * 
 * Shows a slider spanning the projection years, allowing users to
 * drag the crash year position for the active crash ticket.
 */

import { useMemo } from 'react';
import { Zap } from 'lucide-react';
import { Slider } from '@quentinlachaud/app-component-library';
import { useMarketCrashStore } from '../store/useMarketCrashStore';

interface CrashYearSliderProps {
  /** Start year of the projection */
  startYear: number;
  /** End year of the projection */
  endYear: number;
}

export function CrashYearSlider({ startYear, endYear }: CrashYearSliderProps) {
  const { crashes, activeCrashId, setCrashYear } = useMarketCrashStore();
  
  // Get the active crash
  const activeCrash = useMemo(() => {
    return crashes.find(c => c.id === activeCrashId);
  }, [crashes, activeCrashId]);

  // Don't render if no active crash
  if (!activeCrash) {
    return null;
  }

  const totalYears = endYear - startYear;
  const yearFromStart = activeCrash.crashYear - startYear;

  const handleSliderChange = (value: number) => {
    const newCrashYear = startYear + value;
    setCrashYear(activeCrash.id, newCrashYear);
  };

  return (
    <div className="crash-year-slider-container compact">
      <div className="crash-slider-header">
        <div className="crash-slider-label">
          <Zap size={12} className="crash-icon" />
          <span className="crash-name">{activeCrash.name}</span>
          <span className="crash-stats">
            <span className="severity-inline">-{(activeCrash.severity * 100).toFixed(0)}%</span>
            <span className="recovery-inline">{activeCrash.recoveryYears}y</span>
          </span>
        </div>
        <div className="crash-slider-value">
          <span className="crash-year-label">Crash in</span>
          <strong>{activeCrash.crashYear + 1}</strong>
          <span className="year-offset">({yearFromStart + 1}y)</span>
        </div>
      </div>
      
      <Slider
        value={yearFromStart}
        min={0}
        max={totalYears - 1}
        step={1}
        onChange={handleSliderChange}
        showValue={false}
      />
    </div>
  );
}
