/**
 * SurvivalScatterChart — Scatter plot showing survival rate vs starting balance
 * 
 * Visualizes the relationship between starting portfolio value and 
 * the probability of the portfolio surviving (not depleting to zero).
 * 
 * Expected pattern: Exponential rise followed by plateau at 100%
 */

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface SurvivalScatterChartProps {
  /** Array of data points: { startingBalance, survivalRate } */
  data: Array<{ startingBalance: number; survivalRate: number }>;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
  return `£${value.toFixed(0)}`;
}

export function SurvivalScatterChart({ data }: SurvivalScatterChartProps) {
  if (data.length === 0) {
    return (
      <div className="empty-chart-state">
        <p>Run simulations to see survival analysis</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
        <XAxis
          type="number"
          dataKey="startingBalance"
          name="Starting Balance"
          tickFormatter={formatCurrency}
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <YAxis
          type="number"
          dataKey="survivalRate"
          name="Survival Rate"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(15, 18, 25, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
          }}
          formatter={(value: number, name: string) => {
            if (name === 'Starting Balance') return formatCurrency(value);
            return `${value.toFixed(1)}%`;
          }}
          labelFormatter={() => ''}
        />
        <ReferenceLine y={100} stroke="rgba(16, 185, 129, 0.4)" strokeDasharray="3 3" />
        <ReferenceLine y={95} stroke="rgba(245, 158, 11, 0.3)" strokeDasharray="3 3" />
        <Scatter
          name="Simulations"
          data={data}
          fill="#818cf8"
          fillOpacity={0.6}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
