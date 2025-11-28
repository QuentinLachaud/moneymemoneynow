import { useState, useRef, useLayoutEffect } from 'react';
import { setLocaleCurrency, getLocaleCurrency } from './utils/format';
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
                <AccountForm onSubmit={addAccount} />
              </div>
            </aside>

            {/* Main content shifted right to make room for the fixed tray */}
            <div style={{ marginLeft: '392px' }}>
              <div className="flex gap-6 mb-6">
                {/* Accounts list panel sits immediately to the right of the add-account tray */}
                <div style={{ width: '360px' }}>
                  <div className="bg-white rounded-lg shadow-sm p-6 h-full overflow-auto">
                    <h3 className="mb-4 text-gray-900">Accounts</h3>
                    <AccountsList
                      accounts={accounts}
                      onUpdate={updateAccount}
                      onDelete={deleteAccount}
                    />
                  </div>
                </div>

                {/* Charts and projections take remaining space */}
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
          <div className="flex gap-6">
            {/* Left sidebar: account toggles */}
            <aside className="proj-sidebar w-56">
              <div className="p-3">
                <h3 className="mb-3 text-gray-900">Accounts</h3>
                <div className="flex flex-col gap-2">
                  {accounts.length === 0 && (
                    <div className="text-sm text-gray-500">No accounts</div>
                  )}
                  {accounts.map(acc => {
                    const on = selectedIds.size === 0 ? true : selectedIds.has(acc.id);
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setSelectedIds(prev => {
                          const s = new Set(prev);
                          // if size 0 (implicit all selected), initialize with all ids
                          if (prev.size === 0) {
                            accounts.forEach(a => s.add(a.id));
                          }
                          if (s.has(acc.id)) s.delete(acc.id); else s.add(acc.id);
                          return s;
                        })}
                        className={`account-toggle ${on ? 'on' : 'off'}`}
                        aria-pressed={on}
                      >
                        <div className="truncate text-sm">{acc.name}</div>
                        <div className="text-xs text-muted">${Math.abs(acc.amount).toLocaleString()}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <main className="flex-1 space-y-6">
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
          </div>
        )}
      </div>
      {/* Bottom selected-accounts strip. Shows selected accounts horizontally and avoids overlapping left-tray */}
      <div className="bottom-accounts" role="region" aria-label="Selected accounts" style={bottomLeft != null ? { left: `${bottomLeft}px` } : undefined}>
        {accounts && accounts.length > 0 ? (
          Array.from(selectedIds).map(id => {
            const acct = accounts.find(a => a.id === id);
            if (!acct) return null;
            return (
              <div className="acct" key={acct.id}>
                <div style={{ fontWeight: 600 }}>{acct.name}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>{acct.date}</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>{acct.transactionType === 'withdraw' ? '-' : ''}{acct.amount.toLocaleString(undefined, { style: 'currency', currency: getLocaleCurrency().currency })}</div>
              </div>
            );
          })
        ) : null}
      </div>
    </div>
  );
}
