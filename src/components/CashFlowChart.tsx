/**
 * CashFlowChart — Line chart showing annual cash flow rates per account
 *
 * DISPLAYS:
 * - Flat horizontal lines for each account showing their annual cash flow
 * - Deposits are positive (above zero), withdrawals are negative (below zero)
 * - Lines span only the duration of each account's time horizon
 * - Total line showing net annual cash flow across all accounts
 *
 * CALCULATION:
 * - Monthly accounts: transactionAmount × 12 (annualized)
 * - Annual accounts: transactionAmount as-is
 * - Lines are flat for each account's active period
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

interface CashFlowDataPoint {
  year: number;
  Total: number;
  [accountId: string]: number | string;
}

/**
 * Calculate cash flow data for the chart
 * Returns flat horizontal lines per account showing annual cash flow rate
 */
function calculateCashFlowData(accounts: Account[]): CashFlowDataPoint[] {
  if (accounts.length === 0) return [];

  // Find year range across all accounts
  const startYears = accounts.map(a => new Date(a.date).getFullYear());
  const endYears = accounts.map(a => new Date(a.date).getFullYear() + a.timeHorizon);
  const minYear = Math.min(...startYears);
  const maxYear = Math.max(...endYears);

  const data: CashFlowDataPoint[] = [];

  for (let year = minYear; year <= maxYear; year++) {
    const row: CashFlowDataPoint = { year, Total: 0 };

    accounts.forEach(acc => {
      const accStartYear = new Date(acc.date).getFullYear();
      const accEndYear = accStartYear + acc.timeHorizon;

      // Check if this account is active during this year
      if (year >= accStartYear && year < accEndYear) {
        // Calculate annual cash flow
        // Monthly: multiply by 12 to annualize
        // Annual: use as-is
        const annualAmount = acc.frequency === 'monthly' 
          ? acc.transactionAmount * 12 
          : acc.transactionAmount;
        
        // Apply sign based on transaction type
        const signedAmount = acc.transactionType === 'withdraw' 
          ? -Math.abs(annualAmount) 
          : Math.abs(annualAmount);

        row[acc.id] = signedAmount;
        row.Total += signedAmount;
      } else {
        // Account not active this year
        row[acc.id] = 0;
      }
    });

    data.push(row);
  }

  return data;
}

/**
 * Generate table columns from accounts
 */
export function getCashFlowColumns(accounts: Account[]) {
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
    { key: 'Total', label: 'Net Cash Flow', format: formatCurrency },
  ];
}

/**
 * Export data calculation for use by parent component
 */
export function getCashFlowData(accounts: Account[]) {
  return calculateCashFlowData(accounts);
}

export function CashFlowChart({ accounts }: CashFlowChartProps) {
  // Empty state
  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Add accounts to see cash flow
      </div>
    );
  }

  const data = calculateCashFlowData(accounts);

  // Check if all transaction amounts are zero
  const hasData = accounts.some(acc => acc.transactionAmount > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Add transaction amounts to see cash flow
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

        {/* X-Axis: Years */}
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />

        {/* Y-Axis: Annual cash flow amount */}
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
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />

        {/* Zero reference line */}
        <ReferenceLine 
          y={0} 
          stroke="rgba(255,255,255,0.3)" 
          strokeWidth={1}
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
              {value === 'Total' ? 'Net Cash Flow' : value}
            </span>
          )}
        />

        {/* Individual account lines - step type for flat horizontal lines */}
        {accounts.map((account) => (
          <Line
            key={account.id}
            type="stepAfter"
            dataKey={account.id}
            name={account.name}
            stroke={getColorForId(account.id)}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        ))}

        {/* Total line (net cash flow) */}
        <Line
          type="stepAfter"
          dataKey="Total"
          name="Total"
          stroke="#f7f5ee"
          strokeWidth={2.5}
          dot={false}
          strokeDasharray="4 2"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
