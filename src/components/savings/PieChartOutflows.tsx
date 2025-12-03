/**
 * PieChartOutflows.tsx — Pie chart showing outflow breakdown by section
 *
 * Features:
 * - Recharts PieChart with clean labels
 * - Consistent colors per section
 * - Hover tooltip with percentage and amount
 * - Responsive container
 */

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Currency, CURRENCY_SYMBOLS } from '../../utils/investmentSimulation';
import {
  ExpenseSection,
  generatePieChartData,
  SECTION_COLORS,
} from '../../utils/savingsCalculations';

interface PieChartOutflowsProps {
  sections: ExpenseSection[];
  currency: Currency;
}

/** Custom tooltip for pie chart */
function CustomTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; value: number; percentage: number } }>;
  currency: Currency;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const symbol = CURRENCY_SYMBOLS[currency];

  return (
    <div className="pie-tooltip">
      <p className="pie-tooltip-name">{data.name}</p>
      <p className="pie-tooltip-value">
        {symbol}{data.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </p>
      <p className="pie-tooltip-percent">{data.percentage.toFixed(1)}%</p>
    </div>
  );
}

/** Custom label for pie slices */
function renderLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}) {
  // Only show label if slice is > 5%
  if (percent < 0.05) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function PieChartOutflows({ sections, currency }: PieChartOutflowsProps) {
  const data = generatePieChartData(sections);

  // Show empty state if no data
  if (data.length === 0) {
    return (
      <div className="pie-chart-empty">
        <p>No expenses to display</p>
      </div>
    );
  }

  return (
    <div className="pie-chart-container">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={renderLabel}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ color: 'var(--foreground)', fontSize: '12px' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
