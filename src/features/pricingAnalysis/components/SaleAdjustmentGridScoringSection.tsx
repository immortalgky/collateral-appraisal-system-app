import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Fragment, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useServerData } from '@features/pricingAnalysis/store/selectionContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { Icon } from '@/shared/components';
import { DenseProvider, RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import clsx from 'clsx';
import { saleGridFieldPath } from '@features/pricingAnalysis/adapters/saleAdjustmentGridFieldPath';
import { fmt } from '../domain/formatters';
import { useDerivedFields, type DerivedFieldRule } from '../adapters/useDerivedFieldArray';
import {
  buildSaleGridAdjustmentFactorAmountRules,
  buildSaleGridAdjustmentFactorDefaultPercentRules,
  buildSaleGridCalculationDerivedRules,
  buildSaleGridFinalValueRules,
} from '@features/pricingAnalysis/adapters/buildSaleAdjustmentGridDerivedRules.ts';
import type { FactorDataType, MarketComparableDetailType, TemplateDetailType } from '../schemas';
import { FactorValueDisplay } from './FactorValueDisplay';
import { SaleAdjustmentGridSecondRevision } from '@features/pricingAnalysis/components/SaleAdjustmentGridSecondRevision.tsx';
import { qualitativeDefault } from '@features/pricingAnalysis/domain/qualitativeDefault.ts';
import { deriveSecondRevisionVisibility } from '@features/pricingAnalysis/domain/deriveSecondRevisionVisibility';
import { getFactorDesciption } from '@features/pricingAnalysis/domain/getFactorDescription.ts';
import { useLocaleStore } from '@shared/store';
import { ScrollableTableContainer } from './ScrollableTableContainer';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { MarketComparableDetailModal } from './MarketComparableDetailModal';
import { useDateFormatter } from '@/shared/hooks/useFormatters';
import { marketKindLabel, marketDateLabel, marketUnitLabel } from '../domain/marketSubLabel';
import { detectMarketMajorityUnit, isMarketUnitOdd } from '../domain/detectPriceUnitMixed';
import type {
  ComparativeFactors,
  SaleAdjustmentGridQualitative,
} from '../types/saleAdjustmentGrid';

interface SaleAdjustmentGridScoringSectionProps {
  comparativeSurveys: MarketComparableDetailType[];
  property: Record<string, any>;
  template: TemplateDetailType;
}
export const SaleAdjustmentGridScoringSection = ({
  comparativeSurveys = [],
  property,
  template,
}: SaleAdjustmentGridScoringSectionProps) => {
  const isReadOnly = usePageReadOnly();
  const { t } = useTranslation('pricingAnalysis');
  /** field paths */
  const {
    comparativeFactors: comparativeFactorsPath,

    /** qualitative */
    qualitatives: qualitativesPath,
    qualitativeLevel: qualitativeLevelPath,
    qualitativeFactorCode: qualitativeFactorCodePath,

    /** initial value */
    calculationOfferingPrice: calculationOfferingPricePath,
    calculationOfferingPriceAdjustmentPct: calculationOfferingPriceAdjustmentPctPath,
    calculationOfferingPriceAdjustmentAmt: calculationOfferingPriceAdjustmentAmtPath,
    calculationSellingPrice: calculationSellingPricePath,
    calculationNumberOfYears: calculationNumberOfYearsPath,
    calculationAdjustmentYear: calculationAdjustmentYearPath,
    calculationTotalAdjustedSellingPrice: calculationTotalAdjustedSellingPricePath,

    /** 2nd revision */
    calculationAdjustedValue: calculationAdjustedValuePath,
    calculationSumFactorPct: calculationSumFactorPctPath,
    calculationSumFactorAmt: calculationSumFactorAmtPath,
    calculationTotalAdjustValue: calculationTotalAdjustValuePath,
    calculationWeight: calculationWeightPath,
    calculationWeightAdjustValue: calculationWeightAdjustValuePath,

    /** adjust percent */
    adjustmentFactors: adjustmentFactorsPath,
    adjustmentFactorAdjustPercent: adjustmentFactorAdjustPercentPath,
    adjustmentFactorAdjustAmount: adjustmentFactorAdjustAmountPath,
    adjustmentFactorsRemark: adjustmentFactorsRemarkPath,

    /** final value */
    finalValue: finalValuePath,
  } = saleGridFieldPath;

  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();

  const serverData = useServerData();
  const { showLand: showLandSecondRevision, showBuilding: showBuildingSecondRevision } =
    deriveSecondRevisionVisibility(serverData.groupDetail?.properties ?? []);
  const language = useLocaleStore(s => s.language);
  // Kind/date/unit sub-line — shared with ComparativeFactorTable.tsx / WQSScoringSection.tsx
  // via marketSubLabel.ts. The market header needs this to legitimately reach 36px (it's a
  // two-line header everywhere else in the mock); growing the row height without adding
  // the missing content back would just be padding, not what the mock actually shows.
  const dateFormatter = useDateFormatter({ day: 'numeric', month: 'short', year: '2-digit' });
  // mock:340/1417 — the header's unit token goes red when it's the minority unit among
  // the markets shown (user: "เรา highlight หน่วยที่เป็นส่วนน้อย"). Text colour only,
  // confirmed with the user — no background/border/chip.
  const marketMajorityUnit = useMemo(
    () => detectMarketMajorityUnit(comparativeSurveys),
    [comparativeSurveys],
  );
  const { control, getValues, setValue } = useFormContext();
  const {
    fields: qualitativeFactorFields,
    append: appendQualitativeFactor,
    remove: removeQualitativeFactor,
  } = useFieldArray({
    control,
    name: qualitativesPath(),
  });

  const {
    fields: adjustmentFactorsFields,
    append: appendAdjustmentFactor,
    remove: removeAdjustmentFactor,
  } = useFieldArray({
    control,
    name: adjustmentFactorsPath(),
  });

  const watchedQualitatives =
    (useWatch({ control, name: qualitativesPath() }) as SaleAdjustmentGridQualitative[]) ?? [];

  const usedFactorCodes = useMemo(
    () => watchedQualitatives.map(r => r?.factorCode).filter(Boolean),
    [watchedQualitatives],
  );

  const watchComparativeFactors =
    (useWatch({ name: comparativeFactorsPath() }) as ComparativeFactors[]) ?? [];

  const comparativeFactors = useMemo(() => {
    return getValues(comparativeFactorsPath()) as ComparativeFactors[];
  }, [watchComparativeFactors]);

  const handleAddRow = () => {
    appendQualitativeFactor({
      factorId: '',
      factorCode: null,
      qualitatives: comparativeSurveys.map(survey => ({
        marketId: survey.id,
        qualitativeLevel: 'E',
      })), // TODO: default value
    });

    appendAdjustmentFactor(
      {
        factorId: '',
        factorCode: '',
        surveys: comparativeSurveys.map(survey => ({
          marketId: survey.id,
          adjustPercent: 0,
          adjustAmount: 0,
        })),
      },
      { shouldFocus: false },
    );
  };

  const handleRemoveRow = (rowIndex: number) => {
    removeQualitativeFactor(rowIndex);

    removeAdjustmentFactor(rowIndex);
  };

  /** define rules */
  const calculationRules: DerivedFieldRule<any>[] = useMemo(() => {
    const rules = buildSaleGridCalculationDerivedRules({
      surveys: comparativeSurveys,
      property: property,
      allFactors: serverData.allFactors ?? [],
    });

    return rules;
  }, [comparativeSurveys, property, serverData.allFactors]);

  const adjustPercentDefaultRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildSaleGridAdjustmentFactorDefaultPercentRules({
      surveys: comparativeSurveys,
      qualitativeRows: getValues(qualitativesPath()),
    });
  }, [comparativeSurveys, qualitativeFactorFields.length]);

  const adjustAmountRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildSaleGridAdjustmentFactorAmountRules({
      surveys: comparativeSurveys,
      qualitativeRows: getValues(qualitativesPath()),
    });
  }, [comparativeSurveys, qualitativeFactorFields.length]);

  const finalValueRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildSaleGridFinalValueRules({
      surveys: comparativeSurveys,
    });
  }, [comparativeSurveys, qualitativeFactorFields]);

  useDerivedFields({ rules: calculationRules, ctx: { property: property } });
  useDerivedFields({ rules: adjustPercentDefaultRules });
  useDerivedFields({ rules: adjustAmountRules });
  useDerivedFields({ rules: finalValueRules });

  /** styles — Factor + Collateral sticky, contiguous from the left edge (same reorder
   * as WQSScoringSection.tsx). Verified safe the same way: rows are keyed by
   * factorCode/factorId, market cells carry their own marketId in the submit payload
   * (see mapSaleAdjustmentGridFormToSubmitSchema.ts), and displaySequence is the row's
   * array index — none of that depends on which columns are frozen. Market columns are
   * not reordered relative to each other. */
  // The ปัจจัย column is content-sized now (user: "ให้มันกว้างเท่า content ที่มี ไม่ต้อง fix
  // ความกว้าง"), so nothing downstream may hardcode where the second frozen column starts.
  // Measure the rendered header cell and publish it as a CSS variable on the <table>:
  // every Collateral cell reads `left: var(--pa-factor-w)`, which also reaches the rows
  // SaleAdjustmentGridSecondRevision renders into this same <table> — custom properties
  // inherit through the DOM, so those stay in lockstep without a prop.
  // Ceil, not round: a fractional *gap* between the two frozen columns lets the scrolling
  // body show through, while a fractional overlap is invisible (both cells are opaque).
  // 190 is the pre-measurement default so the first paint matches what shipped before.
  const COLLATERAL_WIDTH = 150;
  const factorHeaderRef = useRef<HTMLTableCellElement>(null);
  const [factorWidth, setFactorWidth] = useState(190);
  useLayoutEffect(() => {
    const el = factorHeaderRef.current;
    if (!el) return;
    const measure = () => setFactorWidth(Math.ceil(el.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // Feeds ScrollableTableContainer's goToColumn (scrolls to `offsetLeft - stickyWidth`)
  // and its "is this column visible" test. Derived, never a constant — a stale 340 here
  // would send the market-number chips to the wrong scroll offset the moment the ปัจจัย
  // column stopped being 190 wide.
  const stickyWidth = factorWidth + COLLATERAL_WIDTH;
  // User asked to remove the right-edge shadow ("เอาเงาด้านขวาออกให้ด้วย") — this
  // `after:` gradient was the frozen-column edge affordance. Left empty (rather than
  // deleting it from every clsx(...) call site below) so the horizontal scrollbar/
  // column-nav chips are the only "more content" signal now.
  const bgGradient = '';
  // Sticky-column edge shadow — see the matching const in ComparativeFactorTable.tsx.
  const stickyEdgeShadow =
    'shadow-[1px_0_0_#e3e9e8] transition-shadow duration-150 group-data-[scrolled=true]:shadow-[1px_0_0_#e3e9e8,6px_0_8px_-4px_rgba(16,24,32,0.22)]';
  // Soft divider between every column (mock lines 132-136) — directional so it never
  // fights `border-b-gray-300` also on these cells.
  const colDivider = 'border-r border-r-[#eef2f2]';
  // No w-/min-w-/max-w- at all — this column sizes to its own content. `whitespace-nowrap`
  // is what makes that mean "one line, as wide as the longest label" rather than "wrap at
  // some arbitrary width"; the widest labels live in the 2nd Revision and summary rows.
  const leftColumnBody = clsx(
    'border-b border-b-gray-300 text-left font-medium text-gray-600 px-[8px] py-0 sticky left-0 z-20 h-[26px] whitespace-nowrap',
    colDivider,
  );
  // Collateral stays a SINGLE column here (unlike WQS) — per team-lead's own
  // measurement of this table's mock, it's one descriptive value, never a Score/Weighted
  // pair, so there's nothing to split.
  const collateralColumnBody = clsx(
    'border-b border-b-gray-300 text-left font-medium px-[8px] py-0 sticky left-[var(--pa-factor-w,190px)] z-20 w-[150px] min-w-[150px] max-w-[150px] h-[26px] whitespace-nowrap',
    stickyEdgeShadow,
  );
  const surveyColumnBody = clsx(
    'px-[8px] py-0 border-b border-b-gray-300 min-w-[250px] h-[26px]',
    colDivider,
  );
  // Each market is two real sub-columns — ค่าปัจจัย (the market's own value for the
  // factor, read-only) 110px, then ระดับ (level) 82px. HANDOFF 14d / mock:1503: the
  // editable percentage left this grid and now lives only in the ADJUSTMENT & SUMMARY
  // band below, so the second sub-column is the level select, not a percent input.
  // 110 is the value column's floor because it carries descriptive text
  // ("ติดถนนสายรอง") rather than a number, same content the Collateral column holds —
  // and 150 is its ceiling for the same reason: without one, a long value (measured:
  // "Show House, Corner Plot, Corner without Window, Corner with U-Turn") stretched this
  // one column to 383px under table-layout: auto, which broke market-to-market alignment
  // and — through the shared <colgroup> — squeezed that market's Amount cell in the band
  // below to 104px. `overflow-hidden` alone never fired because the cell simply grew.
  // Same 150px ceiling as collateralColumnBody, which already truncates this exact text;
  // FactorValueDisplay wraps its output in `truncate` with a title, so the full value
  // stays available on hover. The level column keeps no ceiling — it's the one that
  // should absorb the market pair's surplus width.
  const valueColumnBody = clsx(
    'px-[8px] py-0 border-b border-b-gray-300 w-[110px] min-w-[110px] max-w-[150px] h-[26px] whitespace-nowrap overflow-hidden',
    colDivider,
  );
  const levelColumnBody = clsx(
    'px-[8px] py-0 border-b border-b-gray-300 w-[82px] min-w-[82px] h-[26px]',
    colDivider,
  );
  // Adjustment & Summary band cells. Deliberately NO min-w- (unlike surveyColumnBody's
  // min-w-[250px], which was sized for a cell spanning both sub-columns): these sit in
  // one sub-column each, so the <colgroup>'s 110/82 floors govern and table-layout: auto
  // grows whichever needs more. Reusing surveyColumnBody here would force 250px per
  // sub-column, i.e. 500px per market.
  const adjustCellBody = clsx('px-[8px] py-0 border-b border-b-gray-300 h-[26px]', colDivider);
  const totalCols = 2 + 2 * comparativeSurveys.length; // Factor, Collateral + markets(x2 each)

  const [isFactorBandOpen, setIsFactorBandOpen] = useState(true);
  const [isPriceBandOpen, setIsPriceBandOpen] = useState(true);
  // 2nd Revision is a band of its own (mock:1530), sibling to Adjustment & Summary —
  // not a row inside it.
  const [isSecondRevisionBandOpen, setIsSecondRevisionBandOpen] = useState(true);
  const [isAdjustBandOpen, setIsAdjustBandOpen] = useState(true);

  // The label sits sticky-left inside the colSpan cell so it stays readable at any
  // horizontal scroll position (user report: band text scrolling out mid-word).
  // Full-width button — the whole row is the click/keyboard target (user:
  // "ที่กดหุบแถวทำให้มันกดได้ทั้งแถว ตอนนี้มันกดได้แค่คอลัมแรก"). The sticky-left pin
  // moves to an inner span instead of living on the button itself, so both
  // requirements hold at once: the button covers the full row (real <button>, not a
  // <tr onClick> — keeps focus/Enter/Space/aria-expanded), and the visible icon+label
  // still pins to the left edge on horizontal scroll.
  const bandRow = (label: string, isOpen: boolean, onToggle: () => void) => (
    <tr>
      <td colSpan={totalCols} className="bg-gray-100 border-b border-gray-300 p-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="w-full h-[24px] bg-gray-100 text-left hover:bg-gray-200/60 transition-colors"
        >
          <span className="sticky left-0 z-20 inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <Icon
              style="solid"
              name="chevron-down"
              className={clsx('size-2.5 transition-transform', !isOpen && '-rotate-90')}
            />
            {label}
          </span>
        </button>
      </td>
    </tr>
  );

  return (
    <DenseProvider value={true}>
    {/* No rounded corners anywhere in this table — user's explicit call ("ตารางไม่เอาแบบมน"). */}
    <div className="flex-1 min-h-0 min-w-0 bg-white overflow-hidden flex flex-col border border-gray-300">
      <ScrollableTableContainer
        className="flex-1 min-h-0"
        stickyWidth={stickyWidth}
        columnNavSelector="thead th[data-nav-col]"
        scrollHeaderWithWheel
        edgeShadow
      >
        {/* table-layout: auto (the default — no `table-fixed` here), deliberately
            different from WQSScoringSection.tsx. The mock itself computes `auto` for
            this table: with only 3-6 markets its declared columns (802px) don't fill
            the container (1014px), so the browser must decide who gets the surplus.
            `fixed` would spread it across all 8 columns proportionally (measured:
            190->240, 150->190, everything scaled by the same 1.263x) — `auto` instead
            honours the first two columns' widths exactly and gives 100% of the slack to
            the market columns, which is what the mock does (ปัจจัย/ทรัพย์ stay 190/150 at
            any market count). WQSScoringSection.tsx stays on `table-fixed` because its
            declared widths (1388px) already equal its container — no surplus to
            mis-distribute, so `fixed` gives every column its exact value there instead.
            border-separate border-spacing-0 — without an explicit border-spacing the
            table's own default adds ~1px between rows on top of each cell's own
            h-[26px] (measured: 27px). WQSScoringSection.tsx already had this; this file
            never did. */}
        <table
          className="table min-w-max w-full border-separate border-spacing-0 text-[12px] leading-[25px] tabular-nums rounded-none"
          style={{ '--pa-factor-w': `${factorWidth}px` } as CSSProperties}
        >
          {/* ทรัพย์ still gets an exact <col> width; ปัจจัย deliberately gets none, so auto
              layout sizes it to its widest cell. Everything after them keeps its own <col>
              floor, which auto respects and only grows past if content demands more. */}
          <colgroup>
            <col />
            <col className="w-[150px]" />
            {comparativeSurveys.map(survey => (
              <Fragment key={survey.id}>
                <col className="w-[110px]" />
                <col className="w-[82px]" />
              </Fragment>
            ))}
          </colgroup>
          {/* Fully opaque, no backdrop-blur — every cell in here is sticky, and a
              sticky cell that lets 5% through shows the body scrolling underneath it
              (backdrop-blur then samples and smears that). The blur also made <thead>
              a stacking context, which scoped its children's z-25/z-23 inside a static
              element and let the sticky body column paint over the header. */}
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              <th
                rowSpan={comparativeSurveys.length > 0 ? 2 : 1}
                // This cell is what `factorWidth` measures — it spans both header rows, so
                // its rendered width is the whole ปัจจัย column's width.
                ref={factorHeaderRef}
                // A cell spanning both header rows doesn't inherit row 2's own
                // border-bottom (that border lives on row 2's cells, which this one
                // isn't part of), so the header's baseline broke exactly under this
                // column — user: "ช่อง ปัจจัย (Factors) เหมือน border ข้างล่างหายไป". Needs
                // its own explicit border-b border-b-gray-300 the way collateralColumnBody
                // (the Collateral header's rowSpan cell, right below) already carries.
                className={clsx(
                  'bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 left-0 z-25 px-[8px] py-0 h-[36px]! whitespace-nowrap border-b border-b-gray-300',
                  colDivider,
                )}
              >
                {t('saleAdjustmentGrid.scoringTable.factorsHeader')}
              </th>
              <th
                rowSpan={comparativeSurveys.length > 0 ? 2 : 1}
                className={clsx(
                  'bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-25 py-0 h-[36px]!',
                  collateralColumnBody,
                  bgGradient,
                )}
              >
                {t('saleAdjustmentGrid.scoringTable.collateralHeader')}
              </th>
              {/* Each market is now its own colSpan=2 group (ระดับ/ปรับ % sub-columns
                  below), not one merged "Comparative Data" span — matches the mock's own
                  per-market grouping, same restructure as WQSScoringSection.tsx. */}
              {comparativeSurveys.map((survey: MarketComparableDetailType, marketIndex: number) => (
                <th
                  key={survey.id}
                  colSpan={2}
                  data-nav-col
                  // No w-/max-w- here on purpose, now that this table is table-layout:
                  // auto — the market columns are exactly the ones meant to absorb the
                  // container's surplus width (matching the mock), and a max-width on
                  // this colSpan={2} header would cap that stretch at 154px instead.
                  // text-left, not text-center — the mock's own `.mhead` (mock:186) sets
                  // `display:flex; align-items:center` with no text-align at all, so the
                  // header content flows from the left edge. The centring was ours.
                  className="bg-gray-50 font-medium text-left px-[8px] py-0 border-b border-b-gray-300 border-r border-r-[#eef2f2] sticky top-0 h-[36px] z-23 whitespace-nowrap"
                >
                  {/* Two-line header (ordinal + kind·date·unit) — needed to legitimately
                      fill the 36px row, matching ComparativeFactorTable.tsx / mock's own
                      mhead() which renders this on every method, not just the data tab. */}
                  {/* Both inner lines need their own explicit leading — the <table>
                      carries leading-[25px] for the 26px body rows, and two lines at
                      that would total 50px, blowing the 36px row open and overlapping
                      the row-2 headers pinned at top-[36px] (that hardcoded offset is
                      what turns the overflow into a smear). Set here, not on the <th>,
                      so it doesn't fight the table's own leading. Same fix already in
                      WQSScoringSection.tsx. */}
                  {/* No `items-center` on the column: the children must STRETCH to the
                      cell's full width, otherwise the `flex-1` spacer below has nothing to
                      push against and the truncating sub-line gets a fit-content box
                      instead of the whole cell. */}
                  <div className="flex flex-col gap-0">
                    <div className="flex items-center gap-1.5 leading-[20px]">
                      {/* Ordinal position, not `survey.surveyName` — the stored name isn't
                          unique (real data: 3 surveys named "ตลาด 1"), and the mock
                          numbers columns by position for exactly that reason. */}
                      <span>{t('comparativeAnalysis.marketOrdinal', { n: marketIndex + 1 })}</span>
                      {/* mock:189 `.mhead .sp { flex: 1 }` — the spacer that pins the tool
                          button to the cell's right edge once the text is left-aligned. */}
                      <span className="flex-1" />
                      <button
                        type="button"
                        className="text-gray-500 hover:text-primary-600 transition-colors"
                        onClick={() => {
                          setSelectedSurveyId(survey.id ?? null);
                          onModalOpen();
                        }}
                        title={t('comparativeAnalysis.viewMarketDetail')}
                      >
                        <Icon name="arrow-up-right-from-square" style="solid" className="size-3" />
                      </button>
                    </div>
                    <div className="text-[10px] leading-[16px] font-normal text-gray-400 truncate">
                      {marketKindLabel(survey, t)} · {marketDateLabel(survey, dateFormatter)} ·{' '}
                      <span className={clsx(isMarketUnitOdd(survey, marketMajorityUnit) && 'text-[#dc2626] dark:text-[#fca5a5]')}>
                        {marketUnitLabel(survey, t)}
                      </span>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
            <tr className="border-b border-gray-300">
              {comparativeSurveys.map((survey: MarketComparableDetailType) => (
                <Fragment key={survey.id}>
                  <th className="bg-gray-50 font-medium text-left px-[8px] py-0 h-[26px] w-[110px] min-w-[110px] max-w-[150px] border-b border-b-gray-300 border-r border-r-[#eef2f2] sticky top-[36px] z-23 whitespace-nowrap">
                    {t('saleAdjustmentGrid.scoringTable.valueHeader')}
                  </th>
                  <th className="bg-gray-50 font-medium text-left px-[8px] py-0 h-[26px] w-[82px] min-w-[82px] border-b border-b-gray-300 border-r border-r-[#eef2f2] sticky top-[36px] z-23 whitespace-nowrap">
                    {t('saleAdjustmentGrid.scoringTable.levelHeader')}
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {bandRow(
              t('saleAdjustmentGrid.rows.comparativeFactorsBand'),
              isFactorBandOpen,
              () => setIsFactorBandOpen(o => !o),
            )}
            {isFactorBandOpen && (
              <>
                {/* qualitative section */}
                {qualitativeFactorFields.map((field, rowIndex: number) => {
                  const selected =
                    (getValues(qualitativeFactorCodePath({ row: rowIndex })) as string) ?? '';
                  const options = comparativeFactors
                    .filter(
                      cf => cf.factorCode === selected || !usedFactorCodes.includes(cf.factorCode),
                    )
                    .map(cf => ({
                      label:
                        getFactorDesciption(
                          cf.factorCode ?? '',
                          serverData.allFactors ?? [],
                          language,
                        ) ?? '',
                      value: cf.factorCode,
                    }));
                  const isTemplateFactor = (template?.calculationFactors ?? []).some(
                    t => t.factorCode === selected,
                  );
                  return (
                    <tr key={field.id} className="group/row">
                      <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="truncate">
                              {isTemplateFactor ? (
                                <RHFInputCell
                                  fieldName={qualitativeFactorCodePath({ row: rowIndex })}
                                  inputType="display"
                                  accessor={({ value }) =>
                                    value
                                      ? getFactorDesciption(
                                          value.toString(),
                                          serverData.allFactors ?? [],
                                          language,
                                        )
                                      : ''
                                  }
                                />
                              ) : (
                                <RHFInputCell
                                  fieldName={qualitativeFactorCodePath({ row: rowIndex })}
                                  inputType="select"
                                  options={options}
                                  onSelectChange={value => {
                                    const factor = serverData.allFactors?.find(
                                      (f: FactorDataType) => f.factorCode === value,
                                    );
                                    const fid = factor?.factorId ?? factor?.id ?? '';
                                    setValue(
                                      `saleAdjustmentGridQualitatives.${rowIndex}.factorId`,
                                      fid,
                                    );
                                    setValue(
                                      `saleAdjustmentGridAdjustmentFactors.${rowIndex}.factorId`,
                                      fid,
                                    );
                                  }}
                                />
                              )}
                            </div>
                          </div>
                          {!isTemplateFactor && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(rowIndex)}
                              className="size-5 flex-shrink-0 flex items-center justify-center cursor-pointer rounded text-gray-300 hover:text-danger-600 hover:bg-danger-50 transition-colors opacity-0 group-hover/row:opacity-100"
                              title={t('saleAdjustmentGrid.rows.deleteTitle')}
                            >
                              <Icon style="solid" name="trash" className="size-2.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={clsx('bg-white', collateralColumnBody)}>
                        {/* Should-fix 5: branch on fieldName. Truthy → resolved read-only
                            display. Null/empty → legacy editable input for manual entry. */}
                        {(() => {
                          const factorCode = watchedQualitatives[rowIndex]?.factorCode ?? '';
                          const factor = (serverData.allFactors ?? []).find(
                            (f: FactorDataType) => f.factorCode === factorCode,
                          );
                          const fieldName = factor?.fieldName as string | undefined;
                          if (fieldName) {
                            const raw = property[fieldName];
                            const rawStr = raw != null ? String(raw) : null;
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
                              fieldName={`saleAdjustmentGridQualitatives.${rowIndex}.collateralValue`}
                              inputType="text"
                              text={{ maxLength: 200 }}
                            />
                          );
                        })()}
                      </td>
                      {/* ค่าปัจจัย / ระดับ split (HANDOFF 14d, mock:1503/1511) — the grid
                          shows the market's own VALUE for this factor, read-only, exactly
                          like the Collateral column beside it, then the level select. The
                          editable percentage is no longer here: it lives only in the
                          "Adjustment & Summary" band below, which already renders it per
                          factor per market. The level still seeds that percentage — both
                          via the select's own onSelectChange (an explicit user choice) and
                          via buildSaleGridAdjustmentFactorDefaultPercentRules, which only
                          fires while the percentage is still empty. */}
                      {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => (
                        <Fragment key={survey.id}>
                          <td className={valueColumnBody}>
                            {(() => {
                              /* Same lookup ComparativeFactorTable.tsx:489 does on the data
                                 tab: match the survey's own factorData on factorCode — never
                                 on the label, which is a translated description and drifts. */
                              const factorCode = watchedQualitatives[rowIndex]?.factorCode ?? '';
                              const factorData = survey.factorData?.find(
                                (f: FactorDataType) => f.factorCode === factorCode,
                              );
                              if (
                                factorData?.value == null ||
                                String(factorData.value).trim() === ''
                              ) {
                                return <span className="text-gray-300">—</span>;
                              }
                              return (
                                <FactorValueDisplay
                                  value={factorData.value as string | undefined}
                                  dataType={factorData.dataType as string | undefined}
                                  parameterGroup={factorData.parameterGroup as string | undefined}
                                  fieldDecimal={factorData.fieldDecimal as number | undefined}
                                />
                              );
                            })()}
                          </td>
                          <td className={levelColumnBody}>
                            {/* Show the label alone ("เท่ากัน"), not "E - เท่ากัน": the three
                                labels are self-explanatory and the code carries no meaning to
                                the appraiser. Set per call site — TDropdown's showValue still
                                defaults to true for the ~14 other callers, some of which need
                                the code to tell repeated labels apart. The stored value is
                                unchanged, so qualitativeDefaultPercent still seeds off B/E/I. */}
                            <RHFInputCell
                              fieldName={qualitativeLevelPath({
                                row: rowIndex,
                                column: columnIndex,
                              })}
                              inputType="select"
                              dropdown={{ showValue: false }}
                              options={[
                                {
                                  label: t('saleAdjustmentGrid.rows.levelEqual'),
                                  value: 'E',
                                  colorClass: 'text-gray-600',
                                },
                                {
                                  label: t('saleAdjustmentGrid.rows.levelInferior'),
                                  value: 'I',
                                  colorClass: 'text-red-600',
                                },
                                {
                                  label: t('saleAdjustmentGrid.rows.levelBetter'),
                                  value: 'B',
                                  colorClass: 'text-green-600',
                                },
                              ]}
                              onSelectChange={value => {
                                switch (value) {
                                  case 'E': {
                                    return setValue(
                                      adjustmentFactorAdjustPercentPath({
                                        row: rowIndex,
                                        column: columnIndex,
                                      }),
                                      0,
                                    );
                                  }
                                  case 'I': {
                                    return setValue(
                                      adjustmentFactorAdjustPercentPath({
                                        row: rowIndex,
                                        column: columnIndex,
                                      }),
                                      5,
                                    );
                                  }
                                  case 'B': {
                                    return setValue(
                                      adjustmentFactorAdjustPercentPath({
                                        row: rowIndex,
                                        column: columnIndex,
                                      }),
                                      -5,
                                    );
                                  }
                                  default: {
                                    return setValue(
                                      adjustmentFactorAdjustPercentPath({
                                        row: rowIndex,
                                        column: columnIndex,
                                      }),
                                      0,
                                    );
                                  }
                                }
                              }}
                            />
                          </td>
                        </Fragment>
                      ))}
                    </tr>
                  );
                })}
                <tr>
                  {/* Back to two cells, not merged — user's reversal ("ปุ่มเพิ่มปัจจัยเอาให้
                      อยู่แค่คอลัมแรกพอ") after seeing the `w-full` button span both frozen
                      columns. Collateral is its own blank cell again and picks the sticky
                      edge shadow back up, since it's the rightmost frozen cell once more. */}
                  <td className={clsx('bg-white', leftColumnBody)}>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleAddRow()}
                        // Sized to match "+ เพิ่มตลาด" on the data tab (WQSForm.tsx:80,
                        // user: "แก้ไขปุ่มเพิ่มปัจจัยให้เล็กลงเหมือนหน้าข้อมูลเปรียบเทียบ") — same
                        // treatment as WQSScoringSection.tsx: kept `w-full` (this cell has
                        // nothing else in it) and `border-dashed` (the mock's own "add a
                        // row" signal, distinct from the reference button's job).
                        className="h-6 w-full px-2.5 text-[11.5px] font-medium border border-dashed border-primary/40 rounded-md cursor-pointer text-primary hover:bg-primary/5 hover:border-primary/60 transition-colors"
                      >
                        {t('saleAdjustmentGrid.rows.addMoreFactors')}
                      </button>
                    )}
                  </td>
                  <td className={clsx('bg-white', collateralColumnBody)}></td>
                  {comparativeSurveys.map(survey => (
                    <td key={survey.id} className={clsx(surveyColumnBody)} colSpan={2}></td>
                  ))}
                </tr>
              </>
            )}

            {bandRow(t('saleAdjustmentGrid.rows.offeringPriceBand'), isPriceBandOpen, () =>
              setIsPriceBandOpen(o => !o),
            )}
            {isPriceBandOpen && (
              <>
                <tr>
                  <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                    <span>{t('saleAdjustmentGrid.rows.offeringPrice')}</span>
                  </td>
                  <td className={clsx('bg-white', collateralColumnBody)}></td>
                  {comparativeSurveys.map(
                    (survey: MarketComparableDetailType, columnIndex: number) => {
                      return (
                        <td
                          key={survey.id}
                          className={clsx(surveyColumnBody, 'text-right')}
                          colSpan={2}
                        >
                          <RHFInputCell
                            fieldName={calculationOfferingPricePath({ column: columnIndex })}
                            inputType="display"
                            accessor={({ value }) => {
                              if (!value) return '';
                              // Unit deliberately not repeated on the value — the market
                              // column header's sub-line already carries it (user: "ลบหน่วย
                              // ออกจากช่อง row เพราะเราแสดงบนหัวตารางอยู่แล้ว").
                              return fmt(Number(value) || 0);
                            }}
                          />
                        </td>
                      );
                    },
                  )}
                </tr>
                <tr>
                  <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                    <div className={'flex flex-rows justify-between items-center'}>
                      <span>{t('saleAdjustmentGrid.rows.adjustedOfferingPriceLabel')}</span>
                      <span>{t('saleAdjustmentGrid.rows.percentUnit')}</span>
                    </div>
                  </td>
                  <td className={clsx('bg-white', collateralColumnBody)}></td>
                  {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                    const hasOfferPrice = !!survey.offerPrice;
                    const hasAdjustAmt = !!(
                      getValues(
                        calculationOfferingPriceAdjustmentAmtPath({ column: columnIndex }),
                      ) > 0
                    );
                    return (
                      <td
                        key={survey.id}
                        className="px-[8px] py-0 h-[26px] border-b border-b-gray-300 border-r border-r-[#eef2f2]"
                        colSpan={2}
                      >
                        {hasOfferPrice && (
                          <RHFInputCell
                            fieldName={calculationOfferingPriceAdjustmentPctPath({
                              column: columnIndex,
                            })}
                            inputType="number"
                            number={{
                              decimalPlaces: 2,
                              maxIntegerDigits: 3,
                              maxValue: 100.0,
                              allowNegative: false,
                            }}
                            disabled={hasAdjustAmt}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                    <div className={'flex flex-rows justify-between items-center'}>
                      <span>{t('saleAdjustmentGrid.rows.adjustedOfferingPriceLabel')}</span>
                      <span>{t('saleAdjustmentGrid.rows.amountUnit')}</span>
                    </div>
                  </td>
                  <td className={clsx('bg-white', collateralColumnBody)}></td>
                  {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                    const hasOfferPrice = !!survey.offerPrice;
                    const hasAdjustPct = !!(
                      getValues(
                        calculationOfferingPriceAdjustmentPctPath({ column: columnIndex }),
                      ) > 0
                    );
                    return (
                      <td key={survey.id} className={clsx(surveyColumnBody)} colSpan={2}>
                        {hasOfferPrice && (
                          <RHFInputCell
                            fieldName={calculationOfferingPriceAdjustmentAmtPath({
                              column: columnIndex,
                            })}
                            inputType="number"
                            number={{
                              decimalPlaces: 2,
                              maxIntegerDigits: 15,
                              maxValue: 999_999_999_999_999.0,
                              allowNegative: false,
                            }}
                            disabled={hasAdjustPct}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                    <span>{t('saleAdjustmentGrid.rows.sellingPrice')}</span>
                  </td>
                  <td className={clsx('bg-white', collateralColumnBody)}></td>
                  {comparativeSurveys.map(
                    (survey: MarketComparableDetailType, columnIndex: number) => {
                      const hasSalePrice = !!survey.salePrice;
                      const hasOfferPrice = !!survey.offerPrice;
                      if (!hasSalePrice)
                        return (
                          <td key={survey.id} className={clsx(surveyColumnBody)} colSpan={2}></td>
                        );
                      return (
                        <td
                          key={survey.id}
                          className={clsx(
                            surveyColumnBody,
                            'text-right',
                            hasOfferPrice && 'opacity-50',
                          )}
                          colSpan={2}
                        >
                          <RHFInputCell
                            fieldName={calculationSellingPricePath({ column: columnIndex })}
                            inputType="display"
                            accessor={({ value }) => {
                              if (!value) return '';
                              // Unit deliberately not repeated on the value — see the
                              // offering price row above.
                              return fmt(Number(value) || 0);
                            }}
                          />
                        </td>
                      );
                    },
                  )}
                </tr>
                <tr>
                  <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                    {t('saleAdjustmentGrid.rows.numberOfYears')}
                  </td>
                  <td className={clsx('bg-white', collateralColumnBody)}></td>
                  {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                    const hasOfferPrice = !!survey.offerPrice;
                    const hasSalePrice = !!survey.salePrice;
                    return (
                      <td
                        key={survey.id}
                        className={clsx(
                          'text-right',
                          surveyColumnBody,
                          (hasOfferPrice || !hasSalePrice) && 'opacity-50',
                        )}
                        colSpan={2}
                      >
                        <RHFInputCell
                          fieldName={calculationNumberOfYearsPath({ column: columnIndex })}
                          inputType="display"
                        />
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                    <div className={'flex flex-rows justify-between items-center'}>
                      <span>{t('saleAdjustmentGrid.rows.adjustedPeriod')}</span>
                      <span>{t('saleAdjustmentGrid.rows.percentUnit')}</span>
                    </div>
                  </td>
                  <td className={clsx('bg-white', collateralColumnBody)}></td>
                  {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                    const hasSalePrice = !!survey.salePrice;
                    const hasOfferPrice = !!survey.offerPrice;
                    return (
                      <td key={survey.id} className={clsx(surveyColumnBody)} colSpan={2}>
                        {hasSalePrice && (
                          <RHFInputCell
                            fieldName={calculationAdjustmentYearPath({ column: columnIndex })}
                            inputType="number"
                            number={{
                              decimalPlaces: 2,
                              maxIntegerDigits: 3,
                              maxValue: 100.0,
                              allowNegative: false,
                            }}
                            disabled={hasOfferPrice}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                    <div className="flex flex-rows justify-between items-center">
                      <span>{t('saleAdjustmentGrid.rows.cumulativeAdjustedPeriod')}</span>
                      <span>{t('saleAdjustmentGrid.rows.percentUnit')}</span>
                    </div>
                  </td>
                  <td className={clsx('bg-white', collateralColumnBody)}></td>
                  {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                    const hasSalePrice = !!survey.salePrice;
                    const hasOfferPrice = !!survey.offerPrice;
                    if (!hasSalePrice)
                      return (
                        <td key={survey.id} className={clsx(surveyColumnBody)} colSpan={2}></td>
                      );
                    return (
                      <td
                        key={survey.id}
                        className={clsx(
                          'text-right',
                          surveyColumnBody,
                          hasOfferPrice && 'opacity-50',
                        )}
                        colSpan={2}
                      >
                        <RHFInputCell
                          fieldName={calculationTotalAdjustedSellingPricePath({
                            column: columnIndex,
                          })}
                          inputType="display"
                          accessor={({ value }) => fmt(Number(value) || 0)}
                        />
                      </td>
                    );
                  })}
                </tr>
                {/* mock:1432-1434 — a `tr.tot` row (font-weight 600, background
                    var(--surface-2) in the mock). font-semibold on the whole row now:
                    the previous font-medium was invisible, since leftColumnBody already
                    puts font-medium on every label in this column. */}
                <tr>
                  <td className={clsx('bg-[#f8fafa] font-semibold', leftColumnBody)}>
                    <span>{t('saleAdjustmentGrid.rows.adjustedValueLabel')}</span>
                  </td>
                  <td className={clsx('bg-[#f8fafa]', collateralColumnBody)}></td>
                  {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                    return (
                      <td
                        key={survey.id}
                        className="bg-[#f8fafa] px-[8px] py-0 h-[26px] border-b border-b-gray-300 border-r border-r-[#eef2f2] text-right font-semibold"
                        colSpan={2}
                      >
                        <RHFInputCell
                          fieldName={calculationAdjustedValuePath({ column: columnIndex })}
                          inputType="display"
                          accessor={({ value }) => {
                            return fmt(Number(value) || 0);
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              </>
            )}

            {/* mock:1530 emits band('rev2', ...) as a sibling of band('adj', ...), so these
                rows get their own collapsible header instead of sitting inside Adjustment &
                Summary. Reuses this table's existing bandRow + useState machinery. The band
                only exists when there is something to revise — the mock's own
                `if (sr.land || sr.bld)` guard, which already gated the rows themselves. */}
            {(showLandSecondRevision || showBuildingSecondRevision) && (
              <>
                {bandRow(
                  t('saleAdjustmentGrid.secondRevision.title'),
                  isSecondRevisionBandOpen,
                  () => setIsSecondRevisionBandOpen(o => !o),
                )}
                {isSecondRevisionBandOpen && (
                  <SaleAdjustmentGridSecondRevision
                    comparativeSurveys={comparativeSurveys}
                    showLand={showLandSecondRevision}
                    showBuilding={showBuildingSecondRevision}
                  />
                )}
              </>
            )}

            {bandRow(t('saleAdjustmentGrid.rows.adjustmentSummaryBand'), isAdjustBandOpen, () =>
              setIsAdjustBandOpen(o => !o),
            )}
            {isAdjustBandOpen && (
              <>
                {/* adjust factors — the band's own sub-header (mock v76:1547-1548's
                    `tr.sub2`). It replaces the gray "Adjusted Value" divider that used to
                    sit here: the mock has no such row in this band, and once the cell below
                    splits in two these two sub-columns need their own labels, since the
                    table's <thead> labels them ค่าปัจจัย/ระดับ for the factor grid above. */}
                <tr>
                  <td
                    className={clsx(
                      'bg-gray-100 font-semibold! text-gray-700!',
                      leftColumnBody,
                      bgGradient,
                    )}
                  >
                    {/* mock:1547 labels this `tr.sub2` "ปัจจัย" / "Factor" — deliberately
                        NOT the same string as the <thead>'s "ปัจจัย (Factors)" (mock:1502),
                        which is why this is its own key. */}
                    {t('saleAdjustmentGrid.rows.factorSubHeader')}
                  </td>
                  <td className={clsx('bg-gray-100', collateralColumnBody)}></td>
                  {comparativeSurveys.map((survey: MarketComparableDetailType) => (
                    <Fragment key={survey.id}>
                      <td className={clsx('bg-gray-100 font-medium text-gray-600', adjustCellBody)}>
                        {t('saleAdjustmentGrid.scoringTable.adjustPercentHeader')}
                      </td>
                      <td
                        className={clsx(
                          'bg-gray-100 font-medium text-gray-600 text-right',
                          adjustCellBody,
                        )}
                      >
                        {t('saleAdjustmentGrid.scoringTable.amountHeader')}
                      </td>
                    </Fragment>
                  ))}
                </tr>
                {adjustmentFactorsFields.map((field, rowIndex) => {
                  return (
                    <tr key={field.id}>
                      <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                        {
                          <RHFInputCell
                            fieldName={qualitativeFactorCodePath({ row: rowIndex })}
                            inputType="display"
                            accessor={({ value }) =>
                              value
                                ? getFactorDesciption(
                                    value.toString(),
                                    serverData.allFactors ?? [],
                                    language,
                                  )
                                : ''
                            }
                          />
                        }
                      </td>
                      <td className={clsx('bg-white', collateralColumnBody)}>
                        <div className="flex flex-row justify-items-center items-center">
                          <RHFInputCell
                            fieldName={adjustmentFactorsRemarkPath({ row: rowIndex })}
                            inputType="text"
                            text={{ maxLength: 200 }}
                          />
                        </div>
                      </td>
                      {/* Two real sub-columns per market — [ปรับ % editable] + [จำนวนเงิน
                          read-only] — per plan §1.3a:97 and mock v76:1547-1551, which render
                          these as separate <td>s under the band's own ปรับ %/จำนวนเงิน header.
                          This is the destination half of 14d: the percentage left the factor
                          grid above and lands here. The level select stays on the
                          "Comparative Factors" band's row and still seeds this value. */}
                      {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => (
                        <Fragment key={survey.id}>
                          <td className={adjustCellBody}>
                            {getValues(
                              qualitativeLevelPath({ row: rowIndex, column: columnIndex }),
                            ) == 'E' ? (
                              <RHFInputCell
                                fieldName={adjustmentFactorAdjustPercentPath({
                                  row: rowIndex,
                                  column: columnIndex,
                                })}
                                inputType="display"
                              />
                            ) : (
                              <RHFInputCell
                                fieldName={adjustmentFactorAdjustPercentPath({
                                  row: rowIndex,
                                  column: columnIndex,
                                })}
                                inputType="number"
                                number={{
                                  decimalPlaces: 2,
                                  maxIntegerDigits: 3,
                                  maxValue: 100.0,
                                }}
                                onUserChange={v => {
                                  if (v == null) return null;
                                  const level =
                                    getValues(
                                      qualitativeLevelPath({
                                        row: rowIndex,
                                        column: columnIndex,
                                      }),
                                    ) ?? '';
                                  if (level === 'B') return -Math.abs(v);
                                  if (level === 'I') return Math.abs(v);
                                  if (level === 'E') return 0;
                                  return v;
                                }}
                              />
                            )}
                          </td>
                          <td className={clsx(adjustCellBody, 'text-right')}>
                            <RHFInputCell
                              fieldName={adjustmentFactorAdjustAmountPath({
                                row: rowIndex,
                                column: columnIndex,
                              })}
                              inputType="display"
                              accessor={({ value }) => {
                                return qualitativeDefault.includes(
                                  getValues(
                                    adjustmentFactorAdjustPercentPath({
                                      row: rowIndex,
                                      column: columnIndex,
                                    }),
                                  ),
                                ) ? (
                                  <div>{fmt(Number(value) || 0)}</div>
                                ) : (
                                  <div className="text-danger">{fmt(Number(value) || 0)}</div>
                                );
                              }}
                            />
                          </td>
                        </Fragment>
                      ))}
                    </tr>
                  );
                })}
                <tr>
                  {/* A total by name ("รวมส่วนต่างจากปัจจัย"), so it takes the same
                      font-semibold as every other total row — user: "พวกแถว total ทั้งหลาย
                      ให้ใช้ฟ้อนหน้ากว่าตรงอื่น". Deliberate deviation from the mock, which
                      leaves this one row plain. Raised with the user, who confirmed bold is
                      what they want here — a standing ruling, not an oversight. Do not
                      revert this row to plain on the grounds that the mock has it plain. */}
                  <td className={clsx('bg-white font-semibold', leftColumnBody, bgGradient)}>
                    <div className="flex flex-row justify-between items-center gap-2">
                      <span>{t('saleAdjustmentGrid.rows.totalDifferenceLabel')}</span>
                      <span>{t('saleAdjustmentGrid.rows.percentUnit')}</span>
                    </div>
                  </td>
                  <td className={clsx('bg-white', collateralColumnBody)}></td>
                  {/* Split to match the body rows above — mock v76:1554-1555 emits two
                      cells here too, so the % lands under ปรับ % and the baht under
                      จำนวนเงิน instead of both floating inside one merged cell. */}
                  {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => (
                    <Fragment key={survey.id}>
                      <td className={clsx(adjustCellBody, 'text-right font-semibold')}>
                        <RHFInputCell
                          fieldName={calculationSumFactorPctPath({ column: columnIndex })}
                          inputType="display"
                          accessor={({ value }) => fmt(Number(value) || 0)}
                        />
                      </td>
                      <td className={clsx(adjustCellBody, 'text-right font-semibold')}>
                        <RHFInputCell
                          fieldName={calculationSumFactorAmtPath({ column: columnIndex })}
                          inputType="display"
                          accessor={({ value }) => fmt(Number(value) || 0)}
                        />
                      </td>
                    </Fragment>
                  ))}
                </tr>
                {/* mock:1483-1487 — a `tr.tot` row (unlike `Total difference (%)` right
                    above it, which the mock deliberately leaves as a plain row): tinted
                    to match `Adjusted Value` in the scoring table above, WQS's `Total`,
                    and every other `tot` row — font-semibold (600), matching the mock and
                    every other total row. */}
                <tr>
                  <td className={clsx('bg-[#f8fafa] font-semibold', leftColumnBody, bgGradient)}>
                    <div className="flex flex-row justify-between items-center gap-2">
                      <span>{t('saleAdjustmentGrid.rows.totalOfAdjustedValue')}</span>
                    </div>
                  </td>
                  <td className={clsx('bg-[#f8fafa]', collateralColumnBody)}></td>
                  {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                    return (
                      <td
                        key={survey.id}
                        className={clsx(surveyColumnBody, 'bg-[#f8fafa] text-right font-semibold')}
                        colSpan={2}
                      >
                        <RHFInputCell
                          fieldName={calculationTotalAdjustValuePath({ column: columnIndex })}
                          inputType="display"
                          accessor={({ value }) => {
                            return fmt(Number(value) || 0);
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>

                {/* adjust weighted */}
                <tr>
                  <td
                    className={clsx(
                      'bg-gray-100 font-semibold! text-gray-700!',
                      leftColumnBody,
                      bgGradient,
                    )}
                  >
                    {t('saleAdjustmentGrid.rows.adjustWeightBand')}
                  </td>
                  <td className={clsx('bg-gray-100', collateralColumnBody)}></td>
                  {comparativeSurveys.map((survey: MarketComparableDetailType) => (
                    <td
                      key={survey.id}
                      className={clsx('bg-gray-100', surveyColumnBody)}
                      colSpan={2}
                    ></td>
                  ))}
                </tr>
                <tr>
                  <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                    {t('saleAdjustmentGrid.rows.weightingFactorLabel')}
                  </td>
                  <td className={clsx('bg-white', collateralColumnBody)}></td>
                  {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                    return (
                      <td key={survey.id} className={clsx(surveyColumnBody)} colSpan={2}>
                        <div className="flex flex-row justify-between items-center">
                          <RHFInputCell
                            fieldName={calculationWeightPath({ column: columnIndex })}
                            inputType="number"
                            number={{
                              decimalPlaces: 2,
                              maxIntegerDigits: 1,
                              maxValue: 1.0,
                              allowNegative: false,
                            }}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                    {t('saleAdjustmentGrid.rows.weightedAdjustedValueLabel')}
                  </td>
                  <td className={clsx('bg-white', collateralColumnBody)}></td>
                  {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                    return (
                      <td
                        key={survey.id}
                        className={clsx(surveyColumnBody, 'text-right')}
                        colSpan={2}
                      >
                        <RHFInputCell
                          fieldName={calculationWeightAdjustValuePath({ column: columnIndex })}
                          inputType="display"
                          accessor={({ value }) => {
                            return fmt(Number(value) || 0);
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              </>
            )}

            {/* final value — always visible, outside every collapsible band */}
            <tr>
              <td
                className={clsx(
                  // Plain `font-semibold`, not the `!font-semibold` prefix used elsewhere
                  // in this file: Tailwind v4 spells the important modifier as a SUFFIX,
                  // so the v3 prefix form is not a recognised class. It beats
                  // leftColumnBody's font-medium on stylesheet order regardless.
                  'bg-gray-100 font-semibold text-gray-700!',
                  leftColumnBody,
                  bgGradient,
                )}
              >
                {t('saleAdjustmentGrid.rows.finalValueLabel')}
              </td>
              <td className={clsx('bg-gray-100 text-right font-semibold', collateralColumnBody)}>
                <div>
                  <RHFInputCell
                    fieldName={finalValuePath()}
                    inputType="display"
                    accessor={({ value }) => fmt(Number(value) || 0)}
                  />
                </div>
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType) => (
                <td
                  key={survey.id}
                  className={clsx('bg-gray-100', surveyColumnBody)}
                  colSpan={2}
                ></td>
              ))}
            </tr>
          </tbody>
        </table>
      </ScrollableTableContainer>
      <MarketComparableDetailModal
        isOpen={isModalOpen}
        onClose={onModalClose}
        marketComparableId={selectedSurveyId}
      />
    </div>
    </DenseProvider>
  );
};
