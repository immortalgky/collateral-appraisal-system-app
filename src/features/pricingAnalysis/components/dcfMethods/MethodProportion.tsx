import Modal from '@/shared/components/Modal';
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { DCFMethodFormType } from '../../schemas/dcfForm';
import { DiscountedCashFlowMethodModal } from '../DiscountedCashFlowMethodModal';
import type { DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';
import { RHFInputCell } from '../table/RHFInputCell';

interface MethodProportionProps {
  name: string;
  editing: string | null;
  expanded: boolean;
  assumptionId: string;
  assumptionName: string;
  method: DCFMethodFormType;
  totalNumberOfYears: number;
  onCancelEditMode: () => void;
}
export function MethodProportion({
  name = '',
  editing,
  expanded,
  assumptionId,
  assumptionName,
  method,
  totalNumberOfYears,
  onCancelEditMode,
}: MethodProportionProps) {
  const { control } = useFormContext();
  const { fields } = useFieldArray({ control, name: name });

  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
      return [
        {
          targetPath: 'total',
          deps: [],
          compute: ({ value, getValues }) => {
            return 0;
          },
        },
      ];
    });
  }, [fields]);

  return (
    <>
      {expanded && <MethodProportionTable totalNumberOfYear={totalNumberOfYears} />}
      {editing == method.methodType && (
        <DiscountedCashFlowMethodModal
          editing={editing}
          onCancelEditMode={onCancelEditMode}
          assumptionName={assumptionName}
        >
          <MethodProportionModal name={`${name}.detail`} />
        </DiscountedCashFlowMethodModal>
      )}
    </>
  );
}

interface MethodProportionTable {
  name: string;
  totalNumberOfYear: number;
}
function MethodProportionTable({ name, totalNumberOfYear }: MethodProportionTable) {
  return (
    <>
      <tr>
        <td className="pl-20 px-1 py-1.5">Total</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right">
              <div className="flex flex-row justify-between items-center">
                <RHFInputCell fieldName={`${name}.totalMethodValues.${idx}`} inputType="display" />
                <RHFInputCell fieldName="" inputType="display" />
              </div>
            </td>
          );
        })}
      </tr>
    </>
  );
}

function MethodProportionModal({ name = '' }: { name: string }) {
  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex flex-row gap-1.5">
        <span className={'w-44'}>Proportions</span>
        <RHFInputCell fieldName={`${name}.proportionPct`} inputType={'number'} />
      </div>
      <div className="flex flex-row gap-1.5">
        <span className={'w-44'}>% of</span>
        <RHFInputCell fieldName={`${name}.assumptionType`} inputType={'select'} />
      </div>
    </div>
  );
}
