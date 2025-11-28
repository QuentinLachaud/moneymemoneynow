/**
 * ProjectionsPanelV2 — Redesigned projections panel matching Portfolio tab design
 * 
 * FEATURES:
 * - Starting value slider on left
 * - Simulation summary widget in header
 * - Nominal/Real toggle (proper slider style)
 * - Linear/Log toggle (proper slider style)
 * - Projection years slider
 * - Volatility slider with presets
 * - Monte Carlo / Deterministic toggle
 * - Cash flow chart with Data/Graph toggle
 * - Distribution chart with Data toggle
 */

import { useState, useMemo, useCallback } from 'react';
import { Account } from '../store/useAppStore';
import { runMonteCarloSimulation, SimulationResult } from '../utils/monteCarlo';
import { MonteCarloChart } from './MonteCarloChart';
import { HistogramChart } from './HistogramChart';
import { CashFlowChart, getCashFlowData, getCashFlowColumns } from './CashFlowChart';
import { StartingValueSlider } from './StartingValueSlider';
import { 
  BarChart3, 
  Table, 
  TrendingUp, 
  LineChart, 
  Download,
  Info,
  Zap,
  Activity
} from 'lucide-react';

interface ProjectionsPanelV2Props {
  account: Account;
}

const SIMULATION_COUNTS = [10, 100, 1000] as const;
const DEFAULT_INFLATION_RATE = 2.5;

export function ProjectionsPanelV2({ account }: ProjectionsPanelV2Props) {
  // Mode toggle: deterministic vs stochastic
  const [isDeterministic, setIsDeterministic] = useState(false);
  
  // Simulation settings
  const [numSimulations, setNumSimulations] = useState<number>(100);
  const [volatilityOverride, setVolatilityOverride] = useState<number>(15);
  const [histogramBins, setHistogramBins] = useState(20);
  const [showHistogram, setShowHistogram] = useState(true);
  const [showDataTable, setShowDataTable] = useState(false);
  const [showCashFlowTable, setShowCashFlowTable] = useState(false);
  const [useLogScale, setUseLogScale] = useState(false);
  const [projectionYearsOverride, setProjectionYearsOverride] = useState<number | null>(null);
  const [adjustForInflation, setAdjustForInflation] = useState(false);
  
  // Starting value override
  const [startingValueOverride, setStartingValueOverride] = useState<number | null>(null);

  // Effective values
  const effectiveStartingValue = startingValueOverride ?? account.amount;
  const effectiveProjectionYears = projectionYearsOverride ?? account.timeHorizon;
  const effectiveVolatility = isDeterministic ? 0 : volatilityOverride;
  const effectiveSimulations = isDeterministic ? 1 : numSimulations;

  // Create modified account for simulation
  const modifiedAccount = useMemo(() => ({
    ...account,
    amount: effectiveStartingValue,
    timeHorizon: effectiveProjectionYears,
  }), [account, effectiveStartingValue, effectiveProjectionYears]);

  // Run simulation
  const simulation: SimulationResult = useMemo(() => {
    return runMonteCarloSimulation(
      modifiedAccount,
      effectiveSimulations,
      effectiveVolatility
    );
  }, [modifiedAccount, effectiveSimulations, effectiveVolatility]);

  // Apply inflation adjustment
  const adjustedSimulation = useMemo(() => {
    if (!adjustForInflation) return simulation;
    
    const inflationFactor = (year: number, startYear: number) => {
      const years = year - startYear;
      return Math.pow(1 + DEFAULT_INFLATION_RATE / 100, years);
    };
    
    const startYear = simulation.years[0];
    
    const adjustedPercentiles: Record<number, number[]> = {};
    Object.keys(simulation.percentiles).forEach(p => {
      const pNum = parseInt(p);
      adjustedPercentiles[pNum] = simulation.percentiles[pNum].map((val, idx) => {
        return val / inflationFactor(simulation.years[idx], startYear);
      });
    });
    
    const adjustedPaths = simulation.paths.map(path => ({
      ...path,
      values: path.values.map((val, idx) => val / inflationFactor(simulation.years[idx], startYear)),
      finalValue: path.finalValue / inflationFactor(simulation.years[simulation.years.length - 1], startYear),
    }));
    
    return {
      ...simulation,
      percentiles: adjustedPercentiles,
      paths: adjustedPaths,
    };
  }, [simulation, adjustForInflation]);

  // Final values for histogram
  const finalValues = useMemo(() => {
    return adjustedSimulation.paths.map(p => p.finalValue);
  }, [adjustedSimulation]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const initialValue = effectiveStartingValue;
    const medianFinal = adjustedSimulation.stats.finalValues.median;
    
    const annualContribution = account.transactionType === 'deposit'
      ? (account.frequency === 'monthly' ? account.transactionAmount * 12 : account.transactionAmount)
      : 0;
    const annualWithdrawal = account.transactionType === 'withdraw'
      ? (account.frequency === 'monthly' ? account.transactionAmount * 12 : account.transactionAmount)
      : 0;
    
    const totalContributions = annualContribution * effectiveProjectionYears;
    const totalWithdrawals = annualWithdrawal * effectiveProjectionYears;
    const netCashFlow = totalContributions - totalWithdrawals;
    const growthFromReturns = medianFinal - initialValue - netCashFlow;
    
    return {
      initialValue,
      medianFinal,
      totalContributions,
      totalWithdrawals,
      growthFromReturns,
      survivalRate: simulation.stats.survivalRate,
    };
  }, [effectiveStartingValue, adjustedSimulation.stats, account, effectiveProjectionYears, simulation.stats.survivalRate]);

  // Cash flow data
  const cashFlowData = useMemo(() => getCashFlowData([modifiedAccount]), [modifiedAccount]);
  const cashFlowColumns = useMemo(() => getCashFlowColumns([modifiedAccount]), [modifiedAccount]);

  const handleVolatilityChange = useCallback((value: number) => {
    setVolatilityOverride(value);
  }, []);

  // Download CSV
  const downloadCSV = useCallback((data: Array<Record<string, unknown>>, columns: Array<{ key: string; label: string }>, filename: string) => {
    const headers = columns.map(col => col.label).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const val = row[col.key];
        const strVal = String(val ?? '');
        return strVal.includes(',') || strVal.includes('"') 
          ? `"${strVal.replace(/"/g, '""')}"` 
          : strVal;
      }).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `£${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `£${(value / 1000).toFixed(1)}k`;
    return `£${value.toFixed(0)}`;
  };

  return (
    <div className="projections-panel-v2">
      {/* Top Controls Bar */}
      <div className="projections-controls-bar">
        {/* Left Section: Simulation Settings */}
        <div className="controls-left">
          {/* Mode Toggle */}
          <div className="control-group mode-toggle">
            <button
              className={`mode-btn ${isDeterministic ? '' : 'active'}`}
              onClick={() => setIsDeterministic(false)}
              title="Monte Carlo simulation with randomized returns"
            >
              <Activity size={14} />
              Monte Carlo
            </button>
            <button
              className={`mode-btn ${isDeterministic ? 'active' : ''}`}
              onClick={() => setIsDeterministic(true)}
              title="Deterministic projection using expected returns only"
            >
              <Zap size={14} />
              Deterministic
            </button>
          </div>

          {/* Simulation Count */}
          {!isDeterministic && (
            <div className="control-group simulations-control">
              <label>Simulations</label>
              <div className="btn-group-sm">
                {SIMULATION_COUNTS.map(count => (
                  <button
                    key={count}
                    className={`btn-sm ${numSimulations === count ? 'active' : ''}`}
                    onClick={() => setNumSimulations(count)}
                  >
                    {count >= 1000 ? `${count / 1000}k` : count}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Volatility Control */}
          {!isDeterministic && (
            <div className="control-group volatility-control-compact">
              <label>Volatility: {volatilityOverride}%</label>
              <div className="slider-with-presets">
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={volatilityOverride}
                  onChange={(e) => handleVolatilityChange(parseInt(e.target.value))}
                  className="compact-slider"
                />
                <div className="preset-btns">
                  {[0, 10, 20, 30].map(v => (
                    <button
                      key={v}
                      className={`preset-btn-sm ${volatilityOverride === v ? 'active' : ''}`}
                      onClick={() => handleVolatilityChange(v)}
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
              Projection: {effectiveProjectionYears}y
              {projectionYearsOverride !== null && (
                <button 
                  className="reset-btn-inline" 
                  onClick={() => setProjectionYearsOverride(null)}
                  title="Reset to account default"
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
              value={effectiveProjectionYears}
              onChange={(e) => setProjectionYearsOverride(parseInt(e.target.value))}
              className="projection-slider-wide"
            />
          </div>

          {/* Inflation Toggle - Slider Style */}
          <div className="control-group toggle-slider-group">
            <label>Values</label>
            <div className="toggle-slider">
              <button
                className={`toggle-option ${!adjustForInflation ? 'active' : ''}`}
                onClick={() => setAdjustForInflation(false)}
              >
                Nominal
              </button>
              <button
                className={`toggle-option ${adjustForInflation ? 'active' : ''}`}
                onClick={() => setAdjustForInflation(true)}
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
                ? `Values adjusted for ${DEFAULT_INFLATION_RATE}% annual inflation (real purchasing power)` 
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
                onClick={() => setUseLogScale(false)}
              >
                Linear
              </button>
              <button
                className={`toggle-option ${useLogScale ? 'active' : ''}`}
                onClick={() => setUseLogScale(true)}
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
          <div className="summary-widget">
            <div className="summary-metrics">
              <div className="metric-item initial">
                <span className="metric-label">Initial</span>
                <span className="metric-value">{formatCurrency(metrics.initialValue)}</span>
              </div>
              
              <div className="metric-divider">→</div>
              
              <div className="metric-item final">
                <span className="metric-label">
                  {isDeterministic ? 'Final' : 'Median'}
                  <span className="metric-sublabel">({effectiveProjectionYears}y)</span>
                </span>
                <span className="metric-value highlight">{formatCurrency(metrics.medianFinal)}</span>
              </div>

              <div className="metric-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">Returns</span>
                  <span className={`breakdown-value ${metrics.growthFromReturns >= 0 ? 'positive' : 'negative'}`}>
                    {metrics.growthFromReturns >= 0 ? '+' : ''}{formatCurrency(metrics.growthFromReturns)}
                  </span>
                </div>
                {metrics.totalContributions > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">Contrib</span>
                    <span className="breakdown-value positive">+{formatCurrency(metrics.totalContributions)}</span>
                  </div>
                )}
                {metrics.totalWithdrawals > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">Withdraw</span>
                    <span className="breakdown-value negative">-{formatCurrency(metrics.totalWithdrawals)}</span>
                  </div>
                )}
              </div>

              {!isDeterministic && (
                <div className="metric-item survival">
                  <span className="metric-label">Survival</span>
                  <span className={`metric-value ${metrics.survivalRate >= 95 ? 'excellent' : metrics.survivalRate >= 80 ? 'good' : 'warning'}`}>
                    {metrics.survivalRate.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="projections-content-v2">
        {/* Left: Starting Value Slider */}
        <div className="projections-left-slider">
          <StartingValueSlider
            value={effectiveStartingValue}
            max={account.amount * 3}
            onChange={setStartingValueOverride}
          />
        </div>

        {/* Center: Charts */}
        <div className="projections-charts">
          {/* Monte Carlo Chart */}
          <div className="chart-section card">
            <div className="section-header">
              <h3>
                <TrendingUp size={18} className="header-icon" />
                {isDeterministic ? 'Projection' : 'Monte Carlo'}: {account.name}
              </h3>
              <div className="section-meta">
                {!isDeterministic && `${numSimulations.toLocaleString()} sims · ${volatilityOverride}% vol · `}
                {effectiveProjectionYears}y horizon
                {useLogScale && ' · Log'}
                {adjustForInflation && ' · Real'}
              </div>
            </div>
            <div className="chart-container large">
              <MonteCarloChart simulation={adjustedSimulation} useLogScale={useLogScale} />
            </div>
          </div>

          {/* Cash Flow Chart */}
          <div className="chart-section card">
            <div className="section-header">
              <h3>Cash Flow: {account.name}</h3>
              <div className="header-actions">
                <button
                  className={`data-toggle-btn ${showCashFlowTable ? 'active' : ''}`}
                  onClick={() => setShowCashFlowTable(!showCashFlowTable)}
                >
                  {showCashFlowTable ? <LineChart size={14} /> : <Table size={14} />}
                  {showCashFlowTable ? 'Graph' : 'Data'}
                </button>
                <button
                  className="download-btn"
                  onClick={() => downloadCSV(cashFlowData, cashFlowColumns, `${account.name}-cash-flow`)}
                  title="Download as CSV"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
            <div className="chart-container compact">
              {showCashFlowTable ? (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {cashFlowColumns.map(col => (
                          <th key={col.key}>{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cashFlowData.map((row, idx) => (
                        <tr key={idx}>
                          {cashFlowColumns.map(col => (
                            <td key={col.key}>
                              {col.format 
                                ? col.format(row[col.key] as number) 
                                : row[col.key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <CashFlowChart accounts={[modifiedAccount]} />
              )}
            </div>
          </div>
        </div>

        {/* Right: Side Panel */}
        <div className="projections-side-panel">
          {/* Toggle Buttons */}
          <div className="side-panel-toggles">
            {!isDeterministic && (
              <button
                className={`toggle-btn ${showHistogram ? 'active' : ''}`}
                onClick={() => setShowHistogram(!showHistogram)}
              >
                <BarChart3 size={16} />
                Distribution
              </button>
            )}
            <button
              className={`toggle-btn ${showDataTable ? 'active' : ''}`}
              onClick={() => setShowDataTable(!showDataTable)}
            >
              <Table size={16} />
              Data
            </button>
          </div>

          {/* Histogram Section */}
          {!isDeterministic && showHistogram && finalValues.length > 0 && (
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
                  stats={adjustedSimulation.stats}
                  numBins={histogramBins}
                />
              </div>
            </div>
          )}

          {/* Data Table */}
          {showDataTable && (
            <div className="data-table-section card">
              <div className="section-header">
                <h4>Percentile Data</h4>
                <button
                  className="download-btn"
                  onClick={() => {
                    const data = adjustedSimulation.years.map((year, idx) => ({
                      year,
                      p1: adjustedSimulation.percentiles[1][idx],
                      p10: adjustedSimulation.percentiles[10][idx],
                      p25: adjustedSimulation.percentiles[25][idx],
                      p50: adjustedSimulation.percentiles[50][idx],
                      p75: adjustedSimulation.percentiles[75][idx],
                      p90: adjustedSimulation.percentiles[90][idx],
                      p99: adjustedSimulation.percentiles[99][idx],
                    }));
                    const cols = [
                      { key: 'year', label: 'Year' },
                      { key: 'p1', label: '1st' },
                      { key: 'p10', label: '10th' },
                      { key: 'p25', label: '25th' },
                      { key: 'p50', label: '50th' },
                      { key: 'p75', label: '75th' },
                      { key: 'p90', label: '90th' },
                      { key: 'p99', label: '99th' },
                    ];
                    downloadCSV(data, cols, `${account.name}-percentiles`);
                  }}
                  title="Download as CSV"
                >
                  <Download size={14} />
                </button>
              </div>
              <div className="percentile-table-container">
                <table className="percentile-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      {!isDeterministic && <th>1st</th>}
                      {!isDeterministic && <th>10th</th>}
                      <th>25th</th>
                      <th>50th</th>
                      <th>75th</th>
                      {!isDeterministic && <th>90th</th>}
                      {!isDeterministic && <th>99th</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {adjustedSimulation.years.map((year, idx) => (
                      <tr key={year}>
                        <td>{year}</td>
                        {!isDeterministic && <td>{formatCurrency(adjustedSimulation.percentiles[1][idx])}</td>}
                        {!isDeterministic && <td>{formatCurrency(adjustedSimulation.percentiles[10][idx])}</td>}
                        <td>{formatCurrency(adjustedSimulation.percentiles[25][idx])}</td>
                        <td className="highlight">{formatCurrency(adjustedSimulation.percentiles[50][idx])}</td>
                        <td>{formatCurrency(adjustedSimulation.percentiles[75][idx])}</td>
                        {!isDeterministic && <td>{formatCurrency(adjustedSimulation.percentiles[90][idx])}</td>}
                        {!isDeterministic && <td>{formatCurrency(adjustedSimulation.percentiles[99][idx])}</td>}
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
