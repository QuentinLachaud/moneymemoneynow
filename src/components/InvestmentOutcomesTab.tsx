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
import { useAppStore } from '../store/useAppStore';

/** Investment mode type */
type InvestmentMode = 'lump-sum' | 'monthly' | 'both';

/** View mode type */
type ViewMode = 'graph' | 'table';

/** Contribution escalation options (annual % increase) */
const ESCALATION_OPTIONS = [0, 0.01, 0.02, 0.03, 0.04, 0.05];

/** Asset ordering for the sidebar */
const ASSET_ORDER: AssetTypeId[] = ['cash', 'savings', 'bonds', 'index-fund', 'pension'];

/** Primary currencies */
const PRIMARY_CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR'];
const SECONDARY_CURRENCIES: Currency[] = ['JPY', 'INR', 'CHF', 'CAD', 'AUD'];

/** Tax brackets for pension - England */
const ENGLAND_TAX_BRACKETS = [
  { rate: 0.20, label: '20% Basic', band: 'basic' },
  { rate: 0.40, label: '40% Higher', band: 'higher' },
  { rate: 0.45, label: '45% Additional', band: 'additional' },
];

/** Tax brackets for pension - Scotland */
const SCOTLAND_TAX_BRACKETS = [
  { rate: 0.19, label: '19% Starter', band: 'starter' },
  { rate: 0.20, label: '20% Basic', band: 'basic' },
  { rate: 0.21, label: '21% Intermediate', band: 'intermediate' },
  { rate: 0.42, label: '42% Higher', band: 'higher' },
  { rate: 0.47, label: '47% Top', band: 'top' },
];

type TaxRegion = 'england' | 'scotland';

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
  // ─── PREFILL FROM SAVINGS CALCULATOR ──────────────────────────────
  const consumeInvestmentOutcomesPrefill = useAppStore((s) => s.consumeInvestmentOutcomesPrefill);
  
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
  const HORIZON_MIN = 5; // Minimum 5 years
  
  // Consume prefill from Savings Calculator (one-time on mount)
  useEffect(() => {
    const prefill = consumeInvestmentOutcomesPrefill();
    if (prefill) {
      if (prefill.monthlyAmount !== undefined) {
        setMonthlyAmount(prefill.monthlyAmount);
        // Switch to monthly mode if only monthly is provided
        if (prefill.lumpSumAmount === 0 || prefill.lumpSumAmount === undefined) {
          setInvestmentMode('monthly');
          setLumpSumAmount(0);
        }
      }
      if (prefill.lumpSumAmount !== undefined) {
        setLumpSumAmount(prefill.lumpSumAmount);
      }
    }
  }, [consumeInvestmentOutcomesPrefill]);
  
  // Handle dynamic horizon extension: when user reaches 30, extend to 60
  const handleHorizonChange = useCallback((value: number) => {
    const clampedValue = Math.max(HORIZON_MIN, value);
    setHorizonYears(clampedValue);
    if (clampedValue >= 30 && horizonMax === 30) {
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
  const [pensionTaxRegion, setPensionTaxRegion] = useState<TaxRegion>('england');
  const [showPensionTaxModal, setShowPensionTaxModal] = useState(false);
  const [pendingPensionTaxRate, setPendingPensionTaxRate] = useState(0.40);
  const [pendingPensionTaxRegion, setPendingPensionTaxRegion] = useState<TaxRegion>('england');
  
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
  
  // Graph display toggles (independent)
  const [showContributions, setShowContributions] = useState(false);  // Show contribution bars
  const [showRunningBalance, setShowRunningBalance] = useState(true); // Show asset lines (default ON)
  
  // Handler to toggle contributions (prevent both being OFF)
  const toggleContributions = useCallback(() => {
    setShowContributions(prev => {
      const newVal = !prev;
      // If turning off contributions and running balance is also off, turn running balance on
      if (!newVal && !showRunningBalance) {
        setShowRunningBalance(true);
      }
      return newVal;
    });
  }, [showRunningBalance]);
  
  // Handler to toggle running balance (prevent both being OFF)
  const toggleRunningBalance = useCallback(() => {
    setShowRunningBalance(prev => {
      const newVal = !prev;
      // If turning off running balance and contributions is also off, turn contributions on
      if (!newVal && !showContributions) {
        setShowContributions(true);
      }
      return newVal;
    });
  }, [showContributions]);
  
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
    // If activating pension, show tax modal first
    if (assetId === 'pension' && !activeAssets.has('pension')) {
      setPendingPensionTaxRate(pensionTaxRate);
      setPendingPensionTaxRegion(pensionTaxRegion);
      setShowPensionTaxModal(true);
      return;
    }
    
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
  }, [activeAssets, pensionTaxRate, pensionTaxRegion]);
  
  // ─── PENSION TAX MODAL HANDLERS ──────────────────────────────────
  const confirmPensionTax = useCallback(() => {
    setPensionTaxRate(pendingPensionTaxRate);
    setPensionTaxRegion(pendingPensionTaxRegion);
    setActiveAssets(prev => new Set([...prev, 'pension']));
    setShowPensionTaxModal(false);
  }, [pendingPensionTaxRate, pendingPensionTaxRegion]);
  
  const cancelPensionTax = useCallback(() => {
    setShowPensionTaxModal(false);
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
  // Offset for bars to avoid y-axis overlap (shift right by 0.4 years)
  const BAR_X_OFFSET = 0.4;
  
  // Check if pension is active (for tax relief visualization)
  const pensionActive = activeAssets.has('pension');
  
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
        // Offset year for bar positioning to avoid y-axis overlap
        barYear: year + BAR_X_OFFSET,
      };
      
      // Calculate per-year contributions (not cumulative) so a lump-sum
      // is applied only once in year 0 and monthly contributions feed
      // the subsequent years. Escalation applies to monthly amounts.
      const monthsInYearStart = year === 0 ? 1 : (year - 1) * 12 + 1;
      const monthsInYearEnd = year === 0 ? 0 : year * 12;

      // Sum of monthly contributions that occur within this calendar year
      let monthlyNetThisYear = 0;
      if (monthsInYearEnd >= monthsInYearStart) {
        for (let m = monthsInYearStart; m <= monthsInYearEnd; m++) {
          const yearOfMonth = Math.floor((m - 1) / 12);
          const escalatedMonthly = effectiveMonthly * Math.pow(1 + effectiveEscalation, yearOfMonth);
          monthlyNetThisYear += escalatedMonthly;
        }
      }

      if (pensionActive) {
        const initialNet = year === 0 ? effectiveLumpSum : 0; // apply lump-sum only in year 0

        // Gross-up the one-off initial lump-sum (only in year 0)
        const grossInitial = initialNet > 0 ? initialNet / (1 - pensionTaxRate) : 0;
        const reliefInitial = grossInitial - initialNet;

        // Gross-up only the monthly contributions that fall in this year
        const grossMonthlyThisYear = monthlyNetThisYear > 0 ? monthlyNetThisYear / (1 - pensionTaxRate) : 0;
        const reliefMonthlyThisYear = grossMonthlyThisYear - monthlyNetThisYear;

        point.contributionBase = initialNet + monthlyNetThisYear; // net money coming from user this year
        point.contributionRelief = reliefInitial + reliefMonthlyThisYear; // tax relief stacked on top (if pension)
        point.contribution = point.contributionBase + point.contributionRelief;
      } else {
        // Non-pension: per-year contributions — initial only in year 0, monthly sums for other years
        const initialThisYear = year === 0 ? effectiveLumpSum : 0;
        point.contributionBase = initialThisYear + monthlyNetThisYear;
        point.contributionRelief = 0;
        point.contribution = point.contributionBase;
      }
      
      activeList.forEach(assetId => {
        const result = simulations.get(assetId);
        if (result && monthIdx < result.medianPath.length) {
          point[`${assetId}_median`] = result.medianPath[monthIdx];
        }
      });
      
      yearlyData.push(point);
    }
    
    return yearlyData;
  }, [simulations, activeAssets, horizonYears, effectiveLumpSum, effectiveMonthly, contributionEscalation, investmentMode, pensionActive, pensionTaxRate]);
  
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
    <div className="investment-outcomes-tab v4">
      {/* ─── PREMIUM RIBBON (3-section layout) ─────────────────────────── */}
      <div className="outcomes-ribbon-v4">
        {/* GROUP A: Currency Selector (left) */}
        <div className="ribbon-group ribbon-group-left">
          <div className="currency-selector-large">
            {PRIMARY_CURRENCIES.map(c => (
              <button
                key={c}
                className={`currency-btn-lg ${currency === c ? 'active' : ''}`}
                onClick={() => setCurrency(c)}
              >
                <span className="currency-symbol">{CURRENCY_SYMBOLS[c]}</span>
                <span className="currency-code">{c}</span>
              </button>
            ))}
            <div className="currency-more-lg">
              <button
                className="currency-btn-lg more"
                onClick={() => setShowMoreCurrencies(!showMoreCurrencies)}
              >
                <ChevronDown size={14} />
              </button>
              {showMoreCurrencies && (
                <div className="currency-dropdown-lg">
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

        {/* GROUP B: Mode + Amounts (center) */}
        <div className="ribbon-group ribbon-group-center">
          {/* Mode Toggle */}
          <div className="mode-toggle-v4">
            <button
              className={`mode-btn-v4 ${investmentMode === 'lump-sum' ? 'active' : ''}`}
              onClick={() => setInvestmentMode('lump-sum')}
            >
              Lump Sum
            </button>
            <button
              className={`mode-btn-v4 ${investmentMode === 'monthly' ? 'active' : ''}`}
              onClick={() => setInvestmentMode('monthly')}
            >
              Monthly
            </button>
            <button
              className={`mode-btn-v4 ${investmentMode === 'both' ? 'active' : ''}`}
              onClick={() => setInvestmentMode('both')}
            >
              Both
            </button>
          </div>
          
          {/* Amounts Inline */}
          <div className="amounts-row-v4">
            {(investmentMode === 'lump-sum' || investmentMode === 'both') && (
              <div className="amount-input-v4">
                <span className="input-label">Initial</span>
                <div className="input-wrapper">
                  <span className="symbol">{symbol}</span>
                  <input
                    type="number"
                    value={lumpSumAmount}
                    onChange={(e) => setLumpSumAmount(parseFloat(e.target.value) || 0)}
                    min={0}
                  />
                </div>
              </div>
            )}
            {(investmentMode === 'monthly' || investmentMode === 'both') && (
              <div className="amount-input-v4">
                <span className="input-label">Monthly</span>
                <div className="input-wrapper">
                  <span className="symbol">{symbol}</span>
                  <input
                    type="number"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(parseFloat(e.target.value) || 0)}
                    min={0}
                  />
                </div>
              </div>
            )}
            {(investmentMode === 'monthly' || investmentMode === 'both') && (
              <div className="amount-input-v4 escalation">
                <span className="input-label">Escalation</span>
                <select
                  value={contributionEscalation}
                  onChange={(e) => setContributionEscalation(parseFloat(e.target.value))}
                >
                  {ESCALATION_OPTIONS.map(rate => (
                    <option key={rate} value={rate}>
                      {rate === 0 ? '+0%/yr' : `+${(rate * 100).toFixed(0)}%/yr`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* GROUP C: Horizon + View Toggle (right) */}
        <div className="ribbon-group ribbon-group-right">
          {/* Horizon Slider */}
          <div className="horizon-control-v4">
            <div className="horizon-header">
              <span className="horizon-label">Horizon</span>
              <span className="horizon-value">{horizonYears} years</span>
            </div>
            <div className="horizon-slider-v4">
              <span className="slider-edge">{HORIZON_MIN}</span>
              <input
                type="range"
                min={HORIZON_MIN}
                max={horizonMax}
                value={horizonYears}
                onChange={(e) => handleHorizonChange(parseInt(e.target.value))}
              />
              <span className="slider-edge">{horizonMax}</span>
            </div>
          </div>
          
          {/* Large View Toggle */}
          <div className="view-toggle-v4">
            <button
              className={`view-btn-v4 ${viewMode === 'graph' ? 'active' : ''}`}
              onClick={() => setViewMode('graph')}
            >
              Graph
            </button>
            <button
              className={`view-btn-v4 ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT: ASSET SIDEBAR + CENTERED GRAPH ───────────────── */}
      <div className="outcomes-main-layout-v4">
        {/* LEFT: Asset Selector (Vertical Stack) */}
        <div className="asset-sidebar-v4">
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

        {/* CENTER: Graph or Table (1/3 width, centered) */}
        <div className={`outcomes-content-v4 assets-${activeList.length}`}>
          {viewMode === 'graph' && (
            <div className="graph-container-v4" ref={chartRef}>
              {/* Legend Card (top-left, not overlapping y-axis) */}
              <div className="legend-card-v4">
                <div className="legend-title">Final Values</div>
                {activeList.map(assetId => {
                  const config = assetConfigs[assetId];
                  const result = simulations.get(assetId);
                  if (!result) return null;
                  
                  const isGain = result.finalValue >= result.totalContributed;
                  
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

              {/* Top controls row */}
              <div className="graph-controls-v4">
                <div className="graph-toggles-v4">
                  <button
                    className={`toggle-btn-v4 ${showContributions ? 'active' : ''}`}
                    onClick={toggleContributions}
                  >
                    Contributions
                  </button>
                  <button
                    className={`toggle-btn-v4 ${showRunningBalance ? 'active' : ''}`}
                    onClick={toggleRunningBalance}
                  >
                    Running Balance
                  </button>
                </div>
                <button className="export-btn-v4" onClick={handleDownloadPNG} title="Download PNG">
                  <Download size={14} />
                  PNG
                </button>
              </div>

              {/* Chart */}
              <div className="chart-wrapper-v4">
                <ResponsiveContainer width="100%" height={510}>
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
                      domain={[-0.5, horizonYears + 0.5]}
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
                        if (name === 'contributionBase') {
                          return [formatFullNumber(value, currency), 'Your Contribution'];
                        }
                        if (name === 'contributionRelief') {
                          return [formatFullNumber(value, currency), 'Tax Relief'];
                        }
                        if (name === 'contribution') {
                          return [formatFullNumber(value, currency), 'Total Contributed'];
                        }
                        const assetId = name.replace('_median', '') as AssetTypeId;
                        return [formatFullNumber(value, currency), assetConfigs[assetId]?.name || name];
                      }}
                      labelFormatter={(label) => `Year ${Math.round(label)}`}
                    />
                    
                    {/* Stacked contribution bars (base + tax relief) - shown when showContributions is ON */}
                    {showContributions && (
                      <>
                        {/* Base contribution (user's actual money) */}
                        <Bar
                          dataKey="contributionBase"
                          name="contributionBase"
                          stackId="contributions"
                          fill={showRunningBalance ? "rgba(34, 197, 94, 0.25)" : "rgba(34, 197, 94, 0.45)"}
                          stroke="rgba(34, 197, 94, 0.6)"
                          strokeWidth={1}
                          radius={pensionActive ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                          xAxisId={0}
                        />
                        {/* Tax relief portion (stacked on top, lighter tint) */}
                        {pensionActive && (
                          <Bar
                            dataKey="contributionRelief"
                            name="contributionRelief"
                            stackId="contributions"
                            fill={showRunningBalance ? "rgba(147, 197, 253, 0.3)" : "rgba(147, 197, 253, 0.5)"}
                            stroke="rgba(147, 197, 253, 0.7)"
                            strokeWidth={1}
                            radius={[4, 4, 0, 0]}
                            xAxisId={0}
                          />
                        )}
                      </>
                    )}
                    
                    {/* Lines for each active asset - shown when showRunningBalance is ON */}
                    {showRunningBalance && activeList.map(assetId => {
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
            <div className="table-container-v4">
              <div className="table-header-v4">
                <h4>Projected Values by Year</h4>
                <button className="export-btn-v4" onClick={handleDownloadCSV} title="Download CSV">
                  <Download size={14} />
                  CSV
                </button>
              </div>
              <div className={`table-scroll-v4 ${tableExpanded ? 'expanded' : ''}`}>
                <table className="outcomes-table-v4">
                  <thead>
                    <tr>
                      <th className="year-col">Year</th>
                      {activeList.map(assetId => (
                        <th key={assetId} className="asset-col" style={{ color: assetConfigs[assetId].color }}>
                          {assetConfigs[assetId].name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(tableExpanded ? tableData : tableData.slice(0, 8)).map((row, idx) => (
                      <tr key={idx}>
                        <td className="year-col">{row.year}</td>
                        {activeList.map(assetId => (
                          <td key={assetId} className="asset-col" style={{ color: assetConfigs[assetId].color }}>
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
              {tableData.length > 8 && (
                <button className="expand-table-btn-v4" onClick={() => setTableExpanded(!tableExpanded)}>
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
                      {(pensionTaxRegion === 'england' ? ENGLAND_TAX_BRACKETS : SCOTLAND_TAX_BRACKETS).map(b => (
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
      
      {/* ─── PENSION TAX BAND MODAL ──────────────────────────────────── */}
      {showPensionTaxModal && (
        <div className="modal-overlay pension-tax-modal-overlay" onClick={cancelPensionTax}>
          <div className="modal-content pension-tax-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Configure Pension Tax Relief</h3>
              <button className="modal-close" onClick={cancelPensionTax}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Region Toggle */}
              <div className="pension-region-toggle">
                <span className="toggle-label">Tax Region</span>
                <div className="region-buttons">
                  <button
                    className={`region-btn ${pendingPensionTaxRegion === 'england' ? 'active' : ''}`}
                    onClick={() => {
                      setPendingPensionTaxRegion('england');
                      // Reset to first england bracket
                      setPendingPensionTaxRate(ENGLAND_TAX_BRACKETS[0].rate);
                    }}
                  >
                    England / Wales / NI
                  </button>
                  <button
                    className={`region-btn ${pendingPensionTaxRegion === 'scotland' ? 'active' : ''}`}
                    onClick={() => {
                      setPendingPensionTaxRegion('scotland');
                      // Reset to first scotland bracket
                      setPendingPensionTaxRate(SCOTLAND_TAX_BRACKETS[0].rate);
                    }}
                  >
                    Scotland
                  </button>
                </div>
              </div>
              
              {/* Tax Band Slider */}
              <div className="pension-tax-band-selector">
                <span className="toggle-label">Your Tax Band</span>
                <div className="tax-band-options">
                  {(pendingPensionTaxRegion === 'england' ? ENGLAND_TAX_BRACKETS : SCOTLAND_TAX_BRACKETS).map(bracket => (
                    <button
                      key={bracket.rate}
                      className={`tax-band-btn ${pendingPensionTaxRate === bracket.rate ? 'active' : ''}`}
                      onClick={() => setPendingPensionTaxRate(bracket.rate)}
                    >
                      {bracket.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Preview of effect */}
              <div className="pension-tax-preview">
                <div className="preview-row">
                  <span className="preview-label">Your contribution:</span>
                  <span className="preview-value">{symbol}{effectiveMonthly || effectiveLumpSum}/mo</span>
                </div>
                <div className="preview-row highlight">
                  <span className="preview-label">Grossed up (with relief):</span>
                  <span className="preview-value">
                    {symbol}{((effectiveMonthly || effectiveLumpSum) / (1 - pendingPensionTaxRate)).toFixed(2)}/mo
                  </span>
                </div>
                <p className="preview-note">
                  Tax relief of {(pendingPensionTaxRate * 100).toFixed(0)}% means your money is worth more in a pension.
                </p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={cancelPensionTax}>
                Cancel
              </button>
              <button className="modal-btn save" onClick={confirmPensionTax}>
                Add Pension
              </button>
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
