/**
 * NetWorthTab — Main component for the Net Worth tab
 * 
 * Layout:
 * - Left panel: Assets and Liabilities lists
 * - Right panel: Net Worth summary and charts
 */

import { useState, useMemo } from 'react';
import { Plus, Trash2, X, Search, ChevronDown } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useNetWorthStore,
  useNetWorth,
  useTotalAssets,
  useTotalLiabilities,
  ASSET_TYPES,
  LIABILITY_TYPES,
  getLiquidityIndex,
  getAssetTypeLabel,
  getLiabilityTypeLabel,
  Asset,
  Liability,
} from '../store/useNetWorthStore';

// Green color palette for assets
const ASSET_COLORS = [
  '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
  '#4ade80', '#86efac', '#bbf7d0', '#dcfce7', '#f0fdf4',
];

// Red color palette for liabilities
const LIABILITY_COLORS = [
  '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',
  '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#fef2f2',
];

/**
 * Format currency with commas
 */
function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const formatted = Math.round(absValue).toLocaleString('en-GB');
  return value < 0 ? `-£${formatted}` : `£${formatted}`;
}

/**
 * Format compact currency for charts
 */
function formatCompactCurrency(value: number): string {
  const absValue = Math.abs(value);
  let formatted: string;
  if (absValue >= 1_000_000) {
    formatted = `£${(absValue / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    formatted = `£${(absValue / 1_000).toFixed(0)}K`;
  } else {
    formatted = `£${absValue.toFixed(0)}`;
  }
  return value < 0 ? `-${formatted}` : formatted;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function NetWorthTab() {
  // Store state
  const assets = useNetWorthStore((state) => state.assets);
  const liabilities = useNetWorthStore((state) => state.liabilities);
  const addAsset = useNetWorthStore((state) => state.addAsset);
  const deleteAsset = useNetWorthStore((state) => state.deleteAsset);
  const addLiability = useNetWorthStore((state) => state.addLiability);
  const deleteLiability = useNetWorthStore((state) => state.deleteLiability);
  
  // Computed values
  const netWorth = useNetWorth();
  const totalAssets = useTotalAssets();
  const totalLiabilities = useTotalLiabilities();
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'asset' | 'liability'>('asset');
  
  // Form state
  const [selectedType, setSelectedType] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(getTodayDate());
  const [interestRate, setInterestRate] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  
  // Open modal
  const openModal = (mode: 'asset' | 'liability') => {
    setModalMode(mode);
    setSelectedType('');
    setValue('');
    setDate(getTodayDate());
    setInterestRate('');
    setTypeSearch('');
    setShowModal(true);
  };
  
  // Close modal
  const closeModal = () => {
    setShowModal(false);
  };
  
  // Handle form submit
  const handleSubmit = () => {
    if (!selectedType || !value) return;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    if (modalMode === 'asset') {
      addAsset({
        type: selectedType,
        value: Math.abs(numValue),
        date,
        liquidityIndex: getLiquidityIndex(selectedType),
      });
    } else {
      addLiability({
        type: selectedType,
        value: -Math.abs(numValue), // Ensure negative
        date,
        interestRate: interestRate ? parseFloat(interestRate) : undefined,
      });
    }
    
    closeModal();
  };
  
  // Filter types based on search
  const filteredAssetTypes = useMemo(() => {
    if (!typeSearch) return ASSET_TYPES;
    const lower = typeSearch.toLowerCase();
    return ASSET_TYPES.filter(t => t.label.toLowerCase().includes(lower));
  }, [typeSearch]);
  
  const filteredLiabilityTypes = useMemo(() => {
    if (!typeSearch) return LIABILITY_TYPES;
    const lower = typeSearch.toLowerCase();
    return LIABILITY_TYPES.filter(t => t.label.toLowerCase().includes(lower));
  }, [typeSearch]);
  
  // Chart data
  const assetChartData = useMemo(() => {
    return [...assets]
      .sort((a, b) => b.value - a.value)
      .map(a => ({
        name: getAssetTypeLabel(a.type),
        value: a.value,
      }));
  }, [assets]);
  
  const liabilityChartData = useMemo(() => {
    return [...liabilities]
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .map(l => ({
        name: getLiabilityTypeLabel(l.type),
        value: Math.abs(l.value),
      }));
  }, [liabilities]);
  
  // Pie chart data
  const assetPieData = useMemo(() => {
    return assets.map(a => ({
      name: getAssetTypeLabel(a.type),
      value: a.value,
    }));
  }, [assets]);
  
  const liabilityPieData = useMemo(() => {
    return liabilities.map(l => ({
      name: getLiabilityTypeLabel(l.type),
      value: Math.abs(l.value),
    }));
  }, [liabilities]);
  
  // Get selected type label
  const selectedTypeLabel = modalMode === 'asset'
    ? ASSET_TYPES.find(t => t.value === selectedType)?.label
    : LIABILITY_TYPES.find(t => t.value === selectedType)?.label;
  
  // Get liquidity index for selected asset type
  const selectedLiquidityIndex = modalMode === 'asset' && selectedType
    ? getLiquidityIndex(selectedType)
    : null;
  
  return (
    <div className="net-worth-tab">
      {/* ─── LEFT PANEL: Assets & Liabilities Lists ─────────────────── */}
      <div className="net-worth-left-panel">
        {/* Assets Column */}
        <div className="net-worth-column">
          <div className="column-header">
            <h3 className="column-title">Assets</h3>
            <button 
              className="add-btn add-btn-asset" 
              onClick={() => openModal('asset')}
              title="Add Asset"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="items-list">
            {assets.length === 0 ? (
              <div className="empty-state">
                <p>No assets added yet</p>
                <button className="empty-add-btn" onClick={() => openModal('asset')}>
                  <Plus size={16} /> Add your first asset
                </button>
              </div>
            ) : (
              assets.map(asset => (
                <div key={asset.id} className="item-card asset-card">
                  <div className="item-info">
                    <span className="item-type">{getAssetTypeLabel(asset.type)}</span>
                    <span className="item-value positive">{formatCurrency(asset.value)}</span>
                  </div>
                  <div className="item-meta">
                    <span className="item-date">{new Date(asset.date).toLocaleDateString('en-GB')}</span>
                    <span className="liquidity-badge">Liquidity: {asset.liquidityIndex}/10</span>
                  </div>
                  <button 
                    className="delete-btn"
                    onClick={() => deleteAsset(asset.id)}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          
          {assets.length > 0 && (
            <div className="column-total">
              <span>Total Assets</span>
              <span className="total-value positive">{formatCurrency(totalAssets)}</span>
            </div>
          )}
        </div>
        
        {/* Liabilities Column */}
        <div className="net-worth-column">
          <div className="column-header">
            <h3 className="column-title liabilities">Liabilities</h3>
            <button 
              className="add-btn add-btn-liability" 
              onClick={() => openModal('liability')}
              title="Add Liability"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="items-list">
            {liabilities.length === 0 ? (
              <div className="empty-state">
                <p>No liabilities added yet</p>
                <button className="empty-add-btn liability" onClick={() => openModal('liability')}>
                  <Plus size={16} /> Add your first liability
                </button>
              </div>
            ) : (
              liabilities.map(liability => (
                <div key={liability.id} className="item-card liability-card">
                  <div className="item-info">
                    <span className="item-type">{getLiabilityTypeLabel(liability.type)}</span>
                    <span className="item-value negative">{formatCurrency(liability.value)}</span>
                  </div>
                  <div className="item-meta">
                    <span className="item-date">{new Date(liability.date).toLocaleDateString('en-GB')}</span>
                    {liability.interestRate !== undefined && (
                      <span className="interest-badge">{liability.interestRate}% APR</span>
                    )}
                  </div>
                  <button 
                    className="delete-btn"
                    onClick={() => deleteLiability(liability.id)}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          
          {liabilities.length > 0 && (
            <div className="column-total liability">
              <span>Total Liabilities</span>
              <span className="total-value negative">{formatCurrency(-totalLiabilities)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* ─── RIGHT PANEL: Summary & Charts ──────────────────────────── */}
      <div className="net-worth-right-panel">
        {/* Net Worth Header */}
        <div className="net-worth-header">
          <span className="net-worth-label">Current Net Worth</span>
          <span className={`net-worth-value ${netWorth >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(netWorth)}
          </span>
        </div>
        
        {/* Charts Section */}
        <div className="charts-section">
          {/* Bar Charts */}
          <div className="bar-charts-row">
            {/* Assets Bar Chart */}
            <div className="chart-container">
              <h4 className="chart-title">Assets by Value</h4>
              {assetChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={assetChartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                    <XAxis type="number" tickFormatter={formatCompactCurrency} />
                    <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {assetChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">Add assets to see chart</div>
              )}
            </div>
            
            {/* Liabilities Bar Chart (inverted) */}
            <div className="chart-container">
              <h4 className="chart-title liabilities">Liabilities by Value</h4>
              {liabilityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={liabilityChartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                    <XAxis type="number" tickFormatter={formatCompactCurrency} reversed />
                    <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} orientation="right" />
                    <Tooltip formatter={(value: number) => formatCurrency(-value)} />
                    <Bar dataKey="value" radius={[4, 0, 0, 4]}>
                      {liabilityChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={LIABILITY_COLORS[index % LIABILITY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">Add liabilities to see chart</div>
              )}
            </div>
          </div>
          
          {/* Pie Charts */}
          <div className="pie-charts-row">
            {/* Assets Pie Chart */}
            <div className="chart-container pie">
              <h4 className="chart-title">Asset Allocation</h4>
              {assetPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={assetPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                    >
                      {assetPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty pie">Add assets to see allocation</div>
              )}
            </div>
            
            {/* Liabilities Pie Chart */}
            <div className="chart-container pie">
              <h4 className="chart-title liabilities">Liability Breakdown</h4>
              {liabilityPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={liabilityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                    >
                      {liabilityPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={LIABILITY_COLORS[index % LIABILITY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(-value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty pie">Add liabilities to see breakdown</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* ─── MODAL ──────────────────────────────────────────────────── */}
      {showModal && (
        <div className="net-worth-modal-overlay" onClick={closeModal}>
          <div 
            className={`net-worth-modal ${modalMode}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button className="modal-close-btn" onClick={closeModal}>
              <X size={20} />
            </button>
            
            {/* Mode Switch */}
            <div className="modal-mode-switch">
              <button
                className={`mode-switch-btn ${modalMode === 'asset' ? 'active' : ''}`}
                onClick={() => {
                  setModalMode('asset');
                  setSelectedType('');
                  setTypeSearch('');
                }}
              >
                Asset
              </button>
              <button
                className={`mode-switch-btn liability ${modalMode === 'liability' ? 'active' : ''}`}
                onClick={() => {
                  setModalMode('liability');
                  setSelectedType('');
                  setTypeSearch('');
                }}
              >
                Liability
              </button>
              <div 
                className="switch-slider"
                style={{ transform: modalMode === 'liability' ? 'translateX(100%)' : 'translateX(0)' }}
              />
            </div>
            
            {/* Title */}
            <h3 className={`modal-title ${modalMode}`}>
              {modalMode === 'asset' ? 'Add Asset' : 'Add Liability'}
            </h3>
            
            {/* Form */}
            <div className="modal-form">
              {/* Type Selector */}
              <div className="form-field">
                <label>{modalMode === 'asset' ? 'Asset Type' : 'Liability Type'}</label>
                <div className="type-selector">
                  <div 
                    className="type-input-wrapper"
                    onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  >
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder={`Search ${modalMode} types...`}
                      value={selectedType ? selectedTypeLabel : typeSearch}
                      onChange={(e) => {
                        setTypeSearch(e.target.value);
                        setSelectedType('');
                        setShowTypeDropdown(true);
                      }}
                      onFocus={() => setShowTypeDropdown(true)}
                    />
                    <ChevronDown size={16} className="chevron-icon" />
                  </div>
                  
                  {showTypeDropdown && (
                    <div className="type-dropdown">
                      {(modalMode === 'asset' ? filteredAssetTypes : filteredLiabilityTypes).map(type => (
                        <button
                          key={type.value}
                          className={`type-option ${selectedType === type.value ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedType(type.value);
                            setTypeSearch('');
                            setShowTypeDropdown(false);
                          }}
                        >
                          {type.label}
                          {modalMode === 'asset' && 'liquidityIndex' in type && (
                            <span className="liquidity-hint">Liquidity: {type.liquidityIndex}/10</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Liquidity Index Display (for assets) */}
              {modalMode === 'asset' && selectedLiquidityIndex !== null && (
                <div className="liquidity-display">
                  <span className="liquidity-label">Liquidity Index</span>
                  <div className="liquidity-bar">
                    <div 
                      className="liquidity-fill"
                      style={{ width: `${selectedLiquidityIndex * 10}%` }}
                    />
                  </div>
                  <span className="liquidity-value">{selectedLiquidityIndex}/10</span>
                </div>
              )}
              
              {/* Value Input */}
              <div className="form-field">
                <label>Current Value</label>
                <div className="value-input-wrapper">
                  <span className="currency-symbol">£</span>
                  <input
                    type="number"
                    placeholder={modalMode === 'liability' ? 'Enter amount (will be negative)' : 'Enter value'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    min={0}
                  />
                </div>
                {modalMode === 'liability' && value && (
                  <span className="value-preview">Will be recorded as: {formatCurrency(-Math.abs(parseFloat(value) || 0))}</span>
                )}
              </div>
              
              {/* Interest Rate (liabilities only) */}
              {modalMode === 'liability' && (
                <div className="form-field">
                  <label>Interest Rate (Optional)</label>
                  <div className="rate-input-wrapper">
                    <input
                      type="number"
                      placeholder="e.g., 5.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      step={0.1}
                      min={0}
                    />
                    <span className="rate-suffix">% APR</span>
                  </div>
                </div>
              )}
              
              {/* Date Selector */}
              <div className="form-field">
                <label>Date of Valuation</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>
            
            {/* Submit Button */}
            <button 
              className={`submit-btn ${modalMode}`}
              onClick={handleSubmit}
              disabled={!selectedType || !value}
            >
              {modalMode === 'asset' ? 'Add Asset' : 'Add Liability'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
