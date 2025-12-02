/**
 * AssetBarChart Component
 * 
 * Horizontal bar chart for assets, sorted descending
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
import { Asset, getAssetTypeLabel } from '../../store/useNetWorthStore';
import { formatCompactCurrency } from './formatters';
import { ChartTooltip } from './ChartTooltip';

// Green color palette
const ASSET_COLORS = [
  '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
  '#4ade80', '#86efac', '#bbf7d0', '#dcfce7', '#f0fdf4',
];

interface AssetBarChartProps {
  assets: Asset[];
}

export function AssetBarChart({ assets }: AssetBarChartProps) {
  const chartData = useMemo(() => {
    return [...assets]
      .sort((a, b) => b.value - a.value)
      .map(asset => ({
        name: asset.customName || getAssetTypeLabel(asset.type),
        customName: asset.customName,
        value: asset.value,
      }));
  }, [assets]);
  
  if (chartData.length === 0) {
    return (
      <div className="chart-container">
        <h4 className="chart-title">Assets by Value</h4>
        <div className="chart-empty">Add assets to see chart</div>
      </div>
    );
  }
  
  return (
    <div className="chart-container">
      <h4 className="chart-title">Assets by Value</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart 
          data={chartData} 
          layout="vertical" 
          margin={{ left: 80, right: 20 }}
        >
          <XAxis 
            type="number" 
            tickFormatter={formatCompactCurrency}
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={75} 
            tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={ASSET_COLORS[index % ASSET_COLORS.length]} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
