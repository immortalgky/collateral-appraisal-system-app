import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import Icon from '@/shared/components/Icon';
import Dropdown from '@/shared/components/inputs/Dropdown';
import NumberInput from '@/shared/components/inputs/NumberInput';

import { isCondo } from '../types';
import type { ProjectType } from '../types';

interface PricingAssumptionFormProps {
  projectType: ProjectType;
  /** Show the values as text (a read-only page) instead of inputs. */
  plain?: boolean;
}

// ── Inline info callout (used for Force Sale tip) ─────────────────────────────

// Outside any 12-column grid (the side panel): `col-span-12` there would make the grid add 12
// implicit columns and crush every label beside it.
const InfoHint = ({ children }: { children: React.ReactNode }) => (
  <div>
    <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-(--palette-warn-wash) border border-amber-200 dark:border-amber-500/30">
      <Icon
        name="circle-info"
        style="solid"
        className="size-3.5 text-(--palette-warn) mt-0.5 shrink-0"
      />
      <p className="text-xs text-(--palette-warn) leading-relaxed">{children}</p>
    </div>
  </div>
);

// ── Side panel ────────────────────────────────────────────────────────────────

interface PanelRowProps {
  name: string;
  label: string;
  /** Unit under the label. */
  unit?: string;
  decimalPlaces?: number;
  /** 0..100, like the force-sale percentage. */
  percent?: boolean;
  /** Read-only page: the value as text instead of an input. */
  plain: boolean;
}

/** One assumption: label (and unit) on the left, a 6.5rem number box on the right. */
const PanelRow = ({ name, label, unit, decimalPlaces = 2, percent, plain }: PanelRowProps) => {
  const { control } = useFormContext();
  const inputId = `condo-assumption-${name}`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-2">
          <label htmlFor={inputId} className="text-sm text-(--palette-ink)">
            {label}
            {unit && <span className="block text-xs text-(--palette-ink-2)">{unit}</span>}
          </label>
          {plain ? (
            <span className="text-right text-sm font-medium text-(--palette-ink) tabular-nums">
              {field.value == null || field.value === ''
                ? '—'
                : Number(field.value).toLocaleString(undefined, {
                    maximumFractionDigits: decimalPlaces,
                  })}
            </span>
          ) : (
            <NumberInput
              id={inputId}
              decimalPlaces={decimalPlaces}
              min={percent ? 0 : undefined}
              max={percent ? 100 : undefined}
              value={field.value ?? ''}
              onChange={e => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        </div>
      )}
    />
  );
};

const PanelGroup = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <section className="grid grid-cols-1 gap-2">
    <h3 className="border-b border-(--palette-line-soft) pb-1 text-sm font-semibold text-(--palette-ink)">
      {title}
    </h3>
    {hint && <p className="text-xs text-(--palette-ink-2)">{hint}</p>}
    {children}
  </section>
);

/** The locations each project type prices, in the order the table's chips use. */
const LOCATION_ROWS = {
  U: [
    { name: 'cornerAdjustment', labelKey: 'pricingAssumption.fields.corner' },
    { name: 'edgeAdjustment', labelKey: 'pricingAssumption.fields.edge' },
    { name: 'poolViewAdjustment', labelKey: 'pricingAssumption.fields.poolView' },
    { name: 'southAdjustment', labelKey: 'pricingAssumption.fields.south' },
    { name: 'otherAdjustment', labelKey: 'pricingAssumption.fields.other' },
  ],
  LB: [
    { name: 'cornerAdjustment', labelKey: 'pricingAssumption.fields.corner' },
    { name: 'edgeAdjustment', labelKey: 'pricingAssumption.fields.edge' },
    { name: 'nearGardenAdjustment', labelKey: 'pricingAssumption.fields.nearGardenClubhouse' },
    { name: 'otherAdjustment', labelKey: 'pricingAssumption.fields.other' },
  ],
  L: [
    { name: 'cornerAdjustment', labelKey: 'pricingAssumption.fields.corner' },
    { name: 'edgeAdjustment', labelKey: 'pricingAssumption.fields.edge' },
    { name: 'otherAdjustment', labelKey: 'pricingAssumption.fields.other' },
  ],
} as const satisfies Record<ProjectType, readonly { name: string; labelKey: string }[]>;

/**
 * Pricing assumptions as a stack of label / value rows for the side panel next to the unit prices,
 * one panel for every project type.
 * - Location: the method, then one amount per location the type prices. The amounts say their
 *   unit, which follows the method: Baht per sq.m. (condo) or per Sq.Wa (LB, L) for "Adjust
 *   price", plain Baht for "Lumpsum". The percentage method is not offered: L has no standard
 *   price to take a percentage of.
 * - Floor (condo): a price step every N floors.
 * - Land (LB, L): LB adjusts for land above or below the model's standard land area; L has no
 *   model, so the same rate is the price of the land itself.
 * - Forced sale: the percentage of the appraised value.
 */
const PricingAssumptionForm = ({ projectType, plain = false }: PricingAssumptionFormProps) => {
  const { t } = useTranslation('blockProject');
  const { control } = useFormContext();
  const condo = isCondo(projectType);
  const land = projectType === 'L';
  const method = useWatch({ control, name: 'locationMethod' });
  // The saved method (the form's default, which a save resets): the percentage method is only
  // listed while it is the saved one, so it stays reachable after another method is picked.
  const savedMethod = useFormState({ control }).defaultValues?.locationMethod;
  const unit = t(
    method === 'Lumpsum'
      ? 'condoUnitsPrice.assumptions.units.baht'
      : method === 'AdjustPricePercentage'
        ? 'condoUnitsPrice.assumptions.units.percent'
        : condo
          ? 'condoUnitsPrice.assumptions.units.bahtPerSqm'
          : 'lbPrice.assumptions.units.bahtPerSqWa',
  );
  const methodOptions = [
    {
      value: 'AdjustPriceSqm',
      label: t(
        condo
          ? 'options.locationMethodBySqWa.AdjustPriceSqm'
          : 'options.locationMethodByM.AdjustPriceSqm',
      ),
    },
    { value: 'Lumpsum', label: t('options.locationMethodBySqWa.Lumpsum') },
    // Not offered for a new choice, but a saved percentage method has to show as what it is.
    ...(savedMethod === 'AdjustPricePercentage' || method === 'AdjustPricePercentage'
      ? [
          {
            value: 'AdjustPricePercentage',
            label: t('options.locationMethod.AdjustPricePercentage'),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <PanelGroup
        title={t('pricingAssumption.sections.locationAssumptions')}
        hint={t('pricingAssumption.locationHint')}
      >
        <div className="grid gap-1">
          <span className="text-sm text-(--palette-ink)">
            {t('pricingAssumption.fields.locationMethod')}
          </span>
          <Controller
            control={control}
            name="locationMethod"
            render={({ field, fieldState }) => {
              const selected = methodOptions.find(o => o.value === field.value)?.label;
              return plain ? (
                <span className="text-sm font-medium text-(--palette-ink)">{selected ?? '—'}</span>
              ) : (
                // Full width of the panel; the label never truncates, and the title spells it out
                // should a translation outgrow the box.
                <div className="w-full min-w-0" title={selected}>
                  <Dropdown
                    options={methodOptions}
                    value={field.value ?? undefined}
                    onChange={value => field.onChange(value)}
                    placeholder={t('pricingAssumption.locationMethodPlaceholder')}
                    showValuePrefix={false}
                    showPlaceholderOption={false}
                    error={fieldState.error?.message}
                  />
                </div>
              );
            }}
          />
        </div>
        {LOCATION_ROWS[projectType].map(row => (
          <PanelRow
            key={row.name}
            name={row.name}
            label={t(row.labelKey)}
            unit={unit}
            plain={plain}
          />
        ))}
      </PanelGroup>

      {condo && (
        <PanelGroup
          title={t('pricingAssumption.sections.floorAssumptions')}
          hint={t('pricingAssumption.floorHint')}
        >
          <PanelRow
            name="floorIncrementEveryXFloor"
            label={t('pricingAssumption.fields.everyXFloor')}
            unit={t('condoUnitsPrice.assumptions.units.floors')}
            decimalPlaces={0}
            plain={plain}
          />
          <PanelRow
            name="floorIncrementAmount"
            label={t('pricingAssumption.fields.amountBaht')}
            plain={plain}
          />
        </PanelGroup>
      )}

      {!condo && (
        <PanelGroup
          title={t('pricingAssumption.sections.landAssumption')}
          hint={land ? undefined : t('pricingAssumption.landHint')}
        >
          <PanelRow
            name="landIncreaseDecreaseRate"
            label={t(
              land ? 'lbPrice.assumptions.standardLandPrice' : 'lbPrice.assumptions.landRate',
            )}
            unit={t('lbPrice.assumptions.units.bahtPerSqWa')}
            plain={plain}
          />
        </PanelGroup>
      )}

      <PanelGroup
        title={t('pricingAssumption.sections.forceSaleValue')}
        hint={t('pricingAssumption.forceSaleHint')}
      >
        <PanelRow
          name="forceSalePercentage"
          label={t('pricingAssumption.fields.forceSalePercentage')}
          percent
          plain={plain}
        />
        <InfoHint>{t('pricingAssumption.forceSaleInfoHint')}</InfoHint>
      </PanelGroup>
    </div>
  );
};

export default PricingAssumptionForm;
