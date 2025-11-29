/**
 * TaxSettingsTray — Left side control panel for tax settings
 * 
 * Contains:
 * - Tax region toggle (England / Scotland)
 * - Employee pension contribution (% slider + custom input)
 * - Employer contribution (%)
 * - Employer match toggle
 * - Age input
 */

import { Info } from 'lucide-react';
import { TaxRegion } from '../../utils/ukTaxCalculator';

interface TaxSettingsTrayProps {
  region: TaxRegion;
  onRegionChange: (region: TaxRegion) => void;
  pensionPercent: number;
  onPensionPercentChange: (percent: number) => void;
  employerContributionPercent: number;
  onEmployerContributionChange: (percent: number) => void;
  employerMatchPercent: number;
  onEmployerMatchChange: (percent: number) => void;
  age: number;
  onAgeChange: (age: number) => void;
  pensionAge: number;
}

export function TaxSettingsTray({
  region,
  onRegionChange,
  pensionPercent,
  onPensionPercentChange,
  employerContributionPercent,
  onEmployerContributionChange,
  employerMatchPercent,
  onEmployerMatchChange,
  age,
  onAgeChange,
  pensionAge,
}: TaxSettingsTrayProps) {
  const yearsToRetirement = Math.max(0, pensionAge - age);

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

        {/* Pension Contribution */}
        <div className="tray-section">
          <label className="section-label">
            Your Pension
            <button 
              className="info-btn" 
              title="Your personal contribution to your workplace pension. This amount is deducted before tax, reducing your taxable income and saving you money on income tax and National Insurance."
            >
              <Info size={12} />
            </button>
          </label>
          <div className="pension-control">
            <input
              type="range"
              min="0"
              max="50"
              value={pensionPercent}
              onChange={(e) => onPensionPercentChange(parseInt(e.target.value))}
              className="pension-slider"
            />
            <div className="pension-value">
              <input
                type="number"
                min="0"
                max="50"
                value={pensionPercent}
                onChange={(e) => onPensionPercentChange(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                className="pension-input"
              />
              <span className="percent-sign">%</span>
            </div>
          </div>
          <div className="quick-presets">
            {[0, 3, 5, 8, 10, 15].map(p => (
              <button
                key={p}
                className={`preset-btn ${pensionPercent === p ? 'active' : ''}`}
                onClick={() => onPensionPercentChange(p)}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Employer Contribution */}
        <div className="tray-section">
          <label className="section-label">
            Employer Base
            <button 
              className="info-btn" 
              title="The base percentage your employer contributes to your pension regardless of your own contribution. This is free money added on top of your salary."
            >
              <Info size={12} />
            </button>
          </label>
          <div className="quick-presets employer-presets">
            {[0, 3, 5, 8, 10, 15, 20].map(p => (
              <button
                key={p}
                className={`preset-btn ${employerContributionPercent === p ? 'active' : ''}`}
                onClick={() => onEmployerContributionChange(p)}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Employer Match */}
        <div className="tray-section">
          <label className="section-label">
            Employer Match
            <button 
              className="info-btn" 
              title="Your employer matches your pension contribution up to this percentage. For example, if you set 5% match and contribute 8%, your employer adds an extra 5% (matching up to 5% of your contribution)."
            >
              <Info size={12} />
            </button>
          </label>
          <div className="quick-presets">
            {[0, 1, 2, 3, 5, 10].map(p => (
              <button
                key={p}
                className={`preset-btn ${employerMatchPercent === p ? 'active' : ''}`}
                onClick={() => onEmployerMatchChange(p)}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Age */}
        <div className="tray-section age-section">
          <label className="section-label">Your Age</label>
          <div className="age-control">
            <input
              type="number"
              min="16"
              max="75"
              value={age}
              onChange={(e) => onAgeChange(Math.min(75, Math.max(16, parseInt(e.target.value) || 30)))}
              className="age-input"
            />
            <span className="age-unit">years</span>
          </div>
          <div className="retirement-info">
            <span className="years-label">{yearsToRetirement}</span>
            <span className="years-suffix"> years to {pensionAge}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
