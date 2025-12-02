/**
 * AssetCard Component
 * 
 * Displays a single asset with icon, name, value, date, liquidity, and actions
 */

import { Pencil, Trash2 } from 'lucide-react';
import { Asset, getAssetTypeLabel } from '../../store/useNetWorthStore';
import { getAssetIcon } from '../../utils/netWorthIcons';
import { formatCurrency, formatDate } from './formatters';

interface AssetCardProps {
  asset: Asset;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

export function AssetCard({ asset, onEdit, onDelete }: AssetCardProps) {
  const Icon = getAssetIcon(asset.type);
  const displayName = asset.customName || getAssetTypeLabel(asset.type);
  const typeLabel = getAssetTypeLabel(asset.type);
  
  return (
    <div className="item-card asset-card">
      {/* Leading Icon */}
      <div className="item-icon-wrapper asset">
        <Icon size={18} />
      </div>
      
      {/* Content */}
      <div className="item-content">
        {/* Primary Row: Name + Edit + Value */}
        <div className="item-primary-row">
          <div className="item-name-section">
            <span className="item-name">{displayName}</span>
            <button 
              className="inline-edit-btn"
              onClick={() => onEdit(asset)}
              title="Edit"
            >
              <Pencil size={14} className="edit-icon" />
            </button>
          </div>
          <span className="item-value positive">{formatCurrency(asset.value)}</span>
        </div>
        
        {/* Secondary Row: Type (if custom name), Date, Liquidity */}
        <div className="item-meta">
          {asset.customName && (
            <span className="item-type-label">{typeLabel}</span>
          )}
          <span className="item-date">{formatDate(asset.date)}</span>
          <span className="liquidity-badge">
            <span className="liquidity-dot" style={{ backgroundColor: getLiquidityColor(asset.liquidityIndex) }} />
            {asset.liquidityIndex}/10
          </span>
        </div>
      </div>
      
      {/* Delete Button */}
      <button 
        className="card-delete-btn"
        onClick={() => onDelete(asset)}
        title="Delete"
      >
        <Trash2 size={16} className="delete-icon" />
      </button>
    </div>
  );
}

/**
 * Get color for liquidity index
 */
function getLiquidityColor(index: number): string {
  if (index >= 8) return '#22c55e';
  if (index >= 6) return '#84cc16';
  if (index >= 4) return '#eab308';
  if (index >= 2) return '#f97316';
  return '#ef4444';
}
