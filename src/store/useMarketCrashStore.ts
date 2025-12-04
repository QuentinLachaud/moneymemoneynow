/**
 * useMarketCrashStore — Zustand store for market crash events
 * 
 * Manages market crash scenarios that can be toggled on/off
 * and applied to portfolio projections.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Recovery shape for crash events
 */
export type RecoveryShape = 'linear' | 'exponential';

/**
 * Crash scope - which assets are affected
 */
export type CrashScope = 'all' | 'selected';

/**
 * MarketCrash — represents a market crash event
 */
export interface MarketCrash {
  id: string;
  /** User-defined label for the crash */
  name: string;
  /** Year when the crash occurs (absolute year, e.g. 2030) */
  crashYear: number;
  /** Years before full recovery */
  recoveryYears: number;
  /** Crash severity as a decimal (0.10 = 10% drop, 0.50 = 50% drop) */
  severity: number;
  /** Shape of recovery curve */
  recoveryShape: RecoveryShape;
  /** Scope of crash application */
  scope: CrashScope;
  /** If scope is 'selected', which asset IDs are affected */
  affectedAssetIds?: string[];
  /** Whether this crash is active in simulations */
  isEnabled: boolean;
  /** Created timestamp for ordering */
  createdAt: number;
}

/**
 * CashFlowItem — represents a deposit or drawdown ticket
 */
export interface CashFlowItem {
  id: string;
  type: 'deposit' | 'drawdown';
  /** Reference to the account this represents */
  accountId: string;
  /** Display name */
  name: string;
  /** Whether this cash flow is enabled in projections */
  isEnabled: boolean;
}

interface MarketCrashState {
  crashes: MarketCrash[];
  cashFlowItems: CashFlowItem[];
  /** Currently selected/active crash for slider control */
  activeCrashId: string | null;
}

interface MarketCrashActions {
  // Crash CRUD
  addCrash: (crash: Omit<MarketCrash, 'id' | 'createdAt'>) => string;
  updateCrash: (id: string, updates: Partial<Omit<MarketCrash, 'id' | 'createdAt'>>) => void;
  deleteCrash: (id: string) => void;
  toggleCrash: (id: string) => void;
  setCrashYear: (id: string, year: number) => void;
  setActiveCrash: (id: string | null) => void;
  
  // Cash flow items
  syncCashFlowItems: (accounts: Array<{ id: string; name: string; transactionType: 'deposit' | 'withdraw' }>) => void;
  toggleCashFlowItem: (id: string) => void;
  
  // Utility
  getEnabledCrashes: () => MarketCrash[];
  getEnabledDeposits: () => CashFlowItem[];
  getEnabledDrawdowns: () => CashFlowItem[];
}

type MarketCrashStore = MarketCrashState & MarketCrashActions;

const initialState: MarketCrashState = {
  crashes: [],
  cashFlowItems: [],
  activeCrashId: null,
};

/**
 * Custom storage handler for proper serialization
 */
const customStorage = createJSONStorage<MarketCrashState>(() => localStorage);

export const useMarketCrashStore = create<MarketCrashStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ─── Crash CRUD ────────────────────────────────────────────────
      addCrash: (crash) => {
        const id = `crash-${Date.now()}`;
        const newCrash: MarketCrash = {
          ...crash,
          id,
          createdAt: Date.now(),
        };
        set((state) => ({
          crashes: [...state.crashes, newCrash],
          activeCrashId: id, // Auto-select new crash
        }));
        return id;
      },

      updateCrash: (id, updates) => {
        set((state) => ({
          crashes: state.crashes.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteCrash: (id) => {
        set((state) => ({
          crashes: state.crashes.filter((c) => c.id !== id),
          activeCrashId: state.activeCrashId === id ? null : state.activeCrashId,
        }));
      },

      toggleCrash: (id) => {
        set((state) => ({
          crashes: state.crashes.map((c) =>
            c.id === id ? { ...c, isEnabled: !c.isEnabled } : c
          ),
        }));
      },

      setCrashYear: (id, year) => {
        set((state) => ({
          crashes: state.crashes.map((c) =>
            c.id === id ? { ...c, crashYear: year } : c
          ),
        }));
      },

      setActiveCrash: (id) => {
        set({ activeCrashId: id });
      },

      // ─── Cash Flow Items ───────────────────────────────────────────
      syncCashFlowItems: (accounts) => {
        set((state) => {
          // Keep existing items, add new ones, remove deleted ones
          const existingIds = new Set(state.cashFlowItems.map((c) => c.accountId));
          const accountIds = new Set(accounts.map((a) => a.id));
          
          // Keep existing that still exist
          const kept = state.cashFlowItems.filter((c) => accountIds.has(c.accountId));
          
          // Add new accounts
          const newItems: CashFlowItem[] = accounts
            .filter((a) => !existingIds.has(a.id))
            .map((a) => ({
              id: `cf-${a.id}`,
              type: a.transactionType === 'deposit' ? 'deposit' : 'drawdown',
              accountId: a.id,
              name: a.name,
              isEnabled: true,
            }));
          
          // Update names for existing items
          const updated = kept.map((item) => {
            const account = accounts.find((a) => a.id === item.accountId);
            return account ? { ...item, name: account.name, type: account.transactionType === 'deposit' ? 'deposit' as const : 'drawdown' as const } : item;
          });
          
          return {
            cashFlowItems: [...updated, ...newItems],
          };
        });
      },

      toggleCashFlowItem: (id) => {
        set((state) => ({
          cashFlowItems: state.cashFlowItems.map((c) =>
            c.id === id ? { ...c, isEnabled: !c.isEnabled } : c
          ),
        }));
      },

      // ─── Utility ───────────────────────────────────────────────────
      getEnabledCrashes: () => {
        return get().crashes.filter((c) => c.isEnabled);
      },

      getEnabledDeposits: () => {
        return get().cashFlowItems.filter((c) => c.type === 'deposit' && c.isEnabled);
      },

      getEnabledDrawdowns: () => {
        return get().cashFlowItems.filter((c) => c.type === 'drawdown' && c.isEnabled);
      },
    }),
    {
      name: 'market-crash-storage',
      storage: customStorage,
      version: 1,
    }
  )
);

/**
 * Apply market crashes to a portfolio value at a given year
 * Returns the crash-adjusted value
 * 
 * Note: crashYear is the year BEFORE the crash occurs.
 * The actual crash happens at crashYear + 1.
 */
export function applyCrashesToValue(
  value: number,
  year: number,
  crashes: MarketCrash[]
): number {
  let adjustedValue = value;
  
  crashes.forEach((crash) => {
    if (!crash.isEnabled) return;
    
    // Actual crash occurs one year after crashYear
    const actualCrashYear = crash.crashYear + 1;
    const yearsSinceCrash = year - actualCrashYear;
    
    if (yearsSinceCrash < 0) {
      // Before crash - no effect
      return;
    }
    
    if (yearsSinceCrash === 0) {
      // Crash year - apply immediate drop
      adjustedValue *= (1 - crash.severity);
    } else if (yearsSinceCrash > 0) {
      // After crash - maintain the reduced level, let simulation randomness drive recovery
      adjustedValue *= (1 - crash.severity);
    }
    // After recovery period - fully recovered, no adjustment needed
  });
  
  return adjustedValue;
}

/**
 * Get crash factor for a specific year (multiplier to apply to portfolio value)
 */
export function getCrashFactor(year: number, crashes: MarketCrash[]): number {
  return applyCrashesToValue(1, year, crashes);
}
