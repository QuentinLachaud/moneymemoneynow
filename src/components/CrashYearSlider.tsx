/**
 * CrashYearSlider — Horizontal slider under Monte Carlo graph for crash timing
 * 
 * Shows a slider spanning the projection years, allowing users to
 * drag the crash year position for the active crash ticket.
 */

import { useMemo } from 'react';
import { Zap } from 'lucide-react';
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

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const yearOffset = parseInt(e.target.value);
    const newCrashYear = startYear + yearOffset;
    setCrashYear(activeCrash.id, newCrashYear);
  };

  // Generate tick marks for years
  const ticks = useMemo(() => {
    const result: number[] = [];
    const step = totalYears <= 20 ? 1 : totalYears <= 40 ? 5 : 10;
    for (let i = 0; i <= totalYears; i += step) {
      result.push(i);
    }
    return result;
  }, [totalYears]);

  return (
    <div className="crash-year-slider-container">
      <div className="crash-slider-header">
        <div className="crash-slider-label">
          <Zap size={14} className="crash-icon" />
          <span className="crash-name">{activeCrash.name}</span>
        </div>
        <div className="crash-slider-value">
          Crash Year: <strong>{activeCrash.crashYear}</strong>
          <span className="year-offset">(Year {yearFromStart})</span>
        </div>
      </div>
      
      <div className="crash-slider-track">
        <input
          type="range"
          min={0}
          max={totalYears}
          value={yearFromStart}
          onChange={handleSliderChange}
          className="crash-year-input"
        />
        
        {/* Tick marks */}
        <div className="crash-slider-ticks">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="tick-mark"
              style={{ left: `${(tick / totalYears) * 100}%` }}
            >
              <div className="tick-line" />
              <span className="tick-label">{startYear + tick}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="crash-slider-info">
        <span className="severity-badge">
          -{(activeCrash.severity * 100).toFixed(0)}% drop
        </span>
        <span className="recovery-badge">
          {activeCrash.recoveryYears}y recovery
        </span>
      </div>
    </div>
  );
}
