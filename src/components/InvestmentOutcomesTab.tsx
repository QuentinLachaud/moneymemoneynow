/**
 * InvestmentOutcomesTab — Compare investment outcomes across asset types
 * 
 * Features:
 * - Lump sum vs monthly contribution modes
 * - Multiple asset types with Monte Carlo simulation
 * - Single asset: full fan + median line
 * - Multi-asset: median lines only
 * - Results table with Excel download
 */

import { useState, useMemo, useCallback } from 'react';
import { Download, Info, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  Currency,
  CURRENCY_SYMBOLS,
  AssetTypeId,
  AssetConfig,
  InvestmentMode,
  DEFAULT_ASSETS,
  SimulationResult,
  simulateAsset,
  formatCurrency,
  calculateGrossPension,
} from '../utils/investmentSimulation';

/** Equity volatility presets */
const VOLATILITY_PRESETS = [0.10, 0.15, 0.20] as const;

/** Primary currencies */
const PRIMARY_CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR'];
const SECONDARY_CURRENCIES: Currency[] = ['JPY', 'INR', 'CHF', 'CAD', 'AUD'];

/** Tax brackets for pension */
const TAX_BRACKETS = [
  { rate: 0.20, label: '20% (Basic)' },
  { rate: 0.40, label: '40% (Higher)' },
  { rate: 0.45, label: '45% (Additional)' },
];

export function InvestmentOutcomesTab() {
  // ─── TOP CONTROLS STATE ───────────────────────────────────────────
  const [currency, setCurrency] = useState<Currency>('GBP');
  const [showMoreCurrencies, setShowMoreCurrencies] = useState(false);
  const [mode, setMode] = useState<InvestmentMode>('lump-sum');
  const [horizonYears, setHorizonYears] = useState(20);
  const [equityVolatility, setEquityVolatility] = useState(0.15);
  
  // ─── INVESTMENT AMOUNTS ───────────────────────────────────────────
  const [lumpSumAmount, setLumpSumAmount] = useState(10000);
  const [monthlyAmount, setMonthlyAmount] = useState(500);
  
  // ─── ACTIVE ASSETS ────────────────────────────────────────────────
  const [activeAssets, setActiveAssets] = useState<Set<AssetTypeId>>(
    new Set(['cash', 'index-fund'])
  );
  
  // ─── ASSET CONFIGURATIONS (with overrides) ────────────────────────
  const [assetConfigs, setAssetConfigs] = useState<Record<AssetTypeId, AssetConfig>>(
    { ...DEFAULT_ASSETS }
  );
  
  // ─── CASH-SPECIFIC STATE ──────────────────────────────────────────
  const [cashApplyInflation, setCashApplyInflation] = useState(false);
  const [cashInflationRate, setCashInflationRate] = useState(0.03);
  
  // ─── PENSION-SPECIFIC STATE ───────────────────────────────────────
  const [pensionNetSacrifice, setPensionNetSacrifice] = useState(100);
  const [pensionTaxRate, setPensionTaxRate] = useState(0.40);
  
  // ─── SAVINGS INTEREST RATE ────────────────────────────────────────
  const [savingsRate, setSavingsRate] = useState(0.04);
  
  // ─── UI STATE ─────────────────────────────────────────────────────
  const [tableExpanded, setTableExpanded] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetTypeId | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [pendingEditAsset, setPendingEditAsset] = useState<AssetTypeId | null>(null);
  
  // ─── TOGGLE ASSET ─────────────────────────────────────────────────
  const toggleAsset = useCallback((assetId: AssetTypeId) => {
    setActiveAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
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
  
  // ─── UPDATE ASSET CONFIG ──────────────────────────────────────────
  const updateAssetConfig = useCallback((
    assetId: AssetTypeId,
    updates: Partial<AssetConfig>
  ) => {
    setAssetConfigs(prev => ({
      ...prev,
      [assetId]: { ...prev[assetId], ...updates },
    }));
  }, []);
  
  // ─── RUN SIMULATIONS ──────────────────────────────────────────────
  const simulations = useMemo(() => {
    const results: Map<AssetTypeId, SimulationResult> = new Map();
    const activeList = Array.from(activeAssets);
    const isSingleAsset = activeList.length === 1;
    const numPaths = isSingleAsset ? 200 : 1; // Full Monte Carlo for single asset
    
    const amount = mode === 'lump-sum' ? lumpSumAmount : monthlyAmount;
    
    activeList.forEach(assetId => {
      let config = { ...assetConfigs[assetId] };
      
      // Apply savings rate override
      if (assetId === 'savings') {
        config.expectedReturn = savingsRate;
      }
      
      const result = simulateAsset(
        config,
        mode,
        amount,
        amount,
        horizonYears,
        numPaths,
        assetId === 'index-fund' ? equityVolatility : undefined,
        assetId === 'cash' ? { applyInflation: cashApplyInflation, inflationRate: cashInflationRate } : undefined,
        assetId === 'pension' ? { netSacrifice: pensionNetSacrifice, marginalTaxRate: pensionTaxRate } : undefined,
      );
      
      results.set(assetId, result);
    });
    
    return results;
  }, [
    activeAssets, assetConfigs, mode, lumpSumAmount, monthlyAmount,
    horizonYears, equityVolatility, cashApplyInflation, cashInflationRate,
    pensionNetSacrifice, pensionTaxRate, savingsRate,
  ]);
  
  // ─── CHART DATA ───────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const activeList = Array.from(activeAssets);
    if (activeList.length === 0) return [];
    
    const firstResult = simulations.get(activeList[0]);
    if (!firstResult) return [];
    
    return firstResult.timePoints.map((tp, idx) => {
      const point: Record<string, number> = {
        year: tp.year + tp.month / 12,
        month: tp.totalMonths,
      };
      
      activeList.forEach(assetId => {
        const result = simulations.get(assetId);
        if (result) {
          point[`${assetId}_median`] = result.medianPath[idx];
          if (result.paths.length > 1) {
            point[`${assetId}_p10`] = result.p10Path[idx];
            point[`${assetId}_p90`] = result.p90Path[idx];
          }
        }
      });
      
      return point;
    });
  }, [simulations, activeAssets]);
  
  // ─── TABLE DATA (yearly snapshots) ────────────────────────────────
  const tableData = useMemo(() => {
    const activeList = Array.from(activeAssets);
    if (activeList.length === 0) return [];
    
    const firstResult = simulations.get(activeList[0]);
    if (!firstResult) return [];
    
    // Show yearly data only
    return firstResult.timePoints
      .filter(tp => tp.month === 0)
      .map((tp, yearIdx) => {
        const row: Record<string, number | string> = {
          year: `Year ${tp.year}`,
        };
        
        activeList.forEach(assetId => {
          const result = simulations.get(assetId);
          if (result) {
            row[assetId] = result.medianPath[yearIdx * 12];
          }
        });
        
        return row;
      });
  }, [simulations, activeAssets]);
  
  // ─── DOWNLOAD CSV ─────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const activeList = Array.from(activeAssets);
    const headers = ['Year', ...activeList.map(id => assetConfigs[id].name)];
    
    const rows = tableData.map(row => {
      return [
        row.year,
        ...activeList.map(id => 
          typeof row[id] === 'number' 
            ? (row[id] as number).toFixed(2)
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
  
  const isSingleAsset = activeAssets.size === 1;
  const symbol = CURRENCY_SYMBOLS[currency];
  
  return (
    <div className="investment-outcomes-tab">
      {/* ─── TOP CONTROLS RIBBON ─────────────────────────────────────── */}
      <div className="outcomes-controls-ribbon">
        {/* Left: Currency + Mode */}
        <div className="controls-left">
          {/* Currency Selector */}
          <div className="control-group currency-selector">
            <label>Currency</label>
            <div className="currency-buttons">
              {PRIMARY_CURRENCIES.map(c => (
                <button
                  key={c}
                  className={`currency-btn ${currency === c ? 'active' : ''}`}
                  onClick={() => setCurrency(c)}
                >
                  {CURRENCY_SYMBOLS[c]} {c}
                </button>
              ))}
              <div className="currency-more">
                <button
                  className="currency-btn more"
                  onClick={() => setShowMoreCurrencies(!showMoreCurrencies)}
                >
                  More {showMoreCurrencies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
          
          {/* Investment Mode */}
          <div className="control-group mode-selector">
            <label>Investment Type</label>
            <div className="mode-toggle">
              <button
                className={`mode-btn ${mode === 'lump-sum' ? 'active' : ''}`}
                onClick={() => setMode('lump-sum')}
              >
                Lump Sum
              </button>
              <button
                className={`mode-btn ${mode === 'monthly' ? 'active' : ''}`}
                onClick={() => setMode('monthly')}
              >
                Monthly
              </button>
              <div 
                className="mode-indicator"
                style={{ transform: mode === 'monthly' ? 'translateX(100%)' : 'translateX(0)' }}
              />
            </div>
          </div>
          
          {/* Amount Input */}
          <div className="control-group amount-input">
            <label>{mode === 'lump-sum' ? 'Initial Amount' : 'Monthly Amount'}</label>
            <div className="input-with-symbol">
              <span className="symbol">{symbol}</span>
              <input
                type="number"
                value={mode === 'lump-sum' ? lumpSumAmount : monthlyAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  if (mode === 'lump-sum') setLumpSumAmount(val);
                  else setMonthlyAmount(val);
                }}
                min={0}
              />
            </div>
          </div>
        </div>
        
        {/* Center: Horizon */}
        <div className="controls-center">
          <div className="control-group horizon-control">
            <label>Investment Horizon: {horizonYears} years</label>
            <input
              type="range"
              min={1}
              max={60}
              value={horizonYears}
              onChange={(e) => setHorizonYears(parseInt(e.target.value))}
              className="horizon-slider"
            />
          </div>
        </div>
        
        {/* Right: Volatility */}
        <div className="controls-right">
          <div className="control-group volatility-preset">
            <label>Equity Volatility</label>
            <div className="volatility-buttons">
              {VOLATILITY_PRESETS.map(v => (
                <button
                  key={v}
                  className={`vol-btn ${equityVolatility === v ? 'active' : ''}`}
                  onClick={() => setEquityVolatility(v)}
                >
                  {(v * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* ─── ASSET SELECTOR ──────────────────────────────────────────── */}
      <div className="asset-selector-section">
        <h3>Assets to Compare</h3>
        <div className="asset-chips">
          {(Object.keys(DEFAULT_ASSETS) as AssetTypeId[])
            .filter(id => id !== 'custom')
            .map(assetId => {
              const config = assetConfigs[assetId];
              const isActive = activeAssets.has(assetId);
              
              return (
                <div
                  key={assetId}
                  className={`asset-chip ${isActive ? 'active' : ''}`}
                  style={{ '--asset-color': config.color } as React.CSSProperties}
                >
                  <button
                    className="chip-toggle"
                    onClick={() => toggleAsset(assetId)}
                  >
                    <span
                      className="chip-indicator"
                      style={{ backgroundColor: isActive ? config.color : 'transparent' }}
                    />
                    <span className="chip-name">{config.name}</span>
                  </button>
                  
                  {isActive && (
                    <button
                      className="chip-settings"
                      onClick={() => handleEditAsset(assetId)}
                      title="Edit settings"
                    >
                      <Settings size={14} />
                    </button>
                  )}
                  
                  <button className="chip-info" title={getAssetTooltip(assetId)}>
                    <Info size={14} />
                  </button>
                </div>
              );
            })}
        </div>
        
        {/* ─── INLINE ASSET CONFIG ─────────────────────────────────── */}
        {editingAsset && (
          <div className="asset-config-panel">
            <div className="config-header">
              <h4>Configure {assetConfigs[editingAsset].name}</h4>
              <button onClick={() => setEditingAsset(null)}>×</button>
            </div>
            
            {editingAsset === 'cash' && (
              <div className="config-content">
                <div className="config-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={cashApplyInflation}
                      onChange={(e) => setCashApplyInflation(e.target.checked)}
                    />
                    Apply Inflation
                  </label>
                </div>
                {cashApplyInflation && (
                  <div className="config-row">
                    <label>Inflation Rate: {(cashInflationRate * 100).toFixed(1)}%</label>
                    <input
                      type="range"
                      min={0}
                      max={0.05}
                      step={0.005}
                      value={cashInflationRate}
                      onChange={(e) => setCashInflationRate(parseFloat(e.target.value))}
                    />
                  </div>
                )}
              </div>
            )}
            
            {editingAsset === 'savings' && (
              <div className="config-content">
                <div className="config-row">
                  <label>Interest Rate: {(savingsRate * 100).toFixed(1)}%</label>
                  <input
                    type="range"
                    min={0}
                    max={0.10}
                    step={0.005}
                    value={savingsRate}
                    onChange={(e) => setSavingsRate(parseFloat(e.target.value))}
                  />
                </div>
              </div>
            )}
            
            {editingAsset === 'pension' && (
              <div className="config-content">
                <div className="config-row">
                  <label>Net Monthly Sacrifice ({symbol})</label>
                  <input
                    type="number"
                    value={pensionNetSacrifice}
                    onChange={(e) => setPensionNetSacrifice(parseFloat(e.target.value) || 0)}
                    min={0}
                  />
                </div>
                <div className="config-row">
                  <label>Marginal Tax Rate</label>
                  <select
                    value={pensionTaxRate}
                    onChange={(e) => setPensionTaxRate(parseFloat(e.target.value))}
                  >
                    {TAX_BRACKETS.map(b => (
                      <option key={b.rate} value={b.rate}>{b.label}</option>
                    ))}
                  </select>
                </div>
                <div className="config-hint">
                  {symbol}{pensionNetSacrifice} net → {symbol}
                  {calculateGrossPension(pensionNetSacrifice, pensionTaxRate).toFixed(2)} gross
                </div>
              </div>
            )}
            
            {(editingAsset === 'bonds' || editingAsset === 'index-fund' || editingAsset === 'car') && (
              <div className="config-content">
                <div className="config-row">
                  <label>Expected Return (%)</label>
                  <input
                    type="number"
                    value={(assetConfigs[editingAsset].expectedReturn * 100).toFixed(1)}
                    onChange={(e) => updateAssetConfig(editingAsset, {
                      expectedReturn: parseFloat(e.target.value) / 100,
                    })}
                    step={0.5}
                  />
                </div>
                <div className="config-row">
                  <label>Volatility (%)</label>
                  <input
                    type="number"
                    value={(assetConfigs[editingAsset].volatility * 100).toFixed(1)}
                    onChange={(e) => updateAssetConfig(editingAsset, {
                      volatility: parseFloat(e.target.value) / 100,
                    })}
                    step={1}
                  />
                </div>
                <div className="config-row">
                  <label>Annual Fee (%)</label>
                  <input
                    type="number"
                    value={(assetConfigs[editingAsset].fee * 100).toFixed(2)}
                    onChange={(e) => updateAssetConfig(editingAsset, {
                      fee: parseFloat(e.target.value) / 100,
                    })}
                    step={0.05}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* ─── OUTCOMES CHART ──────────────────────────────────────────── */}
      <div className="outcomes-chart-section">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 20, right: 80, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="year"
              stroke="rgba(255,255,255,0.4)"
              tickFormatter={(v) => `${Math.floor(v)}y`}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              tickFormatter={(v) => formatCurrency(v, currency)}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 19, 28, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string) => {
                const assetId = name.replace('_median', '').replace('_p10', '').replace('_p90', '') as AssetTypeId;
                return [formatCurrency(value, currency), assetConfigs[assetId]?.name || name];
              }}
              labelFormatter={(label) => `Year ${Math.floor(label as number)}`}
            />
            
            {/* Render lines for each active asset */}
            {Array.from(activeAssets).map(assetId => {
              const config = assetConfigs[assetId];
              const result = simulations.get(assetId);
              
              return (
                <Line
                  key={assetId}
                  type="monotone"
                  dataKey={`${assetId}_median`}
                  name={`${assetId}_median`}
                  stroke={config.color}
                  strokeWidth={isSingleAsset ? 3 : 2}
                  dot={false}
                  filter={isSingleAsset ? 'drop-shadow(0 0 6px currentColor)' : undefined}
                />
              );
            })}
            
            {/* Final value labels */}
            {Array.from(activeAssets).map(assetId => {
              const result = simulations.get(assetId);
              if (!result) return null;
              
              const finalValue = result.finalValue;
              const totalContributed = result.totalContributed;
              const isGain = finalValue >= totalContributed;
              
              return (
                <ReferenceLine
                  key={`${assetId}-label`}
                  x={horizonYears}
                  stroke="transparent"
                  label={{
                    value: `${isGain ? '+' : ''}${formatCurrency(finalValue - totalContributed, currency)}`,
                    position: 'right',
                    fill: isGain ? '#22c55e' : '#ef4444',
                    fontSize: 12,
                  }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
        
        {/* Legend with final values */}
        <div className="chart-legend">
          {Array.from(activeAssets).map(assetId => {
            const config = assetConfigs[assetId];
            const result = simulations.get(assetId);
            if (!result) return null;
            
            const isGain = result.finalValue >= result.totalContributed;
            
            return (
              <div key={assetId} className="legend-item">
                <span className="legend-color" style={{ backgroundColor: config.color }} />
                <span className="legend-name">{config.name}</span>
                <span className={`legend-value ${isGain ? 'gain' : 'loss'}`}>
                  {formatCurrency(result.finalValue, currency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* ─── RESULTS TABLE ───────────────────────────────────────────── */}
      <div className="outcomes-table-section">
        <div className="table-header">
          <h3>Results Over Time</h3>
          <button className="download-btn" onClick={handleDownload}>
            <Download size={16} />
            Download CSV
          </button>
        </div>
        
        <div className={`table-wrapper ${tableExpanded ? 'expanded' : ''}`}>
          <table className="outcomes-table">
            <thead>
              <tr>
                <th>Year</th>
                {Array.from(activeAssets).map(assetId => (
                  <th key={assetId} style={{ color: assetConfigs[assetId].color }}>
                    {assetConfigs[assetId].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(tableExpanded ? tableData : tableData.slice(0, 3)).map((row, idx) => (
                <tr key={idx}>
                  <td>{row.year}</td>
                  {Array.from(activeAssets).map(assetId => (
                    <td key={assetId} style={{ color: assetConfigs[assetId].color }}>
                      {typeof row[assetId] === 'number'
                        ? formatCurrency(row[assetId] as number, currency)
                        : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {tableData.length > 3 && (
          <button
            className="expand-btn"
            onClick={() => setTableExpanded(!tableExpanded)}
          >
            {tableExpanded ? 'Collapse' : `Show all ${tableData.length} years`}
            {tableExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>
      
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
      return 'Plain cash – stays flat or loses value to inflation';
    case 'savings':
      return 'Savings account with fixed interest rate';
    case 'bonds':
      return 'Government bonds – lower risk, moderate returns';
    case 'index-fund':
      return 'Diversified global equity index – higher risk and potential returns';
    case 'pension':
      return 'Pension contribution with tax relief – your net pay gets "grossed up"';
    case 'car':
      return 'Depreciating asset – loses value over time';
    default:
      return '';
  }
}
