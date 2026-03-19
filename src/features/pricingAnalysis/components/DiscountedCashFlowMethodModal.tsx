import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import type { ReactNode } from 'react';

interface DiscountedCashFlowMethodModalProps {
  editing: string | null;
  onCancelEditMode: () => void;
  assumptionName: string;
  children: ReactNode;
}
export function DiscountedCashFlowMethodModal({
  editing,
  onCancelEditMode,
  assumptionName,
  children,
}: DiscountedCashFlowMethodModalProps) {
  return (
    <Modal
      isOpen={!!editing}
      onClose={onCancelEditMode}
      title={`Edit Assumption: ${assumptionName}`}
      size="lg"
    >
      {children}

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-500">
          {/* {selectedCount > 0 ? `${selectedCount} factor(s) selected` : 'Select factors to add'} */}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancelEditMode}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={false} // disable if mandatory is not key in
            isLoading={false}
            onClick={onCancelEditMode}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
