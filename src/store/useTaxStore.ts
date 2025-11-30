/**
 * useTaxStore — Zustand store for Tax Calculator state persistence
 *
 * Persists all tax calculator settings to localStorage so they survive page reloads.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Tax region types */
export type TaxRegion = 'england' | 'scotland';

/** Scenario types for the simulation panel */
export type ScenarioType = 'salary-change' | 'salary-sacrifice';

/** View mode for annual/monthly toggle */
export type ViewMode = 'annual' | 'monthly';

/**
 * Tax Calculator State
 */
interface TaxState {
  // Core inputs
  grossSalary: number | null;
  salaryInput: string;
  
  // Tax settings
  region: TaxRegion;
  
  // Pension settings
  pensionBase: number;
  pensionYourContribution: number;
  pensionEmployerMatch: number;
  
  // Age settings
  age: number;
  retirementAge: number;
  
  // View mode
  viewMode: ViewMode;
  
  // Scenario panel state
  scenarioType: ScenarioType;
  salarySacrificePercent: number;
  salaryChangePercent: number;
}

/**
 * Tax Calculator Actions
 */
interface TaxActions {
  // Core inputs
  setGrossSalary: (salary: number | null) => void;
  setSalaryInput: (input: string) => void;
  
  // Tax settings
  setRegion: (region: TaxRegion) => void;
  
  // Pension settings
  setPensionBase: (percent: number) => void;
  setPensionYourContribution: (percent: number) => void;
  setPensionEmployerMatch: (percent: number) => void;
  
  // Age settings
  setAge: (age: number) => void;
  setRetirementAge: (age: number) => void;
  
  // View mode
  setViewMode: (mode: ViewMode) => void;
  
  // Scenario panel
  setScenarioType: (type: ScenarioType) => void;
  setSalarySacrificePercent: (percent: number) => void;
  setSalaryChangePercent: (percent: number) => void;
  
  // Reset (except salary)
  resetToDefaults: () => void;
}

type TaxStore = TaxState & TaxActions;

// Default constants
const DEFAULT_STATE_PENSION_AGE = 67;
const DEFAULT_AGE = 38;
const DEFAULT_PENSION_BASE = 3;
const DEFAULT_PENSION_YOUR_CONTRIBUTION = 3;
const DEFAULT_PENSION_EMPLOYER_MATCH = 0;
const DEFAULT_SALARY_SACRIFICE = 0;
const DEFAULT_SALARY_CHANGE = 5;

/**
 * Initial state for the store
 */
const initialState: TaxState = {
  grossSalary: null,
  salaryInput: '',
  region: 'england',
  pensionBase: DEFAULT_PENSION_BASE,
  pensionYourContribution: DEFAULT_PENSION_YOUR_CONTRIBUTION,
  pensionEmployerMatch: DEFAULT_PENSION_EMPLOYER_MATCH,
  age: DEFAULT_AGE,
  retirementAge: DEFAULT_STATE_PENSION_AGE,
  viewMode: 'annual',
  scenarioType: 'salary-sacrifice',
  salarySacrificePercent: DEFAULT_SALARY_SACRIFICE,
  salaryChangePercent: DEFAULT_SALARY_CHANGE,
};

/**
 * Zustand store with persistence
 */
export const useTaxStore = create<TaxStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Actions
      setGrossSalary: (salary) => set({ grossSalary: salary }),
      setSalaryInput: (input) => set({ salaryInput: input }),
      setRegion: (region) => set({ region }),
      setPensionBase: (percent) => set({ pensionBase: percent }),
      setPensionYourContribution: (percent) => set({ pensionYourContribution: percent }),
      setPensionEmployerMatch: (percent) => set({ pensionEmployerMatch: percent }),
      setAge: (age) => set((state) => ({ 
        age,
        // Ensure retirement age is never less than current age
        retirementAge: Math.max(state.retirementAge, age)
      })),
      setRetirementAge: (retirementAge) => set({ retirementAge }),
      setViewMode: (viewMode) => set({ viewMode }),
      setScenarioType: (scenarioType) => set({ scenarioType }),
      setSalarySacrificePercent: (percent) => set({ salarySacrificePercent: percent }),
      setSalaryChangePercent: (percent) => set({ salaryChangePercent: percent }),
      
      resetToDefaults: () => set((state) => ({
        // Keep salary as is
        grossSalary: state.grossSalary,
        salaryInput: state.salaryInput,
        // Reset everything else
        region: 'england',
        pensionBase: DEFAULT_PENSION_BASE,
        pensionYourContribution: DEFAULT_PENSION_YOUR_CONTRIBUTION,
        pensionEmployerMatch: DEFAULT_PENSION_EMPLOYER_MATCH,
        age: DEFAULT_AGE,
        retirementAge: DEFAULT_STATE_PENSION_AGE,
        viewMode: 'annual',
        scenarioType: 'salary-sacrifice',
        salarySacrificePercent: DEFAULT_SALARY_SACRIFICE,
        salaryChangePercent: DEFAULT_SALARY_CHANGE,
      })),
    }),
    {
      name: 'tax-calculator-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
