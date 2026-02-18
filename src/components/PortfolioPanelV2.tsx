/**
 * PortfolioPanel — Combined portfolio simulation with Monte Carlo and deterministic modes
 * 
 * FEATURES:
 * - Toggle between Monte Carlo (stochastic) and Deterministic modes
 * - Adjustable starting value slider
 * - Portfolio summary with key metrics
 * - Inflation adjustment toggle
 * - Cash flow visualization with data/graph toggle
 * - Survival rate vs starting balance scatter chart
 * - Histogram of final value distribution
 * - Resizable two-column layout (70/30 split)
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Account } from '../store/useAppStore';
import { runPortfolioMonteCarloSimulation, PortfolioSimulationResult } from '../utils/portfolioMonteCarlo';
import { MonteCarloChart } from './MonteCarloChart';
import { HistogramChart } from './HistogramChart';
import { CashFlowChart, getCashFlowData, getCashFlowColumns } from './CashFlowChart';
import { PortfolioSummary } from './PortfolioSummary';
// StartingValueSlider moved to ProjectionsPanelV2 only
// SurvivalScatterChart moved to ProjectionsPanelV2
import { 
  BarChart3, 
  Table, 
  TrendingUp, 
  Shield, 
  LineChart, 
  Download,
  Info,
  Zap,
  Activity
} from 'lucide-react';
import { Button, IconButton, NumberInput, Slider, SegmentedToggle } from '@quentinlachaud/app-component-library';

interface PortfolioPanelProps {
  accounts: Account[];
  selectedAccountIds: Set<string>;
}

interface AssetOverride {
  returnOverride: number | null;
  globalVolatilityOverride: number | null;
}

const SIMULATION_COUNTS = [10, 100, 1000] as const;
const DEFAULT_INFLATION_RATE = 2.5; // 2.5% annual inflation

export function PortfolioPanel({ accounts, selectedAccountIds }: PortfolioPanelProps) {
  // Mode toggle: deterministic vs stochastic (Monte Carlo)
  const [isDeterministic, setIsDeterministic] = useState(false);
  
  // Simulation settings
  const [numSimulations, setNumSimulations] = useState<number>(100);
  const [globalVolatilityOverride, setGlobalVolatilityOverride] = useState<number>(15);
  const [histogramBins, setHistogramBins] = useState(20);
  const [showHistogram, setShowHistogram] = useState(true);
  const [showDataTable, setShowDataTable] = useState(false);
  const [showCashFlowTable, setShowCashFlowTable] = useState(false);
  const [useLogScale, setUseLogScale] = useState(false);
  const [projectionYearsOverride, setProjectionYearsOverride] = useState<number | null>(null);
  const [adjustForInflation, setAdjustForInflation] = useState(false);
  
  // Starting value override (null = use natural initial value)
  const [startingValueOverride, setStartingValueOverride] = useState<number | null>(null);
  
  // Per-asset overrides
  const [assetOverrides, setAssetOverrides] = useState<Map<string, AssetOverride>>(new Map());

  // Resizable panel state (percentage-based for responsiveness)
  const [chartColumnWidth, setChartColumnWidth] = useState(70); // Default 70% width
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !splitPaneRef.current) return;
      
      const container = splitPaneRef.current;
      const rect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      
      // Clamp between 50% and 85%
      const clampedWidth = Math.min(85, Math.max(50, newWidth));
      setChartColumnWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Filter accounts based on selection
  const activeAccounts = useMemo(() => {
    return accounts.filter(acc => selectedAccountIds.has(acc.id));
  }, [accounts, selectedAccountIds]);

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
    if (activeAccounts.length === 0) return { initialValue: 0, timeHorizon: 30 };
    
    const depositAccounts = activeAccounts.filter(a => a.transactionType === 'deposit');
    const initialValue = depositAccounts.reduce((sum, a) => sum + (a.amount || 0), 0);
    
    const startYear = Math.min(...activeAccounts.map(a => new Date(a.date).getFullYear()));
    const endYear = Math.max(...activeAccounts.map(a => new Date(a.date).getFullYear() + a.timeHorizon));
    const timeHorizon = endYear - startYear;
    
    return { initialValue, timeHorizon };
  }, [activeAccounts]);

  // Effective values (override or natural)
  const effectiveStartingValue = startingValueOverride ?? naturalValues.initialValue;
  const effectiveProjectionYears = projectionYearsOverride ?? naturalValues.timeHorizon;

  // Effective volatility for simulation (0 for deterministic mode)
  const effectiveVolatility = isDeterministic ? 0 : globalVolatilityOverride;
  const effectiveSimulations = isDeterministic ? 1 : numSimulations;

  // Run portfolio simulation
  const simulation: PortfolioSimulationResult = useMemo(() => {
    // Apply starting value override to accounts
    const adjustedAccounts = startingValueOverride !== null
      ? activeAccounts.map(acc => {
          if (acc.transactionType === 'deposit') {
            const ratio = naturalValues.initialValue > 0 
              ? startingValueOverride / naturalValues.initialValue 
              : 1;
            return { ...acc, amount: (acc.amount || 0) * ratio };
          }
          return acc;
        })
      : activeAccounts;

    return runPortfolioMonteCarloSimulation(
      adjustedAccounts,
      effectiveSimulations,
      effectiveVolatility,
      assetOverridesForSimulation,
      projectionYearsOverride ?? undefined
    );
  }, [activeAccounts, effectiveSimulations, effectiveVolatility, assetOverridesForSimulation, projectionYearsOverride, startingValueOverride, naturalValues.initialValue]);

  // Apply inflation adjustment to simulation results if enabled
  const adjustedSimulation = useMemo(() => {
    if (!adjustForInflation) return simulation;
    
    const inflationFactor = (year: number, startYear: number) => {
      const years = year - startYear;
      return Math.pow(1 + DEFAULT_INFLATION_RATE / 100, years);
    };
    
    const startYear = simulation.years[0];
    
    // Adjust percentiles for inflation
    const adjustedPercentiles: Record<number, number[]> = {};
    Object.keys(simulation.percentiles).forEach(p => {
      const pNum = parseInt(p);
      adjustedPercentiles[pNum] = simulation.percentiles[pNum].map((val, idx) => {
        return val / inflationFactor(simulation.years[idx], startYear);
      });
    });
    
    // Adjust paths
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

  // Get final values for histogram
  const finalValues = useMemo(() => {
    return adjustedSimulation.paths.map(p => p.finalValue);
  }, [adjustedSimulation]);

  // Calculate total initial value
  const totalInitialValue = useMemo(() => {
    return effectiveStartingValue;
  }, [effectiveStartingValue]);

  // Calculate time horizon
  const timeHorizon = useMemo(() => {
    if (simulation.years.length < 2) return 0;
    return simulation.years[simulation.years.length - 1] - simulation.years[0];
  }, [simulation]);

  // Calculate total contributions and withdrawals
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

  // Cash flow data and columns for table view
  const cashFlowData = useMemo(() => getCashFlowData(activeAccounts), [activeAccounts]);
  const cashFlowColumns = useMemo(() => getCashFlowColumns(activeAccounts), [activeAccounts]);

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

  // Download CSV function
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
          <p>Toggle assets on from the bottom strip to see your combined portfolio projection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-panel-v2">
      {/* Top Controls Bar */}
      <div className="portfolio-controls-bar">
        {/* Left Section: Simulation Settings */}
        <div className="controls-left">
          {/* Mode Toggle */}
          <div className="control-group mode-toggle">
            <SegmentedToggle
              options={[
                { value: 'montecarlo', label: <><Activity size={14} /> Monte Carlo</> },
                { value: 'deterministic', label: <><Zap size={14} /> Deterministic</> },
              ]}
              value={isDeterministic ? 'deterministic' : 'montecarlo'}
              onChange={(v) => setIsDeterministic(v === 'deterministic')}
              size="sm"
            />
          </div>

          {/* Simulation Count (only for Monte Carlo) */}
          {!isDeterministic && (
            <div className="control-group simulations-control">
              <label>Simulations</label>
              <SegmentedToggle
                options={SIMULATION_COUNTS.map(count => ({
                  value: String(count),
                  label: count >= 1000 ? `${count / 1000}k` : String(count),
                }))}
                value={String(numSimulations)}
                onChange={(v) => setNumSimulations(Number(v))}
                size="sm"
              />
            </div>
          )}

          {/* Volatility Control (only for Monte Carlo) */}
          {!isDeterministic && (
            <div className="control-group volatility-control-compact">
              <div className="slider-with-presets">
                <Slider
                  value={globalVolatilityOverride}
                  onChange={handleGlobalVolatilityChange}
                  label="Volatility"
                  min={0}
                  max={50}
                  step={1}
                  showValue
                  formatValue={(v) => `${v}%`}
                />
                <div className="preset-btns">
                  {[0, 10, 20, 30].map(v => (
                    <button
                      key={v}
                      className={`preset-btn-sm ${globalVolatilityOverride === v ? 'active' : ''}`}
                      onClick={() => handleGlobalVolatilityChange(v)}
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
            <Slider
              value={effectiveProjectionYears}
              onChange={(v) => setProjectionYearsOverride(v)}
              label={
                <>
                  Projection
                  {projectionYearsOverride !== null && (
                    <button 
                      className="reset-btn-inline" 
                      onClick={() => setProjectionYearsOverride(null)}
                      title="Reset to natural horizon"
                    >
                      ↺
                    </button>
                  )}
                </>
              }
              min={1}
              max={100}
              step={1}
              showValue
              formatValue={(v) => `${v}y`}
            />
          </div>

          {/* Inflation Toggle */}
          <div className="control-group toggle-slider-group">
            <label>Values</label>
            <SegmentedToggle
              options={[
                { value: 'nominal', label: 'Nominal' },
                { value: 'real', label: 'Real' },
              ]}
              value={adjustForInflation ? 'real' : 'nominal'}
              onChange={(v) => setAdjustForInflation(v === 'real')}
              size="sm"
            />
            <IconButton
              icon={<Info size={12} />}
              label={adjustForInflation 
                ? `Values adjusted for ${DEFAULT_INFLATION_RATE}% annual inflation (real purchasing power)` 
                : 'Values shown in nominal terms (not adjusted for inflation)'}
              variant="ghost"
              size="sm"
              onClick={() => {}}
            />
          </div>

          {/* Scale Toggle */}
          <div className="control-group toggle-slider-group">
            <label>Scale</label>
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

        {/* Right Section: Portfolio Summary */}
        <div className="controls-right">
          <PortfolioSummary
            initialValue={totalInitialValue}
            medianFinalValue={adjustedSimulation.stats.finalValues.median}
            totalContributions={cashFlowTotals.contributions}
            totalWithdrawals={cashFlowTotals.withdrawals}
            survivalRate={simulation.stats.survivalRate}
            timeHorizon={timeHorizon}
            isDeterministic={isDeterministic}
          />
        </div>
      </div>

      {/* Main Content - Resizable Two-Column Layout */}
      <div className="portfolio-content-resizable" ref={splitPaneRef}>
        {/* Left Column: Charts */}
        <div 
          className="portfolio-charts-column"
          style={{ width: `${chartColumnWidth}%` }}
        >
          {/* Monte Carlo / Projection Chart */}
          <div className="chart-section card">
            <div className="section-header">
              <h3>
                <TrendingUp size={18} className="header-icon" />
                {isDeterministic ? 'Portfolio Projection' : 'Monte Carlo Projection'}
              </h3>
              <div className="section-meta">
                {!isDeterministic && `${numSimulations.toLocaleString()} simulations · ${globalVolatilityOverride}% volatility · `}
                {timeHorizon}y horizon
                {useLogScale && ' · Log scale'}
                {adjustForInflation && ' · Real values'}
              </div>
            </div>
            <div className="chart-container monte-carlo-chart">
              <MonteCarloChart simulation={adjustedSimulation} useLogScale={useLogScale} />
            </div>
          </div>

          {/* Cash Flow Chart */}
          <div className="chart-section card cashflow-section">
            <div className="section-header">
              <h3>Portfolio Cash Flow</h3>
              <div className="header-actions">
                <Button
                  variant={showCashFlowTable ? 'primary' : 'secondary'}
                  size="sm"
                  leftIcon={showCashFlowTable ? <LineChart size={14} /> : <Table size={14} />}
                  onClick={() => setShowCashFlowTable(!showCashFlowTable)}
                >
                  {showCashFlowTable ? 'Graph' : 'Data'}
                </Button>
                <IconButton
                  icon={<Download size={14} />}
                  label="Download as CSV"
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadCSV(cashFlowData, cashFlowColumns, 'portfolio-cash-flow')}
                />
              </div>
            </div>
            <div className="chart-container cashflow-extra-tall">
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
          </div>
        </div>

        {/* Resize Handle */}
        <div 
          className="resize-handle"
          onMouseDown={handleMouseDown}
        >
          <div className="resize-handle-inner" />
        </div>

        {/* Right Column: Analysis Panels */}
        <div 
          className="portfolio-side-column"
          style={{ width: `${100 - chartColumnWidth}%` }}
        >
          {/* Toggle Buttons */}
          <div className="side-panel-toggles">
            {!isDeterministic && (
              <Button
                variant={showHistogram ? 'primary' : 'secondary'}
                size="sm"
                leftIcon={<BarChart3 size={16} />}
                onClick={() => setShowHistogram(!showHistogram)}
              >
                Distribution
              </Button>
            )}
            <Button
              variant={showDataTable ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={<Table size={16} />}
              onClick={() => setShowDataTable(!showDataTable)}
            >
              Data
            </Button>
          </div>

          {/* Histogram Section */}
          {!isDeterministic && showHistogram && finalValues.length > 0 && (
            <div className="histogram-section card">
              <div className="section-header">
                <h4>Final Value Distribution</h4>
                <div className="bin-control">
                  <Slider
                    value={histogramBins}
                    onChange={(v) => setHistogramBins(v)}
                    label="Bins"
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
                  stats={adjustedSimulation.stats}
                  numBins={histogramBins}
                  useLogScale={useLogScale}
                />
              </div>
            </div>
          )}

          {/* Asset Settings */}
          <div className="asset-settings-section card">
            <div className="section-header">
              <h4>Asset Settings</h4>
            </div>
            <div className="asset-settings-list">
              {simulation.consolidatedAccounts.map(c => {
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
                
                return (
                  <div key={c.name} className="asset-setting-item">
                    <div className="asset-info">
                      <span className="asset-name">{c.name}</span>
                      <span className="asset-meta">
                        {c.initialValue.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })}
                        {' · '}
                        <span className={avgCashFlow >= 0 ? 'positive' : 'negative'}>
                          {avgCashFlow >= 0 ? '+' : ''}{avgCashFlow.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })}/yr
                        </span>
                      </span>
                    </div>
                    <div className="asset-overrides-compact">
                      <div className="override-field">
                        <NumberInput
                          value={currentReturn}
                          onChange={(val) => handleAssetReturnOverride(c.name, val ?? null)}
                          label="Return"
                          min={0}
                          max={50}
                          step={0.5}
                        />
                        <span>%</span>
                      </div>
                      {!isDeterministic && (
                        <div className="override-field">
                          <NumberInput
                            value={currentVolatility}
                            onChange={(val) => handleAssetVolatilityOverride(c.name, val ?? null)}
                            label="σ"
                            min={0}
                            max={100}
                            step={1}
                          />
                          <span>%</span>
                        </div>
                      )}
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
                        {!isDeterministic && <td>{formatValue(adjustedSimulation.percentiles[1][idx])}</td>}
                        {!isDeterministic && <td>{formatValue(adjustedSimulation.percentiles[10][idx])}</td>}
                        <td>{formatValue(adjustedSimulation.percentiles[25][idx])}</td>
                        <td className="highlight">{formatValue(adjustedSimulation.percentiles[50][idx])}</td>
                        <td>{formatValue(adjustedSimulation.percentiles[75][idx])}</td>
                        {!isDeterministic && <td>{formatValue(adjustedSimulation.percentiles[90][idx])}</td>}
                        {!isDeterministic && <td>{formatValue(adjustedSimulation.percentiles[99][idx])}</td>}
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
