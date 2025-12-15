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
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="crash-form">
          {/* Crash Name */}
          <div className="form-group">
            <label htmlFor="crash-name">Crash Label</label>
            <input
              id="crash-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GFC-style crash, Dot-com bust"
              className="form-input"
              required
            />
          </div>

          {/* Crash Year */}
          <div className="form-group">
            <label htmlFor="crash-year">Crash Year</label>
            <input
              id="crash-year"
              type="number"
              min={currentYear}
              max={currentYear + 50}
              value={crashYear}
              onChange={(e) => setCrashYear(parseInt(e.target.value))}
              className="form-input"
            />
            <p className="form-hint">
              The year when the crash occurs, affecting all assets immediately.
            </p>
          </div>

          {/* Severity Selector */}
          <div className="form-group">
            <label>Crash Severity</label>
            <div className="severity-selector">
              {SEVERITY_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  className={`severity-btn ${severity === pct ? 'active' : ''}`}
                  onClick={() => setSeverity(pct)}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <p className="form-hint">
              Percentage drop applied to entire portfolio at crash year. 
              Recovery occurs naturally through market returns.
            </p>
          </div>

          {/* Actions */}
          <div className="form-actions">
            {onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={onDelete}
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
            <div className="actions-right">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {initialData ? 'Save Changes' : 'Add Crash'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
