/**
 * SalaryBreakdownTable — Detailed tax breakdown table
 * 
 * Shows comprehensive breakdown of:
 * - Gross salary
 * - Each tax band amount
 * - Total income tax
 * - National Insurance contributions
 * - Pension contributions (if any)
 * - Net take-home pay
 * 
 * Displays both annual and monthly values.
 */

import { Wallet, TrendingUp, PiggyBank } from 'lucide-react';
import { TaxCalculationResult } from '../../utils/ukTaxCalculator';

interface SalaryBreakdownTableProps {
  result: TaxCalculationResult;
  pensionPercent: number;
  employerPension: number;
  title?: string;
  isScenario?: boolean;
}

export function SalaryBreakdownTable({
  result,
  pensionPercent,
  employerPension,
  title = 'Current Salary',
  isScenario = false,
}: SalaryBreakdownTableProps) {
  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={`salary-breakdown-table ${isScenario ? 'scenario' : 'baseline'}`}>
      <div className="table-header">
        <h4>{title}</h4>
        <div className="header-stats">
          <span className="stat">
            <span className="stat-value">{result.effectiveTaxRate.toFixed(1)}%</span>
            <span className="stat-label">Effective</span>
          </span>
          <span className="stat">
            <span className="stat-value">{result.marginalTaxRate}%</span>
            <span className="stat-label">Marginal</span>
          </span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="breakdown-table">
          <thead>
            <tr>
              <th className="category-col"></th>
              <th className="amount-col">Annual</th>
              <th className="amount-col">Monthly</th>
            </tr>
          </thead>
          <tbody>
            {/* Gross Salary */}
            <tr className="gross-row">
              <td className="category">
                <Wallet size={14} />
                <span>Gross Salary</span>
              </td>
              <td className="amount">{formatCurrency(result.grossSalary)}</td>
              <td className="amount monthly">{formatCurrency(result.monthlyGross)}</td>
            </tr>

            {/* Income Tax Section */}
            <tr className="section-divider">
              <td colSpan={3}>Income Tax</td>
            </tr>
            
            {result.taxBands.map((band, i) => (
              <tr key={i} className="band-row">
                <td className="category band">
                  <span className="band-name">{band.name}</span>
                  <span className="band-detail">
                    {band.rate}%
                    {band.max 
                      ? ` · £${band.min.toLocaleString()}-£${band.max.toLocaleString()}`
                      : ` · £${band.min.toLocaleString()}+`
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
            
            <tr className="subtotal-row tax-total">
              <td className="category">Total Income Tax</td>
              <td className="amount deduction">{formatCurrency(result.totalTax)}</td>
              <td className="amount deduction monthly">{formatCurrency(result.monthlyTax)}</td>
            </tr>

            {/* National Insurance Section */}
            <tr className="section-divider">
              <td colSpan={3}>National Insurance</td>
            </tr>
            
            {result.niBands.filter(b => b.niDue && b.niDue > 0).map((band, i) => (
              <tr key={i} className="band-row">
                <td className="category band">
                  <span className="band-name">{band.name}</span>
                  <span className="band-detail">{band.rate}%</span>
                </td>
                <td className="amount deduction">-{formatCurrency(band.niDue!)}</td>
                <td className="amount deduction monthly">-{formatCurrency(band.niDue! / 12)}</td>
              </tr>
            ))}
            
            <tr className="subtotal-row ni-total">
              <td className="category">Total NI</td>
              <td className="amount deduction">{formatCurrency(result.totalNI)}</td>
              <td className="amount deduction monthly">{formatCurrency(result.monthlyNI)}</td>
            </tr>

            {/* Pension Section (if applicable) */}
            {result.pensionContribution > 0 && (
              <>
                <tr className="section-divider">
                  <td colSpan={3}>Pension</td>
                </tr>
                
                <tr className="band-row">
                  <td className="category">
                    <PiggyBank size={14} />
                    <span>Your Contribution ({pensionPercent}%)</span>
                  </td>
                  <td className="amount deduction">-{formatCurrency(result.pensionContribution)}</td>
                  <td className="amount deduction monthly">-{formatCurrency(result.monthlyPension)}</td>
                </tr>
                
                {employerPension > 0 && (
                  <tr className="band-row employer-row">
                    <td className="category">
                      <span>Employer Contribution</span>
                    </td>
                    <td className="amount bonus">+{formatCurrency(employerPension)}</td>
                    <td className="amount bonus monthly">+{formatCurrency(employerPension / 12)}</td>
                  </tr>
                )}
                
                <tr className="savings-row">
                  <td className="category">Tax & NI Saved</td>
                  <td className="amount savings">
                    +{formatCurrency(result.pensionTaxSaved + result.pensionNISaved)}
                  </td>
                  <td className="amount savings monthly">
                    +{formatCurrency((result.pensionTaxSaved + result.pensionNISaved) / 12)}
                  </td>
                </tr>
              </>
            )}

            {/* Net Pay - Highlighted */}
            <tr className="net-row">
              <td className="category">
                <TrendingUp size={14} />
                <span>Net Take-Home</span>
              </td>
              <td className="amount net">{formatCurrency(result.netPay)}</td>
              <td className="amount net monthly highlight">{formatCurrency(result.monthlyNet)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
