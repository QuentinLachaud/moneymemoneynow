/**
 * TaxCalculatorPanel — UK Income Tax Calculator
 * 
 * Professional tax breakdown showing:
 * - Gross salary input with clean formatting
 * - England/Scotland toggle for different tax bands
 * - Pension contribution controls
 * - Comprehensive tax/NI breakdown table
 * - Raise simulator
 * - Pension sacrifice simulator
 */

import { useState, useMemo, useCallback } from 'react';
import { 
  Info, 
  Calculator,
  TrendingUp,
  Wallet,
  PiggyBank,
  Percent,
  Calendar
} from 'lucide-react';
import {
  TaxRegion,
  calculateIncomeTax,
  calculateEmployerPension,
  calculateCompoundGrowth,
  compareTaxScenarios,
  TaxCalculationResult,
} from '../utils/ukTaxCalculator';

// Pension age constant
const DEFAULT_PENSION_AGE = 67;
const PENSION_GROWTH_RATE = 7;

export function TaxCalculatorPanel() {
  // Core inputs
  const [grossSalary, setGrossSalary] = useState<number | null>(null);
  const [salaryInput, setSalaryInput] = useState<string>('');
  const [region, setRegion] = useState<TaxRegion>('england');
  const [age, setAge] = useState<number>(30);
  
  // Pension settings
  const [pensionPercent, setPensionPercent] = useState<number>(0);
  const [employerContributionPercent, setEmployerContributionPercent] = useState<number>(3);
  const [employerMatchPercent, setEmployerMatchPercent] = useState<number>(0);
  
  // Simulator states
  const [showRaiseSimulator, setShowRaiseSimulator] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState<string>('');
  const [raiseIsPercent, setRaiseIsPercent] = useState(true);
  
  const [showPensionSimulator, setShowPensionSimulator] = useState(false);
  const [simulatedPensionPercent, setSimulatedPensionPercent] = useState<number>(5);

  // Calculate years to retirement
  const yearsToRetirement = useMemo(() => {
    return Math.max(0, DEFAULT_PENSION_AGE - age);
  }, [age]);

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

  // Raise simulation
  const raiseSimulation = useMemo(() => {
    if (!taxResult || !raiseAmount || grossSalary === null) return null;
    
    const raiseValue = parseFloat(raiseAmount);
    if (isNaN(raiseValue) || raiseValue <= 0) return null;
    
    const newSalary = raiseIsPercent 
      ? grossSalary * (1 + raiseValue / 100)
      : grossSalary + raiseValue;
    
    const newResult = calculateIncomeTax(newSalary, region, pensionPercent);
    return compareTaxScenarios(taxResult, newResult);
  }, [taxResult, raiseAmount, raiseIsPercent, grossSalary, region, pensionPercent]);

  // Pension sacrifice simulation
  const pensionSimulation = useMemo(() => {
    if (!taxResult || grossSalary === null) return null;
    
    const baselineResult = calculateIncomeTax(grossSalary, region, pensionPercent);
    const scenarioResult = calculateIncomeTax(grossSalary, region, simulatedPensionPercent);
    
    const taxSaved = scenarioResult.pensionTaxSaved - baselineResult.pensionTaxSaved;
    const niSaved = scenarioResult.pensionNISaved - baselineResult.pensionNISaved;
    const totalSaved = taxSaved + niSaved;
    const additionalPension = scenarioResult.pensionContribution - baselineResult.pensionContribution;
    
    // Calculate compound growth of additional pension
    const compoundedValue = calculateCompoundGrowth(
      additionalPension,
      yearsToRetirement,
      PENSION_GROWTH_RATE
    );
    
    return {
      comparison: compareTaxScenarios(baselineResult, scenarioResult),
      taxSaved,
      niSaved,
      totalSaved,
      additionalPension,
      compoundedValue,
    };
  }, [taxResult, grossSalary, region, pensionPercent, simulatedPensionPercent, yearsToRetirement]);

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

  // Format currency
  const formatCurrency = (value: number, showPence = false): string => {
    if (showPence) {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format difference with color
  const formatDiff = (value: number, invert = false): { text: string; className: string } => {
    const isPositive = invert ? value < 0 : value > 0;
    const prefix = value > 0 ? '+' : '';
    return {
      text: `${prefix}${formatCurrency(value)}`,
      className: isPositive ? 'positive' : value < 0 ? 'negative' : 'neutral',
    };
  };

  return (
    <div className="tax-calculator-panel">
      {/* Top Controls Bar */}
      <div className="projections-controls-bar tax-controls-bar">
        <div className="controls-left">
          {/* Region Toggle */}
          <div className="control-group toggle-slider-group">
            <label>Tax Region</label>
            <div className="toggle-slider">
              <button
                className={`toggle-option ${region === 'england' ? 'active' : ''}`}
                onClick={() => setRegion('england')}
              >
                England
              </button>
              <button
                className={`toggle-option ${region === 'scotland' ? 'active' : ''}`}
                onClick={() => setRegion('scotland')}
              >
                Scotland
              </button>
              <div 
                className="toggle-slider-indicator" 
                style={{ transform: region === 'scotland' ? 'translateX(100%)' : 'translateX(0)' }}
              />
            </div>
          </div>

          <div className="controls-divider" />

          {/* Pension Contribution */}
          <div className="control-group">
            <label>
              Pension
              <button className="info-btn" title="Your personal contribution to your workplace pension. This reduces your taxable income.">
                <Info size={12} />
              </button>
            </label>
            <div className="btn-group-sm pension-group">
              {[0, 3, 5, 8, 10].map(p => (
                <button
                  key={p}
                  className={`btn-sm ${pensionPercent === p ? 'active' : ''}`}
                  onClick={() => setPensionPercent(p)}
                >
                  {p}%
                </button>
              ))}
              <input
                type="number"
                min="0"
                max="50"
                value={pensionPercent}
                onChange={(e) => setPensionPercent(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                className="pension-input"
              />
            </div>
          </div>

          {/* Employer Contribution */}
          <div className="control-group">
            <label>
              Employer
              <button className="info-btn" title="Base contribution your employer adds to your pension regardless of your contribution.">
                <Info size={12} />
              </button>
            </label>
            <div className="btn-group-sm">
              {[0, 3, 5, 10].map(p => (
                <button
                  key={p}
                  className={`btn-sm ${employerContributionPercent === p ? 'active' : ''}`}
                  onClick={() => setEmployerContributionPercent(p)}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Employer Match */}
          <div className="control-group">
            <label>
              Match
              <button className="info-btn" title="Employer matches your pension contribution up to this percentage. E.g., 3% match means if you contribute 5%, employer adds 3%.">
                <Info size={12} />
              </button>
            </label>
            <div className="btn-group-sm">
              {[0, 3, 5, 10].map(p => (
                <button
                  key={p}
                  className={`btn-sm ${employerMatchPercent === p ? 'active' : ''}`}
                  onClick={() => setEmployerMatchPercent(p)}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <div className="controls-divider" />

          {/* Age */}
          <div className="control-group age-control">
            <label>Age</label>
            <input
              type="number"
              min="16"
              max="75"
              value={age}
              onChange={(e) => setAge(Math.min(75, Math.max(16, parseInt(e.target.value) || 30)))}
              className="age-input"
            />
            <span className="years-to-retire">
              {yearsToRetirement}y to 67
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="tax-content">
        {/* Salary Input Section */}
        <div className="salary-input-section">
          <form onSubmit={handleSalarySubmit} className="salary-form">
            <div className="salary-input-wrapper">
              <span className="currency-symbol">£</span>
              <input
                type="text"
                value={salaryInput}
                onChange={(e) => setSalaryInput(e.target.value)}
                onKeyDown={handleSalaryKeyDown}
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

        {/* Results Section */}
        {taxResult && (
          <div className="tax-results">
            {/* Gross Salary Header */}
            <div className="salary-header">
              <div className="salary-main">
                <h2 className="gross-salary">{formatCurrency(taxResult.grossSalary)}</h2>
                <span className="salary-label">Gross Annual Salary</span>
              </div>
              <div className="salary-quick-stats">
                <div className="quick-stat">
                  <span className="stat-value effective-rate">{taxResult.effectiveTaxRate.toFixed(1)}%</span>
                  <span className="stat-label">Effective Rate</span>
                </div>
                <div className="quick-stat">
                  <span className="stat-value marginal-rate">{taxResult.marginalTaxRate}%</span>
                  <span className="stat-label">Marginal Rate</span>
                </div>
              </div>
            </div>

            {/* Main Breakdown Table */}
            <div className="tax-breakdown-container">
              <div className="breakdown-table-wrapper">
                <table className="tax-breakdown-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th className="annual-col">Annual</th>
                      <th className="monthly-col">Monthly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Gross */}
                    <tr className="gross-row">
                      <td className="row-label">
                        <Wallet size={14} />
                        Gross Salary
                      </td>
                      <td className="amount">{formatCurrency(taxResult.grossSalary)}</td>
                      <td className="amount monthly">{formatCurrency(taxResult.monthlyGross)}</td>
                    </tr>

                    {/* Tax Breakdown */}
                    <tr className="section-header">
                      <td colSpan={3}>Income Tax</td>
                    </tr>
                    {taxResult.taxBands.map((band, i) => (
                      <tr key={i} className="band-row">
                        <td className="band-label">
                          <span className="band-name">{band.name}</span>
                          <span className="band-range">
                            {band.rate}%
                            {band.max 
                              ? ` (£${band.min.toLocaleString()} - £${band.max.toLocaleString()})`
                              : ` (£${band.min.toLocaleString()}+)`
                            }
                          </span>
                        </td>
                        <td className="amount deduction">
                          {band.taxDue && band.taxDue > 0 ? `-${formatCurrency(band.taxDue)}` : '—'}
                        </td>
                        <td className="amount deduction monthly">
                          {band.taxDue && band.taxDue > 0 ? `-${formatCurrency(band.taxDue / 12)}` : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="subtotal-row">
                      <td className="row-label">Total Income Tax</td>
                      <td className="amount deduction">{formatCurrency(taxResult.totalTax)}</td>
                      <td className="amount deduction monthly">{formatCurrency(taxResult.monthlyTax)}</td>
                    </tr>

                    {/* NI Breakdown */}
                    <tr className="section-header">
                      <td colSpan={3}>National Insurance</td>
                    </tr>
                    {taxResult.niBands.filter(b => b.niDue && b.niDue > 0).map((band, i) => (
                      <tr key={i} className="band-row">
                        <td className="band-label">
                          <span className="band-name">{band.name}</span>
                          <span className="band-range">
                            {band.rate}%
                          </span>
                        </td>
                        <td className="amount deduction">-{formatCurrency(band.niDue!)}</td>
                        <td className="amount deduction monthly">-{formatCurrency(band.niDue! / 12)}</td>
                      </tr>
                    ))}
                    <tr className="subtotal-row">
                      <td className="row-label">Total NI</td>
                      <td className="amount deduction">{formatCurrency(taxResult.totalNI)}</td>
                      <td className="amount deduction monthly">{formatCurrency(taxResult.monthlyNI)}</td>
                    </tr>

                    {/* Pension */}
                    {taxResult.pensionContribution > 0 && (
                      <>
                        <tr className="section-header">
                          <td colSpan={3}>Pension</td>
                        </tr>
                        <tr className="band-row">
                          <td className="band-label">
                            <PiggyBank size={14} />
                            <span className="band-name">Your Contribution ({pensionPercent}%)</span>
                          </td>
                          <td className="amount deduction">-{formatCurrency(taxResult.pensionContribution)}</td>
                          <td className="amount deduction monthly">-{formatCurrency(taxResult.monthlyPension)}</td>
                        </tr>
                        {employerPension > 0 && (
                          <tr className="band-row employer-row">
                            <td className="band-label">
                              <span className="band-name">Employer Contribution</span>
                            </td>
                            <td className="amount bonus">+{formatCurrency(employerPension)}</td>
                            <td className="amount bonus monthly">+{formatCurrency(employerPension / 12)}</td>
                          </tr>
                        )}
                        <tr className="savings-row">
                          <td className="band-label">
                            <span className="band-name">Tax & NI Saved</span>
                          </td>
                          <td className="amount savings">
                            +{formatCurrency(taxResult.pensionTaxSaved + taxResult.pensionNISaved)}
                          </td>
                          <td className="amount savings monthly">
                            +{formatCurrency((taxResult.pensionTaxSaved + taxResult.pensionNISaved) / 12)}
                          </td>
                        </tr>
                      </>
                    )}

                    {/* Net Pay */}
                    <tr className="net-row">
                      <td className="row-label">
                        <TrendingUp size={14} />
                        Net Take-Home Pay
                      </td>
                      <td className="amount net">{formatCurrency(taxResult.netPay)}</td>
                      <td className="amount net monthly">{formatCurrency(taxResult.monthlyNet)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Simulators */}
            <div className="simulators-section">
              {/* Raise Simulator */}
              <div className="simulator-card">
                <button 
                  className="simulator-header"
                  onClick={() => setShowRaiseSimulator(!showRaiseSimulator)}
                >
                  <TrendingUp size={18} />
                  <span>Salary Raise Simulator</span>
                  <span className={`toggle-icon ${showRaiseSimulator ? 'open' : ''}`}>▼</span>
                </button>
                
                {showRaiseSimulator && (
                  <div className="simulator-content">
                    <div className="simulator-inputs">
                      <div className="input-group">
                        <input
                          type="text"
                          value={raiseAmount}
                          onChange={(e) => setRaiseAmount(e.target.value)}
                          placeholder={raiseIsPercent ? 'e.g., 5' : 'e.g., 5000'}
                          className="simulator-input"
                        />
                        <div className="toggle-slider small">
                          <button
                            className={`toggle-option ${raiseIsPercent ? 'active' : ''}`}
                            onClick={() => setRaiseIsPercent(true)}
                          >
                            <Percent size={12} />
                          </button>
                          <button
                            className={`toggle-option ${!raiseIsPercent ? 'active' : ''}`}
                            onClick={() => setRaiseIsPercent(false)}
                          >
                            £
                          </button>
                          <div 
                            className="toggle-slider-indicator" 
                            style={{ transform: !raiseIsPercent ? 'translateX(100%)' : 'translateX(0)' }}
                          />
                        </div>
                      </div>
                    </div>

                    {raiseSimulation && (
                      <div className="simulator-results">
                        <table className="comparison-table">
                          <thead>
                            <tr>
                              <th></th>
                              <th>Current</th>
                              <th>After Raise</th>
                              <th>Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Gross</td>
                              <td>{formatCurrency(raiseSimulation.baseline.grossSalary)}</td>
                              <td>{formatCurrency(raiseSimulation.scenario.grossSalary)}</td>
                              <td className={formatDiff(raiseSimulation.differences.grossSalary).className}>
                                {formatDiff(raiseSimulation.differences.grossSalary).text}
                              </td>
                            </tr>
                            <tr>
                              <td>Tax</td>
                              <td>{formatCurrency(raiseSimulation.baseline.totalTax)}</td>
                              <td>{formatCurrency(raiseSimulation.scenario.totalTax)}</td>
                              <td className={formatDiff(raiseSimulation.differences.totalTax, true).className}>
                                {formatDiff(raiseSimulation.differences.totalTax, true).text}
                              </td>
                            </tr>
                            <tr>
                              <td>NI</td>
                              <td>{formatCurrency(raiseSimulation.baseline.totalNI)}</td>
                              <td>{formatCurrency(raiseSimulation.scenario.totalNI)}</td>
                              <td className={formatDiff(raiseSimulation.differences.totalNI, true).className}>
                                {formatDiff(raiseSimulation.differences.totalNI, true).text}
                              </td>
                            </tr>
                            <tr className="highlight-row">
                              <td>Net Pay</td>
                              <td>{formatCurrency(raiseSimulation.baseline.netPay)}</td>
                              <td>{formatCurrency(raiseSimulation.scenario.netPay)}</td>
                              <td className={formatDiff(raiseSimulation.differences.netPay).className}>
                                {formatDiff(raiseSimulation.differences.netPay).text}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pension Sacrifice Simulator */}
              <div className="simulator-card">
                <button 
                  className="simulator-header"
                  onClick={() => setShowPensionSimulator(!showPensionSimulator)}
                >
                  <PiggyBank size={18} />
                  <span>Pension Sacrifice Simulator</span>
                  <span className={`toggle-icon ${showPensionSimulator ? 'open' : ''}`}>▼</span>
                </button>
                
                {showPensionSimulator && (
                  <div className="simulator-content">
                    <div className="simulator-inputs">
                      <label>Simulate contribution at:</label>
                      <div className="pension-slider-group">
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={simulatedPensionPercent}
                          onChange={(e) => setSimulatedPensionPercent(parseInt(e.target.value))}
                          className="slider-input"
                        />
                        <span className="slider-value">{simulatedPensionPercent}%</span>
                      </div>
                    </div>

                    {pensionSimulation && (
                      <div className="simulator-results">
                        <table className="comparison-table">
                          <thead>
                            <tr>
                              <th></th>
                              <th>Current ({pensionPercent}%)</th>
                              <th>Simulated ({simulatedPensionPercent}%)</th>
                              <th>Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Pension</td>
                              <td>{formatCurrency(pensionSimulation.comparison.baseline.pensionContribution)}</td>
                              <td>{formatCurrency(pensionSimulation.comparison.scenario.pensionContribution)}</td>
                              <td className={formatDiff(pensionSimulation.additionalPension).className}>
                                {formatDiff(pensionSimulation.additionalPension).text}
                              </td>
                            </tr>
                            <tr>
                              <td>Tax Saved</td>
                              <td>{formatCurrency(pensionSimulation.comparison.baseline.pensionTaxSaved)}</td>
                              <td>{formatCurrency(pensionSimulation.comparison.scenario.pensionTaxSaved)}</td>
                              <td className={formatDiff(pensionSimulation.taxSaved).className}>
                                {formatDiff(pensionSimulation.taxSaved).text}
                              </td>
                            </tr>
                            <tr>
                              <td>NI Saved</td>
                              <td>{formatCurrency(pensionSimulation.comparison.baseline.pensionNISaved)}</td>
                              <td>{formatCurrency(pensionSimulation.comparison.scenario.pensionNISaved)}</td>
                              <td className={formatDiff(pensionSimulation.niSaved).className}>
                                {formatDiff(pensionSimulation.niSaved).text}
                              </td>
                            </tr>
                            <tr className="highlight-row">
                              <td>Net Pay</td>
                              <td>{formatCurrency(pensionSimulation.comparison.baseline.netPay)}</td>
                              <td>{formatCurrency(pensionSimulation.comparison.scenario.netPay)}</td>
                              <td className={formatDiff(pensionSimulation.comparison.differences.netPay).className}>
                                {formatDiff(pensionSimulation.comparison.differences.netPay).text}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {pensionSimulation.additionalPension > 0 && yearsToRetirement > 0 && (
                          <div className="compound-hint">
                            <Info size={14} />
                            <span>
                              Extra {formatCurrency(pensionSimulation.additionalPension)}/year in pension 
                              → <strong>{formatCurrency(pensionSimulation.compoundedValue)}</strong> at age 67
                              <span className="hint-detail"> (7% growth over {yearsToRetirement} years)</span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!taxResult && (
          <div className="empty-tax-state">
            <Calculator size={48} />
            <h3>Enter Your Salary</h3>
            <p>Type your annual gross salary above and press Enter or click Calculate to see your full tax breakdown.</p>
          </div>
        )}
      </div>
    </div>
  );
}
