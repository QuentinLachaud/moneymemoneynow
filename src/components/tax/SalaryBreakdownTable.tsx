/**
 * TaxBreakdownTable — Comprehensive salary breakdown table
 * 
 * Features:
 * - Prominent effective/marginal tax rates at top
 * - Modern, clean table design with rounded corners
 * - Collapsible Tax section with breakdown
 * - Net Take-Home (highlighted)
 * - Annual/Monthly pill-switch toggle
 * - Professional styling with better typography
 */

import { useState } from 'react';
import { Wallet, TrendingUp, ChevronDown, ChevronRight, Percent } from 'lucide-react';
import { SegmentedToggle } from '@quentinlachaud/app-component-library';
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
    <div className={`tax-breakdown-panel modern ${isScenario ? 'scenario' : 'baseline'}`}>
      {/* Header with Title */}
      <div className="panel-header-modern">
        <h4 className="panel-title-modern">{title}</h4>
        
        {/* Pill Switch Toggle - Annual/Monthly */}
        <SegmentedToggle
          options={[
            { value: 'annual', label: 'Annual' },
            { value: 'monthly', label: 'Monthly' },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as ViewMode)}
          size="sm"
        />
      </div>

      {/* Prominent Tax Rates Section */}
      <div className="tax-rates-banner">
        <div className="rate-card effective">
          <Percent size={18} />
          <div className="rate-content">
            <span className="rate-number">{effectiveRate.toFixed(1)}%</span>
            <span className="rate-name">Effective Rate</span>
          </div>
        </div>
        <div className="rate-card marginal">
          <Percent size={18} />
          <div className="rate-content">
            <span className="rate-number">{marginalRate}%</span>
            <span className="rate-name">Marginal Rate</span>
          </div>
        </div>
      </div>

      {/* Modern Table */}
      <div className="table-wrapper-modern">
        <div className="breakdown-card">
          {/* Gross Salary Row */}
          <div className="breakdown-row gross">
            <div className="row-label">
              <Wallet size={18} />
              <span>Gross Salary</span>
            </div>
            <div className="row-value">
              <span className="amount">{formatCurrency(getDisplayValue(result.grossSalary))}</span>
              {grossDelta !== null && (
                <span className="delta">{formatDelta(getDisplayValue(grossDelta))}</span>
              )}
            </div>
          </div>

          {/* Total Tax Row (collapsible) */}
          <div 
            className="breakdown-row tax clickable"
            onClick={() => setTaxExpanded(!taxExpanded)}
          >
            <div className="row-label">
              {taxExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <span>Total Tax & NI</span>
            </div>
            <div className="row-value">
              <span className="amount deduction">-{formatCurrency(getDisplayValue(totalTax))}</span>
              {taxDelta !== null && (
                <span className={`delta ${taxDelta < 0 ? 'positive' : ''}`}>
                  {formatDelta(getDisplayValue(taxDelta))}
                </span>
              )}
            </div>
          </div>

          {/* Expanded Tax Breakdown */}
          {taxExpanded && (
            <div className="tax-breakdown-detail">
              {/* Income Tax Section */}
              <div className="detail-section">
                <div className="detail-header">Income Tax</div>
                {result.taxBands.filter(b => b.taxDue && b.taxDue > 0).map((band, i) => {
                  const baselineBand = baselineResult?.taxBands.find(b => b.name === band.name);
                  const bandDelta = getDelta(band.taxDue || 0, baselineBand?.taxDue);
                  
                  return (
                    <div key={`tax-${i}`} className="detail-row">
                      <div className="detail-label">
                        <span className="band-name">{band.name}</span>
                        <span className="band-rate">{band.rate}%</span>
                      </div>
                      <div className="detail-value">
                        <span className="amount">-{formatCurrency(getDisplayValue(band.taxDue || 0))}</span>
                        {bandDelta !== null && bandDelta !== 0 && (
                          <span className={`delta ${bandDelta < 0 ? 'positive' : ''}`}>
                            {formatDelta(getDisplayValue(bandDelta))}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="detail-subtotal">
                  <span>Income Tax Total</span>
                  <span>-{formatCurrency(getDisplayValue(result.totalTax))}</span>
                </div>
              </div>

              {/* National Insurance Section */}
              <div className="detail-section">
                <div className="detail-header">National Insurance</div>
                {result.niBands.filter(b => b.niDue && b.niDue > 0).map((band, i) => {
                  const baselineBand = baselineResult?.niBands.find(b => b.name === band.name);
                  const bandDelta = getDelta(band.niDue || 0, baselineBand?.niDue);
                  
                  return (
                    <div key={`ni-${i}`} className="detail-row">
                      <div className="detail-label">
                        <span className="band-name">{band.name}</span>
                        <span className="band-rate">{band.rate}%</span>
                      </div>
                      <div className="detail-value">
                        <span className="amount">-{formatCurrency(getDisplayValue(band.niDue || 0))}</span>
                        {bandDelta !== null && bandDelta !== 0 && (
                          <span className={`delta ${bandDelta < 0 ? 'positive' : ''}`}>
                            {formatDelta(getDisplayValue(bandDelta))}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="detail-subtotal">
                  <span>NI Total</span>
                  <span>-{formatCurrency(getDisplayValue(result.totalNI))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Net Take-Home Row */}
          <div className="breakdown-row net">
            <div className="row-label">
              <TrendingUp size={18} />
              <span>Net Take-Home</span>
            </div>
            <div className="row-value">
              <span className="amount">{formatCurrency(getDisplayValue(result.netPay))}</span>
              {netDelta !== null && (
                <span className={`delta ${netDelta > 0 ? 'positive' : 'negative'}`}>
                  {formatDelta(getDisplayValue(netDelta))}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
