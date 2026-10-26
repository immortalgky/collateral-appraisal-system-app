import { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Button, Icon, Input, NumberInput } from '@/shared/components';
import {
  FormTable,
  FormTableDash,
  FormTableRowActions,
  useFormLayout,
  useFormReadOnly,
  type FormTableColumn,
} from '@/shared/components/form';
import { FormReadValue } from '@/shared/components/form/FormReadValue';
import { controlGeometry, controlSkin } from '@/shared/components/inputs/controlStyles';
import { defaultDepreciationDetail, periodErrors, periodRules } from './BuildingDetailPopUpModal';
import TDropdown from '@/features/pricingAnalysis/components/table/TDropdown';
import { toNumber } from '../BuildingTable/BuildingDetailTable';
import { type DerivedRule, useDerivedFieldArray } from '../BuildingTable/useDerivedFieldArray';
import {
  Controller,
  type UseFormRegisterReturn,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { buildingInsuranceFigures } from '../../utils/buildingStoredValues';
import {
  roundSumToThousand,
  scheduleCostFigures,
  type Numberish,
} from '@/features/pricingAnalysis/domain/calculation';

interface BuildingDetailProps {
  name: string;
  /**
   * Renders the Final Cost Value / Building Insurance Price rows under the totals. Property forms
   * only — a Block model has neither (its coverage comes from the per-unit rate).
   */
  showCostSummary?: boolean;
}

const ARRAY_FIELD = 'depreciationDetails';

/**
 * The width of the 11-column table in rem (DESIGN.md 17.7): its fixed columns plus 10rem for the
 * description (140px at 14px). Narrower than this, a narrow shell shows cards.
 */
const MIN_WIDTH = { standard: 71.2857, compact: 70.8571 };

/**
 * Standard keeps its roomy cells everywhere else; this table is dense, so its cells take ~5px of
 * side padding and its in-cell controls 8px (24px on the chevron side). Child selectors keep the
 * age-band editor's own table out of it.
 */
const STANDARD_DENSE = [
  '[&>div>div>table>*>tr>:is(th,td)]:px-[0.3571rem]',
  '[&>div>div>table>*>tr>td_:is(input,button)]:px-[0.5714rem]',
  '[&>div>div>table>*>tr>td_button[aria-haspopup]]:pr-[1.7143rem]',
].join(' ');

/** The `costBuilding.table.*` strings the column heads, card labels and badges use. */
type TableLabel =
  | 'detailHeader'
  | 'typeHeader'
  | 'areaHeader'
  | 'rcnBeforeDepreHeader'
  | 'rcnAfterDepreHeader'
  | 'depreciationHeader'
  | 'pricePerSqmHeader'
  | 'totalPriceHeader'
  | 'yearHeader'
  | 'percentPerYearHeader'
  | 'totalPercentHeader'
  | 'methodHeader'
  | 'methodGross'
  | 'methodPeriod'
  | 'building'
  | 'nonBuilding'
  | 'editPeriods'
  | 'setAgeFirst'
  | 'addBuilding'
  | 'addNonBuilding'
  | 'noDepreciationData'
  | 'tableTotal';

/** One age band of a row: what the form holds, before it is coerced to a number. */
type PeriodRow = {
  atYear?: unknown;
  toYear?: unknown;
  depreciationPerYear?: unknown;
  totalDepreciationPct?: unknown;
  priceDepreciation?: unknown;
};

/** One row of the table as the form holds it. */
type DepreciationRow = {
  areaDescription?: string | null;
  isBuilding?: boolean;
  year?: unknown;
  depreciationMethod?: string;
  depreciationPeriods?: unknown[];
  totalDepreciationPercentPerYear?: unknown;
  totalDepreciationPct?: unknown;
  priceBeforeDepreciation?: unknown;
  priceDepreciation?: unknown;
  pricePerSqMAfterDepreciation?: unknown;
  priceAfterDepreciation?: Numberish;
};

const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Every figure in this table carries two decimals, the way the Cost of Building table shows them. */
const money2 = (v: unknown): string => {
  const n = Number(v);
  if (Number.isFinite(n))
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return typeof v === 'string' ? v : '';
};

/** A row with the field-array id and index it is edited under. */
interface DepreciationItem {
  id: string;
  index: number;
  row: DepreciationRow;
}

const sum = (rows: Record<string, unknown>[], key: string) =>
  rows.reduce((acc, row) => acc + toNumber(row?.[key] as string), 0);

/** A number cell: the figure as text when read-only, otherwise the cell-sized number input. */
function NumCell({
  name,
  readOnly,
  digits = 2,
  maxInt = 15,
  invalid = false,
  label,
}: {
  name: string;
  readOnly: boolean;
  digits?: number;
  maxInt?: number;
  invalid?: boolean;
  label: string;
}) {
  const { control } = useFormContext();
  const value = useWatch({ name });
  if (readOnly) return <>{digits ? money2(toNum(value)) : toNum(value)}</>;
  return (
    <Controller
      name={name}
      control={control}
      // No ref for RHF: the input takes a `value` prop, and reset() writing into the DOM node
      // behind React's back blanks it (see summaryField in BuildingDetail).
      render={({ field }) => (
        <NumberInput
          name={field.name}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          cell
          decimalPlaces={digits}
          maxIntegerDigits={maxInt}
          invalid={invalid}
          aria-label={label}
        />
      )}
    />
  );
}

/** The "2.00 ⌄" box of a Period row: looks like the editable cell beside it (white, drawn edge), opens the age bands. */
function PeriodsTrigger({
  open,
  title,
  value,
  onClick,
}: {
  open: boolean;
  title: string;
  value: string;
  onClick: () => void;
}) {
  const layout = useFormLayout();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      title={title}
      className={clsx(
        'flex w-full items-center justify-end gap-1.5 tabular-nums',
        controlGeometry(layout, true),
        controlSkin({}),
      )}
    >
      {value}
      <Icon
        style="solid"
        name="chevron-down"
        className={clsx('text-[0.7143rem] text-(--palette-ink-2)', !open && '-rotate-90')}
      />
    </button>
  );
}

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
  const layout = useFormLayout();
  // The widths hold every figure at its widest realistic value (1,440,000.00 in a price column, 12,000.00 in an input), "Non-Building" and "เหมารวม" unclipped, the 24px row action inside its cell (measured with Roboto 13px)
  const cw = (standard: string, compact: string) => (layout === 'compact' ? compact : standard);
  const { fields, append, remove } = useFieldArray({ control, name });

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

  const values: DepreciationRow[] = useWatch({ name }) || [];

  // The overrides sit next to the table in the same form; `name` may be prefixed on nested forms.
  const base = name.endsWith(ARRAY_FIELD) ? name.slice(0, -ARRAY_FIELD.length) : '';
  const finalCostField = `${base}buildingCostValue`;
  const insuranceField = `${base}buildingInsurancePrice`;
  const finalCostOverride = useWatch({ name: finalCostField });
  const typedInsurance = useWatch({ name: insuranceField });

  // Both figures follow the server's rule (each row at 2 dp, then rounded to the thousand) — the one
  // ConstructionInspection and pricing use too (buildingFinalCostValue) — and so do the subtotals
  // shown beside them, so nothing on screen contradicts what is stored. Rounded per property; the
  // appraisal total rounds again on top.
  const { total: after, derived: derivedCost } = scheduleCostFigures(values);
  const computedFinalCost = derivedCost ?? 0;
  const { subtotal: building, insurance: derivedInsurance } = buildingInsuranceFigures(values);
  const computedInsurance = derivedInsurance ?? 0;

  const handleRequestAdd = (isBuilding: boolean) =>
    append({ ...defaultDepreciationDetail, isBuilding });

  const isEmpty = values.length === 0;
  const totals = {
    area: sum(values, 'area'),
    // Each at 2 dp per row like `after`, so before − depreciation = after on screen.
    before: roundSumToThousand(values.map(row => row?.priceBeforeDepreciation as number)).sum,
    depreciation: roundSumToThousand(values.map(row => row?.priceDepreciation as number)).sum,
    // The same total the Building Cost Value line rounds, so the two "Table total" figures agree.
    after,
  };
  const typeOptions = [
    {
      value: 'true',
      label: t('costBuilding.table.building'),
      colorClass: 'text-[#15803d] dark:text-[#4ade80]',
    },
    {
      value: 'false',
      label: t('costBuilding.table.nonBuilding'),
      colorClass: 'text-[#c2410c] dark:text-[#fb923c]',
    },
  ];
  const methodOptions = [
    { value: 'Gross', label: t('costBuilding.table.methodGross') },
    { value: 'Period', label: t('costBuilding.table.methodPeriod') },
  ];

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
      // Null = not typed: the loaded figure equal to the derived one is mapped to null (see mappers).
      override: typedInsurance,
      computed: computedInsurance,
      source: t('costBuilding.table.buildingSubtotal'),
      sourceValue: building,
    },
  ];

  const items: DepreciationItem[] = fields.map((field, index) => ({
    id: field.id,
    index,
    row: values[index] ?? {},
  }));

  // Labels for the card, where the two-level head is gone: the group and the sub-header in one.
  const tb = (key: TableLabel) => t(`costBuilding.table.${key}`);
  const grouped = (group: TableLabel, header: TableLabel) => `${tb(group)} (${tb(header)})`;
  const typeBadge = (isBuilding: boolean) => (
    <span
      className={clsx(
        'rounded px-1.5 py-0.5 text-xs font-medium',
        isBuilding
          ? 'bg-[#e6f4ea] text-[#15803d] dark:bg-[#15803d]/20 dark:text-[#4ade80]'
          : 'bg-[#fdf0e1] text-[#c2410c] dark:bg-[#c2410c]/20 dark:text-[#fb923c]',
      )}
    >
      {isBuilding ? tb('building') : tb('nonBuilding')}
    </span>
  );

  // A computed pair in one right-aligned cell: the small figure on top, the total price below
  const stacked = (top: string, bottom: string) => (
    <div className="leading-[1.3]">
      <span className="block text-xs font-normal text-(--palette-ink-2)">{top}</span>
      <span className="block font-medium">{bottom}</span>
    </div>
  );
  const stackHeader = (top: string, bottom: string) => (
    <span className="inline-flex flex-col items-end leading-[1.3]">
      <span className="font-normal">{top}</span>
      <span>{bottom}</span>
    </span>
  );

  const columns: FormTableColumn<DepreciationItem>[] = [
    {
      key: 'description',
      kind: 'input',
      header: tb('detailHeader'),
      card: { span: 6, title: ({ row }) => row.areaDescription },
      cell: ({ index, row }, { position, readOnly }) =>
        readOnly ? (
          row.areaDescription || <FormTableDash />
        ) : (
          <Input
            {...register(`${name}.${index}.areaDescription`)}
            cell
            maxLength={50}
            aria-label={`${tb('detailHeader')} ${position + 1}`}
          />
        ),
    },
    {
      key: 'type',
      kind: 'input',
      header: tb('typeHeader'),
      // Room for "Non-Building" beside the chevron
      width: cw('7.5714rem', '7.1429rem'),
      cell: ({ index, row }, { readOnly }) =>
        readOnly ? (
          typeBadge(!!row.isBuilding)
        ) : (
          <Controller
            name={`${name}.${index}.isBuilding`}
            control={control}
            render={({ field: f }) => (
              <TDropdown
                cell
                showValue={false}
                allowEmpty={false}
                options={typeOptions}
                value={String(f.value !== false)}
                onChange={v => f.onChange(v === 'true')}
              />
            )}
          />
        ),
    },
    {
      key: 'area',
      kind: 'input',
      align: 'end',
      header: tb('areaHeader'),
      width: '5.7143rem',
      total: money2(totals.area),
      cell: ({ index }, { position, readOnly }) => (
        <NumCell
          name={`${name}.${index}.area`}
          readOnly={readOnly}
          maxInt={6}
          label={`${tb('areaHeader')} ${position + 1}`}
        />
      ),
    },
    {
      key: 'pricePerSqmBefore',
      kind: 'input',
      align: 'end',
      group: tb('rcnBeforeDepreHeader'),
      header: tb('pricePerSqmHeader'),
      width: cw('6.8571rem', '6.5714rem'),
      card: { label: grouped('rcnBeforeDepreHeader', 'pricePerSqmHeader') },
      cell: ({ index }, { position, readOnly }) => (
        <NumCell
          name={`${name}.${index}.pricePerSqMBeforeDepreciation`}
          readOnly={readOnly}
          label={`${grouped('rcnBeforeDepreHeader', 'pricePerSqmHeader')} ${position + 1}`}
        />
      ),
    },
    {
      key: 'priceBefore',
      kind: 'derived',
      align: 'end',
      group: tb('rcnBeforeDepreHeader'),
      header: tb('totalPriceHeader'),
      width: cw('7.4286rem', '7.7143rem'),
      total: money2(totals.before),
      card: { label: grouped('rcnBeforeDepreHeader', 'totalPriceHeader') },
      cell: ({ row }) => money2(row.priceBeforeDepreciation),
    },
    {
      key: 'year',
      kind: 'input',
      align: 'end',
      header: tb('yearHeader'),
      width: '3.4286rem',
      cell: ({ index }, { position, readOnly }) => (
        <NumCell
          name={`${name}.${index}.year`}
          readOnly={readOnly}
          digits={0}
          maxInt={3}
          label={`${tb('yearHeader')} ${position + 1}`}
        />
      ),
    },
    {
      key: 'perYear',
      kind: 'input',
      align: 'end',
      group: tb('depreciationHeader'),
      header: tb('percentPerYearHeader'),
      width: cw('5.4286rem', '5.1429rem'),
      card: { label: `${tb('depreciationHeader')} ${tb('percentPerYearHeader')}` },
      cell: ({ id, index, row }, { position, readOnly }) => {
        const isGross = row.depreciationMethod === 'Gross';
        if (!isGross) {
          const open = !!expanded[id];
          return (
            <PeriodsTrigger
              open={open}
              title={tb('editPeriods')}
              onClick={() => toggle(id)}
              value={toNum(row.totalDepreciationPercentPerYear).toFixed(2)}
            />
          );
        }
        if ((row.depreciationPeriods ?? []).length > 0)
          return (
            <NumCell
              name={`${name}.${index}.depreciationPeriods.0.depreciationPerYear`}
              readOnly={readOnly}
              maxInt={3}
              label={`${tb('percentPerYearHeader')} ${position + 1}`}
            />
          );
        return (
          <span title={tb('setAgeFirst')}>
            <FormTableDash />
          </span>
        );
      },
    },
    {
      key: 'method',
      kind: 'input',
      group: tb('depreciationHeader'),
      header: tb('methodHeader'),
      width: cw('6.8571rem', '6.5714rem'),
      cell: ({ id, index, row }, { readOnly }) =>
        readOnly ? (
          row.depreciationMethod === 'Gross' ? (
            tb('methodGross')
          ) : (
            tb('methodPeriod')
          )
        ) : (
          <Controller
            name={`${name}.${index}.depreciationMethod`}
            control={control}
            render={({ field: f }) => (
              <TDropdown
                cell
                showValue={false}
                allowEmpty={false}
                options={methodOptions}
                value={f.value}
                onChange={v => {
                  f.onChange(v);
                  toggle(id, v === 'Period');
                }}
              />
            )}
          />
        ),
    },
    {
      // Table: total % over total price in one cell. Card: the price alone, the % in its label (priceDepreciation below).
      key: 'depreciationStack',
      kind: 'derived',
      align: 'end',
      group: tb('depreciationHeader'),
      header: stackHeader(tb('totalPercentHeader'), tb('totalPriceHeader')),
      show: 'table',
      width: cw('7.4286rem', '7.7143rem'),
      total: money2(totals.depreciation),
      cell: ({ row }) =>
        stacked(`${toNum(row.totalDepreciationPct).toFixed(2)}%`, money2(row.priceDepreciation)),
    },
    {
      key: 'priceDepreciation',
      kind: 'derived',
      group: tb('depreciationHeader'),
      show: 'card',
      total: money2(totals.depreciation),
      card: {
        label: grouped('depreciationHeader', 'totalPriceHeader'),
        // The total % rides in the label, so the card keeps 4 result cells in one row
        rowLabel: ({ row }) =>
          t('costBuilding.table.depreciationTotalWithPercent', {
            percent: toNum(row.totalDepreciationPct).toFixed(2),
          }),
      },
      cell: ({ row }) => money2(row.priceDepreciation),
    },
    {
      key: 'afterStack',
      kind: 'derived',
      align: 'end',
      group: tb('rcnAfterDepreHeader'),
      header: stackHeader(tb('pricePerSqmHeader'), tb('totalPriceHeader')),
      show: 'table',
      // Last figure before the frozen action column: a 15-digit total must not run under it
      width: cw('8rem', '8.2857rem'),
      total: money2(totals.after),
      cell: ({ row }) =>
        stacked(money2(row.pricePerSqMAfterDepreciation), money2(row.priceAfterDepreciation)),
    },
    {
      key: 'pricePerSqmAfter',
      kind: 'derived',
      group: tb('rcnAfterDepreHeader'),
      show: 'card',
      card: { label: grouped('rcnAfterDepreHeader', 'pricePerSqmHeader') },
      cell: ({ row }) => money2(row.pricePerSqMAfterDepreciation),
    },
    {
      key: 'priceAfter',
      kind: 'derived',
      group: tb('rcnAfterDepreHeader'),
      show: 'card',
      total: money2(totals.after),
      card: { label: grouped('rcnAfterDepreHeader', 'totalPriceHeader') },
      cell: ({ row }) => money2(row.priceAfterDepreciation),
    },
    {
      key: 'actions',
      kind: 'action',
      width: '2.5714rem',
      cell: ({ index }, { position }) => (
        <FormTableRowActions
          position={position}
          count={items.length}
          onDelete={() => remove(index)}
        />
      ),
    },
  ];

  return (
    <div>
      {/* data-field: scroll target for array-level errors (see form/utils.ts). Kept on an empty
          anchor rather than the table. */}
      <div data-field={name} />
      {fields.map((field, i) => (
        <RowSync key={field.id} base={`${name}.${i}`} />
      ))}
      <div className={layout === 'standard' ? STANDARD_DENSE : undefined}>
        <FormTable
          columns={columns}
          rows={items}
          rowKey={item => item.id}
          minWidth={MIN_WIDTH[layout]}
          add={[
            { label: tb('addBuilding'), onClick: () => handleRequestAdd(true) },
            { label: tb('addNonBuilding'), onClick: () => handleRequestAdd(false) },
          ]}
          empty={{ icon: 'building', message: tb('noDepreciationData') }}
          totalLabel={`${tb('tableTotal')} ${t('costBuilding.table.itemCount', { count: items.length })}`}
          rowNote={item =>
            item.row.depreciationMethod !== 'Gross' && expanded[item.id] ? (
              <PeriodEditor base={`${name}.${item.index}`} age={toNum(item.row.year)} />
            ) : null
          }
        />
      </div>

      {/* These are the figures the rest of the appraisal reads off this table. */}
      {!isEmpty && showCostSummary && (
        <div className="mt-[1.1429rem] divide-y divide-(--palette-line-soft) border-t border-(--palette-line-soft)">
          {costSummary.map(item => (
            <CostSummaryRow
              key={item.field}
              item={item}
              input={summaryField(item.field)}
              onUseCalculated={() => setValue(item.field, null, { shouldDirty: true })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CostSummaryItem {
  label: string;
  field: string;
  override: number | null | undefined;
  computed: number;
  source: string;
  sourceValue: number;
}

/** One stored figure (building cost value, insurance price): where it comes from, and the box that can override it. */
function CostSummaryRow({
  item,
  input,
  onUseCalculated,
}: {
  item: CostSummaryItem;
  input: Omit<UseFormRegisterReturn, 'ref'>;
  onUseCalculated: () => void;
}) {
  const { t } = useTranslation('pricingAnalysis');
  const readOnly = useFormReadOnly();
  const layout = useFormLayout();
  return (
    <div
      className={clsx(
        'grid grid-cols-1 items-center gap-2 py-[0.7143rem] sm:grid-cols-[1fr_minmax(0,21.4286rem)] sm:gap-6',
        // Compact sections have no body padding: the rows take the sheet's side padding
        layout === 'compact' && 'px-[0.8571rem]',
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-(--palette-ink)">{item.label}</span>
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              item.override != null
                ? 'bg-(--palette-warn-wash) text-(--palette-warn)'
                : 'bg-(--palette-accent-wash) text-(--palette-accent-ink)',
            )}
          >
            {item.override != null
              ? t('comparativeAnalysis.editedLabel')
              : t('methodStatus.calculated')}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-(--palette-ink-2)">
          <span>
            {item.source}{' '}
            <b className="font-medium tabular-nums text-(--palette-ink)">
              {money2(item.sourceValue)}
            </b>{' '}
            → {t('methodTabs.partialUsage.roundedThousand')}{' '}
            <b className="font-medium tabular-nums text-(--palette-ink)">{money2(item.computed)}</b>
          </span>
          {item.override != null && !readOnly && (
            <button
              type="button"
              className="text-xs text-(--palette-accent-ink) underline underline-offset-2"
              onClick={onUseCalculated}
            >
              {t('hypothesis.ledger.useCalculated')}
            </button>
          )}
        </div>
      </div>
      {readOnly ? (
        // A read page shows the figure as text, the way FormFields does (DESIGN.md 17.3)
        <div className="text-right font-semibold tabular-nums">
          <FormReadValue
            field={{ type: 'number-input', name: item.field, label: item.label, allowZero: true }}
            name={item.field}
            value={item.override ?? item.computed}
            required={false}
          />
        </div>
      ) : (
        <NumberInput
          {...input}
          value={item.override ?? item.computed}
          maxIntegerDigits={15}
          decimalPlaces={2}
          aria-label={item.label}
          className="font-semibold"
        />
      )}
    </div>
  );
}

/**
 * Keeps one row's age bands current, the job the slide-over used to do while it was open: each
 * band's % and ฿ follow area × price, and Gross stays a single band from year 1 to the age.
 */
function RowSync({ base }: { base: string }) {
  const { getValues, setValue } = useFormContext();
  const readOnly = useFormReadOnly();
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

const PERIOD_TH = 'px-[0.5714rem] py-1 text-right text-xs font-medium text-(--palette-ink-2)';
const PERIOD_TD = 'px-[0.5714rem] py-[0.2857rem] text-right align-middle';

/** A Period row's age bands, edited in the sub-row under it. */
function PeriodEditor({ base, age }: { base: string; age: number }) {
  const { t } = useTranslation('pricingAnalysis');
  const { control } = useFormContext();
  const readOnly = useFormReadOnly();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${base}.depreciationPeriods`,
  });
  const rows: PeriodRow[] = useWatch({ name: `${base}.depreciationPeriods` }) ?? [];

  const errors = periodErrors(rows, age, {
    toBeforeAt: (to, from) => t('costBuilding.table.periodToBeforeFrom', { to, from }),
    noAge: () => t('costBuilding.table.periodNeedsAge'),
    pastAge: (to, a) => t('costBuilding.table.periodPastAge', { to, age: a }),
    overlap: (from, prev) => t('costBuilding.table.periodOverlap', { from, prev }),
  });
  const lastToYear = rows.length > 0 ? toNum(rows[rows.length - 1]?.toYear) : 0;
  const canAdd = !readOnly && age > 0 && lastToYear < age;

  if (age <= 0 && rows.length === 0) {
    return <p className="text-sm text-(--palette-ink-2)">{t('costBuilding.table.setAgeFirst')}</p>;
  }

  return (
    <div
      role="group"
      aria-label={t('costBuilding.table.editPeriods')}
      className="flex max-w-[35rem] flex-col gap-2 overflow-x-auto py-1"
    >
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr>
            <th className={PERIOD_TH}>{t('costBuilding.table.fromYearHeader')}</th>
            <th className={PERIOD_TH}>{t('costBuilding.table.toYearHeader')}</th>
            <th className={PERIOD_TH}>{t('costBuilding.table.percentPerYearHeader')}</th>
            <th className={PERIOD_TH}>{t('costBuilding.table.totalPercentHeader')}</th>
            <th className={PERIOD_TH}>{t('costBuilding.table.totalPriceHeader')}</th>
            {!readOnly && <th className="w-10" />}
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
                  <td className={clsx(PERIOD_TD, 'w-[5.5rem]')}>
                    <NumCell
                      name={`${cell}.atYear`}
                      readOnly={readOnly}
                      digits={0}
                      maxInt={3}
                      invalid={invalid}
                      label={`${t('costBuilding.table.fromYearHeader')} ${i + 1}`}
                    />
                  </td>
                  <td className={clsx(PERIOD_TD, 'w-[5.5rem]')}>
                    <NumCell
                      name={`${cell}.toYear`}
                      readOnly={readOnly}
                      digits={0}
                      maxInt={3}
                      invalid={invalid}
                      label={`${t('costBuilding.table.toYearHeader')} ${i + 1}`}
                    />
                  </td>
                  <td className={clsx(PERIOD_TD, 'w-[6.5rem]')}>
                    <NumCell
                      name={`${cell}.depreciationPerYear`}
                      readOnly={readOnly}
                      maxInt={3}
                      label={`${t('costBuilding.table.percentPerYearHeader')} ${i + 1}`}
                    />
                  </td>
                  <td className={PERIOD_TD}>{toNum(row.totalDepreciationPct).toFixed(2)}</td>
                  <td className={PERIOD_TD}>{money2(row.priceDepreciation)}</td>
                  {!readOnly && (
                    <td className={PERIOD_TD}>
                      <FormTableRowActions
                        position={i}
                        count={fields.length}
                        onDelete={() => remove(i)}
                      />
                    </td>
                  )}
                </tr>
                {invalid && (
                  <tr>
                    <td colSpan={6} className="px-[0.5714rem] pb-1 text-xs text-(--palette-danger)">
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
        <Button
          variant="outline"
          size="sm"
          className="self-start"
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
        >
          + {t('costBuilding.table.addPeriod')}
        </Button>
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

      const totalYears = buildingDepreciations.reduce((acc: number, b: PeriodRow) => {
        const atYear = toNum(b.atYear);
        const toYear = toNum(b.toYear);
        return acc + Math.max(toYear - atYear + 1, 0);
      }, 0);

      if (totalYears === 0) return 0;

      const weightedSum = buildingDepreciations.reduce((acc: number, b: PeriodRow) => {
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

      const totalDepreciation = buildingDepreciations.reduce((acc: number, b: PeriodRow) => {
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
        .map((b: PeriodRow) => b.priceDepreciation)
        .reduce((acc: number, curr: unknown) => acc + toNum(curr), 0);
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
