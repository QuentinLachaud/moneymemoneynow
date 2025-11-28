/**
 * ProjectionChart — Line chart showing projected account values over time
 *
 * DISPLAYS:
 * - One line per account (colored by account ID)
 * - Total line (black, thicker) summing all accounts
 * - X-axis: calendar years
 * - Y-axis: dollar value (formatted as $Xk)
 *
 * CUSTOMIZATION:
 * - To change line colors: modify getColorForId() in utils/colors.ts
 * - To change Total line style: modify the last <Line> element
 * - To add more data series: add more <Line> components
 */

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
}

export function ProjectionChart({ accounts }: ProjectionChartProps) {
  // Empty state
  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Add accounts to see projections
      </div>
    );
  }

  // Calculate projection data for the longest time horizon
  const maxHorizon = Math.max(...accounts.map((acc) => acc.timeHorizon));
  const projections = calculateProjections(accounts, maxHorizon);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={projections}>
            <CartesianGrid strokeDasharray="3 3" />

            {/* X-Axis: Calendar years */}
            <XAxis
              dataKey="year"
              label={{ value: 'Years', position: 'insideBottom', offset: -5 }}
            />

            {/* Y-Axis: Dollar values formatted as $Xk */}
            <YAxis
              label={{ value: 'Value ($)', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />

            {/* Tooltip: Full dollar amount on hover */}
            <Tooltip
              formatter={(value: number) =>
                `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
            />

            <Legend />

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
              stroke="#1f2937"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
