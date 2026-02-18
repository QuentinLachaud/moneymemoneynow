/**
 * TicketEditor — Inline editor for account cards in bottom strip
 *
 * DISPLAYS:
 * - Compact form for editing account details
 * - Save/Cancel buttons
 *
 * PROPS:
 * - account: Account being edited
 * - onSave: Callback with updated account data (without id)
 * - onCancel: Callback to close editor without saving
 *
 * CUSTOMIZATION:
 * - To add fields: add input element and update form state
 * - To change layout: modify the flex containers
 * - To add validation: add checks before calling onSave
 */

import { useState } from 'react';
import { Account } from '../App';
import { TextInput, NumberInput, Button } from '@quentinlachaud/app-component-library';

interface Props {
  account: Account;
  onSave: (data: Omit<Account, 'id'>) => void;
  onCancel: () => void;
}

export default function TicketEditor({ account, onSave, onCancel }: Props) {
  // Form state initialized from existing account data
  const [form, setForm] = useState<Omit<Account, 'id'>>({
    name: account.name || '',
    amount: account.amount || 0,
    date: account.date || new Date().toISOString().slice(0, 10),
    expectedReturn: account.expectedReturn || 0.05,
    timeHorizon: account.timeHorizon || 10,
    frequency: account.frequency || 'annual',
    transactionType: account.transactionType || 'deposit',
    transactionAmount: account.transactionAmount || 0,
    annualIncreaseRate: account.annualIncreaseRate || 0,
  });

  /** Update a single form field */
  const update = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col gap-2">
      <TextInput
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
        placeholder="Name"
        size="sm"
        fullWidth
      />
      <div className="flex gap-2">
        <NumberInput
          value={form.amount}
          onChange={(v) => update('amount', v ?? 0)}
          placeholder="Amount"
          size="sm"
          hideControls
          fullWidth
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => update('date', e.target.value)}
          className="bg-bg-surface border border-border-subtle rounded-md px-3 py-1.5 text-xs text-text-primary"
        />
      </div>
      <div className="flex gap-2">
        {/* Select kept as raw — gap component needed */}
        <select
          value={form.transactionType}
          onChange={(e) => update('transactionType', e.target.value as 'deposit' | 'withdraw')}
          className="bg-bg-surface border border-border-subtle rounded-md px-3 py-1.5 text-xs text-text-primary"
        >
          <option value="deposit">Deposit</option>
          <option value="withdraw">Withdraw</option>
        </select>
        <NumberInput
          value={form.transactionAmount}
          onChange={(v) => update('transactionAmount', v ?? 0)}
          placeholder="Tx amount"
          size="sm"
          hideControls
          fullWidth
        />
      </div>
      <div className="flex gap-2">
        <NumberInput
          value={form.timeHorizon}
          onChange={(v) => update('timeHorizon', v ?? 10)}
          placeholder="Years"
          size="sm"
          hideControls
          fullWidth
        />
        <NumberInput
          value={form.expectedReturn}
          onChange={(v) => update('expectedReturn', v ?? 0)}
          step={0.01}
          placeholder="Return"
          size="sm"
          hideControls
          fullWidth
        />
        <NumberInput
          value={form.annualIncreaseRate}
          onChange={(v) => update('annualIncreaseRate', v ?? 0)}
          step={0.01}
          placeholder="Annual Increase %"
          size="sm"
          hideControls
          fullWidth
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={() => onSave(form)}>Save</Button>
      </div>
    </div>
  );
}
