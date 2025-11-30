/**
 * ScenarioPanel — Right side simulation panel
 * 
 * Features:
 * - Mode selector (Salary Change / Salary Sacrifice) as segment buttons
 * - Clean stepped sliders with tally display (no number inputs)
 * - Delta values displayed in breakdown table
 * - Shared Annual/Monthly pill-switch toggle
 */

import { useState, useMemo } from 'react';
import { TrendingUp, PiggyBank, Minus, Plus } from 'lucide-react';
import { 
  TaxRegion, 
  TaxCalculationResult,
  calculateIncomeTax,
  compareTaxScenarios,
} from '../../utils/ukTaxCalculator';
import { SalaryBreakdownTable } from './SalaryBreakdownTable';

type ScenarioType = 'salary-change' | 'salary-sacrifice';
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
  basePensionTotal: number;
  salarySacrificePercent: number;
  onSalarySacrificeChange: (percent: number) => void;
  salaryChangePercent: number;
  onSalaryChangePercentChange: (percent: number) => void;
  scenarioType: ScenarioType;
  onScenarioTypeChange: (type: ScenarioType) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

// Preset values for salary change
const SALARY_CHANGE_PRESETS = [-10, -5, 0, 3, 5, 10, 15, 20];

export function ScenarioPanel({
  baselineResult,
  grossSalary,
  region,
  pensionPercent,
  employerContributionPercent,
  employerMatchPercent,
  employerPension,
  basePensionTotal,
  salarySacrificePercent,
  onSalarySacrificeChange,
  salaryChangePercent,
  onSalaryChangePercentChange,
  scenarioType,
  onScenarioTypeChange,
  viewMode,
  onViewModeChange,
}: ScenarioPanelProps) {
  // Use external scenario state
  const scenario = scenarioType;
  const setScenario = onScenarioTypeChange;
  const changePercent = salaryChangePercent;
  const setChangePercent = onSalaryChangePercentChange;

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
    const newSalary = Math.max(0, Math.min(grossSalary * (1 + changePercent / 100), 1000000));
    const result = calculateIncomeTax(newSalary, region, pensionPercent);
    const comparison = compareTaxScenarios(baselineResult, result);
    const newEmployerPension = calculateEmployerPensionForPercent(pensionPercent);

    return {
      result,
      comparison,
      employerPension: newEmployerPension,
      salaryChange: newSalary - grossSalary,
    };
  }, [grossSalary, region, pensionPercent, changePercent, baselineResult, employerContributionPercent, employerMatchPercent]);

  // Salary sacrifice simulation
  const sacrificeResult = useMemo(() => {
    const targetSacrificePercent = pensionPercent + salarySacrificePercent;
    const effectivePercent = Math.min(50, Math.max(0, targetSacrificePercent));

    const scenarioResult = calculateIncomeTax(grossSalary, region, effectivePercent);
    const comparison = compareTaxScenarios(baselineResult, scenarioResult);

    return {
      result: scenarioResult,
      comparison,
      targetPercent: effectivePercent,
    };
  }, [grossSalary, region, pensionPercent, salarySacrificePercent, baselineResult]);

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

  // Handle stepped changes
  const handleSalaryChangeStep = (delta: number) => {
    setChangePercent(prev => Math.max(-50, Math.min(100, prev + delta)));
  };

  const handleSacrificeStep = (delta: number) => {
    onSalarySacrificeChange(Math.max(0, Math.min(20, salarySacrificePercent + delta)));
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

      {/* Scenario Controls */}
      <div className="scenario-controls">
        {scenario === 'salary-change' ? (
          <div className="stepped-input-group">
            <div className="stepped-input-header">
              <span className="stepped-input-label">Salary change</span>
              <span className={`stepped-input-value ${changePercent >= 0 ? 'positive' : 'negative'}`}>
                {changePercent >= 0 ? '+' : ''}{changePercent}%
              </span>
            </div>
            
            <div className="stepped-input-row">
              <button 
                className="stepper-btn large" 
                onClick={() => handleSalaryChangeStep(-1)}
                type="button"
              >
                <Minus size={18} />
              </button>
              
              <input
                type="range"
                min={-30}
                max={50}
                step={1}
                value={changePercent}
                onChange={(e) => setChangePercent(parseInt(e.target.value))}
                className="stepped-slider"
              />
              
              <button 
                className="stepper-btn large" 
                onClick={() => handleSalaryChangeStep(1)}
                type="button"
              >
                <Plus size={18} />
              </button>
            </div>
            
            {/* Preset buttons */}
            <div className="stepped-presets">
              {SALARY_CHANGE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={`preset-btn ${changePercent === preset ? 'active' : ''}`}
                  onClick={() => setChangePercent(preset)}
                  type="button"
                >
                  {preset >= 0 ? '+' : ''}{preset}%
                </button>
              ))}
            </div>
            
            <div className="stepped-tally">
              <span className="tally-label">New salary:</span>
              <span className="tally-value">{formatCurrency(salaryChangeResult.result.grossSalary)}</span>
            </div>
          </div>
        ) : (
          <div className="stepped-input-group">
            <div className="stepped-input-header">
              <span className="stepped-input-label">Additional sacrifice</span>
              <span className="stepped-input-value positive">+{salarySacrificePercent}%</span>
            </div>
            
            <div className="stepped-input-row">
              <button 
                className="stepper-btn large" 
                onClick={() => handleSacrificeStep(-1)}
                disabled={salarySacrificePercent <= 0}
                type="button"
              >
                <Minus size={18} />
              </button>
              
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={salarySacrificePercent}
                onChange={(e) => onSalarySacrificeChange(parseInt(e.target.value))}
                className="stepped-slider"
              />
              
              <button 
                className="stepper-btn large" 
                onClick={() => handleSacrificeStep(1)}
                disabled={salarySacrificePercent >= 20}
                type="button"
              >
                <Plus size={18} />
              </button>
            </div>
            
            {/* Preset buttons */}
            <div className="stepped-presets">
              {[0, 1, 2, 3, 5, 8, 10, 15].map((preset) => (
                <button
                  key={preset}
                  className={`preset-btn ${salarySacrificePercent === preset ? 'active' : ''}`}
                  onClick={() => onSalarySacrificeChange(preset)}
                  type="button"
                >
                  +{preset}%
                </button>
              ))}
            </div>
            
            <div className="stepped-tally">
              <span className="tally-label">Total pension:</span>
              <span className="tally-value">{basePensionTotal + salarySacrificePercent}%</span>
              <span className="tally-detail">({basePensionTotal}% base + {salarySacrificePercent}% sacrifice)</span>
            </div>
          </div>
        )}
      </div>

      {/* Result Table with Delta - This should be bottom-aligned */}
      <div className="scenario-result-wrapper">
        <SalaryBreakdownTable
          result={currentResult}
          title={getScenarioTitle()}
          baselineResult={baselineResult}
          isScenario
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      </div>
    </div>
  );
}
