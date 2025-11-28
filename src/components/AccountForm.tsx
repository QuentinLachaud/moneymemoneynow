/**
 * AccountForm — Form for adding or editing accounts
 *
 * USAGE:
 * - Add mode: called without initialData
 * - Edit mode: called with initialData and custom submitLabel
 *
 * FORM FIELDS:
 * - transactionType: Toggle slider (deposit green / drawdown red)
 * - name: Account display name
 * - amount: Current balance (shown only for deposits, auto-populated from existing asset)
 * - date: Start date for projections
 * - expectedReturn: Annual return percentage
 * - volatility: Risk level (optional)
 * - timeHorizon: Investment period in years (slider)
 * - frequency: Transaction frequency (monthly/annual)
 * - transactionAmount: Recurring transaction amount
 *
 * CUSTOMIZATION:
 * - To add a field: add state, add input, include in handleSubmit
 * - To change validation: modify the if check in handleSubmit
 * - To change slider range: modify min/max on the range input
 */

import { useState, useEffect } from 'react';
import { Account } from '../App';
import { Plus, Check } from 'lucide-react';
import { calculateAccountValue } from '../utils/calculations';

interface AccountFormProps {
  onSubmit: (account: Omit<Account, 'id'>) => void;
  initialData?: Omit<Account, 'id'>;
  submitLabel?: string;
  /** All existing accounts for auto-populating amount */
  existingAccounts?: Account[];
}

export function AccountForm({ onSubmit, initialData, submitLabel = 'Add Account', existingAccounts = [] }: AccountFormProps) {
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>(initialData?.transactionType || 'deposit');
  const [name, setName] = useState(initialData?.name || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [expectedReturn, setExpectedReturn] = useState(initialData?.expectedReturn?.toString() || '7');
  const [volatility, setVolatility] = useState(initialData?.volatility || '');
  const [timeHorizon, setTimeHorizon] = useState(initialData?.timeHorizon || 10);
  const [frequency, setFrequency] = useState<'monthly' | 'annual'>(initialData?.frequency || 'annual');
  const [transactionAmount, setTransactionAmount] = useState(initialData?.transactionAmount?.toString() || '');

  // Auto-populate amount from existing account with same name (at specified date)
  // Works for both deposits and drawdowns - calculates projected value at selected date
  useEffect(() => {
    if (name && date) {
      // Find all accounts with the same name (case-insensitive)
      const matchingAccounts = existingAccounts.filter(
        acc => acc.name.toLowerCase() === name.toLowerCase()
      );
      
      if (matchingAccounts.length > 0) {
        const selectedDate = new Date(date);
        let totalValue = 0;
        
        // Sum values from all matching accounts at the selected date
        matchingAccounts.forEach(acc => {
          const accountStartDate = new Date(acc.date);
          const yearsDiff = (selectedDate.getTime() - accountStartDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
          
          // Only include if the selected date is at or after account start
          if (yearsDiff >= 0) {
            const projectedValue = calculateAccountValue(acc, yearsDiff);
            totalValue += projectedValue;
          }
        });
        
        // Set the amount to the total projected value
        if (totalValue > 0) {
          setAmount(Math.round(totalValue).toString());
        }
      }
    }
  }, [name, date, existingAccounts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For drawdowns, amount is not required
    if (!name || (transactionType === 'deposit' && !amount)) return;

    onSubmit({
      name,
      // For drawdowns, set amount to 0 since it's not relevant
      amount: transactionType === 'withdraw' ? 0 : parseFloat(amount),
      date,
      expectedReturn: parseFloat(expectedReturn),
      volatility: volatility || undefined,
      timeHorizon,
      frequency,
      transactionType,
      // Always store a positive transaction amount; sign is implied by transactionType
      transactionAmount: Math.abs(parseFloat(transactionAmount) || 0),
    });

    // Reset form if adding new account
    if (submitLabel === 'Add Account') {
      setName('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setExpectedReturn('7');
      setVolatility('');
      setTimeHorizon(10);
      setFrequency('annual');
      setTransactionType('deposit');
      setTransactionAmount('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Transaction Type Toggle - First element */}
      <div className="transaction-type-toggle-container">
        <label className="block text-sm text-gray-700 mb-2">Type</label>
        <div className="transaction-type-toggle">
          <button
            type="button"
            className={`toggle-option deposit ${transactionType === 'deposit' ? 'active' : ''}`}
            onClick={() => setTransactionType('deposit')}
          >
            {transactionType === 'deposit' && <Check size={14} />}
            Deposit
          </button>
          <button
            type="button"
            className={`toggle-option withdraw ${transactionType === 'withdraw' ? 'active' : ''}`}
            onClick={() => setTransactionType('withdraw')}
          >
            {transactionType === 'withdraw' && <Check size={14} />}
            Drawdown
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-1">Account Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Retirement 401k"
          required
        />
      </div>

      {/* Current Amount - Only shown for deposits */}
      {transactionType === 'deposit' && (
        <div>
          <label className="block text-sm text-gray-700 mb-1">Current Amount ($)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="10000"
            step="0.01"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-700 mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-1">Expected Return (%)</label>
        <input
          type="number"
          value={expectedReturn}
          onChange={(e) => setExpectedReturn(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="7"
          step="0.1"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-1">Volatility (Optional)</label>
        <select
          value={volatility}
          onChange={(e) => setVolatility(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">None</option>
          <option value="low">Low (5%)</option>
          <option value="medium">Medium (15%)</option>
          <option value="high">High (25%)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Time Horizon: {timeHorizon} years
        </label>
        <input
          type="range"
          min="1"
          max="50"
          value={timeHorizon}
          onChange={(e) => setTimeHorizon(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm text-gray-700 mb-1">Transaction Frequency</label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as 'monthly' | 'annual')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
        >
          <option value="monthly">Monthly</option>
          <option value="annual">Annual</option>
        </select>

        <label className="block text-sm text-gray-700 mb-1">
          {transactionType === 'deposit' ? 'Deposit' : 'Drawdown'} Amount ($)
        </label>
        <input
          type="number"
          value={transactionAmount}
          onChange={(e) => setTransactionAmount(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="1000"
          step="0.01"
        />
      </div>

      <button
        type="submit"
        className="w-full btn-primary flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        {submitLabel}
      </button>
    </form>
  );
}
