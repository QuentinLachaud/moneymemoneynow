import { Account } from '../App';
import { calculateProjections } from '../utils/calculations';

interface DataTableProps {
  accounts: Account[];
}

export function DataTable({ accounts }: DataTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        Add accounts to see projection data
      </div>
    );
  }

  const maxHorizon = Math.max(...accounts.map(acc => acc.timeHorizon));
  const projections = calculateProjections(accounts, maxHorizon);

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            <th className="px-4 py-2 text-left text-gray-700">Year</th>
            {accounts.map(account => (
              <th key={account.id} className="px-4 py-2 text-right text-gray-700">
                {account.name}
              </th>
            ))}
            <th className="px-4 py-2 text-right text-gray-900">Total</th>
          </tr>
        </thead>
        <tbody>
          {projections.map((row, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-2 text-gray-900">{row.year}</td>
              {accounts.map(account => (
                <td key={account.id} className="px-4 py-2 text-right text-gray-600">
                  ${(row[account.name] as number || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              ))}
              <td className="px-4 py-2 text-right text-gray-900">
                ${(row.Total as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
