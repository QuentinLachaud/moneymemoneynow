/**
 * ColumnToggle — Annual/Monthly column visibility toggle
 */

import { SegmentedToggle } from '@quentinlachaud/app-component-library';

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
  // Determine current value based on state
  const currentValue = showAnnual && showMonthly ? 'both' : showAnnual ? 'annual' : 'monthly';
  
  return (
    <div className="column-toggle">
      <SegmentedToggle
        options={[
          { value: 'annual', label: 'Annual' },
          { value: 'monthly', label: 'Monthly' },
        ]}
        value={currentValue === 'monthly' ? 'monthly' : 'annual'}
        onChange={(v) => {
          if (v === 'annual' && !showAnnual) onToggleAnnual();
          if (v === 'annual' && showMonthly) onToggleMonthly();
          if (v === 'monthly' && !showMonthly) onToggleMonthly();
          if (v === 'monthly' && showAnnual) onToggleAnnual();
        }}
        size="sm"
      />
    </div>
  );
}
