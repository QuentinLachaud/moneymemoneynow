/**
 * TaxCalculatorPanel — UK Income Tax Calculator
 * 
 * Layout:
 * - Left tray: Tax settings (region, pension percentages)
 * - Top controls: Salary + Age + Retirement Age + Calculate
 * - Main area: Two equal-width panels (Current vs Scenario)
 * 
 * Uses modular components:
 * - TaxSettingsTray
 * - SalaryBreakdownTable
 * - ScenarioPanel
 */

import { useState, useMemo, useCallback } from 'react';
import { Calculator } from 'lucide-react';
import {
  TaxRegion,
  calculateIncomeTax,
  calculateEmployerPension,
  TaxCalculationResult,
} from '../utils/ukTaxCalculator';
import { TaxSettingsTray } from './tax/TaxSettingsTray';
import { SalaryBreakdownTable } from './tax/SalaryBreakdownTable';
import { ScenarioPanel } from './tax/ScenarioPanel';

// Default constants
const DEFAULT_STATE_PENSION_AGE = 67;
const DEFAULT_AGE = 38;

export function TaxCalculatorPanel() {
  // Core inputs
  const [grossSalary, setGrossSalary] = useState<number | null>(null);
  const [salaryInput, setSalaryInput] = useState<string>('');
  
  // Tax settings state
  const [region, setRegion] = useState<TaxRegion>('england');
  
  // Pension settings (new naming)
  const [pensionBase, setPensionBase] = useState<number>(3);
  const [pensionYourContribution, setPensionYourContribution] = useState<number>(0);
  const [pensionEmployerMatch, setPensionEmployerMatch] = useState<number>(0);
  
  // Age settings
  const [age, setAge] = useState<number>(DEFAULT_AGE);
  const [retirementAge, setRetirementAge] = useState<number>(DEFAULT_STATE_PENSION_AGE);

  // Total employee pension contribution
  const totalEmployeePension = pensionYourContribution;
  
  // Main tax calculation
  const taxResult = useMemo<TaxCalculationResult | null>(() => {
    if (grossSalary === null || grossSalary <= 0) return null;
    return calculateIncomeTax(grossSalary, region, totalEmployeePension);
  }, [grossSalary, region, totalEmployeePension]);

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
                onChange={(e) => setAge(parseInt(e.target.value) || DEFAULT_AGE)}
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
                onChange={(e) => setRetirementAge(parseInt(e.target.value) || DEFAULT_STATE_PENSION_AGE)}
                min={55}
                max={75}
                className="retirement-input"
              />
            </div>

            {/* Calculate Button */}
            <button type="submit" className="calculate-btn">
              <Calculator size={16} />
              Calculate
            </button>
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
              />
            </div>

            {/* Right: Scenario Panel */}
            <div className="scenario-section">
              <ScenarioPanel
                baselineResult={taxResult}
                grossSalary={grossSalary}
                region={region}
                pensionPercent={totalEmployeePension}
                employerContributionPercent={pensionBase}
                employerMatchPercent={pensionEmployerMatch}
                employerPension={employerPension}
                age={age}
                pensionAge={retirementAge}
              />
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
