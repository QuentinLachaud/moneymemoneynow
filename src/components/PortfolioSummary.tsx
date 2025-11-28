/**
 * PortfolioSummary — Key portfolio metrics display component
 * 
 * Shows:
 * - Initial Value
 * - Final Value (median)
 * - Growth from returns
 * - Total contributions
 * - Survival rate
 */

import { Info } from 'lucide-react';

interface PortfolioSummaryProps {
  initialValue: number;
  medianFinalValue: number;
  totalContributions: number;
  totalWithdrawals: number;
  survivalRate: number;
  timeHorizon: number;
  isDeterministic?: boolean;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `£${(value / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `£${(value / 1000).toFixed(1)}k`;
  }
  return `£${value.toFixed(0)}`;
}

export function PortfolioSummary({
  initialValue,
  medianFinalValue,
  totalContributions,
  totalWithdrawals,
  survivalRate,
  timeHorizon,
  isDeterministic = false,
}: PortfolioSummaryProps) {
  // Calculate derived values
  const netCashFlow = totalContributions - totalWithdrawals;
  const growthFromReturns = medianFinalValue - initialValue - netCashFlow;
  const totalGrowthPercent = initialValue > 0 
    ? ((medianFinalValue - initialValue) / initialValue * 100).toFixed(1)
    : '0';

  return (
    <div className="portfolio-summary-card">
      <div className="summary-metrics">
        <div className="metric-item initial">
          <span className="metric-label">Initial</span>
          <span className="metric-value">{formatCurrency(initialValue)}</span>
        </div>
        
        <div className="metric-divider">→</div>
        
        <div className="metric-item final">
          <span className="metric-label">
            {isDeterministic ? 'Final' : 'Median'}
            <span className="metric-sublabel">({timeHorizon}y)</span>
          </span>
          <span className="metric-value highlight">{formatCurrency(medianFinalValue)}</span>
          <span className="metric-growth">+{totalGrowthPercent}%</span>
        </div>

        <div className="metric-breakdown">
          <div className="breakdown-item">
            <span className="breakdown-label">Returns</span>
            <span className={`breakdown-value ${growthFromReturns >= 0 ? 'positive' : 'negative'}`}>
              {growthFromReturns >= 0 ? '+' : ''}{formatCurrency(growthFromReturns)}
            </span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Contributions</span>
            <span className="breakdown-value positive">+{formatCurrency(totalContributions)}</span>
          </div>
          {totalWithdrawals > 0 && (
            <div className="breakdown-item">
              <span className="breakdown-label">Withdrawals</span>
              <span className="breakdown-value negative">-{formatCurrency(totalWithdrawals)}</span>
            </div>
          )}
        </div>

        {!isDeterministic && (
          <div className="metric-item survival">
            <span className="metric-label">
              Survival
              <button className="info-btn" title="Percentage of simulations where portfolio value stayed above zero">
                <Info size={12} />
              </button>
            </span>
            <span className={`metric-value ${survivalRate >= 95 ? 'excellent' : survivalRate >= 80 ? 'good' : 'warning'}`}>
              {survivalRate.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
