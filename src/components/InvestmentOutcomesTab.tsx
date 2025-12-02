/**
 * InvestmentOutcomesTab — Compare investment outcomes across asset types
 * 
 * Features:
 * - Combined lump sum + monthly contribution with escalation
 * - Multiple asset types with Monte Carlo simulation
 * - Per-asset volatility settings (no global equity volatility)
 * - Pension: 20% bonds / 80% equities mix
 * - Investment horizon slider with dynamic 30→60 year extension
 * - Modal-based asset editing with focus trap
 * - Contribution bar overlay on chart
 * - Results table with comma-separated formatting
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Settings, ChevronDown, ChevronUp, Plus, Minus, HelpCircle, X, Download } from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import html2canvas from 'html2canvas';
import {
  Currency,
  CURRENCY_SYMBOLS,
  AssetTypeId,
  AssetConfig,
  DEFAULT_ASSETS,
  SimulationResult,
  simulateAsset,
  calculateGrossPension,
} from '../utils/investmentSimulation';

/** Investment mode type */
type InvestmentMode = 'lump-sum' | 'monthly' | 'both';

/** View mode type */
type ViewMode = 'graph' | 'table';

/** Contribution display mode */
type ContributionDisplayMode = 'contributions' | 'lines-only' | 'bars-lines';

/** Contribution escalation options (annual % increase) */
const ESCALATION_OPTIONS = [0, 0.01, 0.02, 0.03, 0.04, 0.05];

/** Asset ordering for the sidebar */
const ASSET_ORDER: AssetTypeId[] = ['cash', 'savings', 'bonds', 'index-fund', 'pension'];

/** Primary currencies */
const PRIMARY_CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR'];
const SECONDARY_CURRENCIES: Currency[] = ['JPY', 'INR', 'CHF', 'CAD', 'AUD'];

/** Tax brackets for pension */
const TAX_BRACKETS = [
  { rate: 0.20, label: '20% (Basic)' },
  { rate: 0.40, label: '40% (Higher)' },
  { rate: 0.45, label: '45% (Additional)' },
];

/** Pension mix options for editing */
const PENSION_MIX_OPTIONS = [
  { equity: 1.0, bonds: 0.0, label: '100% Equities' },
  { equity: 0.8, bonds: 0.2, label: '80/20 (Default)' },
  { equity: 0.6, bonds: 0.4, label: '60/40 Balanced' },
  { equity: 0.4, bonds: 0.6, label: '40/60 Conservative' },
];

/** Extended asset config with pension mix */
interface ExtendedAssetConfig extends AssetConfig {
  pensionEquityRatio?: number;
  pensionBondRatio?: number;
}

/**
 * Calculate pension composite return and volatility based on mix
 * Uses weighted average for return and simplified weighted average for volatility
 */
function calculatePensionComposite(equityRatio: number): { expectedReturn: number; volatility: number } {
  const bondReturn = 0.03;    // 3% for bonds
  const equityReturn = 0.07;  // 7% for equities
  const bondVol = 0.05;       // 5% for bonds
  const equityVol = 0.15;     // 15% for equities
  
  const expectedReturn = bondReturn * (1 - equityRatio) + equityReturn * equityRatio;
  // Simplified weighted volatility (ignoring correlation for simplicity)
  const volatility = bondVol * (1 - equityRatio) + equityVol * equityRatio;
  
  return { expectedReturn, volatility };
}

/**
 * Format number with commas and full digits (no abbreviations)
 */
function formatFullNumber(value: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const absValue = Math.abs(value);
  const formatted = Math.round(absValue).toLocaleString('en-US');
  return value < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

/**
 * Format compact currency for chart axis
 */
function formatCompactCurrency(value: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const absValue = Math.abs(value);
  
  let formatted: string;
  if (absValue >= 1_000_000) {
    formatted = `${(absValue / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    formatted = `${(absValue / 1_000).toFixed(0)}K`;
  } else {
    formatted = absValue.toFixed(0);
  }
  
  return value < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function InvestmentOutcomesTab() {
  // ─── TOP CONTROLS STATE ───────────────────────────────────────────
  const [currency, setCurrency] = useState<Currency>('GBP');
  const [showMoreCurrencies, setShowMoreCurrencies] = useState(false);
  
  // ─── INVESTMENT MODE & VIEW MODE ──────────────────────────────────
  const [investmentMode, setInvestmentMode] = useState<InvestmentMode>('both');
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  
  // ─── INVESTMENT AMOUNTS ───────────────────────────────────────────
  const [lumpSumAmount, setLumpSumAmount] = useState(10000);
  const [monthlyAmount, setMonthlyAmount] = useState(500);
  const [contributionEscalation, setContributionEscalation] = useState(0); // Annual % increase
  
  // ─── HORIZON WITH DYNAMIC EXTENSION ───────────────────────────────
  const [horizonYears, setHorizonYears] = useState(20);
  const [horizonMax, setHorizonMax] = useState(30);
  
  // Handle dynamic horizon extension: when user reaches 30, extend to 60
  const handleHorizonChange = useCallback((value: number) => {
    setHorizonYears(value);
    if (value >= 30 && horizonMax === 30) {
      setHorizonMax(60);
    }
  }, [horizonMax]);
  
  // ─── ACTIVE ASSETS ────────────────────────────────────────────────
  const [activeAssets, setActiveAssets] = useState<Set<AssetTypeId>>(
    new Set(['cash', 'index-fund'])
  );
  
  // ─── ASSET CONFIGURATIONS (with overrides) ────────────────────────
  const [assetConfigs, setAssetConfigs] = useState<Record<AssetTypeId, ExtendedAssetConfig>>(() => {
    // Initialize with pension having 80/20 mix
    const configs = { ...DEFAULT_ASSETS } as Record<AssetTypeId, ExtendedAssetConfig>;
    const pensionComposite = calculatePensionComposite(0.8);
    configs.pension = {
      ...configs.pension,
      expectedReturn: pensionComposite.expectedReturn,
      volatility: pensionComposite.volatility,
      pensionEquityRatio: 0.8,
      pensionBondRatio: 0.2,
    };
    return configs;
  });
  
  // ─── CASH-SPECIFIC STATE ──────────────────────────────────────────
  const [cashApplyInflation, setCashApplyInflation] = useState(false);
  const [cashInflationRate, setCashInflationRate] = useState(0.03);
  
  // ─── PENSION-SPECIFIC STATE ───────────────────────────────────────
  const [pensionNetSacrifice, setPensionNetSacrifice] = useState(100);
  const [pensionTaxRate, setPensionTaxRate] = useState(0.40);
  const [pensionEquityMix, setPensionEquityMix] = useState(0.8);
  
  // ─── SAVINGS INTEREST RATE ────────────────────────────────────────
  const [savingsRate, setSavingsRate] = useState(0.04);
  
  // Savings rate increment/decrement by 0.25%
  const incrementSavingsRate = useCallback(() => {
    setSavingsRate(prev => Math.min(0.15, prev + 0.0025));
  }, []);
  
  const decrementSavingsRate = useCallback(() => {
    setSavingsRate(prev => Math.max(0, prev - 0.0025));
  }, []);
  
  // ─── UI STATE ─────────────────────────────────────────────────────
  const [tableExpanded, setTableExpanded] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetTypeId | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [pendingEditAsset, setPendingEditAsset] = useState<AssetTypeId | null>(null);
  const [contributionDisplay, setContributionDisplay] = useState<ContributionDisplayMode>('lines-only');
  
  // Modal ref for focus trap
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Chart ref for PNG export
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Focus trap for modal
  useEffect(() => {
    if (editingAsset && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector('button, input, select') as HTMLElement;
      firstFocusable?.focus();
    }
  }, [editingAsset]);
  
  // ─── TOGGLE ASSET (with minimum 1 enforcement) ────────────────────
  const toggleAsset = useCallback((assetId: AssetTypeId) => {
    setActiveAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        // Prevent removing if it's the last asset
        if (next.size <= 1) {
          return prev; // Don't allow removal
        }
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, []);
  
  // ─── EDIT ASSET (with confirmation for historical) ────────────────
  const handleEditAsset = useCallback((assetId: AssetTypeId) => {
    const config = assetConfigs[assetId];
    if (config.isHistorical && !config.customOverride) {
      setPendingEditAsset(assetId);
      setShowOverrideModal(true);
    } else {
      setEditingAsset(assetId);
    }
  }, [assetConfigs]);
  
  const confirmOverride = useCallback(() => {
    if (pendingEditAsset) {
      setAssetConfigs(prev => ({
        ...prev,
        [pendingEditAsset]: { ...prev[pendingEditAsset], customOverride: true },
      }));
      setEditingAsset(pendingEditAsset);
    }
    setShowOverrideModal(false);
    setPendingEditAsset(null);
  }, [pendingEditAsset]);
  
  const closeEditModal = useCallback(() => {
    setEditingAsset(null);
  }, []);
  
  // ─── UPDATE ASSET CONFIG ──────────────────────────────────────────
  const updateAssetConfig = useCallback((
    assetId: AssetTypeId,
    updates: Partial<ExtendedAssetConfig>
  ) => {
    setAssetConfigs(prev => ({
      ...prev,
      [assetId]: { ...prev[assetId], ...updates },
    }));
  }, []);
  
  // Update pension mix and recalculate composite
  const updatePensionMix = useCallback((equityRatio: number) => {
    setPensionEquityMix(equityRatio);
    const composite = calculatePensionComposite(equityRatio);
    setAssetConfigs(prev => ({
      ...prev,
      pension: {
        ...prev.pension,
        expectedReturn: composite.expectedReturn,
        volatility: composite.volatility,
        pensionEquityRatio: equityRatio,
        pensionBondRatio: 1 - equityRatio,
      },
    }));
  }, []);
  
  // ─── RUN SIMULATIONS ──────────────────────────────────────────────
  // Compute effective amounts based on investment mode
  const effectiveLumpSum = investmentMode === 'monthly' ? 0 : lumpSumAmount;
  const effectiveMonthly = investmentMode === 'lump-sum' ? 0 : monthlyAmount;
  
  const simulations = useMemo(() => {
    const results: Map<AssetTypeId, SimulationResult> = new Map();
    const activeList = Array.from(activeAssets);
    const isSingleAsset = activeList.length === 1;
    const numPaths = isSingleAsset ? 200 : 1;
    
    activeList.forEach(assetId => {
      let config = { ...assetConfigs[assetId] };
      
      // Apply savings rate override
      if (assetId === 'savings') {
        config.expectedReturn = savingsRate;
      }
      
      const result = simulateAsset(
        config,
        'lump-sum', // Always use lump-sum mode but with both amounts
        effectiveLumpSum,
        effectiveMonthly,
        horizonYears,
        numPaths,
        undefined, // No global volatility override - each asset uses its own
        assetId === 'cash' ? { applyInflation: cashApplyInflation, inflationRate: cashInflationRate } : undefined,
        assetId === 'pension' ? { netSacrifice: pensionNetSacrifice, marginalTaxRate: pensionTaxRate } : undefined,
        (investmentMode === 'monthly' || investmentMode === 'both') ? contributionEscalation : 0, // Escalation applies when monthly is involved
      );
      
      results.set(assetId, result);
    });
    
    return results;
  }, [
    activeAssets, assetConfigs, effectiveLumpSum, effectiveMonthly,
    horizonYears, cashApplyInflation, cashInflationRate,
    pensionNetSacrifice, pensionTaxRate, savingsRate, contributionEscalation, investmentMode,
  ]);
  
  // ─── CHART DATA ───────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const activeList = Array.from(activeAssets);
    if (activeList.length === 0) return [];
    
    const firstResult = simulations.get(activeList[0]);
    if (!firstResult) return [];
    
    // Generate yearly data points for cleaner x-axis
    const yearlyData: Record<string, number>[] = [];
    // Compute effective escalation when monthly is involved
    const effectiveEscalation = (investmentMode === 'monthly' || investmentMode === 'both') ? contributionEscalation : 0;
    
    for (let year = 0; year <= horizonYears; year++) {
      const monthIdx = year * 12;
      if (monthIdx >= firstResult.timePoints.length) break;
      
      const point: Record<string, number> = {
        year: year,
      };
      
      // Calculate cumulative contributions for this year
      let cumulativeContribution = effectiveLumpSum;
      for (let m = 1; m <= year * 12; m++) {
        const yearOfMonth = Math.floor((m - 1) / 12);
        const escalatedMonthly = effectiveMonthly * Math.pow(1 + effectiveEscalation, yearOfMonth);
        cumulativeContribution += escalatedMonthly;
      }
      point.contribution = cumulativeContribution;
      
      activeList.forEach(assetId => {
        const result = simulations.get(assetId);
        if (result && monthIdx < result.medianPath.length) {
          point[`${assetId}_median`] = result.medianPath[monthIdx];
        }
      });
      
      yearlyData.push(point);
    }
    
    return yearlyData;
  }, [simulations, activeAssets, horizonYears, effectiveLumpSum, effectiveMonthly, contributionEscalation, investmentMode]);
  
  // ─── TABLE DATA (yearly snapshots) ────────────────────────────────
  const tableData = useMemo(() => {
    const activeList = Array.from(activeAssets);
    if (activeList.length === 0) return [];
    
    const firstResult = simulations.get(activeList[0]);
    if (!firstResult) return [];
    
    return firstResult.timePoints
      .filter(tp => tp.month === 0)
      .map((tp) => {
        const monthIdx = tp.year * 12;
        const row: Record<string, number | string> = {
          year: tp.year,
          yearLabel: `Year ${tp.year}`,
        };
        
        activeList.forEach(assetId => {
          const result = simulations.get(assetId);
          if (result && monthIdx < result.medianPath.length) {
            row[assetId] = result.medianPath[monthIdx];
          }
        });
        
        return row;
      });
  }, [simulations, activeAssets]);
  
  // ─── DOWNLOAD CSV ─────────────────────────────────────────────────
  const handleDownloadCSV = useCallback(() => {
    const activeList = Array.from(activeAssets);
    const headers = ['Year', ...activeList.map(id => assetConfigs[id].name)];
    
    const rows = tableData.map(row => {
      return [
        row.yearLabel,
        ...activeList.map(id => 
          typeof row[id] === 'number' 
            ? Math.round(row[id] as number).toLocaleString('en-US')
            : ''
        ),
      ].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investment_outcomes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeAssets, assetConfigs, tableData]);
  
  // ─── DOWNLOAD PNG ─────────────────────────────────────────────────
  const handleDownloadPNG = useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#0f131c', // Match dark theme background
        scale: 2, // Higher resolution
      });
      
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `investment_outcomes_chart_${new Date().toISOString().split('T')[0]}.png`;
      a.click();
    } catch (err) {
      console.error('Failed to export chart as PNG:', err);
    }
  }, []);
  
  const isSingleAsset = activeAssets.size === 1;
  const symbol = CURRENCY_SYMBOLS[currency];
  const activeList = Array.from(activeAssets);
  
  // Generate tick marks for horizon slider
  const horizonTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = horizonMax <= 30 ? 5 : 10;
    for (let i = 0; i <= horizonMax; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [horizonMax]);
  
  // Generate x-axis ticks (1-year for horizons ≤ 30, 5-year for longer)
  const xAxisTicks = useMemo(() => {
    if (horizonYears <= 30) {
      // 1-year increments for ≤ 30 years
      return Array.from({ length: horizonYears + 1 }, (_, i) => i);
    } else {
      // 5-year increments for > 30 years
      const ticks: number[] = [0];
      for (let i = 5; i < horizonYears; i += 5) {
        ticks.push(i);
      }
      ticks.push(horizonYears);
      return ticks;
    }
  }, [horizonYears]);
  
  return (
    <div className="investment-outcomes-tab v3">
      {/* ─── ULTRA-COMPACT TOP RIBBON ─────────────────────────────────── */}
      <div className="outcomes-ribbon-v3">
        {/* Currency */}
        <div className="ribbon-section">
          <span className="ribbon-label">Currency</span>
          <div className="currency-buttons-compact">
            {PRIMARY_CURRENCIES.map(c => (
              <button
                key={c}
                className={`curr-btn ${currency === c ? 'active' : ''}`}
                onClick={() => setCurrency(c)}
              >
                {CURRENCY_SYMBOLS[c]}
              </button>
            ))}
            <div className="currency-more">
              <button
                className="curr-btn more"
                onClick={() => setShowMoreCurrencies(!showMoreCurrencies)}
              >
                <ChevronDown size={12} />
              </button>
              {showMoreCurrencies && (
                <div className="currency-dropdown">
                  {SECONDARY_CURRENCIES.map(c => (
                    <button
                      key={c}
                      className={`currency-dropdown-item ${currency === c ? 'active' : ''}`}
                      onClick={() => { setCurrency(c); setShowMoreCurrencies(false); }}
                    >
                      {CURRENCY_SYMBOLS[c]} {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="ribbon-section">
          <span className="ribbon-label">Mode</span>
          <div className="mode-toggle-compact">
            <button
              className={`mode-btn-sm ${investmentMode === 'lump-sum' ? 'active' : ''}`}
              onClick={() => setInvestmentMode('lump-sum')}
            >
              Lump
            </button>
            <button
              className={`mode-btn-sm ${investmentMode === 'monthly' ? 'active' : ''}`}
              onClick={() => setInvestmentMode('monthly')}
            >
              Monthly
            </button>
            <button
              className={`mode-btn-sm ${investmentMode === 'both' ? 'active' : ''}`}
              onClick={() => setInvestmentMode('both')}
            >
              Both
            </button>
          </div>
        </div>

        {/* Amounts Row - All inline */}
        <div className="ribbon-section amounts-section">
          <span className="ribbon-label">Amounts</span>
          <div className="amounts-inline">
            {(investmentMode === 'lump-sum' || investmentMode === 'both') && (
              <div className="amount-field">
                <span className="field-prefix">{symbol}</span>
                <input
                  type="number"
                  value={lumpSumAmount}
                  onChange={(e) => setLumpSumAmount(parseFloat(e.target.value) || 0)}
                  min={0}
                  placeholder="Initial"
                />
                {investmentMode === 'both' && <span className="field-suffix">lump</span>}
              </div>
            )}
            {(investmentMode === 'monthly' || investmentMode === 'both') && (
              <div className="amount-field">
                <span className="field-prefix">{symbol}</span>
                <input
                  type="number"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(parseFloat(e.target.value) || 0)}
                  min={0}
                  placeholder="Monthly"
                />
                {investmentMode === 'both' && <span className="field-suffix">/mo</span>}
              </div>
            )}
            {(investmentMode === 'monthly' || investmentMode === 'both') && (
              <select
                value={contributionEscalation}
                onChange={(e) => setContributionEscalation(parseFloat(e.target.value))}
                className="escalation-select-compact"
              >
                {ESCALATION_OPTIONS.map(rate => (
                  <option key={rate} value={rate}>
                    {rate === 0 ? '+0%' : `+${(rate * 100).toFixed(0)}%`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Horizon Slider */}
        <div className="ribbon-section horizon-section">
          <span className="ribbon-label">Horizon <strong>{horizonYears}y</strong></span>
          <div className="horizon-slider-v3">
            <span className="horizon-edge">1</span>
            <input
              type="range"
              min={1}
              max={horizonMax}
              value={horizonYears}
              onChange={(e) => handleHorizonChange(parseInt(e.target.value))}
            />
            <span className="horizon-edge">{horizonMax}</span>
          </div>
        </div>

        {/* View Toggle */}
        <div className="ribbon-section">
          <span className="ribbon-label">View</span>
          <div className="view-toggle-compact">
            <button
              className={`view-btn-sm ${viewMode === 'graph' ? 'active' : ''}`}
              onClick={() => setViewMode('graph')}
            >
              Graph
            </button>
            <button
              className={`view-btn-sm ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT: ASSET SIDEBAR + GRAPH ────────────────────────── */}
      <div className="outcomes-main-layout">
        {/* LEFT: Asset Selector (Vertical Stack) */}
        <div className="asset-sidebar">
          <h4 className="sidebar-title">Assets</h4>
          <div className="asset-list-vertical">
            {ASSET_ORDER.map(assetId => {
              const config = assetConfigs[assetId];
              const isActive = activeAssets.has(assetId);
              const isLastActive = isActive && activeAssets.size === 1;
              
              return (
                <div
                  key={assetId}
                  className={`asset-row ${isActive ? 'active' : ''}`}
                  style={{ '--asset-color': config.color } as React.CSSProperties}
                >
                  <button
                    className="asset-toggle"
                    onClick={() => toggleAsset(assetId)}
                    disabled={isLastActive}
                  >
                    <span className="asset-dot" style={{ backgroundColor: isActive ? config.color : 'transparent' }} />
                    <span className="asset-name">{config.name}</span>
                  </button>
                  <div className="asset-actions">
                    <button className="icon-btn" onClick={() => handleEditAsset(assetId)} title="Settings">
                      <Settings size={14} />
                    </button>
                    <button className="icon-btn" title={getAssetTooltip(assetId)}>
                      <HelpCircle size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Graph or Table */}
        <div className="outcomes-content">
          {viewMode === 'graph' && (
            <div className="graph-container" ref={chartRef}>
              {/* Top controls row */}
              <div className="graph-top-controls">
                {/* Left: Contribution display toggle */}
                <div className="contribution-display-toggle">
                  <button
                    className={contributionDisplay === 'contributions' ? 'active' : ''}
                    onClick={() => setContributionDisplay('contributions')}
                  >
                    Contributions
                  </button>
                  <button
                    className={contributionDisplay === 'lines-only' ? 'active' : ''}
                    onClick={() => setContributionDisplay('lines-only')}
                  >
                    Lines Only
                  </button>
                  <button
                    className={contributionDisplay === 'bars-lines' ? 'active' : ''}
                    onClick={() => setContributionDisplay('bars-lines')}
                  >
                    Bars + Lines
                  </button>
                </div>

                {/* Right: Legend + Export */}
                <div className="graph-top-right">
                  {/* Export Button */}
                  <button className="export-btn-sm" onClick={handleDownloadPNG} title="Download PNG">
                    <Download size={14} />
                    PNG
                  </button>
                </div>
              </div>

              {/* Legend Card (top-right) */}
              <div className="legend-card">
                {activeList.map(assetId => {
                  const config = assetConfigs[assetId];
                  const result = simulations.get(assetId);
                  if (!result) return null;
                  
                  const isGain = result.finalValue >= result.totalContributed;
                  const gainLoss = result.finalValue - result.totalContributed;
                  
                  return (
                    <div key={assetId} className="legend-row">
                      <span className="legend-dot" style={{ backgroundColor: config.color }} />
                      <span className="legend-name">{config.name}</span>
                      <span className={`legend-value ${isGain ? 'gain' : 'loss'}`}>
                        {formatFullNumber(result.finalValue, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart */}
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="year"
                      stroke="rgba(255,255,255,0.4)"
                      tickFormatter={(v) => `${v}`}
                      ticks={xAxisTicks}
                      tick={{ fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                      type="number"
                      domain={[0, horizonYears]}
                      allowDecimals={false}
                      interval={0}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.4)"
                      tickFormatter={(v) => formatCompactCurrency(v, currency)}
                      tick={{ fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15, 19, 28, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'contribution') {
                          return [formatFullNumber(value, currency), 'Contributed'];
                        }
                        const assetId = name.replace('_median', '') as AssetTypeId;
                        return [formatFullNumber(value, currency), assetConfigs[assetId]?.name || name];
                      }}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    
                    {/* Contribution bars (green, rounded, behind lines) */}
                    {(contributionDisplay === 'contributions' || contributionDisplay === 'bars-lines') && (
                      <Bar
                        dataKey="contribution"
                        name="contribution"
                        fill="rgba(34, 197, 94, 0.25)"
                        stroke="rgba(34, 197, 94, 0.5)"
                        strokeWidth={1}
                        radius={[4, 4, 0, 0]}
                      />
                    )}
                    
                    {/* Lines for each active asset */}
                    {contributionDisplay !== 'contributions' && activeList.map(assetId => {
                      const config = assetConfigs[assetId];
                      return (
                        <Line
                          key={assetId}
                          type="monotone"
                          dataKey={`${assetId}_median`}
                          name={`${assetId}_median`}
                          stroke={config.color}
                          strokeWidth={isSingleAsset ? 3 : 2}
                          dot={false}
                        />
                      );
                    })}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {viewMode === 'table' && (
            <div className="table-container">
              <div className="table-header-row">
                <h4>Results Over Time</h4>
                <button className="export-btn-sm" onClick={handleDownloadCSV} title="Download CSV">
                  <Download size={14} />
                  CSV
                </button>
              </div>
              <div className={`table-scroll ${tableExpanded ? 'expanded' : ''}`}>
                <table className="outcomes-table-v3">
                  <thead>
                    <tr>
                      <th>Year</th>
                      {activeList.map(assetId => (
                        <th key={assetId} style={{ color: assetConfigs[assetId].color }}>
                          {assetConfigs[assetId].name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(tableExpanded ? tableData : tableData.slice(0, 6)).map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.year}</td>
                        {activeList.map(assetId => (
                          <td key={assetId} style={{ color: assetConfigs[assetId].color }}>
                            {typeof row[assetId] === 'number'
                              ? formatFullNumber(row[assetId] as number, currency)
                              : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tableData.length > 6 && (
                <button className="expand-table-btn" onClick={() => setTableExpanded(!tableExpanded)}>
                  {tableExpanded ? 'Show Less' : `Show All ${tableData.length} Years`}
                  {tableExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── ASSET EDITING MODAL (Focus Trap) ─────────────────────────── */}
      {editingAsset && (
        <div className="modal-overlay editing-modal" onClick={closeEditModal}>
          <div 
            className="modal-content asset-edit-modal" 
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
          >
            <div className="modal-header">
              <h3 id="edit-modal-title">Configure {assetConfigs[editingAsset].name}</h3>
              <button className="modal-close" onClick={closeEditModal}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Cash config */}
              {editingAsset === 'cash' && (
                <>
                  <div className="config-field">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={cashApplyInflation}
                        onChange={(e) => setCashApplyInflation(e.target.checked)}
                      />
                      <span>Apply Inflation Erosion</span>
                    </label>
                  </div>
                  {cashApplyInflation && (
                    <div className="config-field">
                      <label>Inflation Rate</label>
                      <div className="slider-with-value">
                        <input
                          type="range"
                          min={0}
                          max={0.08}
                          step={0.005}
                          value={cashInflationRate}
                          onChange={(e) => setCashInflationRate(parseFloat(e.target.value))}
                        />
                        <span className="slider-value">{(cashInflationRate * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Savings config with ±0.25% buttons */}
              {editingAsset === 'savings' && (
                <div className="config-field">
                  <label>Interest Rate</label>
                  <div className="rate-input-with-buttons">
                    <button 
                      className="rate-adjust-btn"
                      onClick={decrementSavingsRate}
                      disabled={savingsRate <= 0}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={(savingsRate * 100).toFixed(2)}
                      onChange={(e) => setSavingsRate(parseFloat(e.target.value) / 100 || 0)}
                      step={0.25}
                      min={0}
                      max={15}
                      className="rate-input"
                    />
                    <span className="rate-suffix">%</span>
                    <button 
                      className="rate-adjust-btn"
                      onClick={incrementSavingsRate}
                      disabled={savingsRate >= 0.15}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="config-hint">Use ± buttons to adjust by 0.25%, or type any value</p>
                </div>
              )}
              
              {/* Pension config with mix selector */}
              {editingAsset === 'pension' && (
                <>
                  <div className="config-field">
                    <label>Net Monthly Sacrifice</label>
                    <div className="input-with-symbol modal-input">
                      <span className="symbol">{symbol}</span>
                      <input
                        type="number"
                        value={pensionNetSacrifice}
                        onChange={(e) => setPensionNetSacrifice(parseFloat(e.target.value) || 0)}
                        min={0}
                      />
                    </div>
                  </div>
                  <div className="config-field">
                    <label>Marginal Tax Rate</label>
                    <select
                      value={pensionTaxRate}
                      onChange={(e) => setPensionTaxRate(parseFloat(e.target.value))}
                      className="modal-select"
                    >
                      {TAX_BRACKETS.map(b => (
                        <option key={b.rate} value={b.rate}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="config-field">
                    <label>Investment Mix</label>
                    <select
                      value={pensionEquityMix}
                      onChange={(e) => updatePensionMix(parseFloat(e.target.value))}
                      className="modal-select"
                    >
                      {PENSION_MIX_OPTIONS.map(opt => (
                        <option key={opt.equity} value={opt.equity}>{opt.label}</option>
                      ))}
                    </select>
                    <p className="config-hint">
                      Composite: {(assetConfigs.pension.expectedReturn * 100).toFixed(1)}% return, {(assetConfigs.pension.volatility * 100).toFixed(0)}% volatility
                    </p>
                  </div>
                  <div className="pension-summary">
                    {symbol}{pensionNetSacrifice} net → {symbol}
                    {calculateGrossPension(pensionNetSacrifice, pensionTaxRate).toFixed(2)} gross (with tax relief)
                  </div>
                </>
              )}
              
              {/* Bonds, Index Fund, Car config */}
              {(editingAsset === 'bonds' || editingAsset === 'index-fund' || editingAsset === 'car') && (
                <>
                  <div className="config-field">
                    <label>Expected Annual Return</label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        value={(assetConfigs[editingAsset].expectedReturn * 100).toFixed(1)}
                        onChange={(e) => updateAssetConfig(editingAsset, {
                          expectedReturn: parseFloat(e.target.value) / 100,
                        })}
                        step={0.5}
                      />
                      <span className="suffix">%</span>
                    </div>
                  </div>
                  <div className="config-field">
                    <label>Annual Volatility</label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        value={(assetConfigs[editingAsset].volatility * 100).toFixed(1)}
                        onChange={(e) => updateAssetConfig(editingAsset, {
                          volatility: parseFloat(e.target.value) / 100,
                        })}
                        step={1}
                      />
                      <span className="suffix">%</span>
                    </div>
                  </div>
                  <div className="config-field">
                    <label>Annual Fee</label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        value={(assetConfigs[editingAsset].fee * 100).toFixed(2)}
                        onChange={(e) => updateAssetConfig(editingAsset, {
                          fee: parseFloat(e.target.value) / 100,
                        })}
                        step={0.05}
                      />
                      <span className="suffix">%</span>
                    </div>
                  </div>
                  {assetConfigs[editingAsset].isHistorical && (
                    <p className="config-warning">
                      ⚠️ These are based on historical data. Your changes will override the defaults.
                    </p>
                  )}
                </>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="modal-btn save" onClick={closeEditModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ─── OVERRIDE CONFIRMATION MODAL ─────────────────────────────── */}
      {showOverrideModal && (
        <div className="modal-overlay" onClick={() => setShowOverrideModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Override Historical Defaults?</h3>
            <p>
              These values are based on long-term historical data. 
              Are you sure you want to override them with your own assumptions?
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowOverrideModal(false)}>Cancel</button>
              <button className="confirm" onClick={confirmOverride}>Yes, Override</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Tooltip text for each asset type */
function getAssetTooltip(assetId: AssetTypeId): string {
  switch (assetId) {
    case 'cash':
      return 'Plain cash – stays flat or loses value to inflation. No growth, no risk.';
    case 'savings':
      return 'Savings account with fixed interest rate. Low risk, predictable returns.';
    case 'bonds':
      return 'Government bonds – lower risk, moderate returns (~3% historical). Good for stability.';
    case 'index-fund':
      return 'Diversified global equity index – higher volatility (~15%) but better long-term returns (~7%).';
    case 'pension':
      return 'Pension with tax relief. Your net sacrifice gets "grossed up" by your marginal tax rate. Default: 80% equities, 20% bonds.';
    case 'car':
      return 'Depreciating asset – loses ~15% value per year. Not an investment!';
    default:
      return '';
  }
}
