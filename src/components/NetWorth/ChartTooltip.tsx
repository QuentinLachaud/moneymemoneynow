/**
 * Custom Chart Tooltip Component
 * 
 * Provides white text on dark background for all charts
 */

import { formatCurrency } from './formatters';

interface TooltipPayload {
  name: string;
  value: number;
  payload: {
    name: string;
    value: number;
    customName?: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  isLiability?: boolean;
}

/**
 * Custom tooltip component for Recharts
 * White text, compact, minimal obstruction
 */
export function ChartTooltip({ active, payload, isLiability = false }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  
  const data = payload[0];
  const name = data.payload.customName || data.payload.name;
  const value = isLiability ? -Math.abs(data.value) : data.value;
  
  return (
    <div className="nw-chart-tooltip">
      <p className="nw-tooltip-label">{name}</p>
      <p className="nw-tooltip-value">{formatCurrency(value)}</p>
    </div>
  );
}

/**
 * Compact pie chart tooltip
 */
export function PieChartTooltip({ active, payload, isLiability = false }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  
  const data = payload[0];
  const name = data.payload.customName || data.payload.name;
  const value = isLiability ? -Math.abs(data.value) : data.value;
  
  return (
    <div className="nw-pie-tooltip">
      <span className="nw-pie-tooltip-name">{name}</span>
      <span className="nw-pie-tooltip-value">{formatCurrency(value)}</span>
    </div>
  );
}
