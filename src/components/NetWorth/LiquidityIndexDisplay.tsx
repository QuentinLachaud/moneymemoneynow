/**
 * LiquidityIndexDisplay Component
 * 
 * Shows the portfolio-wide liquidity index with classification
 */

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Asset } from '../../store/useNetWorthStore';
import { calculateLiquidityIndex, getLiquidityFormulaExplanation } from '../../utils/liquidityCalculator';

interface LiquidityIndexDisplayProps {
  assets: Asset[];
}

export function LiquidityIndexDisplay({ assets }: LiquidityIndexDisplayProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const result = calculateLiquidityIndex(assets);
  
  if (assets.length === 0) {
    return null;
  }
  
  return (
    <div className="liquidity-index-panel">
      <div className="liquidity-index-content">
        {/* Index Value */}
        <div className="liquidity-index-value">
          <span className="liquidity-index-number" style={{ color: result.color }}>
            {result.index.toFixed(1)}
          </span>
          <span className="liquidity-index-max">/10</span>
        </div>
        
        {/* Progress Bar */}
        <div className="liquidity-index-bar">
          <div 
            className="liquidity-index-fill"
            style={{ 
              width: `${result.index * 10}%`,
              backgroundColor: result.color 
            }}
          />
        </div>
        
        {/* Classification + Info */}
        <div className="liquidity-index-footer">
          <span 
            className="liquidity-classification-text"
            style={{ color: result.color }}
          >
            {result.classification}
          </span>
          
          {/* Info Tooltip */}
          <div className="liquidity-info-wrapper">
            <button 
              className="liquidity-info-btn"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
            >
              <Info size={14} />
            </button>
            
            {showTooltip && (
              <div className="liquidity-info-tooltip">
                <h5>Portfolio Liquidity Index</h5>
                <p className="tooltip-description">{result.description}</p>
                <div className="tooltip-formula">
                  <pre>{getLiquidityFormulaExplanation()}</pre>
                </div>
                <div className="tooltip-legend">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#ef4444' }} />
                    <span>1-2: Very Risky</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#f97316' }} />
                    <span>2-4: Risky</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#eab308' }} />
                    <span>4-5.5: Okay</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#84cc16' }} />
                    <span>5.5-7: Optimal</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#22c55e' }} />
                    <span>7-8.5: Safe</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#10b981' }} />
                    <span>8.5-10: Very Safe</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
