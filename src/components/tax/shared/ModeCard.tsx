/**
 * ModeCard — Selectable card for Percentage/Amount modes
 */

import { ReactNode } from 'react';

interface ModeCardProps {
  title: string;
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export function ModeCard({
  title,
  isActive,
  onClick,
  children,
  disabled = false,
}: ModeCardProps) {
  return (
    <div 
      className={`mode-card ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="mode-card-header">
        <span className="mode-card-title">{title}</span>
        <div className={`mode-indicator ${isActive ? 'active' : ''}`} />
      </div>
      <div className="mode-card-content">
        {children}
      </div>
    </div>
  );
}
