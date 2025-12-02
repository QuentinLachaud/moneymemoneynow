/**
 * useNetWorthStore — Zustand store for Net Worth tab data
 *
 * Manages assets and liabilities with localStorage persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Asset object representing a financial asset
 */
export interface Asset {
  id: string;
  type: string;
  customName?: string;
  value: number;
  date: string;
  liquidityIndex: number;
}

/**
 * Liability object representing a financial liability
 */
export interface Liability {
  id: string;
  type: string;
  customName?: string;
  value: number; // Should be negative
  interestRate?: number;
  date: string;
}

/**
 * Asset types with their liquidity indices
 */
export const ASSET_TYPES = [
  { label: 'ISA', value: 'isa', liquidityIndex: 9 },
  { label: 'Cash ISA', value: 'cash-isa', liquidityIndex: 10 },
  { label: 'S&S ISA', value: 'ss-isa', liquidityIndex: 8 },
  { label: 'Index / ETF', value: 'index-etf', liquidityIndex: 8 },
  { label: 'Real Estate', value: 'real-estate', liquidityIndex: 2 },
  { label: 'Property (BTL, REITs)', value: 'property', liquidityIndex: 3 },
  { label: 'Private Equity', value: 'private-equity', liquidityIndex: 1 },
  { label: 'Pension', value: 'pension', liquidityIndex: 1 },
  { label: 'Current Account', value: 'current-account', liquidityIndex: 10 },
  { label: 'Premium Bonds', value: 'premium-bonds', liquidityIndex: 9 },
  { label: 'Custom Type', value: 'custom', liquidityIndex: 5 },
] as const;

/**
 * Liability types
 */
export const LIABILITY_TYPES = [
  { label: 'Mortgage – Home', value: 'mortgage-home', defaultRate: 4.5 },
  { label: 'Mortgage – Rental Property', value: 'mortgage-rental', defaultRate: 5.0 },
  { label: 'Credit Card', value: 'credit-card', defaultRate: 19.9 },
  { label: 'Personal Loan', value: 'personal-loan', defaultRate: 7.0 },
  { label: 'Car Loan', value: 'car-loan', defaultRate: 6.5 },
  { label: 'Student Loan', value: 'student-loan', defaultRate: 7.3 },
  { label: 'Overdraft', value: 'overdraft', defaultRate: 15.0 },
  { label: 'Tax Liability (HMRC)', value: 'tax-liability', defaultRate: 0 },
  { label: 'Business Liability', value: 'business-liability', defaultRate: 8.0 },
  { label: 'Other Liability', value: 'other-liability', defaultRate: 5.0 },
  { label: 'Custom Type', value: 'custom', defaultRate: 5.0 },
] as const;

/**
 * Get liquidity index for an asset type
 */
export function getLiquidityIndex(assetType: string): number {
  const found = ASSET_TYPES.find(a => a.value === assetType);
  return found?.liquidityIndex ?? 5;
}

/**
 * Get default interest rate for a liability type
 */
export function getLiabilityDefaultRate(liabilityType: string): number {
  const found = LIABILITY_TYPES.find(l => l.value === liabilityType);
  return found?.defaultRate ?? 5;
}

/**
 * Get asset type label
 */
export function getAssetTypeLabel(assetType: string): string {
  const found = ASSET_TYPES.find(a => a.value === assetType);
  return found?.label ?? assetType;
}

/**
 * Get liability type label
 */
export function getLiabilityTypeLabel(liabilityType: string): string {
  const found = LIABILITY_TYPES.find(l => l.value === liabilityType);
  return found?.label ?? liabilityType;
}

interface NetWorthState {
  assets: Asset[];
  liabilities: Liability[];
  
  // Actions
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  updateAsset: (id: string, asset: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  
  addLiability: (liability: Omit<Liability, 'id'>) => void;
  updateLiability: (id: string, liability: Partial<Liability>) => void;
  deleteLiability: (id: string) => void;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useNetWorthStore = create<NetWorthState>()(
  persist(
    (set) => ({
      assets: [],
      liabilities: [],
      
      addAsset: (asset) => set((state) => ({
        assets: [...state.assets, { ...asset, id: generateId() }],
      })),
      
      updateAsset: (id, updates) => set((state) => ({
        assets: state.assets.map(a => a.id === id ? { ...a, ...updates } : a),
      })),
      
      deleteAsset: (id) => set((state) => ({
        assets: state.assets.filter(a => a.id !== id),
      })),
      
      addLiability: (liability) => set((state) => ({
        liabilities: [...state.liabilities, { ...liability, id: generateId() }],
      })),
      
      updateLiability: (id, updates) => set((state) => ({
        liabilities: state.liabilities.map(l => l.id === id ? { ...l, ...updates } : l),
      })),
      
      deleteLiability: (id) => set((state) => ({
        liabilities: state.liabilities.filter(l => l.id !== id),
      })),
    }),
    {
      name: 'net-worth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/**
 * Hook to calculate net worth
 */
export function useNetWorth(): number {
  const assets = useNetWorthStore((state) => state.assets);
  const liabilities = useNetWorthStore((state) => state.liabilities);
  
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.value, 0);
  
  return totalAssets + totalLiabilities; // liabilities are negative
}

/**
 * Hook to get total assets value
 */
export function useTotalAssets(): number {
  const assets = useNetWorthStore((state) => state.assets);
  return assets.reduce((sum, a) => sum + a.value, 0);
}

/**
 * Hook to get total liabilities value (absolute)
 */
export function useTotalLiabilities(): number {
  const liabilities = useNetWorthStore((state) => state.liabilities);
  return Math.abs(liabilities.reduce((sum, l) => sum + l.value, 0));
}
