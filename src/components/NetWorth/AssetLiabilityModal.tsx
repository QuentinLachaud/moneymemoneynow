/**
 * AssetLiabilityModal Component
 * 
 * Unified modal for adding/editing both assets and liabilities
 * Features:
 * - Slide switch at fixed position (top)
 * - Expands downward when switching modes
 * - Custom name field
 * - Type selector with icons and search
 * - Custom Type support
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Search, ChevronDown } from 'lucide-react';
import { Button, IconButton, TextInput, NumberInput, Slider, SegmentedToggle } from '@quentinlachaud/app-component-library';
import {
  Asset,
  Liability,
  ASSET_TYPES,
  LIABILITY_TYPES,
  getLiquidityIndex,
  getLiabilityDefaultRate,
} from '../../store/useNetWorthStore';
import { getAssetIcon, getLiabilityIcon } from '../../utils/netWorthIcons';
import { getTodayDate, formatCurrency } from './formatters';

type ModalMode = 'asset' | 'liability';

interface AssetLiabilityModalProps {
  isOpen: boolean;
  mode: ModalMode;
  editingAsset?: Asset | null;
  editingLiability?: Liability | null;
  onClose: () => void;
  onSaveAsset: (asset: Omit<Asset, 'id'>) => void;
  onUpdateAsset: (id: string, asset: Partial<Asset>) => void;
  onSaveLiability: (liability: Omit<Liability, 'id'>) => void;
  onUpdateLiability: (id: string, liability: Partial<Liability>) => void;
  onModeChange: (mode: ModalMode) => void;
}

export function AssetLiabilityModal({
  isOpen,
  mode,
  editingAsset,
  editingLiability,
  onClose,
  onSaveAsset,
  onUpdateAsset,
  onSaveLiability,
  onUpdateLiability,
  onModeChange,
}: AssetLiabilityModalProps) {
  // Form state
  const [customName, setCustomName] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(getTodayDate());
  const [interestRate, setInterestRate] = useState('');
  const [customLiquidity, setCustomLiquidity] = useState(5);
  const [typeSearch, setTypeSearch] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  
  // Determine if we're editing
  const isEditing = mode === 'asset' ? !!editingAsset : !!editingLiability;
  
  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      if (editingAsset && mode === 'asset') {
        // Populate form with asset data
        setCustomName(editingAsset.customName || '');
        setSelectedType(editingAsset.type);
        setValue(editingAsset.value.toString());
        setDate(editingAsset.date);
        setCustomLiquidity(editingAsset.liquidityIndex);
        setInterestRate('');
      } else if (editingLiability && mode === 'liability') {
        // Populate form with liability data
        setCustomName(editingLiability.customName || '');
        setSelectedType(editingLiability.type);
        setValue(Math.abs(editingLiability.value).toString());
        setDate(editingLiability.date);
        setInterestRate(editingLiability.interestRate?.toString() || '');
      } else {
        // Reset for new entry
        resetForm();
      }
    }
  }, [isOpen, editingAsset, editingLiability, mode]);
  
  const resetForm = useCallback(() => {
    setCustomName('');
    setSelectedType('');
    setValue('');
    setDate(getTodayDate());
    setInterestRate('');
    setCustomLiquidity(5);
    setTypeSearch('');
    setShowTypeDropdown(false);
  }, []);
  
  // Handle mode switch
  const handleModeSwitch = (newMode: ModalMode) => {
    if (!isEditing) {
      onModeChange(newMode);
      resetForm();
    }
  };
  
  // Close and reset
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // Filter types based on search
  const filteredTypes = useMemo(() => {
    const types = mode === 'asset' ? ASSET_TYPES : LIABILITY_TYPES;
    if (!typeSearch) return types;
    const lower = typeSearch.toLowerCase();
    return types.filter(t => t.label.toLowerCase().includes(lower));
  }, [mode, typeSearch]);
  
  // Get selected type info
  const selectedTypeInfo = useMemo(() => {
    const types = mode === 'asset' ? ASSET_TYPES : LIABILITY_TYPES;
    return types.find(t => t.value === selectedType);
  }, [mode, selectedType]);
  
  // Get liquidity index for display
  const displayLiquidityIndex = useMemo(() => {
    if (mode !== 'asset' || !selectedType) return null;
    if (selectedType === 'custom') return customLiquidity;
    return getLiquidityIndex(selectedType);
  }, [mode, selectedType, customLiquidity]);
  
  // Get icon for selected type
  const SelectedIcon = useMemo(() => {
    if (!selectedType) return null;
    return mode === 'asset' 
      ? getAssetIcon(selectedType) 
      : getLiabilityIcon(selectedType);
  }, [mode, selectedType]);
  
  // Handle type selection
  const handleTypeSelect = (typeValue: string) => {
    setSelectedType(typeValue);
    setTypeSearch('');
    setShowTypeDropdown(false);
    
    // Auto-fill interest rate for liabilities
    if (mode === 'liability' && !interestRate) {
      const defaultRate = getLiabilityDefaultRate(typeValue);
      if (defaultRate > 0) {
        setInterestRate(defaultRate.toString());
      }
    }
  };
  
  // Handle form submit
  const handleSubmit = () => {
    if (!selectedType || !value) return;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;
    
    if (mode === 'asset') {
      const assetData = {
        type: selectedType,
        customName: customName.trim() || undefined,
        value: Math.abs(numValue),
        date,
        liquidityIndex: selectedType === 'custom' ? customLiquidity : getLiquidityIndex(selectedType),
      };
      
      if (editingAsset) {
        onUpdateAsset(editingAsset.id, assetData);
      } else {
        onSaveAsset(assetData);
      }
    } else {
      const liabilityData = {
        type: selectedType,
        customName: customName.trim() || undefined,
        value: -Math.abs(numValue),
        date,
        interestRate: interestRate ? parseFloat(interestRate) : undefined,
      };
      
      if (editingLiability) {
        onUpdateLiability(editingLiability.id, liabilityData);
      } else {
        onSaveLiability(liabilityData);
      }
    }
    
    handleClose();
  };
  
  // Validation
  const isValid = selectedType && value && parseFloat(value) > 0;
  const requiresCustomName = selectedType === 'custom' && !customName.trim();
  
  if (!isOpen) return null;
  
  return (
    <div className="nw-modal-overlay" onClick={handleClose}>
      <div 
        className={`nw-modal ${mode}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <IconButton icon={<X size={20} />} label="Close" variant="ghost" size="sm" onClick={handleClose} />
        
        {/* Mode Switch - Fixed at top */}
        <div className="nw-modal-switch-wrapper">
          <SegmentedToggle
            options={[
              { value: 'asset', label: 'Asset' },
              { value: 'liability', label: 'Liability' },
            ]}
            value={mode}
            onChange={(v) => handleModeSwitch(v as ModalMode)}
            size="sm"
            fullWidth
          />
        </div>
        
        {/* Title */}
        <h3 className={`nw-modal-title ${mode}`}>
          {isEditing 
            ? (mode === 'asset' ? 'Edit Asset' : 'Edit Liability')
            : (mode === 'asset' ? 'Add Asset' : 'Add Liability')
          }
        </h3>
        
        {/* Form - Expands downward */}
        <div className="nw-modal-form">
          {/* Custom Name Field */}
          <div className="nw-form-field">
            <TextInput
              label={selectedType === 'custom' ? 'Custom Name *' : 'Custom Name (optional)'}
              placeholder='e.g., "My Emergency Fund", "Main House Mortgage"'
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              fullWidth
            />
          </div>
          
          {/* Type Selector */}
          <div className="nw-form-field">
            <label>{mode === 'asset' ? 'Asset Type' : 'Liability Type'}</label>
            <div className="nw-type-selector">
              <div 
                className="nw-type-input"
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              >
                {SelectedIcon ? (
                  <span className={`nw-type-icon ${mode}`}>
                    <SelectedIcon size={16} />
                  </span>
                ) : (
                  <Search size={16} className="nw-search-icon" />
                )}
                <input
                  type="text"
                  placeholder={`Search ${mode} types...`}
                  value={selectedType ? selectedTypeInfo?.label : typeSearch}
                  onChange={(e) => {
                    setTypeSearch(e.target.value);
                    setSelectedType('');
                    setShowTypeDropdown(true);
                  }}
                  onFocus={() => setShowTypeDropdown(true)}
                />
                <ChevronDown size={16} className="nw-chevron-icon" />
              </div>
              
              {showTypeDropdown && (
                <div className="nw-type-dropdown">
                  {filteredTypes.map(type => {
                    const TypeIcon = mode === 'asset' 
                      ? getAssetIcon(type.value)
                      : getLiabilityIcon(type.value);
                    return (
                      <button
                        key={type.value}
                        className={`nw-type-option ${selectedType === type.value ? 'selected' : ''}`}
                        onClick={() => handleTypeSelect(type.value)}
                      >
                        <TypeIcon size={16} className="option-icon" />
                        <span className="option-label">{type.label}</span>
                        {mode === 'asset' && 'liquidityIndex' in type && (
                          <span className="option-liquidity">
                            {type.value === 'custom' ? 'Custom' : `${type.liquidityIndex}/10`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Liquidity Index Display (Assets only) */}
          {mode === 'asset' && displayLiquidityIndex !== null && (
            <div className="nw-liquidity-display">
              {selectedType === 'custom' ? (
                <Slider
                  label="Liquidity Index"
                  value={customLiquidity}
                  onChange={(v) => setCustomLiquidity(v)}
                  min={1}
                  max={10}
                  step={1}
                  formatValue={(v) => `${v}/10`}
                />
              ) : (
                <>
                  <span className="nw-liquidity-label">Liquidity Index</span>
                  <div className="nw-liquidity-bar">
                    <div 
                      className="nw-liquidity-fill"
                      style={{ width: `${displayLiquidityIndex * 10}%` }}
                    />
                  </div>
                  <span className="nw-liquidity-value">{displayLiquidityIndex}/10</span>
                </>
              )}
            </div>
          )}
          
          {/* Value Input */}
          <div className="nw-form-field">
            <NumberInput
              label="Current Value"
              value={value ? parseFloat(value) : undefined}
              onChange={(v) => setValue(v !== undefined ? v.toString() : '')}
              min={0}
              step={100}
              fullWidth
            />
            {mode === 'liability' && value && parseFloat(value) > 0 && (
              <span className="nw-value-preview">
                Will be recorded as: {formatCurrency(-Math.abs(parseFloat(value)))}
              </span>
            )}
          </div>
          
          {/* Interest Rate (Liabilities only) */}
          {mode === 'liability' && (
            <div className="nw-form-field">
              <NumberInput
                label="Interest Rate (optional)"
                value={interestRate ? parseFloat(interestRate) : undefined}
                onChange={(v) => setInterestRate(v !== undefined ? v.toString() : '')}
                step={0.1}
                min={0}
                fullWidth
              />
            </div>
          )}
          
          {/* Date Selector */}
          <div className="nw-form-field">
            <label>Date of Valuation</label>
            <input
              type="date"
              className="nw-date-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        
        {/* Submit Button */}
        <Button
          variant="primary"
          fullWidth
          onClick={handleSubmit}
          disabled={!isValid || requiresCustomName}
        >
          {isEditing 
            ? 'Save Changes'
            : (mode === 'asset' ? 'Add Asset' : 'Add Liability')
          }
        </Button>
      </div>
    </div>
  );
}
