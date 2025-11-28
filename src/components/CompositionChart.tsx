/**
 * CompositionChart — Bar chart showing current account balances
 *
 * DISPLAYS:
 * - Total net worth summary at top
 * - Bar for each account showing current amount
 * - X-axis: account names
 * - Y-axis: dollar amounts
 *
 * CUSTOMIZATION:
 * - To change bar color: modify fill prop on <Bar> element
 * - To add pie chart: import PieChart from recharts and replace BarChart
 * - To change total display: modify the <p> element in the header
 */

import { Account } from '../App';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CompositionChartProps {
  accounts: Account[];
}

export function CompositionChart({ accounts }: CompositionChartProps) {
  // Empty state
  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Add accounts to see composition
      </div>
    );
  }

  // Transform accounts to chart data format
  const data = accounts.map((account) => ({
    name: account.name,
    amount: account.amount,
  }));

  // Calculate total for summary display
  const totalNetWorth = accounts.reduce((sum, acc) => sum + acc.amount, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Total Net Worth Summary */}
      <div className="mb-4">
        <p className="text-gray-600">
          Total Net Worth:{' '}
          <span className="text-gray-900">
            ${totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </p>
      </div>

      {/* Bar Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: number) =>
                `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
            />
            <Legend />
            {/* Change fill color here to modify bar appearance */}
            <Bar dataKey="amount" fill="#3b82f6" name="Current Value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
