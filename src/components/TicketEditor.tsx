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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Name" />
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="number" value={form.amount} onChange={e => update('amount', Number(e.target.value))} placeholder="Amount" />
        <input type="date" value={form.date} onChange={e => update('date', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={form.transactionType} onChange={e => update('transactionType', e.target.value as any)}>
          <option value="deposit">Deposit</option>
          <option value="withdraw">Withdraw</option>
        </select>
        <input type="number" value={form.transactionAmount} onChange={e => update('transactionAmount', Number(e.target.value))} placeholder="Tx amount" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="number" value={form.timeHorizon} onChange={e => update('timeHorizon', Number(e.target.value))} placeholder="Years" />
        <input type="number" value={form.expectedReturn} onChange={e => update('expectedReturn', Number(e.target.value))} step="0.01" placeholder="Return" />
        <input type="number" value={form.annualIncreaseRate} onChange={e => update('annualIncreaseRate', Number(e.target.value))} step="0.01" placeholder="Annual Increase %" />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} className="btn">Cancel</button>
        <button onClick={() => onSave(form)} className="btn-primary">Save</button>
      </div>
    </div>
  );
}
