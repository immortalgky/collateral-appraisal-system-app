import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { DCFAssumption, DCFCategory, DCFSection } from '../../types/dcf';
import type { MarketComparableDetailType } from '../../schemas';
import {
  roomTypeParameters,
  jobPositionParameters,
  propertyTaxRanges,
} from '../../data/dcfParameters';
import { dcfAssumptionSummary, resolveM13RefLabel } from '../../domain/dcf/dcfAssumptionSummary';
import {
  dcfAssumptionLabel,
  dcfCategoryLabel,
  dcfSectionLabel,
} from '../../domain/dcf/dcfNameLabel';
import { editAssumption } from '../../domain/dcf/editAssumption';
import { useAssumptionEditor } from '../../domain/dcf/useAssumptionEditor';
import { DiscountedCashFlowMethodModal } from './DiscountedCashFlowMethodModal';
import { DenseProvider, toNumber } from '../table/RHFInputCell';

// HANDOFF 18a / mock asmSheet() — tab 2, "read the assumptions through, then go to the
// value". Read-only: every figure comes from the same form state the calc table shows, and
// the only way to change anything is the row name, which opens the same Edit Assumption
// dialog the table uses.

const CELL =
  'px-[8px] py-0 h-[26px] text-[12px] leading-[25px] border-b border-gray-300 whitespace-nowrap';
const NUM = `${CELL} text-right tabular-nums`;
const TRUNC = 'overflow-hidden text-ellipsis';

const METHOD_NAME_KEYS = {
  '01': 'methodTabs.dcf.sheet.methodNames.01',
  '02': 'methodTabs.dcf.sheet.methodNames.02',
  '03': 'methodTabs.dcf.sheet.methodNames.03',
  '04': 'methodTabs.dcf.sheet.methodNames.04',
  '05': 'methodTabs.dcf.sheet.methodNames.05',
  '06': 'methodTabs.dcf.sheet.methodNames.06',
  '07': 'methodTabs.dcf.sheet.methodNames.07',
  '08': 'methodTabs.dcf.sheet.methodNames.08',
  '09': 'methodTabs.dcf.sheet.methodNames.09',
  '10': 'methodTabs.dcf.sheet.methodNames.10',
  '11': 'methodTabs.dcf.sheet.methodNames.11',
  '12': 'methodTabs.dcf.sheet.methodNames.12',
  '13': 'methodTabs.dcf.sheet.methodNames.13',
  '14': 'methodTabs.dcf.sheet.methodNames.14',
} as const;

const fmt = (v: unknown, digits = 0) =>
  (Number(v) || 0).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const sum = (arr: number[] | undefined) => (arr ?? []).reduce((t, x) => t + (Number(x) || 0), 0);
const codeLabel = (list: { code: string; description: string }[], code?: string, other?: string) =>
  other || list.find(p => p.code === code)?.description || code || '—';

interface Props {
  properties: Record<string, unknown>[];
  isReadOnly?: boolean;
  onStructuralChange?: () => void;
  incomeAnalysisId?: string;
  hostMethodId?: string;
  marketSurveys?: MarketComparableDetailType[];
  ensureIncomeAnalysisId?: () => Promise<string | undefined>;
}

export function DiscountedCashFlowAssumptionSheet({
  properties,
  isReadOnly,
  onStructuralChange,
  incomeAnalysisId,
  hostMethodId,
  marketSurveys,
  ensureIncomeAnalysisId,
}: Props) {
  const { t } = useTranslation('pricingAnalysis');
  const { control, getValues, setValue } = useFormContext();
  const sections = (useWatch({ control, name: 'sections' }) ?? []) as DCFSection[];
  const years = Number(useWatch({ control, name: 'totalNumberOfYears' })) || 0;
  const [shut, setShut] = useState<Set<string>>(new Set());
  // Sub-tables (method 10) start collapsed — the sheet must stay scannable (mock asmOpen).
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  };

  // Edit dialog — same modal and save path as the calc table (useAssumptionManagement),
  // minus its useFieldArray: that field array is already registered by the calc tab, which
  // stays mounted, and two field arrays on one path fight each other.
  const [editing, setEditing] = useState<{ s: number; c: number; clientId: string } | null>(null);
  const editSection = editing ? sections[editing.s] : undefined;
  const editCategory = editing ? editSection?.categories?.[editing.c] : undefined;
  const activeAssumption =
    editCategory?.assumptions?.find(a => a.clientId === editing?.clientId) ?? null;
  const { modalInitialData } = useAssumptionEditor({
    section: editSection as DCFSection,
    category: editCategory as DCFCategory,
    activeAssumption,
  });

  const summary = sections.find(
    s => s.sectionType === 'summaryDCF' || s.sectionType === 'summaryDirect',
  ) as (DCFSection & { grossRevenue?: number[] }) | undefined;
  const noi = summary?.grossRevenue ?? [];

  const band = (key: string, title: ReactNode) => (
    <tr
      key={`band-${key}`}
      onClick={() => toggle(shut, key, setShut)}
      className="cursor-pointer select-none"
    >
      <td
        colSpan={5}
        className="border-b border-gray-300 px-[8px] h-[22px] leading-[21px] bg-[#edf1f1] text-[11px] font-semibold tracking-[0.02em] text-[#55636f]"
      >
        <span
          className={clsx(
            'inline-block w-[10px] transition-transform',
            shut.has(key) && '-rotate-90',
          )}
        >
          ▾
        </span>{' '}
        {title}
      </td>
    </tr>
  );

  const itemRow = (key: string, text: string) => (
    <tr key={key}>
      {/* Rate lives in the text, never in a money column: the per-item figure is per day
          (01/07), per month (05/06) or per year (09), so one shared column would print a
          different unit on every line (HANDOFF 18a trap). */}
      <td
        colSpan={2}
        className={clsx(CELL, TRUNC, 'pl-[34px] text-[11px] text-gray-400')}
        title={text}
      >
        {text}
      </td>
      <td className={CELL} />
      <td className={CELL} />
      <td className={CELL} />
    </tr>
  );

  const itemLines = (a: DCFAssumption): [string, string][] => {
    const d = (a.method?.detail ?? {}) as Record<string, unknown>;
    const rows = (k: string) => (d[k] as Record<string, unknown>[] | undefined) ?? [];
    switch (a.method?.methodType) {
      case '01':
        return rows('roomDetails').map(r => [
          codeLabel(roomTypeParameters, r.roomType as string, r.roomTypeOther as string),
          t('methodTabs.dcf.sheet.perRoomDay', {
            rate: fmt(r.roomIncome, 2),
            n: fmt(r.saleableArea),
          }),
        ]);
      case '05':
        return rows('roomDetails').map(r => [
          codeLabel(roomTypeParameters, r.roomType as string, r.roomTypeOther as string),
          t('methodTabs.dcf.sheet.perRoomMonth', {
            rate: fmt(r.roomIncome, 2),
            n: fmt(r.saleableArea),
          }),
        ]);
      case '07':
        return rows('roomDetails').map(r => [
          codeLabel(roomTypeParameters, r.roomType as string, r.roomTypeOther as string),
          t('methodTabs.dcf.sheet.perRoomDay', {
            rate: fmt(r.roomExpensePerDay, 2),
            n: fmt(r.saleableArea),
          }),
        ]);
      case '06':
        return rows('areaDetail').map(r => [
          (r.description as string) || '—',
          t('methodTabs.dcf.sheet.perSqmMonth', {
            rate: fmt(r.rentalPrice, 2),
            area: fmt(r.saleableArea, 2),
          }),
        ]);
      case '09':
        return rows('jobPositionDetails').map(r => [
          codeLabel(jobPositionParameters, r.jobPosition as string, r.jobPositionOther as string),
          t('methodTabs.dcf.sheet.perPersonMonth', {
            rate: fmt(r.salaryBahtPerPersonPerMonth, 2),
            n: fmt(r.numberOfEmployees),
          }),
        ]);
      case '02':
        return rows('seasonDetails').map((r, i) => [
          (r.seasonName as string) || `${i + 1}`,
          `${t('methodTabs.dcf.sheet.seasonMonths', { n: fmt(r.numberOfMonths) })}${r.description ? ` · ${r.description}` : ''}`,
        ]);
      default:
        return [];
    }
  };

  // Method 10's government prices come from the group's properties, the same way its edit
  // dialog derives them (MethodParameterBasedOnTierOfPropertyValueModal).
  const govLand = properties
    .filter(p => ['L', 'LSL', 'LS'].includes(p.propertyType as string))
    .flatMap(p => (p.titles as { governmentPrice?: number }[] | undefined) ?? [])
    .reduce((s, x) => s + (toNumber(x.governmentPrice) ?? 0), 0);
  const govBuilding = properties
    .filter(p => ['B', 'LSB', 'LS'].includes(p.propertyType as string))
    .flatMap(
      p =>
        (p.depreciationDetails as
          | { isBuilding?: boolean; priceAfterDepreciation?: number }[]
          | undefined) ?? [],
    )
    .filter(x => x.isBuilding)
    .reduce((s, x) => s + (toNumber(x.priceAfterDepreciation) ?? 0), 0);

  // Both method-10 sub-tables share one geometry (mock v91): the same nested table, first
  // column 230px, scrolling inside its own row so the sheet never widens.
  const nested = (key: string, head: ReactNode, body: ReactNode) => (
    <tr key={key}>
      <td colSpan={5} className="p-0 pl-[34px] border-b border-gray-300 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-[11px] tabular-nums">
            <thead>{head}</thead>
            <tbody>{body}</tbody>
          </table>
        </div>
      </td>
    </tr>
  );
  const nCell = 'px-[8px] h-[24px] leading-[23px] border-b border-gray-200 whitespace-nowrap';
  const nFirst = `${nCell} sticky left-0 z-[1] bg-white w-[230px] min-w-[230px] shadow-[1px_0_0_#e5e7eb]`;
  const nNum = `${nCell} text-right min-w-[88px]`;

  const subTitle = (key: string, label: string, hint: string) => (
    <tr
      key={`st-${key}`}
      onClick={() => toggle(open, key, setOpen)}
      className="cursor-pointer select-none group/st"
    >
      <td
        colSpan={5}
        className="h-[20px] leading-[20px] pl-[20px] border-t border-[#cbd5d3] border-b border-gray-300 bg-[#f8fafa] text-[10.5px] font-semibold tracking-[0.04em] text-[#55636f] group-hover/st:bg-[#edf1f1]"
      >
        <span className="inline-block w-[10px] text-[#8a96a0]">{open.has(key) ? '▾' : '▸'}</span>{' '}
        {label}
        <span className="ml-2 font-normal tracking-normal text-[#8a96a0]">{hint}</span>
      </td>
    </tr>
  );

  const method10Rows = (a: DCFAssumption) => {
    const d = (a.method?.detail ?? {}) as { propertyTax?: Record<string, number[] | undefined> };
    const pt = d.propertyTax ?? {};
    const k = a.clientId;
    const rates = propertyTaxRanges.map(r => r.taxRate * 100);
    const govRow = (key: string, label: string, value: number) => (
      <tr key={key}>
        <td className={clsx(CELL, TRUNC, 'pl-[34px] text-[11px] text-gray-400')}>{label}</td>
        <td className={clsx(CELL, 'text-right tabular-nums text-[11px] text-gray-500')}>
          {fmt(value, 2)}
        </td>
        <td className={CELL} />
        <td className={CELL} />
        <td className={CELL} />
      </tr>
    );
    const yearRow = (label: string, arr: number[] | undefined, pct = false) => (
      <tr key={label}>
        <td className={nFirst}>{label}</td>
        {Array.from({ length: years }, (_, y) => (
          <td key={y} className={nNum}>
            {pct ? `${fmt((arr ?? [])[y], 3)}%` : fmt((arr ?? [])[y])}
          </td>
        ))}
      </tr>
    );
    return [
      govRow(`${k}-gl`, t('dcf.methods.tierOfPropertyValue.totalGovLandPrice'), govLand),
      govRow(`${k}-gb`, t('dcf.methods.tierOfPropertyValue.totalGovBuildingPrice'), govBuilding),
      subTitle(
        `${k}-rate`,
        t('dcf.methods.tierOfPropertyValue.taxRatesTableTitle'),
        t('methodTabs.dcf.sheet.tiersHint', {
          n: propertyTaxRanges.length,
          min: fmt(Math.min(...rates), 2),
          max: fmt(Math.max(...rates), 2),
        }),
      ),
      open.has(`${k}-rate`) &&
        nested(
          `${k}-rate-t`,
          <tr>
            <th className={clsx(nFirst, 'text-left font-medium')}>
              {t('dcf.methods.tierOfPropertyValue.estimatedPrice')}
            </th>
            <th className={clsx(nNum, 'w-[130px] font-medium')}>
              {t('dcf.methods.tierOfPropertyValue.taxRate')}
            </th>
            <th className={clsx(nNum, 'w-[130px] font-medium')}>
              {t('dcf.methods.tierOfPropertyValue.taxCeiling')}
            </th>
            <th className={clsx(nCell, 'w-auto')} />
          </tr>,
          propertyTaxRanges.map(r => (
            <tr key={r.minValue}>
              <td className={nFirst}>
                {fmt(r.minValue)} –{' '}
                {r.maxValue ? fmt(r.maxValue) : t('methodTabs.dcf.sheet.andAbove')}
              </td>
              <td className={nNum}>{fmt(r.taxRate * 100, 2)}%</td>
              <td className={nNum}>
                {r.maxValue ? fmt((r.maxValue - r.minValue) * r.taxRate) : '—'}
              </td>
              <td className={nCell} />
            </tr>
          )),
        ),
      subTitle(
        `${k}-year`,
        t('dcf.methods.tierOfPropertyValue.taxTableTitle'),
        t('methodTabs.dcf.sheet.yearsHint', { n: years }),
      ),
      open.has(`${k}-year`) &&
        nested(
          `${k}-year-t`,
          <tr>
            <th className={nFirst} />
            {Array.from({ length: years }, (_, y) => (
              <th key={y} className={clsx(nNum, 'font-medium')}>
                {t('dcf.methods.tierOfPropertyValue.yearLabel', { year: y + 1 })}
              </th>
            ))}
          </tr>,
          <>
            {yearRow(t('dcf.methods.tierOfPropertyValue.row1Label'), pt.landPrices)}
            {yearRow(
              t('dcf.methods.tierOfPropertyValue.row2Label'),
              Array(years).fill(govBuilding),
            )}
            {yearRow(t('dcf.methods.tierOfPropertyValue.row3Label'), pt.totalPropertyPrice)}
            {yearRow(t('dcf.methods.tierOfPropertyValue.propertyTaxRow'), pt.totalPropertyTax)}
            {yearRow(t('dcf.methods.tierOfPropertyValue.taxRate'), pt.totalPropertyTaxRates, true)}
          </>,
        ),
    ];
  };

  const rows: ReactNode[] = [];
  sections.forEach((section, si) => {
    if (section.sectionType !== 'income' && section.sectionType !== 'expenses') return;
    const secLabel = dcfSectionLabel(t, section.sectionType, section.sectionName);
    const key = section.clientId ?? `s${si}`;
    rows.push(band(key, secLabel));
    if (!shut.has(key)) {
      (section.categories ?? []).forEach((category, ci) => {
        const catTot = category.totalCategoryValues ?? [];
        rows.push(
          <tr key={`c-${category.clientId ?? ci}`}>
            <td className={clsx(CELL, TRUNC, 'bg-[#f8fafa] font-semibold')}>
              {dcfCategoryLabel(t, category.categoryName, category.categoryName ?? '')}{' '}
              <span className="inline-flex items-center justify-center min-w-4 h-[15px] px-[5px] rounded-lg text-[10.5px] font-medium bg-[#edf1f1] text-[#55636f]">
                {category.assumptions?.length ?? 0}
              </span>
            </td>
            <td className={clsx(CELL, 'bg-[#f8fafa]')} />
            <td className={clsx(CELL, 'bg-[#f8fafa]')} />
            <td className={clsx(NUM, 'bg-[#f8fafa] font-semibold')}>{fmt(catTot[0])}</td>
            <td className={clsx(NUM, 'bg-[#f8fafa] font-semibold')}>{fmt(sum(catTot))}</td>
          </tr>,
        );
        (category.assumptions ?? []).forEach((a, ai) => {
          const name = dcfAssumptionLabel(t, a.assumptionType, a.assumptionName ?? '');
          const smry = dcfAssumptionSummary(t, a.method, resolveM13RefLabel(t, sections, a));
          const code = a.method?.methodType as keyof typeof METHOD_NAME_KEYS | undefined;
          const methodName = code && METHOD_NAME_KEYS[code] ? t(METHOD_NAME_KEYS[code]) : '';
          const vals = a.totalAssumptionValues ?? [];
          rows.push(
            <tr key={`a-${a.clientId ?? ai}`}>
              <td className={clsx(CELL, TRUNC, 'pl-[16px]')}>
                <button
                  type="button"
                  onClick={() => setEditing({ s: si, c: ci, clientId: a.clientId })}
                  title={`${name} — ${t('methodTabs.dcf.sheet.clickToEdit')}`}
                  className="max-w-full truncate text-left cursor-pointer hover:text-primary hover:underline"
                >
                  {name}
                </button>
              </td>
              <td className={clsx(CELL, TRUNC, 'text-[11px] text-gray-500')} title={smry}>
                {smry}
              </td>
              <td className={clsx(CELL, TRUNC, 'text-[11px] text-gray-500')} title={methodName}>
                {methodName}
              </td>
              <td className={NUM}>{fmt(vals[0])}</td>
              <td className={NUM}>{fmt(sum(vals))}</td>
            </tr>,
          );
          if (code === '10') rows.push(...method10Rows(a));
          itemLines(a).forEach(([label, detail], ii) =>
            rows.push(itemRow(`i-${a.clientId}-${ii}`, `${label} · ${detail}`)),
          );
        });
      });
    }
    const secTot = section.totalSectionValues ?? [];
    rows.push(
      <tr key={`t-${key}`}>
        <td className={clsx(CELL, TRUNC, 'bg-[#f8fafa] font-semibold')}>
          {section.sectionType === 'income'
            ? t('methodTabs.dcf.sectionTotal.income')
            : t('methodTabs.dcf.sectionTotal.expenses')}
        </td>
        <td className={clsx(CELL, 'bg-[#f8fafa]')} />
        <td className={clsx(CELL, 'bg-[#f8fafa]')} />
        <td className={clsx(NUM, 'bg-[#f8fafa] font-semibold')}>{fmt(secTot[0])}</td>
        <td className={clsx(NUM, 'bg-[#f8fafa] font-semibold')}>{fmt(sum(secTot))}</td>
      </tr>,
    );
  });

  return (
    <div className="px-1 py-2">
      {/* table-fixed: max-width is ignored in auto layout, so without it the 230px item
          column stretched once there were no year columns to hold it (mock v91 trap). */}
      <table className="table-fixed w-full border-separate border-spacing-0 text-[12px] leading-[25px] tabular-nums border border-gray-200">
        <colgroup>
          <col className="w-[230px]" />
          <col />
          <col className="w-[190px]" />
          <col className="w-[120px]" />
          <col className="w-[140px]" />
        </colgroup>
        <thead>
          <tr className="bg-[#f8fafa]">
            <th className={clsx(CELL, 'text-left font-medium text-[#55636f]')}>
              {t('methodTabs.dcf.table.item')}
            </th>
            <th className={clsx(CELL, 'text-left font-medium text-[#55636f]')}>
              {t('methodTabs.dcf.table.assumption')}
            </th>
            <th className={clsx(CELL, 'text-left font-medium text-[#55636f]')}>
              {t('methodTabs.dcf.sheet.method')}
            </th>
            <th className={clsx(NUM, 'font-medium text-[#55636f]')}>
              {t('methodTabs.dcf.sheet.year1')}
            </th>
            <th className={clsx(NUM, 'font-medium text-[#55636f]')}>
              {t('methodTabs.dcf.sheet.totalYears', { n: years })}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows}
          <tr>
            <td className={clsx(CELL, TRUNC, 'font-bold bg-[#f8fafa] border-t border-gray-400')}>
              {t('methodTabs.dcf.sheet.noi')}
            </td>
            <td
              className={clsx(
                CELL,
                'text-[11px] text-gray-400 bg-[#f8fafa] border-t border-gray-400',
              )}
            >
              {t('methodTabs.dcf.sheet.noiNote')}
            </td>
            <td className={clsx(CELL, 'bg-[#f8fafa] border-t border-gray-400')} />
            <td className={clsx(NUM, 'font-bold bg-[#f8fafa] border-t border-gray-400')}>
              {fmt(noi[0])}
            </td>
            <td className={clsx(NUM, 'font-bold bg-[#f8fafa] border-t border-gray-400')}>
              {fmt(sum(noi))}
            </td>
          </tr>
        </tbody>
      </table>

      {editing && modalInitialData && (
        // Non-dense: a spacious edit modal, not a table row (same as DiscountedCashFlowCategory).
        <DenseProvider value={false}>
          <DiscountedCashFlowMethodModal
            initialData={modalInitialData}
            properties={properties}
            getOuterFormValues={getValues}
            editing={editing.clientId}
            onCancelEditMode={() => setEditing(null)}
            onSaveEditMode={draft => {
              setValue('sections', editAssumption(getValues('sections'), draft), {
                shouldDirty: false,
                shouldValidate: true,
              });
              onStructuralChange?.();
            }}
            size="2xl"
            isReadOnly={isReadOnly}
            incomeAnalysisId={incomeAnalysisId}
            hostMethodId={hostMethodId}
            marketSurveys={marketSurveys}
            ensureIncomeAnalysisId={ensureIncomeAnalysisId}
          />
        </DenseProvider>
      )}
    </div>
  );
}
