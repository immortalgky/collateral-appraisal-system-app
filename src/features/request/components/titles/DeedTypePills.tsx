import clsx from 'clsx';
import { get, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { FormField } from '@/shared/components/form';
import { evaluateConditions } from '@/shared/components/form/conditions';
import { useFormReadOnly } from '@/shared/components/form/context';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';

/** Left to right: the common papers first, the catch-alls last. */
const PILL_ORDER = ['DEED', 'NS3K', 'NS3', 'NS3KO', 'POSR', 'OTHER'] as const;

const DOT: Record<string, string> = {
  DEED: 'bg-[#D69BA1]',
  NS3K: 'bg-[#7FBF95]',
  NS3: 'bg-[#AEB5BA]',
  NS3KO: 'bg-[#AEB5BA]',
};

interface DeedTypePillsProps {
  index: number;
  /** The `titleType` field's config: where "required" comes from, so it follows the config as always. */
  field?: FormField;
  /** Fields whose visibility depends on the deed type; the ones the new type hides are cleared. */
  dependents?: readonly FormField[];
  /**
   * The types on offer, where a kind of title takes only some of them (a condominium: just the
   * โฉนด). A value already saved outside the list is still shown, so it is never hidden, and is
   * left alone until the user picks something else.
   */
  codes?: readonly string[];
}

/**
 * The title type as one-click pills instead of a dropdown. It writes the same `titleType` the
 * dropdown did. Picking a type clears the position fields that type does not carry, the same
 * thing the form does when a field is hidden (`clearOnHide`) — here done by hand, since the deed
 * paper view mounts no form fields to do it.
 */
export function DeedTypePills({ index, field, dependents = [], codes }: DeedTypePillsProps) {
  const { t } = useTranslation('request');
  const readOnly = useFormReadOnly();
  const params = useParametersByGroup('DeedType');
  const { setValue, getValues, formState } = useFormContext();
  const path = `titles.${index}.titleType`;
  const value = useWatch({ name: path }) as string | undefined;
  const collateralType = useWatch({ name: `titles.${index}.collateralType` }) as string | undefined;

  const required = field?.requiredWhen
    ? evaluateConditions(field.requiredWhen, { collateralType }, '')
    : !!field?.required;
  const error = get(formState.errors, path)?.message as string | undefined;

  const offered: readonly string[] =
    codes && value && !codes.includes(value) ? [...codes, value] : (codes ?? PILL_ORDER);

  const choose = (code: string) => {
    if (readOnly || code === value) return;
    setValue(path, code, { shouldDirty: true, shouldValidate: formState.isSubmitted });
    const next = { ...(getValues(`titles.${index}`) as Record<string, unknown>), titleType: code };
    for (const dependent of dependents) {
      if (!dependent.showWhen || dependent.clearOnHide === false) continue;
      if (evaluateConditions(dependent.showWhen, next, '')) continue;
      const cleared = dependent.hiddenValue ?? null;
      const name = `titles.${index}.${dependent.name}`;
      if (getValues(name) !== cleared) setValue(name, cleared, { shouldDirty: false });
    }
  };

  return (
    <div data-field={path} className="grid gap-1.5">
      <div className="text-xs font-medium text-gray-700">
        {t('fields.titleType')}
        {required && !readOnly && <span className="ml-0.5 text-danger">*</span>}
      </div>
      <div role="group" aria-label={t('fields.titleType')} className="flex flex-wrap gap-1.5">
        {offered.map(code => {
          const active = value === code;
          return (
            <button
              key={code}
              type="button"
              aria-pressed={active}
              disabled={readOnly}
              onClick={() => choose(code)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors disabled:cursor-default',
                active
                  ? 'border-primary bg-primary font-medium text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-white',
              )}
            >
              <i
                aria-hidden
                className={clsx('inline-block size-2 rounded-full', DOT[code] ?? 'bg-[#93B4D8]')}
              />
              {params.find(p => p.code === code)?.description ?? code}
            </button>
          );
        })}
      </div>
      {error && <div className="text-xs text-danger">{error}</div>}
    </div>
  );
}
