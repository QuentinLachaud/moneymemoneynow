/**
 * WaterfallChart.tsx — Waterfall chart showing income → expenses → savings flow
 *
 * Features:
 * - First bar = Total Income
 * - Subsequent bars = expenses (decreasing from income)
 * - Final bar = Remaining Savings
 * - Annotated values on each bar
 * - Clean axis labels
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from 'recharts';
import { Currency, CURRENCY_SYMBOLS } from '../../utils/investmentSimulation';
import {
  ExpenseSection,
  generateWaterfallData,
  WaterfallDataPoint,
} from '../../utils/savingsCalculations';

interface WaterfallChartProps {
  totalIncome: number;
  sections: ExpenseSection[];
  currency: Currency;
}

/** Custom tooltip for waterfall */
function CustomTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: WaterfallDataPoint }>;
  currency: Currency;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const symbol = CURRENCY_SYMBOLS[currency];
  const isExpense = !data.isIncome && !data.isSavings;

  return (
    <div className="waterfall-tooltip">
      <p className="waterfall-tooltip-name">{data.name}</p>
      <p className="waterfall-tooltip-value">
        {isExpense ? '-' : ''}
        {symbol}{Math.abs(data.displayValue).toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

/** Format compact value for labels */
function formatCompact(value: number, symbol: string): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1_000_000) {
    return `${sign}${symbol}${(absValue / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}${symbol}${(absValue / 1_000).toFixed(1)}K`;
  }
  return `${sign}${symbol}${absValue.toFixed(0)}`;
}

export function WaterfallChart({
  totalIncome,
  sections,
  currency,
}: WaterfallChartProps) {
  const data = generateWaterfallData(totalIncome, sections);
  const symbol = CURRENCY_SYMBOLS[currency];

  // Show empty state if no income
  if (totalIncome === 0) {
    return (
      <div className="waterfall-chart-empty">
        <p>Enter income to see waterfall</p>
      </div>
    );
  }

  // Calculate domain for Y axis
  const maxValue = Math.max(totalIncome * 1.1, 100);

  // Custom bar shape for waterfall effect
  const WaterfallBar = (props: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    payload: WaterfallDataPoint;
  }) => {
    const { x, y, width, height, fill, payload } = props;
    
    // For income and savings, bar starts from 0
    // For expenses, bar starts from 'start' value
    if (payload.isIncome || payload.isSavings) {
      const barHeight = Math.abs(payload.end);
      const barY = payload.end >= 0 ? maxValue - payload.end : maxValue;
      return (
        <rect
          x={x}
          y={(barY / maxValue) * (maxValue - y - height) + y}
          width={width}
          height={(barHeight / maxValue) * (maxValue - y - height)}
          fill={fill}
          rx={4}
          ry={4}
        />
      );
    }

    // Expense bar: from 'end' to 'start' (falling)
    const barTop = (payload.end / maxValue);
    const barBottom = (payload.start / maxValue);
    const barHeight = payload.end - payload.start;
    
    return (
      <rect
        x={x}
        y={height - (payload.end / maxValue) * height}
        width={width}
        height={(barHeight / maxValue) * height}
        fill={fill}
        rx={4}
        ry={4}
      />
    );
  };

  return (
    <div className="waterfall-chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 30, right: 20, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tickFormatter={(value) => formatCompact(value, symbol)}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={[0, maxValue]}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <ReferenceLine y={0} stroke="var(--border)" />
          
          {/* Invisible bar for positioning */}
          <Bar dataKey="start" stackId="waterfall" fill="transparent" />
          
          {/* Visible bar showing the value */}
          <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="displayValue"
              position="top"
              formatter={(value: number) => formatCompact(value, symbol)}
              fill="var(--foreground)"
              fontSize={11}
              fontWeight={500}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
