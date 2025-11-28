/**
 * CashFlowRibbon — Bottom ribbon showing deposits, drawdowns, and market crashes
 * 
 * Features:
 * - Deposit tickets (green) - toggle to include/exclude from projections
 * - Drawdown tickets (red) - toggle to include/exclude from projections
 * - Market crash tickets (yellow) - toggle crash scenarios
 * - Plus buttons to add new items in each category
 */

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  Zap,
  AlertTriangle
} from 'lucide-react';
import { useMarketCrashStore, MarketCrash } from '../store/useMarketCrashStore';
import { Account } from '../store/useAppStore';
import { MarketCrashModal } from './MarketCrashModal';

interface CashFlowRibbonProps {
  accounts: Account[];
  onAddDeposit: () => void;
  onAddDrawdown: () => void;
  onToggleAccount: (accountId: string) => void;
  enabledAccountIds: Set<string>;
}

export function CashFlowRibbon({
  accounts,
  onAddDeposit,
  onAddDrawdown,
  onToggleAccount,
  enabledAccountIds,
}: CashFlowRibbonProps) {
  const [showCrashModal, setShowCrashModal] = useState(false);
  const [editingCrash, setEditingCrash] = useState<MarketCrash | null>(null);
  
  const {
    crashes,
    cashFlowItems,
    activeCrashId,
    toggleCrash,
    setActiveCrash,
    syncCashFlowItems,
    toggleCashFlowItem,
    addCrash,
    updateCrash,
    deleteCrash,
  } = useMarketCrashStore();

  // Sync cash flow items with accounts
  useEffect(() => {
    syncCashFlowItems(accounts.map(a => ({
      id: a.id,
      name: a.name,
      transactionType: a.transactionType,
    })));
  }, [accounts, syncCashFlowItems]);

  // Separate deposits and drawdowns
  const deposits = accounts.filter(a => a.transactionType === 'deposit');
  const drawdowns = accounts.filter(a => a.transactionType === 'withdraw');

  const handleAddCrash = (crashData: Omit<MarketCrash, 'id' | 'createdAt'>) => {
    if (editingCrash) {
      updateCrash(editingCrash.id, crashData);
    } else {
      addCrash(crashData);
    }
    setShowCrashModal(false);
    setEditingCrash(null);
  };

  const handleEditCrash = (crash: MarketCrash) => {
    setEditingCrash(crash);
    setShowCrashModal(true);
  };

  const handleCrashClick = (crash: MarketCrash) => {
    // Toggle active state for slider binding
    setActiveCrash(activeCrashId === crash.id ? null : crash.id);
  };

  return (
    <>
      <div className="cashflow-ribbon">
        {/* Deposits Section */}
        <div className="ribbon-section deposits-section">
          <div className="section-label">
            <TrendingUp size={14} />
            Deposits
          </div>
          <div className="ribbon-tickets">
            {deposits.map((account) => {
              const isEnabled = enabledAccountIds.has(account.id);
              return (
                <button
                  key={account.id}
                  className={`ribbon-ticket deposit-ticket ${isEnabled ? 'enabled' : 'disabled'}`}
                  onClick={() => onToggleAccount(account.id)}
                  title={`${isEnabled ? 'Disable' : 'Enable'} ${account.name}`}
                >
                  <span className="ticket-check">
                    {isEnabled && <Check size={12} />}
                  </span>
                  <span className="ticket-name">{account.name}</span>
                  <span className="ticket-amount">
                    +{formatAmount(account.transactionAmount, account.frequency)}
                  </span>
                </button>
              );
            })}
            <button
              className="ribbon-add-btn deposit-add"
              onClick={onAddDeposit}
              title="Add deposit"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Drawdowns Section */}
        <div className="ribbon-section drawdowns-section">
          <div className="section-label">
            <TrendingDown size={14} />
            Drawdowns
          </div>
          <div className="ribbon-tickets">
            {drawdowns.map((account) => {
              const isEnabled = enabledAccountIds.has(account.id);
              return (
                <button
                  key={account.id}
                  className={`ribbon-ticket drawdown-ticket ${isEnabled ? 'enabled' : 'disabled'}`}
                  onClick={() => onToggleAccount(account.id)}
                  title={`${isEnabled ? 'Disable' : 'Enable'} ${account.name}`}
                >
                  <span className="ticket-check">
                    {isEnabled && <Check size={12} />}
                  </span>
                  <span className="ticket-name">{account.name}</span>
                  <span className="ticket-amount">
                    -{formatAmount(account.transactionAmount, account.frequency)}
                  </span>
                </button>
              );
            })}
            <button
              className="ribbon-add-btn drawdown-add"
              onClick={onAddDrawdown}
              title="Add drawdown"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Market Crashes Section */}
        <div className="ribbon-section crashes-section">
          <div className="section-label">
            <AlertTriangle size={14} />
            Market Crashes
          </div>
          <div className="ribbon-tickets">
            {crashes.map((crash) => {
              const isActive = activeCrashId === crash.id;
              return (
                <button
                  key={crash.id}
                  className={`ribbon-ticket crash-ticket ${crash.isEnabled ? 'enabled' : 'disabled'} ${isActive ? 'active' : ''}`}
                  onClick={() => handleCrashClick(crash)}
                  onDoubleClick={() => handleEditCrash(crash)}
                  title={`${crash.name} - ${(crash.severity * 100).toFixed(0)}% drop, ${crash.recoveryYears}y recovery`}
                >
                  <span 
                    className="ticket-check"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCrash(crash.id);
                    }}
                  >
                    {crash.isEnabled && <Check size={12} />}
                  </span>
                  <span className="ticket-icon">
                    <Zap size={12} />
                  </span>
                  <span className="ticket-name">{crash.name}</span>
                  <span className="ticket-meta">
                    {crash.crashYear} · -{(crash.severity * 100).toFixed(0)}%
                  </span>
                </button>
              );
            })}
            <button
              className="ribbon-add-btn crash-add"
              onClick={() => {
                setEditingCrash(null);
                setShowCrashModal(true);
              }}
              title="Add market crash"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Market Crash Modal */}
      {showCrashModal && (
        <MarketCrashModal
          onClose={() => {
            setShowCrashModal(false);
            setEditingCrash(null);
          }}
          onSubmit={handleAddCrash}
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

function formatAmount(amount: number, frequency: 'monthly' | 'annual'): string {
  const displayAmount = frequency === 'monthly' ? amount : amount;
  const suffix = frequency === 'monthly' ? '/mo' : '/yr';
  
  if (displayAmount >= 1000) {
    return `£${(displayAmount / 1000).toFixed(1)}k${suffix}`;
  }
  return `£${displayAmount.toFixed(0)}${suffix}`;
}
