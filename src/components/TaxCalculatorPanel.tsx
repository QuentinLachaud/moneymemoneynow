/**
 * TaxCalculatorPanel — UK Income Tax Calculator
 * 
 * Layout:
 * - Left tray: Tax settings (region, pension percentages)
 * - Top controls: Salary + Age + Retirement Age + Calculate + Reset
 * - Main area: Two equal-width panels (Current vs Scenario)
 * - Bottom summary ribbons showing tax savings and sacrifice projections
 * 
 * Uses modular components:
 * - TaxSettingsTray
 * - SalaryBreakdownTable
 * - ScenarioPanel
 */

import { useState, useMemo, useCallback } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';
import {
  TaxRegion,
  calculateIncomeTax,
  calculateEmployerPension,
  calculateCompoundGrowth,
  TaxCalculationResult,
} from '../utils/ukTaxCalculator';
import { TaxSettingsTray } from './tax/TaxSettingsTray';
import { SalaryBreakdownTable } from './tax/SalaryBreakdownTable';
import { ScenarioPanel } from './tax/ScenarioPanel';

// Default constants
const DEFAULT_STATE_PENSION_AGE = 67;
const DEFAULT_AGE = 38;
const DEFAULT_PENSION_BASE = 3;
const DEFAULT_PENSION_YOUR_CONTRIBUTION = 3;
const DEFAULT_PENSION_EMPLOYER_MATCH = 0;
const DEFAULT_SALARY_SACRIFICE = 0;
const GROWTH_RATE = 7;

// View mode type
type ViewMode = 'annual' | 'monthly';

export function TaxCalculatorPanel() {
  // Core inputs
  const [grossSalary, setGrossSalary] = useState<number | null>(null);
  const [salaryInput, setSalaryInput] = useState<string>('');
  
  // Tax settings state
  const [region, setRegion] = useState<TaxRegion>('england');
  
  // Pension settings
  const [pensionBase, setPensionBase] = useState<number>(DEFAULT_PENSION_BASE);
  const [pensionYourContribution, setPensionYourContribution] = useState<number>(DEFAULT_PENSION_YOUR_CONTRIBUTION);
  const [pensionEmployerMatch, setPensionEmployerMatch] = useState<number>(DEFAULT_PENSION_EMPLOYER_MATCH);
  
  // Age settings
  const [age, setAge] = useState<number>(DEFAULT_AGE);
  const [retirementAge, setRetirementAge] = useState<number>(DEFAULT_STATE_PENSION_AGE);

  // View mode (annual or monthly) - shared across both panels
  const [viewMode, setViewMode] = useState<ViewMode>('annual');

  // Salary sacrifice percent (for scenario panel)
  const [salarySacrificePercent, setSalarySacrificePercent] = useState<number>(DEFAULT_SALARY_SACRIFICE);

  // Years to retirement
  const yearsToRetirement = Math.max(0, retirementAge - age);

  // Total employee pension contribution (from left panel settings)
  const totalBasePension = pensionBase + pensionYourContribution + pensionEmployerMatch;
  
  // Main tax calculation
  const taxResult = useMemo<TaxCalculationResult | null>(() => {
    if (grossSalary === null || grossSalary <= 0) return null;
    return calculateIncomeTax(grossSalary, region, pensionYourContribution);
  }, [grossSalary, region, pensionYourContribution]);

  // Scenario tax calculation (with sacrifice)
  const scenarioResult = useMemo<TaxCalculationResult | null>(() => {
    if (grossSalary === null || grossSalary <= 0) return null;
    const effectivePercent = Math.min(50, pensionYourContribution + salarySacrificePercent);
    return calculateIncomeTax(grossSalary, region, effectivePercent);
  }, [grossSalary, region, pensionYourContribution, salarySacrificePercent]);

  // Calculate tax saved and sacrifice amounts for summary ribbon
  const summaryData = useMemo(() => {
    if (!taxResult || !scenarioResult || !grossSalary) return null;
    
    const taxSaved = (taxResult.totalTax + taxResult.totalNI) - (scenarioResult.totalTax + scenarioResult.totalNI);
    const sacrificeAmount = scenarioResult.pensionContribution - taxResult.pensionContribution;
    const totalAddedToPension = sacrificeAmount + taxSaved; // What goes to pension pot
    const futureValue = calculateCompoundGrowth(totalAddedToPension, yearsToRetirement, GROWTH_RATE);
    
    return {
      taxSaved,
      sacrificeAmount,
      totalAddedToPension,
      futureValue,
      yearsToRetirement,
    };
  }, [taxResult, scenarioResult, grossSalary, yearsToRetirement]);

  // Employer pension calculation
  const employerPension = useMemo(() => {
    if (grossSalary === null) return 0;
    return calculateEmployerPension(
      grossSalary,
      pensionBase,
      pensionEmployerMatch,
      pensionYourContribution
    );
  }, [grossSalary, pensionBase, pensionEmployerMatch, pensionYourContribution]);

  // Handle salary input
  const handleSalarySubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(salaryInput.replace(/[,£]/g, ''));
    if (!isNaN(value) && value > 0) {
      setGrossSalary(value);
    }
  }, [salaryInput]);

  const handleSalaryKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSalarySubmit(e);
    }
  }, [handleSalarySubmit]);

  // Format salary for display
  const formatDisplaySalary = (value: string): string => {
    const num = parseFloat(value.replace(/[,£]/g, ''));
    if (isNaN(num)) return value;
    return num.toLocaleString('en-GB');
  };

  // Reset all values to defaults EXCEPT salary
  const handleReset = useCallback(() => {
    // Keep salary as is
    setAge(DEFAULT_AGE);
    setRetirementAge(DEFAULT_STATE_PENSION_AGE);
    setPensionBase(DEFAULT_PENSION_BASE);
    setPensionYourContribution(DEFAULT_PENSION_YOUR_CONTRIBUTION);
    setPensionEmployerMatch(DEFAULT_PENSION_EMPLOYER_MATCH);
    setSalarySacrificePercent(DEFAULT_SALARY_SACRIFICE);
    setViewMode('annual');
    setRegion('england');
  }, []);

  // Format currency helper
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Handle age change with retirement age constraint
  const handleAgeChange = (newAge: number) => {
    setAge(newAge);
    // If retirement age is now less than age, update it
    if (retirementAge < newAge) {
      setRetirementAge(newAge);
    }
  };

  return (
    <div className="tax-calculator-panel">
      {/* Left Tray - Tax Settings */}
      <TaxSettingsTray
        region={region}
        onRegionChange={setRegion}
        pensionBase={pensionBase}
        onPensionBaseChange={setPensionBase}
        pensionYourContribution={pensionYourContribution}
        onPensionYourContributionChange={setPensionYourContribution}
        pensionEmployerMatch={pensionEmployerMatch}
        onPensionEmployerMatchChange={setPensionEmployerMatch}
      />

      {/* Main Content Area */}
      <div className="tax-main-content">
        {/* Top Controls Row */}
        <div className="top-controls-row">
          <form onSubmit={handleSalarySubmit} className="controls-form">
            {/* Salary Input - Left aligned */}
            <div className="control-group salary-group">
              <label htmlFor="salary-input">Salary</label>
              <div className="salary-input-wrapper">
                <span className="currency-symbol">£</span>
                <input
                  id="salary-input"
                  type="text"
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                  onKeyDown={handleSalaryKeyDown}
                  onBlur={(e) => setSalaryInput(formatDisplaySalary(e.target.value))}
                  placeholder="Annual salary"
                  className="salary-input"
                  autoFocus
                />
              </div>
            </div>

            {/* Age Input */}
            <div className="control-group age-group">
              <label htmlFor="age-input">Age</label>
              <input
                id="age-input"
                type="number"
                value={age}
                onChange={(e) => handleAgeChange(parseInt(e.target.value) || DEFAULT_AGE)}
                min={16}
                max={100}
                className="age-input"
              />
            </div>

            {/* Retirement Age Selector */}
            <div className="control-group retirement-group">
              <label htmlFor="retirement-input">Retirement Age</label>
              <input
                id="retirement-input"
                type="number"
                value={retirementAge}
                onChange={(e) => setRetirementAge(Math.max(age, parseInt(e.target.value) || age))}
                min={age}
                max={100}
                className="retirement-input"
              />
            </div>

            {/* Button Group */}
            <div className="button-group">
              {/* Calculate Button */}
              <button type="submit" className="calculate-btn">
                <Calculator size={16} />
                Calculate
              </button>

              {/* Reset Button */}
              <button type="button" className="reset-btn" onClick={handleReset}>
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Results Section - Two equal panels */}
        {taxResult && grossSalary && (
          <div className="tax-results-grid">
            {/* Left: Current Salary Breakdown */}
            <div className="breakdown-section">
              <SalaryBreakdownTable
                result={taxResult}
                title="Current Salary"
                isScenario={false}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
              {/* Left Summary Ribbon - Current pension contribution */}
              <div className="summary-ribbon baseline">
                <div className="ribbon-stat">
                  <span className="ribbon-label">Your Pension Contribution</span>
                  <span className="ribbon-value">
                    {formatCurrency(viewMode === 'annual' ? taxResult.pensionContribution : taxResult.pensionContribution / 12)}
                    <span className="ribbon-period">/{viewMode === 'annual' ? 'year' : 'month'}</span>
                  </span>
                </div>
                <div className="ribbon-divider" />
                <div className="ribbon-stat">
                  <span className="ribbon-label">Tax Rate</span>
                  <span className="ribbon-value highlight">
                    {((taxResult.totalTax + taxResult.totalNI) / taxResult.grossSalary * 100).toFixed(1)}%
                    <span className="ribbon-period">effective</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Scenario Panel */}
            <div className="scenario-section">
              <ScenarioPanel
                baselineResult={taxResult}
                grossSalary={grossSalary}
                region={region}
                pensionPercent={pensionYourContribution}
                employerContributionPercent={pensionBase}
                employerMatchPercent={pensionEmployerMatch}
                employerPension={employerPension}
                age={age}
                pensionAge={retirementAge}
                basePensionTotal={totalBasePension}
                salarySacrificePercent={salarySacrificePercent}
                onSalarySacrificeChange={setSalarySacrificePercent}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
              {/* Right Summary Ribbon - Sacrifice projections */}
              {summaryData && salarySacrificePercent > 0 && (
                <div className="summary-ribbon scenario">
                  <div className="ribbon-message">
                    <span className="ribbon-highlight">
                      By sacrificing {formatCurrency(viewMode === 'annual' ? summaryData.sacrificeAmount : summaryData.sacrificeAmount / 12)} per {viewMode === 'annual' ? 'year' : 'month'},
                    </span>
                    {' '}you add{' '}
                    <span className="ribbon-highlight golden">
                      {formatCurrency(summaryData.futureValue)}
                    </span>
                    {' '}to your pension in {summaryData.yearsToRetirement} years
                  </div>
                </div>
              )}
              {/* Show placeholder when no sacrifice */}
              {(!summaryData || salarySacrificePercent === 0) && (
                <div className="summary-ribbon scenario empty">
                  <div className="ribbon-message muted">
                    Adjust salary sacrifice to see pension projection
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!taxResult && (
          <div className="empty-state">
            <div className="empty-state-content">
              <Calculator size={48} strokeWidth={1} />
              <h3>Enter your salary to get started</h3>
              <p>
                Enter your annual gross salary above and click Calculate to see 
                a detailed breakdown of your income tax, National Insurance, 
                and take-home pay.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
