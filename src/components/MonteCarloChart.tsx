/**
 * MonteCarloChart — Displays Monte Carlo simulation paths with percentile lines
 * 
 * FEATURES:
 * - Shows individual simulation paths (toggleable)
 * - Displays percentile lines (1st, 10th, 25th, 50th, 75th, 90th, 99th)
 * - Default: median (50th), 75th, 90th percentiles shown
 * - Right-side control panel for toggling lines
 * - Supports linear or logarithmic Y-axis scale
 */

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { SimulationResult } from '../utils/monteCarlo';
import { Eye, EyeOff } from 'lucide-react';

interface MonteCarloChartProps {
  simulation: SimulationResult;
  showPaths?: boolean;
  /** Use logarithmic scale for Y-axis */
  useLogScale?: boolean;
}

interface PercentileConfig {
  key: number;
  label: string;
  color: string;
  defaultVisible: boolean;
}

const PERCENTILE_CONFIGS: PercentileConfig[] = [
  { key: 99, label: '99th Percentile', color: '#22c55e', defaultVisible: false },
  { key: 90, label: '90th Percentile', color: '#4ade80', defaultVisible: true },
  { key: 75, label: '75th Percentile', color: '#86efac', defaultVisible: true },
  { key: 50, label: 'Median (50th)', color: '#fbbf24', defaultVisible: true },
  { key: 25, label: '25th Percentile', color: '#f87171', defaultVisible: true },
  { key: 10, label: '10th Percentile', color: '#ef4444', defaultVisible: false },
  { key: 1, label: '1st Percentile', color: '#dc2626', defaultVisible: false },
];

export function MonteCarloChart({ simulation, showPaths = false, useLogScale = false }: MonteCarloChartProps) {
  // Track visible percentiles
  const [visiblePercentiles, setVisiblePercentiles] = useState<Set<number>>(
    new Set(PERCENTILE_CONFIGS.filter(p => p.defaultVisible).map(p => p.key))
  );
  const [showAllPaths, setShowAllPaths] = useState(showPaths);

  // Toggle percentile visibility
  const togglePercentile = (key: number) => {
    setVisiblePercentiles(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    return simulation.years.map((year, idx) => {
      const point: Record<string, number> = { year };
      
      // Add percentile values
      for (const [key, values] of Object.entries(simulation.percentiles)) {
        point[`p${key}`] = values[idx];
      }
      
      // Add individual paths if showing
      if (showAllPaths) {
        simulation.paths.slice(0, 100).forEach((path, pathIdx) => {
          point[`path${pathIdx}`] = path.values[idx];
        });
      }
      
      return point;
    });
  }, [simulation, showAllPaths]);

  return (
    <div className="monte-carlo-chart-container">
      {/* Main Chart */}
      <div className="monte-carlo-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            
            <YAxis
              scale={useLogScale ? 'log' : 'auto'}
              domain={useLogScale ? ['auto', 'auto'] : ['auto', 'auto']}
              allowDataOverflow={useLogScale}
              tickFormatter={(value) => {
                if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
                return `£${value}`;
              }}
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
            
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(18, 22, 24, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}
              formatter={(value: number, name: string) => {
                const formatted = value.toLocaleString('en-GB', {
                  style: 'currency',
                  currency: 'GBP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                });
                // Map key to label
                const pMatch = name.match(/^p(\d+)$/);
                if (pMatch) {
                  const config = PERCENTILE_CONFIGS.find(c => c.key === parseInt(pMatch[1]));
                  return [formatted, config?.label || name];
                }
                return [formatted, name];
              }}
              labelFormatter={(label) => `Year ${label}`}
            />
            
            {/* Individual paths (semi-transparent) */}
            {showAllPaths && simulation.paths.slice(0, 100).map((_, idx) => (
              <Line
                key={`path${idx}`}
                type="monotone"
                dataKey={`path${idx}`}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={0.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            
            {/* Percentile lines */}
            {PERCENTILE_CONFIGS.map(config => (
              visiblePercentiles.has(config.key) && (
                <Line
                  key={`p${config.key}`}
                  type="monotone"
                  dataKey={`p${config.key}`}
                  name={`p${config.key}`}
                  stroke={config.color}
                  strokeWidth={config.key === 50 ? 3 : 2}
                  dot={{ r: 3, fill: config.color, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: config.color, strokeWidth: 0 }}
                  strokeDasharray={config.key === 50 ? undefined : '5 3'}
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Right-side Controls */}
      <div className="monte-carlo-controls">
        <div className="control-section">
          <h4>Display Lines</h4>
          
          {/* Show all paths toggle */}
          <button
            className={`control-toggle ${showAllPaths ? 'active' : ''}`}
            onClick={() => setShowAllPaths(!showAllPaths)}
          >
            {showAllPaths ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>All Paths</span>
          </button>

          <div className="control-divider" />
          
          {/* Percentile toggles */}
          {PERCENTILE_CONFIGS.map(config => (
            <button
              key={config.key}
              className={`control-toggle ${visiblePercentiles.has(config.key) ? 'active' : ''}`}
              onClick={() => togglePercentile(config.key)}
            >
              <span 
                className="color-dot" 
                style={{ backgroundColor: config.color }}
              />
              <span>{config.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
