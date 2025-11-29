/**
 * ModeCard — Selectable card for Percentage/Amount modes
 * 
 * A clickable card with icon and label, no radio buttons
 */

import { ReactNode } from 'react';

interface ModeCardProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function ModeCard({
  icon,
  label,
  active,
  onClick,
}: ModeCardProps) {
  return (
    <div 
      className={`mode-card ${active ? 'active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <span className="mode-icon">{icon}</span>
      <span className="mode-label">{label}</span>
    </div>
  );
}
