/**
 * NetWorthPage Component
 * 
 * Main container for the Net Worth tab
 * Manages state and coordinates all sub-components
 */

import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import {
  useNetWorthStore,
  useNetWorth,
  useTotalAssets,
  useTotalLiabilities,
  Asset,
  Liability,
  getAssetTypeLabel,
  getLiabilityTypeLabel,
} from '../../store/useNetWorthStore';

// Components
import { AssetLiabilityModal } from './AssetLiabilityModal';
import { AssetCard } from './AssetCard';
import { LiabilityCard } from './LiabilityCard';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { LiquidityIndexDisplay } from './LiquidityIndexDisplay';
import { NetWorthHeader } from './NetWorthHeader';
import { AssetBarChart } from './AssetBarChart';
import { LiabilityBarChart } from './LiabilityBarChart';
import { AssetPieChart, LiabilityPieChart } from './PieCharts';
import { formatCurrency } from './formatters';

type ModalMode = 'asset' | 'liability';

interface DeleteTarget {
  type: 'asset' | 'liability';
  id: string;
  name: string;
}

export function NetWorthPage() {
  // Store
  const assets = useNetWorthStore((state) => state.assets);
  const liabilities = useNetWorthStore((state) => state.liabilities);
  const addAsset = useNetWorthStore((state) => state.addAsset);
  const updateAsset = useNetWorthStore((state) => state.updateAsset);
  const deleteAsset = useNetWorthStore((state) => state.deleteAsset);
  const addLiability = useNetWorthStore((state) => state.addLiability);
  const updateLiability = useNetWorthStore((state) => state.updateLiability);
  const deleteLiability = useNetWorthStore((state) => state.deleteLiability);
  
  // Computed values
  const netWorth = useNetWorth();
  const totalAssets = useTotalAssets();
  const totalLiabilities = useTotalLiabilities();
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('asset');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  
  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  
  // Open modal for adding
  const openAddModal = useCallback((mode: ModalMode) => {
    setModalMode(mode);
    setEditingAsset(null);
    setEditingLiability(null);
    setIsModalOpen(true);
  }, []);
  
  // Open modal for editing asset
  const handleEditAsset = useCallback((asset: Asset) => {
    setModalMode('asset');
    setEditingAsset(asset);
    setEditingLiability(null);
    setIsModalOpen(true);
  }, []);
  
  // Open modal for editing liability
  const handleEditLiability = useCallback((liability: Liability) => {
    setModalMode('liability');
    setEditingAsset(null);
    setEditingLiability(liability);
    setIsModalOpen(true);
  }, []);
  
  // Close modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingAsset(null);
    setEditingLiability(null);
  }, []);
  
  // Handle mode change in modal
  const handleModeChange = useCallback((mode: ModalMode) => {
    setModalMode(mode);
    setEditingAsset(null);
    setEditingLiability(null);
  }, []);
  
  // Request delete confirmation
  const requestDeleteAsset = useCallback((asset: Asset) => {
    const name = asset.customName || getAssetTypeLabel(asset.type);
    setDeleteTarget({ type: 'asset', id: asset.id, name });
  }, []);
  
  const requestDeleteLiability = useCallback((liability: Liability) => {
    const name = liability.customName || getLiabilityTypeLabel(liability.type);
    setDeleteTarget({ type: 'liability', id: liability.id, name });
  }, []);
  
  // Confirm delete with animation
  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    
    // Trigger deletion animation
    setDeletingItemId(deleteTarget.id);
    
    // Delay actual deletion for animation
    setTimeout(() => {
      if (deleteTarget.type === 'asset') {
        deleteAsset(deleteTarget.id);
      } else {
        deleteLiability(deleteTarget.id);
      }
      setDeletingItemId(null);
      setDeleteTarget(null);
    }, 300);
  }, [deleteTarget, deleteAsset, deleteLiability]);
  
  // Cancel delete
  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);
  
  return (
    <div className="net-worth-page">
      {/* ─── LEFT PANEL: Assets & Liabilities ─────────────────────────── */}
      <div className="nw-left-panel">
        {/* Assets Column */}
        <div className="nw-column">
          <div className="nw-column-header">
            <h3 className="nw-column-title asset">Assets</h3>
            <button 
              className="nw-add-btn asset"
              onClick={() => openAddModal('asset')}
              title="Add Asset"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="nw-items-list">
            {assets.length === 0 ? (
              <div className="nw-empty-state">
                <p>No assets added yet</p>
                <button 
                  className="nw-empty-add-btn asset"
                  onClick={() => openAddModal('asset')}
                >
                  <Plus size={16} /> Add your first asset
                </button>
              </div>
            ) : (
              assets.map(asset => (
                <div 
                  key={asset.id}
                  className={`nw-card-wrapper ${deletingItemId === asset.id ? 'deleting' : ''}`}
                >
                  <AssetCard
                    asset={asset}
                    onEdit={handleEditAsset}
                    onDelete={requestDeleteAsset}
                  />
                </div>
              ))
            )}
          </div>
          
          {assets.length > 0 && (
            <div className="nw-column-total asset">
              <span>Total Assets</span>
              <span className="nw-total-value positive">{formatCurrency(totalAssets)}</span>
            </div>
          )}
        </div>
        
        {/* Liabilities Column */}
        <div className="nw-column">
          <div className="nw-column-header">
            <h3 className="nw-column-title liability">Liabilities</h3>
            <button 
              className="nw-add-btn liability"
              onClick={() => openAddModal('liability')}
              title="Add Liability"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="nw-items-list">
            {liabilities.length === 0 ? (
              <div className="nw-empty-state">
                <p>No liabilities added yet</p>
                <button 
                  className="nw-empty-add-btn liability"
                  onClick={() => openAddModal('liability')}
                >
                  <Plus size={16} /> Add your first liability
                </button>
              </div>
            ) : (
              liabilities.map(liability => (
                <div 
                  key={liability.id}
                  className={`nw-card-wrapper ${deletingItemId === liability.id ? 'deleting' : ''}`}
                >
                  <LiabilityCard
                    liability={liability}
                    onEdit={handleEditLiability}
                    onDelete={requestDeleteLiability}
                  />
                </div>
              ))
            )}
          </div>
          
          {liabilities.length > 0 && (
            <div className="nw-column-total liability">
              <span>Total Liabilities</span>
              <span className="nw-total-value negative">{formatCurrency(-totalLiabilities)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* ─── RIGHT PANEL: Summary & Charts ────────────────────────────── */}
      <div className="nw-right-panel">
        {/* Net Worth Header */}
        <NetWorthHeader netWorth={netWorth} />
        
        {/* Liquidity Index Display */}
        <LiquidityIndexDisplay assets={assets} />
        
        {/* Charts Section */}
        <div className="nw-charts-section">
          {/* Bar Charts Row */}
          <div className="nw-charts-row">
            <AssetBarChart assets={assets} />
            <LiabilityBarChart liabilities={liabilities} />
          </div>
          
          {/* Pie Charts Row */}
          <div className="nw-charts-row">
            <AssetPieChart assets={assets} />
            <LiabilityPieChart liabilities={liabilities} />
          </div>
        </div>
      </div>
      
      {/* ─── MODALS ───────────────────────────────────────────────────── */}
      <AssetLiabilityModal
        isOpen={isModalOpen}
        mode={modalMode}
        editingAsset={editingAsset}
        editingLiability={editingLiability}
        onClose={closeModal}
        onSaveAsset={addAsset}
        onUpdateAsset={updateAsset}
        onSaveLiability={addLiability}
        onUpdateLiability={updateLiability}
        onModeChange={handleModeChange}
      />
      
      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        itemType={deleteTarget?.type ?? 'asset'}
        itemName={deleteTarget?.name ?? ''}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
