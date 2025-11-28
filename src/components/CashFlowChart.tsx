/**
 * CashFlowChart — Line chart showing cumulative cash flow over time
 *
 * DISPLAYS:
 * - One line per account showing its contribution/withdrawal impact
 * - Total line (sum of all accounts) showing net cash flow
 * - X-axis: time periods (months or years based on account frequency)
 * - Y-axis: cumulative cash flow amount
 *
 * CALCULATION:
 * For each account, at each time point:
 *   - Deposits add transactionAmount to the running total
 *   - Withdrawals subtract transactionAmount from the running total
 * The chart shows how much money flows in/out over the projection period.
 *
 * CUSTOMIZATION:
 * - To change line colors: modify getColorForId() in utils/colors.ts
 * - To change Total line style: modify the last <Line> element
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
  ReferenceLine,
} from 'recharts';
import { getColorForId } from '../utils/colors';

interface CashFlowChartProps {
  accounts: Account[];
}

/**
 * Calculate cash flow data for the chart
 * Returns an array of data points with cumulative cash flow per account
 */
function calculateCashFlow(accounts: Account[]): Array<Record<string, number | string>> {
  if (accounts.length === 0) return [];

  // Determine the maximum time horizon across all accounts
  const maxHorizon = Math.max(...accounts.map((acc) => acc.timeHorizon));
  
  // Find the earliest start date to use as base year
  const baseYear = Math.min(
    ...accounts.map((a) => new Date(a.date).getFullYear())
  );

  // We'll calculate monthly to get smooth curves, then aggregate
  const totalMonths = maxHorizon * 12;
  const data: Array<Record<string, number | string>> = [];

  // Track cumulative totals per account
  const cumulativeByAccount: Record<string, number> = {};
  accounts.forEach((acc) => {
    cumulativeByAccount[acc.id] = 0;
  });

  for (let month = 0; month <= totalMonths; month++) {
    const year = baseYear + Math.floor(month / 12);
    const monthInYear = month % 12;
    
    // Create label (show year for Jan, otherwise month abbreviation)
    const label = monthInYear === 0 
      ? `${year}` 
      : month % 3 === 0 
        ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthInYear]}` 
        : '';

    const row: Record<string, number | string> = { 
      month,
      label: month % 12 === 0 ? `${year}` : '',
      year,
    };

    let total = 0;

    accounts.forEach((acc) => {
      const accStartYear = new Date(acc.date).getFullYear();
      const accStartMonth = new Date(acc.date).getMonth();
      const accStartMonthIndex = (accStartYear - baseYear) * 12 + accStartMonth;
      const accEndMonthIndex = accStartMonthIndex + acc.timeHorizon * 12;

      // Only apply transactions if we're within this account's active period
      if (month >= accStartMonthIndex && month < accEndMonthIndex) {
        const monthsSinceStart = month - accStartMonthIndex;
        
        // Determine if a transaction occurs this month
        let transactionThisMonth = false;
        if (acc.frequency === 'monthly') {
          transactionThisMonth = true;
        } else if (acc.frequency === 'annual') {
          // Annual transactions happen every 12 months from start
          transactionThisMonth = monthsSinceStart % 12 === 0;
        }

        if (transactionThisMonth) {
          const amount = acc.transactionType === 'withdraw' 
            ? -Math.abs(acc.transactionAmount) 
            : Math.abs(acc.transactionAmount);
          cumulativeByAccount[acc.id] += amount;
        }
      }

      row[acc.id] = cumulativeByAccount[acc.id];
      total += cumulativeByAccount[acc.id];
    });

    row.Total = total;
    
    // Only include data points at yearly intervals for cleaner chart
    // (or quarterly for short horizons)
    if (month % 12 === 0 || maxHorizon <= 3) {
      data.push(row);
    }
  }

  return data;
}

export function CashFlowChart({ accounts }: CashFlowChartProps) {
  // Empty state
  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Add accounts to see cash flow
      </div>
    );
  }

  const data = calculateCashFlow(accounts);

  // Check if all values are zero
  const hasData = data.some(row => 
    accounts.some(acc => Math.abs(Number(row[acc.id]) || 0) > 0)
  );

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Add transaction amounts to see cash flow
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />

            {/* X-Axis: Years */}
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />

            {/* Y-Axis: Dollar values */}
            <YAxis
              tickFormatter={(value) => {
                if (Math.abs(value) >= 1000000) {
                  return `£${(value / 1000000).toFixed(1)}M`;
                }
                if (Math.abs(value) >= 1000) {
                  return `£${(value / 1000).toFixed(0)}k`;
                }
                return `£${value}`;
              }}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />

            {/* Zero reference line */}
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />

            {/* Tooltip */}
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(18, 22, 24, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}
              formatter={(value: number, name: string) => {
                const formatted = value.toLocaleString('en-GB', {
                  style: 'currency',
                  currency: 'GBP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                });
                return [formatted, name === 'Total' ? 'Net Cash Flow' : name];
              }}
              labelFormatter={(label) => `Year ${label}`}
            />

            <Legend 
              wrapperStyle={{ paddingTop: '16px' }}
              formatter={(value) => (
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                  {value === 'Total' ? 'Net Cash Flow' : value}
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
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}

            {/* Total line (net cash flow) */}
            <Line
              type="monotone"
              dataKey="Total"
              name="Total"
              stroke="#f7f5ee"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
