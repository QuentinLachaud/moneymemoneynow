/**
 * App.tsx — Main application component
 *
 * LAYOUT STRUCTURE (per wireframe):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Title                                                          │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Tab Toggle (glass-style slider)                                │
 * ├──────────┬──────────────────────────────────────────────────────┤
 * │          │  Graph 1: Net Worth Projection (full width)         │
 * │  Add     ├──────────────────────────────────────────────────────┤
 * │  Account │  Graph 2: Cash Flow (full width)                    │
 * │  Panel   ├──────────────────────────────────────────────────────┤
 * │          │  Accounts Strip (horizontal scrollable)             │
 * └──────────┴──────────────────────────────────────────────────────┘
 *
 * KEY CUSTOMIZATION POINTS:
 * - To add new tabs: add to `tab` state type and tab-toggle buttons
 * - To change left tray width: update --left-tray-width in globals.css
 * - To change spacing: update --page-gap in globals.css
 */

import { useState, useRef } from 'react';
import { getLocaleCurrency } from './utils/format';
import { AccountForm } from './components/AccountForm';
import { ProjectionChart, getProjectionData, getProjectionColumns } from './components/ProjectionChart';
import { CashFlowChart, getCashFlowData, getCashFlowColumns } from './components/CashFlowChart';
import { GraphPanel } from './components/GraphPanel';
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

  /** Ref to left panel for scroll-into-view */
  const leftTrayRef = useRef<HTMLDivElement | null>(null);

  /** Toggle between log and linear scale on projection chart */
  const [projectionLogScale, setProjectionLogScale] = useState(false);

  /* ─── ACCOUNT CRUD ───────────────────────────────────────────────── */

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
    <div className="app-container">
      {/* ─── HEADER: Title ──────────────────────────────────────────── */}
      <header className="app-header">
        <h1 className="app-title">Finance Portfolio Tracker</h1>
      </header>

      {/* ─── TAB TOGGLE: Glass-style slider ─────────────────────────── */}
      <div className="tab-container">
        <div className="tab-toggle">
          <div 
            className="tab-slider" 
            style={{ transform: tab === 'assets' ? 'translateX(0)' : 'translateX(100%)' }} 
          />
          <button
            onClick={() => setTab('assets')}
            className={`tab-button ${tab === 'assets' ? 'active' : ''}`}
          >
            Assets
          </button>
          <button
            onClick={() => setTab('projections')}
            className={`tab-button ${tab === 'projections' ? 'active' : ''}`}
          >
            Projections
          </button>
        </div>
      </div>

      {/* ─── MAIN LAYOUT: Left panel + Content area ─────────────────── */}
      <div className="main-grid">
        {/* Left Panel: Add Account Form (full height) */}
        <aside 
          className="left-panel card" 
          ref={(el) => { leftTrayRef.current = el as HTMLDivElement | null; }}
        >
          <h2 className="panel-title">{editingId ? 'Edit Account' : 'Add Account'}</h2>
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
          {editingId && (
            <button onClick={cancelEdit} className="btn cancel-btn">
              Cancel Edit
            </button>
          )}
        </aside>

        {/* Right Content: Graphs stacked vertically */}
        <div className="content-area">
          {/* Graph 1: Net Worth Projection with log/linear toggle */}
          <GraphPanel
            title="Net Worth Projection"
            data={getProjectionData(tab === 'assets' ? accounts : filteredAccounts)}
            columns={getProjectionColumns(tab === 'assets' ? accounts : filteredAccounts)}
            headerControls={
              <button
                className={`scale-toggle ${projectionLogScale ? 'active' : ''}`}
                onClick={() => setProjectionLogScale(!projectionLogScale)}
                title={projectionLogScale ? 'Switch to linear scale' : 'Switch to log scale'}
              >
                {projectionLogScale ? 'Log' : 'Linear'}
              </button>
            }
          >
            <ProjectionChart 
              accounts={tab === 'assets' ? accounts : filteredAccounts} 
              isLogScale={projectionLogScale}
            />
          </GraphPanel>

          {/* Graph 2: Cash Flow */}
          <GraphPanel
            title="Cash Flow"
            data={getCashFlowData(tab === 'assets' ? accounts : filteredAccounts)}
            columns={getCashFlowColumns(tab === 'assets' ? accounts : filteredAccounts)}
          >
            <CashFlowChart accounts={tab === 'assets' ? accounts : filteredAccounts} />
          </GraphPanel>

          {/* Accounts Strip */}
          <div className="accounts-strip card">
            {accounts.length > 0 ? (
              <div className="accounts-scroll">
                {(selectedIds.size === 0 ? accounts : accounts.filter((a) => selectedIds.has(a.id))).map((acct) => {
                  const startYear = new Date(acct.date).getFullYear();
                  const duration = `${acct.timeHorizon}y`;
                  const sign = acct.transactionType === 'withdraw' ? '-' : '+';
                  const color = getColorForId(acct.id);
                  const formattedAmt = acct.transactionAmount?.toLocaleString(undefined, {
                    style: 'currency',
                    currency: getLocaleCurrency().currency,
                  }) || '£0';

                  return (
                    <div className="account-card" key={acct.id}>
                      {inlineEditingId === acct.id ? (
                        <TicketEditor
                          account={acct}
                          onSave={(data) => saveInlineEdit(acct.id, data)}
                          onCancel={cancelInlineEdit}
                        />
                      ) : (
                        <>
                          {/* Card header */}
                          <div className="account-card-header">
                            <div className="account-card-title">
                              <div 
                                className="account-dot" 
                                style={{ background: color }} 
                              />
                              <span className="account-name">{acct.name}</span>
                            </div>
                            <Sparkline account={acct} years={Math.min(acct.timeHorizon, 10)} color={color} />
                          </div>

                          {/* Card body */}
                          <div className="account-card-meta">
                            {startYear} · {duration} · {acct.frequency}
                          </div>

                          {/* Card amount */}
                          <div className={`account-card-amount ${acct.transactionType}`}>
                            <span>{sign}{formattedAmt}</span>
                            <span className="per-period">/{acct.frequency === 'monthly' ? 'mo' : 'yr'}</span>
                          </div>

                          {/* Card actions */}
                          <div className="account-card-actions">
                            <button onClick={() => startInlineEdit(acct.id)} className="btn-sm">Edit</button>
                            <button onClick={() => deleteAccount(acct.id)} className="btn-sm btn-danger">Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-title">No accounts yet</span>
                <span className="empty-desc">Add accounts to see them here and in projections.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
