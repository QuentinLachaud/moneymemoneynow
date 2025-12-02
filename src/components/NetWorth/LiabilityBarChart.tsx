/**
 * LiabilityBarChart Component
 * 
 * Horizontal bar chart for liabilities (inverted), sorted descending by magnitude
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Liability, getLiabilityTypeLabel } from '../../store/useNetWorthStore';
import { formatCompactCurrency } from './formatters';
import { ChartTooltip } from './ChartTooltip';

// Red color palette
const LIABILITY_COLORS = [
  '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',
  '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#fef2f2',
];

interface LiabilityBarChartProps {
  liabilities: Liability[];
}

export function LiabilityBarChart({ liabilities }: LiabilityBarChartProps) {
  const chartData = useMemo(() => {
    return [...liabilities]
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .map(liability => ({
        name: liability.customName || getLiabilityTypeLabel(liability.type),
        customName: liability.customName,
        value: Math.abs(liability.value),
      }));
  }, [liabilities]);
  
  if (chartData.length === 0) {
    return (
      <div className="chart-container">
        <h4 className="chart-title liabilities">Liabilities by Value</h4>
        <div className="chart-empty">Add liabilities to see chart</div>
      </div>
    );
  }
  
  return (
    <div className="chart-container">
      <h4 className="chart-title liabilities">Liabilities by Value</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart 
          data={chartData} 
          layout="vertical" 
          margin={{ left: 20, right: 80 }}
        >
          <XAxis 
            type="number" 
            tickFormatter={formatCompactCurrency}
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            reversed
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={75} 
            orientation="right"
            tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip isLiability />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="value" radius={[4, 0, 0, 4]}>
            {chartData.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={LIABILITY_COLORS[index % LIABILITY_COLORS.length]} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
