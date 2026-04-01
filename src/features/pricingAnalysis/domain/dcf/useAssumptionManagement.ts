import { useCallback, useEffect, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { getNewId } from '../getNewId';
import { editAssumption } from './editAssumption';

// Example of extracted logic
export function useAssumptionManagement(name: string, getValues, setValue, control) {
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
      method: { id: getNewId(), methodType: null },
    });
    setEditing(newAssumptionId);
  }, [append, fields.length]);

  return {
    fields,
    editing,
    handleOnAddAssumption,
    handleOnRemoveAssumption: remove,
    handleOnOpenEditMode: setEditing,
    handleOnCancelEditMode: () => setEditing(null),
    handleOnSaveEditMode: draft => {
      const nextSections = editAssumption(getValues('sections'), draft);
      setValue('sections', nextSections, {
        shouldDirty: false,
        shouldValidate: true,
      });
    },
  };
}
