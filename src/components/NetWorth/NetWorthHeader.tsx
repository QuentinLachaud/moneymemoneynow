/**
 * NetWorthHeader Component
 * 
 * Displays the main net worth value with color coding
 */

import { formatCurrency } from './formatters';

interface NetWorthHeaderProps {
  netWorth: number;
}

export function NetWorthHeader({ netWorth }: NetWorthHeaderProps) {
  const isPositive = netWorth >= 0;
  
  return (
    <div className="net-worth-header">
      <span className="net-worth-label">Current Net Worth</span>
      <span className={`net-worth-value ${isPositive ? 'positive' : 'negative'}`}>
        {formatCurrency(netWorth)}
      </span>
    </div>
  );
}
