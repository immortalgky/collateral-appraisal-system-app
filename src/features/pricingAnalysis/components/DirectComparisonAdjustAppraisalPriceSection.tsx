import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import {
  useDerivedFields,
  type DerivedFieldRule,
} from '@features/pricingAnalysis/adapters/useDerivedFieldArray.tsx';
import { directComparisonPath } from '@features/pricingAnalysis/adapters/directComparisonFieldPath.ts';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/shared/components';
import { roundToThousand } from '../domain/calculateDirectComparison';
import { detectPriceUnitMixed } from '../domain/detectPriceUnitMixed';
import { fmt } from '../domain/formatters';
import { sumBuildingFinalCostValue } from '../domain/calculation';
import { KvRow, KvWarningRow } from './KvRow';
import { BuildingCostLink, useGroupBuildingCostMethod } from './BuildingCostLink';

interface DirectComparisonAdjustAppraisalPriceSectionProps {
  property: Record<string, unknown>;
  buildingCost?: Record<string, unknown>[];
  isCostApproach: boolean;
}
export function DirectComparisonAdjustAppraisalPriceSection({
  buildingCost,
  isCostApproach,
}: DirectComparisonAdjustAppraisalPriceSectionProps) {
  const {
    finalValueRounded: finalValueRoundedPath,
    finalValueAdjusted: finalValueAdjustedPath,
    includeLandArea: includeLandAreaPath,
    landArea: landAreaPath,
    usableArea: usableAreaPath,
    appraisalPrice: appraisalPricePath,
    appraisalPriceRounded: appraisalPriceRoundedPath,
    priceDifferentiate: priceDifferentiatePath,
    finalValueHasBuildingCost: hasBuildingCostPath,
    finalValueTotalBuildingCost: totalBuildingCostPath,
    finalValueAppraisalPriceIncludeBuildingCost: appraisalPriceIncludeBuildingCostPath,
    finalValueAppraisalPriceIncludeBuildingCostRounded:
      appraisalPriceIncludeBuildingCostRoundedPath,
    finalValuePriceIncludeBuildingCostDifferentiate: priceIncludeBuildingCostDifferentiatePath,
  } = directComparisonPath;

  const prevAppraisalPriceRef = useRef<number | null>(null);
  const prevValueIncludeCostRef = useRef<number | null>(null);
  const prevFinalValueRoundedRef = useRef<number | null>(null);

  const { t } = useTranslation('pricingAnalysis');
  const { control, setValue } = useFormContext();
  const { methodValue: buildingCostMethodValue } = useGroupBuildingCostMethod();

  const calculations = useWatch({ control, name: 'directComparisonCalculations' });

  const detectedUnit = useMemo(() => {
    if (!(calculations as any[])?.length) return null;
    const units: string[] = (calculations as any[])
      .map((c: any) =>
        c.offeringPrice && Number(c.offeringPrice) !== 0
          ? c.offeringPriceMeasurementUnit
          : c.sellingPriceMeasurementUnit,
      )
      .filter(Boolean);
    if (!units.length) return null;
    const freq = new Map<string, number>();
    for (const u of units) freq.set(u, (freq.get(u) ?? 0) + 1);
    return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }, [calculations]);

  const isUnitPrice = detectedUnit === 'PerSqWa' || detectedUnit === 'PerSqm';
  const unitAreaPath = detectedUnit === 'PerSqm' ? usableAreaPath() : landAreaPath();
  const areaRowLabel =
    detectedUnit === 'PerSqm' ? t('finalValue.usableArea') : t('finalValue.landArea');
  // This row carries the method's own final value, so its label has to name HOW that value
  // was reached — not what unit it is in. It used to read the shared
  // `finalValue.finalValueAdjusted` ("มูลค่าสุทธิ (บาท/พื้นที่)"), a unit that is
  // byte-identical across all three methods and so told an appraiser nothing about which
  // statistic produced the number in front of them. This is the same key the scoring
  // table's own Final Value row already renders (DirectComparisonScoringSection.tsx),
  // which is what mock:1648 asks for: one label per method, shared between that method's
  // table and its summary card, with the source in brackets — ต่ำสุด here, ถ่วงน้ำหนัก for
  // Sale Adjustment Grid, การถดถอย for WQS. Hoisted to a const because three branches below
  // render it and one of them concatenates a unit onto it.
  const finalValueLabel = t('directComparison.rows.finalValueLabel');
  // Area units live under `finalValue.*` with this card's other row labels. They used to
  // borrow `wqs.summary.*`, which meant rewording a word on the WQS screen silently
  // reworded this one, and no WQS test would ever show it.
  const unitAreaLabel =
    detectedUnit === 'PerSqm' ? t('finalValue.unitAreaSqm') : t('finalValue.unitAreaWa');
  // Display label only — reads the same `detectedUnit` computed above, doesn't re-derive
  // it. mock:1582's pill; falls back to "lump sum" for unit 03 and the no-comparables
  // case. Also what the mixed-unit warning names, since that sentence is about which
  // PRICE unit won the majority vote, not about an area unit.
  const unitChipLabel =
    detectedUnit === 'PerSqWa'
      ? t('finalValue.unitPerSqWa')
      : detectedUnit === 'PerSqm'
        ? t('finalValue.unitPerSqm')
        : t('finalValue.unitLumpSum');
  // mock:1290/1526 — surfaces detectPriceUnit's own majority pick rather than
  // re-deciding anything; display-only, see calculateDirectComparison.ts.
  const { mixed: mixedUnit, odd: oddUnitCount } = useMemo(
    () => detectPriceUnitMixed(calculations),
    [calculations],
  );

  // Auto-derive includeLandArea from the comparables' measure unit.
  useEffect(() => {
    setValue(includeLandAreaPath(), isUnitPrice, { shouldDirty: false });
  }, [isUnitPrice, setValue, includeLandAreaPath]);

  // Sync totalBuildingCost BEFORE useDerivedFields so the rule cascade sees the final
  // upstream on its first pass (matching WQSAdjustFinalValueSection). Otherwise the
  // buildingCost-driven upstream changes after `prevRef` was primed, causing the
  // appraisalPriceIncludeBuildingCostRounded rule to re-seed and clobber the
  // user-restored override.
  //
  // The figure of record is the Building Cost method's SAVED value — what the appraiser keyed
  // into "มูลค่าตามวิธี" on that screen. The per-building roll-up
  // (sumBuildingFinalCostValue, which mirrors PricingPropertyDataService.BuildingCostSql) is
  // only its fallback, for a group whose BC method has never been saved.
  //
  // Two earlier rounds of this row each fixed a different half. First it summed every
  // schedule row's after-depreciation figure raw, so the appraiser's keyed per-building Final
  // Cost Value never applied and the rounding to the nearest 1,000 never happened. That was
  // corrected to the roll-up above — but the roll-up is only the BC screen's opening
  // suggestion, so an appraiser who then adjusted the method's own value watched this row go
  // on ignoring it. See BuildingCostLink for the full two-totals explanation.
  useEffect(() => {
    setValue(
      totalBuildingCostPath(),
      buildingCostMethodValue ?? sumBuildingFinalCostValue(buildingCost),
      {
        shouldDirty: false,
      },
    );
  }, [buildingCost, buildingCostMethodValue, totalBuildingCostPath, setValue]);

  const rules: DerivedFieldRule[] = [
    {
      // Seed rule: re-seed finalValueAdjusted from finalValueRounded when upstream changes,
      // or on first run when downstream is still empty (fresh Generate, no saved value).
      targetPath: finalValueAdjustedPath(),
      deps: [finalValueRoundedPath()],
      when: ({ getValues: gv, getFieldState, formState }) => {
        const rounded = Number(gv(finalValueRoundedPath())) || 0;
        const adjusted = Number(gv(finalValueAdjustedPath())) || 0;
        const { isDirty } = getFieldState(finalValueAdjustedPath(), formState);
        if (prevFinalValueRoundedRef.current === null) {
          prevFinalValueRoundedRef.current = rounded;
          return rounded > 0 && adjusted === 0;
        }
        if (prevFinalValueRoundedRef.current !== rounded) {
          prevFinalValueRoundedRef.current = rounded;
          return true;
        }
        // Downstream was cleared (e.g., by Generate reset) while upstream is unchanged — re-seed.
        if (rounded > 0 && adjusted === 0 && !isDirty) {
          return true;
        }
        return false;
      },
      compute: ({ getValues: gv }) => Number(gv(finalValueRoundedPath())) || 0,
    },
    {
      // Unit-aware: 01/02 → finalValueAdjusted × area, to whole baht;
      // other (e.g. unit 03) → finalValueRounded (already rounded by the grid).
      targetPath: appraisalPricePath(),
      deps: [finalValueAdjustedPath(), finalValueRoundedPath(), unitAreaPath],
      compute: ({ getValues: gv }) => {
        const fvAdj = Number(gv(finalValueAdjustedPath())) || 0;
        const fvRounded = Number(gv(finalValueRoundedPath())) || 0;
        const area = Number(gv(unitAreaPath)) || 0;
        // Whole baht before anything downstream rounds to a thousand: the area carries two
        // decimals, so rate × area lands on satang nobody typed, and the thousand step then
        // rounds off a number that is shown nowhere (55,925,499.63 falls to 55,925,000 where
        // 55,925,500 goes up). Matches the backend, which stores LandValue the same way.
        // The non-rate branch is already a rounded figure from the grid — left alone.
        return isUnitPrice && area ? Math.round(fvAdj * area) : fvRounded;
      },
    },
    {
      targetPath: priceDifferentiatePath(),
      deps: [appraisalPriceRoundedPath(), appraisalPricePath()],
      compute: ({ getValues: gv }) => {
        const appraisalPriceRounded = gv(appraisalPriceRoundedPath()) ?? 0;
        const appraisalPrice = gv(appraisalPricePath()) ?? 0;
        return appraisalPriceRounded - appraisalPrice;
      },
    },
    {
      targetPath: appraisalPriceRoundedPath(),
      deps: [appraisalPricePath()],
      compute: ({ getValues: gv }) => roundToThousand(Number(gv(appraisalPricePath())) || 0),
      when: ({ getValues: gv, getFieldState, formState }) => {
        const depValue = Number(gv(appraisalPricePath())) || 0;
        const current = Number(gv(appraisalPriceRoundedPath())) || 0;
        const { isDirty } = getFieldState(appraisalPriceRoundedPath(), formState);

        if (prevAppraisalPriceRef.current === null) {
          prevAppraisalPriceRef.current = depValue;
          return current === 0;
        }

        if (prevAppraisalPriceRef.current !== depValue) {
          prevAppraisalPriceRef.current = depValue;
          return true;
        }

        // Downstream was cleared (e.g., by Generate reset) while upstream is unchanged — re-seed.
        if (current === 0 && depValue !== 0 && !isDirty) {
          return true;
        }

        return false;
      },
    },
    {
      targetPath: appraisalPriceIncludeBuildingCostPath(),
      deps: [appraisalPriceRoundedPath(), totalBuildingCostPath()],
      compute: ({ getValues: gv }) => {
        const landPrice = Number(gv(appraisalPriceRoundedPath())) || 0;
        const buildingCostVal = Number(gv(totalBuildingCostPath())) || 0;
        return landPrice + buildingCostVal;
      },
    },
    {
      targetPath: appraisalPriceIncludeBuildingCostRoundedPath(),
      deps: [appraisalPriceIncludeBuildingCostPath()],
      compute: ({ getValues: gv }) =>
        roundToThousand(Number(gv(appraisalPriceIncludeBuildingCostPath())) || 0),
      when: ({ getValues: gv, getFieldState, formState }) => {
        const depValue = Number(gv(appraisalPriceIncludeBuildingCostPath())) || 0;
        const current = Number(gv(appraisalPriceIncludeBuildingCostRoundedPath())) || 0;
        const { isDirty } = getFieldState(
          appraisalPriceIncludeBuildingCostRoundedPath(),
          formState,
        );

        if (prevValueIncludeCostRef.current === null) {
          prevValueIncludeCostRef.current = depValue;
          return current === 0;
        }

        if (prevValueIncludeCostRef.current !== depValue) {
          prevValueIncludeCostRef.current = depValue;
          return true;
        }

        // Downstream was cleared (e.g., by Generate reset) while upstream is unchanged — re-seed.
        if (current === 0 && depValue !== 0 && !isDirty) {
          return true;
        }

        return false;
      },
    },
    {
      targetPath: priceIncludeBuildingCostDifferentiatePath(),
      deps: [
        appraisalPriceIncludeBuildingCostPath(),
        appraisalPriceIncludeBuildingCostRoundedPath(),
      ],
      compute: ({ getValues: gv }) => {
        const appraisalPriceRounded = gv(appraisalPriceIncludeBuildingCostRoundedPath()) ?? 0;
        const finalValueRounded = gv(appraisalPriceIncludeBuildingCostPath()) ?? 0;
        return appraisalPriceRounded - finalValueRounded;
      },
    },
  ];

  useDerivedFields({ rules: rules });

  const includeBuildingCost = useWatch({ control, name: hasBuildingCostPath() });

  // Same reasoning as WQSAdjustFinalValueSection.tsx's editedBadge(): the old
  // diffBadge read a virtual "priceDifferentiate" field (current − raw upstream),
  // which is nonzero on an untouched field purely from roundToThousand, so its
  // green/red arrow was never actually testing "did the user edit this" — and its
  // green was accent-coloured, which mock:172 reserves for a method's own final
  // result only ("เขียวใช้เฉพาะผลสุดท้ายของวิธี"), not a diff arrow on an
  // intermediate row. Compares the field's own live value against a freshly
  // recomputed seed value instead (identical when untouched, by construction), and
  // the revert button writes that same recomputed value back — no new formula.
  // `getComputedValue`/`hintKey` mirror WQSAdjustFinalValueSection.tsx's own signature and
  // exist for the same reason: not every row's seed rule rounds. The rate row's rule (the
  // first entry in `rules` above) copies finalValueRounded verbatim — the hundred-rounding
  // already happened upstream, in the grid — so its "computed" value has to be the same
  // read twice rather than roundToThousand() applied a second time, and its hint says
  // hundred rather than thousand. Both default to the previous behaviour.
  const editedBadge = (
    editableFieldPath: string,
    getRawUpstream: (getValues: any) => number,
    getComputedValue: (getValues: any) => number = gv => roundToThousand(getRawUpstream(gv)),
    // Must stay a literal union, not `string`: `t()` is typed against the closed key set
    // generated from the locale JSON, and a plain `string` makes TS fall back to the
    // `t(key, defaultValue, options)` overload — which then rejects `{ value }` as a
    // defaultValue. Widening this back to `string` silently breaks the call below.
    hintKey:
      | 'comparativeAnalysis.roundingHint'
      | 'comparativeAnalysis.roundingHintHundred' = 'comparativeAnalysis.roundingHint',
    // A "= ที่ดิน + ค่าอาคาร"-style formula sub-line, rendered ONLY while the field still
    // holds its computed value (user: "ถ้าถูกแก้ไขแล้วไม่ต้องแสดง hint"). It describes how
    // the computed figure was derived, so once the appraiser types over it the line is
    // describing a number that is no longer on screen — and it was sitting directly under
    // the แก้เอง badge that says exactly that. It's passed in here rather than left as a
    // sibling node at the call site because "has this been edited" is decided below, in
    // this accessor, by comparing the live value against a freshly recomputed seed;
    // re-deriving that fact next to the sub-line would be a second copy free to drift out
    // of step with the badge. Same branch as the rounding hint above, which already
    // disappears on edit for the same reason.
    formulaHint?: ReactNode,
  ) => (
    <RHFInputCell
      fieldName={editableFieldPath}
      inputType="display"
      accessor={({ value, getValues }) => {
        const raw = getRawUpstream(getValues);
        const computed = getComputedValue(getValues);
        const current = Number(value) || 0;
        const delta = current - computed;
        if (delta === 0) {
          return (
            <>
              <span className="text-[10.5px] text-gray-400">{t(hintKey, { value: fmt(raw) })}</span>
              {formulaHint}
            </>
          );
        }
        const sign = delta > 0 ? '+' : '−';
        return (
          <span className="text-[10.5px] text-gray-400 inline-flex items-center gap-1 flex-wrap justify-end">
            <span className="font-semibold text-[#b45309]">
              {t('comparativeAnalysis.editedLabel')}
            </span>
            {t('comparativeAnalysis.differsFromComputed', {
              value: `${sign}${fmt(Math.abs(delta))}`,
            })}
            <span>·</span>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setValue(editableFieldPath, computed, { shouldDirty: true })}
            >
              {t('comparativeAnalysis.useComputedValue')}
            </button>
          </span>
        );
      }}
    />
  );

  const valueDisplay = (fieldPath: string) => (
    <RHFInputCell
      fieldName={fieldPath}
      inputType="display"
      accessor={({ value }) => (
        <span className="font-semibold text-gray-800 tabular-nums">{fmt(Number(value) || 0)}</span>
      )}
    />
  );

  // Static muted sub-line (no field to read — a formula explanation, not a value), same
  // shape and placement as the rounding hint above. mock:1635 — "= ราคาต่อหน่วย × เนื้อที่",
  // "= ที่ดิน + ค่าอาคาร".
  const mutedSubLine = (text: string) => (
    <span className="text-[10.5px] text-[#8a96a0]">{text}</span>
  );

  // mock:1595 — "= มูลค่าตามวิธี" in the final-value green over a 10.5px "Indicated Value"
  // caption (mock:605's `.kv .l .en`), replacing the single combined
  // `finalValue.indicatedValue` string ("มูลค่าตามวิธี (Indicated Value)") this card used to
  // render inline at one size. The combined key is deliberately left alone rather than
  // reworded: CostBuildingPanel, CostMachinePanel, LeaseholdPanel and both comparison
  // panels still render it, so splitting it in place would have reshaped five other
  // screens. `suffix` — mock:1618 appends "(รวมอาคาร)" on the with-building-cost row only;
  // every other caller passes nothing. The sub-label sits behind a truthiness check
  // because it is deliberately empty in en/zh, where the main label already reads
  // "Indicated Value" and a caption repeating it would be noise.
  const indicatedValueLabel = (suffix?: string) => (
    <span className="flex flex-col">
      <span className="text-[14px] font-semibold text-[#0f766e]">
        {/* mock:1589/1595 — the mock's own lump-sum branch has no "=" on this label;
            only the per-unit branch does, where the terms of the equation (rate × area)
            are on screen above it. In lump-sum mode this row is a rounding of the single
            Final Value row above it, not a sum of displayed terms. */}
        {isUnitPrice && <span className="mr-1 text-gray-400">=</span>}
        {t('finalValue.indicatedValueLabel')}
        {suffix && <span className="ml-1 text-xs font-normal text-gray-500">{suffix}</span>}
      </span>
      {t('finalValue.indicatedValueSubLabel') && (
        <span className="text-[10.5px] text-gray-400">
          {t('finalValue.indicatedValueSubLabel')}
        </span>
      )}
    </span>
  );

  // mock:1592 — "× {areaLabel}". The multiplication sign is what makes this row read as
  // the formula step it is (rate × area = value) rather than an unrelated property
  // attribute sitting between two money rows.
  const areaRowLabelNode = (
    <>
      <span className="mr-1 text-gray-400">×</span>
      {areaRowLabel}
    </>
  );

  // mock:1590-1591 — in per-unit mode the rate is TWO rows, not one: the method's own
  // computed final value (read-only, carrying a "ต่อ{unit}" qualifier so it reads as a
  // rate and not a total), then the rate actually used, which is the editable one. This
  // card rendered only the editable field, labelled as if it were the computed figure —
  // so once an appraiser typed over it, what the method had actually produced was no
  // longer on screen anywhere, and the "× area" row below multiplied a number with no
  // visible origin. Nothing new is computed here: `finalValueRounded` is already this
  // card's own seed source (see the finalValueAdjusted rule above) and is already
  // persisted; it is simply shown.
  //
  // Shared by all three per-unit branches below, which previously held three near-copies
  // of this pair — which is how they drifted out of step with each other and with WQS.
  const rateRows = (
    <>
      <KvRow
        label={
          <>
            {finalValueLabel}{' '}
            <span className="text-gray-400 text-[10.5px]">
              {t('finalValue.perUnitSuffix', { unit: unitAreaLabel })}
            </span>
          </>
        }
        value={valueDisplay(finalValueRoundedPath())}
        unit={t('finalValue.baht')}
      />
      <KvRow
        label={
          <span className="font-semibold">
            {t('finalValue.rateUsedLabel', { unit: unitAreaLabel })}
          </span>
        }
        value={
          <RHFInputCell
            fieldName={finalValueAdjustedPath()}
            inputType="number"
            number={{
              decimalPlaces: 2,
              maxIntegerDigits: 15,
              maxValue: 999_999_999_999_999.0,
              allowNegative: false,
            }}
            dense
            inputClassName="h-[26px]! text-[12.5px]! w-full!"
          />
        }
        unit={t('finalValue.baht')}
        // This row's seed rule copies finalValueRounded verbatim — no rounding of its
        // own — so raw and computed are the same read, not raw→roundToThousand(raw).
        hint={editedBadge(
          finalValueAdjustedPath(),
          gv => Number(gv(finalValueRoundedPath())) || 0,
          gv => Number(gv(finalValueRoundedPath())) || 0,
          'comparativeAnalysis.roundingHintHundred',
        )}
      />
    </>
  );

  // mock:1588 — `unitRows()`'s lump-sum branch drops the rate and "× area" rows but
  // still emits the method's own Final Value row (the `sub` string built at mock:1649)
  // above the Indicated Value row. Ours dropped it too: the only site that renders
  // `finalValueLabel` is `rateRows` above, which is behind an `isUnitPrice` gate — so in
  // lump-sum mode the figure reached the screen only as text inside the Indicated Value
  // row's rounding hint, and "Final Value (lowest)" — the label that names WHICH
  // arithmetic produced the number, which is the whole reason the user asked for the
  // bracketed qualifier on all three methods — never appeared at all.
  //
  // Nothing new is computed: the same `finalValueRounded` read `rateRows` shows, and in
  // lump-sum mode it is already this card's own upstream — the `appraisalPrice` rule
  // above copies it straight through when `isUnitPrice` is false, and the Indicated
  // Value row rounds that. No per-unit suffix here, unlike `rateRows`: in lump-sum mode
  // the figure is a total, not a rate, so "ต่อ{unit}" would be false.
  const lumpSumFinalValueRow = !isUnitPrice && (
    <KvRow
      label={finalValueLabel}
      value={valueDisplay(finalValueRoundedPath())}
      unit={t('finalValue.baht')}
    />
  );

  // mock:1610 — the checkbox sits INSIDE the label cell, before its text, not in the
  // value cell on the far right (user: "ตรงรวมค่าอาคารเอา checkbox ไว้ซ้ายได้ไหม"). Passed
  // as the row's `label`. The text goes through `<Checkbox>`'s own children slot rather
  // than a hand-rolled `<label>` wrapper: children render inside the same Headless UI
  // control as the box, so the text stays a click target and the whole thing keeps its
  // keyboard/`role="checkbox"` behaviour — and, unlike the `label` prop, children carry
  // no typography of their own, so the text inherits the label cell's 12.5px/gray-500
  // like every other row's label. Shared by both branches below (they're mutually
  // exclusive) so the two rows can't drift apart on the write path.
  //
  // `className` re-shapes the box to the mock's native 14px/1px (mock:1612). The shared
  // component's `sm` preset is `h-4 w-4` + `border-2`, which at this app's 13px root is
  // a 13px box with a 9px interior. Overridden at the call site, not in `Checkbox.tsx`,
  // because that preset is shared app-wide — see the same override and the full
  // reasoning in `WQSAdjustFinalValueSection.tsx`.
  const buildingCostCheckbox = (
    <Checkbox
      className="[&>span>span]:h-[14px] [&>span>span]:w-[14px] [&>span>span]:border"
      size="sm"
      checked={!!includeBuildingCost}
      onChange={checked => setValue(hasBuildingCostPath(), checked, { shouldDirty: true })}
    >
      {t('finalValue.hasBuildingValue')}
    </Checkbox>
  );

  return (
    // Same card shell as WQSAdjustFinalValueSection.tsx — mock:579-580.
    <div className="min-w-0 border border-[#e3e9e8] rounded-[10px] overflow-hidden">
      <h4 className="m-0 px-[12px] py-[8px] text-[12.5px] font-semibold text-gray-800 bg-[#f8fafa] border-b border-[#e3e9e8]">
        {t('finalValue.title')}
      </h4>
      <div className="flex flex-col text-[12.5px]">
        {/* mock:1582 — the detected price unit, read-only. The mixed-unit warning below
            was already here but had nothing above it naming the unit it refers to; this
            is the row that unitRows() opens with in every method. Not a value+unit row:
            the pill stands in for both, so the unit column stays empty. */}
        <KvRow
          label={
            <>
              {t('finalValue.priceUnit')}{' '}
              {/* mock:605 — `.kv .l .en { font-size: 10.5px }`, written as px because the
                  13px root makes `text-xs` render 9.75px. Same fix in
                  WQSAdjustFinalValueSection and SaleAdjustmentGridAdjustAppraisalPriceSection. */}
              <span className="text-gray-400 text-[10.5px]">({t('finalValue.priceUnitHint')})</span>
            </>
          }
          // mock:1584 — `pill ok` (teal) whenever a per-unit mode is active, `pill mute`
          // (grey) otherwise. This pill is the only thing on the row that says whether an
          // area multiplication is in play at all, and it rendered grey in both states.
          // The hexes are the mock's own `--ok`/`--ok-wash` tokens (mock:39-40) rather
          // than Tailwind colour names: v4's palette is OKLCH, so the names no longer
          // land on the mock's values.
          value={
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                isUnitPrice ? 'bg-[#f0fdf4] text-[#15803d]' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {unitChipLabel}
            </span>
          }
        />
        {mixedUnit && (
          <KvWarningRow>
            {t('comparativeAnalysis.mixedUnitWarning', {
              odd: oddUnitCount,
              label: unitChipLabel,
            })}
          </KvWarningRow>
        )}

        {/* Lump sum only — see `lumpSumFinalValueRow` above. One site rather than a copy
            inside each branch: every branch below that is reachable in lump-sum mode
            renders nothing between this point and its own Indicated Value row (`rateRows`
            is `isUnitPrice`-gated everywhere), so this lands directly above that row in
            each of them, which is the order the mock has. */}
        {lumpSumFinalValueRow}

        {/* ── COST APPROACH, no building cost, unit=01/02 ── */}
        {isCostApproach && !includeBuildingCost && isUnitPrice && (
          <>
            {rateRows}
            <KvRow
              label={areaRowLabelNode}
              value={valueDisplay(unitAreaPath)}
              unit={unitAreaLabel}
            />
          </>
        )}

        {/* ── MARKET APPROACH ── */}
        {!isCostApproach && isUnitPrice && (
          <>
            {rateRows}
            <KvRow
              label={areaRowLabelNode}
              value={valueDisplay(unitAreaPath)}
              unit={unitAreaLabel}
            />
          </>
        )}

        {/* ── COST APPROACH, no building cost: rounded Indicated Value input ──
            The read-only "ราคาประเมิน" rows — this branch's, and the market-approach copy
            that used to sit above it — are gone on the user's ruling ("ลบออกเอาให้เหลือแค่
            มูลค่าตามวิธี"). WQS's summary renders no such row either. Display only: the
            `appraisalPrice` field, its derived rule and the save payload are untouched,
            and the computed figure stays reachable — each Indicated Value row's edited
            badge below compares against it and offers the revert. */}
        {isCostApproach && !includeBuildingCost && (
          <>
            <KvRow
              label={indicatedValueLabel()}
              value={
                <RHFInputCell
                  fieldName={appraisalPriceRoundedPath()}
                  inputType="number"
                  number={{
                    decimalPlaces: 2,
                    maxIntegerDigits: 15,
                    maxValue: 999_999_999_999_999.0,
                    allowNegative: false,
                  }}
                  // Green — mock:587-589's `.kv .final .in`, the one input in this card
                  // the mixed-unit-row instruction inherits from WQS's own ruling
                  // ("เขียวใช้เฉพาะผลสุดท้ายของวิธี").
                  inputClassName="bg-[#f0fdfa]! border-[#99f6e4]! text-[#0f766e]! font-bold! text-[12.5px]! h-[26px]! py-0! px-[5px]! rounded-[4px]! w-full!"
                  onUserChange={
                    !isUnitPrice
                      ? (next: any) => {
                          setValue(finalValueAdjustedPath(), next, { shouldDirty: true });
                          return next;
                        }
                      : undefined
                  }
                />
              }
              unit={t('finalValue.baht')}
              hint={editedBadge(
                appraisalPriceRoundedPath(),
                gv => Number(gv(appraisalPricePath())) || 0,
              )}
            />
          </>
        )}

        {/* ── MARKET APPROACH: Appraisal Price rounded input ── */}
        {!isCostApproach && (
          <KvRow
            label={indicatedValueLabel()}
            value={
              <RHFInputCell
                fieldName={appraisalPriceRoundedPath()}
                inputType="number"
                number={{
                  decimalPlaces: 2,
                  maxIntegerDigits: 15,
                  maxValue: 999_999_999_999_999.0,
                  allowNegative: false,
                }}
                inputClassName="bg-[#f0fdfa]! border-[#99f6e4]! text-[#0f766e]! font-bold! text-[12.5px]! h-[26px]! py-0! px-[5px]! rounded-[4px]! w-full!"
                onUserChange={
                  !isUnitPrice
                    ? (next: any) => {
                        setValue(finalValueAdjustedPath(), next, { shouldDirty: true });
                        return next;
                      }
                    : undefined
                }
              />
            }
            unit={t('finalValue.baht')}
            hint={editedBadge(
              appraisalPriceRoundedPath(),
              gv => Number(gv(appraisalPricePath())) || 0,
            )}
          />
        )}

        {/* ── INCLUDE BUILDING COST CHECKBOX — only when it's OFF. mock:1517 — a
              checkbox, not a toggle switch (same conversion as WQS's). ── */}
        {isCostApproach && !includeBuildingCost && (
          <KvRow
            label={buildingCostCheckbox}
            // mock:1610 — with the box unticked the indicated value silently becomes
            // land-only. Saying so is the whole point of the row: an appraiser who
            // unticks it otherwise gets no signal that the number just changed meaning.
            // It lives in the VALUE cell, as the mock has it — it was this row's `hint`
            // only because the checkbox used to occupy the value cell.
            value={
              <span className="text-[10.5px] text-[#8a96a0]">
                {t('finalValue.includeBuildingCostOff')}
              </span>
            }
          />
        )}

        {/* ── COST APPROACH, with building cost ── */}
        {isCostApproach && includeBuildingCost && (
          <>
            {isUnitPrice && rateRows}
            {/* mock:1587-1589 — `unitRows()`'s lump-sum branch emits no "× area" row at
                all; only its per-unit branch does (mock:1592), and `buildingBlock()`
                (mock:1610-1618) adds a toggle, a building-cost row and a total, never an
                area row. Read from the mock, not inferred from the rows around it.
                Ungated, this row rendered in lump-sum mode with no rate above it (the
                `rateRows` line directly above is gated) and no product below it —
                arithmetic on screen whose multiplicand and result are both absent, the
                same defect as the stray "=" on the Indicated Value label. The two sibling
                branches above already gate their own copy of this row the same way.
                Per-unit rendering is unchanged. */}
            {isUnitPrice && (
              <KvRow
                label={areaRowLabelNode}
                value={valueDisplay(unitAreaPath)}
                unit={unitAreaLabel}
              />
            )}
            {/* One land row, not two. A read-only `appraisalPrice` row used to sit here
                carrying the SAME "มูลค่าที่ดิน" label as the editable row below it, so the card
                showed one label twice with two different numbers — the mock has a single land
                row and WQS dropped its read-only copy already. User's ruling: "เอาที่ซ้ำออก".
                The editable (rounded) row is the one kept, because that is the figure the
                appraiser actually works with and the one that is persisted. Nothing becomes
                unreachable: `appraisalPrice` keeps its derived rule and its place in the save
                payload, and the pre-rounding figure is still ON SCREEN in the row below — its
                edited badge reads `appraisalPrice` as the raw upstream and renders it through
                comparativeAnalysis.roundingHint ("ระบบปัดหลักพันจาก {value}"), with a revert
                link back to it. Caveat, the same one WQS already lives with: that hint is
                replaced by the แก้เอง badge once the appraiser overrides the row, so after a
                manual edit the raw pre-rounding number is no longer displayed. */}
            <KvRow
              label={
                <span className="font-semibold text-gray-800">{t('finalValue.landValue')}</span>
              }
              value={
                <RHFInputCell
                  fieldName={appraisalPriceRoundedPath()}
                  inputType="number"
                  number={{
                    decimalPlaces: 2,
                    maxIntegerDigits: 15,
                    maxValue: 999_999_999_999_999.0,
                    allowNegative: false,
                  }}
                  dense
                  inputClassName="h-[26px]! text-[12.5px]! w-full!"
                />
              }
              unit={t('finalValue.baht')}
              hint={editedBadge(
                appraisalPriceRoundedPath(),
                gv => Number(gv(appraisalPricePath())) || 0,
                undefined,
                undefined,
                mutedSubLine(t('finalValue.landValueFormulaHint')),
              )}
            />

            {/* Ticked: mock:1610's value cell is empty on this branch — the "ไม่รวม …"
                note only exists to explain the unticked state. */}
            <KvRow label={buildingCostCheckbox} value={null} />

            {/* Read-only rollup, replacing the inline RCN/depreciation table — same
                "no linked method to point at yet" situation as WQS's own removal;
                the number is unchanged, still `totalBuildingCostPath()` fed by the
                useEffect above off the same building properties' depreciationDetails
                CostBuildingPanel.tsx computes its own total from. */}
            <KvRow
              label={
                <span className="pl-3">
                  {t('finalValue.buildingCostFromLabel', { count: buildingCost?.length ?? 0 })}
                </span>
              }
              value={valueDisplay(totalBuildingCostPath())}
              unit={t('finalValue.baht')}
              // mock:1617's "แก้ที่ Building Cost →", now a working link. It renders nothing
              // when the group has no Building Cost method — there would be nowhere to go,
              // and the row is showing its fallback roll-up in that case.
              hint={
                <BuildingCostLink
                  labelKey="finalValue.editAtBuildingCost"
                  confirmMessageKey="finalValue.leaveUnsaved"
                />
              }
            />

            <KvRow
              label={indicatedValueLabel(t('finalValue.includeBuildingSuffix'))}
              value={
                <RHFInputCell
                  fieldName={appraisalPriceIncludeBuildingCostRoundedPath()}
                  inputType="number"
                  number={{
                    decimalPlaces: 2,
                    maxIntegerDigits: 15,
                    maxValue: 999_999_999_999_999.0,
                    allowNegative: false,
                  }}
                  inputClassName="bg-[#f0fdfa]! border-[#99f6e4]! text-[#0f766e]! font-bold! text-[12.5px]! h-[26px]! py-0! px-[5px]! rounded-[4px]! w-full!"
                />
              }
              unit={t('finalValue.baht')}
              hint={editedBadge(
                appraisalPriceIncludeBuildingCostRoundedPath(),
                gv => Number(gv(appraisalPriceIncludeBuildingCostPath())) || 0,
                undefined,
                undefined,
                mutedSubLine(t('finalValue.indicatedValueFormulaHint')),
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}
