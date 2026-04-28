import { useCallback, useEffect, useRef, useState } from 'react';
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
  onStructuralChange?: () => void;
}

export function useAssumptionManagement({
  name,
  getValues,
  setValue,
  control,
  onStructuralChange,
}: UseAssumptionManagementProps) {
  const { append, remove, fields } = useFieldArray({
    control,
    name: `${name}.assumptions`,
  });

  const [editing, setEditing] = useState<string | null>(null);
  const pendingNewClientIdRef = useRef<string | null>(null);

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
    pendingNewClientIdRef.current = newAssumptionId;
    setEditing(newAssumptionId);
    onStructuralChange?.();
  }, [append, fields.length, onStructuralChange]);

  const handleOnRemoveAssumption = useCallback(
    (index: number) => {
      const assumptions = getValues(`${name}.assumptions`) as DCFAssumption[] | undefined;
      const assumption = assumptions?.[index];
      if (assumption && editing === assumption.clientId) setEditing(null);

      remove(index);

      // re-pack displaySeq
      const remaining = (getValues(`${name}.assumptions`) as DCFAssumption[]) ?? [];
      remaining.forEach((_a, i) => {
        setValue(`${name}.assumptions.${i}.displaySeq`, i, {
          shouldDirty: false,
          shouldValidate: false,
        });
      });
      onStructuralChange?.();
    },
    [getValues, name, editing, remove, onStructuralChange, setValue],
  );

  return {
    fields,
    editing,
    activeAssumption,
    handleOnAddAssumption,
    handleOnRemoveAssumption,
    handleOnOpenEditMode: (clientId: string) => {
      pendingNewClientIdRef.current = null;
      setEditing(clientId);
    },
    handleOnCancelEditMode: () => {
      const pendingId = pendingNewClientIdRef.current;
      if (pendingId) {
        const assumptions = getValues(`${name}.assumptions`) as DCFAssumption[] | undefined;
        const idx = assumptions?.findIndex(a => a.clientId === pendingId) ?? -1;
        if (idx >= 0) remove(idx);
        pendingNewClientIdRef.current = null;
      }
      setEditing(null);
    },
    handleOnSaveEditMode: (draft: Parameters<typeof editAssumption>[1]) => {
      const nextSections = editAssumption(getValues('sections'), draft);
      setValue('sections', nextSections, {
        shouldDirty: false,
        shouldValidate: true,
      });
      pendingNewClientIdRef.current = null;
      onStructuralChange?.();
    },
  };
}
