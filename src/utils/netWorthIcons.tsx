/**
 * Icon Mapper Utility for Net Worth Asset/Liability Types
 */

import {
  Wallet,
  PiggyBank,
  TrendingUp,
  Building,
  Home,
  Briefcase,
  Clock,
  CreditCard,
  Banknote,
  Gift,
  Car,
  GraduationCap,
  AlertCircle,
  Building2,
  MoreHorizontal,
  Landmark,
  Receipt,
  CircleDollarSign,
  type LucideIcon,
} from 'lucide-react';

export type IconType = LucideIcon;

/**
 * Asset type icon mapping
 */
export const ASSET_ICONS: Record<string, IconType> = {
  'isa': PiggyBank,
  'cash-isa': Wallet,
  'ss-isa': TrendingUp,
  'index-etf': TrendingUp,
  'real-estate': Building,
  'property': Home,
  'private-equity': Briefcase,
  'pension': Clock,
  'current-account': CreditCard,
  'premium-bonds': Gift,
  'custom': CircleDollarSign,
};

/**
 * Liability type icon mapping
 */
export const LIABILITY_ICONS: Record<string, IconType> = {
  'mortgage-home': Home,
  'mortgage-rental': Building,
  'credit-card': CreditCard,
  'personal-loan': Banknote,
  'car-loan': Car,
  'student-loan': GraduationCap,
  'overdraft': AlertCircle,
  'tax-liability': Landmark,
  'business-liability': Building2,
  'other-liability': MoreHorizontal,
  'custom': Receipt,
};

/**
 * Get icon for asset type
 */
export function getAssetIcon(type: string): IconType {
  return ASSET_ICONS[type] ?? ASSET_ICONS['custom'];
}

/**
 * Get icon for liability type
 */
export function getLiabilityIcon(type: string): IconType {
  return LIABILITY_ICONS[type] ?? LIABILITY_ICONS['custom'];
}
