/**
 * ProjectionChart — Line chart showing projected account values over time
 *
 * DISPLAYS:
 * - One line per account (colored by account ID)
 * - Total line (white, thicker) summing all accounts
 * - X-axis: calendar years
 * - Y-axis: dollar value (formatted as £Xk) with log/linear scale toggle
 *
 * CUSTOMIZATION:
 * - To change line colors: modify getColorForId() in utils/colors.ts
 * - To change Total line style: modify the last <Line> element
 */

import { useState } from 'react';
import { Account } from '../App';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { calculateProjections } from '../utils/calculations';
import { getColorForId } from '../utils/colors';

interface ProjectionChartProps {
  accounts: Account[];
  /** Callback to toggle scale mode */
  isLogScale?: boolean;
  onToggleScale?: () => void;
}

/**
 * Generate table columns from accounts
 */
export function getProjectionColumns(accounts: Account[]) {
  const formatCurrency = (val: number | string) => {
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return num.toLocaleString('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return [
    { key: 'year', label: 'Year', format: (v: number | string) => String(v) },
    ...accounts.map(acc => ({
      key: acc.id,
      label: acc.name,
      format: formatCurrency,
    })),
    { key: 'Total', label: 'Total', format: formatCurrency },
  ];
}

/**
 * Export projection data for use by parent component
 */
export function getProjectionData(accounts: Account[]) {
  if (accounts.length === 0) return [];
  const maxHorizon = Math.max(...accounts.map((acc) => acc.timeHorizon));
  return calculateProjections(accounts, maxHorizon);
}

export function ProjectionChart({ accounts, isLogScale = false }: ProjectionChartProps) {
  // Empty state
  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Add accounts to see projections
      </div>
    );
  }

  // Calculate projection data for the longest time horizon
  const maxHorizon = Math.max(...accounts.map((acc) => acc.timeHorizon));
  const projections = calculateProjections(accounts, maxHorizon);

  // For log scale, filter out zero/negative values
  const chartData = isLogScale 
    ? projections.map(row => {
        const newRow = { ...row };
        Object.keys(newRow).forEach(key => {
          if (key !== 'year' && typeof newRow[key] === 'number' && (newRow[key] as number) <= 0) {
            newRow[key] = 0.01; // Small positive value for log scale
          }
        });
        return newRow;
      })
    : projections;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

        {/* X-Axis: Calendar years */}
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />

        {/* Y-Axis: Value with optional log scale */}
        <YAxis
          scale={isLogScale ? 'log' : 'auto'}
          domain={isLogScale ? ['auto', 'auto'] : [0, 'auto']}
          tickFormatter={(value) => {
            if (value >= 1000000) {
              return `£${(value / 1000000).toFixed(1)}M`;
            }
            if (value >= 1000) {
              return `£${(value / 1000).toFixed(0)}k`;
            }
            return `£${value}`;
          }}
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />

        {/* Tooltip */}
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(18, 22, 24, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '12px',
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}
          formatter={(value: number) =>
            value.toLocaleString('en-GB', {
              style: 'currency',
              currency: 'GBP',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })
          }
          labelFormatter={(label) => `Year ${label}`}
        />

        {/* Legend at top-right, vertical layout */}
        <Legend 
          verticalAlign="top"
          align="right"
          layout="vertical"
          wrapperStyle={{ 
            paddingLeft: '20px',
            fontSize: '11px',
            maxHeight: '80%',
            overflowY: 'auto',
          }}
          formatter={(value) => (
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>
              {value}
            </span>
          )}
        />

        {/* Individual account lines */}
        {accounts.map((account) => (
          <Line
            key={account.id}
            type="monotone"
            dataKey={account.id}
            name={account.name}
            stroke={getColorForId(account.id)}
            strokeWidth={2}
            dot={false}
          />
        ))}

        {/* Total line (sum of all accounts) */}
        <Line
          type="monotone"
          dataKey="Total"
          stroke="#f7f5ee"
          strokeWidth={2.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}