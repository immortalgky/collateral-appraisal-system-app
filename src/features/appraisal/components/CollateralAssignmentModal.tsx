import { useState } from 'react';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import clsx from 'clsx';
import { usePropertyStore } from '../store';

interface CollateralAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (collateralId: string) => void;
  selectedCount: number;
  isLoading?: boolean;
}

/**
 * Modal for assigning photos to a collateral property
 */
const CollateralAssignmentModal = ({
  isOpen,
  onClose,
  onAssign,
  selectedCount,
  isLoading = false,
}: CollateralAssignmentModalProps) => {
  const { groups } = usePropertyStore();
  const [selectedCollateralId, setSelectedCollateralId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Flatten all properties from groups
  const allProperties = groups.flatMap(group =>
    group.items.map(item => ({
      ...item,
      groupName: group.name,
    }))
  );

  const handleAssign = () => {
    if (selectedCollateralId) {
      onAssign(selectedCollateralId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="link" className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Assign to Collateral
              </h3>
              <p className="text-sm text-gray-500">
                {selectedCount} photo{selectedCount !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="xmark" className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {allProperties.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="building" className="text-2xl text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No collateral properties available</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Select a collateral property:
              </p>
              {allProperties.map(property => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => setSelectedCollateralId(property.id)}
                  className={clsx(
                    'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4',
                    selectedCollateralId === property.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  )}
                >
                  {/* Property Image */}
                  <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {property.image ? (
                      <img
                        src={property.image}
                        alt={property.address}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon name="image" className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Property Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {property.type}
                      </span>
                      <span className="text-xs text-gray-400">{property.groupName}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {property.address}
                    </p>
                  </div>

                  {/* Selection indicator */}
                  <div
                    className={clsx(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      selectedCollateralId === property.id
                        ? 'bg-primary border-primary'
                        : 'border-gray-300'
                    )}
                  >
                    {selectedCollateralId === property.id && (
                      <Icon name="check" style="solid" className="text-xs text-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAssign}
            disabled={!selectedCollateralId || isLoading}
            isLoading={isLoading}
          >
            <Icon name="link" className="mr-2" />
            Assign Photos
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CollateralAssignmentModal;
