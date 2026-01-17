import { useEffect, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

type Alignment = 'horizontal' | 'vertical';

export type ComputeRowCtx<Ctx = Record<string, any>, Row = Record<string, any>> = {
  rows: Row[];
  row: Row;
  rowIndex: number;
  getValues: any;
  ctx: Ctx; // merged: { ...plainCtx, ...watchedValues }
};

export type HorizontalDerivedRule<Ctx = Record<string, any>, Row = Record<string, any>> = {
  alignment: 'horizontal';
  targetKey: keyof Row & string;
  compute: (ctx: ComputeRowCtx<Ctx, Row>) => number;
  normalize?: (v: number) => number;

  setValueOptions?: {
    shouldDirty?: boolean;
    shouldTouch?: boolean;
    shouldValidate?: boolean;
  };
};

export type ComputeColumnCtx<Ctx = Record<string, any>, Column = Record<string, any>> = {
  columns: Column[];
  column: Column;
  columnIndex: number;
  getValues: any;
  ctx: Ctx;
};

export type VerticalDerivedRule<Ctx = Record<string, any>, Column = Record<string, any>> = {
  alignment: 'vertical';
  targetKey: keyof Column & string;
  compute: (ctx: ComputeColumnCtx<Ctx, Column>) => number;
  normalize?: (v: number) => number;

  setValueOptions?: {
    shouldDirty?: boolean;
    shouldTouch?: boolean;
    shouldValidate?: boolean;
  };
};

export type DerivedRule<Ctx = Record<string, any>, T = Row | Column> =
  | HorizontalDerivedRule<Ctx, T>
  | VerticalDerivedRule<Ctx, T>;

export type Row = Record<string, any>;
export type Column = Record<string, any>;

interface UseDerivedFieldArrayProps<Ctx = Record<string, any>, T = Row | Column> {
  dataAlignment: Alignment;
  arrayName: string;
  rules: DerivedRule<Ctx, T>[];
  mergedCtx: Ctx;
}

export function useDerivedFieldArray<Ctx = Record<string, any>, T = Row | Column>({
  dataAlignment,
  arrayName,
  rules,
  mergedCtx,
}: UseDerivedFieldArrayProps<Ctx, T>) {
  const { control, register, setValue, getValues } = useFormContext();

  // Watch data so recompute happens on relevant row / column changes
  const watchData = useWatch({ control, name: arrayName, defaultValue: [] }) as Row[];

  // Register derived targets when row count changes
  useEffect(() => {
    for (let i = 0; i < watchData.length; i++) {
      for (const r of rules) {
        register(`${arrayName}.${i}.${r.targetKey}`);
      }
    }
  }, [arrayName, register, watchData.length, rules]);

  useEffect(() => {
    const liveRows = (getValues(arrayName) ?? []) as Row[];
    const liveLen = liveRows.length;
    if (!liveLen || !rules.length) return;

    for (let rowIndex = 0; rowIndex < liveLen; rowIndex++) {
      const row = liveRows[rowIndex];
      for (const r of rules) {
        const path = `${arrayName}.${rowIndex}.${r.targetKey}`;

        if (r.alignment !== dataAlignment) continue;

        let nextRaw: number;
        if (r.alignment === 'horizontal') {
          const computeCtx: ComputeRowCtx<Ctx, T> = {
            rows: liveRows,
            row: row,
            rowIndex,
            getValues,
            ctx: mergedCtx,
          };
          nextRaw = r.compute(computeCtx);
        } else {
          const computeCtx: ComputeColumnCtx<Ctx, T> = {
            columns: liveRows,
            column: row,
            columnIndex: rowIndex,
            getValues,
            ctx: mergedCtx,
          };
          nextRaw = r.compute(computeCtx);
        }
        if (nextRaw == null || Number.isNaN(nextRaw)) nextRaw = 0;

        const normalize = r.normalize ?? ((v: any) => v);
        const currRaw = getValues(path);
        const curr = normalize(currRaw == null || currRaw === '' ? 0 : Number(currRaw));
        const next = normalize(nextRaw);

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
  }, [arrayName, dataAlignment, watchData, rules, setValue, getValues, mergedCtx]);
}
