/**
 * MarketCrashModal — Modal for creating/editing market crash events
 * 
 * Fields:
 * - Crash label/name
 * - Crash date (year)
 * - Years before recovery (1-15, default 6)
 * - Crash severity (10-50% in 5% increments)
 * - Recovery shape (linear/exponential)
 * - Scope (all assets / selected)
 */

import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { MarketCrash, RecoveryShape, CrashScope } from '../store/useMarketCrashStore';

interface MarketCrashModalProps {
  onClose: () => void;
  onSubmit: (crash: Omit<MarketCrash, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
  initialData?: MarketCrash;
}

const SEVERITY_OPTIONS = [10, 15, 20, 25, 30, 35, 40, 45, 50];
const DEFAULT_RECOVERY_YEARS = 6;
const MIN_RECOVERY_YEARS = 1;
const MAX_RECOVERY_YEARS = 15;

export function MarketCrashModal({
  onClose,
  onSubmit,
  onDelete,
  initialData,
}: MarketCrashModalProps) {
  const currentYear = new Date().getFullYear();
  
  const [name, setName] = useState(initialData?.name || '');
  const [crashYear, setCrashYear] = useState(initialData?.crashYear || currentYear + 5);
  const [recoveryYears, setRecoveryYears] = useState(initialData?.recoveryYears || DEFAULT_RECOVERY_YEARS);
  const [severity, setSeverity] = useState((initialData?.severity || 0.30) * 100);
  const [recoveryShape, setRecoveryShape] = useState<RecoveryShape>(initialData?.recoveryShape || 'linear');
  const [scope, setScope] = useState<CrashScope>(initialData?.scope || 'all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    onSubmit({
      name: name.trim(),
      crashYear,
      recoveryYears,
      severity: severity / 100,
      recoveryShape,
      scope,
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
          </div>

          {/* Recovery Years Slider */}
          <div className="form-group">
            <label>
              Years Before Recovery: <span className="value-highlight">{recoveryYears} years</span>
            </label>
            <div className="slider-container">
              <input
                type="range"
                min={MIN_RECOVERY_YEARS}
                max={MAX_RECOVERY_YEARS}
                value={recoveryYears}
                onChange={(e) => setRecoveryYears(parseInt(e.target.value))}
                className="form-slider"
              />
              <div className="slider-labels">
                <span>{MIN_RECOVERY_YEARS}y</span>
                <span>{MAX_RECOVERY_YEARS}y</span>
              </div>
            </div>
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
          </div>

          {/* Recovery Shape */}
          <div className="form-group">
            <label>Recovery Shape</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${recoveryShape === 'linear' ? 'active' : ''}`}
                onClick={() => setRecoveryShape('linear')}
              >
                Linear
              </button>
              <button
                type="button"
                className={`toggle-btn ${recoveryShape === 'exponential' ? 'active' : ''}`}
                onClick={() => setRecoveryShape('exponential')}
              >
                Exponential
              </button>
            </div>
            <p className="form-hint">
              {recoveryShape === 'linear' 
                ? 'Value recovers at a constant rate each year'
                : 'Value recovers faster initially, then slows'}
            </p>
          </div>

          {/* Scope */}
          <div className="form-group">
            <label>Crash Scope</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${scope === 'all' ? 'active' : ''}`}
                onClick={() => setScope('all')}
              >
                Entire Portfolio
              </button>
              <button
                type="button"
                className={`toggle-btn ${scope === 'selected' ? 'active' : ''}`}
                onClick={() => setScope('selected')}
                disabled
                title="Coming soon"
              >
                Selected Assets
              </button>
            </div>
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
