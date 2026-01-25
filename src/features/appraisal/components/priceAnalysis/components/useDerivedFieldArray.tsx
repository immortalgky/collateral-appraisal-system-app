import { useEffect, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

export type DerivedFieldRule<Ctx = Record<string, any>> = {
  targetPath: string; // e.g. "WQSFinalValue.finalValue"
  deps: string[]; // recompute on these watch paths
  compute: (args: { getValues: any; ctx: Ctx }) => any;
  normalize?: (v: any) => any;
  setValueOptions?: {
    shouldDirty?: boolean;
    shouldTouch?: boolean;
    shouldValidate?: boolean;
  };
};

export function useDerivedFields<Ctx = Record<string, any>>({
  rules,
  ctx,
}: {
  rules: DerivedFieldRule<Ctx>[];
  ctx: Ctx;
}) {
  const { control, register, setValue, getValues } = useFormContext();

  const depNames = useMemo(() => {
    const all = rules.flatMap(r => r.deps);
    return Array.from(new Set(all));
  }, [rules]);

  // trigger recompute when deps change
  useWatch({ control, name: depNames as any, defaultValue: [] });

  // register target paths once
  useEffect(() => {
    for (const r of rules) register(r.targetPath);
  }, [register, rules]);

  useEffect(() => {
    for (const r of rules) {
      let next = r.compute({ getValues, ctx });
      if (next == null || Number.isNaN(next)) next = 0;

      const normalize = r.normalize ?? ((v: any) => v);
      const curr = normalize(getValues(r.targetPath));
      const nextNorm = normalize(next);

      if (curr !== nextNorm) {
        setValue(r.targetPath, nextNorm, {
          shouldDirty: r.setValueOptions?.shouldDirty ?? false,
          shouldTouch: r.setValueOptions?.shouldTouch ?? false,
          shouldValidate: r.setValueOptions?.shouldValidate ?? false,
        });
      }
    }
  }, [rules, ctx, getValues, setValue]);
}
