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
 * 
 * State persisted via Zustand store
 */

import { useMemo, useCallback, useEffect } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';
import {
  calculateIncomeTax,
  calculateEmployerPension,
  calculateCompoundGrowth,
  TaxCalculationResult,
} from '../utils/ukTaxCalculator';
import { useTaxStore } from '../store/useTaxStore';
import { TaxSettingsTray } from './tax/TaxSettingsTray';
import { SalaryBreakdownTable } from './tax/SalaryBreakdownTable';
import { ScenarioPanel } from './tax/ScenarioPanel';

// Growth rate for compound projections
const GROWTH_RATE = 7;

export function TaxCalculatorPanel() {
  // Get all state from Zustand store (persisted)
  const {
    grossSalary,
    salaryInput,
    region,
    pensionBase,
    pensionYourContribution,
    pensionEmployerMatch,
    age,
    retirementAge,
    viewMode,
    scenarioType,
    salarySacrificePercent,
    salaryChangePercent,
    // Actions
    setGrossSalary,
    setSalaryInput,
    setRegion,
    setPensionBase,
    setPensionYourContribution,
    setPensionEmployerMatch,
    setAge,
    setRetirementAge,
    setViewMode,
    setScenarioType,
    setSalarySacrificePercent,
    setSalaryChangePercent,
    resetToDefaults,
  } = useTaxStore();

  // Years to retirement
  const yearsToRetirement = Math.max(0, retirementAge - age);

  // Automatically reduce employer match if it exceeds your contribution
  useEffect(() => {
    if (pensionEmployerMatch > pensionYourContribution) {
      setPensionEmployerMatch(pensionYourContribution);
    }
  }, [pensionYourContribution, pensionEmployerMatch, setPensionEmployerMatch]);

  // Total employee pension contribution (from left panel settings)
  const totalBasePension = pensionBase + pensionYourContribution + pensionEmployerMatch;
  
  // Main tax calculation
  const taxResult = useMemo<TaxCalculationResult | null>(() => {
    if (grossSalary === null || grossSalary <= 0) return null;
    return calculateIncomeTax(grossSalary, region, pensionYourContribution);
  }, [grossSalary, region, pensionYourContribution]);

  // Scenario tax calculation - depends on scenario type
  const scenarioResult = useMemo<TaxCalculationResult | null>(() => {
    if (grossSalary === null || grossSalary <= 0) return null;
    
    if (scenarioType === 'salary-sacrifice') {
      // Salary sacrifice: same gross salary, higher pension contribution
      const effectivePercent = Math.min(50, pensionYourContribution + salarySacrificePercent);
      return calculateIncomeTax(grossSalary, region, effectivePercent);
    } else {
      // Salary change: different gross salary, same pension percentage
      const newSalary = Math.max(0, Math.min(grossSalary * (1 + salaryChangePercent / 100), 1000000));
      return calculateIncomeTax(newSalary, region, pensionYourContribution);
    }
  }, [grossSalary, region, pensionYourContribution, salarySacrificePercent, scenarioType, salaryChangePercent]);

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

  // Total pension contributions (employee + employer) for baseline
  const totalPensionContribution = useMemo(() => {
    if (!taxResult || grossSalary === null) return 0;
    return taxResult.pensionContribution + employerPension;
  }, [taxResult, employerPension, grossSalary]);

  // Scenario pension contribution (adjusted for sacrifice and/or salary change)
  const scenarioTotalPension = useMemo(() => {
    if (!scenarioResult || grossSalary === null) return 0;
    
    if (scenarioType === 'salary-sacrifice') {
      // Sacrifice: same gross salary, different pension %
      const effectivePercent = pensionYourContribution + salarySacrificePercent;
      const scenarioEmployerPension = calculateEmployerPension(
        grossSalary,
        pensionBase,
        pensionEmployerMatch,
        effectivePercent
      );
      return scenarioResult.pensionContribution + scenarioEmployerPension;
    } else {
      // Salary change: different gross salary, same pension %
      const newSalary = scenarioResult.grossSalary;
      const scenarioEmployerPension = calculateEmployerPension(
        newSalary,
        pensionBase,
        pensionEmployerMatch,
        pensionYourContribution
      );
      return scenarioResult.pensionContribution + scenarioEmployerPension;
    }
  }, [scenarioResult, grossSalary, pensionBase, pensionEmployerMatch, pensionYourContribution, salarySacrificePercent, scenarioType]);

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

  // Get the reset function from store
  // resetToDefaults is already destructured from useTaxStore above

  // Reset all values to defaults EXCEPT salary (handled by store)
  const handleReset = useCallback(() => {
    resetToDefaults();
  }, [resetToDefaults]);

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
                onChange={(e) => handleAgeChange(parseInt(e.target.value) || 38)}
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
              {/* Left Summary Ribbon - Total pension contribution (employee + employer) */}
              <div className="summary-ribbon baseline">
                <div className="ribbon-stat">
                  <span className="ribbon-label">Total Pension Contribution</span>
                  <span className="ribbon-value">
                    {formatCurrency(viewMode === 'annual' ? totalPensionContribution : totalPensionContribution / 12)}
                    <span className="ribbon-period">/{viewMode === 'annual' ? 'year' : 'month'}</span>
                  </span>
                </div>
                <div className="ribbon-divider" />
                <div className="ribbon-stat">
                  <span className="ribbon-label">Effective Tax Rate</span>
                  <span className="ribbon-value highlight">
                    {((taxResult.totalTax + taxResult.totalNI) / taxResult.grossSalary * 100).toFixed(1)}%
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
                salaryChangePercent={salaryChangePercent}
                onSalaryChangePercentChange={setSalaryChangePercent}
                scenarioType={scenarioType}
                onScenarioTypeChange={setScenarioType}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
              {/* Right Summary Ribbon - Same format as left, adjusted for scenario */}
              <div className="summary-ribbon scenario">
                <div className="ribbon-stat">
                  <span className="ribbon-label">Total Pension Contribution</span>
                  <span className="ribbon-value">
                    {formatCurrency(viewMode === 'annual' ? scenarioTotalPension : scenarioTotalPension / 12)}
                    <span className="ribbon-period">/{viewMode === 'annual' ? 'year' : 'month'}</span>
                  </span>
                </div>
                <div className="ribbon-divider" />
                <div className="ribbon-stat">
                  <span className="ribbon-label">Effective Tax Rate</span>
                  <span className="ribbon-value highlight">
                    {scenarioResult ? ((scenarioResult.totalTax + scenarioResult.totalNI) / scenarioResult.grossSalary * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>
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
