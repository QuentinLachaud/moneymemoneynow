/**
 * ProjectionsPanel — Main Monte Carlo simulation panel for the Projections tab
 * 
 * FEATURES:
 * - Simulation count selector (10, 100, 1000)
 * - Volatility adjustment slider (0-50% in 1% or 5% increments)
 * - Monte Carlo chart with percentile lines
 * - Histogram distribution with adjustable bins
 * - Summary statistics table
 */

import { useState, useMemo, useCallback } from 'react';
import { Account } from '../App';
import { runMonteCarloSimulation, SimulationResult } from '../utils/monteCarlo';
import { MonteCarloChart } from './MonteCarloChart';
import { HistogramChart } from './HistogramChart';
import { SimulationSummary } from './SimulationSummary';
import { CashFlowChart } from './CashFlowChart';
import { BarChart3, Table, Settings2 } from 'lucide-react';

interface ProjectionsPanelProps {
  account: Account;
}

const SIMULATION_COUNTS = [10, 100, 1000] as const;
const BIN_STEPS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

export function ProjectionsPanel({ account }: ProjectionsPanelProps) {
  // Simulation settings
  const [numSimulations, setNumSimulations] = useState<number>(100);
  const [volatilityOverride, setVolatilityOverride] = useState<number | null>(15);
  const [histogramBins, setHistogramBins] = useState(20);
  const [showHistogram, setShowHistogram] = useState(true);
  const [showDataTable, setShowDataTable] = useState(false);

  // Get effective volatility
  const effectiveVolatility = useMemo(() => {
    if (volatilityOverride !== null) return volatilityOverride;
    const volMap: Record<string, number> = {
      'low': 5,
      'medium': 15,
      'high': 25,
    };
    return account.volatility ? volMap[account.volatility] || 0 : 0;
  }, [volatilityOverride, account.volatility]);

  // Run simulation (memoized to prevent unnecessary recalculations)
  const simulation: SimulationResult = useMemo(() => {
    return runMonteCarloSimulation(
      account,
      numSimulations,
      volatilityOverride ?? undefined
    );
  }, [account, numSimulations, volatilityOverride]);

  // Get final values for histogram
  const finalValues = useMemo(() => {
    return simulation.paths.map(p => p.finalValue);
  }, [simulation]);

  // Handle volatility change with 1% increments
  const handleVolatilityChange = useCallback((value: number) => {
    setVolatilityOverride(value);
  }, []);

  return (
    <div className="projections-panel">
      {/* Controls Header */}
      <div className="projections-controls">
        {/* Simulation Count Selector */}
        <div className="control-group">
          <label>Simulations</label>
          <div className="simulation-count-selector">
            {SIMULATION_COUNTS.map(count => (
              <button
                key={count}
                className={`count-btn ${numSimulations === count ? 'active' : ''}`}
                onClick={() => setNumSimulations(count)}
              >
                {count.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Volatility Slider */}
        <div className="control-group volatility-control">
          <label>
            Volatility: <span className="value-display">{effectiveVolatility}%</span>
          </label>
          <div className="volatility-slider-container">
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={volatilityOverride ?? effectiveVolatility}
              onChange={(e) => handleVolatilityChange(parseInt(e.target.value))}
              className="volatility-slider"
            />
            <div className="volatility-marks">
              <span>0%</span>
              <span>10%</span>
              <span>20%</span>
              <span>30%</span>
              <span>40%</span>
              <span>50%</span>
            </div>
          </div>
          <div className="volatility-presets">
            {[0, 5, 10, 15, 20, 25, 30].map(v => (
              <button
                key={v}
                className={`preset-btn ${effectiveVolatility === v ? 'active' : ''}`}
                onClick={() => handleVolatilityChange(v)}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="projections-content">
        {/* Left Column: Monte Carlo + Cash Flow */}
        <div className="projections-left-column">
          {/* Monte Carlo Chart Section */}
          <div className="projections-chart-section card">
            <div className="section-header">
              <h3>Monte Carlo Projection: {account.name}</h3>
              <div className="section-meta">
                {numSimulations.toLocaleString()} simulations · {effectiveVolatility}% volatility · {account.timeHorizon} year horizon
              </div>
            </div>
            <div className="chart-container">
              <MonteCarloChart simulation={simulation} />
            </div>
          </div>

          {/* Cash Flow Chart Section */}
          <div className="cash-flow-section card">
            <div className="section-header">
              <h3>Cash Flow: {account.name}</h3>
            </div>
            <div className="chart-container compact">
              <CashFlowChart accounts={[account]} />
            </div>
          </div>
        </div>

        {/* Right Side Panel - Histogram & Summary */}
        <div className="projections-side-panel">
          {/* Toggle Buttons */}
          <div className="side-panel-toggles">
            <button
              className={`toggle-btn ${showHistogram ? 'active' : ''}`}
              onClick={() => setShowHistogram(!showHistogram)}
            >
              <BarChart3 size={16} />
              Distribution
            </button>
            <button
              className={`toggle-btn ${showDataTable ? 'active' : ''}`}
              onClick={() => setShowDataTable(!showDataTable)}
            >
              <Table size={16} />
              Data
            </button>
          </div>

          {/* Histogram Section */}
          {showHistogram && (
            <div className="histogram-section card">
              <div className="section-header">
                <h4>Final Value Distribution</h4>
                <div className="bin-control">
                  <label>Bins: {histogramBins}</label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={histogramBins}
                    onChange={(e) => setHistogramBins(parseInt(e.target.value))}
                  />
                </div>
              </div>
              <div className="histogram-container">
                <HistogramChart
                  finalValues={finalValues}
                  stats={simulation.stats}
                  numBins={histogramBins}
                  useLogScale={false}
                />
              </div>
            </div>
          )}

          {/* Summary Statistics */}
          <div className="summary-section card">
            <SimulationSummary
              stats={simulation.stats}
              timeHorizon={account.timeHorizon}
            />
          </div>

          {/* Data Table */}
          {showDataTable && (
            <div className="data-table-section card">
              <div className="section-header">
                <h4>Percentile Data</h4>
              </div>
              <div className="percentile-table-container">
                <table className="percentile-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>1st</th>
                      <th>10th</th>
                      <th>25th</th>
                      <th>50th</th>
                      <th>75th</th>
                      <th>90th</th>
                      <th>99th</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulation.years.map((year, idx) => (
                      <tr key={year}>
                        <td>{year}</td>
                        <td>{formatValue(simulation.percentiles[1][idx])}</td>
                        <td>{formatValue(simulation.percentiles[10][idx])}</td>
                        <td>{formatValue(simulation.percentiles[25][idx])}</td>
                        <td className="highlight">{formatValue(simulation.percentiles[50][idx])}</td>
                        <td>{formatValue(simulation.percentiles[75][idx])}</td>
                        <td>{formatValue(simulation.percentiles[90][idx])}</td>
                        <td>{formatValue(simulation.percentiles[99][idx])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatValue(value: number): string {
  if (value >= 1000000) return `£${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `£${(value / 1000).toFixed(1)}k`;
  return `£${value.toFixed(0)}`;
}
