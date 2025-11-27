import { Account } from '../App';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculateProjections } from '../utils/calculations';

interface ProjectionChartProps {
  accounts: Account[];
}

export function ProjectionChart({ accounts }: ProjectionChartProps) {
  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Add accounts to see projections
      </div>
    );
  }

  const maxHorizon = Math.max(...accounts.map(acc => acc.timeHorizon));
  const projections = calculateProjections(accounts, maxHorizon);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 px-[0px] py-[10px] rounded-[5px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={projections}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="year" 
              label={{ value: 'Years', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              label={{ value: 'Value ($)', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <Legend />
            {accounts.map((account, index) => (
              <Line
                key={account.id}
                type="monotone"
                dataKey={account.name}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
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
