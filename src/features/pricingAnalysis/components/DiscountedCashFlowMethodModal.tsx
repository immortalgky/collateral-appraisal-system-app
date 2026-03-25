import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import type { ReactNode } from 'react';
import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import { useFormContext } from 'react-hook-form';
import { assumptionParams, categoryParams, methodParams } from '../data/dcfParameters';

interface DiscountedCashFlowMethodModalProps {
  name: string;
  editing: string | null;
  onCancelEditMode: () => void;
  assumptionName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  children: ReactNode;
}
export function DiscountedCashFlowMethodModal({
  name,
  editing,
  onCancelEditMode,
  assumptionName,
  size,
  children,
}: DiscountedCashFlowMethodModalProps) {
  const { getValues } = useFormContext();

  return (
    <Modal
      isOpen={!!editing}
      onClose={onCancelEditMode}
      title={`Edit Assumption: ${assumptionName}`}
      size={size ?? 'lg'}
    >
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-row gap-1.5">
          <span className={'w-44'}>Category</span>
          <RHFInputCell
            fieldName={`${name.split('.assumptions')?.[0]}.categoryType`}
            inputType={'select'}
            options={categoryParams.map(c => ({
              value: c.code,
              label: c.description,
            }))}
          />
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-44'}>Assumption</span>
          <RHFInputCell
            fieldName={`${name.split('.method')?.[0]}.assumptionType`}
            inputType={'select'}
            options={assumptionParams.map(a => ({ value: a.code, label: a.description }))}
          />
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-44'}>Method</span>
          <RHFInputCell
            fieldName={`${name}.methodType`}
            inputType={'select'}
            options={methodParams.map(m => ({ value: m.code, label: m.description }))}
          />
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
