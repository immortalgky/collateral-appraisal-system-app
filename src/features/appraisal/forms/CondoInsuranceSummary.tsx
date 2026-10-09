import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { NumberInput } from '@/shared/components';
import { useFormReadOnly } from '@/shared/components/form/context';
import { useGetFireInsuranceRates } from '@/shared/api/pricingParameters';

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
 * Drawn as an ordinary labelled field (a [data-field] wrapper around a labelled NumberInput) so the
 * classic layout puts it under its neighbours and the grid layout gives it the same label | control
 * row. When edited, the note under it offers a way back to the calculated value, as the building
 * cost table does.
 */
export default function CondoInsuranceSummary() {
  const { t } = useTranslation('appraisal');
  const { setValue } = useFormContext();
  const formReadOnly = useFormReadOnly();

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

  return (
    <>
      <div data-field="buildingInsurancePrice" data-field-disabled className="col-span-6">
        <NumberInput
          label={t('forms.condo.buildingInsurancePrice')}
          value={computedValue}
          maxIntegerDigits={16}
          decimalPlaces={2}
          disabled
          helperText={formula}
        />
      </div>
      <div data-field="buildingInsurancePriceOverride" className="col-span-12">
        <NumberInput
          name={field.name}
          onBlur={field.onBlur}
          onChange={e => field.onChange(e.target.value)}
          label={t('forms.condo.buildingInsurance')}
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
                      className="text-primary-600 underline underline-offset-2"
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
      </div>
    </>
  );
}
