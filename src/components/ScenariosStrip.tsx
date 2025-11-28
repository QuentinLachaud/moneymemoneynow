import React from 'react';
import { Account } from '../App';
import { formatCurrency } from '../utils/format';
import { Edit2, Trash2, Eye } from 'lucide-react';

interface ScenariosStripProps {
  accounts: Account[];
  included?: Set<string>;
  highlightedId?: string | null;
  onToggleInclude?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onHighlight?: (id: string | null) => void;
}

function fmtCurrency(n: number) {
  return formatCurrency(n);
}

export function ScenariosStrip({ accounts, included, highlightedId, onToggleInclude, onEdit, onDelete, onHighlight }: ScenariosStripProps) {
  if (!accounts || accounts.length === 0) return null;

  // Group by account name
  const groups: Record<string, Account[]> = {};
  accounts.forEach(a => {
    if (!groups[a.name]) groups[a.name] = [];
    groups[a.name].push(a);
  });

  return (
    <div className="scenarios-strip">
      {Object.entries(groups).map(([name, items]) => (
        <div key={name} className="scenario-group">
          <div className="group-title">{name}</div>
          <div className="group-items">
            {items.map(item => {
              const startYear = new Date(item.date).getFullYear();
              const endYear = startYear + (item.timeHorizon || 0) - 1;
              const years = `${startYear}-${endYear}`;
              const sign = item.transactionType === 'withdraw' ? '-' : '+';
              const per = item.frequency === 'monthly' ? 'mo' : 'yr';
              const amt = fmtCurrency(Math.abs(item.transactionAmount || 0));
              const isIncluded = included ? included.has(item.id) : true;
              const isHighlighted = Boolean(highlightedId === item.id);
              return (
                <div key={item.id} className={`scenario-item ${isIncluded ? 'included' : 'excluded'} ${isHighlighted ? 'highlighted' : ''}`}>
                  <button
                    className="scenario-toggle"
                    onClick={() => onToggleInclude && onToggleInclude(item.id)}
                    title={isIncluded ? 'Exclude from projections' : 'Include in projections'}
                  >
                    <div className="scenario-years">{years}</div>
                    <div className="scenario-amt">{sign}{amt}/{per}</div>
                  </button>

                  <div className="scenario-controls">
                    <button className="ctrl" onClick={() => onHighlight ? onHighlight(item.id) : undefined} title="Highlight in chart"><Eye size={14} /></button>
                    <button className="ctrl" onClick={() => onEdit && onEdit(item.id)} title="Edit"><Edit2 size={14} /></button>
                    <button className="ctrl del" onClick={() => onDelete && onDelete(item.id)} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ScenariosStrip;
