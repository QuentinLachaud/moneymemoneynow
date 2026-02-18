import { useState } from 'react';
import { Account } from '../App';
import { Trash2, Edit2, X, Check } from 'lucide-react';
import { IconButton } from '@quentinlachaud/app-component-library';
import { AccountForm } from './AccountForm';

interface AccountsListProps {
  accounts: Account[];
  onUpdate: (id: string, account: Omit<Account, 'id'>) => void;
  onDelete: (id: string) => void;
}

export function AccountsList({ accounts, onUpdate, onDelete }: AccountsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (accounts.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No accounts added yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-gray-900">Accounts ({accounts.length})</h3>
      {accounts.map((account) => (
        <div key={account.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          {editingId === account.id ? (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-900">Edit Account</span>
                <IconButton
                  icon={<X size={18} />}
                  label="Cancel editing"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(null)}
                />
              </div>
              <AccountForm
                initialData={account}
                onSubmit={(updatedAccount) => {
                  onUpdate(account.id, updatedAccount);
                  setEditingId(null);
                }}
                submitLabel="Update Account"
              />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h4 className="text-gray-900">{account.name}</h4>
                  <p className="text-gray-600">${account.amount.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <IconButton
                    icon={<Edit2 size={16} />}
                    label="Edit account"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(account.id)}
                  />
                  <IconButton
                    icon={<Trash2 size={16} />}
                    label="Delete account"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(account.id)}
                  />
                </div>
              </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Return: {account.expectedReturn}% | Horizon: {account.timeHorizon}y</div>
                  <div>
                    {account.frequency === 'monthly' ? 'Monthly' : 'Annual'}{' '}
                    {account.transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'}:{' '}
                    {/* Show negative sign for withdrawals; amount stored positive */}
                    {account.transactionType === 'withdraw' ? '-$' : '$'}{Math.abs(account.transactionAmount).toLocaleString()}
                  </div>
                  {account.volatility && (
                    <div>Volatility: {account.volatility}</div>
                  )}
                </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
