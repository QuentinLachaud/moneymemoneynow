import { useState, useRef, useLayoutEffect } from 'react';
import { setLocaleCurrency, getLocaleCurrency } from './utils/format';
import { AccountForm } from './components/AccountForm';
import { DataTable } from './components/DataTable';
import { ProjectionChart } from './components/ProjectionChart';
import { CompositionChart } from './components/CompositionChart';
import { ResizablePanel } from './components/ResizablePanel';
import { getColorForId } from './utils/colors';
import Sparkline from './components/Sparkline';
import TicketEditor from './components/TicketEditor';

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const leftTrayRef = useRef(null as HTMLDivElement | null);
  const [bottomLeft, setBottomLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    function update() {
      // On narrow screens let CSS handle full-width layout
      if (window.innerWidth <= 900) {
        setBottomLeft(16);
        return;
      }
      const el = leftTrayRef.current;
      if (!el) {
        setBottomLeft(16 + 360);
        return;
      }
      const rect = el.getBoundingClientRect();
      const left = Math.max(16, Math.ceil(rect.right + 12));
      setBottomLeft(left);
    }

    update();
    window.addEventListener('resize', update);
    const obs = new MutationObserver(update);
    if (leftTrayRef.current) obs.observe(leftTrayRef.current, { attributes: true, childList: true, subtree: true });
    return () => {
      window.removeEventListener('resize', update);
      obs.disconnect();
    };
  }, []);

  const addAccount = (account: Omit<Account, 'id'>) => {
    const id = Date.now().toString();
    const next = { ...account, id } as Account;
    setAccounts(prev => [...prev, next]);
    // ensure newly added account is selected for projections
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.add(id);
      return s;
    });
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);

  const startEdit = (id: string) => {
    setEditingId(id);
    // bring left tray into view on small screens
    const el = leftTrayRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const startInlineEdit = (id: string) => {
    setInlineEditingId(id);
  };

  const cancelInlineEdit = () => setInlineEditingId(null);

  const saveInlineEdit = (id: string, data: Omit<Account, 'id'>) => {
    updateAccount(id, data);
    setInlineEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const openAddTray = () => {
    setEditingId(null);
    const el = leftTrayRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const updateAccount = (id: string, account: Omit<Account, 'id'>) => {
    setAccounts(accounts.map(acc => acc.id === id ? { ...account, id } : acc));
  };

  const deleteAccount = (id: string) => {
    setAccounts(accounts.filter(acc => acc.id !== id));
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  };

  const [tab, setTab] = useState<'assets' | 'projections'>('assets');

  // Filtered accounts for projections: if nothing explicitly selected, treat all as selected
  const filteredAccounts = selectedIds.size === 0 ? accounts : accounts.filter(acc => selectedIds.has(acc.id));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-4 text-gray-900">Finance Portfolio Tracker</h1>

        {/* Tabs */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setTab('assets')}
            className={`px-4 py-2 rounded-md ${tab === 'assets' ? 'btn-primary' : 'bg-transparent text-muted border border-transparent'}`}>
            Assets
          </button>
          <button
            onClick={() => setTab('projections')}
            className={`px-4 py-2 rounded-md ${tab === 'projections' ? 'btn-primary' : 'bg-transparent text-muted border border-transparent'}`}>
            Projections
          </button>
        </div>

        {tab === 'assets' ? (
          <div className="relative">
            {/* Fixed left tray containing the Add Account box */}
            <aside className="left-tray" ref={el => (leftTrayRef.current = el as HTMLDivElement)}>
              <div className="bg-white rounded-lg shadow-sm p-6 h-full overflow-auto">
                <h2 className="mb-4 text-gray-900">Add Account</h2>
                <AccountForm
                  onSubmit={(data) => {
                    if (editingId) {
                      updateAccount(editingId, data);
                      cancelEdit();
                    } else {
                      addAccount(data);
                    }
                  }}
                  initialData={editingId ? accounts.find(a => a.id === editingId) : undefined}
                  submitLabel={editingId ? 'Update Account' : 'Add Account'}
                />
              </div>
            </aside>

            {/* Main content shifted right to make room for the fixed tray */}
            <div style={{ marginLeft: '392px' }}>
              <div className="flex gap-6 mb-6">
                {/* Charts and projections take full remaining space */}
                <div className="flex-1 flex flex-col gap-6">
                  <ResizablePanel defaultHeight={300} minHeight={200} direction="vertical">
                    <div className="bg-white rounded-lg shadow-sm p-6 h-full">
                      <h2 className="mb-4 text-gray-900">Current Net Worth Composition</h2>
                      <CompositionChart accounts={accounts} />
                    </div>
                  </ResizablePanel>

                  <ResizablePanel defaultHeight={300} minHeight={200} direction="vertical">
                    <div className="bg-white rounded-lg shadow-sm p-6 h-full">
                      <h2 className="mb-4 text-gray-900">Net Worth Projection</h2>
                      <ProjectionChart accounts={accounts} />
                    </div>
                  </ResizablePanel>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <main className="space-y-6">
              <ResizablePanel defaultHeight={360} minHeight={200} direction="vertical">
                <div className="bg-white rounded-lg shadow-sm p-6 h-full">
                  <h2 className="mb-4 text-gray-900">Net Worth Projection</h2>
                  <ProjectionChart accounts={filteredAccounts} />
                </div>
              </ResizablePanel>

              <ResizablePanel defaultHeight={420} minHeight={200} direction="vertical">
                <div className="bg-white rounded-lg shadow-sm p-6 h-full overflow-auto">
                  <h2 className="mb-4 text-gray-900">Projection Data Table</h2>
                  <DataTable accounts={filteredAccounts} />
                </div>
              </ResizablePanel>
            </main>
        )}
      </div>
      {/* Bottom selected-accounts strip. Shows selected accounts horizontally and avoids overlapping left-tray */}
      <div className="bottom-accounts" role="region" aria-label="Selected accounts" style={bottomLeft != null ? { left: `${bottomLeft}px` } : undefined}>
        {accounts && accounts.length > 0 ? (
          (selectedIds.size === 0 ? accounts : accounts.filter(a => selectedIds.has(a.id))).map(acct => {
            const startYear = new Date(acct.date).getFullYear();
            const duration = `${acct.timeHorizon}y`;
            const sign = acct.transactionType === 'withdraw' ? '-' : '+';
            const color = getColorForId(acct.id);
            const formattedAmt = acct.transactionAmount?.toLocaleString(undefined, { style: 'currency', currency: getLocaleCurrency().currency }) || (0).toLocaleString(undefined, { style: 'currency', currency: getLocaleCurrency().currency });
            return (
              <div className="acct" key={acct.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} aria-hidden />
                    <div style={{ fontWeight: 600 }}>{acct.name}</div>
                    <div style={{ marginLeft: 8 }}><Sparkline account={acct} years={Math.min(acct.timeHorizon, 10)} color={color} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => startInlineEdit(acct.id)} className="btn" title="Edit">Edit</button>
                    <button onClick={() => deleteAccount(acct.id)} className="btn" title="Delete">Delete</button>
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginTop: 6 }}>{startYear} · {duration}</div>
                <div style={{ marginTop: 8, fontWeight: 700 }}> 
                  <span style={{ color: acct.transactionType === 'withdraw' ? '#ef4444' : '#10b981', marginRight: 8 }}>{sign}</span>
                  <span style={{ color: acct.transactionType === 'withdraw' ? '#ef4444' : '#10b981' }}>{formattedAmt}</span>
                </div>
                {inlineEditingId === acct.id ? (
                  <div style={{ marginTop: 8 }}>
                    <TicketEditor account={acct} onSave={(data) => saveInlineEdit(acct.id, data)} onCancel={cancelInlineEdit} />
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="acct" style={{ minWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>No accounts yet</div>
            <div style={{ color: 'var(--muted-foreground)' }}>Add accounts to see them here and in projections.</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={openAddTray} className="btn-primary">+ Add Account</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
