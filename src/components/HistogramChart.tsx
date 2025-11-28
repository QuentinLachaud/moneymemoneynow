/**
 * HistogramChart — Distribution histogram for Monte Carlo final values
 * 
 * FEATURES:
 * - Displays histogram of final simulation values
 * - Adjustable bin count (5-100)
 * - Vertical reference lines for median, mean, percentiles
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { SimulationStats, generateHistogramBins, formatCurrency } from '../utils/monteCarlo';

interface HistogramChartProps {
  finalValues: number[];
  stats: SimulationStats;
  numBins: number;
}

export function HistogramChart({ finalValues, stats, numBins }: HistogramChartProps) {
  const bins = useMemo(() => {
    return generateHistogramBins(finalValues, numBins);
  }, [finalValues, numBins]);

  // Format bins for chart
  const chartData = useMemo(() => {
    return bins.map((bin, idx) => ({
      name: `${formatCurrency(bin.binStart)}`,
      binMid: (bin.binStart + bin.binEnd) / 2,
      count: bin.count,
      percentage: bin.percentage,
    }));
  }, [bins]);

  // Reference line values
  const mean = stats.finalValues.mean;
  const median = stats.finalValues.median;
  const p50 = stats.finalValues.percentile50;
  const p90 = stats.finalValues.percentile90;

  return (
    <div className="histogram-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
          
          <XAxis
            dataKey="binMid"
            tickFormatter={(value) => formatCurrency(value)}
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            angle={-45}
            textAnchor="end"
            interval={Math.floor(numBins / 8)}
          />
          
          <YAxis
            tickFormatter={(value) => `${value}`}
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            label={{ 
              value: 'Count', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: 11, fill: 'rgba(255,255,255,0.5)' }
            }}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(18, 22, 24, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px',
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}
            formatter={(value: number, name: string) => {
              if (name === 'count') return [`${value} simulations`, 'Count'];
              if (name === 'percentage') return [`${value.toFixed(1)}%`, 'Percentage'];
              return [value, name];
            }}
            labelFormatter={(label) => `Value: ${formatCurrency(label)}`}
          />
          
          {/* Histogram bars */}
          <Bar 
            dataKey="count" 
            fill="rgba(212, 175, 55, 0.6)"
            stroke="rgba(212, 175, 55, 0.8)"
            strokeWidth={1}
          />
          
          {/* Reference lines */}
          <ReferenceLine 
            x={median} 
            stroke="#fbbf24" 
            strokeWidth={2}
            strokeDasharray="5 3"
            label={{ 
              value: 'Median', 
              position: 'top',
              fill: '#fbbf24',
              fontSize: 10,
            }}
          />
          
          <ReferenceLine 
            x={mean} 
            stroke="#60a5fa" 
            strokeWidth={2}
            strokeDasharray="5 3"
            label={{ 
              value: 'Mean', 
              position: 'top',
              fill: '#60a5fa',
              fontSize: 10,
            }}
          />
          
          <ReferenceLine 
            x={p90} 
            stroke="#4ade80" 
            strokeWidth={2}
            strokeDasharray="3 3"
            label={{ 
              value: '90th', 
              position: 'top',
              fill: '#4ade80',
              fontSize: 10,
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
