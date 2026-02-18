/**
 * SavingsCalculatorTab.tsx — Main Savings Calculator tab component
 *
 * Layout:
 * - Top ribbon: Currency selector, Net Income input with tooltip, Add Bonus button
 * - Left panel: Total Monthly Income display + Collapsible expenditure sections
 * - Right panel: Summary, Savings rate, Waterfall chart
 *
 * Uses Zustand store for state persistence.
 */

import { useState, useMemo } from 'react';
import { ChevronDown, Plus, HelpCircle, ArrowRight, FolderPlus } from 'lucide-react';
import { Currency, CURRENCY_SYMBOLS } from '../utils/investmentSimulation';
import {
  calculateTotalOutgoings,
  calculateMonthlySavings,
  calculateSavingsRate,
  formatSavingsRate,
  getSavingsRateColor,
  getSavingsRateLabel,
} from '../utils/savingsCalculations';
import { useSavingsStore } from '../store/useSavingsStore';
import { useAppStore } from '../store/useAppStore';
import { SavingsCategoryPanel } from './savings/SavingsCategoryPanel';
import { BonusModal } from './savings/BonusModal';
import { WaterfallChart } from './savings/WaterfallChart';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Button, IconButton, NumberInput, SegmentedToggle } from '@quentinlachaud/app-component-library';

/** Primary and secondary currency options */
const PRIMARY_CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR'];
const SECONDARY_CURRENCIES: Currency[] = ['JPY', 'INR', 'CHF', 'CAD', 'AUD'];

export function SavingsCalculatorTab() {
  // ─── STORE STATE ──────────────────────────────────────────────────
  const currency = useSavingsStore((s) => s.currency);
  const setCurrency = useSavingsStore((s) => s.setCurrency);
  const netIncome = useSavingsStore((s) => s.netIncome);
  const setNetIncome = useSavingsStore((s) => s.setNetIncome);
  const netBonus = useSavingsStore((s) => s.netBonus);
  const setNetBonus = useSavingsStore((s) => s.setNetBonus);
  const expenseSections = useSavingsStore((s) => s.expenseSections);
  const customSections = useSavingsStore((s) => s.customSections);
  const expandedSections = useSavingsStore((s) => s.expandedSections);
  const toggleSection = useSavingsStore((s) => s.toggleSection);
  const updateCategoryAmount = useSavingsStore((s) => s.updateCategoryAmount);
  const updateCategoryFrequency = useSavingsStore((s) => s.updateCategoryFrequency);
  
  // Subcategory actions
  const addSubcategory = useSavingsStore((s) => s.addSubcategory);
  const updateSubcategory = useSavingsStore((s) => s.updateSubcategory);
  const removeSubcategory = useSavingsStore((s) => s.removeSubcategory);
  
  // Custom section actions
  const addCustomSection = useSavingsStore((s) => s.addCustomSection);
  const updateCustomSectionTitle = useSavingsStore((s) => s.updateCustomSectionTitle);
  const removeCustomSection = useSavingsStore((s) => s.removeCustomSection);
  
  // Navigation to Investment Outcomes
  const navigateToInvestmentOutcomes = useAppStore((s) => s.navigateToInvestmentOutcomes);

  // ─── LOCAL UI STATE ───────────────────────────────────────────────
  const [showMoreCurrencies, setShowMoreCurrencies] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);

  // ─── DERIVED CALCULATIONS ─────────────────────────────────────────
  const symbol = CURRENCY_SYMBOLS[currency];
  
  // Combine default and custom sections for calculations
  const allSections = useMemo(() => {
    return [...expenseSections, ...customSections];
  }, [expenseSections, customSections]);

  const totalMonthlyIncome = useMemo(() => {
    return netIncome + netBonus / 12;
  }, [netIncome, netBonus]);

  const totalOutgoings = useMemo(() => {
    return calculateTotalOutgoings(allSections);
  }, [allSections]);

  const monthlySavings = useMemo(() => {
    return calculateMonthlySavings(totalMonthlyIncome, totalOutgoings);
  }, [totalMonthlyIncome, totalOutgoings]);

  const savingsRate = useMemo(() => {
    return calculateSavingsRate(monthlySavings, totalMonthlyIncome);
  }, [monthlySavings, totalMonthlyIncome]);

  const savingsRateColor = getSavingsRateColor(savingsRate);
  const savingsRateLabel = getSavingsRateLabel(savingsRate);
  
  // Handler for CTA button
  const handleInvestSavings = () => {
    navigateToInvestmentOutcomes({
      monthlyAmount: Math.max(0, monthlySavings),
      lumpSumAmount: 0,
    });
  };

  return (
    <div className="savings-calculator-tab">
      {/* ─── PREMIUM RIBBON ─────────────────────────────────────────────── */}
      <div className="savings-ribbon">
        {/* LEFT: Currency Selector */}
        <div className="ribbon-group ribbon-group-left">
          <div className="currency-selector-large">
            <SegmentedToggle
              options={PRIMARY_CURRENCIES.map((c) => ({
                value: c,
                label: <><span className="currency-symbol">{CURRENCY_SYMBOLS[c]}</span><span className="currency-code">{c}</span></>,
              }))}
              value={currency}
              onChange={(v) => setCurrency(v as Currency)}
              size="sm"
            />
            <div className="currency-more-lg">
              <button
                className="currency-btn-lg more"
                onClick={() => setShowMoreCurrencies(!showMoreCurrencies)}
              >
                <ChevronDown size={14} />
              </button>
              {showMoreCurrencies && (
                <div className="currency-dropdown-lg">
                  {SECONDARY_CURRENCIES.map((c) => (
                    <button
                      key={c}
                      className={`currency-dropdown-item ${currency === c ? 'active' : ''}`}
                      onClick={() => {
                        setCurrency(c);
                        setShowMoreCurrencies(false);
                      }}
                    >
                      {CURRENCY_SYMBOLS[c]} {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Net Income + Add Bonus */}
        <div className="ribbon-group ribbon-group-center">
          {/* Net Income Input with Tooltip */}
          <div className="income-input-group">
            <div className="input-label-row">
              <span className="input-label">Net Income</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton icon={<HelpCircle size={14} />} label="Help" variant="ghost" size="sm" />
                </TooltipTrigger>
                <TooltipContent>
                  Net Income means the money actually entering your bank account monthly.
                </TooltipContent>
              </Tooltip>
            </div>
            <NumberInput
              value={netIncome || undefined}
              onChange={(v) => setNetIncome(v ?? 0)}
              label={`${symbol} /mo`}
              placeholder="0"
              min={0}
              fullWidth
            />
          </div>

          {/* Add Bonus Button */}
          <div className="bonus-button-group">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={() => setShowBonusModal(true)}
            >
              Add Bonus
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="bonus-help-icon">
                    <HelpCircle size={12} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Add your annual net bonus. It will be divided by 12 and added to monthly income.
                </TooltipContent>
              </Tooltip>
            </Button>
            {netBonus > 0 && (
              <span className="bonus-indicator">
                +{symbol}{(netBonus / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
              </span>
            )}
          </div>
        </div>

        {/* RIGHT: Empty for balance (or future controls) */}
        <div className="ribbon-group ribbon-group-right" />
      </div>

      {/* ─── MAIN CONTENT ───────────────────────────────────────────────── */}
      <div className="savings-main-layout">
        {/* LEFT PANEL: Income Display + Expenditure Sections */}
        <div className="savings-left-panel">
          {/* Total Monthly Income Display */}
          <div className="total-income-display">
            <span className="income-label">Total Monthly Income</span>
            <span className="income-value">
              {symbol}
              {totalMonthlyIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            {netBonus > 0 && (
              <span className="income-breakdown">
                ({symbol}{netIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })} salary + {symbol}{(netBonus / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })} bonus)
              </span>
            )}
          </div>

          {/* Expenditure Sections */}
          <div className="expenditure-sections">
            {expenseSections.map((section) => (
              <SavingsCategoryPanel
                key={section.id}
                section={section}
                currency={currency}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                onAmountChange={(categoryId, amount) =>
                  updateCategoryAmount(section.id, categoryId, amount)
                }
                onFrequencyChange={(categoryId, freq) =>
                  updateCategoryFrequency(section.id, categoryId, freq)
                }
                onAddSubcategory={() => addSubcategory(section.id, 'New item')}
                onUpdateSubcategory={(subId, updates) =>
                  updateSubcategory(section.id, subId, updates)
                }
                onRemoveSubcategory={(subId) => removeSubcategory(section.id, subId)}
              />
            ))}
            
            {/* Custom Sections */}
            {customSections.map((section) => (
              <SavingsCategoryPanel
                key={section.id}
                section={section}
                currency={currency}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                onAmountChange={(categoryId, amount) =>
                  updateCategoryAmount(section.id, categoryId, amount)
                }
                onAddSubcategory={() => addSubcategory(section.id, 'New item')}
                onUpdateSubcategory={(subId, updates) =>
                  updateSubcategory(section.id, subId, updates)
                }
                onRemoveSubcategory={(subId) => removeSubcategory(section.id, subId)}
                onUpdateSectionTitle={(title) => updateCustomSectionTitle(section.id, title)}
                onDeleteSection={() => removeCustomSection(section.id)}
                canDelete
              />
            ))}
            
            {/* Add Custom Section Button */}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FolderPlus size={16} />}
              onClick={() => addCustomSection('Custom Category')}
            >
              Add Custom Section
            </Button>
          </div>
        </div>

        {/* RIGHT PANEL: Analysis */}
        <div className="savings-right-panel">
          {/* 1. Income vs Outgoings Summary */}
          <div className="analysis-card summary-card">
            <div className="summary-rows">
              <div className="summary-row">
                <span className="summary-label">Total Income</span>
                <span className="summary-value income">
                  {symbol}
                  {totalMonthlyIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Total Outgoings</span>
                <span className="summary-value outgoings">
                  -{symbol}
                  {totalOutgoings.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row savings-row">
                <span className="summary-label">Monthly Savings</span>
                <span
                  className="summary-value savings"
                  style={{ color: monthlySavings >= 0 ? '#22c55e' : '#ef4444' }}
                >
                  {monthlySavings >= 0 ? '+' : ''}
                  {symbol}
                  {Math.abs(monthlySavings).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            
            {/* CTA Button: Invest Your Savings */}
            {monthlySavings > 0 && (
              <Button
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight size={16} />}
                onClick={handleInvestSavings}
                fullWidth
              >
                See how your savings could grow
              </Button>
            )}
          </div>

          {/* 2. Savings Rate Display */}
          <div className="analysis-card savings-rate-card">
            <h4 className="card-title inline">Savings Rate</h4>
            <div className="savings-rate-display">
              <span
                className="savings-rate-value"
                style={{ color: savingsRateColor }}
              >
                {formatSavingsRate(savingsRate)}
              </span>
              <span
                className="savings-rate-label"
                style={{ color: savingsRateColor }}
              >
                {savingsRateLabel}
              </span>
            </div>
            <p className="savings-rate-description">
              {savingsRate >= 0.20
                ? 'Excellent! You\'re saving a healthy portion of your income.'
                : savingsRate >= 0.10
                ? 'Good progress. Consider increasing savings if possible.'
                : savingsRate >= 0
                ? 'There\'s room for improvement. Review your expenses.'
                : 'You\'re spending more than you earn. Time to cut back.'}
            </p>
          </div>

          {/* 3. Waterfall Chart */}
          <div className="analysis-card">
            <h4 className="card-title">Income Flow</h4>
            <WaterfallChart
              totalIncome={totalMonthlyIncome}
              sections={allSections}
              currency={currency}
            />
          </div>
        </div>
      </div>

      {/* Bonus Modal */}
      <BonusModal
        isOpen={showBonusModal}
        currency={currency}
        currentBonus={netBonus}
        onSave={setNetBonus}
        onClose={() => setShowBonusModal(false)}
      />
    </div>
  );
}
