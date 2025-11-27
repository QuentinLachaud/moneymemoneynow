import { Account } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CompositionChartProps {
  accounts: Account[];
}

export function CompositionChart({ accounts }: CompositionChartProps) {
  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Add accounts to see composition
      </div>
    );
  }

  const data = accounts.map(account => ({
    name: account.name,
    amount: account.amount,
  }));

  const totalNetWorth = accounts.reduce((sum, acc) => sum + acc.amount, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <p className="text-gray-600">
          Total Net Worth: <span className="text-gray-900">${totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <Legend />
            <Bar dataKey="amount" fill="#3b82f6" name="Current Value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
