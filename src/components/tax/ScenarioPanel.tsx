/**
 * ScenarioPanel — Right side simulation panel
 * 
 * Contains scenario selector toggle and two scenarios:
 * 1. Salary Change - Simulate raise/cut with % or £ input
 * 2. Salary Sacrifice - Simulate pension sacrifice with compound growth projection
 */

import { useState, useMemo } from 'react';
import { TrendingUp, PiggyBank, Percent, Info } from 'lucide-react';
import { 
  TaxRegion, 
  TaxCalculationResult,
  calculateIncomeTax,
  calculateCompoundGrowth,
  compareTaxScenarios,
} from '../../utils/ukTaxCalculator';
import { SalaryBreakdownTable } from './SalaryBreakdownTable';

type ScenarioType = 'salary-change' | 'salary-sacrifice';

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
}: ScenarioPanelProps) {
  // Scenario selection
  const [scenario, setScenario] = useState<ScenarioType>('salary-change');

  // Salary change state
  const [changePercent, setChangePercent] = useState<number>(10);
  const [changeAbsolute, setChangeAbsolute] = useState<number>(5000);
  const [changeMode, setChangeMode] = useState<'percent' | 'absolute'>('percent');

  // Salary sacrifice state
  const [sacrificePercent, setSacrificePercent] = useState<number>(5);
  const [sacrificeAbsolute, setSacrificeAbsolute] = useState<number>(0);
  const [sacrificeMode, setSacrificeMode] = useState<'percent' | 'absolute'>('percent');
  const [sacrificeAbsoluteUnit, setSacrificeAbsoluteUnit] = useState<'annual' | 'monthly'>('annual');

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
    if (changeMode === 'percent') {
      newSalary = grossSalary * (1 + changePercent / 100);
    } else {
      newSalary = grossSalary + changeAbsolute;
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
  }, [grossSalary, region, pensionPercent, changeMode, changePercent, changeAbsolute, baselineResult, employerContributionPercent, employerMatchPercent]);

  // Salary sacrifice simulation
  const sacrificeResult = useMemo(() => {
    let targetSacrificePercent: number;
    
    if (sacrificeMode === 'percent') {
      targetSacrificePercent = pensionPercent + sacrificePercent;
    } else {
      // Convert absolute to percent
      const absoluteAnnual = sacrificeAbsoluteUnit === 'monthly' 
        ? sacrificeAbsolute * 12 
        : sacrificeAbsolute;
      const additionalPercent = (absoluteAnnual / grossSalary) * 100;
      targetSacrificePercent = pensionPercent + additionalPercent;
    }
    
    // Cap at 50%
    targetSacrificePercent = Math.min(50, Math.max(0, targetSacrificePercent));

    const scenarioResult = calculateIncomeTax(grossSalary, region, targetSacrificePercent);
    const comparison = compareTaxScenarios(baselineResult, scenarioResult);
    
    const additionalPensionContribution = scenarioResult.pensionContribution - baselineResult.pensionContribution;
    const taxSaved = scenarioResult.pensionTaxSaved - baselineResult.pensionTaxSaved;
    const niSaved = scenarioResult.pensionNISaved - baselineResult.pensionNISaved;
    const totalSaved = taxSaved + niSaved;
    
    // Calculate employer pension for new rate
    const newEmployerPension = calculateEmployerPensionForPercent(targetSacrificePercent);
    const additionalEmployerPension = newEmployerPension - employerPension;
    
    // Compound growth calculations
    const singleYearFV = calculateCompoundGrowth(additionalPensionContribution, yearsToRetirement, GROWTH_RATE);
    const repeatedFV = calculateCompoundGrowth(additionalPensionContribution, yearsToRetirement, GROWTH_RATE);

    return {
      result: scenarioResult,
      comparison,
      targetPercent: targetSacrificePercent,
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
  }, [grossSalary, region, pensionPercent, sacrificeMode, sacrificePercent, sacrificeAbsolute, sacrificeAbsoluteUnit, baselineResult, yearsToRetirement, employerPension, employerContributionPercent, employerMatchPercent]);

  return (
    <div className="scenario-panel">
      {/* Scenario Selector Toggle */}
      <div className="scenario-selector">
        <div className="scenario-toggle">
          <button
            className={`scenario-option ${scenario === 'salary-change' ? 'active' : ''}`}
            onClick={() => setScenario('salary-change')}
          >
            <TrendingUp size={16} />
            Salary Change
          </button>
          <button
            className={`scenario-option ${scenario === 'salary-sacrifice' ? 'active' : ''}`}
            onClick={() => setScenario('salary-sacrifice')}
          >
            <PiggyBank size={16} />
            Salary Sacrifice
          </button>
          <div 
            className="scenario-indicator" 
            style={{ transform: scenario === 'salary-sacrifice' ? 'translateX(100%)' : 'translateX(0)' }}
          />
        </div>
      </div>

      {/* Scenario Content */}
      <div className="scenario-content">
        {scenario === 'salary-change' ? (
          /* Salary Change Scenario */
          <div className="salary-change-scenario">
            <div className="scenario-controls">
              <div className="control-row">
                {/* Percentage Change */}
                <div className={`change-control ${changeMode === 'percent' ? 'active' : ''}`}>
                  <label>
                    <input
                      type="radio"
                      checked={changeMode === 'percent'}
                      onChange={() => setChangeMode('percent')}
                    />
                    Percentage
                  </label>
                  <div className="control-input">
                    <input
                      type="range"
                      min="-30"
                      max="50"
                      value={changePercent}
                      onChange={(e) => setChangePercent(parseInt(e.target.value))}
                      disabled={changeMode !== 'percent'}
                    />
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="-100"
                        max="100"
                        step="1"
                        value={changePercent}
                        onChange={(e) => setChangePercent(parseInt(e.target.value) || 0)}
                        disabled={changeMode !== 'percent'}
                      />
                      <span className="unit">%</span>
                    </div>
                  </div>
                </div>

                {/* Absolute Change */}
                <div className={`change-control ${changeMode === 'absolute' ? 'active' : ''}`}>
                  <label>
                    <input
                      type="radio"
                      checked={changeMode === 'absolute'}
                      onChange={() => setChangeMode('absolute')}
                    />
                    Amount
                  </label>
                  <div className="control-input">
                    <input
                      type="range"
                      min="-50000"
                      max="100000"
                      step="1000"
                      value={changeAbsolute}
                      onChange={(e) => setChangeAbsolute(parseInt(e.target.value))}
                      disabled={changeMode !== 'absolute'}
                    />
                    <div className="input-with-unit">
                      <span className="unit prefix">£</span>
                      <input
                        type="number"
                        min="-100000"
                        max="100000"
                        step="1000"
                        value={changeAbsolute}
                        onChange={(e) => setChangeAbsolute(parseInt(e.target.value) || 0)}
                        disabled={changeMode !== 'absolute'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Result Table */}
            <SalaryBreakdownTable
              result={salaryChangeResult.result}
              pensionPercent={pensionPercent}
              employerPension={salaryChangeResult.employerPension}
              title={`After ${salaryChangeResult.salaryChange >= 0 ? '+' : ''}${formatCurrency(salaryChangeResult.salaryChange)}`}
              isScenario
            />
          </div>
        ) : (
          /* Salary Sacrifice Scenario */
          <div className="salary-sacrifice-scenario">
            <div className="scenario-controls">
              <div className="control-row">
                {/* Percentage Sacrifice */}
                <div className={`change-control ${sacrificeMode === 'percent' ? 'active' : ''}`}>
                  <label>
                    <input
                      type="radio"
                      checked={sacrificeMode === 'percent'}
                      onChange={() => setSacrificeMode('percent')}
                    />
                    Extra %
                  </label>
                  <div className="control-input">
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={sacrificePercent}
                      onChange={(e) => setSacrificePercent(parseInt(e.target.value))}
                      disabled={sacrificeMode !== 'percent'}
                    />
                    <div className="input-with-unit">
                      <span className="unit prefix">+</span>
                      <input
                        type="number"
                        min="0"
                        max={50 - pensionPercent}
                        step="1"
                        value={sacrificePercent}
                        onChange={(e) => setSacrificePercent(Math.min(50 - pensionPercent, Math.max(0, parseInt(e.target.value) || 0)))}
                        disabled={sacrificeMode !== 'percent'}
                      />
                      <span className="unit">%</span>
                    </div>
                  </div>
                  <span className="control-hint">Total: {sacrificeResult.targetPercent.toFixed(0)}%</span>
                </div>

                {/* Absolute Sacrifice */}
                <div className={`change-control ${sacrificeMode === 'absolute' ? 'active' : ''}`}>
                  <label>
                    <input
                      type="radio"
                      checked={sacrificeMode === 'absolute'}
                      onChange={() => setSacrificeMode('absolute')}
                    />
                    Extra £
                  </label>
                  <div className="control-input">
                    <div className="input-with-unit">
                      <span className="unit prefix">£</span>
                      <input
                        type="number"
                        min="0"
                        max={grossSalary * 0.5}
                        step={sacrificeAbsoluteUnit === 'monthly' ? 100 : 1000}
                        value={sacrificeAbsolute}
                        onChange={(e) => setSacrificeAbsolute(Math.max(0, parseInt(e.target.value) || 0))}
                        disabled={sacrificeMode !== 'absolute'}
                      />
                    </div>
                    <div className="unit-toggle">
                      <button 
                        className={sacrificeAbsoluteUnit === 'annual' ? 'active' : ''}
                        onClick={() => setSacrificeAbsoluteUnit('annual')}
                        disabled={sacrificeMode !== 'absolute'}
                      >
                        /year
                      </button>
                      <button 
                        className={sacrificeAbsoluteUnit === 'monthly' ? 'active' : ''}
                        onClick={() => setSacrificeAbsoluteUnit('monthly')}
                        disabled={sacrificeMode !== 'absolute'}
                      >
                        /month
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Result Table */}
            <SalaryBreakdownTable
              result={sacrificeResult.result}
              pensionPercent={sacrificeResult.targetPercent}
              employerPension={sacrificeResult.newEmployerPension}
              title={`At ${sacrificeResult.targetPercent.toFixed(0)}% Pension`}
              isScenario
            />

            {/* Pension Growth Projection */}
            {sacrificeResult.additionalPension > 0 && yearsToRetirement > 0 && (
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
                    <span className="value positive">
                      +{formatCurrency(sacrificeResult.additionalPension)}
                    </span>
                  </div>
                  {sacrificeResult.additionalEmployerPension > 0 && (
                    <div className="summary-row">
                      <span className="label">Extra employer contribution</span>
                      <span className="value positive">
                        +{formatCurrency(sacrificeResult.additionalEmployerPension)}
                      </span>
                    </div>
                  )}
                  <div className="summary-row">
                    <span className="label">Tax & NI saved this year</span>
                    <span className="value positive">
                      +{formatCurrency(sacrificeResult.totalSaved)}
                    </span>
                  </div>
                </div>

                <div className="projection-box">
                  <div className="projection-item">
                    <span className="projection-label">
                      This year's extra contribution at age {pensionAge}
                    </span>
                    <span className="projection-value">
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
                    <span className="projection-value">
                      {formatCurrency(sacrificeResult.repeatedFV)}
                    </span>
                    <span className="projection-detail">
                      Annual contribution compounded at {GROWTH_RATE}% over {yearsToRetirement} years
                    </span>
                  </div>
                </div>

                <p className="growth-explanation">
                  By reducing your monthly pay by <strong>{formatCurrency(sacrificeResult.netPayReduction / 12)}</strong>, 
                  you save <strong>{formatCurrency(sacrificeResult.totalSaved)}</strong> in tax & NI this year and add 
                  <strong> {formatCurrency(sacrificeResult.additionalPension)}</strong> to your pension. 
                  At age {pensionAge}, this year's contribution alone could be worth 
                  approximately <strong>{formatCurrency(sacrificeResult.singleYearFV)}</strong>.
                </p>
                
                <p className="growth-explanation secondary">
                  If you make this sacrifice every year until age {pensionAge}, these contributions 
                  could grow to approximately <strong>{formatCurrency(sacrificeResult.repeatedFV)}</strong>.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
