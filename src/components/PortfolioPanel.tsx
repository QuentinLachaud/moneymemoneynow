/**
 * PortfolioPanel — Combined Monte Carlo simulation for entire portfolio
 * 
 * FEATURES:
 * - Aggregates all accounts into portfolio projection
 * - Consolidates same-name accounts automatically
 * - Shows portfolio-level percentile projections
 * - Displays survival rate for entire portfolio
 * - Allows toggling individual accounts on/off
 */

import { useState, useMemo, useCallback } from 'react';
import { Account } from '../App';
import { runPortfolioMonteCarloSimulation, PortfolioSimulationResult } from '../utils/portfolioMonteCarlo';
import { MonteCarloChart } from './MonteCarloChart';
import { HistogramChart } from './HistogramChart';
import { SimulationSummary } from './SimulationSummary';
import { CashFlowChart } from './CashFlowChart';
import { BarChart3, Table, TrendingUp, Shield } from 'lucide-react';
import { generateHistogramBins } from '../utils/monteCarlo';

interface PortfolioPanelProps {
  accounts: Account[];
  /** Set of account IDs to include in simulation */
  selectedAccountIds: Set<string>;
}

const SIMULATION_COUNTS = [10, 100, 1000] as const;

export function PortfolioPanel({ accounts, selectedAccountIds }: PortfolioPanelProps) {
  // Simulation settings
  const [numSimulations, setNumSimulations] = useState<number>(100);
  const [volatilityOverride, setVolatilityOverride] = useState<number>(15);
  const [histogramBins, setHistogramBins] = useState(20);
  const [showHistogram, setShowHistogram] = useState(true);
  const [showDataTable, setShowDataTable] = useState(false);

  // Filter accounts based on selection
  const activeAccounts = useMemo(() => {
    return accounts.filter(acc => selectedAccountIds.has(acc.id));
  }, [accounts, selectedAccountIds]);

  // Run portfolio simulation
  const simulation: PortfolioSimulationResult = useMemo(() => {
    return runPortfolioMonteCarloSimulation(
      activeAccounts,
      numSimulations,
      volatilityOverride
    );
  }, [activeAccounts, numSimulations, volatilityOverride]);

  // Get final values for histogram
  const finalValues = useMemo(() => {
    return simulation.paths.map(p => p.finalValue);
  }, [simulation]);

  // Calculate total initial value
  const totalInitialValue = useMemo(() => {
    return simulation.consolidatedAccounts.reduce((sum, c) => sum + c.initialValue, 0);
  }, [simulation]);

  // Calculate time horizon
  const timeHorizon = useMemo(() => {
    if (simulation.years.length < 2) return 0;
    return simulation.years[simulation.years.length - 1] - simulation.years[0];
  }, [simulation]);

  const handleVolatilityChange = useCallback((value: number) => {
    setVolatilityOverride(value);
  }, []);

  if (activeAccounts.length === 0) {
    return (
      <div className="empty-portfolio-state card">
        <div className="empty-state-content">
          <Shield size={48} className="empty-icon" />
          <h3>No Assets Selected</h3>
          <p>Toggle assets on from the bottom strip to see your combined portfolio projection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-panel projections-panel">
      {/* Controls Header */}
      <div className="projections-controls">
        {/* Portfolio Summary */}
        <div className="control-group portfolio-summary">
          <div className="portfolio-stat">
            <span className="stat-label">Assets</span>
            <span className="stat-value">{simulation.consolidatedAccounts.length}</span>
          </div>
          <div className="portfolio-stat">
            <span className="stat-label">Initial Value</span>
            <span className="stat-value">
              {totalInitialValue.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

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
            Volatility: <span className="value-display">{volatilityOverride}%</span>
          </label>
          <div className="volatility-slider-container">
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={volatilityOverride}
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
                className={`preset-btn ${volatilityOverride === v ? 'active' : ''}`}
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
              <h3>
                <TrendingUp size={18} className="header-icon" />
                Portfolio Monte Carlo Projection
              </h3>
              <div className="section-meta">
                {numSimulations.toLocaleString()} simulations · {volatilityOverride}% volatility · {timeHorizon} year horizon
              </div>
            </div>
            <div className="chart-container">
              <MonteCarloChart simulation={simulation} />
            </div>
          </div>

          {/* Cash Flow Chart Section */}
          <div className="cash-flow-section card">
            <div className="section-header">
              <h3>Portfolio Cash Flow</h3>
            </div>
            <div className="chart-container compact">
              <CashFlowChart accounts={activeAccounts} />
            </div>
          </div>
        </div>

        {/* Right Side Panel */}
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
          {showHistogram && finalValues.length > 0 && (
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
                />
              </div>
            </div>
          )}

          {/* Summary Statistics */}
          <div className="summary-section card">
            <SimulationSummary
              stats={simulation.stats}
              timeHorizon={timeHorizon}
            />
          </div>

          {/* Consolidated Accounts Breakdown */}
          <div className="consolidated-accounts-section card">
            <div className="section-header">
              <h4>Asset Breakdown</h4>
            </div>
            <div className="consolidated-accounts-list">
              {simulation.consolidatedAccounts.map(c => (
                <div key={c.name} className="consolidated-account-item">
                  <div className="account-name">{c.name}</div>
                  <div className="account-details">
                    <span className="initial-value">
                      {c.initialValue.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })}
                    </span>
                    <span className={`cash-flow ${c.netAnnualCashFlow >= 0 ? 'positive' : 'negative'}`}>
                      {c.netAnnualCashFlow >= 0 ? '+' : ''}{c.netAnnualCashFlow.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })}/yr
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
