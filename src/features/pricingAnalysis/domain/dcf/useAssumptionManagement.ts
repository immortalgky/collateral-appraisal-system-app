import { useCallback, useEffect, useState } from 'react';
import { useFieldArray, type Control } from 'react-hook-form';
import { getNewId } from '../getNewId';
import { editAssumption } from './editAssumption';
import { createDefaultMethod } from './createEmptyMethodDetail';
import type { DCFAssumption } from '../../types/dcf';

interface UseAssumptionManagementProps {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getValues: (path?: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: (path: string, value: any, options?: object) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
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

  useEffect(() => {
    setValue(`${name}.assumptions`, getValues(`${name}.assumptions`), {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [fields.length, name, setValue, getValues]);

  const activeAssumption: DCFAssumption | null = editing
    ? ((getValues(`${name}.assumptions`) as DCFAssumption[] | undefined)?.find(
        a => a.clientId === editing,
      ) ?? null)
    : null;

  const handleOnAddAssumption = useCallback(() => {
    const newAssumptionId = getNewId();
    append({
      clientId: newAssumptionId,
      assumptionType: null,
      displaySeq: fields.length,
      method: createDefaultMethod('13'),
    });
    setEditing(newAssumptionId);
  }, [append, fields.length]);

  const handleOnRemoveAssumption = useCallback(
    (index: number) => {
      const assumptions = getValues(`${name}.assumptions`) as DCFAssumption[] | undefined;
      const assumption = assumptions?.[index];
      if (assumption && editing === assumption.clientId) {
        setEditing(null);
      }
      remove(index);
    },
    [remove, getValues, name, editing],
  );

  return {
    fields,
    editing,
    activeAssumption,
    handleOnAddAssumption,
    handleOnRemoveAssumption,
    handleOnOpenEditMode: setEditing,
    handleOnCancelEditMode: () => setEditing(null),
    handleOnSaveEditMode: (draft: Parameters<typeof editAssumption>[1]) => {
      const nextSections = editAssumption(getValues('sections'), draft);
      setValue('sections', nextSections, {
        shouldDirty: false,
        shouldValidate: true,
      });
    },
  };
}
