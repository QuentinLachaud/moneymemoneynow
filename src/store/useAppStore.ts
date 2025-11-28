/**
 * useAppStore — Zustand store with localStorage persistence
 *
 * This store manages all persistent application state:
 * - accounts: The user's financial accounts
 * - selectedIds: Selected accounts for filtering
 * - projectionAccountId: Single account selected for Monte Carlo
 * - portfolioSelectedIds: Accounts selected for portfolio view
 * - tab: Current active tab
 *
 * State is automatically persisted to localStorage and restored on page load.
 * Only data that should survive page reloads is stored here.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Account — represents a single financial account/asset.
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
  /** Annual increase rate for contributions (e.g., 3 = 3% increase per year) */
  annualIncreaseRate?: number;
}

/** Tab types for navigation */
export type TabType = 'projections' | 'portfolio';

/**
 * Store state interface — all persisted state
 */
interface AppState {
  // Core data
  accounts: Account[];
  
  // Selection state
  selectedIds: Set<string>;
  projectionAccountId: string | null;
  portfolioSelectedIds: Set<string>;
  
  // UI state (persisted for convenience)
  tab: TabType;
}

/**
 * Store actions interface — all state mutations
 */
interface AppActions {
  // Account CRUD
  addAccount: (account: Omit<Account, 'id'>) => string;
  updateAccount: (id: string, account: Omit<Account, 'id'>) => void;
  deleteAccount: (id: string) => void;
  
  // Selection actions
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  // Projection account (single select)
  setProjectionAccountId: (id: string | null) => void;
  toggleProjectionAccount: (id: string) => void;
  
  // Portfolio selection (multi-select)
  togglePortfolioAccount: (id: string) => void;
  selectAllPortfolio: () => void;
  clearPortfolioSelection: () => void;
  
  // Tab navigation
  setTab: (tab: TabType) => void;
  
  // Utility
  resetStore: () => void;
}

type AppStore = AppState & AppActions;

/**
 * Initial state for the store
 */
const initialState: AppState = {
  accounts: [],
  selectedIds: new Set(),
  projectionAccountId: null,
  portfolioSelectedIds: new Set(),
  tab: 'projections',
};

/**
 * Custom storage handler for Sets
 * Sets need special handling because JSON.stringify doesn't preserve them
 */
interface SerializedSet {
  __type: 'Set';
  values: string[];
}

const customStorage = createJSONStorage<AppState>(() => localStorage, {
  reviver: (_key, value) => {
    // Revive Sets from arrays
    if (value && typeof value === 'object' && (value as SerializedSet).__type === 'Set') {
      return new Set((value as SerializedSet).values);
    }
    return value;
  },
  replacer: (_key, value) => {
    // Convert Sets to serializable format
    if (value instanceof Set) {
      return { __type: 'Set', values: Array.from(value) } as SerializedSet;
    }
    return value;
  },
});

/**
 * Zustand store with persistence
 */
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ─── Initial State ───────────────────────────────────────────
      ...initialState,

      // ─── Account CRUD ────────────────────────────────────────────
      addAccount: (account) => {
        const id = Date.now().toString();
        set((state) => ({
          accounts: [...state.accounts, { ...account, id }],
          // Auto-select new account for projections
          selectedIds: new Set(state.selectedIds).add(id),
          // Auto-add to portfolio selection
          portfolioSelectedIds: new Set(state.portfolioSelectedIds).add(id),
        }));
        return id;
      },

      updateAccount: (id, account) => {
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === id ? { ...account, id } : acc
          ),
        }));
      },

      deleteAccount: (id) => {
        set((state) => {
          const selectedIds = new Set(state.selectedIds);
          selectedIds.delete(id);
          
          const portfolioSelectedIds = new Set(state.portfolioSelectedIds);
          portfolioSelectedIds.delete(id);
          
          return {
            accounts: state.accounts.filter((acc) => acc.id !== id),
            selectedIds,
            portfolioSelectedIds,
            // Clear projection if deleted account was selected
            projectionAccountId: state.projectionAccountId === id 
              ? null 
              : state.projectionAccountId,
          };
        });
      },

      // ─── Selection Actions ───────────────────────────────────────
      toggleSelection: (id) => {
        set((state) => {
          const next = new Set(state.selectedIds);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return { selectedIds: next };
        });
      },

      clearSelection: () => {
        set({ selectedIds: new Set() });
      },

      selectAll: () => {
        set((state) => ({
          selectedIds: new Set(state.accounts.map((a) => a.id)),
        }));
      },

      // ─── Projection Account (Single Select) ──────────────────────
      setProjectionAccountId: (id) => {
        set({ projectionAccountId: id });
      },

      toggleProjectionAccount: (id) => {
        set((state) => ({
          projectionAccountId: state.projectionAccountId === id ? null : id,
        }));
      },

      // ─── Portfolio Selection (Multi-Select) ──────────────────────
      togglePortfolioAccount: (id) => {
        set((state) => {
          const next = new Set(state.portfolioSelectedIds);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return { portfolioSelectedIds: next };
        });
      },

      selectAllPortfolio: () => {
        set((state) => ({
          portfolioSelectedIds: new Set(state.accounts.map((a) => a.id)),
        }));
      },

      clearPortfolioSelection: () => {
        set({ portfolioSelectedIds: new Set() });
      },

      // ─── Tab Navigation ──────────────────────────────────────────
      setTab: (tab) => {
        set({ tab });
      },

      // ─── Utility ─────────────────────────────────────────────────
      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: 'finance-portfolio-storage',
      storage: customStorage,
      version: 1, // Increment version for migration
      migrate: (persistedState, version) => {
        const state = persistedState as AppState & { tab?: string };
        // Migration from v0: 'assets' tab no longer exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((state.tab as any) === 'assets') {
          state.tab = 'projections' as TabType;
        }
        return state as AppState;
      },
      // Only persist essential data, skip derived state
      partialize: (state) => ({
        accounts: state.accounts,
        selectedIds: state.selectedIds,
        projectionAccountId: state.projectionAccountId,
        portfolioSelectedIds: state.portfolioSelectedIds,
        tab: state.tab,
      }),
    }
  )
);

/**
 * Selector hooks for common derived state
 * These provide memoized access to computed values
 */

/** Get filtered accounts based on selection */
export const useFilteredAccounts = () => {
  const accounts = useAppStore((state) => state.accounts);
  const selectedIds = useAppStore((state) => state.selectedIds);
  
  return selectedIds.size === 0
    ? accounts
    : accounts.filter((acc) => selectedIds.has(acc.id));
};

/** Get the currently selected projection account */
export const useProjectionAccount = () => {
  const accounts = useAppStore((state) => state.accounts);
  const projectionAccountId = useAppStore((state) => state.projectionAccountId);
  
  return projectionAccountId
    ? accounts.find((a) => a.id === projectionAccountId) ?? null
    : null;
};

/** Check if an account is selected */
export const useIsSelected = (id: string) => {
  return useAppStore((state) => state.selectedIds.has(id));
};

/** Check if an account is in portfolio selection */
export const useIsInPortfolio = (id: string) => {
  return useAppStore((state) => state.portfolioSelectedIds.has(id));
};
