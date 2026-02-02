import { useEffect, useMemo, useRef } from 'react';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';

export type DerivedFieldRule<Ctx = Record<string, any>> = {
  targetPath: string;
  deps: string[];

  // compute the next value for targetPath
  compute: (args: { getValues: any; getFieldState: any; formState: any; ctx: Ctx }) => any;

  // if returns false -> skip setting (don’t overwrite user/manual values)
  when?: (args: { getValues: any; getFieldState: any; formState: any; ctx: Ctx }) => boolean;

  // optional
  normalize?: (v: any) => any;
  equals?: (a: any, b: any) => boolean;
  defaultValue?: any;

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
  ctx?: Ctx;
}) {
  const { control, register, setValue, getValues, getFieldState } = useFormContext();
  const formState = useFormState({ control });
  // Accessing dirtyFields ensures RHF subscribes to dirtiness updates (required for getFieldState(...).isDirty)
  void formState.dirtyFields;

  const depNames = useMemo(() => {
    const all = rules.flatMap(r => r.deps);
    return Array.from(new Set(all));
  }, [rules]);

  const depValues = useWatch({
    control,
    name: depNames.length ? (depNames as any) : undefined,
  });

  // Register target paths only once (avoids re-register churn)
  const registeredRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const r of rules) {
      if (!registeredRef.current.has(r.targetPath)) {
        register(r.targetPath);
        registeredRef.current.add(r.targetPath);
      }
    }
  }, [register, rules]);

  useEffect(() => {
    // If you ever return arrays/objects, supply r.equals or r.normalize to stable primitives
    const defaultEquals = (a: any, b: any) => Object.is(a, b);

    const MAX_PASSES = 3;
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let didAnyUpdate = false;

      for (const r of rules) {
        const shouldRun = r.when
          ? r.when({ getValues, getFieldState, formState, ctx: ctx as Ctx })
          : true;
        if (!shouldRun) continue;

        let next = r.compute({ getValues, getFieldState, formState, ctx: ctx as Ctx });

        if (next == null || Number.isNaN(next)) {
          next = r.defaultValue ?? 0;
        }

        const normalize = r.normalize ?? ((v: any) => v);
        const equals = r.equals ?? defaultEquals;

        const curr = normalize(getValues(r.targetPath));
        const nextNorm = normalize(next);

        if (!equals(curr, nextNorm)) {
          setValue(r.targetPath, nextNorm, {
            shouldDirty: r.setValueOptions?.shouldDirty ?? false,
            shouldTouch: r.setValueOptions?.shouldTouch ?? false,
            shouldValidate: r.setValueOptions?.shouldValidate ?? false,
          });
          didAnyUpdate = true;
        }
      }

      if (!didAnyUpdate) break; // settled
    }
  }, [rules, ctx, getValues, setValue, depValues]);
}
