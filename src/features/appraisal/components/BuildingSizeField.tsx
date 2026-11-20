import { useId } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { NumberInput } from '@/shared/components';
import { FormFieldShell, FormReadValue } from '@/shared/components/form';
import { useFormReadOnly } from '@/shared/components/form/context';

type SizeName = 'buildingWidth' | 'buildingLength';

const fmt = (v: unknown) => {
  const n = Number(v);
  return v == null || v === '' || !Number.isFinite(n)
    ? '—'
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function SizeInput({ name, label }: { name: SizeName; label: string }) {
  const { t } = useTranslation('common');
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });
  return (
    <NumberInput
      // No ref for RHF: the input takes a `value` prop, and reset() writing into the DOM node
      // behind React's back blanks it.
      name={field.name}
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      aria-label={label}
      decimalPlaces={2}
      maxIntegerDigits={5}
      // the unit inside the box, like any other measurement (the localised `units.m`)
      suffix={t('units.m', { defaultValue: 'm' })}
      error={fieldState.error?.message}
    />
  );
}

// After the floors (3) and the usable area (4) on one row (3 + 4 + 5), full width when the shell is narrow.
const WRAPPER = 'col-span-5';

/**
 * Building width and length as one labelled field, "8.00 × 12.00 m", the way the book prints the
 * size. Still two form values (`buildingWidth`, `buildingLength`); the field configs in
 * configs/fields.ts stay so the schema and the correction labels keep reading them.
 */
export default function BuildingSizeField() {
  const { t } = useTranslation('appraisal');
  const readOnly = useFormReadOnly();
  const labelId = useId();
  const [width, length] = useWatch({ name: ['buildingWidth', 'buildingLength'] }) as unknown[];
  const label = t('forms.building.size.label');
  const unit = t('forms.building.size.unit');

  if (readOnly) {
    const blank = width == null && length == null;
    return (
      <FormFieldShell
        name="buildingWidth"
        label={label}
        wrapperClassName={WRAPPER}
        narrowSpan={12}
        read
      >
        <FormReadValue
          field={{ type: 'text-input', name: 'buildingWidth', label }}
          name="buildingWidth"
          value={blank ? '' : `${fmt(width)} × ${fmt(length)} ${unit}`}
          required={false}
        />
      </FormFieldShell>
    );
  }

  return (
    <FormFieldShell
      name="buildingWidth"
      label={label}
      labelId={labelId}
      wrapperClassName={WRAPPER}
      narrowSpan={12}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SizeInput name="buildingWidth" label={t('forms.building.size.width')} />
        </div>
        <span aria-hidden className="text-sm text-(--palette-ink-2)">
          ×
        </span>
        <div className="min-w-0 flex-1">
          <SizeInput name="buildingLength" label={t('forms.building.size.length')} />
        </div>
      </div>
    </FormFieldShell>
  );
}
