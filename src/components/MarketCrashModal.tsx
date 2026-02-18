/**
 * MarketCrashModal — Modal for creating/editing market crash events
 * 
 * Simplified crash model:
 * - Crash label/name
 * - Crash date (year)
 * - Crash severity (10-70% - the percentage drop applied to all assets)
 * 
 * No recovery settings - natural market returns in the simulation handle recovery.
 */

import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { Button, TextInput, NumberInput, IconButton, SegmentedToggle } from '@quentinlachaud/app-component-library';
import { MarketCrash } from '../store/useMarketCrashStore';

interface MarketCrashModalProps {
  onClose: () => void;
  onSubmit: (crash: Omit<MarketCrash, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
  initialData?: MarketCrash;
}

// Extended severity range from 10% to 70%
const SEVERITY_OPTIONS = [10, 20, 30, 40, 50, 60, 70];

export function MarketCrashModal({
  onClose,
  onSubmit,
  onDelete,
  initialData,
}: MarketCrashModalProps) {
  const currentYear = new Date().getFullYear();
  
  const [name, setName] = useState(initialData?.name || '');
  const [crashYear, setCrashYear] = useState(initialData?.crashYear || currentYear + 5);
  const [severity, setSeverity] = useState((initialData?.severity || 0.30) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    onSubmit({
      name: name.trim(),
      crashYear,
      severity: severity / 100,
      isEnabled: initialData?.isEnabled ?? true,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content crash-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <AlertTriangle size={20} className="crash-icon" />
            <h2>{initialData ? 'Edit Market Crash' : 'Add Market Crash'}</h2>
          </div>
          <IconButton icon={<X size={20} />} label="Close" variant="ghost" size="sm" onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="crash-form">
          {/* Crash Name */}
          <div className="form-group">
            <TextInput
              label="Crash Label"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GFC-style crash, Dot-com bust"
              fullWidth
            />
          </div>

          {/* Crash Year */}
          <div className="form-group">
            <NumberInput
              label="Crash Year"
              value={crashYear}
              onChange={(v) => setCrashYear(v ?? currentYear + 5)}
              min={currentYear}
              max={currentYear + 50}
              helperText="The year when the crash occurs, affecting all assets immediately."
              fullWidth
            />
          </div>

          {/* Severity Selector */}
          <div className="form-group">
            <label className="text-xs font-medium text-text-secondary">Crash Severity</label>
            <SegmentedToggle
              options={SEVERITY_OPTIONS.map(pct => ({ value: String(pct), label: `${pct}%` }))}
              value={String(severity)}
              onChange={(v) => setSeverity(parseInt(v))}
              size="sm"
              fullWidth
            />
            <p className="form-hint">
              Percentage drop applied to entire portfolio at crash year. 
              Recovery occurs naturally through market returns.
            </p>
          </div>

          {/* Actions */}
          <div className="form-actions">
            {onDelete && (
              <Button
                variant="secondary"
                leftIcon={<Trash2 size={16} />}
                onClick={onDelete}
              >
                Delete
              </Button>
            )}
            <div className="actions-right">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {initialData ? 'Save Changes' : 'Add Crash'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
