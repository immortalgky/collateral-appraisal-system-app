import { useEffect, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

export type ComputeCtx = {
  rows: any[];
  row: any;
  rowIndex: number;
  getValues: any;
  outScopeFields: Record<string, any>;
};

export type DerivedRule = {
  targetKey: string;
  compute: (ctx: ComputeCtx) => number;
  normalize?: (v: number) => number;
  modifier?: (v: number) => number; // modify final value
};

interface useDerivedFieldArrayProps {
  arrayName: string;
  rules: DerivedRule[];
  outScopeFields?: Record<string, any>;
}

export function useDerivedFieldArray({
  arrayName,
  rules,
  outScopeFields = {},
}: useDerivedFieldArrayProps) {
  const { control, register, setValue, getValues } = useFormContext();

  // defaultValue prevents “stale last value” when array becomes empty/unregistered
  const watchRows = useWatch({ control, name: arrayName, defaultValue: [] }) as any[];

  const outNames = useMemo(() => Object.values(outScopeFields), [outScopeFields]);
  const outVals = useWatch({
    control,
    name: outNames,
    defaultValue: [],
  }) as any[];

  const watchOutFields = useMemo(() => {
    return Object.fromEntries(Object.keys(outScopeFields).map((k, i) => [k, outVals[i]]));
  }, [outScopeFields, outVals]);

  // Register derived targets (only when row count changes)
  useEffect(() => {
    for (let i = 0; i < watchRows.length; i++) {
      for (const r of rules) {
        register(`${arrayName}.${i}.${r.targetKey}`);
      }
    }
  }, [arrayName, register, watchRows.length, rules]);

  useEffect(() => {
    const liveRows = (getValues(arrayName) ?? []) as any[];
    const liveLen = liveRows.length;

    if (!liveLen || !rules.length) return;

    // IMPORTANT: iterate only over liveLen (not stale watchRows length)
    for (let rowIndex = 0; rowIndex < liveLen; rowIndex++) {
      const row = liveRows[rowIndex]; // or watchRows[rowIndex] if you want
      for (const r of rules) {
        const path = `${arrayName}.${rowIndex}.${r.targetKey}`;

        const ctx = { rows: liveRows, row, rowIndex, getValues, outScopeFields: watchOutFields };
        let nextRaw = r.compute(ctx);

        if (nextRaw == null || (typeof nextRaw === 'number' && Number.isNaN(nextRaw))) nextRaw = 0;

        const normalize = r.normalize ?? ((v: any) => v);
        const next = normalize(nextRaw);
        const curr = normalize(getValues(path));

        // ✅ extra safety: if array shrank during this run, skip
        const stillLiveLen = ((getValues(arrayName) ?? []) as any[]).length;
        if (rowIndex >= stillLiveLen) continue;

        if (curr !== next) {
          setValue(path, next, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
        }
      }
    }
  }, [arrayName, watchRows, rules, setValue, getValues, watchOutFields]);
}
