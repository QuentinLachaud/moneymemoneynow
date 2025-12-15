/**
 * AccountsStrip — Unified bottom ribbon with deposit/drawdown/crash sections
 * 
 * ─────────────────────────────────────────────────────────────────────────────
 * Component: AccountsStrip
 * Purpose: Collapsible bottom ribbon that expands on hover to reveal full controls.
 *          Shows deposits, drawdowns, and market crashes in a unified layout.
 * Layer: Domain Component
 * Dependencies: MarketCrashModal, useMarketCrashStore, useAppStore
 * Consumed by: App.tsx (shown on projections/portfolio tabs)
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * Layout (Collapsed - compact strip matching center panel width):
 * ┌──────────────────────────────────────────────────────────┐
 * │  ↑ Deposits (3)   │   ↓ Drawdowns (2)   │   ⚡ Crashes   │
 * └──────────────────────────────────────────────────────────┘
 * 
 * Layout (Expanded - on hover, balloon out to full width):
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ DEPOSITS (green)          │ DRAWDOWNS (red)       │ CRASHES (gold) │
 * │ [+ Card] [Card] [Card]    │ [Card] [Card] [+]     │ [Card] [+]     │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * Features:
 * - Collapsed by default, shows compact 3-section summary
 * - Expands smoothly on hover to reveal full card details
 * - Deposit cards have green hue with up arrow
 * - Drawdown cards have red hue with down arrow
 * - Market crash section only visible on Portfolio/ProjectionPortfolio tabs
 */

import { useState } from 'react';
import { 
  Plus, 
  Check, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Zap,
  ChevronUp
} from 'lucide-react';
import { Account } from '../store/useAppStore';
import { useMarketCrashStore, MarketCrash } from '../store/useMarketCrashStore';
import { MarketCrashModal } from './MarketCrashModal';
import { getColorForId } from '../utils/colors';

type TabType = 'projections' | 'projection-portfolio' | 'tax-calculator';

interface AccountsStripProps {
  accounts: Account[];
  tab: TabType;
  // For projections tab (single select)
  projectionAccountId?: string | null;
  onToggleProjection?: (accountId: string) => void;
  // For portfolio tabs (multi select)
  portfolioSelectedIds?: Set<string>;
  onTogglePortfolio?: (accountId: string) => void;
  // Actions
  onAddDeposit: () => void;
  onAddDrawdown: () => void;
  onEditAccount: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
}

export function AccountsStrip({
  accounts,
  tab,
  projectionAccountId,
  onToggleProjection,
  portfolioSelectedIds = new Set(),
  onTogglePortfolio,
  onAddDeposit,
  onAddDrawdown,
  onEditAccount,
  onDeleteAccount,
}: AccountsStripProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // State: Hover expansion and crash modal
  // ─────────────────────────────────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCrashModal, setShowCrashModal] = useState(false);
  const [editingCrash, setEditingCrash] = useState<MarketCrash | null>(null);
  
  const {
    crashes,
    activeCrashId,
    toggleCrash,
    setActiveCrash,
    addCrash,
    updateCrash,
    deleteCrash,
  } = useMarketCrashStore();

  // ─────────────────────────────────────────────────────────────────────────
  // Logic: Filter and categorize accounts
  // ─────────────────────────────────────────────────────────────────────────
  const deposits = accounts.filter(a => a.transactionType === 'deposit');
  const drawdowns = accounts.filter(a => a.transactionType === 'withdraw');
  const showCrashSection = tab === 'projection-portfolio';

  // Count selected items for collapsed view
  const selectedDepositsCount = deposits.filter(d => 
    tab === 'projections' ? projectionAccountId === d.id : portfolioSelectedIds.has(d.id)
  ).length;
  const selectedDrawdownsCount = drawdowns.filter(d => 
    tab === 'projections' ? projectionAccountId === d.id : portfolioSelectedIds.has(d.id)
  ).length;
  const enabledCrashesCount = crashes.filter(c => c.isEnabled).length;

  const isSelected = (accountId: string): boolean => {
    if (tab === 'projections') {
      return projectionAccountId === accountId;
    }
    return portfolioSelectedIds.has(accountId);
  };

  const handleToggle = (accountId: string) => {
    if (tab === 'projections') {
      onToggleProjection?.(accountId);
    } else {
      onTogglePortfolio?.(accountId);
    }
  };

  const handleCrashSubmit = (crashData: Omit<MarketCrash, 'id' | 'createdAt'>) => {
    if (editingCrash) {
      updateCrash(editingCrash.id, crashData);
    } else {
      addCrash(crashData);
    }
    setShowCrashModal(false);
    setEditingCrash(null);
  };

  const formatAmount = (amount: number, frequency: 'monthly' | 'annual'): string => {
    const suffix = frequency === 'monthly' ? '/mo' : '/yr';
    if (amount >= 1000) {
      return `£${(amount / 1000).toFixed(1)}k${suffix}`;
    }
    return `£${amount.toFixed(0)}${suffix}`;
  };

  return (
    <>
      {/* ───── Section: Main Strip Container (collapsed/expanded) ───── */}
      <div 
        className={`accounts-strip-unified ${isExpanded ? 'expanded' : 'collapsed'}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* ───── Section: Collapsed View (compact 3-section summary) ───── */}
        {!isExpanded && (
          <div className="strip-collapsed">
            <div className="collapsed-section deposits">
              <TrendingUp size={14} />
              <span>Deposits</span>
              {selectedDepositsCount > 0 && (
                <span className="collapsed-count">{selectedDepositsCount}/{deposits.length}</span>
              )}
              {selectedDepositsCount === 0 && deposits.length > 0 && (
                <span className="collapsed-count muted">{deposits.length}</span>
              )}
            </div>
            
            <div className="collapsed-divider" />
            
            <div className="collapsed-section drawdowns">
              <TrendingDown size={14} />
              <span>Drawdowns</span>
              {selectedDrawdownsCount > 0 && (
                <span className="collapsed-count">{selectedDrawdownsCount}/{drawdowns.length}</span>
              )}
              {selectedDrawdownsCount === 0 && drawdowns.length > 0 && (
                <span className="collapsed-count muted">{drawdowns.length}</span>
              )}
            </div>
            
            {showCrashSection && (
              <>
                <div className="collapsed-divider" />
                <div className="collapsed-section crashes">
                  <Zap size={14} />
                  <span>Crashes</span>
                  {enabledCrashesCount > 0 && (
                    <span className="collapsed-count">{enabledCrashesCount}</span>
                  )}
                </div>
              </>
            )}
            
            <div className="collapsed-expand-hint">
              <ChevronUp size={14} />
            </div>
          </div>
        )}

        {/* ───── Section: Expanded View (full cards layout) ───── */}
        {isExpanded && (
          <div className="strip-expanded">
            {/* Deposits Section */}
            <div className="strip-section deposits-section">
              <div className="section-header">
                <TrendingUp size={14} />
                <span>Deposits</span>
              </div>
              <div className="section-cards">
                {deposits.map(account => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    isSelected={isSelected(account.id)}
                    onToggle={() => handleToggle(account.id)}
                    onEdit={() => onEditAccount(account.id)}
                    onDelete={() => onDeleteAccount(account.id)}
                    formatAmount={formatAmount}
                  />
                ))}
                <button 
                  className="add-card-btn deposit-add"
                  onClick={onAddDeposit}
                  title="Add new deposit"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Drawdowns Section */}
            <div className="strip-section drawdowns-section">
              <div className="section-header">
                <TrendingDown size={14} />
                <span>Drawdowns</span>
              </div>
              <div className="section-cards">
                {drawdowns.map(account => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    isSelected={isSelected(account.id)}
                    onToggle={() => handleToggle(account.id)}
                    onEdit={() => onEditAccount(account.id)}
                    onDelete={() => onDeleteAccount(account.id)}
                    formatAmount={formatAmount}
                  />
                ))}
                <button 
                  className="add-card-btn drawdown-add"
                  onClick={onAddDrawdown}
                  title="Add new drawdown"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Market Crashes Section (Portfolio tabs only) */}
            {showCrashSection && (
              <div className="strip-section crashes-section">
                <div className="section-header">
                  <AlertTriangle size={14} />
                  <span>Market Crashes</span>
                </div>
                <div className="section-cards">
                  {crashes.map(crash => (
                    <CrashCard
                      key={crash.id}
                      crash={crash}
                      isActive={activeCrashId === crash.id}
                      onToggle={() => toggleCrash(crash.id)}
                      onClick={() => {
                        toggleCrash(crash.id);
                        setActiveCrash(activeCrashId === crash.id ? null : crash.id);
                      }}
                      onEdit={() => {
                        setEditingCrash(crash);
                        setShowCrashModal(true);
                      }}
                      onDelete={() => deleteCrash(crash.id)}
                    />
                  ))}
                  <button 
                    className="add-card-btn crash-add"
                    onClick={() => {
                      setEditingCrash(null);
                      setShowCrashModal(true);
                    }}
                    title="Add market crash scenario"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Market Crash Modal */}
      {showCrashModal && (
        <MarketCrashModal
          onClose={() => {
            setShowCrashModal(false);
            setEditingCrash(null);
          }}
          onSubmit={handleCrashSubmit}
          initialData={editingCrash || undefined}
          onDelete={editingCrash ? () => {
            deleteCrash(editingCrash.id);
            setShowCrashModal(false);
            setEditingCrash(null);
          } : undefined}
        />
      )}
    </>
  );
}

// Individual Account Card Component
interface AccountCardProps {
  account: Account;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatAmount: (amount: number, frequency: 'monthly' | 'annual') => string;
}

function AccountCard({ 
  account, 
  isSelected, 
  onToggle, 
  onEdit, 
  onDelete,
  formatAmount,
}: AccountCardProps) {
  const startYear = new Date(account.date).getFullYear();
  const isDeposit = account.transactionType === 'deposit';
  const color = getColorForId(account.id);

  return (
    <div 
      className={`account-card-unified ${isDeposit ? 'deposit' : 'drawdown'} ${isSelected ? 'selected' : ''}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Selection indicator */}
      <div className="card-select-indicator">
        {isSelected && <Check size={12} />}
      </div>

      {/* Card content */}
      <div className="card-content">
        <div className="card-header">
          <div className="card-dot" style={{ background: color }} />
          <span className="card-name">{account.name}</span>
        </div>
        
        <div className="card-meta">
          {startYear} · {account.timeHorizon}y · {account.frequency}
        </div>
        
        <div className="card-amount">
          {isDeposit ? '+' : '-'}{formatAmount(account.transactionAmount, account.frequency)}
        </div>
      </div>

      {/* Actions (stop propagation to prevent toggle) */}
      <div className="card-actions" onClick={e => e.stopPropagation()}>
        <button className="card-action-btn" onClick={onEdit} title="Edit">
          Edit
        </button>
        <button className="card-action-btn danger" onClick={onDelete} title="Delete">
          Delete
        </button>
      </div>
    </div>
  );
}

// Market Crash Card Component
interface CrashCardProps {
  crash: MarketCrash;
  isActive: boolean;
  onToggle: () => void;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CrashCard({ 
  crash, 
  isActive, 
  onToggle, 
  onClick,
  onEdit, 
  onDelete,
}: CrashCardProps) {
  return (
    <div 
      className={`crash-card-unified ${crash.isEnabled ? 'enabled' : 'disabled'} ${isActive ? 'active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Enable/disable toggle */}
      <div 
        className="card-select-indicator"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {crash.isEnabled && <Check size={12} />}
      </div>

      {/* Card content */}
      <div className="card-content">
        <div className="card-header">
          <Zap size={12} className="crash-icon" />
          <span className="card-name">{crash.name}</span>
        </div>
        
        <div className="card-meta">
          {crash.crashYear} · -{(crash.severity * 100).toFixed(0)}% drop
        </div>
      </div>

      {/* Actions */}
      <div className="card-actions" onClick={e => e.stopPropagation()}>
        <button className="card-action-btn" onClick={onEdit} title="Edit">
          Edit
        </button>
        <button className="card-action-btn danger" onClick={onDelete} title="Delete">
          Delete
        </button>
      </div>
    </div>
  );
}
