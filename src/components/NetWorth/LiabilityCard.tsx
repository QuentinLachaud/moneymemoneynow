/**
 * LiabilityCard Component
 * 
 * Displays a single liability with icon, name, value, date, interest rate, and actions
 */

import { Pencil, Trash2 } from 'lucide-react';
import { Liability, getLiabilityTypeLabel } from '../../store/useNetWorthStore';
import { getLiabilityIcon } from '../../utils/netWorthIcons';
import { formatCurrency, formatDate } from './formatters';

interface LiabilityCardProps {
  liability: Liability;
  onEdit: (liability: Liability) => void;
  onDelete: (liability: Liability) => void;
}

export function LiabilityCard({ liability, onEdit, onDelete }: LiabilityCardProps) {
  const Icon = getLiabilityIcon(liability.type);
  const displayName = liability.customName || getLiabilityTypeLabel(liability.type);
  const typeLabel = getLiabilityTypeLabel(liability.type);
  
  return (
    <div className="item-card liability-card">
      {/* Leading Icon */}
      <div className="item-icon-wrapper liability">
        <Icon size={18} />
      </div>
      
      {/* Content */}
      <div className="item-content">
        {/* Primary Row: Name + Edit + Value */}
        <div className="item-primary-row">
          <div className="item-name-section">
            <span className="item-name">{displayName}</span>
            <button 
              className="inline-edit-btn liability"
              onClick={() => onEdit(liability)}
              title="Edit"
            >
              <Pencil size={14} className="edit-icon" />
            </button>
          </div>
          <span className="item-value negative">{formatCurrency(liability.value)}</span>
        </div>
        
        {/* Secondary Row: Type (if custom name), Date, Interest Rate */}
        <div className="item-meta">
          {liability.customName && (
            <span className="item-type-label liability">{typeLabel}</span>
          )}
          <span className="item-date">{formatDate(liability.date)}</span>
          {liability.interestRate !== undefined && liability.interestRate > 0 && (
            <span className="interest-badge">{liability.interestRate}% APR</span>
          )}
        </div>
      </div>
      
      {/* Delete Button */}
      <button 
        className="card-delete-btn"
        onClick={() => onDelete(liability)}
        title="Delete"
      >
        <Trash2 size={16} className="delete-icon" />
      </button>
    </div>
  );
}
