import { useEffect, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

export type ComputeCtx<Ctx = Record<string, any>, Row = any> = {
  rows: Row[];
  row: Row;
  rowIndex: number;
  getValues: any;
  ctx: Ctx; // merged: { ...plainCtx, ...watchedValues }
};

export type DerivedRule<Ctx = Record<string, any>, Row = any> = {
  targetKey: string;
  compute: (ctx: ComputeCtx<Ctx, Row>) => number;
  normalize?: (v: number) => number;

  // allow tuning behavior per field
  setValueOptions?: {
    shouldDirty?: boolean;
    shouldTouch?: boolean;
    shouldValidate?: boolean;
  };
};

type WatchMap = Record<string, string>; // key -> formPath

interface UseDerivedFieldArrayProps<Ctx = Record<string, any>, Row = any> {
  arrayName: string;
  rules: DerivedRule<Ctx, Row>[];
  watch?: WatchMap; // watched external form fields
  ctx?: Partial<Ctx>; // constants / other variables
}

export function useDerivedFieldArray<Row = any, Ctx = Record<string, any>>({
  arrayName,
  rules,
  watch = {},
  ctx = {},
}: UseDerivedFieldArrayProps<Ctx, Row>) {
  const { control, register, setValue, getValues } = useFormContext();

  // Watch rows so recompute happens on relevant row changes
  const watchRows = useWatch({ control, name: arrayName, defaultValue: [] }) as Row[];

  // Watch external form paths
  const watchNames = useMemo(() => Object.values(watch), [watch]);
  const watchedValues = useWatch({ control, name: watchNames, defaultValue: [] }) as any[];

  const watchObj = useMemo(() => {
    const keys = Object.keys(watch);
    return Object.fromEntries(keys.map((k, i) => [k, watchedValues[i]]));
  }, [watch, watchedValues]);

  // merged ctx (plain vars + watched form values)
  const mergedCtx = useMemo(
    () => ({ ...(ctx as any), ...(watchObj as any) }) as Ctx,
    [ctx, watchObj],
  );

  // Register derived targets when row count changes
  useEffect(() => {
    for (let i = 0; i < watchRows.length; i++) {
      for (const r of rules) {
        register(`${arrayName}.${i}.${r.targetKey}`);
      }
    }
  }, [arrayName, register, watchRows.length, rules]);

  useEffect(() => {
    const liveRows = (getValues(arrayName) ?? []) as Row[];
    const liveLen = liveRows.length;
    if (!liveLen || !rules.length) return;

    for (let rowIndex = 0; rowIndex < liveLen; rowIndex++) {
      const row = liveRows[rowIndex];
      for (const r of rules) {
        const path = `${arrayName}.${rowIndex}.${r.targetKey}`;
        const computeCtx: ComputeCtx<Ctx, Row> = {
          rows: liveRows,
          row,
          rowIndex,
          getValues,
          ctx: mergedCtx,
        };

        let nextRaw = r.compute(computeCtx);
        if (nextRaw == null || (typeof nextRaw === 'number' && Number.isNaN(nextRaw))) nextRaw = 0;

        const normalize = r.normalize ?? ((v: any) => v);
        const next = normalize(nextRaw);
        const curr = normalize(getValues(path));

        // if array shrank mid-run, skip
        const stillLiveLen = ((getValues(arrayName) ?? []) as Row[]).length;
        if (rowIndex >= stillLiveLen) continue;

        if (curr !== next) {
          setValue(path, next, {
            shouldDirty: r.setValueOptions?.shouldDirty ?? false,
            shouldTouch: r.setValueOptions?.shouldTouch ?? false,
            shouldValidate: r.setValueOptions?.shouldValidate ?? false,
          });
        }
      }
    }
  }, [arrayName, watchRows, rules, setValue, getValues, mergedCtx]);
}
