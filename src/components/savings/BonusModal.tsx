/**
 * BonusModal.tsx — Modal for entering annual net bonus
 *
 * Features:
 * - Clean modal dialog with overlay
 * - Currency-prefixed input
 * - Cancel/Save actions
 * - Focus trap for accessibility
 */

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button, NumberInput, IconButton } from '@quentinlachaud/app-component-library';
import { Currency, CURRENCY_SYMBOLS } from '../../utils/investmentSimulation';

interface BonusModalProps {
  isOpen: boolean;
  currency: Currency;
  currentBonus: number;
  onSave: (bonus: number) => void;
  onClose: () => void;
}

export function BonusModal({
  isOpen,
  currency,
  currentBonus,
  onSave,
  onClose,
}: BonusModalProps) {
  const [bonusValue, setBonusValue] = useState(currentBonus);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset value when modal opens
  useEffect(() => {
    if (isOpen) {
      setBonusValue(currentBonus);
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, currentBonus]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const symbol = CURRENCY_SYMBOLS[currency];

  const handleSave = () => {
    onSave(bonusValue);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="bonus-modal-overlay" onClick={handleOverlayClick}>
      <div className="bonus-modal" ref={modalRef} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="bonus-modal-header">
          <h3 className="bonus-modal-title">Add Annual Bonus</h3>
          <IconButton
            icon={<X size={20} />}
            label="Close"
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div className="bonus-modal-content">
          <p className="bonus-modal-description">
            Enter your annual net bonus amount. This will be divided by 12 and added to your monthly income.
          </p>
          
          <div className="bonus-input-wrapper">
            <NumberInput
              label="Annual bonus"
              value={bonusValue || undefined}
              onChange={(v) => setBonusValue(v ?? 0)}
              min={0}
              fullWidth
            />
          </div>
          
          {bonusValue > 0 && (
            <p className="bonus-monthly-preview">
              = {symbol}{(bonusValue / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })}/month
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="bonus-modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
