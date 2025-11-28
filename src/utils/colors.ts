/**
 * colors.ts — Color palette for charts and account visualization
 *
 * USAGE:
 * - Import PALETTE for direct array access
 * - Use getColorForId() for consistent account-to-color mapping
 *
 * CUSTOMIZATION:
 * - To change colors: modify the PALETTE array
 * - To add more colors: extend PALETTE (hash will use all)
 */

/** Color palette for accounts and chart elements */
const PALETTE = [
  '#2563eb', // blue-600
  '#16a34a', // green-600
  '#ea580c', // orange-600
  '#db2777', // pink-600
  '#7c3aed', // purple-600
  '#e11d48', // rose-600
  '#0ea5e9', // sky-500
  '#64748b', // slate-500
];

/**
 * Get a consistent color for an account ID
 *
 * @param id - Account ID (string or number)
 * @returns Hex color from PALETTE
 *
 * Uses hash function to always return same color for same ID
 */
export function getColorForId(id: string | number): string {
  const key = String(id);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % PALETTE.length;
  return PALETTE[idx];
}

export default PALETTE;
