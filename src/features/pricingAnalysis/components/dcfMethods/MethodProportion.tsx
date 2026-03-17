import Modal from '@/shared/components/Modal';
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { DCFMethodFormType } from '../../schemas/dcfForm';

interface MethodProportionProps {
  editing: string | null;
  assumptionId: string;
  assumptionName: string;
  method: DCFMethodFormType;
  totalNumberOfYears: number;
  onCancelEditMode: () => void;
}
export function MethodProportion({
  editing,
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
      <MethodProportionTable totalNumberOfYear={totalNumberOfYears} />
      {!!editing && (
        <MethodProportionModal
          editing={editing}
          onCancelEditMode={onCancelEditMode}
          assumptionName={assumptionName}
        />
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
      <td className="pl-20 px-1 py-1.5">xxxxx</td>
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
  return (
    <Modal
      isOpen={!!editing}
      onClose={() => onCancelEditMode()}
      title={`Edit Assumption: ${assumptionName}`}
      size="lg"
    >
      <div>Coming soon!</div>
    </Modal>
  );
}
