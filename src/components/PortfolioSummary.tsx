/**
 * PortfolioSummary — Key portfolio metrics display component
 * 
 * Shows:
 * - Initial Value
 * - Final Value (median) with nominal and real returns
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
  /** Inflation rate for real return calculation (default 2.5%) */
  inflationRate?: number;
}

const DEFAULT_INFLATION_RATE = 2.5;

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
  inflationRate = DEFAULT_INFLATION_RATE,
}: PortfolioSummaryProps) {
  // Calculate derived values
  const netCashFlow = totalContributions - totalWithdrawals;
  const growthFromReturns = medianFinalValue - initialValue - netCashFlow;
  
  // Nominal growth percentage
  const nominalGrowthPercent = initialValue > 0 
    ? ((medianFinalValue - initialValue) / initialValue * 100)
    : 0;
  
  // Calculate real (inflation-adjusted) final value
  const inflationFactor = Math.pow(1 + inflationRate / 100, timeHorizon);
  const realFinalValue = medianFinalValue / inflationFactor;
  const realGrowthPercent = initialValue > 0
    ? ((realFinalValue - initialValue) / initialValue * 100)
    : 0;

  return (
    <div className="portfolio-summary-card tall">
      <div className="summary-metrics-vertical">
        <div className="metrics-row">
          <div className="metric-item initial">
            <span className="metric-label">Initial</span>
            <span className="metric-value large">{formatCurrency(initialValue)}</span>
          </div>
          
          <div className="metric-divider-arrow">→</div>
          
          <div className="metric-item final">
            <span className="metric-label">
              {isDeterministic ? 'Final' : 'Median'}
              <span className="metric-sublabel">({timeHorizon}y)</span>
            </span>
            <span className="metric-value large highlight">{formatCurrency(medianFinalValue)}</span>
          </div>
        </div>

        <div className="returns-row">
          <div className="return-item">
            <span className="return-label">Nominal</span>
            <span className={`return-value ${nominalGrowthPercent >= 0 ? 'positive' : 'negative'}`}>
              {nominalGrowthPercent >= 0 ? '+' : ''}{nominalGrowthPercent.toFixed(1)}%
            </span>
          </div>
          <div className="return-item">
            <span className="return-label">
              Real
              <button className="info-btn" title={`Adjusted for ${inflationRate}% annual inflation`}>
                <Info size={10} />
              </button>
            </span>
            <span className={`return-value ${realGrowthPercent >= 0 ? 'positive' : 'negative'}`}>
              {realGrowthPercent >= 0 ? '+' : ''}{realGrowthPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="breakdown-row">
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
          <div className="survival-row">
            <span className="survival-label">
              Survival Rate
              <button className="info-btn" title="Percentage of simulations where portfolio value stayed above zero">
                <Info size={10} />
              </button>
            </span>
            <span className={`survival-value ${survivalRate >= 95 ? 'excellent' : survivalRate >= 80 ? 'good' : 'warning'}`}>
              {survivalRate.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
