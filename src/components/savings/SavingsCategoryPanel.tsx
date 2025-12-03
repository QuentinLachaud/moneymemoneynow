/**
 * SavingsCategoryPanel.tsx — Collapsible expenditure section panel
 *
 * Features:
 * - Clean icon and title header
 * - Smooth expand/collapse animation
 * - Displays total for section when collapsed
 * - Contains CategoryInputRow components
 */

import { ChevronDown, ChevronUp, Home, Car, Tv, Baby, TrendingUp } from 'lucide-react';
import { ExpenseSection } from '../../utils/savingsCalculations';
import { Currency, CURRENCY_SYMBOLS } from '../../utils/investmentSimulation';
import { calculateSectionTotal, getMonthlyValue } from '../../utils/savingsCalculations';
import { CategoryInputRow } from './CategoryInputRow';

/** Icon mapping for sections */
const SECTION_ICONS: Record<string, React.ReactNode> = {
  Home: <Home size={18} />,
  Car: <Car size={18} />,
  Tv: <Tv size={18} />,
  Baby: <Baby size={18} />,
  TrendingUp: <TrendingUp size={18} />,
};

interface SavingsCategoryPanelProps {
  section: ExpenseSection;
  currency: Currency;
  isExpanded: boolean;
  onToggle: () => void;
  onAmountChange: (categoryId: string, amount: number) => void;
  onFrequencyChange?: (categoryId: string, frequency: 'annual' | 'monthly') => void;
}

export function SavingsCategoryPanel({
  section,
  currency,
  isExpanded,
  onToggle,
  onAmountChange,
  onFrequencyChange,
}: SavingsCategoryPanelProps) {
  const sectionTotal = calculateSectionTotal(section);
  const symbol = CURRENCY_SYMBOLS[currency];
  const isVehicleSection = section.id === 'vehicle';

  return (
    <div className={`savings-category-panel ${isExpanded ? 'expanded' : ''}`}>
      {/* Header (clickable) */}
      <button
        type="button"
        className="category-panel-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="header-left">
          <span className="section-icon">
            {SECTION_ICONS[section.icon] || <Home size={18} />}
          </span>
          <span className="section-title">{section.title}</span>
        </div>
        
        <div className="header-right">
          {/* Show total when collapsed */}
          {!isExpanded && sectionTotal > 0 && (
            <span className="section-total">
              {symbol}{sectionTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
            </span>
          )}
          <span className="expand-icon">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </div>
      </button>
      
      {/* Content (animated) */}
      <div className="category-panel-content">
        <div className="category-list">
          {section.categories.map((category) => (
            <CategoryInputRow
              key={category.id}
              categoryId={category.id}
              label={category.label}
              amount={category.amount}
              currency={currency}
              frequency={category.frequency}
              showFrequency={isVehicleSection && category.frequency !== undefined}
              onAmountChange={(amount) => onAmountChange(category.id, amount)}
              onFrequencyChange={
                isVehicleSection && onFrequencyChange
                  ? (freq) => onFrequencyChange(category.id, freq)
                  : undefined
              }
            />
          ))}
        </div>
        
        {/* Section subtotal */}
        {sectionTotal > 0 && (
          <div className="section-subtotal">
            <span className="subtotal-label">Section Total</span>
            <span className="subtotal-value">
              {symbol}{sectionTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
