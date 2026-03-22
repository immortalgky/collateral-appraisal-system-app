import Modal from '@/shared/components/Modal';
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { DCFMethodFormType } from '../../schemas/dcfForm';
import { DiscountedCashFlowMethodModal } from '../DiscountedCashFlowMethodModal';

interface MethodProportionProps {
  editing: string | null;
  expanded: boolean;
  assumptionId: string;
  assumptionName: string;
  method: DCFMethodFormType;
  totalNumberOfYears: number;
  onCancelEditMode: () => void;
}
export function MethodProportion({
  editing,
  expanded,
  assumptionId,
  assumptionName,
  method,
  totalNumberOfYears,
  onCancelEditMode,
}: MethodProportionProps) {
  const { control } = useFormContext();
  const { fields } = useFieldArray({ control, name: '' });

  return (
    <>
      {expanded && <MethodProportionTable totalNumberOfYear={totalNumberOfYears} />}
      {editing == method.methodType && (
        <DiscountedCashFlowMethodModal
          editing={editing}
          onCancelEditMode={onCancelEditMode}
          assumptionName={assumptionName}
        >
          <MethodProportionModal
            editing={editing}
            onCancelEditMode={onCancelEditMode}
            assumptionName={assumptionName}
          />
        </DiscountedCashFlowMethodModal>
      )}
    </>
  );
}

interface MethodProportionTable {
  totalNumberOfYear: number;
}
function MethodProportionTable({ totalNumberOfYear }: MethodProportionTable) {
  return (
    <tr>
      <td className="pl-20 px-1 py-1.5">Total</td>
      {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
        return (
          <td key={idx} className="text-right">
            {idx}
          </td>
        );
      })}
    </tr>
  );
}

function MethodProportionModal({
  editing,
  onCancelEditMode,
  assumptionName,
}: {
  editing: string | null;
  onCancelEditMode: () => void;
  assumptionName: string;
}) {
  return <div>Coming soon!</div>;
}
