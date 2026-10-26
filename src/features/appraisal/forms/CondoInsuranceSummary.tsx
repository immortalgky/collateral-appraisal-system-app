import { useId } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { NumberInput } from '@/shared/components';
import { FormFieldShell } from '@/shared/components/form';
import { useFormReadOnly } from '@/shared/components/form/context';
import { FormReadValue } from '@/shared/components/form/FormReadValue';
import type { FormField } from '@/shared/components/form';
import { useGetFireInsuranceRates } from '@/shared/api/pricingParameters';

const moneyField = (name: string, label: string): FormField => ({
  type: 'number-input',
  name,
  label,
  decimalPlaces: 2,
});

const money2 = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '-';
};

/**
 * Building Insurance for a condo unit: the derived figure, overridable, with a way back to it.
 *
 * There is nothing to compute here — buildingInsurancePrice is derived and locked server-side from
 * fireInsuranceCode × usableArea, and arrives on the GET. Empty override = use that; a value
 * here is what the appraisal's insurance total sums.
 *
 * Drawn as an ordinary labelled field (a `FormFieldShell` around a NumberInput) so it lays out like
 * its neighbours in either layout. When edited, the note under it offers a way back to the calculated value, as the building
 * cost table does.
 */
export default function CondoInsuranceSummary() {
  const { t } = useTranslation('appraisal');
  const { setValue } = useFormContext();
  const formReadOnly = useFormReadOnly();
  const priceId = useId();
  const overrideId = useId();

  const computed = useWatch({ name: 'buildingInsurancePrice' });
  const override = useWatch({ name: 'buildingInsurancePriceOverride' });

  const isEdited = override != null;

  // The server's formula (CondoFireInsuranceCalculator): RatePerSqm × UsableArea for the chosen
  // condition. Worked out here too so the figure follows the inputs as they change; the server
  // recomputes and stores its own on save, and that is what comes back. Without a rate yet (no
  // condition, or the rates still loading) the stored figure is shown.
  const { data: rates } = useGetFireInsuranceRates();
  const condition = useWatch({ name: 'fireInsuranceCode' });
  const usableArea = useWatch({ name: 'usableArea' });
  const rate = rates?.find(r => r.propertyKind === 'Condo' && r.code === condition);
  // Rounded to the nearest 1,000, as the server stores it. Math.round is half-up, which matches
  // the server's half-away-from-zero for these non-negative amounts.
  const computedValue = rate
    ? Math.round((rate.ratePerSqm * (Number(usableArea) || 0)) / 1000) * 1000
    : Number(computed) || 0;
  const formula = rate
    ? t('forms.condo.buildingInsuranceFormula', {
        rate: money2(rate.ratePerSqm),
        area: money2(Number(usableArea) || 0),
      })
    : undefined;

  // useController, never register(): this input takes a `value` prop, so handing react-hook-form
  // the ref as well lets reset() write straight into the DOM node behind React's back. On save the
  // page does reset(getValues()), the override is null, and the box was blanked to its "0.00"
  // placeholder while React still believed it held the calculated figure.
  const { field } = useController({ name: 'buildingInsurancePriceOverride' });

  // A read page shows both as plain label + value, like the fields around them.
  if (formReadOnly) {
    const priceLabel = t('forms.condo.buildingInsurancePrice');
    const overrideLabel = t('forms.condo.buildingInsurance');
    return (
      <>
        <FormFieldShell
          name="buildingInsurancePrice"
          label={priceLabel}
          wrapperClassName="col-span-4"
          read
        >
          <FormReadValue
            field={moneyField('buildingInsurancePrice', priceLabel)}
            name="buildingInsurancePrice"
            value={computedValue}
            required={false}
          />
        </FormFieldShell>
        <FormFieldShell
          name="buildingInsurancePriceOverride"
          label={overrideLabel}
          wrapperClassName="col-span-4"
          read
        >
          <FormReadValue
            field={moneyField('buildingInsurancePriceOverride', overrideLabel)}
            name="buildingInsurancePriceOverride"
            value={override ?? computedValue}
            required={false}
          />
        </FormFieldShell>
      </>
    );
  }

  return (
    <>
      <FormFieldShell
        name="buildingInsurancePrice"
        label={t('forms.condo.buildingInsurancePrice')}
        labelFor={priceId}
        wrapperClassName="col-span-4"
      >
        <NumberInput
          id={priceId}
          value={computedValue}
          maxIntegerDigits={16}
          decimalPlaces={2}
          disabled
          helperText={formula}
        />
      </FormFieldShell>
      <FormFieldShell
        name="buildingInsurancePriceOverride"
        label={t('forms.condo.buildingInsurance')}
        labelFor={overrideId}
        wrapperClassName="col-span-4"
      >
        <NumberInput
          id={overrideId}
          name={field.name}
          onBlur={field.onBlur}
          onChange={e => field.onChange(e.target.value)}
          value={override ?? computedValue}
          maxIntegerDigits={16}
          decimalPlaces={2}
          helperText={
            isEdited ? (
              <>
                {t('forms.condo.buildingInsuranceEdited', { value: money2(computedValue) })}
                {!formReadOnly && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      className="text-(--palette-primary-text) underline underline-offset-2"
                      onClick={() =>
                        setValue('buildingInsurancePriceOverride', null, { shouldDirty: true })
                      }
                    >
                      {t('forms.condo.useCalculatedValue')}
                    </button>
                  </>
                )}
              </>
            ) : (
              t('forms.condo.buildingInsuranceCalculated')
            )
          }
        />
      </FormFieldShell>
    </>
  );
}
