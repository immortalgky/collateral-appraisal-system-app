import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import type { ReactNode } from 'react';
import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import { useFormContext } from 'react-hook-form';

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
  const { getValues } = useFormContext();

  // const category = (getValues('sections') ?? []).map(s => s.category);

  return (
    <Modal
      isOpen={!!editing}
      onClose={onCancelEditMode}
      title={`Edit Assumption: ${assumptionName}`}
      size="lg"
    >
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-row gap-1.5">
          <span className={'w-44'}>Category</span>
          <RHFInputCell fieldName={''} inputType={'select'} />
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-44'}>Assumption</span>
          <RHFInputCell fieldName={''} inputType={'select'} />
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-44'}>Method</span>
          <RHFInputCell fieldName={''} inputType={'select'} />
        </div>
      </div>
      {children}

      <div className="flex items-center justify-between mt-4">
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
