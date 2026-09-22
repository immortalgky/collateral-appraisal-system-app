import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/components';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import clsx from 'clsx';
import { DenseProvider, RHFInputCell } from './table/RHFInputCell';
import type {
  FactorDataType,
  MarketComparableDataType,
  MarketComparableDetailType,
  TemplateComparativeFactorType,
  TemplateDetailType,
} from '../schemas';
import { getFactorDesciption } from '@features/pricingAnalysis/domain/getFactorDescription.ts';
import { FactorValueDisplay } from './FactorValueDisplay';
import { useMemo, useState } from 'react';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useLocaleStore } from '@shared/store';
import { ScrollableTableContainer } from './ScrollableTableContainer';
import type { ComparativeFactors } from '../types/saleAdjustmentGrid';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { MarketComparableDetailModal } from './MarketComparableDetailModal';
import { useDateFormatter } from '@/shared/hooks/useFormatters';
import { marketKindLabel, marketDateLabel, marketUnitLabel } from '../domain/marketSubLabel';
import { detectMarketMajorityUnit, isMarketUnitOdd } from '../domain/detectPriceUnitMixed';

interface ComparativeFactorTableProps {
  comparativeMarketSurveys: MarketComparableDataType[];
  property: Record<string, unknown>;
  allFactors: FactorDataType[];
  template?: TemplateDetailType;
  fieldPath: Record<string, any>;
  /**
   * When true (room/rental references — no backing property), ALL factor collateral
   * cells render as editable inputs bound to `collateralValue` regardless of
   * whether the factor has a `fieldName`. The value is persisted by the backend
   * via the SaveComparativeAnalysis endpoint.
   */
  manualSubject?: boolean;
  /**
   * Opens the add-market-comparable modal. Rendered as the table's own "+" column
   * header (compact-layout redesign) instead of a standalone button above the table.
   * Omit to hide the column entirely (e.g. a future read-only-only caller).
   */
  onAddComparative?: () => void;
  /**
   * Drops a market comparable from the comparison (the header column's "x"). Omit to
   * hide the button — kept optional so a future read-only-only caller isn't forced to
   * wire it.
   */
  onRemoveComparative?: (survey: MarketComparableDataType) => void;
  /**
   * When true, a factor row with a blank Collateral value AND a blank cell in every
   * market column is not rendered. Purely a display filter — the row stays in the
   * field array untouched, so nothing is deleted and nothing sent on save changes.
   */
  hideEmptyRows?: boolean;
}
export function ComparativeFactorTable({
  comparativeMarketSurveys,
  property,
  allFactors,
  template,
  fieldPath,
  manualSubject,
  onAddComparative,
  onRemoveComparative,
  hideEmptyRows,
}: ComparativeFactorTableProps) {
  const isReadOnly = usePageReadOnly();
  const { t } = useTranslation('pricingAnalysis');
  const language = useLocaleStore(s => s.language);
  // Locale-correct short date (Thai: short Thai month + 2-digit Buddhist year, e.g.
  // "14 ม.ค. 68" — via Intl's th-TH-u-ca-buddhist calendar, not a hand-rolled +543).
  // Shared hook, already used elsewhere in the app for exactly this.
  const dateFormatter = useDateFormatter({ day: 'numeric', month: 'short', year: '2-digit' });
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const { isOpen: isDetailOpen, onOpen: openDetail, onClose: closeDetail } = useDisclosure();
  const {
    comparativeFactors: comparativeFactorsPath,
    comparativeFactorsFactorCode: comparativeFactorsFactorCodePath,
  } = fieldPath;

  const { control, getValues, setValue } = useFormContext();
  const {
    fields: comparativeSurveyFactors,
    append: appendComparativeSurveyFactors,
    remove: removeComparativeSurveyFactors,
  } = useFieldArray({
    control,
    name: comparativeFactorsPath(),
  });

  const watchComparativeFactors =
    (useWatch({ name: comparativeFactorsPath() }) as ComparativeFactors[]) ?? [];

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const usedFactorCodes = useMemo(
    () => watchComparativeFactors.map(r => r?.factorCode).filter(Boolean),
    [watchComparativeFactors],
  );

  // User asked to remove the right-edge shadow ("เอาเงาด้านขวาออกให้ด้วย") — this
  // `after:` gradient was the frozen-column edge affordance. Left empty (rather than
  // deleting it from every clsx(...) call site below) so the horizontal scrollbar/
  // column-nav chips are the only "more content" signal now.
  const stickyGradient = '';
  // Sticky-column edge shadow — hairline at rest, drop shadow once the scroll
  // container is past its origin. `ScrollableTableContainer` (fe-chart-scroller's
  // file) sets `data-scrolled` + the `group` class on the scrolling element; this is
  // the cell-side half of that contract. Only the LAST sticky column carries it (the
  // mock's `.stk2`/`.edge` — `.stk`, the first one, has no shadow of its own).
  const stickyEdgeShadow =
    'shadow-[1px_0_0_#e3e9e8] transition-shadow duration-150 group-data-[scrolled=true]:shadow-[1px_0_0_#e3e9e8,6px_0_8px_-4px_rgba(16,24,32,0.22)]';
  // Soft divider between every column, mock lines 132-136 — lighter than the sticky
  // column's own #e3e9e8 edge, which is what `stickyEdgeShadow` carries separately.
  // Directional `border-r-[…]` (not `border-[…]`) so this never fights another
  // class in the same clsx() call that sets `border-gray-*` for a different side.
  const colDivider = 'border-r border-r-[#eef2f2]';
  const factorColumnStyle = clsx('z-20', colDivider, stickyGradient);
  // Rows are 26px here, same as the calc tab — the user overruled the mock's own 36px
  // data-tab rows ("no row taller than 26px anywhere", calc tab is the reference).
  // py-0 — line-height (leading-[25px] on the <table>) carries the row's vertical
  // rhythm, matching the Factor column and the market cells. left-[190px], not
  // left-[250px] — the Factor column measured 190px wide in the mock, not 250; this
  // offset has to track that or a gap opens up between the two frozen columns.
  const collateralColumnStyle = clsx(
    'text-left font-medium px-[8px] py-0 w-[200px] min-w-[200px] max-w-[200px] whitespace-nowrap sticky left-[190px] z-20 overflow-hidden',
    colDivider,
    stickyEdgeShadow,
    stickyGradient,
  );

  // Kind/date/unit sub-line helpers — shared with the calc tab's market headers
  // (WQSScoringSection.tsx and friends) via marketSubLabel.ts, so there's exactly one
  // implementation of "how do we describe a market's kind/date/unit" instead of two
  // subtly different ones. This file is still where they're re-exported from
  // (originally written here first), the shared module just holds the actual logic now.
  const marketKindLabelFor = (survey: MarketComparableDataType) => marketKindLabel(survey, t);
  const marketDateLabelFor = (survey: MarketComparableDataType) => marketDateLabel(survey, dateFormatter);
  const marketUnitLabelFor = (survey: MarketComparableDataType) => marketUnitLabel(survey, t);

  // mock:340/1417 — the header's unit token goes red when it's the minority unit among
  // the markets shown, so the appraiser can spot which comparables are inconsistent
  // without opening each one (user: "เรา highlight หน่วยที่เป็นส่วนน้อย"). Text colour only,
  // confirmed with the user — no background/border/chip.
  const marketMajorityUnit = useMemo(
    () => detectMarketMajorityUnit(comparativeMarketSurveys),
    [comparativeMarketSurveys],
  );

  /** A blank cell renders an em dash rather than nothing — same convention as the
   * kind/date/unit fallbacks above, so an empty cell reads as "checked, nothing here"
   * rather than looking unloaded. */
  const emptyDash = <span className="text-gray-300">—</span>;

  // Three rows that are always last, after any user-added factors (user's call:
  // "เพิ่มวันที่ข้อมูล ราคาซื้อ/เสนอขาย และ remark เข้าไปที่ 3 factor สุดท้ายเสมอ", mock
  // dataRows 1167-1169). Not part of the comparativeFactors field array — there's
  // nothing to select/delete, they just read fixed fields off the survey itself, so
  // they render as plain display rows rather than RHFInputCells.
  const staticInfoRows: Array<{
    key: string;
    label: string;
    render: (survey: MarketComparableDetailType) => React.ReactNode;
  }> = [
    {
      key: 'infoDate',
      label: t('comparativeAnalysis.infoDateFactor'),
      render: survey => marketDateLabelFor(survey),
    },
    {
      key: 'offerSalePrice',
      label: t('comparativeAnalysis.offerSalePriceFactor'),
      render: survey => {
        // Same test marketKindLabel uses to pick "actual sale" vs "listing" — an
        // actual sale price renders plainly, a listing price in parens, so the
        // parens always agree with the header's kind sub-line.
        const price = survey.salePrice ?? survey.offerPrice;
        if (price == null) return emptyDash;
        const text = price.toLocaleString();
        return survey.salePrice != null ? text : `(${text})`;
      },
    },
    {
      key: 'remark',
      label: t('comparativeAnalysis.remarkFactor'),
      render: survey =>
        survey.notes ? (
          <span className="block max-w-[200px] truncate" title={survey.notes}>
            {survey.notes}
          </span>
        ) : (
          emptyDash
        ),
    },
  ];

  /** A factor row is empty when the Collateral cell AND every market cell for it are blank. */
  const isRowEmpty = (rowIndex: number, factorCode: string | null | undefined) => {
    const factor = allFactors?.find(f => f.factorCode === factorCode);
    const fieldName = factor?.fieldName as string | undefined;
    // `ComparativeFactors` (the type behind `watchComparativeFactors`) doesn't declare
    // `collateralValue` — it's a real field on the wire (see the RHFInputCell a few
    // lines down bound to this exact same path) but the local type is stale. Reading it
    // through `getValues` on the literal field path side-steps that drift instead of
    // widening the type, and can't fall out of sync with the input itself since both
    // read/write the same string path.
    const collateralValue =
      !manualSubject && fieldName
        ? property[fieldName]
        : getValues(`comparativeFactors.${rowIndex}.collateralValue`);
    const hasCollateral = collateralValue != null && String(collateralValue).trim() !== '';
    if (hasCollateral) return false;
    return !comparativeMarketSurveys.some((survey: MarketComparableDetailType) => {
      const fd = survey.factorData?.find((f: FactorDataType) => f.factorCode === factorCode);
      return fd?.value != null && String(fd.value).trim() !== '';
    });
  };

  if (comparativeMarketSurveys.length === 0) {
    return (
      <div className="bg-white border border-gray-200 flex-1 min-h-0 min-w-0 rounded-lg flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
        <Icon name="table" className="size-7 mb-2 text-gray-300" />
        <span className="text-sm text-gray-500">{t('comparativeAnalysis.noSurveys')}</span>
        {onAddComparative && !isReadOnly ? (
          <button
            type="button"
            onClick={onAddComparative}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-dashed border-primary/40 rounded-lg cursor-pointer hover:bg-primary/5 hover:border-primary/60 transition-colors"
          >
            <Icon name="plus" className="size-3" />
            {t('comparativeAnalysis.addComparativeData')}
          </button>
        ) : (
          <span className="text-xs mt-1 text-gray-400">
            {t('comparativeAnalysis.addComparativeDataHint')}
          </span>
        )}
      </div>
    );
  }

  // No rounded corners — user's explicit call ("ตารางไม่เอาแบบมน"), matches the mock's
  // calc tab all the way up the ancestor chain (measured: table 0px, wrapper 0px).
  return (
    <DenseProvider value={true}>
    <div className="bg-white border border-gray-200 flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
      <ScrollableTableContainer
        className="flex-1 min-h-0"
        stickyWidth={390}
        columnNavSelector="thead th[data-nav-col]"
        scrollHeaderWithWheel
        edgeShadow
      >
        {/* rounded-none — DaisyUI's own `.table` component class carries its own
            border-radius (measured 6.5px); the wrapping <div>'s rounded-xl removal
            didn't touch this, the radius is on the table itself. */}
        <table className="table min-w-max w-full text-[12px] leading-[25px] tabular-nums rounded-none">
          {/* Header cells are fully opaque with no backdrop-blur — this <thead> is
              sticky, so anything translucent in it shows the body scrolling underneath
              and backdrop-blur samples and smears that as it moves. */}
          <thead className="sticky top-0 z-30">
            <tr className="border-b border-gray-200 h-[36px]">
              <th
                className={clsx(
                  'bg-gray-100 sticky left-0 w-[190px] min-w-[190px] max-w-[190px] px-[8px] py-0 text-[11.5px] font-medium text-gray-500 uppercase tracking-wider',
                  factorColumnStyle,
                )}
              >
                {t('comparativeAnalysis.factor')}
              </th>
              <th
                className={clsx(
                  'bg-gray-100 text-[11.5px] font-medium text-gray-500 uppercase tracking-wider',
                  collateralColumnStyle,
                )}
              >
                {t('comparativeAnalysis.collateralHeader')}
              </th>
              {comparativeMarketSurveys.map((survey: MarketComparableDataType, marketIndex: number) => (
                <th
                  key={survey.id}
                  data-nav-col
                  className="bg-gray-100 text-left px-[8px] py-0 select-none min-w-[200px] align-middle border-r border-r-[#eef2f2]"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      {/* The header row is 36px on purpose (user ruling: "header ตาราง
                          สูงเท่าเดิมถูกแล้วไม่ต้องปรับ") — this 2-line market header is what
                          drives that height, so it must NOT be squeezed with a small
                          leading override. Content + icons are centred vertically in the
                          taller row (second user ruling — "ทำ alignment item center"). */}
                      {/* Ordinal position, not `survey.surveyName` — the stored name
                          isn't unique (real data: 3 surveys all literally named
                          "ตลาด 1"), and the mock numbers columns by position for exactly
                          that reason. The kind/date/unit sub-line still disambiguates. */}
                      <div className="text-[11.5px] font-medium text-gray-700 truncate">
                        {t('comparativeAnalysis.marketOrdinal', { n: marketIndex + 1 })}
                      </div>
                      <div className="text-[10px] leading-3 font-normal normal-case text-gray-400 truncate">
                        {marketKindLabelFor(survey)} · {marketDateLabelFor(survey)} ·{' '}
                        <span className={clsx(isMarketUnitOdd(survey, marketMajorityUnit) && 'text-[#dc2626] dark:text-[#fca5a5]')}>
                          {marketUnitLabelFor(survey)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSurveyId(survey.id ?? null);
                          openDetail();
                        }}
                        className="size-4 flex items-center justify-center rounded text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                        title={t('comparativeAnalysis.viewMarketDetail')}
                      >
                        <Icon name="arrow-up-right-from-square" style="solid" className="size-2.5" />
                      </button>
                      {onRemoveComparative && !isReadOnly && (
                        <button
                          type="button"
                          onClick={() => onRemoveComparative(survey)}
                          className="size-4 flex items-center justify-center rounded text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                          title={t('comparativeAnalysis.removeMarket')}
                        >
                          <Icon name="xmark" className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </th>
              ))}
              {onAddComparative && !isReadOnly && (
                <th className="bg-gray-100 w-8 min-w-8 px-1 py-0.5 border-l border-l-[#eef2f2]">
                  <button
                    type="button"
                    onClick={onAddComparative}
                    className="size-5 flex items-center justify-center rounded text-primary hover:bg-primary/10 transition-colors"
                    title={t('comparativeAnalysis.addComparativeData')}
                    aria-label={t('comparativeAnalysis.addComparativeData')}
                  >
                    <Icon name="plus" className="size-3" />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {/* use comparativeSurveyFactors directly because we need to update it immediatly */}
            {comparativeSurveyFactors.map((compFact: any, rowIndex: number) => {
              const selected = watchComparativeFactors[rowIndex]?.factorCode ?? '';
              const rowEmpty = isRowEmpty(rowIndex, selected);
              if (hideEmptyRows && rowEmpty) return null;
              const options = (allFactors ?? [])
                .filter(
                  cf =>
                    cf.factorCode === selected || !usedFactorCodes.includes(cf.factorCode ?? ''),
                )
                .map(cf => ({
                  label: getFactorDesciption(cf.factorCode ?? '', allFactors ?? [], language) ?? '',
                  value: cf.factorCode,
                }));
              return (
                <tr key={compFact.id} className="group/row transition-colors bg-white">
                  {/* No row-hover tint — mock:349 is the only hover rule on this table
                      and it only reveals the reference icon, never tints the row. A
                      hover fill was also silently spreading to every row at once here
                      before (this file's sticky cells have `bg-white` at rest but not
                      every one of them did, so the scrolling content underneath showed
                      through) — dropping it outright is simpler than auditing every
                      sticky cell for an opaque resting background, and matches the
                      mock exactly, which is what the user asked for first
                      ("เอา hover ออกหน่อย ... หรือ ... ใช้สีอื่นๆ เอาเทาๆ"). The `group` class
                      and the opacity-based icon reveal below stay — those are real
                      mock behaviour, not part of this removal. */}
                  <td
                    className={clsx(
                      'font-medium sticky left-0 h-[26px] px-[8px] py-0 border-b border-gray-100',
                      'bg-white',
                      factorColumnStyle,
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        {template?.comparativeFactors?.find((t: TemplateComparativeFactorType) => {
                          return t.factorCode === compFact.factorCode;
                        }) ? (
                          <RHFInputCell
                            fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                            inputType="display"
                            accessor={({ value }) => {
                              return (
                                <div
                                  title={
                                    getFactorDesciption(
                                      value.toString(),
                                      allFactors ?? [],
                                      language,
                                    ) ?? ''
                                  }
                                  // Muted when the row is empty — the same signal "ซ่อนแถวว่าง"
                                  // would remove, visible even with the checkbox off so the
                                  // appraiser can spot candidates before opting to hide them.
                                  className={clsx('truncate', rowEmpty && 'text-gray-400')}
                                >
                                  {getFactorDesciption(
                                    value.toString(),
                                    allFactors ?? [],
                                    language,
                                  ) ?? ''}
                                </div>
                              );
                            }}
                          />
                        ) : (
                          <RHFInputCell
                            fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                            inputType="select"
                            options={options}
                            onSelectChange={value => {
                              const factor = allFactors?.find(f => f.factorCode === value);
                              setValue(
                                `comparativeFactors.${rowIndex}.factorId`,
                                factor?.factorId ?? factor?.id ?? '',
                              );
                            }}
                          />
                        )}
                      </div>
                      {!template?.comparativeFactors?.find(
                        t => t.factorCode === compFact.factorCode,
                      ) && (
                        <button
                          type="button"
                          onClick={() => setDeleteIndex(rowIndex)}
                          className="size-5 flex-shrink-0 flex items-center justify-center cursor-pointer rounded text-gray-300 hover:text-danger-600 hover:bg-danger-50 transition-colors opacity-0 group-hover/row:opacity-100"
                          title={t('comparativeAnalysis.deleteFactorTitle')}
                        >
                          <Icon style="solid" name="trash" className="size-2.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td
                    className={clsx(
                      'border-b border-gray-100 text-gray-700 bg-white',
                      collateralColumnStyle,
                    )}
                  >
                    {/* Branch on fieldName + manualSubject.
                        manualSubject=true → always editable (room/rental refs: no backing property).
                        fieldName truthy → resolved read-only display from property.
                        Null/empty fieldName → editable collateralValue input. */}
                    {(() => {
                      const factorCode = watchComparativeFactors[rowIndex]?.factorCode;
                      const factor = allFactors?.find(f => f.factorCode === factorCode);
                      const fieldName = factor?.fieldName as string | undefined;
                      if (!manualSubject && fieldName) {
                        const raw = property[fieldName];
                        const rawStr = raw != null ? String(raw) : null;
                        if (rawStr == null || rawStr.trim() === '') return emptyDash;
                        return (
                          <FactorValueDisplay
                            value={rawStr}
                            dataType={factor?.dataType as string | undefined}
                            parameterGroup={factor?.parameterGroup as string | undefined}
                          />
                        );
                      }
                      return (
                        <RHFInputCell
                          fieldName={`comparativeFactors.${rowIndex}.collateralValue`}
                          inputType="text"
                          text={{ maxLength: 200 }}
                        />
                      );
                    })()}
                  </td>
                  {comparativeMarketSurveys.map((survey: MarketComparableDetailType) => {
                    return (
                      <td
                        key={survey.id}
                        className="px-[8px] py-0 border-b border-b-gray-100 border-r border-r-[#eef2f2] text-gray-700 min-w-[200px]"
                      >
                        {
                          <RHFInputCell
                            fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                            inputType="display"
                            accessor={({ value }) => {
                              const factorData = survey.factorData?.find(
                                (factor: FactorDataType) => factor.factorCode === value,
                              );
                              if (factorData?.value != null && String(factorData.value).trim() !== '') {
                                return (
                                  <FactorValueDisplay
                                    value={factorData.value as string | undefined}
                                    dataType={factorData.dataType as string | undefined}
                                    parameterGroup={factorData.parameterGroup as string | undefined}
                                    fieldDecimal={factorData.fieldDecimal as number | undefined}
                                  />
                                );
                              }
                              return emptyDash;
                            }}
                          />
                        }
                      </td>
                    );
                  })}
                  {onAddComparative && !isReadOnly && (
                    <td className="border-b border-gray-100 bg-white" />
                  )}
                </tr>
              );
            })}
            {staticInfoRows.map(row => (
              <tr key={row.key} className="transition-colors bg-white">
                <td
                  className={clsx(
                    'font-medium sticky left-0 h-[26px] px-[8px] py-0 border-b border-gray-100 bg-white',
                    factorColumnStyle,
                  )}
                >
                  {row.label}
                </td>
                <td
                  className={clsx(
                    'border-b border-gray-100 text-gray-700 bg-white',
                    collateralColumnStyle,
                  )}
                >
                  {emptyDash}
                </td>
                {comparativeMarketSurveys.map((survey: MarketComparableDetailType) => (
                  <td
                    key={survey.id}
                    className="px-[8px] py-0 border-b border-b-gray-100 border-r border-r-[#eef2f2] text-gray-700 min-w-[200px]"
                  >
                    {row.render(survey)}
                  </td>
                ))}
                {onAddComparative && !isReadOnly && (
                  <td className="border-b border-gray-100 bg-white" />
                )}
              </tr>
            ))}
            <tr>
              <td
                className={clsx(
                  'bg-white sticky left-0 px-3 py-2 border-b border-b-[#eef2f2]',
                  'z-15',
                  colDivider,
                  stickyGradient,
                )}
              >
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() =>
                      appendComparativeSurveyFactors({
                        factorId: '',
                        factorCode: null,
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-dashed border-primary/40 rounded-lg cursor-pointer hover:bg-primary/5 hover:border-primary/60 transition-colors"
                  >
                    <Icon name="plus" className="size-3" />
                    {t('comparativeAnalysis.addFactor')}
                  </button>
                )}
              </td>
              <td
                className={clsx('bg-white border-b border-b-[#eef2f2]', collateralColumnStyle)}
              />
              {comparativeMarketSurveys.map((survey: MarketComparableDetailType) => (
                <td
                  key={survey.id}
                  className="px-3 py-1.5 border-b border-r border-[#eef2f2]"
                />
              ))}
              {onAddComparative && !isReadOnly && (
                <td className="bg-white border-b border-b-[#eef2f2]" />
              )}
            </tr>
          </tbody>
        </table>
      </ScrollableTableContainer>
      <ConfirmDialog
        isOpen={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        onConfirm={() => {
          if (deleteIndex !== null) {
            removeComparativeSurveyFactors(deleteIndex);
            setDeleteIndex(null);
          }
        }}
        variant="danger"
        title={t('comparativeAnalysis.removeFactorTitle')}
        message={t('comparativeAnalysis.removeFactorConfirmMessage')}
      />
      <MarketComparableDetailModal
        isOpen={isDetailOpen}
        onClose={closeDetail}
        marketComparableId={selectedSurveyId}
      />
    </div>
    </DenseProvider>
  );
}
