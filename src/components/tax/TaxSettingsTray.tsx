/**
 * TaxSettingsTray — Left side control panel for tax settings
 * 
 * Contains:
 * - Tax region toggle (England / Scotland)
 * - Pension section with Base, Your Contributions, Employer Match
 */

import { Info } from 'lucide-react';
import { TaxRegion } from '../../utils/ukTaxCalculator';
import { PercentSlider } from './shared/PercentSlider';

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

        {/* Pension Section */}
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
          
          <div className="pension-group">
            {/* Base */}
            <div className="pension-item">
              <label className="pension-item-label">Base</label>
              <PercentSlider
                value={pensionBase}
                onChange={onPensionBaseChange}
                min={0}
                max={50}
                step={1}
              />
            </div>

            {/* Your Contributions */}
            <div className="pension-item">
              <label className="pension-item-label">Your Contributions</label>
              <PercentSlider
                value={pensionYourContribution}
                onChange={onPensionYourContributionChange}
                min={0}
                max={50}
                step={1}
              />
            </div>

            {/* Employer Match */}
            <div className="pension-item">
              <label className="pension-item-label">Employer Match</label>
              <PercentSlider
                value={pensionEmployerMatch}
                onChange={onPensionEmployerMatchChange}
                min={0}
                max={50}
                step={1}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
