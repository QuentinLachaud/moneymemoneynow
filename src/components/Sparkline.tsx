/**
 * Sparkline — Mini line chart showing account projection trend
 *
 * DISPLAYS:
 * - Small SVG polyline showing value growth over time
 * - Used in account cards in the bottom strip
 *
 * PROPS:
 * - account: Account to calculate projections for
 * - years: Number of years to project (default: 10)
 * - color: Line color (default: #666)
 * - width/height: SVG dimensions (default: 80x24)
 *
 * CUSTOMIZATION:
 * - To change line style: modify strokeWidth, strokeLinejoin, strokeLinecap
 * - To add fill: add a polygon element below the polyline
 * - To add dots: add circle elements at each point
 */

import { calculateAccountValue } from '../utils/calculations';
import { Account } from '../App';

interface Props {
  account: Account;
  years?: number;
  color?: string;
  width?: number;
  height?: number;
}

export default function Sparkline({
  account,
  years = 10,
  color = '#666',
  width = 80,
  height = 24,
}: Props) {
  // Calculate projected values for each year
  const values: number[] = [];
  for (let y = 0; y <= years; y++) {
    values.push(calculateAccountValue(account, y));
  }

  // Normalize values to fit within SVG bounds
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Convert values to SVG polyline points
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
