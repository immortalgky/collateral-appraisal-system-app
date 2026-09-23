import { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Icon, NumberInput } from '@/shared/components';
import { useFormReadOnly } from '@/shared/components/form/context';
import { defaultDepreciationDetail, periodErrors, periodRules } from './BuildingDetailPopUpModal';
import TDropdown from '@/features/pricingAnalysis/components/table/TDropdown';
import { toNumber } from '../BuildingTable/BuildingDetailTable';
import { type DerivedRule, useDerivedFieldArray } from '../BuildingTable/useDerivedFieldArray';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FIELD, NUM, NumCell, TD, TH, money2, toNum } from './denseTable';

interface BuildingDetailProps {
  name: string;
  /**
   * Renders the Final Cost Value / Building Insurance Price rows under the totals. Property forms
   * only — a Block model has neither (its coverage comes from the per-unit rate).
   */
  showCostSummary?: boolean;
}

const ARRAY_FIELD = 'depreciationDetails';

const roundToThousand = (v: number) => Math.round(v / 1000) * 1000;

const sum = (rows: any[], key: string) => rows.reduce((acc, row) => acc + toNumber(row?.[key]), 0);

export function BuildingDetail({ name, showCostSummary = false }: BuildingDetailProps) {
  const { control, register, setValue } = useFormContext();
  // Strip react-hook-form's ref: these two inputs take a `value` prop, so letting RHF own
  // the ref as well lets reset() write into the DOM node behind React's back — on save the
  // page does reset(getValues()) and a null override blanked the box to its "0.00"
  // placeholder while React still believed it held the calculated figure.
  // A plain function, not useController: these render inside a .map().
  const summaryField = (name: string) => {
    const { ref: _ref, ...rest } = register(name);
    return rest;
  };

  const { t } = useTranslation('pricingAnalysis');
  const { t: ta } = useTranslation('appraisal');
  const { fields, append, remove } = useFieldArray({ control, name });
  const formReadOnly = useFormReadOnly();

  // Writes the computed columns back into each row, exactly as the table's column headers did.
  useDerivedFieldArray({
    arrayName: name,
    rules: derivedRules,
    outScopeFields: { buildingDepre: name },
  });

  // Period rows open their age bands in a sub-row; keyed by field id so a delete doesn't shift it.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string, open?: boolean) =>
    setExpanded(prev => ({ ...prev, [id]: open ?? !prev[id] }));

  const values = useWatch({ name }) || [];

  // The overrides sit next to the table in the same form; `name` may be prefixed on nested forms.
  const base = name.endsWith(ARRAY_FIELD) ? name.slice(0, -ARRAY_FIELD.length) : '';
  const finalCostField = `${base}finalCostValueOverride`;
  const insuranceField = `${base}buildingInsurancePriceOverride`;
  const finalCostOverride = useWatch({ name: finalCostField });
  const insuranceOverride = useWatch({ name: insuranceField });

  const { after, building } = (values as any[]).reduce(
    (acc, row) => {
      const value = toNum(row?.priceAfterDepreciation);
      acc.after += value;
      if (row?.isBuilding) acc.building += value;
      return acc;
    },
    { after: 0, building: 0 },
  );
  const computedFinalCost = roundToThousand(after);
  // Rounded per property, like Final Cost Value — the appraisal total rounds again on top.
  const computedInsurance = roundToThousand(building);

  const handleRequestAdd = (isBuilding: boolean) =>
    append({ ...defaultDepreciationDetail, isBuilding });

  const isEmpty = values.length === 0;
  const totals = {
    area: sum(values, 'area'),
    before: sum(values, 'priceBeforeDepreciation'),
    depreciation: sum(values, 'priceDepreciation'),
    after: sum(values, 'priceAfterDepreciation'),
  };
  const columnCount = formReadOnly ? 12 : 13;
  const typeOptions = [
    { value: 'true', label: t('costBuilding.table.building'), colorClass: 'text-[#15803d]' },
    { value: 'false', label: t('costBuilding.table.nonBuilding'), colorClass: 'text-[#c2410c]' },
  ];
  const methodOptions = [
    { value: 'Gross', label: t('costBuilding.table.methodGross') },
    { value: 'Period', label: t('costBuilding.table.methodPeriod') },
  ];

  const addButtons = !formReadOnly && (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => handleRequestAdd(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-[0.75rem] text-gray-600 hover:border-primary-500 hover:text-primary-700"
      >
        <span className="size-2 rounded-sm bg-primary-500" />
        {t('costBuilding.table.addBuilding')}
      </button>
      <button
        type="button"
        onClick={() => handleRequestAdd(false)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-[0.75rem] text-gray-600 hover:border-primary-500 hover:text-primary-700"
      >
        <span className="size-2 rounded-sm bg-amber-500" />
        {t('costBuilding.table.addNonBuilding')}
      </button>
    </div>
  );

  const costSummary = [
    {
      label: t('costBuilding.table.buildingCostValueLabel'),
      field: finalCostField,
      override: finalCostOverride,
      computed: computedFinalCost,
      source: t('costBuilding.table.tableTotal'),
      sourceValue: after,
    },
    {
      label: ta('fieldLabels.building.buildingInsurance'),
      field: insuranceField,
      override: insuranceOverride,
      computed: computedInsurance,
      source: t('costBuilding.table.buildingSubtotal'),
      sourceValue: building,
    },
  ];

  return (
    <div>
      {/* data-field: scroll target for array-level errors (see form/utils.ts). Kept on an empty
          anchor rather than the card: formLayout.css restyles any [data-field] that wraps a table. */}
      <div data-field={name} className="cas-repeater" />
      <div className="cas-labelled-table">
        <div className="cas-table-label">
          {t('costBuilding.table.sectionLabel')}
          {addButtons}
        </div>
        <div className="cas-table-card min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <Icon style="solid" name="building" className="size-5 text-gray-300" />
              <p className="text-sm text-gray-600">{t('costBuilding.table.noDepreciationData')}</p>
              <div className="cas-hide-in-grid">{addButtons}</div>
            </div>
          ) : (
            <>
              {fields.map((field, i) => (
                <RowSync key={field.id} base={`${name}.${i}`} readOnly={formReadOnly} />
              ))}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-[0.875rem] leading-tight tabular-nums">
                  <thead className="bg-[#f8fafa] text-[0.8125rem] font-medium text-[#55636f]">
                    <tr>
                      <th rowSpan={2} className={clsx(TH, 'text-left')}>
                        {t('costBuilding.table.detailHeader')}
                      </th>
                      <th rowSpan={2} className={clsx(TH, 'text-left')}>
                        {t('costBuilding.table.typeHeader')}
                      </th>
                      <th rowSpan={2} className={clsx(TH, 'text-right')}>
                        {t('costBuilding.table.areaHeader')}
                      </th>
                      <th colSpan={2} className={clsx(TH, 'text-center')}>
                        {t('costBuilding.table.rcnBeforeDepreHeader')}
                      </th>
                      <th rowSpan={2} className={clsx(TH, 'text-right')}>
                        {t('costBuilding.table.yearHeader')}
                      </th>
                      <th colSpan={4} className={clsx(TH, 'text-center')}>
                        {t('costBuilding.table.depreciationHeader')}
                      </th>
                      <th colSpan={2} className={clsx(TH, 'text-center')}>
                        {t('costBuilding.table.rcnAfterDepreHeader')}
                      </th>
                      {!formReadOnly && <th rowSpan={2} className={clsx(TH, 'w-8')} />}
                    </tr>
                    <tr>
                      <th className={clsx(TH, 'text-right')}>
                        {t('costBuilding.table.pricePerSqmHeader')}
                      </th>
                      <th className={clsx(TH, 'text-right')}>
                        {t('costBuilding.table.totalPriceHeader')}
                      </th>
                      <th className={clsx(TH, 'text-right')}>
                        {t('costBuilding.table.percentPerYearHeader')}
                      </th>
                      <th className={clsx(TH, 'text-right')}>
                        {t('costBuilding.table.totalPercentHeader')}
                      </th>
                      <th className={clsx(TH, 'text-left')}>
                        {t('costBuilding.table.methodHeader')}
                      </th>
                      <th className={clsx(TH, 'text-right')}>
                        {t('costBuilding.table.totalPriceHeader')}
                      </th>
                      <th className={clsx(TH, 'text-right')}>
                        {t('costBuilding.table.pricePerSqmHeader')}
                      </th>
                      <th className={clsx(TH, 'text-right')}>
                        {t('costBuilding.table.totalPriceHeader')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[#1f2937]">
                    {fields.map((field, rowIndex) => {
                      const row = values[rowIndex] ?? {};
                      const p = `${name}.${rowIndex}`;
                      const isGross = row.depreciationMethod === 'Gross';
                      const hasPeriod = (row.depreciationPeriods ?? []).length > 0;
                      const open = !isGross && expanded[field.id];
                      return (
                        <Fragment key={field.id}>
                          <tr>
                            <td className={clsx(TD, 'min-w-[180px]')}>
                              {formReadOnly ? (
                                row.areaDescription
                              ) : (
                                <input
                                  {...register(`${p}.areaDescription`)}
                                  maxLength={50}
                                  className={FIELD}
                                />
                              )}
                            </td>
                            <td className={clsx(TD, 'w-[130px]')}>
                              {formReadOnly ? (
                                <span
                                  className={clsx(
                                    'rounded px-1.5 py-0.5 text-[0.75rem] font-medium',
                                    row.isBuilding
                                      ? 'bg-[#e6f4ea] text-[#15803d]'
                                      : 'bg-[#fdf0e1] text-[#c2410c]',
                                  )}
                                >
                                  {row.isBuilding
                                    ? t('costBuilding.table.building')
                                    : t('costBuilding.table.nonBuilding')}
                                </span>
                              ) : (
                                <Controller
                                  name={`${p}.isBuilding`}
                                  control={control}
                                  render={({ field: f }) => (
                                    <TDropdown
                                      dense
                                      showValue={false}
                                      allowEmpty={false}
                                      options={typeOptions}
                                      value={String(f.value !== false)}
                                      onChange={v => f.onChange(v === 'true')}
                                    />
                                  )}
                                />
                              )}
                            </td>
                            <td className={clsx(NUM, 'w-[100px]')}>
                              <NumCell name={`${p}.area`} readOnly={formReadOnly} maxInt={6} />
                            </td>
                            <td className={clsx(NUM, 'w-[120px]')}>
                              <NumCell
                                name={`${p}.pricePerSqMBeforeDepreciation`}
                                readOnly={formReadOnly}
                              />
                            </td>
                            <td className={NUM}>{money2(row.priceBeforeDepreciation)}</td>
                            <td className={clsx(NUM, 'w-[64px]')}>
                              <NumCell
                                name={`${p}.year`}
                                readOnly={formReadOnly}
                                digits={0}
                                maxInt={3}
                              />
                            </td>
                            <td className={clsx(NUM, 'w-[84px]')}>
                              {!isGross ? (
                                <button
                                  type="button"
                                  onClick={() => toggle(field.id)}
                                  aria-expanded={!!open}
                                  title={t('costBuilding.table.editPeriods')}
                                  className="inline-flex w-full items-center justify-end gap-1 rounded-[4px] px-[5px] text-[#0f766e] hover:bg-[#f0fdfa]"
                                >
                                  {toNum(row.totalDepreciationPercentPerYear).toFixed(2)}
                                  <Icon
                                    style="solid"
                                    name="chevron-down"
                                    className={clsx('size-2.5', !open && '-rotate-90')}
                                  />
                                </button>
                              ) : hasPeriod ? (
                                <NumCell
                                  name={`${p}.depreciationPeriods.0.depreciationPerYear`}
                                  readOnly={formReadOnly}
                                  maxInt={3}
                                />
                              ) : (
                                <span
                                  className="text-gray-400"
                                  title={t('costBuilding.table.setAgeFirst')}
                                >
                                  —
                                </span>
                              )}
                            </td>
                            <td className={NUM}>{toNum(row.totalDepreciationPct).toFixed(2)}</td>
                            <td className={clsx(TD, 'w-[96px]')}>
                              {formReadOnly ? (
                                isGross ? (
                                  t('costBuilding.table.methodGross')
                                ) : (
                                  t('costBuilding.table.methodPeriod')
                                )
                              ) : (
                                <Controller
                                  name={`${p}.depreciationMethod`}
                                  control={control}
                                  render={({ field: f }) => (
                                    <TDropdown
                                      dense
                                      showValue={false}
                                      allowEmpty={false}
                                      options={methodOptions}
                                      value={f.value}
                                      onChange={v => {
                                        f.onChange(v);
                                        toggle(field.id, v === 'Period');
                                      }}
                                    />
                                  )}
                                />
                              )}
                            </td>
                            <td className={NUM}>{money2(row.priceDepreciation)}</td>
                            <td className={NUM}>{money2(row.pricePerSqMAfterDepreciation)}</td>
                            <td className={NUM}>{money2(row.priceAfterDepreciation)}</td>
                            {!formReadOnly && (
                              <td className={clsx(TD, 'text-center')}>
                                <button
                                  type="button"
                                  onClick={() => remove(rowIndex)}
                                  aria-label={t('costBuilding.table.deleteAction')}
                                  className="inline-flex size-6 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Icon style="solid" name="trash" className="size-3" />
                                </button>
                              </td>
                            )}
                          </tr>
                          {open && (
                            <tr>
                              <td colSpan={columnCount} className={clsx(TD, 'bg-[#fbfcfc] pl-6')}>
                                <PeriodEditor
                                  base={p}
                                  age={toNum(row.year)}
                                  readOnly={formReadOnly}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {addButtons && (
                      <tr className="cas-hide-in-grid">
                        <td colSpan={columnCount} className={TD}>
                          {addButtons}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#f8fafa] font-semibold text-[#1f2937]">
                      <td className={TD}>{t('costBuilding.table.tableTotal')}</td>
                      <td className={TD} />
                      <td className={NUM}>{money2(totals.area)}</td>
                      <td className={TD} />
                      <td className={NUM}>{money2(totals.before)}</td>
                      <td colSpan={4} className={TD} />
                      <td className={NUM}>{money2(totals.depreciation)}</td>
                      <td className={TD} />
                      <td className={NUM}>{money2(totals.after)}</td>
                      {!formReadOnly && <td className={TD} />}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* These are the figures the rest of the appraisal reads off this table. */}
              {showCostSummary && (
                <div className="divide-y divide-gray-200 border-t border-gray-200">
                  {costSummary.map(item => (
                    <div
                      key={item.field}
                      className="grid grid-cols-1 items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_minmax(0,300px)] sm:gap-6"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                          <span
                            className={clsx(
                              'rounded-full px-2 py-0.5 text-[0.75rem] font-semibold',
                              item.override != null
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-primary-50 text-primary-700',
                            )}
                          >
                            {item.override != null
                              ? t('comparativeAnalysis.editedLabel')
                              : t('methodStatus.calculated')}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
                          <span>
                            {item.source}{' '}
                            <b className="font-medium text-gray-600 tabular-nums">
                              {money2(item.sourceValue)}
                            </b>{' '}
                            → {t('methodTabs.partialUsage.roundedThousand')}{' '}
                            <b className="font-medium text-gray-600 tabular-nums">
                              {money2(item.computed)}
                            </b>
                          </span>
                          {item.override != null && !formReadOnly && (
                            <button
                              type="button"
                              className="text-[0.75rem] text-primary-600 underline underline-offset-2"
                              onClick={() => setValue(item.field, null, { shouldDirty: true })}
                            >
                              {t('hypothesis.ledger.useCalculated')}
                            </button>
                          )}
                        </div>
                      </div>
                      <NumberInput
                        {...summaryField(item.field)}
                        value={item.override ?? item.computed}
                        maxIntegerDigits={15}
                        decimalPlaces={2}
                        dense
                        className="font-semibold"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Keeps one row's age bands current, the job the slide-over used to do while it was open: each
 * band's % and ฿ follow area × price, and Gross stays a single band from year 1 to the age.
 */
function RowSync({ base, readOnly }: { base: string; readOnly: boolean }) {
  const { getValues, setValue } = useFormContext();
  const outScopeFields = useMemo(
    () => ({ area: `${base}.area`, pricePerSqm: `${base}.pricePerSqMBeforeDepreciation` }),
    [base],
  );
  useDerivedFieldArray({
    arrayName: `${base}.depreciationPeriods`,
    rules: periodRules,
    outScopeFields,
  });

  const method = useWatch({ name: `${base}.depreciationMethod` });
  const age = toNum(useWatch({ name: `${base}.year` }));
  const count = (useWatch({ name: `${base}.depreciationPeriods` }) ?? []).length;

  useEffect(() => {
    if (readOnly || method !== 'Gross' || age <= 0) return;
    const periods = getValues(`${base}.depreciationPeriods`) ?? [];
    if (periods.length === 1 && toNum(periods[0]?.toYear) === age) return;
    const first = periods[0] ?? {
      atYear: 1,
      depreciationPerYear: 0,
      totalDepreciationPct: 0,
      priceDepreciation: 0,
    };
    setValue(`${base}.depreciationPeriods`, [{ ...first, toYear: age }], { shouldDirty: true });
  }, [readOnly, method, age, count, base, getValues, setValue]);

  return null;
}

/** A Period row's age bands, edited in the sub-row under it. */
function PeriodEditor({ base, age, readOnly }: { base: string; age: number; readOnly: boolean }) {
  const { t } = useTranslation('pricingAnalysis');
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${base}.depreciationPeriods`,
  });
  const rows: any[] = useWatch({ name: `${base}.depreciationPeriods` }) ?? [];

  const errors = periodErrors(rows, age, {
    toBeforeAt: (to, from) => t('costBuilding.table.periodToBeforeFrom', { to, from }),
    noAge: () => t('costBuilding.table.periodNeedsAge'),
    pastAge: (to, a) => t('costBuilding.table.periodPastAge', { to, age: a }),
    overlap: (from, prev) => t('costBuilding.table.periodOverlap', { from, prev }),
  });
  const lastToYear = rows.length > 0 ? toNum(rows[rows.length - 1]?.toYear) : 0;
  const canAdd = !readOnly && age > 0 && lastToYear < age;

  if (age <= 0 && rows.length === 0) {
    return <p className="text-gray-500">{t('costBuilding.table.setAgeFirst')}</p>;
  }

  return (
    <div className="flex max-w-[560px] flex-col gap-1">
      <table className="w-full text-[0.875rem] tabular-nums">
        <thead className="text-[#55636f]">
          <tr>
            <th className="px-1 py-0.5 text-right font-medium">
              {t('costBuilding.table.fromYearHeader')}
            </th>
            <th className="px-1 py-0.5 text-right font-medium">
              {t('costBuilding.table.toYearHeader')}
            </th>
            <th className="px-1 py-0.5 text-right font-medium">
              {t('costBuilding.table.percentPerYearHeader')}
            </th>
            <th className="px-1 py-0.5 text-right font-medium">
              {t('costBuilding.table.totalPercentHeader')}
            </th>
            <th className="px-1 py-0.5 text-right font-medium">
              {t('costBuilding.table.totalPriceHeader')}
            </th>
            {!readOnly && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {fields.map((field, i) => {
            const row = rows[i] ?? {};
            const rowErrors = errors[i] ?? [];
            const invalid = rowErrors.length > 0;
            const cell = `${base}.depreciationPeriods.${i}`;
            return (
              <Fragment key={field.id}>
                <tr>
                  <td className="w-[72px] px-1 py-0.5 text-right">
                    <NumCell
                      name={`${cell}.atYear`}
                      readOnly={readOnly}
                      digits={0}
                      maxInt={3}
                      invalid={invalid}
                    />
                  </td>
                  <td className="w-[72px] px-1 py-0.5 text-right">
                    <NumCell
                      name={`${cell}.toYear`}
                      readOnly={readOnly}
                      digits={0}
                      maxInt={3}
                      invalid={invalid}
                    />
                  </td>
                  <td className="w-[84px] px-1 py-0.5 text-right">
                    <NumCell name={`${cell}.depreciationPerYear`} readOnly={readOnly} maxInt={3} />
                  </td>
                  <td className="px-1 py-0.5 text-right">
                    {toNum(row.totalDepreciationPct).toFixed(2)}
                  </td>
                  <td className="px-1 py-0.5 text-right">{money2(row.priceDepreciation)}</td>
                  {!readOnly && (
                    <td className="px-1 py-0.5 text-center">
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        aria-label={t('costBuilding.table.deleteAction')}
                        className="inline-flex size-6 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Icon style="solid" name="trash" className="size-3" />
                      </button>
                    </td>
                  )}
                </tr>
                {invalid && (
                  <tr>
                    <td colSpan={6} className="px-1 pb-1 text-[0.75rem] text-red-600">
                      {rowErrors.join(' · ')}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {!readOnly && (
        <button
          type="button"
          disabled={!canAdd}
          onClick={() =>
            append({
              atYear: rows.length > 0 ? lastToYear + 1 : 1,
              toYear: age,
              depreciationPerYear: 0,
              totalDepreciationPct: 0,
              priceDepreciation: 0,
            })
          }
          className="self-start rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-[0.75rem] text-gray-500 hover:border-primary-500 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + {t('costBuilding.table.addPeriod')}
        </button>
      )}
    </div>
  );
}

/**
 * The computed columns, in the order the table evaluated them. Moved verbatim from the old column
 * headers — change a formula here and every saved property's figures change with it.
 */
const derivedRules: DerivedRule[] = [
  {
    targetKey: 'priceBeforeDepreciation',
    compute: ({ row }) => {
      const area = row['area'];
      const pricePerSqm = row['pricePerSqMBeforeDepreciation'];
      return area * pricePerSqm;
    },
  },
  {
    targetKey: 'totalDepreciationPercentPerYear',
    compute: ({ rowIndex, outScopeFields }) => {
      const buildingDepreciations =
        outScopeFields.buildingDepre?.[rowIndex]?.depreciationPeriods ?? [];

      if (!Array.isArray(buildingDepreciations) || buildingDepreciations.length === 0) return 0;

      const totalYears = buildingDepreciations.reduce((acc: number, b: any) => {
        const atYear = toNum(b.atYear);
        const toYear = toNum(b.toYear);
        return acc + Math.max(toYear - atYear + 1, 0);
      }, 0);

      if (totalYears === 0) return 0;

      const weightedSum = buildingDepreciations.reduce((acc: number, b: any) => {
        const atYear = toNum(b.atYear);
        const toYear = toNum(b.toYear);
        const yearSpan = Math.max(toYear - atYear + 1, 0);
        return acc + toNum(b.depreciationPerYear) * yearSpan;
      }, 0);

      return weightedSum / totalYears;
    },
  },
  {
    targetKey: 'totalDepreciationPct',
    compute: ({ rowIndex, outScopeFields }) => {
      const buildingDepreciations =
        outScopeFields.buildingDepre?.[rowIndex]?.depreciationPeriods ?? [];

      if (!Array.isArray(buildingDepreciations) || buildingDepreciations.length === 0) return 0;

      const totalDepreciation = buildingDepreciations.reduce((acc: number, b: any) => {
        return acc + toNum(b.totalDepreciationPct);
      }, 0);

      return totalDepreciation;
    },
  },
  {
    targetKey: 'priceDepreciation',
    compute: ({ rowIndex, outScopeFields }) => {
      const buildingDepreciations =
        outScopeFields.buildingDepre?.[rowIndex]?.depreciationPeriods ?? [];

      if (!Array.isArray(buildingDepreciations) || buildingDepreciations.length === 0) return 0;

      const priceDepreciation = buildingDepreciations
        .map((b: any) => b.priceDepreciation)
        .reduce((acc: number, curr: any) => acc + toNum(curr), 0);
      return priceDepreciation;
    },
  },
  {
    targetKey: 'priceAfterDepreciation',
    compute: ({ row }) => {
      const priceBeforeDepreciation = row['priceBeforeDepreciation'];
      const priceDepreciation = row['priceDepreciation'];
      return priceBeforeDepreciation - priceDepreciation;
    },
  },
  {
    targetKey: 'pricePerSqMAfterDepreciation',
    compute: ({ row }) => {
      const priceAfterDepreciation = row['priceAfterDepreciation'];
      const area = row['area'];

      if (area === 0) return 0;
      return priceAfterDepreciation / area;
    },
  },
];
