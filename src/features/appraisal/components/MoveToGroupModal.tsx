import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import type { PropertyGroup } from '../types';
import { useState } from 'react';
import Icon from '@shared/components/Icon';

interface MoveToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (targetGroupId: string) => void;
  groups: PropertyGroup[];
  currentGroupId: string;
  isLoading?: boolean;
}

export const MoveToGroupModal = ({
  isOpen,
  onClose,
  onSubmit,
  groups,
  currentGroupId,
  isLoading = false,
}: MoveToGroupModalProps) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const availableGroups = groups.filter((group) => group.id !== currentGroupId);

  const handleSubmit = () => {
    if (selectedGroupId) {
      onSubmit(selectedGroupId);
      setSelectedGroupId('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedGroupId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Move to Group" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select the group where you want to move this property:
        </p>

        {/* Group List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availableGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Icon name="folder-open" className="text-4xl mb-2" />
              <p className="text-sm">No other groups available</p>
            </div>
          ) : (
            availableGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`w-full p-4 border rounded-lg text-left transition-colors ${
                  selectedGroupId === group.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{group.name}</h3>
                    <p className="text-sm text-gray-500">
                      {group.items.length} item(s)
                    </p>
                  </div>
                  {selectedGroupId === group.id && (
                    <Icon name="circle-check" className="text-blue-500" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={!selectedGroupId || isLoading}
          >
            {isLoading ? 'Moving...' : 'Move Property'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
