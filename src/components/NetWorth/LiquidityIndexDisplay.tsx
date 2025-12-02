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
        {/* Header: Title + Info */}
        <div className="liquidity-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <h4 className="liquidity-title" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>Liquidity Index</h4>
          <div className="liquidity-info-wrapper">
            <button 
              className="liquidity-info-btn"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              aria-label="What is Liquidity Index"
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
                    <span>0-2: Very Illiquid</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#f97316' }} />
                    <span>2-4: Illiquid</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#eab308' }} />
                    <span>4-5.5: Moderately Liquid</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#84cc16' }} />
                    <span>5.5-7: Balanced</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#22c55e' }} />
                    <span>7-8.5: Liquid</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#10b981' }} />
                    <span>8.5-10: Very Liquid</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

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

        {/* Classification */}
        <div className="liquidity-index-footer">
          <span 
            className="liquidity-classification-text"
            style={{ color: result.color }}
          >
            {result.classification}
          </span>
        </div>
      </div>
    </div>
  );
}
