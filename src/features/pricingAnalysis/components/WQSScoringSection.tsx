import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useServerData } from '@features/pricingAnalysis/store/selectionContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { wqsFieldPath } from '../adapters/wqsFieldPath';
import { fmt, toNum } from '../domain/formatters';
import clsx from 'clsx';
import { DenseProvider, RHFInputCell } from './table/RHFInputCell';
import { Icon } from '@/shared/components';
import {
  buildWQSCalculationDerivedRules,
  buildWQSFinalValueDerivedRules,
  buildWQSScoringSurveyDerivedRules,
  buildWQSTotalScoreRules,
} from '../adapters/buildWQSDerivedRules';
import type {
  FactorDataType,
  MarketComparableDataType,
  MarketComparableDetailType,
  TemplateDetailType,
} from '../schemas';
import {
  type DerivedFieldRule,
  useDerivedFields,
} from '@features/pricingAnalysis/adapters/useDerivedFieldArray.tsx';
import { getFactorDesciption } from '@features/pricingAnalysis/domain/getFactorDescription.ts';
import { useLocaleStore } from '@shared/store';
import { useDateFormatter } from '@/shared/hooks/useFormatters';
import { marketKindLabel, marketDateLabel, marketUnitLabel } from '../domain/marketSubLabel';
import { detectMarketMajorityUnit, isMarketUnitOdd } from '../domain/detectPriceUnitMixed';
import { ScrollableTableContainer } from './ScrollableTableContainer';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { MarketComparableDetailModal } from './MarketComparableDetailModal';
import { isScoreReasonable } from '@/features/pricingAnalysis/domain/checkWQSReasonableScore';
import type { ComparativeFactor, WQSScore } from '../types/wqs';

interface WQSScoringSectionProps {
  comparativeSurveys: MarketComparableDataType[];
  template?: TemplateDetailType;
}

export function WQSScoringSection({
  comparativeSurveys = [],
  template,
}: WQSScoringSectionProps) {
  const isReadOnly = usePageReadOnly();
  const { t } = useTranslation('pricingAnalysis');
  const {
    comparativeFactors: comparativeFactorsPath,

    /** scoring section path */
    scoringFactors: scoringFactorsPath,
    scoringFactorCode: scoringFactorCodePath,
    scoringFactorWeight: scoringFactorWeightPath,
    scoringFactorIntensity: scoringFactorIntensityPath,
    scoringFactorWeightedIntensity: scoringFactorWeightedIntensityPath,

    scoringFactorCollateralScore: scoringFactorCollateralScorePath,
    scoringFactorCollateralWeightedScore: scoringFactorCollateralWeightedScorePath,

    scoringFactorSurveySurveyScore: scoringFactorSurveySurveyScorePath,
    scoringFactorSurveyWeightedSurveyScore: scoringFactorSurveyWeightedSurveyScorePath,

    /** total score */
    totalWeight: totalWeightPath,
    totalIntensity: totalIntensityPath,
    totalWeightedIntensity: totalWeightedIntensityPath,
    totalSurveyScore: totalSurveyScorePath,
    totalWeightedSurveyScore: totalWeightedSurveyScorePath,
    totalCollateralScore: totalCollateralScorePath,
    totalWeightedCollateralScore: totalWeightedCollateralScorePath,

    /** calculation section path */
    calculationOfferingPrice: calculationOfferingPricePath,
    calculationOfferingPriceAdjustmentPct: calculationOfferingPriceAdjustmentPctPath,
    calculationOfferingPriceAdjustmentAmt: calculationOfferingPriceAdjustmentAmtPath,
    calculationSellingPrice: calculationSellingPricePath,
    calculationNumberOfYears: calculationNumberOfYearsPath,
    calculationAdjustmentYear: calculationAdjustmentYearPath,
    calculationTotalAdjustedSellingPrice: calculationTotalAdjustedSellingPricePath,
    calculationAdjustedValue: calculationAdjustedValuePath,

    /** final value (shown at bottom of scoring table) */
    finalValueFinalValue: finalValueFinalValuePath,
  } = wqsFieldPath;

  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();

  const serverData = useServerData();
  const language = useLocaleStore(s => s.language);
  // Same options as ComparativeFactorTable.tsx's dateFormatter — the market sub-line
  // reads identically on both tabs.
  const dateFormatter = useDateFormatter({ day: 'numeric', month: 'short', year: '2-digit' });
  const { control, getValues, setValue } = useFormContext();
  const {
    fields: scoringFactorFields,
    append: appendScoringFactor,
    remove: removeScoringFactor,
  } = useFieldArray({
    control,
    name: scoringFactorsPath(),
  });

  const watchedScoringFactors =
    (useWatch({
      control,
      name: scoringFactorsPath(),
    }) as WQSScore[]) ?? [];

  const usedFactorCodes = useMemo(
    () => watchedScoringFactors.map(r => r?.factorCode).filter(Boolean),
    [watchedScoringFactors],
  );

  const comparativeFactors =
    (useWatch({ name: comparativeFactorsPath() }) as ComparativeFactor[]) ?? [];

  const handleAddRow = () => {
    appendScoringFactor({
      factorId: '',
      factorCode: null,
      weight: 0,
      intensity: 0,
      weightedIntensity: 0,
      surveys: comparativeSurveys.map(s => {
        return {
          marketId: s.id,
          surveyScore: 0,
          weightedSurveyScore: 0,
        };
      }),
      collateral: 0,
      collateralWeightedScore: 0,
    });
  };

  const handleRemoveRow = (rowIndex: number) => {
    removeScoringFactor(rowIndex);
  };

  /** Rules */
  const scoringSurveyRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildWQSScoringSurveyDerivedRules({
      surveys: comparativeSurveys,
      scoringRows: getValues(scoringFactorsPath()) ?? [],
    });
  }, [comparativeSurveys, scoringFactorFields.length]);

  const totalScoreRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildWQSTotalScoreRules({
      surveys: comparativeSurveys,
      scoringRows: getValues(scoringFactorsPath()) ?? [],
    });
  }, [comparativeSurveys, scoringFactorFields.length]);

  const calculationRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildWQSCalculationDerivedRules({ surveys: comparativeSurveys });
  }, [comparativeSurveys, scoringFactorFields.length]);

  const finalValueRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildWQSFinalValueDerivedRules({ surveys: comparativeSurveys });
  }, [comparativeSurveys, scoringFactorFields]);

  useDerivedFields({ rules: scoringSurveyRules });
  useDerivedFields({ rules: totalScoreRules });
  useDerivedFields({ rules: calculationRules });
  useDerivedFields({ rules: finalValueRules });

  // Compact-layout redesign — REVERTED 2026-09-19. An earlier reading of a planning
  // answer said to freeze only Factor + Collateral, moving Collateral directly after
  // Factor and letting Weight/Intensity/Score scroll away with the market columns.
  // That reading was wrong: the mock screenshot of this exact tab shows the frozen
  // block as Factor + the whole Calculation block (Weight, Intensity, Score) +
  // Collateral, in that left-to-right order, with only the market columns scrolling —
  // see HANDOFF §3.1, which flags the mock's own `tableWqs()` markup as the one place
  // it is NOT stale. Restored to that shape. Still a render-order-only change: row
  // identity travels via `factorId`/`factorCode` on each WQSScore row (not row
  // position), each market cell carries its own `marketId` in the payload (not column
  // position), and `displaySequence` is the row's array index, unrelated to which
  // columns are frozen. No array-by-index binding depends on left-to-right order here.
  // Column widths measured off the mock (Thai, 1366x768). Collateral and each market
  // are now two REAL sub-columns (Score / Weighted) with their own <th>, not one wide
  // column with an internal flex split — that's what made the calc table read ~300px
  // wider than the mock.
  // The ปัจจัย column is content-sized (user: "ให้มันกว้างเท่า content ที่มีไม่ได้หรอ ไม่ต้อง fix
  // ความกว้าง"), so nothing to its right may hardcode where it ends. Measure the rendered
  // header cell and derive every frozen column's offset from it.
  // Ceil, not round: a fractional *gap* between two frozen columns lets the scrolling body
  // show through, while a fractional overlap is invisible (both cells are opaque).
  // 190 is the pre-measurement default so the first paint matches what shipped before.
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
  // These offsets are INLINE STYLES, not Tailwind classes, and must stay that way. Two
  // separate traps: a `` `left-[${x}px]` `` template never reaches the JIT scanner (it
  // regexes raw source text for complete class tokens), and the
  // `left-[calc(var(--pa-factor-w,190px)+56px)]` shape that would dodge the template is
  // unproven in this build — SAG/DC only ever needed the bare
  // `left-[var(--pa-factor-w,190px)]`, with no arithmetic. Either miss compiles to nothing,
  // which detaches the frozen column and scrolls it away with the body, and `tsc` cannot
  // see that failure. An inline style has no compile step to get wrong.
  // Columns 2-6 keep their declared widths: 56 + 60 + 60 + 56 + 66.
  const stickyLeft = {
    weight: { left: factorWidth },
    intensity: { left: factorWidth + 56 },
    score: { left: factorWidth + 116 },
    collateralScore: { left: factorWidth + 176 },
    collateralWeighted: { left: factorWidth + 232 },
  };
  // Feeds ScrollableTableContainer's goToColumn (`offsetLeft - stickyWidth`) and its
  // "is this column visible" test. Derived, never a constant — a stale 488 would send the
  // market-number chips to the wrong scroll offset the moment ปัจจัย stopped being 190 wide.
  // 298 = the five frozen columns to its right.
  const stickyWidth = factorWidth + 298;
  // Row 1 grows to 34px to fit the market header's two lines (name+icon / kind·date·unit),
  // the same height the market header used to have as a row-2-only cell. Row 2's sticky
  // offset has to track that, same as the row1 h-[26px]→top-[26px] pairing everywhere else.
  // User asked to remove the right-edge shadow ("เอาเงาด้านขวาออกให้ด้วย") — this
  // `after:` gradient was the frozen-column edge affordance (signals more content to
  // the right). Left empty (rather than deleting it from every clsx(...) call site
  // below) so the horizontal scrollbar/column-nav chips are the only "more content"
  // signal now, per that instruction.
  const bgGradient = '';
  // Sticky-column edge shadow — see the matching const in ComparativeFactorTable.tsx
  // for the full explanation; only the last frozen cell in the row carries it.
  const stickyEdgeShadow =
    'shadow-[1px_0_0_#e3e9e8] transition-shadow duration-150 group-data-[scrolled=true]:shadow-[1px_0_0_#e3e9e8,6px_0_8px_-4px_rgba(16,24,32,0.22)]';
  // Soft divider between every column (mock lines 132-136) — directional so it never
  // fights the `border-b-gray-300` color also on these cells.
  const colDivider = 'border-r border-r-[#eef2f2]';
  // Merged Weight/Intensity/Score/Collateral band — mock:1415-1430's `priceRows()` and
  // mock:1450's add-row both render this whole span as one blank cell, not four. Width
  // is the sum of the four columns it replaces: 56+60+60+122 = 298px, offset at
  // `stickyLeft.weight` where the first of them (Weight) starts. Combine with
  // `stickyEdgeShadow` at each call site (not baked in here) since it's always the
  // rightmost sticky cell. Its own width stays fixed — it spans columns 2-6 only, none of
  // which is content-sized.
  const priceBandMergedCell =
    'bg-white border-b border-b-gray-300 sticky z-20 w-[298px] min-w-[298px] max-w-[298px] py-0 h-[26px]';
  // No w-/min-w-/max-w- at all — this column sizes to its own content. `whitespace-nowrap`
  // is what makes that mean "one line, as wide as the longest label" rather than "wrap at
  // some arbitrary width". Same shape as SaleAdjustmentGridScoringSection.tsx's own
  // leftColumnBody.
  const leftColumnBody = clsx(
    'border-b border-b-gray-300 text-left font-medium text-gray-600 px-[8px] py-0 sticky left-0 z-20 h-[26px] whitespace-nowrap',
    colDivider,
  );
  const weightColumnBody = clsx(
    'border-b border-b-gray-300 px-[8px] py-0 sticky z-20 w-[56px] max-w-[56px] min-w-[56px]',
    colDivider,
  );
  const intensityColumnBody = clsx(
    'border-b border-b-gray-300 px-[8px] py-0 sticky z-20 w-[60px] max-w-[60px] min-w-[60px]',
    colDivider,
  );
  // Weighted intensity is a computed value, not an input — right-aligned like every
  // other computed cell in this table (the mock reads left-aligned inputs vs
  // right-aligned totals as a deliberate visual cue; ours had this one flipped).
  const scoreColumnBody = clsx(
    'border-b border-b-gray-300 px-[8px] py-0 sticky z-20 w-[60px] max-w-[60px] min-w-[60px] text-right',
    colDivider,
  );
  const collateralScoreColumnBody = clsx(
    'border-b border-b-gray-300 text-gray-700 px-[8px] py-0 sticky z-20 w-[56px] min-w-[56px] max-w-[56px] h-[26px]',
    colDivider,
  );
  // Last column of the frozen block — keeps the edge-shadow gradient that used to sit
  // on the single merged Collateral column; the shadow's job (signal there is more,
  // unfrozen content to the right) is the same regardless of which sub-column it's on.
  const collateralWeightedColumnBody = clsx(
    'border-b border-b-gray-300 text-gray-700 px-[8px] py-0 sticky z-20 w-[66px] min-w-[66px] max-w-[66px] h-[26px] text-right',
    stickyEdgeShadow,
  );
  // Filler for rows (Initial Price, Scoring Criteria, Final Value, …) that show a
  // single value or nothing across the whole Collateral group rather than a
  // Score/Weighted pair — spans both sub-columns via colSpan={2}. 56+66=122.
  const collateralMergedColumnBody = clsx(
    'border-b border-b-gray-300 text-gray-700 px-[8px] py-0 sticky z-20 w-[122px] min-w-[122px] max-w-[122px] h-[26px]',
    stickyEdgeShadow,
  );
  // `overflow-hidden` alongside the max-w-* ceiling, on every market cell. Under
  // table-layout: auto a max-width on a <td> is only a hint — SAG measured a long value
  // growing its column to 383px in spite of one, which broke market-to-market alignment
  // and, through the shared <colgroup>, squeezed the neighbouring cells. The pairing is
  // what actually holds the column: the ceiling states the intent, overflow-hidden stops
  // the content from voting on the width.
  // The market pair totals 192px (88+104), the same total SaleAdjustmentGridScoringSection
  // and DirectComparisonScoringSection give theirs. At the old 150 this column was simply
  // narrower than its siblings' for identical content: the row-1 header's kind-date-unit
  // sub-line runs to 142px worst case (`ซื้อขายจริง · 15 ก.ย. 2569 · /ตร.ว.`) but only had
  // 134px of content box after the 8px side padding, so `truncate` cut it to
  // `ประกาศขาย · 15 ก.ย. 59 · /ตร…`. 192 leaves 176 content, 34px of slack.
  // The SPLIT is deliberately not the siblings' 110/82. Their wide column is the FIRST one
  // (ค่าปัจจัย, a long value) and their narrow one is ระดับ; WQS's longer content is the
  // SECOND — header ถ่วงน้ำหนัก against คะแนน, and value `120.00` against a two-digit input.
  // Copying 110/82 would have spent the extra width on the shorter header, so the
  // asymmetry is mirrored instead. Only the total has to match for the three tabs to line
  // up; how it is divided is this table's own business.
  const surveyScoreStyle = clsx(
    'px-[8px] py-0 h-[26px] border-b border-b-gray-300 w-[88px] min-w-[88px] max-w-[88px] overflow-hidden',
    colDivider,
  );
  const surveyWeightedStyle = clsx(
    'px-[8px] py-0 h-[26px] border-b border-b-gray-300 w-[104px] min-w-[104px] max-w-[104px] text-right overflow-hidden',
    colDivider,
  );
  // Filler for rows that show one value (or nothing) across a whole market group. 192 =
  // 88+104, the pair it spans — this is the cell that renders `12,345,678.00 บาท/ตร.วา`,
  // the exact shape that stretched SAG's column, so it needs the ceiling most. Raised in
  // step with the pair: left at 150 it would have been a ceiling BELOW the columns it
  // spans, which is the shape that silently undoes a widening.
  const surveyStyle = clsx(
    'px-[8px] py-0 h-[26px] border-b border-b-gray-300 max-w-[192px] overflow-hidden',
    colDivider,
  );
  const totalCols = 6 + 2 * comparativeSurveys.length; // Factor, Weight, Intensity, Score, Collateral(x2) + markets(x2 each)

  // Kind/date/unit sub-line — shared with ComparativeFactorTable.tsx (the data tab) via
  // marketSubLabel.ts. A first local copy here silently dropped the `infoDateTime`
  // fallback and always rendered an empty date; sharing the one implementation instead
  // of writing a second (now third) copy is the actual fix.
  // mock:340/1417 — the header's unit token goes red when it's the minority unit among
  // the markets shown (user: "เรา highlight หน่วยที่เป็นส่วนน้อย"). Text colour only,
  // confirmed with the user — no background/border/chip.
  const marketMajorityUnit = useMemo(
    () => detectMarketMajorityUnit(comparativeSurveys),
    [comparativeSurveys],
  );

  const [isScoringBandOpen, setIsScoringBandOpen] = useState(true);
  const [isPriceBandOpen, setIsPriceBandOpen] = useState(true);

  // Full-width button — the whole row is the click/keyboard target (user:
  // "ที่กดหุบแถวทำให้มันกดได้ทั้งแถว ตอนนี้มันกดได้แค่คอลัมแรก"). The earlier sticky-left
  // fix (label scrolling out as "จจัยให้คะแนน") moves to an inner span instead of living
  // on the button itself, so both requirements hold at once: the button covers the full
  // row (real <button>, not a <tr onClick> — keeps focus/Enter/Space/aria-expanded), and
  // the visible icon+label still pins to the left edge on horizontal scroll.
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

  // Collateral cells for the per-factor scoring rows — two real <td>s (Score input,
  // Weighted display) matching the mock's own two sub-columns. (The total row has its
  // own >100 red-highlight accessor and is written out by hand instead of reusing this.)
  const collateralCells = (scoreFieldName: string, weightedFieldName: string) => (
    <>
      <td className={clsx(collateralScoreColumnBody, 'bg-white')} style={stickyLeft.collateralScore}>
        <RHFInputCell
          fieldName={scoreFieldName}
          inputType="number"
          number={{ decimalPlaces: 0, maxIntegerDigits: 2, maxValue: 10, allowNegative: false }}
        />
      </td>
      <td
        className={clsx(collateralWeightedColumnBody, bgGradient, 'bg-white')}
        style={stickyLeft.collateralWeighted}
      >
        <RHFInputCell
          fieldName={weightedFieldName}
          inputType="display"
          accessor={({ value }) => fmt(toNum(value))}
        />
      </td>
    </>
  );

  return (
    <DenseProvider value={true}>
    {/* No rounded corners anywhere in this table — user's explicit call ("ตารางไม่เอาแบบมน"). */}
    <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-300">
      <ScrollableTableContainer
        className="flex-1 min-h-0"
        stickyWidth={stickyWidth}
        columnNavSelector="thead th[data-nav-col]"
        scrollHeaderWithWheel
        edgeShadow
      >
        {/* table-layout: auto (the default — `table-fixed` removed), same as
            SaleAdjustmentGridScoringSection.tsx. Fixed layout never consults content: it
            takes each column's width from the <colgroup>, else the first row, else splits
            leftover space between the columns that declared none. That made a
            content-sized ปัจจัย column impossible while it was on — measuring the header
            cell just returned the width the colgroup had pinned it to.
            The overflow risk the previous comment here described is real and has not gone
            away; it is now closed the way SAG closed it, per column rather than per table:
            every market cell carries an explicit max-w-* ceiling plus overflow-hidden (see
            surveyScoreStyle/surveyWeightedStyle/surveyStyle above), so no cell's content
            can vote on its column's width. Columns 2-6 keep their exact declared widths
            through the <colgroup>; only column 1 is free to grow. */}
        {/* rounded-none — DaisyUI's own `.table` component class carries
            border-radius: var(--radius-box) (measured 6.5px = rounded-lg at the 13px
            root); the wrapping <div>'s rounded-xl removal didn't touch this because the
            radius is on the table itself, one level lower. */}
        <table className="table min-w-max w-full border-separate border-spacing-0 text-[12px] leading-[25px] tabular-nums rounded-none">
          {/* Explicit <colgroup> — under auto layout these are floors the browser honours
              and only grows past if a cell's content demands more, which the market cells'
              max-width and overflow-hidden pairing now prevents. Still needed for the same reason
              as before: row1's Collateral and per-market headers are colSpan={2} cells with
              no per-column width of their own, and row2's individual w-[Npx] on the real
              Score/Weighted sub-headers can be ignored (measured on SAG/DC: 112/112 instead
              of 72/82). A <colgroup> states each column's width directly.
              The first <col> deliberately has NO width — that is what lets auto layout size
              the ปัจจัย column to its content. Everything after it keeps its exact value. */}
          <colgroup>
            <col />
            <col className="w-[56px]" />
            <col className="w-[60px]" />
            <col className="w-[60px]" />
            <col className="w-[56px]" />
            <col className="w-[66px]" />
            {comparativeSurveys.map((survey: MarketComparableDetailType) => (
              <Fragment key={survey.id}>
                <col className="w-[88px]" />
                <col className="w-[104px]" />
              </Fragment>
            ))}
          </colgroup>
          <thead className="bg-neutral-50">
            <tr className="border-b border-gray-300">
              <th
                rowSpan={2}
                // This cell is what `factorWidth` measures — it spans both header rows, so
                // its rendered width is the whole ปัจจัย column's width. No w-/min-w-/max-w-
                // here, matching the empty first <col>: both have to stay width-less for
                // auto layout to size this column from its content.
                ref={factorHeaderRef}
                className={clsx(
                  'bg-gray-50 border-b border-b-gray-300 text-left text-[12px] font-medium sticky top-0 left-0 z-30 px-[8px] py-0 h-[36px] whitespace-nowrap',
                  colDivider,
                )}
              >
                {t('wqs.scoringTable.factorsHeader')}
              </th>
              <th
                colSpan={3}
                className="bg-gray-50 border-b border-b-gray-300 border-r border-r-[#eef2f2] text-center text-[12px] font-medium sticky top-0 z-30 py-0 h-[36px] whitespace-nowrap"
                style={stickyLeft.weight}
              >
                {t('wqs.scoringTable.calculationHeader')}
              </th>
              <th
                colSpan={2}
                className={clsx(
                  'bg-gray-50 border-b border-gray-300 text-center text-[12px] font-medium sticky top-0 z-30 w-[122px] min-w-[122px] max-w-[122px] px-[8px] py-0 h-[36px] whitespace-nowrap',
                  stickyEdgeShadow,
                  bgGradient,
                )}
                style={stickyLeft.collateralScore}
              >
                {t('wqs.scoringTable.collateralHeader')}
              </th>
              {comparativeSurveys.map((survey: MarketComparableDetailType, marketIndex: number) => (
                <th
                  key={survey.id}
                  colSpan={2}
                  data-nav-col
                  // w-[192px] (88+104) — defense in depth alongside the <colgroup>. Still
                  // wanted under auto layout, for a different reason than when this table
                  // was table-fixed: a colSpan cell with no width of its own contributes
                  // its content's demand to both columns it spans, and auto layout may
                  // grow them past the <colgroup> floors to satisfy it. Stating the pair's
                  // total here keeps the two sub-columns at 88/104 (same failure SAG/DC hit
                  // from the other direction — measured 91/104 instead of 72/82).
                  // This is the cell whose content was being cut off: the sub-line below
                  // is `truncate`, so its box is what decides where the text ends.
                  // text-left, not text-center — the mock's own `.mhead` (mock:186) sets
                  // `display:flex; align-items:center` with no text-align at all, so the
                  // header content flows from the left edge. The centring was ours.
                  className="bg-gray-50 text-[12px] font-medium text-left px-[8px] py-0 border-b border-b-gray-300 border-r border-r-[#eef2f2] sticky top-0 h-[36px] min-h-[36px] max-h-[36px] w-[192px] min-w-[192px] max-w-[192px] z-23 whitespace-nowrap"
                >
                  {/* Header row is 36-37px on top, 26-27px on the bottom row, matching
                      ComparativeFactorTable.tsx (the reference) — user ruling
                      ("ลบความสูงของ column บนไม่เกิน 36-37 ล่าง 26-27 ตาม mock"). */}
                  {/* Both inner lines need their own explicit leading — the <table>
                      carries leading-[25px] for the 26px body rows, and two lines at
                      that would total 50px, blowing the 36px row open (measured: 51px)
                      and overlapping the row-2 headers pinned at top-[36px]. Set here,
                      not on the <th>, so it doesn't fight the table's own leading. */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 leading-[20px]">
                      {/* Ordinal position, not `survey.surveyName` — the stored name
                          isn't unique (confirmed: real data has 3 surveys all literally
                          named "ตลาด 1"), and the mock numbers columns by position for
                          exactly that reason. The kind/date/unit sub-line below is what
                          still tells them apart underneath the ordinal. */}
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
              <th
                className={clsx(
                  'bg-gray-50 border-b border-b-gray-300 text-left text-[12px] font-medium px-[8px] py-0 h-[26px] w-[56px] min-w-[56px] max-w-[56px] whitespace-nowrap sticky top-[36px] z-30',
                  colDivider,
                )}
                style={stickyLeft.weight}
              >
                {t('comparativeAnalysis.weight')}
              </th>
              <th
                className={clsx(
                  'bg-gray-50 border-b border-b-gray-300 text-left text-[12px] font-medium px-[8px] py-0 h-[26px] w-[60px] min-w-[60px] max-w-[60px] whitespace-nowrap sticky top-[36px] z-30',
                  colDivider,
                )}
                style={stickyLeft.intensity}
              >
                {t('comparativeAnalysis.intensity')}
              </th>
              <th
                className={clsx(
                  'bg-gray-50 border-b border-b-gray-300 text-right text-[12px] font-medium px-[8px] py-0 h-[26px] w-[60px] min-w-[60px] max-w-[60px] whitespace-nowrap sticky top-[36px] z-30',
                  colDivider,
                )}
                style={stickyLeft.score}
              >
                {t('comparativeAnalysis.score')}
              </th>
              <th
                className={clsx(
                  'bg-gray-50 border-b border-b-gray-300 text-left text-[12px] font-medium px-[8px] py-0 h-[26px] w-[56px] min-w-[56px] max-w-[56px] whitespace-nowrap sticky top-[36px] z-30',
                  colDivider,
                )}
                style={stickyLeft.collateralScore}
              >
                {t('comparativeAnalysis.score')}
              </th>
              <th
                className={clsx(
                  'bg-gray-50 border-b border-b-gray-300 text-right text-[12px] font-medium px-[8px] py-0 h-[26px] w-[66px] min-w-[66px] max-w-[66px] whitespace-nowrap sticky top-[36px] z-30',
                  stickyEdgeShadow,
                  bgGradient,
                )}
                style={stickyLeft.collateralWeighted}
              >
                {t('wqs.scoringTable.weightedHeader')}
              </th>
              {comparativeSurveys.map((survey: MarketComparableDetailType) => (
                <Fragment key={survey.id}>
                  <th
                    className={clsx(
                      'bg-gray-50 border-b border-b-gray-300 text-left text-[12px] font-medium px-[8px] py-0 h-[26px] w-[88px] min-w-[88px] max-w-[88px] whitespace-nowrap sticky top-[36px] z-23',
                      colDivider,
                    )}
                  >
                    {t('comparativeAnalysis.score')}
                  </th>
                  <th
                    className={clsx(
                      'bg-gray-50 border-b border-b-gray-300 text-right text-[12px] font-medium px-[8px] py-0 h-[26px] w-[104px] min-w-[104px] max-w-[104px] whitespace-nowrap sticky top-[36px] z-23',
                      colDivider,
                    )}
                  >
                    {t('wqs.scoringTable.weightedHeader')}
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bandRow(t('wqs.bands.scoringFactors'), isScoringBandOpen, () =>
              setIsScoringBandOpen(o => !o),
            )}
            {isScoringBandOpen && (
              <>
                {
                  /** scoring section */
                  scoringFactorFields.map((factor, rowIndex: number) => {
                const selected =
                  (getValues(scoringFactorCodePath({ row: rowIndex })) as string) ?? '';
                const options = comparativeFactors
                  .filter(
                    cf =>
                      cf.factorCode === selected ||
                      !usedFactorCodes.includes(cf.factorCode ?? ''),
                  )
                  .map(cf => ({
                    label:
                      getFactorDesciption(cf.factorCode ?? '', serverData.allFactors ?? [], language) ??
                      '',
                    value: cf.factorCode,
                  }));
                const isTemplateFactor = (template?.calculationFactors ?? []).some(
                  t => t.factorCode === selected,
                );
                return (
                  <tr key={factor.id} className="group/row">
                    <td className={clsx('bg-white border-r', leftColumnBody)}>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 min-w-0 truncate">
                          {isTemplateFactor ? (
                            <RHFInputCell
                              fieldName={scoringFactorCodePath({ row: rowIndex })}
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
                              fieldName={scoringFactorCodePath({ row: rowIndex })}
                              inputType="select"
                              options={options}
                              onSelectChange={value => {
                                const factor = serverData.allFactors?.find(
                                  (f: FactorDataType) => f.factorCode === value,
                                );
                                setValue(
                                  `WQSScores.${rowIndex}.factorId`,
                                  factor?.factorId ?? factor?.id ?? '',
                                );
                              }}
                            />
                          )}
                        </div>
                        {!isTemplateFactor && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(rowIndex)}
                            className="size-5 flex-shrink-0 flex items-center justify-center cursor-pointer rounded text-gray-300 hover:text-danger-600 hover:bg-danger-50 transition-colors opacity-0 group-hover/row:opacity-100"
                            title={t('wqs.scoringTable.deleteTitle')}
                          >
                            <Icon style="solid" name="trash" className="size-2.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className={clsx('bg-white border-r', weightColumnBody)} style={stickyLeft.weight}>
                      <RHFInputCell
                        fieldName={scoringFactorWeightPath({ row: rowIndex })}
                        inputType="number"
                        number={{ decimalPlaces: 0, maxIntegerDigits: 1, allowNegative: false }}
                      />
                    </td>
                    <td className={clsx('bg-white border-r', intensityColumnBody)} style={stickyLeft.intensity}>
                      <RHFInputCell
                        fieldName={scoringFactorIntensityPath({ row: rowIndex })}
                        inputType="number"
                        number={{ decimalPlaces: 0, maxIntegerDigits: 2, allowNegative: false }}
                      />
                    </td>
                    {/* weight * intensity */}
                    <td className={clsx('bg-white border-r', scoreColumnBody)} style={stickyLeft.score}>
                      <RHFInputCell
                        fieldName={scoringFactorWeightedIntensityPath({ row: rowIndex })}
                        inputType="display"
                        accessor={({ value }) => fmt(toNum(value))}
                      />
                    </td>
                    {collateralCells(
                      scoringFactorCollateralScorePath({ row: rowIndex }),
                      scoringFactorCollateralWeightedScorePath({ row: rowIndex }),
                    )}

                    {comparativeSurveys.map(
                      (survey: MarketComparableDetailType, columnIndex: number) => (
                        <Fragment key={survey.id}>
                          <td className={surveyScoreStyle}>
                            <RHFInputCell
                              fieldName={scoringFactorSurveySurveyScorePath({
                                row: rowIndex,
                                column: columnIndex,
                              })}
                              inputType="number"
                              number={{
                                decimalPlaces: 0,
                                maxIntegerDigits: 2,
                                maxValue: 10,
                                allowNegative: false,
                              }}
                            />
                          </td>
                          <td className={surveyWeightedStyle}>
                            <RHFInputCell
                              fieldName={scoringFactorSurveyWeightedSurveyScorePath({
                                row: rowIndex,
                                column: columnIndex,
                              })}
                              inputType="display"
                              accessor={({ value }) => fmt(toNum(value))}
                            />
                          </td>
                        </Fragment>
                      ),
                    )}
                  </tr>
                );
              })
            }

            {/* add new row */}
            <tr>
              <td className={clsx('bg-white border-r z-19', leftColumnBody)}>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => handleAddRow()}
                    // Sized to match "+ เพิ่มตลาด" on the data tab (WQSForm.tsx:80,
                    // user: "แก้ไขปุ่มเพิ่มปัจจัยให้เล็กลงเหมือนหน้าข้อมูลเปรียบเทียบ") — h-6,
                    // px-2.5, text-[11.5px], rounded-md, the softer border-primary/40.
                    // Kept `w-full`: this cell is its own dedicated 190px column with
                    // nothing else in the row, so a content-width button would just
                    // leave empty space rather than read as "the row is the add
                    // affordance". Kept `border-dashed` over the reference's solid
                    // border too — dashed is the mock's own signal for "add a row"
                    // everywhere else, and the reference button does a different job.
                    className="h-6 w-full px-2.5 text-[11.5px] font-medium border border-dashed border-primary/40 rounded-md cursor-pointer text-primary hover:bg-primary/5 hover:border-primary/60 transition-colors"
                  >
                    {t('wqs.scoringTable.addMoreFactors')}
                  </button>
                )}
              </td>
              {/* One merged blank cell, not four — mock:1450 renders the whole
                  Weight/Intensity/Score/Collateral band as a single
                  `<td class="wL" colspan="5">` on this row (same reasoning as the
                  Final Value (regression) row above), so there are no internal
                  dividers between this add-row button and its own row's edge. */}
              <td
                className={clsx(priceBandMergedCell, stickyEdgeShadow)}
                style={stickyLeft.weight}
                colSpan={5}
              ></td>
              {comparativeSurveys.map(survey => (
                <td key={survey.id} className={clsx(surveyStyle)} colSpan={2}></td>
              ))}
            </tr>

            {/* total score row — every value here is a computed sum (inputType="display"),
                so all of it is right-aligned like the mock's other computed cells, even
                though the same columns hold left-aligned editable inputs on the data rows above. */}
            <tr>
              {/* Every total row across all three methods is font-semibold (600, the
                  mock's own tr.tot rule at mock:171) on BOTH the label and the value
                  cells — user: "พวกแถว total ทั้งหลายให้ใช้ฟ้อนหน้ากว่าตรงอื่น". The earlier
                  font-medium ruling was a no-op here: leftColumnBody already puts
                  font-medium on every label in this column, so the total read at exactly
                  the same weight as an ordinary row, which is what the user is reporting. */}
              <td className={clsx('bg-[#f8fafa] border-r font-semibold', leftColumnBody)}>
                {t('wqs.scoringTable.total')}
              </td>
              <td
                className={clsx('bg-[#f8fafa] border-r text-right font-semibold', weightColumnBody)}
                style={stickyLeft.weight}
              >
                <RHFInputCell fieldName={totalWeightPath()} inputType="display" />
              </td>
              <td
                className={clsx(
                  'bg-[#f8fafa] border-r text-right font-semibold',
                  intensityColumnBody,
                )}
                style={stickyLeft.intensity}
              >
                <RHFInputCell fieldName={totalIntensityPath()} inputType="display" />
              </td>
              <td
                className={clsx('bg-[#f8fafa] border-r font-semibold', scoreColumnBody)}
                style={stickyLeft.score}
              >
                <RHFInputCell
                  fieldName={totalWeightedIntensityPath()}
                  inputType="display"
                  accessor={({ value }) => {
                    const weightedIntensity = value ? Number(value) : 0;
                    return weightedIntensity > 100 ? (
                      <span className="text-danger">{weightedIntensity}</span>
                    ) : (
                      <span>{weightedIntensity}</span>
                    );
                  }}
                />
              </td>
              <td
                className={clsx(collateralScoreColumnBody, 'bg-[#f8fafa] text-right font-semibold')}
                style={stickyLeft.collateralScore}
              >
                <RHFInputCell fieldName={totalCollateralScorePath()} inputType="display" />
              </td>
              <td
                className={clsx(
                  collateralWeightedColumnBody,
                  bgGradient,
                  'bg-[#f8fafa] font-semibold',
                )}
                style={stickyLeft.collateralWeighted}
              >
                <RHFInputCell
                  fieldName={totalWeightedCollateralScorePath()}
                  inputType="display"
                  accessor={({ value }) => {
                    const weightedScore = value ? Number(value) : 0;
                    return weightedScore > 100 ? (
                      <span className="text-danger">{weightedScore}</span>
                    ) : (
                      <span>{weightedScore}</span>
                    );
                  }}
                />
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => (
                <Fragment key={survey.id}>
                  <td className={clsx(surveyScoreStyle, 'bg-[#f8fafa] text-right font-semibold')}>
                    <RHFInputCell
                      fieldName={totalSurveyScorePath({ column: columnIndex })}
                      inputType="display"
                    />
                  </td>
                  <td className={clsx(surveyWeightedStyle, 'bg-[#f8fafa] font-semibold')}>
                    <RHFInputCell
                      fieldName={totalWeightedSurveyScorePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        const weightedScore = value ? Number(value) : 0;
                        return weightedScore > 100 ? (
                          <span className="text-danger">{weightedScore}</span>
                        ) : (
                          <span>{weightedScore}</span>
                        );
                      }}
                    />
                  </td>
                </Fragment>
              ))}
            </tr>

            {/* scoring criteria */}
            <tr>
              <td colSpan={6} className={clsx('bg-white', leftColumnBody)}>
                {/* One key for the whole sentence, not a stem plus five band names: it is a
                    static legend that is never composed, the five bands aren't reused
                    anywhere else in this table, and splitting it would bake in an
                    English clause order that Thai doesn't have to follow. */}
                <div className="flex flex-row justify-start items-center">
                  {t('wqs.scoringTable.scoringCriteria')}
                </div>
              </td>
              {comparativeSurveys.length > 0 && (
                <td
                  colSpan={comparativeSurveys.length * 2}
                  className={clsx('bg-white border-b border-gray-300')}
                ></td>
              )}
            </tr>
              </>
            )}

            {bandRow(t('wqs.bands.priceAdjustment'), isPriceBandOpen, () =>
              setIsPriceBandOpen(o => !o),
            )}
            {isPriceBandOpen && (
              <>
                {/* calculation section */}
                <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>{t('wqs.scoringTable.offeringPrice')}</span>
              </td>
              {/* One merged blank cell, not four — mock:1415-1430 `priceRows()` renders
                  the whole Weight/Intensity/Score/Collateral band as a single
                  `<td class="na wL edge" colspan="5">` on every row in this band, same
                  reasoning as the add-factor and regression rows above. */}
              <td
                className={clsx(priceBandMergedCell, stickyEdgeShadow)}
                style={stickyLeft.weight}
                colSpan={5}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                return (
                  <td key={survey.id} className={clsx(surveyStyle, 'text-right')} colSpan={2}>
                    <RHFInputCell
                      fieldName={calculationOfferingPricePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        if (!value) return '';
                        // Unit deliberately not repeated on the value — the market column
                        // header's sub-line already carries it (user: "ลบหน่วยออกจากช่อง row
                        // เพราะเราแสดงบนหัวตารางอยู่แล้ว").
                        return fmt(toNum(value));
                      }}
                    />
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className={'flex flex-rows justify-left gap-2 items-center'}>
                  <span>{t('wqs.scoringTable.adjustedOfferingPriceLabel')}</span>
                  <span>{t('wqs.scoringTable.percentUnit')}</span>
                </div>
              </td>
              <td
                className={clsx(priceBandMergedCell, stickyEdgeShadow)}
                style={stickyLeft.weight}
                colSpan={5}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                const hasOfferPrice = !!survey.offerPrice;
                const hasAdjustAmt = !!(
                  getValues(calculationOfferingPriceAdjustmentAmtPath({ column: columnIndex })) > 0
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
                {/* The widest cell in this column once Thai — two spans plus the gap-2
                    between them, which is what sets the content-sized ปัจจัย column's
                    width. Flagged to team-lead for measurement rather than assumed. */}
                <div className={'flex flex-rows justify-left gap-2 items-center'}>
                  <span>{t('wqs.scoringTable.adjustedOfferingPriceLabel')}</span>
                  <span>{t('wqs.scoringTable.amountUnit')}</span>
                </div>
              </td>
              <td
                className={clsx(priceBandMergedCell, stickyEdgeShadow)}
                style={stickyLeft.weight}
                colSpan={5}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                const hasOfferPrice = !!survey.offerPrice;
                const hasAdjustPct = !!(
                  getValues(calculationOfferingPriceAdjustmentPctPath({ column: columnIndex })) > 0
                );
                return (
                  <td key={survey.id} className={clsx(surveyStyle)} colSpan={2}>
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
                <span>{t('wqs.scoringTable.sellingPrice')}</span>
              </td>
              <td
                className={clsx(priceBandMergedCell, stickyEdgeShadow)}
                style={stickyLeft.weight}
                colSpan={5}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                const hasSalePrice = !!survey.salePrice;
                const hasOfferPrice = !!survey.offerPrice;
                if (!hasSalePrice)
                  return <td key={survey.id} className={clsx(surveyStyle)} colSpan={2}></td>;
                return (
                  <td
                    key={survey.id}
                    className={clsx(surveyStyle, 'text-right', hasOfferPrice && 'opacity-50')}
                    colSpan={2}
                  >
                    <RHFInputCell
                      fieldName={calculationSellingPricePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        if (!value) return '';
                        // Unit deliberately not repeated on the value — see the offering
                        // price row above.
                        return fmt(toNum(value));
                      }}
                    />
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                {t('wqs.scoringTable.numberOfYears')}
              </td>
              <td
                className={clsx(priceBandMergedCell, stickyEdgeShadow)}
                style={stickyLeft.weight}
                colSpan={5}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                const hasSalePrice = !!survey.salePrice;
                const hasOfferPrice = !!survey.offerPrice;
                return (
                  <td
                    key={survey.id}
                    className={clsx(
                      'text-right',
                      surveyStyle,
                      (hasOfferPrice || !hasSalePrice) && 'opacity-50',
                    )}
                    colSpan={2}
                  >
                    {/* Jan 2534 badge deleted — user's second ask, mock:1422 is a
                        single-value row ('Number of Years', 'yrs'), no date badge. The
                        stacked <div> it lived in was also why this row alone ran taller
                        than its neighbours (content height beats a declared h-[26px]). */}
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
                <span>{t('wqs.scoringTable.adjustedPeriod')}</span>
                <span>{t('wqs.scoringTable.percentUnit')}</span>
              </td>
              <td
                className={clsx(priceBandMergedCell, stickyEdgeShadow)}
                style={stickyLeft.weight}
                colSpan={5}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                const hasSalePrice = !!survey.salePrice;
                const hasOfferPrice = !!survey.offerPrice;
                return (
                  <td key={survey.id} className={clsx(surveyStyle)} colSpan={2}>
                    {hasSalePrice && (
                      <RHFInputCell
                        fieldName={calculationAdjustmentYearPath({ column: columnIndex })}
                        inputType="number"
                        disabled={hasOfferPrice}
                        number={{
                          decimalPlaces: 2,
                          maxIntegerDigits: 3,
                          maxValue: 100,
                          allowNegative: false,
                        }}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className={'flex flex-rows justify-left items-center'}>
                  {/* Two keys, not one — both siblings keep the unit as its own
                      `percentUnit` entry, and this row was the only place that baked it
                      into the label. The space between the two expressions is preserved
                      by JSX, so it still reads "… (%)". */}
                  <span>
                    {t('wqs.scoringTable.cumulativeAdjustedPeriod')}{' '}
                    {t('wqs.scoringTable.percentUnit')}
                  </span>
                </div>
              </td>
              <td
                className={clsx(priceBandMergedCell, stickyEdgeShadow)}
                style={stickyLeft.weight}
                colSpan={5}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                const hasSalePrice = !!survey.salePrice;
                const hasOfferPrice = !!survey.offerPrice;
                if (!hasSalePrice)
                  return <td key={survey.id} className={clsx(surveyStyle)} colSpan={2}></td>;
                return (
                  <td
                    key={survey.id}
                    className={clsx('text-right', surveyStyle, hasOfferPrice && 'opacity-50')}
                    colSpan={2}
                  >
                    <RHFInputCell
                      fieldName={calculationTotalAdjustedSellingPricePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => fmt(toNum(value))}
                    />
                  </td>
                );
              })}
            </tr>
            {/* mock:1432-1434 — inside priceRows() itself, appended after the seven
                loop rows: same merged-band shape as the rest of this section, but a
                `tr.tot` (mock:171: font-weight 600, background var(--surface-2)). Now
                font-semibold on the whole row like every other total — see the note on
                the Total row above for why the previous font-medium was invisible. */}
            <tr>
              <td className={clsx('bg-[#f8fafa] border-r font-semibold', leftColumnBody)}>
                <span>{t('wqs.scoringTable.adjustedValueLabel')}</span>
              </td>
              {/* Not `priceBandMergedCell` here — that constant bakes in `bg-white`,
                  which would collide with this row's own tint (two bg-* utilities for
                  the same property resolve by compiled stylesheet order, not array
                  order, so the two can't just be listed together and trusted to pick
                  the later one). Written out with `bg-[#f8fafa]` instead of `bg-white`
                  directly rather than fighting the shared constant. */}
              <td
                className={clsx(
                  'bg-[#f8fafa] border-b border-b-gray-300 sticky z-20 w-[298px] min-w-[298px] max-w-[298px] py-0 h-[26px]',
                  stickyEdgeShadow,
                )}
                style={stickyLeft.weight}
                colSpan={5}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                return (
                  <td
                    key={survey.id}
                    className="bg-[#f8fafa] px-[8px] py-0 h-[26px] border-b border-b-gray-300 border-r border-r-[#eef2f2] text-right font-semibold"
                    colSpan={2}
                  >
                    <RHFInputCell
                      fieldName={calculationAdjustedValuePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value, getValues }) => {
                        const currentSurvey = {
                          score: getValues(totalWeightedSurveyScorePath({ column: columnIndex })),
                          price: getValues(calculationAdjustedValuePath({ column: columnIndex })),
                        };

                        const otherSurveys = (comparativeSurveys ?? [])
                          .filter((_, compIndex) => compIndex !== columnIndex)
                          .map((_, compIndex) => ({
                            score: getValues(totalWeightedSurveyScorePath({ column: compIndex })),
                            price: getValues(calculationAdjustedValuePath({ column: compIndex })),
                          }));

                        return (
                          <span
                            className={
                              isScoreReasonable(currentSurvey, otherSurveys) ? '' : 'text-danger'
                            }
                          >
                            {value ? fmt(toNum(value)) : ''}
                          </span>
                        );
                      }}
                    />
                  </td>
                );
              })}
            </tr>
              </>
            )}

            {/* Final Value row — always visible, outside both collapsible bands. The
                table used to end with a second "Final Value (Rounded)" row below this
                one; removed per mock:1456 (the table ends at this row) — the user's
                stated reason for asking was inverted (they thought this row was the
                unrounded one and the removed row was rounded; it's the other way
                round, see buildWQSDerivedRules.ts:349-356), but the removal itself was
                still correct. The rounded field (`finalValueFinalValueRoundedPath`)
                stays populated — four other derived rules still read it to build the
                value range — this only stops rendering it as its own row. The label
                names how the value was derived (mock:1645 appends the derivation in
                parentheses for all three methods: regression / weighted / lowest), and
                it is the same key the summary tab uses for this same number, so the two
                can't drift apart. `(regression)` stays untranslated in every locale,
                per the mock. The rest of this table's row labels are no longer hardcoded
                English — the price band now reads from `wqs.scoringTable.*`, whose values
                were copied from the identical entries the two sibling methods already
                carry (`directComparison.rows` / `saleAdjustmentGrid.rows`) rather than
                translated afresh, so the three methods can't drift apart. */}
            <tr>
              <td className={clsx('bg-gray-100 border-r font-semibold', leftColumnBody)}>
                {t('wqs.summary.finalValueLabel')}
              </td>
              {/* One merged blank cell, not three — mock:1456 renders the whole
                  Weight/Intensity/Score band as a single `<td class="na w1" colspan="3">`
                  for this row specifically (every other band row either has real
                  per-column values here or uses its own different colspan), so there
                  are no internal dividers to the left of the regression value. */}
              <td
                className="bg-gray-100 border-b border-b-gray-300 border-r border-r-[#eef2f2] sticky z-20 w-[176px] min-w-[176px] max-w-[176px] py-0 h-[26px]"
                style={stickyLeft.weight}
                colSpan={3}
              ></td>
              <td
                className={clsx(
                  collateralMergedColumnBody,
                  bgGradient,
                  'bg-gray-100 text-right font-semibold',
                )}
                style={stickyLeft.collateralScore}
                colSpan={2}
              >
                <RHFInputCell
                  fieldName={finalValueFinalValuePath()}
                  inputType="display"
                  accessor={({ value }) => fmt(toNum(value))}
                />
              </td>
              {comparativeSurveys.map(survey => (
                <td key={survey.id} className={clsx('bg-gray-100', surveyStyle)} colSpan={2}></td>
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
}
