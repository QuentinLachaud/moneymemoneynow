/**
 * App.tsx — Main application component
 *
 * LAYOUT STRUCTURE:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Header: Title + Tab buttons (Assets | Projections)            │
 * ├──────────┬──────────────────────────────────────────────────────┤
 * │          │  Three-column main area (.content-columns)          │
 * │  Left    │  ┌────────────┬────────────┬────────────┐           │
 * │  Tray    │  │ Composition│ Projection │ Right      │           │
 * │  (Add    │  │ Chart      │ Chart      │ Placeholder│           │
 * │  Account)│  └────────────┴────────────┴────────────┘           │
 * ├──────────┴──────────────────────────────────────────────────────┤
 * │  Bottom Accounts Strip (horizontal scrollable list)            │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * KEY CUSTOMIZATION POINTS:
 * - To add new tabs: add to `tab` state type and create conditional content
 * - To change left tray width: update --left-tray-width in globals.css
 * - To add a 4th column: add another .column-item in .content-columns
 * - To change header height: update --header-height in globals.css
 */

import { useState, useRef, useLayoutEffect } from 'react';
import { getLocaleCurrency } from './utils/format';
import { AccountForm } from './components/AccountForm';
import { ProjectionChart } from './components/ProjectionChart';
import { CompositionChart } from './components/CompositionChart';
import { getColorForId } from './utils/colors';
import Sparkline from './components/Sparkline';
import TicketEditor from './components/TicketEditor';

/**
 * Account — represents a single financial account/asset.
 * Used throughout the app for projections, charts, and the accounts list.
 *
 * @property id              - Unique identifier (timestamp-based)
 * @property name            - Display name (e.g., "Retirement 401k")
 * @property amount          - Current balance in dollars
 * @property date            - Start date (ISO string, e.g., "2025-01-01")
 * @property expectedReturn  - Annual return percentage (e.g., 7 for 7%)
 * @property volatility      - Optional: "low" | "medium" | "high"
 * @property timeHorizon     - Investment period in years
 * @property frequency       - How often transactions occur
 * @property transactionType - Whether recurring transaction is deposit or withdraw
 * @property transactionAmount - Dollar amount of recurring transaction (always positive)
 */
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
  /* ─── STATE ─────────────────────────────────────────────────────── */

  /** All accounts in the portfolio */
  const [accounts, setAccounts] = useState<Account[]>([]);

  /** Selected account IDs for filtering projections (empty = show all) */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /** Ref to left tray for positioning calculations */
  const leftTrayRef = useRef<HTMLDivElement | null>(null);

  /** Dynamic left offset for bottom strip (avoids overlapping left tray) */
  const [bottomLeft, setBottomLeft] = useState<number | null>(null);

  /**
   * LAYOUT EFFECT: Calculate bottom strip position
   * Runs on mount and window resize to keep bottom strip aligned with left tray
   */
  useLayoutEffect(() => {
    function update() {
      // On narrow screens, let CSS handle full-width layout
      if (window.innerWidth <= 900) {
        setBottomLeft(16);
        return;
      }
      const el = leftTrayRef.current;
      if (!el) {
        setBottomLeft(16 + 360); // fallback: tray width + padding
        return;
      }
      const rect = el.getBoundingClientRect();
      setBottomLeft(Math.max(16, Math.ceil(rect.right + 12)));
    }

    update();
    window.addEventListener('resize', update);

    // Also update when tray DOM changes (e.g., form expands)
    const obs = new MutationObserver(update);
    if (leftTrayRef.current) {
      obs.observe(leftTrayRef.current, { attributes: true, childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('resize', update);
      obs.disconnect();
    };
  }, []);

  /* ─── ACCOUNT CRUD ──────────────────────────────────────────────── */

  /** Add a new account and auto-select it for projections */
  const addAccount = (account: Omit<Account, 'id'>) => {
    const id = Date.now().toString();
    const newAccount = { ...account, id } as Account;
    setAccounts((prev) => [...prev, newAccount]);
    setSelectedIds((prev) => new Set(prev).add(id));
  };

  /** ID of account being edited in left tray (null = adding new) */
  const [editingId, setEditingId] = useState<string | null>(null);

  /** ID of account being edited inline in bottom strip */
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);

  /** Start editing an account in the left tray form */
  const startEdit = (id: string) => {
    setEditingId(id);
    leftTrayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  /** Start inline editing in bottom strip */
  const startInlineEdit = (id: string) => setInlineEditingId(id);

  /** Cancel inline editing */
  const cancelInlineEdit = () => setInlineEditingId(null);

  /** Save inline edit and close editor */
  const saveInlineEdit = (id: string, data: Omit<Account, 'id'>) => {
    updateAccount(id, data);
    setInlineEditingId(null);
  };

  /** Cancel left tray editing */
  const cancelEdit = () => setEditingId(null);

  /** Update an existing account by ID */
  const updateAccount = (id: string, account: Omit<Account, 'id'>) => {
    setAccounts((prev) => prev.map((acc) => (acc.id === id ? { ...account, id } : acc)));
  };

  /** Delete an account and remove from selection */
  const deleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  /** Current tab: 'assets' shows composition; 'projections' shows data table */
  const [tab, setTab] = useState<'assets' | 'projections'>('assets');

  /** Accounts to show in projections (all if none selected) */
  const filteredAccounts = selectedIds.size === 0
    ? accounts
    : accounts.filter((acc) => selectedIds.has(acc.id));

  /* ─── RENDER ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* ─── HEADER: Title + Tab Navigation ─────────────────────────── */}
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-4 text-gray-900">Finance Portfolio Tracker</h1>

        {/* Tab buttons - add more tabs by extending the tab state type */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setTab('assets')}
            className={`px-4 py-2 rounded-md ${tab === 'assets' ? 'btn-primary' : 'bg-transparent text-muted border border-transparent'}`}
          >
            Assets
          </button>
          <button
            onClick={() => setTab('projections')}
            className={`px-4 py-2 rounded-md ${tab === 'projections' ? 'btn-primary' : 'bg-transparent text-muted border border-transparent'}`}
          >
            Projections
          </button>
        </div>
      </div>

      {/* ─── LEFT TRAY: Add/Edit Account Form ───────────────────────── */}
      {/* Fixed position, visible on all tabs. Width: --left-tray-width */}
      <aside className="left-tray" ref={(el) => { leftTrayRef.current = el as HTMLDivElement | null; }}>
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
            initialData={editingId ? accounts.find((a) => a.id === editingId) : undefined}
            submitLabel={editingId ? 'Update Account' : 'Add Account'}
          />
        </div>
      </aside>

      {/* ─── MAIN CONTENT: Three-column layout ──────────────────────── */}
      {/* To add columns: add .column-item divs. To resize: adjust flex in CSS */}
      <main className="main-layout">
        <div className="content-columns">
          {/* Column 1: Current Holdings Composition */}
          <div className="column-item card composition-panel">
            <h2 className="mb-4 text-gray-900">Current Net Worth Composition</h2>
            <div style={{ flex: 1, minHeight: 0 }}>
              <CompositionChart accounts={tab === 'assets' ? accounts : filteredAccounts} />
            </div>
          </div>

          {/* Column 2: Future Value Projection */}
          <div className="column-item card projection-panel">
            <h2 className="mb-4 text-gray-900">Net Worth Projection</h2>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ProjectionChart accounts={tab === 'assets' ? accounts : filteredAccounts} />
            </div>
          </div>

          {/* Column 3: Reserved for future component */}
          <div className="column-item card right-placeholder">
            {/* Add your component here */}
          </div>
        </div>
      </main>
      {/* ─── BOTTOM STRIP: Account cards ─────────────────────────────── */}
      {/* Horizontal scrollable list of account cards with inline editing */}
      <div
        className="bottom-accounts"
        role="region"
        aria-label="Selected accounts"
        style={bottomLeft != null ? { left: `${bottomLeft}px` } : undefined}
      >
        {accounts.length > 0 ? (
          (selectedIds.size === 0 ? accounts : accounts.filter((a) => selectedIds.has(a.id))).map((acct) => {
            const startYear = new Date(acct.date).getFullYear();
            const duration = `${acct.timeHorizon}y`;
            const sign = acct.transactionType === 'withdraw' ? '-' : '+';
            const color = getColorForId(acct.id);
            const formattedAmt = acct.transactionAmount?.toLocaleString(undefined, {
              style: 'currency',
              currency: getLocaleCurrency().currency,
            }) || '$0';

            return (
              <div className="acct" key={acct.id}>
                {/* Card header: color dot, name, sparkline, actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} aria-hidden />
                    <div style={{ fontWeight: 600 }}>{acct.name}</div>
                    <div style={{ marginLeft: 8 }}>
                      <Sparkline account={acct} years={Math.min(acct.timeHorizon, 10)} color={color} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => startInlineEdit(acct.id)} className="btn" title="Edit">Edit</button>
                    <button onClick={() => deleteAccount(acct.id)} className="btn" title="Delete">Delete</button>
                  </div>
                </div>

                {/* Card body: date and duration */}
                <div style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginTop: 6 }}>
                  {startYear} · {duration}
                </div>

                {/* Card footer: transaction amount */}
                <div style={{ marginTop: 8, fontWeight: 700 }}>
                  <span style={{ color: acct.transactionType === 'withdraw' ? '#ef4444' : '#10b981', marginRight: 8 }}>{sign}</span>
                  <span style={{ color: acct.transactionType === 'withdraw' ? '#ef4444' : '#10b981' }}>{formattedAmt}</span>
                </div>

                {/* Inline editor (shown when editing this account) */}
                {inlineEditingId === acct.id && (
                  <div style={{ marginTop: 8 }}>
                    <TicketEditor
                      account={acct}
                      onSave={(data) => saveInlineEdit(acct.id, data)}
                      onCancel={cancelInlineEdit}
                    />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Empty state */
          <div className="acct" style={{ minWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>No accounts yet</div>
            <div style={{ color: 'var(--muted-foreground)' }}>Add accounts to see them here and in projections.</div>
          </div>
        )}
      </div>
    </div>
  );
}
