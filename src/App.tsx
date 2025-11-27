import { useState } from 'react';
import { AccountForm } from './components/AccountForm';
import { AccountsList } from './components/AccountsList';
import { DataTable } from './components/DataTable';
import { ProjectionChart } from './components/ProjectionChart';
import { CompositionChart } from './components/CompositionChart';
import { ResizablePanel } from './components/ResizablePanel';

export interface Account {
  id: string;
  name: string;
  amount: number;
  date: string;
  expectedReturn: number;
  volatility?: string;
  timeHorizon: number;
  frequency: 'monthly' | 'annual';
  transactionType: 'deposit' | 'withdraw';
  transactionAmount: number;
}

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  const addAccount = (account: Omit<Account, 'id'>) => {
    setAccounts([...accounts, { ...account, id: Date.now().toString() }]);
  };

  const updateAccount = (id: string, account: Omit<Account, 'id'>) => {
    setAccounts(accounts.map(acc => acc.id === id ? { ...account, id } : acc));
  };

  const deleteAccount = (id: string) => {
    setAccounts(accounts.filter(acc => acc.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-8 text-gray-900">Finance Portfolio Tracker</h1>
        
        <div className="flex gap-6 mb-6">
          <ResizablePanel defaultWidth={400} minWidth={300} maxWidth={600}>
            <div className="bg-white rounded-lg shadow-sm p-6 h-full overflow-auto">
              <h2 className="mb-4 text-gray-900">Add Account</h2>
              <AccountForm onSubmit={addAccount} />
              <div className="mt-6">
                <AccountsList 
                  accounts={accounts} 
                  onUpdate={updateAccount}
                  onDelete={deleteAccount}
                />
              </div>
            </div>
          </ResizablePanel>

          <div className="flex-1 flex flex-col gap-6">
            <ResizablePanel defaultHeight={300} minHeight={200} direction="vertical">
              <div className="bg-white rounded-lg shadow-sm p-6 h-full">
                <h2 className="mb-4 text-gray-900">Current Net Worth Composition</h2>
                <CompositionChart accounts={accounts} />
              </div>
            </ResizablePanel>

            <ResizablePanel defaultHeight={400} minHeight={250} direction="vertical">
              <div className="bg-white rounded-lg shadow-sm p-6 h-full">
                <h2 className="mb-4 text-gray-900">Net Worth Projection</h2>
                <ProjectionChart accounts={accounts} />
              </div>
            </ResizablePanel>
          </div>
        </div>

        <ResizablePanel defaultHeight={300} minHeight={200} direction="vertical">
          <div className="bg-white rounded-lg shadow-sm p-6 h-full overflow-auto">
            <h2 className="mb-4 text-gray-900">Projection Data Table</h2>
            <DataTable accounts={accounts} />
          </div>
        </ResizablePanel>
      </div>
    </div>
  );
}
