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
import { Plus, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getLocaleCurrency } from './utils/format';
import { AccountForm } from './components/AccountForm';
import { ProjectionChart, getProjectionData, getProjectionColumns } from './components/ProjectionChart';
import { CashFlowChart, getCashFlowData, getCashFlowColumns } from './components/CashFlowChart';
import { GraphPanel } from './components/GraphPanel';
import { ProjectionsPanel } from './components/ProjectionsPanel';
import { PortfolioPanel } from './components/PortfolioPanel';
import { getColorForId } from './utils/colors';
import Sparkline from './components/Sparkline';

// Import Zustand store and Account type
import { useAppStore, useProjectionAccount, useFilteredAccounts, Account } from './store/useAppStore';

// Re-export Account type for backwards compatibility
export type { Account } from './store/useAppStore';

/**
 * SelectionToggle — Toggle button showing grey tick (off) → green tick (on) → X on hover
 */
function SelectionToggle({ isSelected, onToggle }: { isSelected: boolean; onToggle: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  const showX = isSelected && isHovered;
  const showGreenCheck = isSelected && !isHovered;
  const showGreyCheck = !isSelected;

  return (
    <button
      className={`account-select-toggle ${isSelected ? 'selected' : ''} ${showX ? 'show-x' : ''}`}
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={isSelected ? 'Click to deselect' : 'Click to select for projection'}
    >
      {showX && <X size={16} />}
      {(showGreenCheck || showGreyCheck) && <Check size={16} />}
    </button>
  );
}

export default function App() {
  /* ─── ZUSTAND STORE ─────────────────────────────────────────────── */
  
  // Get state from Zustand store (persisted to localStorage)
  const accounts = useAppStore((state) => state.accounts);
  const selectedIds = useAppStore((state) => state.selectedIds);
  const tab = useAppStore((state) => state.tab);
  const projectionAccountId = useAppStore((state) => state.projectionAccountId);
  const portfolioSelectedIds = useAppStore((state) => state.portfolioSelectedIds);
  
  // Get actions from Zustand store
  const addAccountToStore = useAppStore((state) => state.addAccount);
  const updateAccountInStore = useAppStore((state) => state.updateAccount);
  const deleteAccountFromStore = useAppStore((state) => state.deleteAccount);
  const toggleSelection = useAppStore((state) => state.toggleSelection);
  const setTab = useAppStore((state) => state.setTab);
  const toggleProjectionAccount = useAppStore((state) => state.toggleProjectionAccount);
  const togglePortfolioAccount = useAppStore((state) => state.togglePortfolioAccount);
  
  // Derived state from custom hooks
  const projectionAccount = useProjectionAccount();
  const filteredAccounts = useFilteredAccounts();
  
  /* ─── LOCAL UI STATE (not persisted) ────────────────────────────── */
  
  /** Ref to left panel for scroll-into-view */
  const leftTrayRef = useRef<HTMLDivElement | null>(null);

  /** Toggle between log and linear scale on projection chart */
  const [projectionLogScale, setProjectionLogScale] = useState(false);

  /** Modal open state for adding/editing account from strip */
  const [showAccountModal, setShowAccountModal] = useState(false);

  /** Account being edited in modal (null = adding new) */
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  /** Get the account being edited in modal */
  const editingAccount = editingAccountId ? accounts.find(a => a.id === editingAccountId) : null;

  /** ID of account being edited in left tray (null = adding new) */
  const [editingId, setEditingId] = useState<string | null>(null);

  /** ID of account being edited inline in bottom strip */
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);

  /** Left panel collapsed on mobile */
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);

  /* ─── LOCAL UI HANDLERS ─────────────────────────────────────────── */

  /** Open modal for adding new account */
  const openAddModal = () => {
    setEditingAccountId(null);
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

  /** Start inline editing in bottom strip */
  const startInlineEdit = (id: string) => setInlineEditingId(id);

  /** Cancel inline editing */
  const cancelInlineEdit = () => setInlineEditingId(null);

  /** Save inline edit and close editor */
  const saveInlineEdit = (id: string, data: Omit<Account, 'id'>) => {
    updateAccountInStore(id, data);
    setInlineEditingId(null);
  };

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
      {/* ─── HEADER: Title ──────────────────────────────────────────── */}
      <header className="app-header">
        <h1 className="app-title">Finance Portfolio Tracker</h1>
      </header>

      {/* ─── TAB TOGGLE: Glass-style slider (3 tabs) ─────────────────── */}
      <div className="tab-container">
        <div className="tab-toggle three-tabs">
          <div 
            className="tab-slider" 
            style={{ 
              width: '33.333%',
              transform: tab === 'assets' 
                ? 'translateX(0)' 
                : tab === 'projections' 
                  ? 'translateX(100%)' 
                  : 'translateX(200%)' 
            }} 
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
          <button
            onClick={() => setTab('portfolio')}
            className={`tab-button ${tab === 'portfolio' ? 'active' : ''}`}
          >
            Portfolio
          </button>
        </div>
      </div>

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
            <h2 className="panel-title">{editingId ? 'Edit Account' : 'Add Account'}</h2>
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
              submitLabel={editingId ? 'Update Account' : 'Add Account'}
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
          {tab === 'assets' ? (
            <>
              {/* Graph 1: Net Worth Projection with log/linear toggle */}
              <GraphPanel
                title="Net Worth Projection"
                data={getProjectionData(accounts)}
                columns={getProjectionColumns(accounts)}
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
                  accounts={accounts} 
                  isLogScale={projectionLogScale}
                />
              </GraphPanel>

              {/* Graph 2: Cash Flow */}
              <GraphPanel
                title="Cash Flow"
                data={getCashFlowData(accounts)}
                columns={getCashFlowColumns(accounts)}
              >
                <CashFlowChart accounts={accounts} />
              </GraphPanel>
            </>
          ) : tab === 'projections' ? (
            /* Projections Tab: Monte Carlo Simulation */
            <div className="projections-tab-content">
              {projectionAccount ? (
                <ProjectionsPanel account={projectionAccount} />
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
            /* Portfolio Tab: Combined Monte Carlo Simulation */
            <div className="portfolio-tab-content">
              <PortfolioPanel 
                accounts={accounts} 
                selectedAccountIds={portfolioSelectedIds}
              />
            </div>
          )}

          {/* Accounts Strip */}
          <div className="accounts-strip card">
            <div className="accounts-scroll">
              {accounts.length > 0 ? (
                accounts.map((acct) => {
                  const startYear = new Date(acct.date).getFullYear();
                  const duration = `${acct.timeHorizon}y`;
                  const sign = acct.transactionType === 'withdraw' ? '-' : '+';
                  const color = getColorForId(acct.id);
                  const isSelectedForProjection = projectionAccountId === acct.id;
                  const isSelectedForPortfolio = portfolioSelectedIds.has(acct.id);
                  const formattedAmt = acct.transactionAmount?.toLocaleString(undefined, {
                    style: 'currency',
                    currency: getLocaleCurrency().currency,
                  }) || '£0';

                  return (
                    <div 
                      className={`account-card ${tab === 'projections' && isSelectedForProjection ? 'selected' : ''} ${tab === 'portfolio' && isSelectedForPortfolio ? 'selected' : ''}`} 
                      key={acct.id}
                    >
                      {/* Selection toggle for projections tab (single select) */}
                      {tab === 'projections' && (
                        <SelectionToggle
                          isSelected={isSelectedForProjection}
                          onToggle={() => toggleProjectionAccount(acct.id)}
                        />
                      )}

                      {/* Selection toggle for portfolio tab (multi select) */}
                      {tab === 'portfolio' && (
                        <SelectionToggle
                          isSelected={isSelectedForPortfolio}
                          onToggle={() => togglePortfolioAccount(acct.id)}
                        />
                      )}

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
                        {acct.volatility && ` · ${acct.volatility} vol`}
                      </div>

                      {/* Card amount */}
                      <div className={`account-card-amount ${acct.transactionType}`}>
                        <span>{sign}{formattedAmt}</span>
                        <span className="per-period">/{acct.frequency === 'monthly' ? 'mo' : 'yr'}</span>
                      </div>

                      {/* Card actions */}
                      <div className="account-card-actions">
                        <button onClick={() => openEditModal(acct.id)} className="btn-sm">Edit</button>
                        <button onClick={() => deleteAccount(acct.id)} className="btn-sm btn-danger">Delete</button>
                      </div>
                    </div>
                  );
                })
              ) : null}

              {/* Add Account Button - always at the end */}
              <button 
                className="add-account-btn"
                onClick={openAddModal}
                title="Add new account"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Account Modal */}
      {showAccountModal && (
        <div className="modal-overlay" onClick={closeAccountModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAccountId ? 'Edit Account' : 'Add Account'}</h2>
              <button 
                className="modal-close"
                onClick={closeAccountModal}
              >
                ×
              </button>
            </div>
            <AccountForm 
              key={editingAccountId || 'new'}
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
              submitLabel={editingAccountId ? 'Save Changes' : 'Add Account'}
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
