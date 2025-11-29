/**
 * TaxCalculatorPanel — UK Income Tax Calculator
 * 
 * Layout:
 * - Left tray: Tax settings (region, pension, employer, age)
 * - Center top: Salary input + Calculate button
 * - Center bottom: Split view (Breakdown table | Scenario panel)
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

// Pension age constant
const DEFAULT_PENSION_AGE = 67;

export function TaxCalculatorPanel() {
  // Core inputs
  const [grossSalary, setGrossSalary] = useState<number | null>(null);
  const [salaryInput, setSalaryInput] = useState<string>('');
  
  // Tax settings state
  const [region, setRegion] = useState<TaxRegion>('england');
  const [pensionPercent, setPensionPercent] = useState<number>(0);
  const [employerContributionPercent, setEmployerContributionPercent] = useState<number>(3);
  const [employerMatchPercent, setEmployerMatchPercent] = useState<number>(0);
  const [age, setAge] = useState<number>(30);

  // Main tax calculation
  const taxResult = useMemo<TaxCalculationResult | null>(() => {
    if (grossSalary === null || grossSalary <= 0) return null;
    return calculateIncomeTax(grossSalary, region, pensionPercent);
  }, [grossSalary, region, pensionPercent]);

  // Employer pension calculation
  const employerPension = useMemo(() => {
    if (grossSalary === null) return 0;
    return calculateEmployerPension(
      grossSalary,
      employerContributionPercent,
      employerMatchPercent,
      pensionPercent
    );
  }, [grossSalary, employerContributionPercent, employerMatchPercent, pensionPercent]);

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
        pensionPercent={pensionPercent}
        onPensionPercentChange={setPensionPercent}
        employerContributionPercent={employerContributionPercent}
        onEmployerContributionChange={setEmployerContributionPercent}
        employerMatchPercent={employerMatchPercent}
        onEmployerMatchChange={setEmployerMatchPercent}
        age={age}
        onAgeChange={setAge}
        pensionAge={DEFAULT_PENSION_AGE}
      />

      {/* Main Content Area */}
      <div className="tax-main-content">
        {/* Salary Input Section - Centered at top */}
        <div className="salary-input-section">
          <form onSubmit={handleSalarySubmit} className="salary-form">
            <div className="salary-input-wrapper">
              <span className="currency-symbol">£</span>
              <input
                type="text"
                value={salaryInput}
                onChange={(e) => setSalaryInput(e.target.value)}
                onKeyDown={handleSalaryKeyDown}
                onBlur={(e) => setSalaryInput(formatDisplaySalary(e.target.value))}
                placeholder="Enter annual salary"
                className="salary-input"
                autoFocus
              />
              <button type="submit" className="calculate-btn">
                <Calculator size={16} />
                Calculate
              </button>
            </div>
          </form>
        </div>

        {/* Results Section - Side by side breakdown and scenario */}
        {taxResult && grossSalary && (
          <div className="tax-results-grid">
            {/* Left: Current Salary Breakdown */}
            <div className="breakdown-section">
              <SalaryBreakdownTable
                result={taxResult}
                pensionPercent={pensionPercent}
                employerPension={employerPension}
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
                pensionPercent={pensionPercent}
                employerContributionPercent={employerContributionPercent}
                employerMatchPercent={employerMatchPercent}
                employerPension={employerPension}
                age={age}
                pensionAge={DEFAULT_PENSION_AGE}
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
