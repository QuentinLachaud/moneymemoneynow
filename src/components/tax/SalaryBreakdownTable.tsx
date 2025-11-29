/**
 * TaxBreakdownTable — Comprehensive salary breakdown table
 * 
 * Features:
 * - Gross Salary (prominent)
 * - Collapsible Tax section with breakdown
 * - Net Take-Home (highlighted)
 * - Annual/Monthly column toggles
 * - Optional delta display for scenario comparison
 */

import { useState } from 'react';
import { Wallet, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { TaxCalculationResult } from '../../utils/ukTaxCalculator';
import { ColumnToggle } from './shared/ColumnToggle';

interface TaxBreakdownTableProps {
  result: TaxCalculationResult;
  title: string;
  baselineResult?: TaxCalculationResult; // For delta calculations
  isScenario?: boolean;
}

export function SalaryBreakdownTable({
  result,
  title,
  baselineResult,
  isScenario = false,
}: TaxBreakdownTableProps) {
  const [showAnnual, setShowAnnual] = useState(true);
  const [showMonthly, setShowMonthly] = useState(true);
  const [taxExpanded, setTaxExpanded] = useState(false);

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format delta with sign
  const formatDelta = (value: number): string => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${formatCurrency(value)}`;
  };

  // Calculate combined effective rate (Income Tax + NI)
  const effectiveRate = result.grossSalary > 0 
    ? ((result.totalTax + result.totalNI) / result.grossSalary) * 100 
    : 0;

  // Calculate combined marginal rate (Income Tax + NI for next £1)
  // At most income levels, this is marginal tax rate + 8% NI (or 2% above upper threshold)
  const getMarginalNIRate = (salary: number): number => {
    if (salary <= 12570) return 0;
    if (salary <= 50270) return 8;
    return 2;
  };
  const marginalRate = result.marginalTaxRate + getMarginalNIRate(result.grossSalary);

  // Total tax = Income Tax + NI
  const totalTax = result.totalTax + result.totalNI;
  const monthlyTotalTax = totalTax / 12;

  // Get deltas if baseline provided
  const getDelta = (current: number, baseline: number | undefined): number | null => {
    if (baseline === undefined || !isScenario) return null;
    return current - baseline;
  };

  const grossDelta = getDelta(result.grossSalary, baselineResult?.grossSalary);
  const taxDelta = getDelta(totalTax, baselineResult ? baselineResult.totalTax + baselineResult.totalNI : undefined);
  const netDelta = getDelta(result.netPay, baselineResult?.netPay);

  // Ensure at least one column is visible
  const effectiveShowAnnual = showAnnual || !showMonthly;
  const effectiveShowMonthly = showMonthly || !showAnnual;

  const colCount = (effectiveShowAnnual ? 1 : 0) + (effectiveShowMonthly ? 1 : 0) + 1;

  return (
    <div className={`tax-breakdown-panel ${isScenario ? 'scenario' : 'baseline'}`}>
      {/* Header */}
      <div className="panel-header">
        <h4 className="panel-title">{title}</h4>
        <div className="header-rates">
          <div className="rate-badge">
            <span className="rate-value">{effectiveRate.toFixed(1)}%</span>
            <span className="rate-label">Effective</span>
          </div>
          <div className="rate-badge">
            <span className="rate-value">{marginalRate}%</span>
            <span className="rate-label">Marginal</span>
          </div>
        </div>
      </div>

      {/* Column Toggles */}
      <div className="table-controls">
        <ColumnToggle
          showAnnual={showAnnual}
          showMonthly={showMonthly}
          onToggleAnnual={() => setShowAnnual(!showAnnual)}
          onToggleMonthly={() => setShowMonthly(!showMonthly)}
        />
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="breakdown-table">
          <thead>
            <tr>
              <th className="label-col"></th>
              {effectiveShowAnnual && <th className="amount-col">Annual</th>}
              {effectiveShowMonthly && <th className="amount-col">Monthly</th>}
            </tr>
          </thead>
          <tbody>
            {/* Gross Salary Row */}
            <tr className="gross-row">
              <td className="label-cell">
                <Wallet size={16} />
                <span>Gross Salary</span>
              </td>
              {effectiveShowAnnual && (
                <td className="amount-cell gross">
                  {formatCurrency(result.grossSalary)}
                  {grossDelta !== null && (
                    <span className="delta">{formatDelta(grossDelta)}</span>
                  )}
                </td>
              )}
              {effectiveShowMonthly && (
                <td className="amount-cell gross monthly">
                  {formatCurrency(result.monthlyGross)}
                  {grossDelta !== null && (
                    <span className="delta">{formatDelta(grossDelta / 12)}</span>
                  )}
                </td>
              )}
            </tr>

            {/* Total Tax Row (collapsible) */}
            <tr 
              className="total-tax-row clickable"
              onClick={() => setTaxExpanded(!taxExpanded)}
            >
              <td className="label-cell">
                {taxExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span>Total Tax</span>
              </td>
              {effectiveShowAnnual && (
                <td className="amount-cell deduction">
                  -{formatCurrency(totalTax)}
                  {taxDelta !== null && (
                    <span className={`delta ${taxDelta < 0 ? 'positive' : ''}`}>
                      {formatDelta(taxDelta)}
                    </span>
                  )}
                </td>
              )}
              {effectiveShowMonthly && (
                <td className="amount-cell deduction monthly">
                  -{formatCurrency(monthlyTotalTax)}
                  {taxDelta !== null && (
                    <span className={`delta ${taxDelta < 0 ? 'positive' : ''}`}>
                      {formatDelta(taxDelta / 12)}
                    </span>
                  )}
                </td>
              )}
            </tr>

            {/* Expanded Tax Breakdown */}
            {taxExpanded && (
              <>
                {/* Income Tax Header */}
                <tr className="section-header">
                  <td colSpan={colCount}>Income Tax</td>
                </tr>
                
                {/* Tax Bands */}
                {result.taxBands.filter(b => b.taxDue && b.taxDue > 0).map((band, i) => {
                  const baselineBand = baselineResult?.taxBands.find(b => b.name === band.name);
                  const bandDelta = getDelta(band.taxDue || 0, baselineBand?.taxDue);
                  
                  return (
                    <tr key={`tax-${i}`} className="band-row">
                      <td className="label-cell band">
                        <span className="band-name">{band.name}</span>
                        <span className="band-rate">{band.rate}%</span>
                      </td>
                      {effectiveShowAnnual && (
                        <td className="amount-cell deduction">
                          -{formatCurrency(band.taxDue || 0)}
                          {bandDelta !== null && bandDelta !== 0 && (
                            <span className={`delta ${bandDelta < 0 ? 'positive' : ''}`}>
                              {formatDelta(bandDelta)}
                            </span>
                          )}
                        </td>
                      )}
                      {effectiveShowMonthly && (
                        <td className="amount-cell deduction monthly">
                          -{formatCurrency((band.taxDue || 0) / 12)}
                          {bandDelta !== null && bandDelta !== 0 && (
                            <span className={`delta ${bandDelta < 0 ? 'positive' : ''}`}>
                              {formatDelta(bandDelta / 12)}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}

                {/* Income Tax Subtotal */}
                <tr className="subtotal-row">
                  <td className="label-cell">Income Tax Subtotal</td>
                  {effectiveShowAnnual && (
                    <td className="amount-cell deduction">
                      -{formatCurrency(result.totalTax)}
                    </td>
                  )}
                  {effectiveShowMonthly && (
                    <td className="amount-cell deduction monthly">
                      -{formatCurrency(result.monthlyTax)}
                    </td>
                  )}
                </tr>

                {/* National Insurance Header */}
                <tr className="section-header">
                  <td colSpan={colCount}>National Insurance</td>
                </tr>
                
                {/* NI Bands */}
                {result.niBands.filter(b => b.niDue && b.niDue > 0).map((band, i) => {
                  const baselineBand = baselineResult?.niBands.find(b => b.name === band.name);
                  const bandDelta = getDelta(band.niDue || 0, baselineBand?.niDue);
                  
                  return (
                    <tr key={`ni-${i}`} className="band-row">
                      <td className="label-cell band">
                        <span className="band-name">{band.name}</span>
                        <span className="band-rate">{band.rate}%</span>
                      </td>
                      {effectiveShowAnnual && (
                        <td className="amount-cell deduction">
                          -{formatCurrency(band.niDue || 0)}
                          {bandDelta !== null && bandDelta !== 0 && (
                            <span className={`delta ${bandDelta < 0 ? 'positive' : ''}`}>
                              {formatDelta(bandDelta)}
                            </span>
                          )}
                        </td>
                      )}
                      {effectiveShowMonthly && (
                        <td className="amount-cell deduction monthly">
                          -{formatCurrency((band.niDue || 0) / 12)}
                          {bandDelta !== null && bandDelta !== 0 && (
                            <span className={`delta ${bandDelta < 0 ? 'positive' : ''}`}>
                              {formatDelta(bandDelta / 12)}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}

                {/* NI Subtotal */}
                <tr className="subtotal-row">
                  <td className="label-cell">NI Subtotal</td>
                  {effectiveShowAnnual && (
                    <td className="amount-cell deduction">
                      -{formatCurrency(result.totalNI)}
                    </td>
                  )}
                  {effectiveShowMonthly && (
                    <td className="amount-cell deduction monthly">
                      -{formatCurrency(result.monthlyNI)}
                    </td>
                  )}
                </tr>
              </>
            )}

            {/* Net Take-Home Row */}
            <tr className="net-row">
              <td className="label-cell">
                <TrendingUp size={16} />
                <span>Net Take-Home</span>
              </td>
              {effectiveShowAnnual && (
                <td className="amount-cell net">
                  {formatCurrency(result.netPay)}
                  {netDelta !== null && (
                    <span className={`delta ${netDelta > 0 ? 'positive' : 'negative'}`}>
                      {formatDelta(netDelta)}
                    </span>
                  )}
                </td>
              )}
              {effectiveShowMonthly && (
                <td className="amount-cell net monthly">
                  {formatCurrency(result.monthlyNet)}
                  {netDelta !== null && (
                    <span className={`delta ${netDelta > 0 ? 'positive' : 'negative'}`}>
                      {formatDelta(netDelta / 12)}
                    </span>
                  )}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
