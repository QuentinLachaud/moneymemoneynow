/**
 * PieCharts Components
 * 
 * Asset and Liability pie charts with custom tooltips
 */

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Asset, Liability, getAssetTypeLabel, getLiabilityTypeLabel } from '../../store/useNetWorthStore';
import { PieChartTooltip } from './ChartTooltip';

// Green color palette for assets
const ASSET_COLORS = [
  '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
  '#4ade80', '#86efac', '#bbf7d0', '#dcfce7', '#f0fdf4',
];

// Red color palette for liabilities
const LIABILITY_COLORS = [
  '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',
  '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#fef2f2',
];

interface AssetPieChartProps {
  assets: Asset[];
}

export function AssetPieChart({ assets }: AssetPieChartProps) {
  const pieData = useMemo(() => {
    return assets.map(asset => ({
      name: asset.customName || getAssetTypeLabel(asset.type),
      customName: asset.customName,
      value: asset.value,
    }));
  }, [assets]);
  
  if (pieData.length === 0) {
    return (
      <div className="chart-container pie">
        <h4 className="chart-title">Asset Allocation</h4>
        <div className="chart-empty pie">Add assets to see allocation</div>
      </div>
    );
  }
  
  return (
    <div className="chart-container pie">
      <h4 className="chart-title">Asset Allocation</h4>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
          >
            {pieData.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={ASSET_COLORS[index % ASSET_COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip content={<PieChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface LiabilityPieChartProps {
  liabilities: Liability[];
}

export function LiabilityPieChart({ liabilities }: LiabilityPieChartProps) {
  const pieData = useMemo(() => {
    return liabilities.map(liability => ({
      name: liability.customName || getLiabilityTypeLabel(liability.type),
      customName: liability.customName,
      value: Math.abs(liability.value),
    }));
  }, [liabilities]);
  
  if (pieData.length === 0) {
    return (
      <div className="chart-container pie">
        <h4 className="chart-title liabilities">Liability Breakdown</h4>
        <div className="chart-empty pie">Add liabilities to see breakdown</div>
      </div>
    );
  }
  
  return (
    <div className="chart-container pie">
      <h4 className="chart-title liabilities">Liability Breakdown</h4>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
          >
            {pieData.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={LIABILITY_COLORS[index % LIABILITY_COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip content={<PieChartTooltip isLiability />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
