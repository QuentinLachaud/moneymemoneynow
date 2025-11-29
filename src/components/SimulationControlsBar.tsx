/**
 * SimulationControlsBar — Unified top controls bar for all simulation tabs
 * 
 * This component provides consistent simulation controls across:
 * - Projections tab (single account)
 * - Portfolio tab (multiple accounts)
 * - Projection Portfolio tab (multiple accounts + crash support)
 * 
 * Features:
 * - Monte Carlo / Deterministic mode toggle
 * - Simulation count selector (10, 100, 1k)
 * - Volatility slider with presets
 * - Projection years slider
 * - Nominal/Real value toggle
 * - Linear/Log scale toggle
 * - Summary widget showing initial value, median outcome, returns, survival rate
 */

import { 
  Activity, 
  Zap, 
  Info 
} from 'lucide-react';

interface SimulationStats {
  initialValue: number;
  medianFinalValue: number;
  totalContributions: number;
  totalWithdrawals: number;
  growthFromReturns: number;
  survivalRate: number;
  timeHorizon: number;
}

interface SimulationControlsBarProps {
  // Mode
  isDeterministic: boolean;
  onSetDeterministic: (value: boolean) => void;
  
  // Simulations
  numSimulations: number;
  onSetNumSimulations: (value: number) => void;
  
  // Volatility
  volatility: number;
  onSetVolatility: (value: number) => void;
  
  // Projection years
  projectionYears: number;
  naturalProjectionYears: number;
  onSetProjectionYears: (value: number | null) => void;
  isProjectionOverridden: boolean;
  
  // Inflation
  adjustForInflation: boolean;
  onSetAdjustForInflation: (value: boolean) => void;
  inflationRate?: number;
  
  // Scale
  useLogScale: boolean;
  onSetUseLogScale: (value: boolean) => void;
  
  // Stats for summary widget
  stats: SimulationStats;
}

const SIMULATION_COUNTS = [10, 100, 1000] as const;

export function SimulationControlsBar({
  isDeterministic,
  onSetDeterministic,
  numSimulations,
  onSetNumSimulations,
  volatility,
  onSetVolatility,
  projectionYears,
  naturalProjectionYears,
  onSetProjectionYears,
  isProjectionOverridden,
  adjustForInflation,
  onSetAdjustForInflation,
  inflationRate = 2.5,
  useLogScale,
  onSetUseLogScale,
  stats,
}: SimulationControlsBarProps) {
  
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `£${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `£${(value / 1000).toFixed(1)}k`;
    return `£${value.toFixed(0)}`;
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Calculate nominal vs real growth
  const nominalGrowth = stats.medianFinalValue > 0 && stats.initialValue > 0
    ? ((stats.medianFinalValue - stats.initialValue) / stats.initialValue) * 100
    : 0;
  
  const realGrowth = adjustForInflation
    ? nominalGrowth - (inflationRate * stats.timeHorizon)
    : nominalGrowth;

  return (
    <div className="simulation-controls-bar">
      {/* Left Section: Simulation Settings */}
      <div className="controls-left">
        {/* Mode Toggle */}
        <div className="control-group mode-toggle">
          <button
            className={`mode-btn ${isDeterministic ? '' : 'active'}`}
            onClick={() => onSetDeterministic(false)}
            title="Monte Carlo simulation with randomized returns"
          >
            <Activity size={14} />
            Monte Carlo
          </button>
          <button
            className={`mode-btn ${isDeterministic ? 'active' : ''}`}
            onClick={() => onSetDeterministic(true)}
            title="Deterministic projection using expected returns only"
          >
            <Zap size={14} />
            Deterministic
          </button>
        </div>

        {/* Simulation Count (only for Monte Carlo) */}
        {!isDeterministic && (
          <div className="control-group simulations-control">
            <label>Simulations</label>
            <div className="btn-group-sm">
              {SIMULATION_COUNTS.map(count => (
                <button
                  key={count}
                  className={`btn-sm ${numSimulations === count ? 'active' : ''}`}
                  onClick={() => onSetNumSimulations(count)}
                >
                  {count >= 1000 ? `${count / 1000}k` : count}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Volatility Control (only for Monte Carlo) */}
        {!isDeterministic && (
          <div className="control-group volatility-control-compact">
            <label>Volatility: {volatility}%</label>
            <div className="slider-with-presets">
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={volatility}
                onChange={(e) => onSetVolatility(parseInt(e.target.value))}
                className="compact-slider"
              />
              <div className="preset-btns">
                {[0, 10, 20, 30].map(v => (
                  <button
                    key={v}
                    className={`preset-btn-sm ${volatility === v ? 'active' : ''}`}
                    onClick={() => onSetVolatility(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="controls-divider" />

        {/* Projection Years */}
        <div className="control-group projection-control">
          <label>
            Projection: {projectionYears}y
            {isProjectionOverridden && (
              <button 
                className="reset-btn-inline" 
                onClick={() => onSetProjectionYears(null)}
                title="Reset to natural horizon"
              >
                ↺
              </button>
            )}
          </label>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={projectionYears}
            onChange={(e) => onSetProjectionYears(parseInt(e.target.value))}
            className="projection-slider-wide"
          />
        </div>

        {/* Inflation Toggle - Slider Style */}
        <div className="control-group toggle-slider-group">
          <label>Values</label>
          <div className="toggle-slider">
            <button
              className={`toggle-option ${!adjustForInflation ? 'active' : ''}`}
              onClick={() => onSetAdjustForInflation(false)}
            >
              Nominal
            </button>
            <button
              className={`toggle-option ${adjustForInflation ? 'active' : ''}`}
              onClick={() => onSetAdjustForInflation(true)}
            >
              Real
            </button>
            <div 
              className="toggle-slider-indicator" 
              style={{ transform: adjustForInflation ? 'translateX(100%)' : 'translateX(0)' }}
            />
          </div>
          <button 
            className="info-btn" 
            title={adjustForInflation 
              ? `Values adjusted for ${inflationRate}% annual inflation (real purchasing power)` 
              : 'Values shown in nominal terms (not adjusted for inflation)'}
          >
            <Info size={12} />
          </button>
        </div>

        {/* Scale Toggle - Slider Style */}
        <div className="control-group toggle-slider-group">
          <label>Scale</label>
          <div className="toggle-slider">
            <button
              className={`toggle-option ${!useLogScale ? 'active' : ''}`}
              onClick={() => onSetUseLogScale(false)}
            >
              Linear
            </button>
            <button
              className={`toggle-option ${useLogScale ? 'active' : ''}`}
              onClick={() => onSetUseLogScale(true)}
            >
              Log
            </button>
            <div 
              className="toggle-slider-indicator" 
              style={{ transform: useLogScale ? 'translateX(100%)' : 'translateX(0)' }}
            />
          </div>
        </div>
      </div>

      {/* Right Section: Summary Widget */}
      <div className="controls-right">
        <div className="simulation-summary-widget">
          {/* Initial → Median */}
          <div className="summary-main">
            <div className="summary-value initial">
              <span className="value-label">Initial</span>
              <span className="value-amount">{formatCurrency(stats.initialValue)}</span>
            </div>
            <span className="summary-arrow">→</span>
            <div className="summary-value median">
              <span className="value-label">Median ({stats.timeHorizon}y)</span>
              <span className="value-amount highlight">{formatCurrency(stats.medianFinalValue)}</span>
            </div>
          </div>

          {/* Growth rates */}
          <div className="summary-growth">
            <div className="growth-item">
              <span className="growth-label">Nominal</span>
              <span className={`growth-value ${nominalGrowth >= 0 ? 'positive' : 'negative'}`}>
                {nominalGrowth >= 0 ? '+' : ''}{nominalGrowth.toFixed(1)}%
              </span>
            </div>
            <div className="growth-item">
              <span className="growth-label">Real</span>
              <span className={`growth-value ${realGrowth >= 0 ? 'positive' : 'negative'}`}>
                {realGrowth >= 0 ? '+' : ''}{realGrowth.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Bottom row: contributions, withdrawals, returns, survival */}
          <div className="summary-details">
            <div className="detail-item">
              <span className="detail-label">Returns</span>
              <span className={`detail-value ${stats.growthFromReturns >= 0 ? 'positive' : 'negative'}`}>
                {stats.growthFromReturns >= 0 ? '+' : ''}{formatCurrency(stats.growthFromReturns)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Contributions</span>
              <span className="detail-value positive">+{formatCurrency(stats.totalContributions)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Withdrawals</span>
              <span className="detail-value negative">-{formatCurrency(stats.totalWithdrawals)}</span>
            </div>
            {!isDeterministic && (
              <div className="detail-item survival">
                <span className="detail-label">Survival Rate</span>
                <span className={`detail-value ${stats.survivalRate >= 0.9 ? 'positive' : stats.survivalRate >= 0.7 ? 'warning' : 'negative'}`}>
                  {formatPercent(stats.survivalRate)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
