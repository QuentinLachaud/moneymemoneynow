/**
 * ScenarioPanel — Right side simulation panel
 * 
 * Features:
 * - Mode selector (Salary Change / Salary Sacrifice) as segment buttons
 * - Salary sacrifice with clear explanation (on top of base pension)
 * - Stepped slider (1-15%, 1% increments)
 * - Delta values with golden styling for benefits
 * - Shared Annual/Monthly pill-switch toggle
 */

import { useState, useMemo } from 'react';
import { TrendingUp, PiggyBank, Percent, PoundSterling, Info } from 'lucide-react';
import { 
  TaxRegion, 
  TaxCalculationResult,
  calculateIncomeTax,
  calculateCompoundGrowth,
  compareTaxScenarios,
} from '../../utils/ukTaxCalculator';
import { SalaryBreakdownTable } from './SalaryBreakdownTable';
import { ModeCard } from './shared/ModeCard';

type ScenarioType = 'salary-change' | 'salary-sacrifice';
type InputMode = 'percent' | 'amount';
type ViewMode = 'annual' | 'monthly';

interface ScenarioPanelProps {
  baselineResult: TaxCalculationResult;
  grossSalary: number;
  region: TaxRegion;
  pensionPercent: number;
  employerContributionPercent: number;
  employerMatchPercent: number;
  employerPension: number;
  age: number;
  pensionAge: number;
  basePensionTotal: number; // Total from left panel (Base + Your + Employer)
  salarySacrificePercent: number;
  onSalarySacrificeChange: (percent: number) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ScenarioPanel({
  baselineResult,
  grossSalary,
  region,
  pensionPercent,
  employerContributionPercent,
  employerMatchPercent,
  employerPension,
  age,
  pensionAge,
  basePensionTotal,
  salarySacrificePercent,
  onSalarySacrificeChange,
  viewMode,
  onViewModeChange,
}: ScenarioPanelProps) {
  // Scenario selection
  const [scenario, setScenario] = useState<ScenarioType>('salary-sacrifice');
  const [inputMode, setInputMode] = useState<InputMode>('percent');

  // Salary change state
  const [changePercent, setChangePercent] = useState<number>(3);
  const [changeAmount, setChangeAmount] = useState<number>(1000);

  const yearsToRetirement = Math.max(0, pensionAge - age);
  const GROWTH_RATE = 7;

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate new employer pension for a given pension percent
  const calculateEmployerPensionForPercent = (percent: number): number => {
    const baseContribution = (grossSalary * employerContributionPercent) / 100;
    const matchContribution = Math.min(
      (grossSalary * employerMatchPercent) / 100,
      (grossSalary * percent) / 100
    );
    return baseContribution + matchContribution;
  };

  // Salary change simulation
  const salaryChangeResult = useMemo(() => {
    let newSalary: number;
    if (inputMode === 'percent') {
      newSalary = grossSalary * (1 + changePercent / 100);
    } else {
      newSalary = grossSalary + changeAmount;
    }
    newSalary = Math.max(0, Math.min(newSalary, 1000000)); // Cap at £1M

    const result = calculateIncomeTax(newSalary, region, pensionPercent);
    const comparison = compareTaxScenarios(baselineResult, result);
    const newEmployerPension = calculateEmployerPensionForPercent(pensionPercent);

    return {
      result,
      comparison,
      employerPension: newEmployerPension,
      salaryChange: newSalary - grossSalary,
    };
  }, [grossSalary, region, pensionPercent, inputMode, changePercent, changeAmount, baselineResult, employerContributionPercent, employerMatchPercent]);

  // Salary sacrifice simulation - uses the total from left panel + additional sacrifice
  const sacrificeResult = useMemo(() => {
    // Total effective pension = base pension from left panel + salary sacrifice
    const targetSacrificePercent = pensionPercent + salarySacrificePercent;
    
    // Cap at 50%
    const effectivePercent = Math.min(50, Math.max(0, targetSacrificePercent));

    const scenarioResult = calculateIncomeTax(grossSalary, region, effectivePercent);
    const comparison = compareTaxScenarios(baselineResult, scenarioResult);
    
    const additionalPensionContribution = scenarioResult.pensionContribution - baselineResult.pensionContribution;
    const taxSaved = scenarioResult.pensionTaxSaved - baselineResult.pensionTaxSaved;
    const niSaved = scenarioResult.pensionNISaved - baselineResult.pensionNISaved;
    const totalSaved = taxSaved + niSaved;
    
    // Calculate employer pension for new rate
    const newEmployerPension = calculateEmployerPensionForPercent(effectivePercent);
    const additionalEmployerPension = newEmployerPension - employerPension;
    
    // Compound growth calculations
    const singleYearFV = calculateCompoundGrowth(additionalPensionContribution, yearsToRetirement, GROWTH_RATE);
    const repeatedFV = calculateCompoundGrowth(additionalPensionContribution, yearsToRetirement, GROWTH_RATE);

    return {
      result: scenarioResult,
      comparison,
      targetPercent: effectivePercent,
      additionalPension: additionalPensionContribution,
      taxSaved,
      niSaved,
      totalSaved,
      newEmployerPension,
      additionalEmployerPension,
      singleYearFV,
      repeatedFV,
      netPayReduction: Math.abs(comparison.differences.netPay),
    };
  }, [grossSalary, region, pensionPercent, salarySacrificePercent, baselineResult, yearsToRetirement, employerPension, employerContributionPercent, employerMatchPercent]);

  // Get current result based on scenario
  const currentResult = scenario === 'salary-change' 
    ? salaryChangeResult.result 
    : sacrificeResult.result;

  // Get title for breakdown table
  const getScenarioTitle = (): string => {
    if (scenario === 'salary-change') {
      const change = salaryChangeResult.salaryChange;
      return `After ${change >= 0 ? '+' : ''}${formatCurrency(change)}`;
    } else {
      return `At ${sacrificeResult.targetPercent.toFixed(0)}% Pension`;
    }
  };

  // Handle stepped slider change (1-15%, 1% increments)
  const handleSacrificeSliderChange = (value: number) => {
    // Ensure integer values
    const stepped = Math.round(value);
    onSalarySacrificeChange(Math.min(15, Math.max(1, stepped)));
  };

  return (
    <div className="scenario-panel">
      {/* Mode Selector - Segment Buttons */}
      <div className="mode-selector-row">
        <div className="scenario-toggle">
          <button
            className={`scenario-btn ${scenario === 'salary-change' ? 'active' : ''}`}
            onClick={() => setScenario('salary-change')}
          >
            <TrendingUp size={16} />
            Salary Change
          </button>
          <button
            className={`scenario-btn ${scenario === 'salary-sacrifice' ? 'active' : ''}`}
            onClick={() => setScenario('salary-sacrifice')}
          >
            <PiggyBank size={16} />
            Salary Sacrifice
          </button>
        </div>
      </div>

      {/* Scenario-specific controls */}
      {scenario === 'salary-change' ? (
        <>
          {/* Sub-mode Cards for Salary Change */}
          <div className="input-mode-cards">
            <ModeCard
              icon={<Percent size={20} />}
              label="Percentage"
              active={inputMode === 'percent'}
              onClick={() => setInputMode('percent')}
            />
            <ModeCard
              icon={<PoundSterling size={20} />}
              label="Amount"
              active={inputMode === 'amount'}
              onClick={() => setInputMode('amount')}
            />
          </div>

          {/* Value Input for Salary Change */}
          <div className="value-input-section">
            {inputMode === 'percent' ? (
              <div className="value-input-row">
                <input
                  type="range"
                  min={-30}
                  max={50}
                  step={1}
                  value={changePercent}
                  onChange={(e) => setChangePercent(parseInt(e.target.value))}
                  className="value-slider"
                />
                <div className="value-display">
                  <input
                    type="number"
                    min={-100}
                    max={100}
                    step={1}
                    value={changePercent}
                    onChange={(e) => setChangePercent(parseInt(e.target.value) || 0)}
                    className="value-number"
                  />
                  <span className="value-unit">%</span>
                </div>
              </div>
            ) : (
              <div className="value-input-row">
                <input
                  type="range"
                  min={-50000}
                  max={100000}
                  step={1000}
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(parseInt(e.target.value))}
                  className="value-slider"
                />
                <div className="value-display amount">
                  <span className="value-unit prefix">£</span>
                  <input
                    type="number"
                    min={-100000}
                    max={500000}
                    step={1000}
                    value={changeAmount}
                    onChange={(e) => setChangeAmount(parseInt(e.target.value) || 0)}
                    className="value-number"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Salary Sacrifice Controls */}
          <div className="sacrifice-controls">
            {/* Explanatory Label */}
            <div className="sacrifice-explainer">
              <Info size={14} />
              <span>Additional salary sacrifice (on top of {basePensionTotal}% base pension from left panel)</span>
            </div>

            {/* Stepped Slider (1-15%, 1% increments) */}
            <div className="sacrifice-slider-section">
              <div className="slider-with-labels">
                <span className="slider-min">1%</span>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={salarySacrificePercent || 1}
                  onChange={(e) => handleSacrificeSliderChange(parseInt(e.target.value))}
                  className="sacrifice-slider stepped"
                />
                <span className="slider-max">15%</span>
              </div>
              <div className="sacrifice-value-badge">
                <span className="sacrifice-value">+{salarySacrificePercent || 0}%</span>
                <span className="sacrifice-total">Total: {sacrificeResult.targetPercent}%</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Result Table with Delta */}
      <div className="scenario-result">
        <SalaryBreakdownTable
          result={currentResult}
          title={getScenarioTitle()}
          baselineResult={baselineResult}
          isScenario
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      </div>

      {/* Pension Growth Projection (for Salary Sacrifice) */}
      {scenario === 'salary-sacrifice' && sacrificeResult.additionalPension > 0 && yearsToRetirement > 0 && (
        <div className="pension-growth-section">
          <h5>
            <Info size={14} />
            Pension Impact Summary
          </h5>
          
          <div className="growth-summary">
            <div className="summary-row impact">
              <span className="label">Monthly take-home reduction</span>
              <span className="value negative">
                -{formatCurrency(sacrificeResult.netPayReduction / 12)}
              </span>
            </div>
            <div className="summary-row">
              <span className="label">Additional annual pension</span>
              <span className="value positive bonus">
                +{formatCurrency(sacrificeResult.additionalPension)}
              </span>
            </div>
            {sacrificeResult.additionalEmployerPension > 0 && (
              <div className="summary-row">
                <span className="label">Extra employer contribution</span>
                <span className="value positive bonus">
                  +{formatCurrency(sacrificeResult.additionalEmployerPension)}
                </span>
              </div>
            )}
            <div className="summary-row">
              <span className="label">Tax & NI saved this year</span>
              <span className="value positive bonus">
                +{formatCurrency(sacrificeResult.totalSaved)}
              </span>
            </div>
          </div>

          <div className="projection-box">
            <div className="projection-item">
              <span className="projection-label">
                This year's extra contribution at age {pensionAge}
              </span>
              <span className="projection-value bonus">
                {formatCurrency(sacrificeResult.singleYearFV)}
              </span>
              <span className="projection-detail">
                ({formatCurrency(sacrificeResult.additionalPension)} × {yearsToRetirement} years at {GROWTH_RATE}%)
              </span>
            </div>
            
            <div className="projection-item highlight">
              <span className="projection-label">
                If repeated every year until age {pensionAge}
              </span>
              <span className="projection-value bonus">
                {formatCurrency(sacrificeResult.repeatedFV)}
              </span>
              <span className="projection-detail">
                Annual contribution compounded at {GROWTH_RATE}% over {yearsToRetirement} years
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
