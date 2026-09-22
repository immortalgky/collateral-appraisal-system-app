import { Fragment, useState } from 'react';
import clsx from 'clsx';
import { Icon, NumberInput } from '@/shared/components';
import { useFormReadOnly } from '@/shared/components/form/context';
import BuildingDetailPopUpModal from './BuildingDetailPopUpModal';
import { toNumber } from '../BuildingTable/BuildingDetailTable';
import { type DerivedRule, useDerivedFieldArray } from '../BuildingTable/useDerivedFieldArray';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

interface BuildingDetailProps {
  name: string;
  /**
   * Renders the Final Cost Value / Building Insurance Price rows under the totals. Property forms
   * only — a Block model has neither (its coverage comes from the per-unit rate).
   */
  showCostSummary?: boolean;
}

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const ARRAY_FIELD = 'depreciationDetails';

/** Every figure in this table carries two decimals, the way the Cost of Building table shows them. */
const money2 = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v;
};

const roundToThousand = (v: number) => Math.round(v / 1000) * 1000;

const sum = (rows: any[], key: string) => rows.reduce((acc, row) => acc + toNumber(row?.[key]), 0);

const GROUPS = [
  { value: true, key: 'building', label: 'Building', bar: 'bg-primary-500' },
  { value: false, key: 'nonBuilding', label: 'Non-Building', bar: 'bg-amber-500' },
] as const;

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

  const { append, update, remove } = useFieldArray({ control, name });
  const formReadOnly = useFormReadOnly();

  // Writes the computed columns back into each row, exactly as the table's column headers did.
  useDerivedFieldArray({
    arrayName: name,
    rules: derivedRules,
    outScopeFields: { buildingDepre: name },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingIndex, setEditingIndex] = useState<number | undefined>();
  const [addIsBuilding, setAddIsBuilding] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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

  const handleRequestAdd = (isBuilding: boolean) => {
    setAddIsBuilding(isBuilding);
    setModalMode('add');
    setEditingIndex(undefined);
    setModalOpen(true);
  };

  const handleEdit = (index: number) => {
    setModalMode('edit');
    setEditingIndex(index);
    setModalOpen(true);
  };

  const handleModalSave = (data: any) => {
    if (modalMode === 'add') {
      append(data);
    } else if (modalMode === 'edit' && editingIndex !== undefined) {
      update(editingIndex, data);
    }
  };

  const handleModalDelete = () => {
    if (editingIndex !== undefined) remove(editingIndex);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingIndex(undefined);
  };

  const isEmpty = values.length === 0;
  const totals = {
    area: sum(values, 'area'),
    before: sum(values, 'priceBeforeDepreciation'),
    depreciation: sum(values, 'priceDepreciation'),
    after: sum(values, 'priceAfterDepreciation'),
  };
  const pctOf = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);

  const addButtons = !formReadOnly && (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => handleRequestAdd(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        <span className="size-2 rounded-sm bg-primary-500" />
        Add Building
      </button>
      <button
        type="button"
        onClick={() => handleRequestAdd(false)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        <span className="size-2 rounded-sm bg-amber-500" />
        Add Non-Building
      </button>
    </div>
  );

  const costSummary = [
    {
      label: 'Building Cost Value',
      field: finalCostField,
      override: finalCostOverride,
      computed: computedFinalCost,
      source: 'Total',
      sourceValue: after,
    },
    {
      label: 'Building Insurance',
      field: insuranceField,
      override: insuranceOverride,
      computed: computedInsurance,
      source: 'Building subtotal',
      sourceValue: building,
    },
  ];

  return (
    <div>
      {/* data-field: scroll target for array-level errors (see form/utils.ts). Kept on an empty
          anchor rather than the card: formLayout.css restyles any [data-field] that wraps a table. */}
      <div data-field={name} className="cas-repeater" />
      <div className="cas-table-card overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Depreciation</h3>
            <p className="text-xs text-gray-500">Replacement cost new, less depreciation</p>
          </div>
          {!isEmpty && addButtons}
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center gap-2 border-t border-gray-200 px-4 py-8 text-center">
            <Icon style="solid" name="building" className="size-5 text-gray-300" />
            <p className="text-sm text-gray-600">No depreciation data yet</p>
            {addButtons}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 border-y border-gray-200 bg-gray-50 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
              <SummaryCell
                label="RCN Before Depre."
                value={money2(totals.before)}
                sub={`${money2(totals.area)} m² · ${values.length} items`}
              />
              <span className="hidden text-lg font-light text-gray-400 sm:block">−</span>
              <SummaryCell
                label="Depreciation"
                value={money2(totals.depreciation)}
                sub={`${pctOf(totals.depreciation, totals.before).toFixed(2)}% of RCN`}
                valueClassName="text-orange-700"
              />
              <span className="hidden text-lg font-light text-gray-400 sm:block">=</span>
              <SummaryCell
                label="RCN After Depre."
                value={money2(totals.after)}
                sub={totals.area ? `${money2(totals.after / totals.area)} /m² avg` : undefined}
                valueClassName="text-primary-700"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-[13px] leading-tight tabular-nums">
                <thead>
                  <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                    <th className="w-10 px-2.5 py-1 text-center font-semibold">#</th>
                    <th className="px-2.5 py-1 text-left font-semibold">Detail</th>
                    <th className="px-2.5 py-1 text-right font-semibold">Area</th>
                    <th className="px-2.5 py-1 text-right font-semibold">RCN Before Depre.</th>
                    <th className="px-2.5 py-1 text-right font-semibold">Depreciation</th>
                    <th className="px-2.5 py-1 text-right font-semibold">Depre. Amount</th>
                    <th className="px-2.5 py-1 text-right font-semibold">RCN After Depre.</th>
                    <th className="w-8" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {GROUPS.map(group => {
                    const indices: number[] = [];
                    values.forEach((row: any, i: number) => {
                      if (row?.isBuilding === group.value) indices.push(i);
                    });
                    if (indices.length === 0) return null;

                    const rows = indices.map(i => values[i]);
                    const groupBefore = sum(rows, 'priceBeforeDepreciation');
                    const groupDepreciation = sum(rows, 'priceDepreciation');
                    const isCollapsed = collapsed[group.key];

                    return (
                      <Fragment key={group.key}>
                        <tr className="border-b border-gray-200 bg-gray-50 font-semibold text-gray-800">
                          <td colSpan={2} className="px-2.5 py-1.5">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setCollapsed(prev => ({ ...prev, [group.key]: !prev[group.key] }))
                                }
                                aria-expanded={!isCollapsed}
                                aria-label={`Toggle ${group.label}`}
                                className="flex size-5 items-center justify-center rounded text-gray-500 hover:bg-gray-200"
                              >
                                <Icon
                                  style="solid"
                                  name="chevron-down"
                                  className={clsx(
                                    'size-3 transition-transform',
                                    isCollapsed && '-rotate-90',
                                  )}
                                />
                              </button>
                              <span className={clsx('h-4 w-1 rounded-sm', group.bar)} />
                              {group.label}
                              <span className="rounded-full border border-gray-200 bg-white px-2 text-[11px] font-semibold text-gray-500">
                                {indices.length}
                              </span>
                              <span className="ml-auto text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                Subtotal
                              </span>
                            </div>
                          </td>
                          <td className="px-2.5 py-1.5 text-right">
                            {money2(sum(rows, 'area'))}
                            <span className="ml-0.5 text-xs font-normal text-gray-400">m²</span>
                          </td>
                          <td className="px-2.5 py-1.5 text-right">{money2(groupBefore)}</td>
                          <td className="px-2.5 py-1.5 text-right font-medium text-gray-400">
                            {pctOf(groupDepreciation, groupBefore).toFixed(2)}%
                          </td>
                          <td className="px-2.5 py-1.5 text-right text-orange-700">
                            −{money2(groupDepreciation)}
                          </td>
                          <td className="px-2.5 py-1.5 text-right">
                            {money2(sum(rows, 'priceAfterDepreciation'))}
                          </td>
                          <td />
                        </tr>

                        {!isCollapsed &&
                          indices.map((rowIndex, i) => {
                            const row = values[rowIndex];
                            return (
                              <tr
                                key={rowIndex}
                                tabIndex={0}
                                onClick={() => handleEdit(rowIndex)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleEdit(rowIndex);
                                  }
                                }}
                                className="group cursor-pointer border-b border-gray-100 outline-none hover:bg-gray-50 focus-visible:bg-primary-50"
                              >
                                <td className="px-2.5 py-1 text-center text-gray-400">{i + 1}</td>
                                <td className="px-2.5 py-1 font-medium text-gray-900">
                                  {row?.areaDescription}
                                </td>
                                <td className="px-2.5 py-1 text-right">
                                  {money2(row?.area)}
                                  <span className="ml-0.5 text-xs text-gray-400">m²</span>
                                </td>
                                <td className="px-2.5 py-1 text-right">
                                  <div className="font-medium">
                                    {money2(row?.priceBeforeDepreciation)}
                                  </div>
                                  <div className="text-[11px] leading-tight text-gray-400">
                                    {money2(row?.pricePerSqMBeforeDepreciation)} /m²
                                  </div>
                                </td>
                                <td className="px-2.5 py-1 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className="rounded-full border border-gray-300 px-1.5 text-[10px] font-semibold leading-4 text-gray-500">
                                      {row?.depreciationMethod === 'Gross' ? 'Gross' : 'Period'}
                                    </span>
                                    <span className="font-semibold">
                                      {toNum(row?.totalDepreciationPct).toFixed(2)}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-2.5 py-1 text-right text-orange-700">
                                  −{money2(row?.priceDepreciation)}
                                </td>
                                <td className="px-2.5 py-1 text-right">
                                  <div className="font-semibold text-gray-900">
                                    {money2(row?.priceAfterDepreciation)}
                                  </div>
                                  <div className="text-[11px] leading-tight text-gray-400">
                                    {money2(row?.pricePerSqMAfterDepreciation)} /m²
                                  </div>
                                </td>
                                <td className="pr-3 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                                  <Icon style="solid" name="chevron-right" className="size-3" />
                                </td>
                              </tr>
                            );
                          })}

                        {!isCollapsed && !formReadOnly && (
                          <tr className="border-b border-gray-100">
                            <td colSpan={8} className="py-0.5 pl-11 pr-3">
                              <button
                                type="button"
                                onClick={() => handleRequestAdd(group.value)}
                                className="rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-[11px] text-gray-500 hover:border-primary-500 hover:text-primary-700"
                              >
                                + Add {group.label.toLowerCase()} item
                              </button>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-800 text-[14px] font-bold text-gray-900">
                    <td />
                    <td className="px-2.5 py-2">Total</td>
                    <td className="px-2.5 py-2 text-right">
                      {money2(totals.area)}
                      <span className="ml-0.5 text-xs font-normal text-gray-400">m²</span>
                    </td>
                    <td className="px-2.5 py-2 text-right">{money2(totals.before)}</td>
                    <td className="px-2.5 py-2 text-right">
                      {pctOf(totals.depreciation, totals.before).toFixed(2)}%
                    </td>
                    <td className="px-2.5 py-2 text-right text-orange-700">
                      −{money2(totals.depreciation)}
                    </td>
                    <td className="px-2.5 py-2 text-right">
                      <div className="text-primary-700">{money2(totals.after)}</div>
                      {totals.area !== 0 && (
                        <div className="text-xs font-normal text-gray-400">
                          {money2(totals.after / totals.area)} /m²
                        </div>
                      )}
                    </td>
                    <td />
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
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            item.override != null
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-primary-50 text-primary-700',
                          )}
                        >
                          {item.override != null ? 'Edited' : 'Calculated'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
                        <span>
                          {item.source}{' '}
                          <b className="font-medium text-gray-600 tabular-nums">
                            {money2(item.sourceValue)}
                          </b>{' '}
                          → rounded to thousand{' '}
                          <b className="font-medium text-gray-600 tabular-nums">
                            {money2(item.computed)}
                          </b>
                        </span>
                        {item.override != null && !formReadOnly && (
                          <button
                            type="button"
                            className="text-[11px] text-primary-600 underline underline-offset-2"
                            onClick={() => setValue(item.field, null, { shouldDirty: true })}
                          >
                            ใช้ค่าที่คำนวณ
                          </button>
                        )}
                      </div>
                    </div>
                    <NumberInput
                      {...summaryField(item.field)}
                      value={item.override ?? item.computed}
                      maxIntegerDigits={15}
                      decimalPlaces={2}
                      className="text-right text-base font-semibold"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BuildingDetailPopUpModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        defaultIsBuilding={addIsBuilding}
        initialData={
          modalMode === 'edit' && editingIndex !== undefined ? values[editingIndex] : null
        }
        mode={modalMode}
      />
    </div>
  );
}

function SummaryCell({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <span className={clsx('text-lg font-semibold tabular-nums text-gray-900', valueClassName)}>
        {value}
      </span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
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
