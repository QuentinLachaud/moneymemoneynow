/**
 * AccountsStrip — Unified bottom ribbon with deposit/drawdown/crash sections
 * 
 * This component replaces the old accounts strip and CashFlowRibbon with a unified design:
 * 
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ DEPOSITS (green)          │ DRAWDOWNS (red)       │ CRASHES (gold) │
 * │ [+ Card] [Card] [Card]    │ [Card] [Card] [+]     │ [Card] [+]     │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * Features:
 * - Deposit cards have green hue
 * - Drawdown cards have red hue
 * - Click anywhere on card to toggle selection (not just checkbox)
 * - Each section has its own colored add button
 * - Market crash section only visible on Portfolio/ProjectionPortfolio tabs
 * - Compact card design with name, year, duration, amount, edit/delete
 */

import { useState } from 'react';
import { 
  Plus, 
  Check, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { Account } from '../store/useAppStore';
import { useMarketCrashStore, MarketCrash } from '../store/useMarketCrashStore';
import { MarketCrashModal } from './MarketCrashModal';
import { getColorForId } from '../utils/colors';

type TabType = 'projections' | 'projection-portfolio';

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
  // Market crash state (for portfolio tabs)
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

  // Separate accounts by type
  const deposits = accounts.filter(a => a.transactionType === 'deposit');
  const drawdowns = accounts.filter(a => a.transactionType === 'withdraw');

  // Show crashes section only on projection-portfolio tab
  const showCrashSection = tab === 'projection-portfolio';

  // Check if an account is selected based on tab type
  const isSelected = (accountId: string): boolean => {
    if (tab === 'projections') {
      return projectionAccountId === accountId;
    }
    return portfolioSelectedIds.has(accountId);
  };

  // Toggle account selection
  const handleToggle = (accountId: string) => {
    if (tab === 'projections') {
      onToggleProjection?.(accountId);
    } else {
      onTogglePortfolio?.(accountId);
    }
  };

  // Handle crash add/edit
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
      <div className="accounts-strip-unified">
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
                  onClick={() => setActiveCrash(activeCrashId === crash.id ? null : crash.id)}
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
          {crash.crashYear} · -{(crash.severity * 100).toFixed(0)}% · {crash.recoveryYears}y recovery
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
