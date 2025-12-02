/**
 * Liquidity Index Calculator Utility
 * 
 * Calculates the weighted average liquidity index across all assets
 */

import { Asset } from '../store/useNetWorthStore';

export interface LiquidityResult {
  index: number;
  classification: string;
  color: string;
  description: string;
}

/**
 * Classification thresholds and labels
 */
const CLASSIFICATIONS = [
  { min: 0, max: 2, label: 'Very Illiquid', color: '#ef4444', description: 'Highly illiquid portfolio — emergency access extremely limited' },
  { min: 2, max: 4, label: 'Illiquid', color: '#f97316', description: 'Mostly illiquid assets — limited emergency access' },
  { min: 4, max: 5.5, label: 'Moderately Liquid', color: '#eab308', description: 'Moderate liquidity — some emergency access available' },
  { min: 5.5, max: 7, label: 'Balanced', color: '#84cc16', description: 'Good balance of liquid and illiquid assets' },
  { min: 7, max: 8.5, label: 'Liquid', color: '#22c55e', description: 'Highly liquid portfolio — good emergency access' },
  { min: 8.5, max: 10.1, label: 'Very Liquid', color: '#10b981', description: 'Extremely liquid — immediate access to most funds' },
];

/**
 * Calculate the weighted average liquidity index
 * 
 * Formula: Σ(AssetValue_i × LiquidityFactor_i) / TotalAssetValue
 */
export function calculateLiquidityIndex(assets: Asset[]): LiquidityResult {
  if (assets.length === 0) {
    return {
      index: 0,
      classification: 'N/A',
      color: 'rgba(255,255,255,0.5)',
      description: 'Add assets to calculate liquidity index',
    };
  }
  
  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  
  if (totalValue === 0) {
    return {
      index: 0,
      classification: 'N/A',
      color: 'rgba(255,255,255,0.5)',
      description: 'Total asset value is zero',
    };
  }
  
  // Calculate weighted average: Σ(AssetWeight_i × LiquidityFactor_i)
  const weightedSum = assets.reduce((sum, asset) => {
    const weight = asset.value / totalValue;
    return sum + (weight * asset.liquidityIndex);
  }, 0);
  
  // Round to 1 decimal place
  const index = Math.round(weightedSum * 10) / 10;
  
  // Find classification
  const classification = CLASSIFICATIONS.find(c => index >= c.min && index < c.max) 
    ?? CLASSIFICATIONS[CLASSIFICATIONS.length - 1];
  
  return {
    index,
    classification: classification.label,
    color: classification.color,
    description: classification.description,
  };
}

/**
 * Get the liquidity index formula explanation
 */
export function getLiquidityFormulaExplanation(): string {
  return `Liquidity Index = Σ(AssetWeight × LiquidityFactor)

Where:
• AssetWeight = AssetValue / TotalAssetValue
• LiquidityFactor = 1-10 (how easily convertible to cash)

Higher index = More liquid portfolio
Lower index = Less liquid portfolio`;
}
