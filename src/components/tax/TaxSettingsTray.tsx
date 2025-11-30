/**
 * TaxSettingsTray — Left side control panel for tax settings
 * 
 * Contains:
 * - Tax region toggle (England / Scotland)
 * - Pension section with satisfying slider + preset buttons
 * - Total pension contribution summary
 */

import { Info, Minus, Plus } from 'lucide-react';
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

// Preset buttons for quick selection (removed 15% per user request)
const PENSION_PRESETS = [0, 3, 5, 8, 10];

// Satisfying pension input with slider + stepper + presets
function PensionSliderInput({
  label,
  value,
  onChange,
  max = 20,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const increment = () => onChange(Math.min(max, value + 1));
  const decrement = () => onChange(Math.max(0, value - 1));

  return (
    <div className="pension-slider-group">
      <div className="pension-slider-header">
        <span className="pension-slider-label">{label}</span>
        <span className="pension-slider-value">{value}%</span>
      </div>
      
      {/* Main slider */}
      <div className="pension-slider-row">
        <button 
          className="pension-stepper-btn" 
          onClick={decrement}
          disabled={value <= 0}
          type="button"
        >
          <Minus size={14} />
        </button>
        
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="pension-slider"
        />
        
        <button 
          className="pension-stepper-btn" 
          onClick={increment}
          disabled={value >= max}
          type="button"
        >
          <Plus size={14} />
        </button>
      </div>
      
      {/* Preset buttons */}
      <div className="pension-presets">
        {PENSION_PRESETS.filter(p => p <= max).map((preset) => (
          <button
            key={preset}
            className={`pension-preset-btn ${value === preset ? 'active' : ''}`}
            onClick={() => onChange(preset)}
            type="button"
          >
            {preset}%
          </button>
        ))}
      </div>
    </div>
  );
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

        {/* Pension Section - Sliders with Steppers & Presets */}
        <div className="tray-section pension-section">
          <div className="section-header">
            <label className="section-label">Pension</label>
            <button 
              className="info-btn" 
              title="Your contribution is deducted from gross salary before tax. Base & Employer Match don't reduce your taxable income."
            >
              <Info size={14} />
            </button>
          </div>
          
          <div className="pension-sliders">
            <PensionSliderInput
              label="Base (employer)"
              value={pensionBase}
              onChange={onPensionBaseChange}
              max={10}
            />
            
            <PensionSliderInput
              label="Your Contribution"
              value={pensionYourContribution}
              onChange={onPensionYourContributionChange}
              max={20}
            />
            
            <PensionSliderInput
              label="Employer Match"
              value={pensionEmployerMatch}
              onChange={(v) => onPensionEmployerMatchChange(Math.min(v, pensionYourContribution))}
              max={Math.min(pensionYourContribution, 20)}
            />
          </div>

          {/* Pension Breakdown Summary */}
          <div className="pension-breakdown">
            <div className="pension-breakdown-row">
              <span className="breakdown-label">Your contribution</span>
              <span className="breakdown-value yours">{pensionBase + pensionYourContribution}%</span>
            </div>
            <div className="pension-breakdown-row">
              <span className="breakdown-label">Employer contribution</span>
              <span className="breakdown-value employer">{pensionBase + pensionEmployerMatch}%</span>
            </div>
            <div className="pension-breakdown-row total">
              <span className="breakdown-label">Total pension</span>
              <span className="breakdown-value total">{totalPension}%</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
