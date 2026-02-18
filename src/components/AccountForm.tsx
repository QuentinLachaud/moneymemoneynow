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
import { TextInput, NumberInput, Slider, SegmentedToggle, Button } from '@quentinlachaud/app-component-library';

interface AccountFormProps {
  onSubmit: (account: Omit<Account, 'id'>) => void;
  initialData?: Omit<Account, 'id'>;
  submitLabel?: string;
  /** All existing accounts for auto-populating amount */
  existingAccounts?: Account[];
  /** Default transaction type when adding new (used when clicked from deposit/drawdown section) */
  defaultTransactionType?: 'deposit' | 'withdraw';
}

export function AccountForm({ 
  onSubmit, 
  initialData, 
  submitLabel = 'Add Account', 
  existingAccounts = [],
  defaultTransactionType = 'deposit',
}: AccountFormProps) {
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>(initialData?.transactionType || defaultTransactionType);
  const [name, setName] = useState(initialData?.name || '');
  // Default starting value to 0 for drawdowns
  const [amount, setAmount] = useState(initialData?.amount?.toString() || (defaultTransactionType === 'withdraw' ? '0' : ''));
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [expectedReturn, setExpectedReturn] = useState(initialData?.expectedReturn?.toString() || '7');
  const [volatility, setVolatility] = useState(initialData?.volatility || '');
  const [timeHorizon, setTimeHorizon] = useState(initialData?.timeHorizon || 10);
  const [frequency, setFrequency] = useState<'monthly' | 'annual'>(initialData?.frequency || 'annual');
  const [transactionAmount, setTransactionAmount] = useState(initialData?.transactionAmount?.toString() || '');
  const [annualIncreaseRate, setAnnualIncreaseRate] = useState(initialData?.annualIncreaseRate?.toString() || '0');

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
    // Amount is required for both types now
    if (!name || !amount) return;

    onSubmit({
      name,
      // Use amount for both deposit and drawdown types
      amount: parseFloat(amount) || 0,
      date,
      expectedReturn: parseFloat(expectedReturn),
      volatility: volatility || undefined,
      timeHorizon,
      frequency,
      transactionType,
      // Always store a positive transaction amount; sign is implied by transactionType
      transactionAmount: Math.abs(parseFloat(transactionAmount) || 0),
      annualIncreaseRate: parseFloat(annualIncreaseRate) || 0,
    });

    // Reset form if adding new cash flow
    if (submitLabel === 'Add Cash Flow') {
      setName('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setExpectedReturn('7');
      setVolatility('');
      setTimeHorizon(10);
      setFrequency('annual');
      setTransactionType('deposit');
      setTransactionAmount('');
      setAnnualIncreaseRate('0');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Transaction Type Toggle - First element */}
      <div>
        <label className="block text-sm text-text-secondary mb-2">Type</label>
        <SegmentedToggle
          options={[
            { value: 'deposit', label: 'Deposit' },
            { value: 'withdraw', label: 'Drawdown' },
          ]}
          value={transactionType}
          onChange={(v) => setTransactionType(v as 'deposit' | 'withdraw')}
          size="sm"
          fullWidth
        />
      </div>

      <TextInput
        label="Asset Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., ISA, Pension"
        required
        fullWidth
      />

      {/* Current Amount - Shown for both types */}
      <NumberInput
        label={transactionType === 'deposit' ? 'Current Amount ($)' : 'Starting Value ($)'}
        value={amount === '' ? undefined : parseFloat(amount)}
        onChange={(v) => setAmount(v !== undefined ? v.toString() : '')}
        placeholder={transactionType === 'deposit' ? '10000' : 'Auto-populated from existing asset'}
        step={0.01}
        hideControls
        fullWidth
      />

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary"
        />
      </div>

      {/* Expected Return - only shown for deposits */}
      {transactionType === 'deposit' && (
        <NumberInput
          label="Expected Return (%)"
          value={expectedReturn === '' ? undefined : parseFloat(expectedReturn)}
          onChange={(v) => setExpectedReturn(v !== undefined ? v.toString() : '')}
          placeholder="7"
          step={0.1}
          hideControls
          fullWidth
        />
      )}

      {/* Volatility - only shown for deposits */}
      {transactionType === 'deposit' && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Volatility (Optional)</label>
          <select
            value={volatility}
            onChange={(e) => setVolatility(e.target.value)}
            className="w-full bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary"
          >
            <option value="">None</option>
            <option value="low">Low (5%)</option>
            <option value="medium">Medium (15%)</option>
            <option value="high">High (25%)</option>
          </select>
        </div>
      )}

      <Slider
        label="Time Horizon"
        value={timeHorizon}
        min={1}
        max={50}
        step={1}
        onChange={(v) => setTimeHorizon(v)}
        formatValue={(v) => `${v} years`}
      />

      <div className="border-t border-border-subtle pt-4">
        <label className="block text-sm font-medium text-text-secondary mb-2">Transaction Frequency</label>
        <SegmentedToggle
          options={[
            { value: 'annual', label: 'Annual' },
            { value: 'monthly', label: 'Monthly' },
          ]}
          value={frequency}
          onChange={(v) => setFrequency(v as 'monthly' | 'annual')}
          size="sm"
          fullWidth
        />

        <div className="mt-4">
          <NumberInput
            label={`${transactionType === 'deposit' ? 'Deposit' : 'Drawdown'} Amount ($)`}
            value={transactionAmount === '' ? undefined : parseFloat(transactionAmount)}
            onChange={(v) => setTransactionAmount(v !== undefined ? v.toString() : '')}
            placeholder="1000"
            step={0.01}
            hideControls
            fullWidth
          />
        </div>
        
        <label className="block text-sm font-medium text-text-secondary mb-2 mt-4">
          Annual Increase
        </label>
        <SegmentedToggle
          options={[0, 1, 2, 3, 5].map((rate) => ({
            value: rate.toString(),
            label: `${rate}%`,
          }))}
          value={(parseFloat(annualIncreaseRate) || 0).toString()}
          onChange={(v) => setAnnualIncreaseRate(v)}
          size="sm"
          fullWidth
        />
        <span className="text-xs text-text-muted mt-1 block">
          Increase {transactionType === 'deposit' ? 'contributions' : 'withdrawals'} by this % each year
        </span>
      </div>

      <Button
        type="submit"
        variant="primary"
        leftIcon={<Plus size={20} />}
        fullWidth
      >
        {submitLabel}
      </Button>
    </form>
  );
}
