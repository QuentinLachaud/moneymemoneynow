/**
 * SimulationSliders — Compact slider controls for volatility and projection years
 * 
 * This is a unified microcomponent used across all projection tabs
 * to provide consistent slider controls for simulation settings.
 */

import { Info } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface SimulationSlidersProps {
  /** Natural time horizon from account/portfolio (used as default) */
  naturalHorizon?: number;
  /** Show projection years slider (can be hidden in certain contexts) */
  showProjectionSlider?: boolean;
  /** Show volatility slider (can be hidden in deterministic mode) */
  showVolatilitySlider?: boolean;
}

export function SimulationSliders({ 
  naturalHorizon = 30,
  showProjectionSlider = true,
  showVolatilitySlider = true,
}: SimulationSlidersProps) {
  // Get persisted settings from store
  const simulationSettings = useAppStore((state) => state.simulationSettings);
  const setSimulationSettings = useAppStore((state) => state.setSimulationSettings);
  
  const volatility = simulationSettings.volatilityOverride;
  const projectionYears = simulationSettings.projectionYearsOverride ?? naturalHorizon;
  const hasOverride = simulationSettings.projectionYearsOverride !== null;
  
  const handleVolatilityChange = (value: number) => {
    setSimulationSettings({ volatilityOverride: value });
  };
  
  const handleProjectionYearsChange = (value: number | null) => {
    setSimulationSettings({ projectionYearsOverride: value });
  };
  
  const resetProjectionYears = () => {
    setSimulationSettings({ projectionYearsOverride: null });
  };
  
  return (
    <div className="simulation-sliders">
      {showVolatilitySlider && (
        <div className="slider-control">
          <div className="slider-label">
            <span>Volatility</span>
            <span className="slider-value">{volatility}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={volatility}
            onChange={(e) => handleVolatilityChange(parseInt(e.target.value))}
            className="slider-input"
          />
        </div>
      )}
      
      {showProjectionSlider && (
        <div className="slider-control">
          <div className="slider-label">
            <span>
              Projection
              {hasOverride && (
                <button 
                  className="reset-btn-inline" 
                  onClick={resetProjectionYears}
                  title="Reset to default"
                >
                  ↺
                </button>
              )}
            </span>
            <span className="slider-value">{projectionYears}y</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={projectionYears}
            onChange={(e) => handleProjectionYearsChange(parseInt(e.target.value))}
            className="slider-input"
          />
        </div>
      )}
    </div>
  );
}
