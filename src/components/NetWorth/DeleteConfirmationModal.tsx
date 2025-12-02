/**
 * DeleteConfirmationModal Component
 * 
 * Animated confirmation modal for deleting assets/liabilities
 * Features: fade-in, scale animation, blur effect
 */

import { Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  itemType: 'asset' | 'liability';
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationModal({
  isOpen,
  itemType,
  itemName,
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="delete-confirm-overlay" onClick={onCancel}>
      <div 
        className={`delete-confirm-modal ${itemType}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`delete-icon-wrapper ${itemType}`}>
          <Trash2 size={28} />
        </div>
        
        <h3>Delete {itemType === 'asset' ? 'Asset' : 'Liability'}?</h3>
        
        <p>
          Are you sure you want to delete <strong>"{itemName}"</strong>?
          <br />
          <span className="warning-text">This action cannot be undone.</span>
        </p>
        
        <div className="delete-confirm-actions">
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className={`confirm-btn ${itemType}`} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
