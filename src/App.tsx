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
 * STATE MANAGEMENT:
 * - Core state (accounts, selections) persisted via Zustand + localStorage
 * - UI state (modals, editing) remains local to component
 *
 * KEY CUSTOMIZATION POINTS:
 * - To add new tabs: add to `tab` state type and tab-toggle buttons
 * - To change left tray width: update --left-tray-width in globals.css
 * - To change spacing: update --page-gap in globals.css
 */

import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AccountForm } from './components/AccountForm';
import { ProjectionsPanelV2 } from './components/ProjectionsPanelV2';
import { ProjectionPortfolioPanel } from './components/ProjectionPortfolioPanel';
import { AccountsStrip } from './components/AccountsStrip';

// Import Zustand store and Account type
import { useAppStore, useProjectionAccount, Account } from './store/useAppStore';

// Re-export Account type for backwards compatibility
export type { Account } from './store/useAppStore';

export default function App() {
  /* ─── ZUSTAND STORE ─────────────────────────────────────────────── */
  
  // Get state from Zustand store (persisted to localStorage)
  const accounts = useAppStore((state) => state.accounts);
  const tab = useAppStore((state) => state.tab);
  const projectionAccountId = useAppStore((state) => state.projectionAccountId);
  const portfolioSelectedIds = useAppStore((state) => state.portfolioSelectedIds);
  
  // Get actions from Zustand store
  const addAccountToStore = useAppStore((state) => state.addAccount);
  const updateAccountInStore = useAppStore((state) => state.updateAccount);
  const deleteAccountFromStore = useAppStore((state) => state.deleteAccount);
  const setTab = useAppStore((state) => state.setTab);
  const toggleProjectionAccount = useAppStore((state) => state.toggleProjectionAccount);
  const togglePortfolioAccount = useAppStore((state) => state.togglePortfolioAccount);
  
  // Derived state from custom hooks
  const projectionAccount = useProjectionAccount();
  
  /* ─── LOCAL UI STATE (not persisted) ────────────────────────────── */
  
  /** Ref to left panel for scroll-into-view */
  const leftTrayRef = useRef<HTMLDivElement | null>(null);

  /** Modal open state for adding/editing account from strip */
  const [showAccountModal, setShowAccountModal] = useState(false);

  /** Account being edited in modal (null = adding new) */
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  
  /** Pre-fill transaction type when adding from strip sections */
  const [defaultTransactionType, setDefaultTransactionType] = useState<'deposit' | 'withdraw'>('deposit');

  /** Get the account being edited in modal */
  const editingAccount = editingAccountId ? accounts.find(a => a.id === editingAccountId) : null;

  /** ID of account being edited in left tray (null = adding new) */
  const [editingId, setEditingId] = useState<string | null>(null);

  /** Left panel collapsed on mobile */
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);

  /* ─── LOCAL UI HANDLERS ─────────────────────────────────────────── */

  /** Open modal for adding new deposit */
  const openAddDeposit = () => {
    setEditingAccountId(null);
    setDefaultTransactionType('deposit');
    setShowAccountModal(true);
  };

  /** Open modal for adding new drawdown */
  const openAddDrawdown = () => {
    setEditingAccountId(null);
    setDefaultTransactionType('withdraw');
    setShowAccountModal(true);
  };

  /** Open modal for editing existing account */
  const openEditModal = (id: string) => {
    setEditingAccountId(id);
    setShowAccountModal(true);
  };

  /** Close the account modal */
  const closeAccountModal = () => {
    setShowAccountModal(false);
    setEditingAccountId(null);
  };

  /** Start editing an account in the left tray form */
  const startEdit = (id: string) => {
    setEditingId(id);
    leftTrayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  /** Cancel left tray editing */
  const cancelEdit = () => setEditingId(null);

  /* ─── ACCOUNT CRUD WRAPPERS ─────────────────────────────────────── */
  
  /** Add a new account (wrapper for store action) */
  const addAccount = (account: Omit<Account, 'id'>) => {
    addAccountToStore(account);
  };

  /** Update an existing account (wrapper for store action) */
  const updateAccount = (id: string, account: Omit<Account, 'id'>) => {
    updateAccountInStore(id, account);
  };

  /** Delete an account (wrapper for store action) */
  const deleteAccount = (id: string) => {
    deleteAccountFromStore(id);
  };

  /* ─── RENDER ────────────────────────────────────────────────────── */
  return (
    <div className="app-container">
      {/* ─── HEADER + TABS: Combined row for efficiency ─────────────── */}
      <header className="app-header">
        <h1 className="app-title">Finance Portfolio Tracker</h1>
        
        {/* Tab Toggle inline with header */}
        <div className="tab-container">
          <div className="tab-toggle two-tabs">
            <div 
              className="tab-slider" 
              style={{ 
                width: '50%',
                transform: tab === 'projections' 
                  ? 'translateX(0)' 
                  : 'translateX(100%)'
              }} 
            />
            <button
              onClick={() => setTab('projections')}
              className={`tab-button ${tab === 'projections' ? 'active' : ''}`}
            >
              Projections
            </button>
            <button
              onClick={() => setTab('projection-portfolio')}
              className={`tab-button ${tab === 'projection-portfolio' ? 'active' : ''}`}
            >
              Portfolio
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN LAYOUT: Left panel + Content area ─────────────────── */}
      <div className="main-grid">
        {/* Left Panel: Add Account Form (collapsible on mobile) */}
        <aside 
          className={`left-panel card ${leftPanelCollapsed ? 'collapsed' : ''}`}
          ref={(el) => { leftTrayRef.current = el as HTMLDivElement | null; }}
        >
          {/* Mobile toggle header */}
          <button 
            className="panel-toggle-header"
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          >
            <h2 className="panel-title">{editingId ? 'Edit Cash Flow' : 'Add Cash Flow'}</h2>
            {leftPanelCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
          
          <div className="panel-content">
            <AccountForm
              onSubmit={(data) => {
                if (editingId) {
                  updateAccount(editingId, data);
                  cancelEdit();
                } else {
                  addAccount(data);
                }
                setLeftPanelCollapsed(true); // Collapse after submit on mobile
              }}
              initialData={editingId ? accounts.find((a) => a.id === editingId) : undefined}
              submitLabel={editingId ? 'Update Cash Flow' : 'Add Cash Flow'}
              existingAccounts={accounts}
            />
            {editingId && (
              <button onClick={cancelEdit} className="btn cancel-btn">
                Cancel Edit
              </button>
            )}
          </div>
        </aside>

        {/* Right Content: Tab-specific content */}
        <div className="content-area">
          {tab === 'projections' ? (
            /* Projections Tab: Monte Carlo Simulation */
            <div className="projections-tab-content">
              {projectionAccount ? (
                <ProjectionsPanelV2 account={projectionAccount} />
              ) : (
                <div className="empty-projection-state card">
                  <div className="empty-state-content">
                    <h3>Select an Asset to Project</h3>
                    <p>Choose an asset from the bottom strip to run Monte Carlo simulations on its future value.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Portfolio Tab: Combined with ribbon and crash support */
            <div className="projection-portfolio-tab-content">
              <ProjectionPortfolioPanel accounts={accounts} />
            </div>
          )}

          {/* Unified Accounts Strip - Color-coded deposits/drawdowns/crashes */}
          <AccountsStrip
            accounts={accounts}
            tab={tab}
            projectionAccountId={projectionAccountId}
            onToggleProjection={toggleProjectionAccount}
            portfolioSelectedIds={portfolioSelectedIds}
            onTogglePortfolio={togglePortfolioAccount}
            onAddDeposit={openAddDeposit}
            onAddDrawdown={openAddDrawdown}
            onEditAccount={openEditModal}
            onDeleteAccount={deleteAccount}
          />
        </div>
      </div>

      {/* Add/Edit Cash Flow Modal */}
      {showAccountModal && (
        <div className="modal-overlay" onClick={closeAccountModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAccountId ? 'Edit Cash Flow' : `Add ${defaultTransactionType === 'deposit' ? 'Deposit' : 'Drawdown'}`}</h2>
              <button 
                className="modal-close"
                onClick={closeAccountModal}
              >
                ×
              </button>
            </div>
            <AccountForm 
              key={editingAccountId || `new-${defaultTransactionType}`}
              initialData={editingAccount ? {
                name: editingAccount.name,
                amount: editingAccount.amount,
                date: editingAccount.date,
                expectedReturn: editingAccount.expectedReturn,
                volatility: editingAccount.volatility,
                timeHorizon: editingAccount.timeHorizon,
                frequency: editingAccount.frequency,
                transactionType: editingAccount.transactionType,
                transactionAmount: editingAccount.transactionAmount,
              } : undefined}
              defaultTransactionType={defaultTransactionType}
              submitLabel={editingAccountId ? 'Save Changes' : `Add ${defaultTransactionType === 'deposit' ? 'Deposit' : 'Drawdown'}`}
              existingAccounts={accounts}
              onSubmit={(account) => {
                if (editingAccountId) {
                  updateAccount(editingAccountId, account);
                } else {
                  addAccount(account);
                }
                closeAccountModal();
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
