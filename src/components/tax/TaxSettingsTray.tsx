/**
 * TaxSettingsTray — Left side control panel for tax settings
 * 
 * Contains:
 * - Tax region toggle (England / Scotland)
 * - Pension section with compact inputs for Base, Your Contributions, Employer Match
 * - Total pension contribution summary
 */

import { Info } from 'lucide-react';
import { TaxRegion } from '../../utils/ukTaxCalculator';

interface TaxSettingsTrayProps {
  region: TaxRegion;
  onRegionChange: (region: TaxRegion) => void;
  pensionBase: number;
  onPensionBaseChange: (percent: number) => void;
  pensionYourContribution: number;
  onPensionYourContributionChange: (percent: number) => void;
  pensionEmployerMatch: number;
  onPensionEmployerMatchChange: (percent: number) => void;
}

export function TaxSettingsTray({
  region,
  onRegionChange,
  pensionBase,
  onPensionBaseChange,
  pensionYourContribution,
  onPensionYourContributionChange,
  pensionEmployerMatch,
  onPensionEmployerMatchChange,
}: TaxSettingsTrayProps) {
  // Calculate total pension contribution
  const totalPension = pensionBase + pensionYourContribution + pensionEmployerMatch;

  // Handle numeric input change with validation
  const handlePercentChange = (
    value: string,
    setter: (v: number) => void
  ) => {
    const num = parseInt(value) || 0;
    setter(Math.min(50, Math.max(0, num)));
  };

  return (
    <aside className="tax-settings-tray">
      <div className="tray-header">
        <h3>Tax Settings</h3>
      </div>

      <div className="tray-content">
        {/* Tax Region Toggle */}
        <div className="tray-section">
          <label className="section-label">Tax Region</label>
          <div className="region-toggle">
            <button
              className={`region-option ${region === 'england' ? 'active' : ''}`}
              onClick={() => onRegionChange('england')}
            >
              England
            </button>
            <button
              className={`region-option ${region === 'scotland' ? 'active' : ''}`}
              onClick={() => onRegionChange('scotland')}
            >
              Scotland
            </button>
            <div 
              className="region-indicator" 
              style={{ transform: region === 'scotland' ? 'translateX(100%)' : 'translateX(0)' }}
            />
          </div>
          <span className="section-hint">
            {region === 'scotland' ? '6 tax bands (19%-48%)' : '4 tax bands (0%-45%)'}
          </span>
        </div>

        {/* Pension Section - Compact Inputs */}
        <div className="tray-section pension-section">
          <div className="section-header">
            <label className="section-label">Pension</label>
            <button 
              className="info-btn" 
              title="Configure your pension contributions. Base is employer's minimum, Your Contribution is what you add, Employer Match is what they match up to."
            >
              <Info size={14} />
            </button>
          </div>
          
          <div className="pension-inputs-compact">
            {/* Base */}
            <div className="pension-input-row">
              <label className="pension-input-label">Base</label>
              <div className="pension-input-field">
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={pensionBase}
                  onChange={(e) => handlePercentChange(e.target.value, onPensionBaseChange)}
                  className="pension-number-input"
                />
                <span className="pension-input-unit">%</span>
              </div>
            </div>

            {/* Your Contributions */}
            <div className="pension-input-row">
              <label className="pension-input-label">Your Contributions</label>
              <div className="pension-input-field">
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={pensionYourContribution}
                  onChange={(e) => handlePercentChange(e.target.value, onPensionYourContributionChange)}
                  className="pension-number-input"
                />
                <span className="pension-input-unit">%</span>
              </div>
            </div>

            {/* Employer Match */}
            <div className="pension-input-row">
              <label className="pension-input-label">Employer Match</label>
              <div className="pension-input-field">
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={pensionEmployerMatch}
                  onChange={(e) => handlePercentChange(e.target.value, onPensionEmployerMatchChange)}
                  className="pension-number-input"
                />
                <span className="pension-input-unit">%</span>
              </div>
            </div>
          </div>

          {/* Total Summary */}
          <div className="pension-total-summary">
            <span className="pension-total-label">Total pension contribution:</span>
            <span className="pension-total-value">{totalPension}% of gross salary</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
