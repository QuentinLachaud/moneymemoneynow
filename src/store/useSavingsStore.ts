/**
 * useSavingsStore.ts — Zustand store for Savings Calculator state
 *
 * Manages:
 * - Currency selection
 * - Net income and bonus
 * - Expenditure sections with category amounts
 * - Subcategories (user-added items)
 * - Custom sections
 * - Expanded/collapsed section state
 *
 * All values persist to localStorage for user convenience.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Currency } from '../utils/investmentSimulation';
import {
  ExpenseSection,
  Subcategory,
  DEFAULT_EXPENSE_SECTIONS,
  calculateTotalOutgoings,
  calculateMonthlySavings,
  calculateSavingsRate,
} from '../utils/savingsCalculations';

/**
 * Store state interface
 */
interface SavingsState {
  // Currency
  currency: Currency;
  
  // Income
  netIncome: number;
  netBonus: number;
  
  // Expenditure sections (with amounts)
  expenseSections: ExpenseSection[];
  
  // Custom sections (user-created)
  customSections: ExpenseSection[];
  
  // UI state: which sections are expanded
  expandedSections: Set<string>;
}

/**
 * Store actions interface
 */
interface SavingsActions {
  // Currency
  setCurrency: (currency: Currency) => void;
  
  // Income
  setNetIncome: (income: number) => void;
  setNetBonus: (bonus: number) => void;
  
  // Expenditure
  updateCategoryAmount: (
    sectionId: string,
    categoryId: string,
    amount: number
  ) => void;
  updateCategoryFrequency: (
    sectionId: string,
    categoryId: string,
    frequency: 'annual' | 'monthly'
  ) => void;
  
  // Subcategories
  addSubcategory: (sectionId: string, name: string) => void;
  updateSubcategory: (sectionId: string, subcategoryId: string, updates: Partial<Subcategory>) => void;
  removeSubcategory: (sectionId: string, subcategoryId: string) => void;
  
  // Custom sections
  addCustomSection: (title?: string) => void;
  updateCustomSectionTitle: (sectionId: string, title: string) => void;
  removeCustomSection: (sectionId: string) => void;
  
  // UI
  toggleSection: (sectionId: string) => void;
  
  // Reset
  resetStore: () => void;
}

/**
 * Derived state selectors (computed values)
 */
interface SavingsDerived {
  /** Total monthly income (net + annualized bonus) */
  totalMonthlyIncome: () => number;
  /** Total monthly outgoings */
  totalOutgoings: () => number;
  /** Monthly savings */
  monthlySavings: () => number;
  /** Savings rate (0-1) */
  savingsRate: () => number;
}

type SavingsStore = SavingsState & SavingsActions & SavingsDerived;

/**
 * Initial state
 */
const initialState: SavingsState = {
  currency: 'GBP',
  netIncome: 0,
  netBonus: 0,
  expenseSections: DEFAULT_EXPENSE_SECTIONS,
  customSections: [],
  expandedSections: new Set(['household']),
};

/**
 * Custom storage handler for Sets
 */
interface SerializedSet {
  __type: 'Set';
  values: string[];
}

const customStorage = createJSONStorage<SavingsState>(() => localStorage, {
  reviver: (_key, value) => {
    if (value && typeof value === 'object' && (value as SerializedSet).__type === 'Set') {
      return new Set((value as SerializedSet).values);
    }
    return value;
  },
  replacer: (_key, value) => {
    if (value instanceof Set) {
      return { __type: 'Set', values: Array.from(value) } as SerializedSet;
    }
    return value;
  },
});

/**
 * Zustand store with persistence
 */
export const useSavingsStore = create<SavingsStore>()(
  persist(
    (set, get) => ({
      // ─── Initial State ───────────────────────────────────────────
      ...initialState,

      // ─── Currency ────────────────────────────────────────────────
      setCurrency: (currency) => set({ currency }),

      // ─── Income ──────────────────────────────────────────────────
      setNetIncome: (netIncome) => set({ netIncome }),
      setNetBonus: (netBonus) => set({ netBonus }),

      // ─── Expenditure ─────────────────────────────────────────────
      updateCategoryAmount: (sectionId, categoryId, amount) => {
        set((state) => ({
          expenseSections: state.expenseSections.map((section) => {
            if (section.id !== sectionId) return section;
            return {
              ...section,
              categories: section.categories.map((cat) => {
                if (cat.id !== categoryId) return cat;
                return { ...cat, amount };
              }),
            };
          }),
        }));
      },

      updateCategoryFrequency: (sectionId, categoryId, frequency) => {
        set((state) => ({
          expenseSections: state.expenseSections.map((section) => {
            if (section.id !== sectionId) return section;
            return {
              ...section,
              categories: section.categories.map((cat) => {
                if (cat.id !== categoryId) return cat;
                return { ...cat, frequency };
              }),
            };
          }),
        }));
      },

      // ─── UI ──────────────────────────────────────────────────────
      toggleSection: (sectionId) => {
        set((state) => {
          const next = new Set(state.expandedSections);
          if (next.has(sectionId)) {
            next.delete(sectionId);
          } else {
            next.add(sectionId);
          }
          return { expandedSections: next };
        });
      },

      // ─── Subcategories ───────────────────────────────────────────
      addSubcategory: (sectionId, name) => {
        const newSubcategory: Subcategory = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name,
          amount: 0,
        };
        set((state) => {
          // Check if it's a regular section
          const expenseSectionIndex = state.expenseSections.findIndex(s => s.id === sectionId);
          if (expenseSectionIndex !== -1) {
            const updatedSections = [...state.expenseSections];
            updatedSections[expenseSectionIndex] = {
              ...updatedSections[expenseSectionIndex],
              subcategories: [...(updatedSections[expenseSectionIndex].subcategories || []), newSubcategory],
            };
            return { expenseSections: updatedSections };
          }
          
          // Check if it's a custom section
          const customSectionIndex = state.customSections.findIndex(s => s.id === sectionId);
          if (customSectionIndex !== -1) {
            const updatedSections = [...state.customSections];
            updatedSections[customSectionIndex] = {
              ...updatedSections[customSectionIndex],
              subcategories: [...(updatedSections[customSectionIndex].subcategories || []), newSubcategory],
            };
            return { customSections: updatedSections };
          }
          
          return state;
        });
      },

      updateSubcategory: (sectionId: string, subcategoryId: string, updates: Partial<Subcategory>) => {
        set((state) => {
          // Check if it's a regular section
          const expenseSectionIndex = state.expenseSections.findIndex(s => s.id === sectionId);
          if (expenseSectionIndex !== -1) {
            const updatedSections = [...state.expenseSections];
            updatedSections[expenseSectionIndex] = {
              ...updatedSections[expenseSectionIndex],
              subcategories: (updatedSections[expenseSectionIndex].subcategories || []).map((sub) => {
                if (sub.id !== subcategoryId) return sub;
                return { ...sub, ...updates };
              }),
            };
            return { expenseSections: updatedSections };
          }
          
          // Check if it's a custom section
          const customSectionIndex = state.customSections.findIndex(s => s.id === sectionId);
          if (customSectionIndex !== -1) {
            const updatedSections = [...state.customSections];
            updatedSections[customSectionIndex] = {
              ...updatedSections[customSectionIndex],
              subcategories: (updatedSections[customSectionIndex].subcategories || []).map((sub) => {
                if (sub.id !== subcategoryId) return sub;
                return { ...sub, ...updates };
              }),
            };
            return { customSections: updatedSections };
          }
          
          return state;
        });
      },

      removeSubcategory: (sectionId, subcategoryId) => {
        set((state) => {
          // Check if it's a regular section
          const expenseSectionIndex = state.expenseSections.findIndex(s => s.id === sectionId);
          if (expenseSectionIndex !== -1) {
            const updatedSections = [...state.expenseSections];
            updatedSections[expenseSectionIndex] = {
              ...updatedSections[expenseSectionIndex],
              subcategories: (updatedSections[expenseSectionIndex].subcategories || []).filter(
                (sub) => sub.id !== subcategoryId
              ),
            };
            return { expenseSections: updatedSections };
          }
          
          // Check if it's a custom section
          const customSectionIndex = state.customSections.findIndex(s => s.id === sectionId);
          if (customSectionIndex !== -1) {
            const updatedSections = [...state.customSections];
            updatedSections[customSectionIndex] = {
              ...updatedSections[customSectionIndex],
              subcategories: (updatedSections[customSectionIndex].subcategories || []).filter(
                (sub) => sub.id !== subcategoryId
              ),
            };
            return { customSections: updatedSections };
          }
          
          return state;
        });
      },

      // ─── Custom Sections ─────────────────────────────────────────
      addCustomSection: (title?: string) => {
        const sectionTitle = title || 'Custom Section';
        const newSection: ExpenseSection = {
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: sectionTitle,
          icon: '📁',
          categories: [],
          subcategories: [],
          isCustom: true,
        };
        set((state) => ({
          customSections: [...state.customSections, newSection],
          expandedSections: new Set([...state.expandedSections, newSection.id]),
        }));
      },

      updateCustomSectionTitle: (sectionId, title) => {
        set((state) => ({
          customSections: state.customSections.map((section) => {
            if (section.id !== sectionId) return section;
            return { ...section, title };
          }),
        }));
      },

      removeCustomSection: (sectionId) => {
        set((state) => ({
          customSections: state.customSections.filter((s) => s.id !== sectionId),
        }));
      },

      // ─── Reset ───────────────────────────────────────────────────
      resetStore: () => set(initialState),

      // ─── Derived Selectors ───────────────────────────────────────
      totalMonthlyIncome: () => {
        const { netIncome, netBonus } = get();
        // Bonus is assumed to be annual, divide by 12
        return netIncome + netBonus / 12;
      },

      totalOutgoings: () => {
        const { expenseSections } = get();
        return calculateTotalOutgoings(expenseSections);
      },

      monthlySavings: () => {
        const income = get().totalMonthlyIncome();
        const outgoings = get().totalOutgoings();
        return calculateMonthlySavings(income, outgoings);
      },

      savingsRate: () => {
        const savings = get().monthlySavings();
        const income = get().totalMonthlyIncome();
        return calculateSavingsRate(savings, income);
      },
    }),
    {
      name: 'savings-calculator-storage',
      storage: customStorage,
      partialize: (state) => ({
        currency: state.currency,
        netIncome: state.netIncome,
        netBonus: state.netBonus,
        expenseSections: state.expenseSections,
        customSections: state.customSections,
        expandedSections: state.expandedSections,
      }),
    }
  )
);

// ─── Selector Hooks (for performance) ─────────────────────────────────

/** Get total monthly income */
export const useTotalMonthlyIncome = () =>
  useSavingsStore((state) => state.totalMonthlyIncome());

/** Get total outgoings */
export const useTotalOutgoings = () =>
  useSavingsStore((state) => state.totalOutgoings());

/** Get monthly savings */
export const useMonthlySavings = () =>
  useSavingsStore((state) => state.monthlySavings());

/** Get savings rate */
export const useSavingsRate = () =>
  useSavingsStore((state) => state.savingsRate());
