/**
 * ColumnToggle — Annual/Monthly column visibility toggle
 */

interface ColumnToggleProps {
  showAnnual: boolean;
  showMonthly: boolean;
  onToggleAnnual: () => void;
  onToggleMonthly: () => void;
}

export function ColumnToggle({
  showAnnual,
  showMonthly,
  onToggleAnnual,
  onToggleMonthly,
}: ColumnToggleProps) {
  return (
    <div className="column-toggle">
      <button
        className={`toggle-chip ${showAnnual ? 'active' : ''}`}
        onClick={onToggleAnnual}
      >
        Annual
      </button>
      <button
        className={`toggle-chip ${showMonthly ? 'active' : ''}`}
        onClick={onToggleMonthly}
      >
        Monthly
      </button>
    </div>
  );
}
