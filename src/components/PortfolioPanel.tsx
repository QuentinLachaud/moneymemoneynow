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
import { Button, IconButton, NumberInput, Slider, SegmentedToggle } from '@quentinlachaud/app-component-library';

interface PortfolioPanelProps {
  accounts: Account[];
  /** Set of account IDs to include in simulation */
  selectedAccountIds: Set<string>;
}

/** Per-asset override settings */
interface AssetOverride {
  returnOverride: number | null;
  globalVolatilityOverride: number | null;
}

const SIMULATION_COUNTS = [10, 100, 1000] as const;

export function PortfolioPanel({ accounts, selectedAccountIds }: PortfolioPanelProps) {
  // Simulation settings
  const [numSimulations, setNumSimulations] = useState<number>(100);
  const [globalVolatilityOverride, setGlobalVolatilityOverride] = useState<number>(15);
  const [histogramBins, setHistogramBins] = useState(20);
  const [showHistogram, setShowHistogram] = useState(true);
  const [showDataTable, setShowDataTable] = useState(false);
  const [useLogScale, setUseLogScale] = useState(false);
  const [projectionYearsOverride, setProjectionYearsOverride] = useState<number | null>(null);
  
  // Per-asset overrides: Map<assetName, AssetOverride>
  const [assetOverrides, setAssetOverrides] = useState<Map<string, AssetOverride>>(new Map());

  // Filter accounts based on selection
  const activeAccounts = useMemo(() => {
    return accounts.filter(acc => selectedAccountIds.has(acc.id));
  }, [accounts, selectedAccountIds]);

  // Build per-asset overrides map for simulation (applied only to gap periods)
  const assetOverridesForSimulation = useMemo(() => {
    const map = new Map<string, { returnOverride: number | null; volatilityOverride: number | null }>();
    assetOverrides.forEach((override, key) => {
      map.set(key, {
        returnOverride: override.returnOverride,
        volatilityOverride: override.globalVolatilityOverride,
      });
    });
    return map;
  }, [assetOverrides]);

  // Calculate natural time horizon (based on account end dates)
  const naturalTimeHorizon = useMemo(() => {
    if (activeAccounts.length === 0) return 30;
    const startYear = Math.min(...activeAccounts.map(a => new Date(a.date).getFullYear()));
    const endYear = Math.max(...activeAccounts.map(a => new Date(a.date).getFullYear() + a.timeHorizon));
    return endYear - startYear;
  }, [activeAccounts]);

  // Effective projection years (override or natural)
  const effectiveProjectionYears = projectionYearsOverride ?? naturalTimeHorizon;

  // Run portfolio simulation
  const simulation: PortfolioSimulationResult = useMemo(() => {
    return runPortfolioMonteCarloSimulation(
      activeAccounts,
      numSimulations,
      globalVolatilityOverride,
      assetOverridesForSimulation,
      projectionYearsOverride ?? undefined
    );
  }, [activeAccounts, numSimulations, globalVolatilityOverride, assetOverridesForSimulation, projectionYearsOverride]);

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

  const handleGlobalVolatilityChange = useCallback((value: number) => {
    setGlobalVolatilityOverride(value);
  }, []);

  const handleAssetReturnOverride = useCallback((assetName: string, value: number | null) => {
    setAssetOverrides(prev => {
      const next = new Map(prev);
      const key = assetName.toLowerCase().trim();
      const existing = next.get(key) || { returnOverride: null, globalVolatilityOverride: null };
      next.set(key, { ...existing, returnOverride: value });
      return next;
    });
  }, []);

  const handleAssetVolatilityOverride = useCallback((assetName: string, value: number | null) => {
    setAssetOverrides(prev => {
      const next = new Map(prev);
      const key = assetName.toLowerCase().trim();
      const existing = next.get(key) || { returnOverride: null, globalVolatilityOverride: null };
      next.set(key, { ...existing, globalVolatilityOverride: value });
      return next;
    });
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
          <SegmentedToggle
            options={SIMULATION_COUNTS.map(count => ({ value: String(count), label: count.toLocaleString() }))}
            value={String(numSimulations)}
            onChange={(v) => setNumSimulations(Number(v))}
            size="sm"
          />
        </div>

        {/* Volatility Slider */}
        <div className="control-group volatility-control">
          <Slider
            label="Volatility"
            value={globalVolatilityOverride}
            onChange={handleGlobalVolatilityChange}
            min={0}
            max={50}
            step={1}
            showValue
            formatValue={(v) => `${v}%`}
          />
          <div className="volatility-presets">
            {[0, 5, 10, 15, 20, 25, 30].map(v => (
              <button
                key={v}
                className={`preset-btn ${globalVolatilityOverride === v ? 'active' : ''}`}
                onClick={() => handleGlobalVolatilityChange(v)}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>

        {/* Projection Years Slider */}
        <div className="control-group projection-years-control">
          <Slider
            label={
              <>
                Projection{projectionYearsOverride !== null && (
                  <button 
                    className="reset-btn" 
                    onClick={() => setProjectionYearsOverride(null)}
                    title="Reset to natural horizon"
                  >
                    ↺
                  </button>
                )}
              </>
            }
            value={effectiveProjectionYears}
            onChange={(v) => setProjectionYearsOverride(v)}
            min={1}
            max={100}
            step={1}
            showValue
            formatValue={(v) => `${v} years`}
          />
        </div>

        {/* Scale Toggle */}
        <div className="control-group scale-toggle-control">
          <label>Y-Axis Scale</label>
          <SegmentedToggle
            options={[
              { value: 'linear', label: 'Linear' },
              { value: 'log', label: 'Log' },
            ]}
            value={useLogScale ? 'log' : 'linear'}
            onChange={(v) => setUseLogScale(v === 'log')}
            size="sm"
          />
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
                {numSimulations.toLocaleString()} simulations · {globalVolatilityOverride}% volatility · {timeHorizon} year horizon
                {useLogScale && ' · Log scale'}
              </div>
            </div>
            <div className="chart-container">
              <MonteCarloChart simulation={simulation} useLogScale={useLogScale} />
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
            <Button
              variant="ghost"
              onClick={() => setShowHistogram(!showHistogram)}
              leftIcon={<BarChart3 size={16} />}
            >
              Distribution
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowDataTable(!showDataTable)}
              leftIcon={<Table size={16} />}
            >
              Data
            </Button>
          </div>

          {/* Histogram Section */}
          {showHistogram && finalValues.length > 0 && (
            <div className="histogram-section card">
              <div className="section-header">
                <h4>Final Value Distribution</h4>
                <div className="bin-control">
                  <Slider
                    label="Bins"
                    value={histogramBins}
                    onChange={setHistogramBins}
                    min={5}
                    max={100}
                    step={5}
                    showValue
                  />
                </div>
              </div>
              <div className="histogram-container">
                <HistogramChart
                  finalValues={finalValues}
                  stats={simulation.stats}
                  numBins={histogramBins}
                  useLogScale={useLogScale}
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

          {/* Consolidated Accounts Breakdown with Per-Asset Overrides */}
          <div className="consolidated-accounts-section card">
            <div className="section-header">
              <h4>Asset Settings</h4>
            </div>
            <div className="consolidated-accounts-list">
              {simulation.consolidatedAccounts.map(c => {
                // Calculate average annual cash flow from yearly data
                let totalCashFlow = 0;
                let activeYears = 0;
                c.yearlyData.forEach((data) => {
                  if (data.hasActiveData) {
                    totalCashFlow += data.netCashFlow;
                    activeYears++;
                  }
                });
                const avgCashFlow = activeYears > 0 ? totalCashFlow / activeYears : 0;
                const assetKey = c.name.toLowerCase().trim();
                const override = assetOverrides.get(assetKey);
                const currentReturn = override?.returnOverride ?? c.weightedReturn;
                const currentVolatility = override?.globalVolatilityOverride ?? globalVolatilityOverride;
                
                // Check if any underlying account is monthly
                const hasMonthlyAccounts = c.accounts.some(acc => acc.frequency === 'monthly');
                const hasAnnualAccounts = c.accounts.some(acc => acc.frequency === 'annual');
                const frequencyLabel = hasMonthlyAccounts && hasAnnualAccounts 
                  ? 'mixed' 
                  : hasMonthlyAccounts 
                    ? 'monthly' 
                    : 'annual';
                
                return (
                  <div key={c.name} className="consolidated-account-item expandable">
                    <div className="account-header">
                      <div className="account-name-row">
                        <span className="account-name">{c.name}</span>
                        <span className={`frequency-badge ${frequencyLabel}`}>
                          {frequencyLabel === 'monthly' ? '●●●' : frequencyLabel === 'mixed' ? '●○' : '●'}
                        </span>
                      </div>
                      <div className="account-summary">
                        <span className="initial-value">
                          {c.initialValue.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })}
                        </span>
                        <span className={`cash-flow ${avgCashFlow >= 0 ? 'positive' : 'negative'}`}>
                          {avgCashFlow >= 0 ? '+' : ''}{avgCashFlow.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })}/yr
                        </span>
                      </div>
                    </div>
                    <div className="account-overrides">
                      <div className="override-control">
                        <NumberInput
                          label="Return %"
                          value={currentReturn}
                          onChange={(v) => handleAssetReturnOverride(c.name, v ?? null)}
                          min={0}
                          max={50}
                          step={0.5}
                        />
                      </div>
                      <div className="override-control">
                        <NumberInput
                          label="σ %"
                          value={currentVolatility}
                          onChange={(v) => handleAssetVolatilityOverride(c.name, v ?? null)}
                          min={0}
                          max={100}
                          step={1}
                        />
                      </div>
                      <div className="override-info">
                        <span className="year-range">{c.startYear}–{c.endYear}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
