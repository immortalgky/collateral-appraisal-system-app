import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, type UseFormGetValues, type UseFormSetValue } from 'react-hook-form';
import { getNewId } from '../getNewId';
import { editAssumption } from './editAssumption';
import { createDefaultMethod } from '@features/pricingAnalysis/domain/dcf/createEmptyMethodDetail.ts';
import type { DCFAssumption } from '@features/pricingAnalysis/types/dcf.ts';

// Example of extracted logic
interface UseAssumptionManagementProps {
  name: string;
  getValues: UseFormGetValues<any>;
  setValue: UseFormSetValue<any>;
  control: any;
}
export function useAssumptionManagement({
  name,
  getValues,
  setValue,
  control,
}: UseAssumptionManagementProps) {
  const { append, remove, fields } = useFieldArray({
    control,
    name: `${name}.assumptions`,
  });

  const [editing, setEditing] = useState<string | null>(null);

  // Encapsulate the complex recalculation logic
  useEffect(() => {
    setValue(`${name}.assumptions`, getValues(`${name}.assumptions`), {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [fields.length, name, setValue, getValues]);

  // All the handler functions
  const handleOnAddAssumption = useCallback(() => {
    const newAssumptionId = getNewId();
    append({
      clientId: newAssumptionId,
      assumptionType: null,
      displaySeq: fields.length,
      method: {
        ...createDefaultMethod('14', getNewId()),
        methodType: null,
        detail: null,
      },
    });
    setEditing(newAssumptionId);
  }, [append, fields.length]);

  const handleOnRemoveAssumption = useCallback(
    (idx: number) => {
      const current = getValues(`${name}.assumptions.${idx}`) as DCFAssumption | undefined;

      if (current?.clientId === editing) {
        setEditing(null);
      }

      remove(idx);
    },
    [remove, getValues, name, editing],
  );

  const activeAssumption = fields
    .map((_, idx) => getValues(`${name}.assumptions.${idx}`) as DCFAssumption)
    .find(a => a?.clientId === editing);

  return {
    fields,
    editing,
    activeAssumption,
    handleOnAddAssumption,
    handleOnRemoveAssumption: handleOnRemoveAssumption,
    handleOnOpenEditMode: setEditing,
    handleOnCancelEditMode: () => setEditing(null),
    handleOnSaveEditMode: draft => {
      const nextSections = editAssumption(getValues('sections'), draft);
      setValue('sections', nextSections, {
        shouldDirty: false,
        shouldValidate: true,
      });
      console.log(nextSections);
    },
  };
}
