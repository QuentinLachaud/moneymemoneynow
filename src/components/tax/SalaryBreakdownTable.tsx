/**
 * TaxBreakdownTable — Comprehensive salary breakdown table
 * 
 * Features:
 * - Gross Salary (prominent)
 * - Collapsible Tax section with breakdown
 * - Net Take-Home (highlighted)
 * - Annual/Monthly pill-switch toggle (single selection)
 * - Optional delta display for scenario comparison
 * - Improved font sizing and legibility
 */

import { useState } from 'react';
import { Wallet, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { TaxCalculationResult } from '../../utils/ukTaxCalculator';

type ViewMode = 'annual' | 'monthly';

interface TaxBreakdownTableProps {
  result: TaxCalculationResult;
  title: string;
  baselineResult?: TaxCalculationResult; // For delta calculations
  isScenario?: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function SalaryBreakdownTable({
  result,
  title,
  baselineResult,
  isScenario = false,
  viewMode: externalViewMode,
  onViewModeChange,
}: TaxBreakdownTableProps) {
  // Use internal state if no external control provided
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('annual');
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;
  
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

  // Display values based on view mode
  const displayMultiplier = viewMode === 'monthly' ? 1/12 : 1;
  const getDisplayValue = (annual: number) => annual * displayMultiplier;

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

      {/* Pill Switch Toggle - Annual/Monthly */}
      <div className="table-controls">
        <div className="pill-switch">
          <button
            className={`pill-option ${viewMode === 'annual' ? 'active' : ''}`}
            onClick={() => setViewMode('annual')}
          >
            Annual
          </button>
          <button
            className={`pill-option ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => setViewMode('monthly')}
          >
            Monthly
          </button>
          <div 
            className="pill-indicator"
            style={{ transform: viewMode === 'monthly' ? 'translateX(100%)' : 'translateX(0)' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="breakdown-table single-column">
          <thead>
            <tr>
              <th className="label-col"></th>
              <th className="amount-col">{viewMode === 'annual' ? 'Annual' : 'Monthly'}</th>
            </tr>
          </thead>
          <tbody>
            {/* Gross Salary Row */}
            <tr className="gross-row">
              <td className="label-cell">
                <Wallet size={16} />
                <span>Gross Salary</span>
              </td>
              <td className="amount-cell gross single">
                {formatCurrency(getDisplayValue(result.grossSalary))}
                {grossDelta !== null && (
                  <span className="delta">{formatDelta(getDisplayValue(grossDelta))}</span>
                )}
              </td>
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
              <td className="amount-cell deduction single">
                -{formatCurrency(getDisplayValue(totalTax))}
                {taxDelta !== null && (
                  <span className={`delta ${taxDelta < 0 ? 'positive' : ''}`}>
                    {formatDelta(getDisplayValue(taxDelta))}
                  </span>
                )}
              </td>
            </tr>

            {/* Expanded Tax Breakdown */}
            {taxExpanded && (
              <>
                {/* Income Tax Header */}
                <tr className="section-header">
                  <td colSpan={2}>Income Tax</td>
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
                      <td className="amount-cell deduction">
                        -{formatCurrency(getDisplayValue(band.taxDue || 0))}
                        {bandDelta !== null && bandDelta !== 0 && (
                          <span className={`delta ${bandDelta < 0 ? 'positive' : ''}`}>
                            {formatDelta(getDisplayValue(bandDelta))}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Income Tax Subtotal */}
                <tr className="subtotal-row">
                  <td className="label-cell">Income Tax Subtotal</td>
                  <td className="amount-cell deduction">
                    -{formatCurrency(getDisplayValue(result.totalTax))}
                  </td>
                </tr>

                {/* National Insurance Header */}
                <tr className="section-header">
                  <td colSpan={2}>National Insurance</td>
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
                      <td className="amount-cell deduction">
                        -{formatCurrency(getDisplayValue(band.niDue || 0))}
                        {bandDelta !== null && bandDelta !== 0 && (
                          <span className={`delta ${bandDelta < 0 ? 'positive' : ''}`}>
                            {formatDelta(getDisplayValue(bandDelta))}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* NI Subtotal */}
                <tr className="subtotal-row">
                  <td className="label-cell">NI Subtotal</td>
                  <td className="amount-cell deduction">
                    -{formatCurrency(getDisplayValue(result.totalNI))}
                  </td>
                </tr>
              </>
            )}

            {/* Net Take-Home Row */}
            <tr className="net-row">
              <td className="label-cell">
                <TrendingUp size={16} />
                <span>Net Take-Home</span>
              </td>
              <td className="amount-cell net single">
                {formatCurrency(getDisplayValue(result.netPay))}
                {netDelta !== null && (
                  <span className={`delta ${netDelta > 0 ? 'positive' : 'negative'}`}>
                    {formatDelta(getDisplayValue(netDelta))}
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
