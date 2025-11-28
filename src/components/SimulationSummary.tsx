/**
 * SimulationSummary — Summary statistics table for Monte Carlo results
 * 
 * DISPLAYS:
 * - Survival rate (simulations that never hit zero)
 * - Final value statistics (mean, median, percentiles)
 * - Risk metrics
 */

import { SimulationStats, formatCurrency } from '../utils/monteCarlo';

interface SimulationSummaryProps {
  stats: SimulationStats;
  timeHorizon: number;
}

export function SimulationSummary({ stats, timeHorizon }: SimulationSummaryProps) {
  const { survivalRate, survivedCount, totalCount, finalValues } = stats;
  
  // Risk classification based on survival rate
  const getRiskLevel = (rate: number): { label: string; color: string } => {
    if (rate >= 99) return { label: 'Very Low Risk', color: '#22c55e' };
    if (rate >= 95) return { label: 'Low Risk', color: '#4ade80' };
    if (rate >= 90) return { label: 'Moderate Risk', color: '#fbbf24' };
    if (rate >= 80) return { label: 'Elevated Risk', color: '#f97316' };
    if (rate >= 70) return { label: 'High Risk', color: '#ef4444' };
    return { label: 'Very High Risk', color: '#dc2626' };
  };

  const riskLevel = getRiskLevel(survivalRate);

  return (
    <div className="simulation-summary">
      <h4>Simulation Summary</h4>
      
      {/* Survival Rate Card */}
      <div className="summary-card survival-card">
        <div className="summary-card-header">
          <span className="summary-label">Survival Rate</span>
          <span 
            className="risk-badge"
            style={{ backgroundColor: `${riskLevel.color}20`, color: riskLevel.color }}
          >
            {riskLevel.label}
          </span>
        </div>
        <div className="survival-stats">
          <div className="survival-rate" style={{ color: riskLevel.color }}>
            {survivalRate.toFixed(1)}%
          </div>
          <div className="survival-detail">
            {survivedCount.toLocaleString()} of {totalCount.toLocaleString()} simulations survived
          </div>
          <div className="survival-note">
            Simulations that never fell below £0 over {timeHorizon} years
          </div>
        </div>
      </div>

      {/* Final Value Statistics */}
      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-label">Final Value Distribution</span>
        </div>
        <table className="summary-table">
          <tbody>
            <tr>
              <td>Mean</td>
              <td className="value">{formatCurrency(finalValues.mean)}</td>
            </tr>
            <tr>
              <td>Median</td>
              <td className="value">{formatCurrency(finalValues.median)}</td>
            </tr>
            <tr>
              <td>Std. Deviation</td>
              <td className="value">{formatCurrency(finalValues.stdDev)}</td>
            </tr>
            <tr className="divider"><td colSpan={2}></td></tr>
            <tr>
              <td>99th Percentile (Best)</td>
              <td className="value positive">{formatCurrency(finalValues.percentile99)}</td>
            </tr>
            <tr>
              <td>90th Percentile</td>
              <td className="value positive">{formatCurrency(finalValues.percentile90)}</td>
            </tr>
            <tr>
              <td>75th Percentile</td>
              <td className="value">{formatCurrency(finalValues.percentile75)}</td>
            </tr>
            <tr className="highlight">
              <td>50th Percentile (Median)</td>
              <td className="value">{formatCurrency(finalValues.percentile50)}</td>
            </tr>
            <tr>
              <td>25th Percentile</td>
              <td className="value">{formatCurrency(finalValues.percentile25)}</td>
            </tr>
            <tr>
              <td>10th Percentile</td>
              <td className="value negative">{formatCurrency(finalValues.percentile10)}</td>
            </tr>
            <tr>
              <td>1st Percentile (Worst)</td>
              <td className="value negative">{formatCurrency(finalValues.percentile1)}</td>
            </tr>
            <tr className="divider"><td colSpan={2}></td></tr>
            <tr>
              <td>Minimum</td>
              <td className="value">{formatCurrency(finalValues.min)}</td>
            </tr>
            <tr>
              <td>Maximum</td>
              <td className="value">{formatCurrency(finalValues.max)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
