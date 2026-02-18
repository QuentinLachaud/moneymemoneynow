/**
 * DeleteConfirmPopover.tsx — Reusable soft confirmation popover for delete actions
 *
 * Used for subcategory and custom section deletion.
 * Non-fullscreen, positioned near the trigger element.
 */

import { useRef, useEffect, ReactNode, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@quentinlachaud/app-component-library';

interface DeleteConfirmPopoverProps {
  /** The trigger element (e.g., a delete button) */
  trigger: ReactNode;
  /** Custom message to display */
  message?: string;
  /** Called when user confirms deletion */
  onConfirm: () => void;
}

export function DeleteConfirmPopover({
  trigger,
  message = 'Are you sure?',
  onConfirm,
}: DeleteConfirmPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    // Delay to avoid immediate close on open click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
    setIsOpen(false);
  };

  return (
    <div className="delete-confirm-wrapper">
      <div 
        ref={triggerRef} 
        onClick={() => setIsOpen(true)}
        className="delete-trigger"
      >
        {trigger}
      </div>
      
      {isOpen && (
        <div className="delete-confirm-popover" ref={popoverRef}>
          <p className="popover-message">{message}</p>
          <div className="popover-actions">
            <Button variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirm}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
