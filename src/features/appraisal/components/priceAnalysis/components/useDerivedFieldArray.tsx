import { useEffect, useMemo, useRef } from 'react';
import type {
  FieldValues,
  FormState,
  UseFormGetFieldState,
  UseFormGetValues,
} from 'react-hook-form';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';

/**
 * Describes how to derive (compute) a form field from other form fields.
 *
 * The rule itself is pure: it only *computes* a value.
 * The hook (`useDerivedFields`) applies the side effect by calling RHF `setValue`
 * for `targetPath` when dependencies change.
 *
 * Concepts:
 * - `targetPath`: the field written by this rule.
 * - `deps`: the fields that trigger re-computation (watched via RHF).
 *
 * Overwrite policy:
 * - Use `when` to prevent overwriting manual user edits.
 *   Common pattern: only write when target is empty OR not dirty.
 *
 * Stability:
 * - Use `normalize` and/or `equals` to avoid unnecessary writes.
 *   This is important for floats (rounding) and objects/arrays (reference equality).
 *
 * Failure handling:
 * - If `compute` returns `null`, `undefined`, or `NaN`, the hook will write `defaultValue` (or 0).
 *
 * Example:
 * ```ts
 * const rule: DerivedFieldRule = {
 *   targetPath: "total",
 *   deps: ["a", "b"],
 *   compute: ({ getValues }) => (getValues("a") ?? 0) + (getValues("b") ?? 0),
 * };
 * ```
 */
export type DerivedFieldRule<
  Ctx = Record<string, any>,
  TFieldValues extends FieldValues = FieldValues,
  TValue = unknown,
> = {
  /** RHF path that will be written by this rule. */
  targetPath: string;

  /** RHF paths that trigger recomputation when changed. */
  deps: string[];

  /**
   * Computes the next value for `targetPath`.
   * Must be a pure function (no `setValue` inside).
   */
  compute: (args: {
    getValues: UseFormGetValues<TFieldValues>;
    getFieldState: UseFormGetFieldState<TFieldValues>;
    formState: FormState<TFieldValues>;
    ctx: Ctx;
  }) => TValue;

  /**
   * Optional gate to decide whether this rule is allowed to write.
   * Return false to skip (e.g. prevent overwriting dirty fields).
   */
  when?: (args: {
    getValues: UseFormGetValues<TFieldValues>;
    getFieldState: UseFormGetFieldState<TFieldValues>;
    formState: FormState<TFieldValues>;
    ctx: Ctx;
  }) => boolean;

  /**
   * Optional normalization for comparing current vs next values.
   * Use for rounding numbers or extracting stable primitives.
   */
  normalize?: (v: TValue) => unknown;
  /**
   * Optional equality comparator after normalization.
   * Defaults to `Object.is`.
   *
   * NOTE:
   * Object.is(a, b) checks “same value” (no type 'coercion', e.g. Object.is(1, "1") eqaul to false), similar to ===
   * but with 2 key differences:
   * 1) Object.is(NaN, NaN) === true   (where NaN === NaN is false)
   * 2) Object.is(-0, 0) === false     (where -0 === 0 is true)
   */
  equals?: (a: unknown, b: unknown) => boolean;
  /** Fallback value if compute returns null/undefined/NaN. Defaults to 0. */
  defaultValue?: TValue;

  /** RHF setValue options used when writing derived values. */
  setValueOptions?: {
    shouldDirty?: boolean;
    shouldTouch?: boolean;
    shouldValidate?: boolean;
  };
};

/**
 * Keeps form fields in sync by computing derived values from other fields.
 *
 * Why:
 * - In RHF, some fields are "stored derived state" (they must exist in the form values),
 *   so we compute them whenever dependencies change.
 *
 * Constraints / Invariants:
 * - Must NOT overwrite user edits when a rule's `when` returns false.
 * - Must avoid infinite update loops (watch -> setValue -> watch ...).
 * - Must keep writes stable (normalize/equals) to reduce churn.
 *
 * How it works:
 * - Watches `deps` across all rules (useWatch).
 * - Runs rules in passes until stable (MAX_PASSES) to resolve dependencies between derived fields.
 *
 * Side effects:
 * - Calls RHF `setValue` for target paths.
 *
 * @param rules - Derived rules describing dependencies and computations.
 * @param ctx - Optional shared context used by compute/when functions.
 *
 * Example:
 * ```ts
 * useDerivedFields({
 *   rules: [
 *     {
 *       targetPath: "total",
 *       deps: ["a", "b"],
 *       compute: ({ getValues }) => (getValues("a") ?? 0) + (getValues("b") ?? 0),
 *     }
 *   ]
 * })
 * ```
 */
export function useDerivedFields<
  TFieldValues extends FieldValues = FieldValues,
  Ctx = Record<string, any>,
>({ rules, ctx }: { rules: DerivedFieldRule<Ctx, TFieldValues>[]; ctx?: Ctx }) {
  const { control, register, setValue, getValues, getFieldState } = useFormContext<TFieldValues>();
  const formState = useFormState<TFieldValues>({ control });
  // Accessing dirtyFields ensures RHF subscribes to dirtiness updates (required for getFieldState(...).isDirty)
  void formState.dirtyFields;

  const depNames = useMemo(() => {
    const all = rules.flatMap(r => r.deps);
    return Array.from(new Set(all));
  }, [rules]);

  const depValues = useWatch({
    control,
    name: depNames as any,
  });

  // Register target paths only once (avoids re-register churn)
  const registeredRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const r of rules) {
      if (!registeredRef.current.has(r.targetPath)) {
        register(r.targetPath as any);
        registeredRef.current.add(r.targetPath);
      }
    }
  }, [register, rules]);

  useEffect(() => {
    if (depNames.length === 0) return;

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

        const curr = normalize(getValues(r.targetPath as any));
        const nextNorm = normalize(next);

        if (!equals(curr, nextNorm)) {
          console.log(curr, nextNorm);
          setValue(r.targetPath as any, nextNorm as any, {
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
