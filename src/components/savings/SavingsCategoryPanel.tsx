/**
 * SavingsCategoryPanel.tsx — Collapsible expenditure section panel
 *
 * Features:
 * - Clean icon and title header
 * - Smooth expand/collapse animation
 * - Displays total for section when collapsed
 * - Contains CategoryInputRow components
 * - Supports dynamic subcategories with add/delete
 * - Custom sections can be deleted with confirmation
 */

import { Home, Car, Tv, Baby, TrendingUp, Plus, Trash2, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { ExpenseSection, Subcategory } from '../../utils/savingsCalculations';
import { Currency, CURRENCY_SYMBOLS } from '../../utils/investmentSimulation';
import { calculateSectionTotal } from '../../utils/savingsCalculations';
import { CategoryInputRow } from './CategoryInputRow';
import { DeleteConfirmPopover } from './DeleteConfirmPopover';

/** Icon mapping for sections */
const SECTION_ICONS: Record<string, React.ReactNode> = {
  Home: <Home size={18} />,
  Car: <Car size={18} />,
  Tv: <Tv size={18} />,
  Baby: <Baby size={18} />,
  TrendingUp: <TrendingUp size={18} />,
  '📁': <FolderOpen size={18} />,
};

interface SavingsCategoryPanelProps {
  section: ExpenseSection;
  currency: Currency;
  isExpanded: boolean;
  onToggle: () => void;
  onAmountChange: (categoryId: string, amount: number) => void;
  onFrequencyChange?: (categoryId: string, frequency: 'annual' | 'monthly') => void;
  /** Subcategory handlers */
  onAddSubcategory?: () => void;
  onUpdateSubcategory?: (subcategoryId: string, updates: Partial<Subcategory>) => void;
  onRemoveSubcategory?: (subcategoryId: string) => void;
  /** Custom section deletion */
  onDeleteSection?: () => void;
  /** Custom section title update */
  onUpdateSectionTitle?: (title: string) => void;
  /** Whether this section can be deleted */
  canDelete?: boolean;
}

export function SavingsCategoryPanel({
  section,
  currency,
  isExpanded,
  onToggle,
  onAmountChange,
  onFrequencyChange,
  onAddSubcategory,
  onUpdateSubcategory,
  onRemoveSubcategory,
  onDeleteSection,
  onUpdateSectionTitle,
  canDelete = false,
}: SavingsCategoryPanelProps) {
  const sectionTotal = calculateSectionTotal(section);
  const symbol = CURRENCY_SYMBOLS[currency];
  const isVehicleSection = section.id === 'vehicle';
  const subcategories = section.subcategories || [];
  
  // State for inline subcategory name editing
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  // State for inline section title editing
  const [editingTitle, setEditingTitle] = useState(false);

  return (
    <div className={`savings-category-panel ${isExpanded ? 'expanded' : ''}`}>
      {/* Header (clickable) */}
      <div className="category-panel-header-wrapper">
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
            {editingTitle && canDelete && onUpdateSectionTitle ? (
              <input
                type="text"
                className="section-title-input"
                value={section.title}
                onChange={(e) => onUpdateSectionTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className="section-title"
                onClick={() => canDelete && setEditingTitle(true)}
                title={canDelete ? "Click to edit name" : undefined}
              >
                {section.title}
              </button>
            )}
          </div>
          
          <div className="header-right">
            {/* Show total when collapsed */}
            {!isExpanded && sectionTotal > 0 && (
              <span className="section-total">
                £{sectionTotal.toLocaleString('en-GB', { maximumFractionDigits: 0 })} per month
              </span>
            )}
          </div>
        </button>
        
        {/* Delete section button for custom sections */}
        {canDelete && onDeleteSection && (
          <DeleteConfirmPopover
            onConfirm={onDeleteSection}
            message={`Delete "${section.title}"?`}
            trigger={
              <button
                type="button"
                className="delete-section-btn"
                title="Delete section"
              >
                <Trash2 size={18} />
              </button>
            }
          />
        )}
      </div>
      
      {/* Content (animated) */}
      <div 
        className="category-panel-content"
        onClick={isExpanded ? onToggle : undefined}
        style={{ cursor: isExpanded ? 'pointer' : 'default' }}
      >
        <div className="category-list">
          {/* Fixed categories */}
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
          
          {/* Dynamic subcategories */}
          {subcategories.map((sub) => (
            <div key={sub.id} className="subcategory-row">
              {editingSubId === sub.id ? (
                <input
                  type="text"
                  className="subcategory-name-input"
                  value={sub.name}
                  onChange={(e) => onUpdateSubcategory?.(sub.id, { name: e.target.value })}
                  onBlur={() => setEditingSubId(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingSubId(null)}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className="subcategory-name"
                  onClick={() => setEditingSubId(sub.id)}
                  title="Click to edit name"
                >
                  {sub.name || 'New item'}
                </button>
              )}
              
              <div className="subcategory-input-group">
                <div className="category-input-field">
                  <span className="currency-prefix">{symbol}</span>
                  <input
                    type="number"
                    value={sub.amount || ''}
                    onChange={(e) => onUpdateSubcategory?.(sub.id, { amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    min={0}
                  />
                </div>
                
                <DeleteConfirmPopover
                  onConfirm={() => onRemoveSubcategory?.(sub.id)}
                  message="Remove this item?"
                  trigger={
                    <button
                      type="button"
                      className="subcategory-delete-btn"
                      title="Remove item"
                    >
                      <Trash2 size={12} />
                    </button>
                  }
                />
              </div>
            </div>
          ))}
          
          {/* Add subcategory button */}
          {onAddSubcategory && (
            <button
              type="button"
              className="add-subcategory-btn"
              onClick={onAddSubcategory}
            >
              <Plus size={14} />
              <span>Add item</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
