/**
 * ProjectionPortfolioPanel — Combined portfolio projection with market crash support
 * 
 * FEATURES:
 * - Portfolio Monte Carlo simulation with market crash support
 * - Crash year slider under the Monte Carlo chart
 * - Toggle individual cash flows and crash scenarios
 * 
 * NOTE: The bottom accounts strip is now handled at the App.tsx level
 * using the unified AccountsStrip component
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Account, useAppStore } from '../store/useAppStore';
import { useMarketCrashStore, getCrashFactor } from '../store/useMarketCrashStore';
import { runPortfolioMonteCarloSimulation, PortfolioSimulationResult } from '../utils/portfolioMonteCarlo';
import { MonteCarloChart } from './MonteCarloChart';
import { HistogramChart } from './HistogramChart';
import { CashFlowChart, getCashFlowData, getCashFlowColumns } from './CashFlowChart';
// PortfolioSummary replaced with inline summary-widget for unified ribbon design
import { CrashYearSlider } from './CrashYearSlider';
import { 
  Table, 
  TrendingUp, 
  Shield, 
  LineChart, 
  Download,
  Info,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ProjectionPortfolioPanelProps {
  accounts: Account[];
}

interface AssetOverride {
  returnOverride: number | null;
  globalVolatilityOverride: number | null;
}

const DEFAULT_INFLATION_RATE = 2.5;

export function ProjectionPortfolioPanel({ accounts }: ProjectionPortfolioPanelProps) {
  // Portfolio selection from store
  const portfolioSelectedIds = useAppStore((state) => state.portfolioSelectedIds);
  const togglePortfolioAccount = useAppStore((state) => state.togglePortfolioAccount);
  
  // Get persisted simulation settings from store
  const simulationSettings = useAppStore((state) => state.simulationSettings);
  const setSimulationSettings = useAppStore((state) => state.setSimulationSettings);
  
  // Market crash store
  const { crashes, activeCrashId } = useMarketCrashStore();
  const enabledCrashes = useMemo(() => crashes.filter(c => c.isEnabled), [crashes]);

  // Mode toggle: deterministic vs stochastic
  const [isDeterministic, setIsDeterministic] = useState(false);
  
  // Use persisted settings
  const numSimulations = simulationSettings.numSimulations;
  const globalVolatilityOverride = simulationSettings.volatilityOverride;
  const projectionYearsOverride = simulationSettings.projectionYearsOverride;
  const adjustForInflation = simulationSettings.adjustForInflation;
  const useLogScale = simulationSettings.useLogScale;
  
  // Local-only state (not persisted)
  const [histogramBins, setHistogramBins] = useState(20);
  const [activeView, setActiveView] = useState<'projection' | 'distribution' | 'table'>('projection');
  const [showCashFlowTable, setShowCashFlowTable] = useState(false);
  const [isCashFlowCollapsed, setIsCashFlowCollapsed] = useState(false);
  
  // Update handlers for persisted settings
  const setGlobalVolatilityOverride = useCallback((value: number) => {
    setSimulationSettings({ volatilityOverride: value });
  }, [setSimulationSettings]);
  
  const setProjectionYearsOverride = useCallback((value: number | null) => {
    setSimulationSettings({ projectionYearsOverride: value });
  }, [setSimulationSettings]);
  
  const setAdjustForInflation = useCallback((value: boolean) => {
    setSimulationSettings({ adjustForInflation: value });
  }, [setSimulationSettings]);
  
  const setUseLogScale = useCallback((value: boolean) => {
    setSimulationSettings({ useLogScale: value });
  }, [setSimulationSettings]);
  
  // Per-asset overrides
  const [assetOverrides, setAssetOverrides] = useState<Map<string, AssetOverride>>(new Map());

  // Ensure deterministic mode never shows the distribution view
  useEffect(() => {
    if (isDeterministic && activeView === 'distribution') {
      setActiveView('projection');
    }
  }, [isDeterministic, activeView]);

  // Filter accounts based on selection
  const activeAccounts = useMemo(() => {
    return accounts.filter(acc => portfolioSelectedIds.has(acc.id));
  }, [accounts, portfolioSelectedIds]);

  // Build per-asset overrides map for simulation
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

  // Calculate natural values from accounts
  const naturalValues = useMemo(() => {
    if (activeAccounts.length === 0) return { initialValue: 0, timeHorizon: 30, startYear: new Date().getFullYear() };
    
    const depositAccounts = activeAccounts.filter(a => a.transactionType === 'deposit');
    const initialValue = depositAccounts.reduce((sum, a) => sum + (a.amount || 0), 0);
    
    const startYear = Math.min(...activeAccounts.map(a => new Date(a.date).getFullYear()));
    const endYear = Math.max(...activeAccounts.map(a => new Date(a.date).getFullYear() + a.timeHorizon));
    const timeHorizon = endYear - startYear;
    
    return { initialValue, timeHorizon, startYear };
  }, [activeAccounts]);

  // Effective values
  const effectiveProjectionYears = projectionYearsOverride ?? naturalValues.timeHorizon;

  // Effective volatility for simulation
  const effectiveVolatility = isDeterministic ? 0 : globalVolatilityOverride;
  const effectiveSimulations = isDeterministic ? 1 : numSimulations;

  // Run portfolio simulation
  const baseSimulation: PortfolioSimulationResult = useMemo(() => {
    return runPortfolioMonteCarloSimulation(
      activeAccounts,
      effectiveSimulations,
      effectiveVolatility,
      assetOverridesForSimulation,
      projectionYearsOverride ?? undefined
    );
  }, [activeAccounts, effectiveSimulations, effectiveVolatility, assetOverridesForSimulation, projectionYearsOverride]);

  // Apply market crashes to simulation results
  const simulation = useMemo(() => {
    if (enabledCrashes.length === 0) return baseSimulation;

    // Apply crash factors to all paths and percentiles
    const adjustedPaths = baseSimulation.paths.map(path => {
      const adjustedValues = path.values.map((value, idx) => {
        const year = baseSimulation.years[idx];
        const crashFactor = getCrashFactor(year, enabledCrashes);
        return value * crashFactor;
      });
      return {
        ...path,
        values: adjustedValues,
        finalValue: adjustedValues[adjustedValues.length - 1],
      };
    });

    // Recalculate percentiles with crash-adjusted values
    const adjustedPercentiles: Record<number, number[]> = {};
    Object.keys(baseSimulation.percentiles).forEach(p => {
      const pNum = parseInt(p);
      adjustedPercentiles[pNum] = baseSimulation.percentiles[pNum].map((value, idx) => {
        const year = baseSimulation.years[idx];
        const crashFactor = getCrashFactor(year, enabledCrashes);
        return value * crashFactor;
      });
    });

    // Recalculate stats with full structure
    const finalValues = adjustedPaths.map(p => p.finalValue);
    const sortedFinalValues = [...finalValues].sort((a, b) => a - b);
    const mean = finalValues.reduce((a, b) => a + b, 0) / finalValues.length;
    const squaredDiffs = finalValues.map(x => Math.pow(x - mean, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / finalValues.length);
    
    const percentileFn = (p: number) => {
      const index = (p / 100) * (sortedFinalValues.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      if (lower === upper) return sortedFinalValues[lower];
      return sortedFinalValues[lower] + (sortedFinalValues[upper] - sortedFinalValues[lower]) * (index - lower);
    };
    
    return {
      ...baseSimulation,
      paths: adjustedPaths,
      percentiles: adjustedPercentiles,
      stats: {
        ...baseSimulation.stats,
        finalValues: {
          min: Math.min(...finalValues),
          max: Math.max(...finalValues),
          mean,
          median: percentileFn(50),
          stdDev,
          percentile1: percentileFn(1),
          percentile10: percentileFn(10),
          percentile25: percentileFn(25),
          percentile50: percentileFn(50),
          percentile75: percentileFn(75),
          percentile90: percentileFn(90),
          percentile99: percentileFn(99),
        },
        survivalRate: (adjustedPaths.filter(p => p.finalValue > 0).length / adjustedPaths.length) * 100,
      },
    };
  }, [baseSimulation, enabledCrashes]);

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

  // Calculate totals
  const totalInitialValue = naturalValues.initialValue;
  const timeHorizon = simulation.years.length > 1 
    ? simulation.years[simulation.years.length - 1] - simulation.years[0]
    : 0;

  // Cash flow totals
  const cashFlowTotals = useMemo(() => {
    let contributions = 0;
    let withdrawals = 0;
    
    activeAccounts.forEach(acc => {
      const annualAmount = acc.frequency === 'monthly' 
        ? acc.transactionAmount * 12 
        : acc.transactionAmount;
      const totalAmount = annualAmount * acc.timeHorizon;
      
      if (acc.transactionType === 'deposit') {
        contributions += totalAmount;
      } else {
        withdrawals += totalAmount;
      }
    });
    
    return { contributions, withdrawals };
  }, [activeAccounts]);

  // Cash flow data for table
  const cashFlowData = useMemo(() => getCashFlowData(activeAccounts), [activeAccounts]);
  const cashFlowColumns = useMemo(() => getCashFlowColumns(activeAccounts), [activeAccounts]);

  const handleGlobalVolatilityChange = useCallback((value: number) => {
    setGlobalVolatilityOverride(value);
  }, [setGlobalVolatilityOverride]);

  // Format currency helper
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `£${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `£${(value / 1000).toFixed(1)}k`;
    return `£${value.toFixed(0)}`;
  };

  // Calculate metrics for summary widget
  const metrics = useMemo(() => {
    const initialValue = totalInitialValue;
    const medianFinal = adjustedSimulation.stats.finalValues.median;
    const growthFromReturns = medianFinal - initialValue - (cashFlowTotals.contributions - cashFlowTotals.withdrawals);
    
    return {
      initialValue,
      medianFinal,
      totalContributions: cashFlowTotals.contributions,
      totalWithdrawals: cashFlowTotals.withdrawals,
      growthFromReturns,
      survivalRate: simulation.stats.survivalRate,
    };
  }, [totalInitialValue, adjustedSimulation.stats, cashFlowTotals, simulation.stats.survivalRate]);

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

  if (activeAccounts.length === 0) {
    return (
      <div className="empty-portfolio-state card">
        <div className="empty-state-content">
          <Shield size={48} className="empty-icon" />
          <h3>No Assets Selected</h3>
          <p>Toggle assets on from the ribbon below to see your combined portfolio projection.</p>
        </div>
      </div>
    );
  }

  const startYear = simulation.years[0];
  const endYear = simulation.years[simulation.years.length - 1];
  const hasActiveCrash = activeCrashId !== null;

  return (
    <div className="projection-portfolio-panel">
      {/* Top Controls Bar - Using unified projections-controls-bar class */}
      <div className="projections-controls-bar">
        <div className="controls-left">
          {/* Mode Toggle */}
          <div className="control-group mode-toggle">
            <button
              className={`mode-btn ${isDeterministic ? '' : 'active'}`}
              onClick={() => setIsDeterministic(false)}
              title="Monte Carlo simulation"
            >
              <Activity size={14} />
              Monte Carlo
            </button>
            <button
              className={`mode-btn ${isDeterministic ? 'active' : ''}`}
              onClick={() => setIsDeterministic(true)}
              title="Deterministic projection"
            >
              <Zap size={14} />
              Deterministic
            </button>
          </div>

          {/* Stacked Volatility & Projection Sliders */}
          <div className="control-group stacked-sliders">
            {/* Volatility Control */}
            {!isDeterministic && (
              <div className="slider-row">
                <label>Volatility: {globalVolatilityOverride}%</label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={globalVolatilityOverride}
                  onChange={(e) => handleGlobalVolatilityChange(parseInt(e.target.value))}
                  className="wide-slider"
                />
              </div>
            )}

            {/* Projection Years */}
            <div className="slider-row">
              <label>
                Projection: {effectiveProjectionYears}y
                {projectionYearsOverride !== null && (
                  <button 
                    className="reset-btn-inline" 
                    onClick={() => setProjectionYearsOverride(null)}
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
                value={effectiveProjectionYears}
                onChange={(e) => setProjectionYearsOverride(parseInt(e.target.value))}
                className="wide-slider"
              />
            </div>
          </div>

          <div className="controls-divider" />

          {/* Inflation Toggle */}
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
                ? `Values adjusted for ${DEFAULT_INFLATION_RATE}% annual inflation` 
                : 'Values shown in nominal terms'}
            >
              <Info size={12} />
            </button>
          </div>

          {/* Scale Toggle */}
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

        {/* Right Section: Summary Widget - Unified with ProjectionsPanelV2 */}
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
                  <span className="metric-sublabel">({timeHorizon}y)</span>
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

      <div className="portfolio-stack">
        <div className="triple-panel card">
          <div className="section-header triple-header">
            <div className="header-left">
              <h3>
                <TrendingUp size={18} className="header-icon" />
                Portfolio Outcomes
                {enabledCrashes.length > 0 && (
                  <span className="crash-indicator">
                    · {enabledCrashes.length} crash{enabledCrashes.length > 1 ? 'es' : ''}
                  </span>
                )}
              </h3>
              <div className="view-toggle">
                <button
                  className={activeView === 'projection' ? 'active' : ''}
                  onClick={() => setActiveView('projection')}
                >
                  Monte Carlo
                </button>
                {!isDeterministic && (
                  <button
                    className={activeView === 'distribution' ? 'active' : ''}
                    onClick={() => setActiveView('distribution')}
                  >
                    Final Value
                  </button>
                )}
                <button
                  className={activeView === 'table' ? 'active' : ''}
                  onClick={() => setActiveView('table')}
                >
                  Data Table
                </button>
                <div className="view-indicator" data-view={activeView} />
              </div>
            </div>
            <div className="section-meta">
              {!isDeterministic && `${numSimulations.toLocaleString()} sims · ${globalVolatilityOverride}% vol · `}
              {timeHorizon}y horizon
              {useLogScale && ' · Log'}
              {adjustForInflation && ' · Real'}
            </div>
          </div>

          <div className="triple-body">
            {activeView === 'projection' && (
              <>
                <div className="chart-container triple">
                  <MonteCarloChart simulation={adjustedSimulation} useLogScale={useLogScale} />
                </div>
                {hasActiveCrash && (
                  <CrashYearSlider startYear={startYear} endYear={endYear} />
                )}
              </>
            )}

            {activeView === 'distribution' && !isDeterministic && finalValues.length > 0 && (
              <div className="chart-container triple">
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
                <HistogramChart
                  finalValues={finalValues}
                  stats={adjustedSimulation.stats}
                  numBins={histogramBins}
                  useLogScale={useLogScale}
                />
              </div>
            )}

            {activeView === 'table' && (
              <div className="data-table-section card minimal">
                <div className="percentile-table-container">
                  <table className="percentile-table colorized">
                    <thead>
                      <tr>
                        <th>Year</th>
                        {!isDeterministic && <th style={{ color: '#ef4444' }}>1st</th>}
                        {!isDeterministic && <th style={{ color: '#f97316' }}>10th</th>}
                        <th style={{ color: '#22c55e' }}>25th</th>
                        <th style={{ color: '#eab308' }}>50th</th>
                        <th style={{ color: '#38bdf8' }}>75th</th>
                        {!isDeterministic && <th style={{ color: '#a855f7' }}>90th</th>}
                        {!isDeterministic && <th style={{ color: '#8b5cf6' }}>99th</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {adjustedSimulation.years.map((year, idx) => (
                        <tr key={year}>
                          <td>{year}</td>
                          {!isDeterministic && <td style={{ color: '#ef4444' }}>{formatValue(adjustedSimulation.percentiles[1][idx])}</td>}
                          {!isDeterministic && <td style={{ color: '#f97316' }}>{formatValue(adjustedSimulation.percentiles[10][idx])}</td>}
                          <td style={{ color: '#22c55e' }}>{formatValue(adjustedSimulation.percentiles[25][idx])}</td>
                          <td style={{ color: '#eab308' }}>{formatValue(adjustedSimulation.percentiles[50][idx])}</td>
                          <td style={{ color: '#38bdf8' }}>{formatValue(adjustedSimulation.percentiles[75][idx])}</td>
                          {!isDeterministic && <td style={{ color: '#a855f7' }}>{formatValue(adjustedSimulation.percentiles[90][idx])}</td>}
                          {!isDeterministic && <td style={{ color: '#8b5cf6' }}>{formatValue(adjustedSimulation.percentiles[99][idx])}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ───── Section: Cash Flow Panel (collapsible, default collapsed) ───── */}
        <div className={`chart-section card ${isCashFlowCollapsed ? 'collapsed' : ''}`}>
          <div className="section-header">
            {/* ───── Left: Title + Action Buttons ───── */}
            <div className="header-left">
              <h3>Portfolio Cash Flow</h3>
              <div className="header-actions">
                <button
                  className={`data-toggle-btn ${showCashFlowTable ? 'active' : ''}`}
                  onClick={() => setShowCashFlowTable(!showCashFlowTable)}
                >
                  {showCashFlowTable ? <LineChart size={14} /> : <Table size={14} />}
                  <span className="action-label">{showCashFlowTable ? 'Graph' : 'Data'}</span>
                </button>
                <button
                  className="download-btn download-csv"
                  onClick={() => downloadCSV(cashFlowData, cashFlowColumns, 'portfolio-cash-flow')}
                  title="Download CSV"
                >
                  <ChevronDown size={14} />
                  <span className="download-label">CSV</span>
                </button>
              </div>
            </div>
            {/* ───── Right: Collapse Toggle ───── */}
            <div className="section-right">
              <button
                className="collapse-btn"
                onClick={() => setIsCashFlowCollapsed(!isCashFlowCollapsed)}
                aria-label={isCashFlowCollapsed ? 'Expand cash flow chart' : 'Collapse cash flow chart'}
              >
                {isCashFlowCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>
          </div>
          {/* ───── Chart Container (hidden when collapsed) ───── */}
          {!isCashFlowCollapsed && (
            <div className="chart-container cashflow-tall">
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
                <CashFlowChart accounts={activeAccounts} />
              )}
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
