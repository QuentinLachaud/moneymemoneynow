import React, { useState } from 'react';

type AccountShape = {
  id: string;
  name: string;
  amount: number;
  date: string;
  expectedReturn: number;
  timeHorizon: number;
  frequency?: 'monthly' | 'annual';
  transactionType: 'deposit' | 'withdraw';
  transactionAmount: number;
};

type Props = {
  account: AccountShape;
  onSave: (data: Omit<AccountShape, 'id'>) => void;
  onCancel: () => void;
};

export default function TicketEditor({ account, onSave, onCancel }: Props) {
  const [form, setForm] = useState<Omit<AccountShape, 'id'>>({
    name: account.name || '',
    amount: account.amount || 0,
    date: account.date || new Date().toISOString().slice(0, 10),
    expectedReturn: account.expectedReturn || 0.05,
    timeHorizon: account.timeHorizon || 10,
    frequency: account.frequency || 'annual',
    transactionType: account.transactionType || 'deposit',
    transactionAmount: account.transactionAmount || 0,
  });

  const update = (k: keyof typeof form, v: any) => setForm(prev => ({ ...prev, [k]: v }));

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
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} className="btn">Cancel</button>
        <button onClick={() => onSave(form)} className="btn-primary">Save</button>
      </div>
    </div>
  );
}
