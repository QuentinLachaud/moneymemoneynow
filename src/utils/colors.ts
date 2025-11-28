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

export function getColorForId(id: string | number) {
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
