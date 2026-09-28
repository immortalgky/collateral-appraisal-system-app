import { useEffect, useMemo, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/shared/components';
import { RHFInputCell } from './table/RHFInputCell';
import { wqsFieldPath } from '../adapters/wqsFieldPath';
import { roundToThousand } from '@features/pricingAnalysis/domain/calculateWQS.ts';
import { detectPriceUnitMixed } from '@features/pricingAnalysis/domain/detectPriceUnitMixed';
import { fmt } from '../domain/formatters';
import { sumBuildingFinalCostValue } from '../domain/calculation';
import {
  type DerivedFieldRule,
  useDerivedFields,
} from '@features/pricingAnalysis/adapters/useDerivedFieldArray.tsx';
import { WQSValueRangeCard } from './WQSValueRangeCard';
import { KvRow, KvWarningRow } from './KvRow';
import { BuildingCostLink, useGroupBuildingCostMethod } from './BuildingCostLink';

interface AdjustFinalValueSectionProp {
  property: Record<string, unknown>;
  buildingCost?: Record<string, unknown>[];
  isCostApproach: boolean;
}

export const AdjustFinalValueSection = ({
  property: _property,
  buildingCost,
  isCostApproach,
}: AdjustFinalValueSectionProp) => {
  const {
    finalValueIncludeLandArea: includeLandAreaPath,
    finalValueHasBuildingCost: hasBuildingCostPath,
    finalValueLandArea: landAreaPath,
    finalValueUsableArea: usableAreaPath,
    finalValueFinalValueAdjusted: finalValueAdjustedPath,
    finalValueFinalValueRounded: finalValueFinalValueRoundedPath,
    finalValueLandValue: landValuePath,
    finalValueBuildingCost: buildingCostPath,
    finalValueAppraisalPrice: appraisalPricePath,
  } = wqsFieldPath;

  const { t } = useTranslation('pricingAnalysis');
  const { control, setValue } = useFormContext();
  const { methodValue: buildingCostMethodValue } = useGroupBuildingCostMethod();
  const includeBuildingCost = useWatch({ control, name: hasBuildingCostPath() });
  const calculations = useWatch({ control, name: 'WQSCalculations' });

  // Detect price unit from calculation rows (used by both cost and market approaches
  // to decide whether the price is per-unit (01/02) or total (03)).
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

  const isUnitPrice = detectedUnit === 'PerSqWa' || detectedUnit === 'PerSqm'; // per Sq.Wa or per Sq.M
  const unitAreaPath = detectedUnit === 'PerSqm' ? usableAreaPath() : landAreaPath();
  const unitAreaLabel =
    detectedUnit === 'PerSqm' ? t('wqs.summary.unitAreaSqm') : t('wqs.summary.unitAreaWa');
  // The "× area" row's own label, branched on the SAME detectedUnit as the paths above —
  // ported from SaleAdjustmentGridAdjustAppraisalPriceSection/DirectComparisonAdjust-
  // AppraisalPriceSection, which have always branched it while this card hardcoded the land
  // wording. That was wrong, not merely inconsistent: for per-sq-metre comparables the row
  // already READ `usableAreaPath()` (see unitAreaPath), so the number shown was usable area
  // while the label called it land area. Own keys under `wqs.summary.*` rather than the
  // `finalValue.*` pair the other two read, matching how this namespace already keeps its own
  // unitAreaWa/unitAreaSqm: a reword for one method must not silently reword the others.
  const areaRowLabel =
    detectedUnit === 'PerSqm' ? t('wqs.summary.usableAreaRowLabel') : t('wqs.summary.areaRowLabel');
  // Display label only — reads the same `detectedUnit` computed above, doesn't
  // re-derive it. Falls back to "lump sum" for unit 03 and for the no-comparables case.
  const unitChipLabel =
    detectedUnit === 'PerSqWa'
      ? t('wqs.summary.unitPerSqWa')
      : detectedUnit === 'PerSqm'
        ? t('wqs.summary.unitPerSqm')
        : t('wqs.summary.unitLumpSum');

  // mock:1290/1526 — surfaces `detectPriceUnit`'s own majority pick rather than
  // re-deciding anything: when the comparables don't all agree on a unit, warn
  // which ones don't and how many, instead of silently rounding on the majority
  // and leaving the appraiser no signal. Display-only, see calculateWQS.ts.
  const { mixed: mixedUnit, odd: oddUnitCount } = useMemo(
    () => detectPriceUnitMixed(calculations),
    [calculations],
  );

  // The "Include Area" toggle is auto-derived from the comparables' measure unit
  // (01/02 → land area applies; 03 → total price, no area). Keeps the form field
  // populated so the backend persists the right value, even though the UI no longer
  // exposes a manual toggle.
  useEffect(() => {
    setValue(includeLandAreaPath(), isUnitPrice, { shouldDirty: false });
  }, [isUnitPrice, setValue, includeLandAreaPath]);

  // The group's Building Cost Value, from the one shared implementation — the same figure
  // the Building Cost method shows and the backend stores (see sumBuildingFinalCostValue,
  // which mirrors PricingPropertyDataService.BuildingCostSql).
  //
  // This block used to sum every schedule row's after-depreciation figure raw, which was
  // neither of those things: the appraiser's keyed Final Cost Value never applied, and the
  // per-building rounding to the nearest 1,000 never happened. So this row — and the
  // Indicated Value computed from it — sat a few hundred baht off the number printed beside
  // it on the property form, and the figure this card SAVES disagreed with the one pricing
  // read back. It also re-derived each row from `area × rate − Σ periods` rather than
  // reading the stored `priceAfterDepreciation` the backend sums, a second formula free to
  // drift from the first.
  // The figure of record is the Building Cost method's saved value — what the appraiser keyed
  // into "มูลค่าตามวิธี" there — and the per-building roll-up below is only its fallback, for a
  // group whose BC method has never been saved. Showing the roll-up unconditionally meant an
  // appraiser who adjusted the figure on the BC screen watched this row ignore it.
  // See BuildingCostLink for the full two-totals explanation.
  useEffect(() => {
    setValue(
      buildingCostPath(),
      buildingCostMethodValue ?? sumBuildingFinalCostValue(buildingCost),
      { shouldDirty: false },
    );
  }, [buildingCost, buildingCostMethodValue, buildingCostPath, setValue]);

  // Always pair the per-unit price with its matching area (Sq.Wa for unit 01,
  // Sq.m for unit 02). Drives both cost and market approach now that the
  // "Include Area" toggle is auto-derived from the comparables' measure unit.
  const rawLandPriceAreaPath = unitAreaPath;

  // Track previous upstream values so seed rules only re-fire on actual upstream change.
  // Without these guards, useDerivedFields re-runs on every render and overwrites user edits
  // because landValue/appraisalPrice are themselves deps of other rules in this group,
  // and finalValueAdjusted is restored via setValue post-reset (so rule re-fires on it).
  const prevFinalValueRoundedRef = useRef<number | null>(null);
  const prevRawLandPriceRef = useRef<number | null>(null);
  const prevTotalPriceRef = useRef<number | null>(null);

  // Resolves the upstream value that drives the user's rounded "Appraisal Price":
  // - hasBuildingCost  → _totalPrice (landValue + buildingCost)
  // - !hasBuildingCost → _rawLandPrice (which already encodes case 1 vs 2)
  const getAppraisalUpstream = (getValues: any): number => {
    const hbc = !!getValues(hasBuildingCostPath());
    if (hbc) return Number(getValues('WQSFinalValue._totalPrice')) || 0;
    return Number(getValues('WQSFinalValue._rawLandPrice')) || 0;
  };

  const rules: DerivedFieldRule[] = [
    {
      // finalValueAdjusted: re-seed from finalValueRounded when upstream changes,
      // or on first run when downstream is still empty (fresh Generate, no saved value).
      // Lives here (rather than in buildWQSDerivedRules) so it shares the ref-guard
      // pattern with landValue/appraisalPrice; otherwise reset(value) and rule-array
      // re-creation after save would clobber the user's saved override.
      targetPath: finalValueAdjustedPath(),
      deps: [finalValueFinalValueRoundedPath()],
      when: ({ getValues, getFieldState, formState }) => {
        const rounded = Number(getValues(finalValueFinalValueRoundedPath())) || 0;
        const adjusted = Number(getValues(finalValueAdjustedPath())) || 0;
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
      compute: ({ getValues }) => Number(getValues(finalValueFinalValueRoundedPath())) || 0,
    },
    {
      // rawLandPrice: computed display value (not stored). Same logic for cost and market.
      // unit 01/02 (per-unit price): finalValueAdjusted × matchingArea, to whole baht —
      //                              the user's rounded sibling field applies roundToThousand)
      // unit 03 (total price):       finalValueRounded (already rounded by the grid)
      targetPath: 'WQSFinalValue._rawLandPrice',
      deps: [finalValueAdjustedPath(), finalValueFinalValueRoundedPath(), rawLandPriceAreaPath],
      compute: ({ getValues }) => {
        const fvAdj = Number(getValues(finalValueAdjustedPath())) || 0;
        const fvRounded = Number(getValues(finalValueFinalValueRoundedPath())) || 0;
        const area = Number(getValues(rawLandPriceAreaPath)) || 0;
        // Whole baht before anything downstream rounds to a thousand: the area carries two
        // decimals, so rate × area lands on satang nobody typed, and the thousand step then
        // rounds off a number that is shown nowhere (55,925,499.63 falls to 55,925,000 where
        // 55,925,500 goes up). Matches the backend, which stores LandValue the same way.
        // The non-rate branch is already a rounded figure from the grid — left alone.
        return isUnitPrice && area ? Math.round(fvAdj * area) : fvRounded;
      },
    },
    {
      // landValue: re-seed (rounded) from rawLandPrice when upstream changes, or on first
      // run when downstream is still empty. The ref-based guard is required because
      // landValue is a dep of _totalPrice/_landDiff, so the effect re-runs when the user
      // types here; without the guard the seed would overwrite the user's edit.
      targetPath: landValuePath(),
      deps: ['WQSFinalValue._rawLandPrice'],
      when: ({ getValues, getFieldState, formState }) => {
        const rawPrice = Number(getValues('WQSFinalValue._rawLandPrice')) || 0;
        const current = Number(getValues(landValuePath())) || 0;
        const { isDirty } = getFieldState(landValuePath(), formState);
        if (prevRawLandPriceRef.current === null) {
          prevRawLandPriceRef.current = rawPrice;
          return rawPrice > 0 && current === 0;
        }
        if (prevRawLandPriceRef.current !== rawPrice) {
          prevRawLandPriceRef.current = rawPrice;
          return true;
        }
        // Downstream was cleared (e.g., by Generate reset) while upstream is unchanged — re-seed.
        if (rawPrice > 0 && current === 0 && !isDirty) {
          return true;
        }
        return false;
      },
      compute: ({ getValues }) =>
        roundToThousand(Number(getValues('WQSFinalValue._rawLandPrice')) || 0),
    },
    {
      // totalPrice: landValue + buildingCost (hasBuildingCost display).
      targetPath: 'WQSFinalValue._totalPrice',
      deps: [landValuePath(), buildingCostPath()],
      compute: ({ getValues }) => {
        const landVal = Number(getValues(landValuePath())) || 0;
        const bCost = Number(getValues(buildingCostPath())) || 0;
        return landVal + bCost;
      },
    },
    {
      // landDiff: landValue − rawLandPrice (negative = user rounded down).
      targetPath: 'WQSFinalValue._landDiff',
      deps: ['WQSFinalValue._rawLandPrice', landValuePath()],
      compute: ({ getValues }) => {
        const rawPrice = Number(getValues('WQSFinalValue._rawLandPrice')) || 0;
        const landVal = Number(getValues(landValuePath())) || 0;
        return landVal - rawPrice;
      },
    },
    {
      // appraisalPrice: re-seed from the case-appropriate upstream when it changes.
      // - hasBuildingCost: from _totalPrice (= landValue + buildingCost)
      // - !hasBuildingCost: from _rawLandPrice (case 1: fvAdj × area; case 2: finalValue)
      // Always rounded — this field IS the "Indicated Value" input.
      targetPath: appraisalPricePath(),
      deps: ['WQSFinalValue._totalPrice', 'WQSFinalValue._rawLandPrice', hasBuildingCostPath()],
      when: ({ getValues, getFieldState, formState }) => {
        const upstream = getAppraisalUpstream(getValues);
        const current = Number(getValues(appraisalPricePath())) || 0;
        const { isDirty } = getFieldState(appraisalPricePath(), formState);
        if (prevTotalPriceRef.current === null) {
          prevTotalPriceRef.current = upstream;
          return upstream > 0 && current === 0;
        }
        if (prevTotalPriceRef.current !== upstream) {
          prevTotalPriceRef.current = upstream;
          return true;
        }
        // Downstream was cleared (e.g., by Generate reset) while upstream is unchanged — re-seed.
        if (upstream > 0 && current === 0 && !isDirty) {
          return true;
        }
        return false;
      },
      compute: ({ getValues }) => roundToThousand(getAppraisalUpstream(getValues)),
    },
    {
      // appraisalDiff: appraisalPrice − upstream (negative = user rounded down).
      targetPath: 'WQSFinalValue._appraisalDiff',
      deps: [
        'WQSFinalValue._totalPrice',
        'WQSFinalValue._rawLandPrice',
        appraisalPricePath(),
        hasBuildingCostPath(),
      ],
      compute: ({ getValues }) => {
        const upstream = getAppraisalUpstream(getValues);
        const appraisalVal = Number(getValues(appraisalPricePath())) || 0;
        return appraisalVal - upstream;
      },
    },
  ];
  useDerivedFields({ rules });

  // Replaces the old diffBadge(). That one read a virtual `_appraisalDiff`/
  // `_landDiff` field (current box value − raw upstream) and hid entirely at 0 —
  // but a freshly-seeded, never-touched box already differs from its own raw
  // upstream purely from `roundToThousand`, so "diff is 0" was never actually the
  // same thing as "not edited by the user", it just happened to look right by
  // coincidence in the cases anyone tested. mock:1579 (`edited`/`ovh`) draws that
  // line as "does the box's current value match what its own seed rule would
  // produce right now" — identical when untouched (that literally is how it was
  // seeded), only diverges once the user types something else. So this compares
  // the field's own live value against a freshly-recomputed seed value instead of
  // reading a virtual diff field, and the revert button below writes that same
  // recomputed value straight back — same formula the seed rule itself uses
  // (`roundToThousand` over `getAppraisalUpstream`/`_rawLandPrice`), not a new one.
  // `getRawValue` is `getAppraisalUpstream` for the appraisalPrice rows and a
  // direct `_rawLandPrice` read for the landValue row — both already exist above.
  // `getComputedValue` defaults to `roundToThousand(raw)` (every existing caller's
  // shape) but is a separate parameter, not hardcoded, because not every row's own
  // seed rule rounds — the rate row's seed rule (line 160) copies
  // `finalValueFinalValueRoundedPath()` verbatim with no rounding step of its own
  // (the hundred-rounding already happened upstream, in the regression figure
  // itself), so its "computed" value has to be the same read twice, not put
  // through `roundToThousand` a second time. `hintKey` likewise defaults to the
  // thousand-rounding wording; the rate row passes the hundred one, matching its
  // own `roundingHintHundred` sub-line before this replaced it.
  const editedBadge = (
    editableFieldPath: string,
    getRawValue: (getValues: any) => number,
    getComputedValue: (getValues: any) => number = gv => roundToThousand(getRawValue(gv)),
    // Must stay a literal union, not `string`: `t()` is typed against the closed set of
    // keys generated from the locale JSON, and a plain `string` makes TS fall back to the
    // `t(key, defaultValue, options)` overload — which then rejects `{ value }` as a
    // defaultValue. Widening this back to `string` silently breaks the call below.
    hintKey:
      | 'comparativeAnalysis.roundingHint'
      | 'wqs.summary.roundingHintHundred' = 'comparativeAnalysis.roundingHint',
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
    formulaHint?: React.ReactNode,
  ) => (
    <RHFInputCell
      fieldName={editableFieldPath}
      inputType="display"
      accessor={({ value, getValues }) => {
        const raw = getRawValue(getValues);
        const computed = getComputedValue(getValues);
        const current = Number(value) || 0;
        const delta = current - computed;
        // Untouched: still exactly the seeded value — show where it came from
        // instead of leaving the slot blank (mock:1573's un-edited branch).
        if (delta === 0) {
          return (
            <>
              <span className="text-[10.5px] text-gray-400">{t(hintKey, { value: fmt(raw) })}</span>
              {formulaHint}
            </>
          );
        }
        // Edited: mock:1579's `แก้เอง` amber label + signed delta + a link that
        // restores the exact value above and clears the override by writing over it.
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

  // "มูลค่าตามวิธี" over a small "Indicated Value" caption, replacing the single
  // combined `finalValue.indicatedValue` string ("มูลค่าตามวิธี (Indicated Value)")
  // used everywhere else. WQS-only substitution, same reasoning as
  // `wqs.topBarValueLabel` — that key is WQS-only too (WQSPanel.tsx's top bar is its
  // only caller); BC/MC/Leasehold each keep using `finalValue.indicatedValue`.
  // `suffix` — mock:1559 appends "(รวมอาคาร)" to this label specifically in the
  // with-building-cost row; every other caller passes nothing and renders exactly
  // as before. Colour/weight are mock:587's `.kv .final` rule — every call site of
  // this function is one of the three green "มูลค่าตามวิธี" rows (user: "ยกเว้น
  // มูลค่าตามวิธี ให้คงไว้ตามเดิมแต่ใช้ฟ้อนเขียวแบบใน mock"), so this doesn't need a
  // variant; if a non-final caller ever needs this label, it should get its own
  // helper rather than a flag here. No `w-48` here any more — the label now lives
  // in the grid's own `1fr` column (see `kvRow` below), which sizes it instead.
  const indicatedValueLabel = (suffix?: string) => (
    <span className="flex flex-col">
      <span className="text-[14px] font-semibold text-[#0f766e]">
        {/* mock:1589/1595 — the mock's own lump-sum branch has no "=" on this label;
            only the per-unit branch does, where the terms of the equation (rate × area)
            are on screen above it. In lump-sum mode this row is a rounding of the single
            Final Value row above it, not a sum of displayed terms. */}
        {isUnitPrice && <span className="mr-1 text-gray-400">=</span>}
        {t('wqs.summary.indicatedValueLabel')}
        {suffix && <span className="ml-1 text-xs font-normal text-gray-500">{suffix}</span>}
      </span>
      {t('wqs.summary.indicatedValueSubLabel') && (
        <span className="text-[10.5px] text-gray-400">
          {t('wqs.summary.indicatedValueSubLabel')}
        </span>
      )}
    </span>
  );

  // Static muted sub-line (no field to read — a formula explanation, not a value),
  // same shape/placement as roundingHint above. mock:1530/1559 — "= ราคาต่อหน่วย ×
  // เนื้อที่", "= ที่ดิน + ค่าอาคาร".
  const mutedSubLine = (text: string) => (
    <span className="text-[10.5px] text-[#8a96a0]">{text}</span>
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
  // The `className` overrides re-shape the box to the mock's (mock:1612 uses a native
  // `<input type="checkbox">`, so 14px with a 1px border). Two separate problems, both
  // from the shared component's `sm` preset: `h-4 w-4` is rem-based, so at this app's
  // 13px root it renders 13px rather than 16px; and `border-2` eats that 13px box down
  // to a 9px interior, which is what actually reads as heavy next to the mock. Applied
  // here and not in `Checkbox.tsx` because `sizeStyles`/`border-2` are shared by every
  // checkbox in the app — a 1px-border `sm` would silently restyle all of them. The
  // selector is a descendant variant rather than a prop because `className` lands on
  // the outer `Field`: `> span` is the Headless UI control (its default tag), and its
  // only `span` child is the box itself (label/children render into a `div`), so this
  // reaches the box without reaching the tick icon or the text. It also beats the
  // component's own `border-2` on specificity, so no `!` is needed — which matters,
  // since Tailwind v4 would ignore a `!border` prefix anyway.
  const buildingCostCheckbox = (
    <Checkbox
      className="[&>span>span]:h-[14px] [&>span>span]:w-[14px] [&>span>span]:border"
      size="sm"
      checked={!!includeBuildingCost}
      onChange={checked => setValue(hasBuildingCostPath(), checked, { shouldDirty: true })}
    >
      {t('wqs.summary.includeBuildingCost')}
    </Checkbox>
  );

  // Thin wrapper over the shared `<KvRow>` (see KvRow.tsx) so every call site below
  // reads as a function call rather than a JSX element — kept local instead of
  // rewriting all of them to `<KvRow .../>` directly.
  const kvRow = (
    label: React.ReactNode,
    value: React.ReactNode,
    unit?: React.ReactNode,
    hint?: React.ReactNode,
  ) => <KvRow label={label} value={value} unit={unit} hint={hint} />;

  // mock:1588 — `unitRows()`'s lump-sum branch drops the rate and "× area" rows but
  // still emits the method's own Final Value row (the `sub` string built at mock:1649)
  // above the Indicated Value row. Ours dropped that row as well, because all three
  // sites that render it sit behind an `isUnitPrice` gate — so in lump-sum mode the
  // figure reached the screen only as text inside the Indicated Value row's rounding
  // hint, and "Final Value (regression)" — the label that names WHICH arithmetic
  // produced the number, which is the whole reason the user asked for the bracketed
  // qualifier on all three methods — never appeared at all.
  //
  // Nothing new is computed or fetched: this is the same `finalValueFinalValueRounded`
  // read the per-unit branches already show, and in lump-sum mode it is already this
  // card's own upstream — the `_rawLandPrice` rule above copies it straight through
  // when `isUnitPrice` is false, and the Indicated Value row rounds that. Rendered
  // without the "ต่อ{unit}" suffix the per-unit rate row carries: in lump-sum mode the
  // figure is a total, not a rate, so that suffix would be false. `false` whenever a
  // per-unit mode is active, where the three existing sites render their own copy.
  const lumpSumFinalValueRow =
    !isUnitPrice &&
    kvRow(
      t('wqs.summary.finalValueLabel'),
      valueDisplay(finalValueFinalValueRoundedPath()),
      t('wqs.summary.baht'),
    );

  return (
    // Equal-width columns, not a wide primary card + narrow sidebar — the mock's two
    // cards (77/540 and 633/540) are the same width, 16px apart; heights stay
    // content-driven and top-aligned (grid's default item alignment), only the width
    // was wrong before (flex-1 vs a fixed narrow WQSValueRangeCard). `py-[14px]
    // px-[16px]` is `.summary`'s own rule (mock:578: `padding: 14px 16px`) — this
    // div is that class, not a guessed number, and `MethodTabs.tsx`'s shared tab-body
    // wrapper has no horizontal padding of its own for any tab, so this has to carry
    // its own rather than inherit one that doesn't exist (user: "การ์ดแต่ละอันเพิ่ม
    // margin หน่อยคับ อย่าให้ติดขอบบน ซ้าย ขวา").
    <div className="grid grid-cols-2 items-start gap-[16px] py-[14px] px-[16px]">
      {/* Real card, per the user's "ปรับหน้าสรุปให้เป็นการ์ดและมี underline" — mock:579-580.
          `overflow-hidden` is required, not decorative: it's what clips the header
          band's corners to the card's own radius, since the header fills edge to edge
          rather than floating inside the body's padding like it did before. This
          replaces the earlier "no rounded corners" ruling, which was about the
          scoring *tables*, not these summary cards — the user has now asked for
          radius here specifically. */}
      <div className="min-w-0 border border-[#e3e9e8] rounded-[10px] overflow-hidden">
        <h4 className="m-0 px-[12px] py-[8px] text-[12.5px] font-semibold text-gray-800 bg-[#f8fafa] border-b border-[#e3e9e8]">
          {t('wqs.summary.adjustFinalValueTitle')}
        </h4>
        {/* No horizontal padding here any more — each `.kv` row (kvRow below) brings
            its own `px-[12px]` per cell, matching the mock's per-cell rule; adding it
            here too would double the indent. */}
        <div className="flex flex-col text-[12.5px]">
          {/* Price unit — read-only, display only. Same detectedUnit computed above for
          the existing area-label/branch logic; this just surfaces it as a chip
          instead of only feeding it into internal branching. Not a value+unit row —
          the chip stands in for both, so the unit column stays empty. */}
          {kvRow(
            <>
              {t('wqs.summary.priceUnit')}{' '}
              {/* mock:605 — `.kv .l .en { font-size: 10.5px }`. Written as an exact px value,
              not `text-xs`: root font-size here is 13px, so every rem-based utility
              renders at 0.8125x and `text-xs` came out 9.75px, a full 2.75px under the
              mock and visibly smaller than the 12.5px label it sits beside. */}
              <span className="text-gray-400 text-[10.5px]">
                ({t('wqs.summary.priceUnitHint')})
              </span>
            </>,
            // mock:1584 — `pill ok` (teal) whenever a per-unit mode is active, `pill mute`
            // (grey) otherwise; this pill rendered grey in both states. Same treatment and the
            // same `--ok`/`--ok-wash` hexes (mock:39-40) as the Sale Adjustment Grid and
            // Direct Comparison cards now use, which is the whole point: the mock's summary
            // card is one method-agnostic function and the three had drifted apart here.
            // Hexes rather than Tailwind colour names because v4's palette is OKLCH.
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                isUnitPrice ? 'bg-[#f0fdf4] text-[#15803d]' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {unitChipLabel}
            </span>,
          )}
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
          renders nothing between this point and its own Indicated Value row (the rate
          and rounded-rate rows are all `isUnitPrice`-gated), so this lands directly
          above that row in each of them, which is the order the mock has. */}
          {lumpSumFinalValueRow}

          {/* Coefficient of decision moved to the Regression panel (WQSRSQSection) — it's
          the same field/value, this card no longer duplicates it. */}

          {/* ── COST APPROACH, no building cost, unit=01/02 ──
          Three rows: the raw regression output (read-only), the editable rate
          actually used (seeded from it, may be overridden), then Area so the
          "× area" step reads like the formula it is. */}
          {isCostApproach && !includeBuildingCost && isUnitPrice && (
            <>
              {kvRow(
                t('wqs.summary.finalValueLabel'),
                valueDisplay(finalValueFinalValueRoundedPath()),
                t('wqs.summary.baht'),
              )}
              {kvRow(
                t('wqs.summary.rateUsedLabel', { unit: unitAreaLabel }),
                <RHFInputCell
                  fieldName={finalValueAdjustedPath()}
                  inputType="number"
                  number={{
                    decimalPlaces: 2,
                    maxIntegerDigits: 15,
                    maxValue: 999_999_999_999_999.0,
                    allowNegative: false,
                  }}
                  // Grey, borderless input — mock:192-197's `.in` (26px tall in this .kv
                  // context, mock:586). `dense` gives NumberInput's own dense branch the
                  // rest (transparent border, #f6f9f9 fill, hover/focus states); only the
                  // height/font-size differ from that branch's own 21px/12px default.
                  dense
                  inputClassName="h-[26px]! text-[12.5px]! w-full!"
                />,
                t('wqs.summary.baht'),
                // Same seed rule as every other occurrence of this field (line 160) — no
                // rounding of its own, raw and computed are the same read. User found this
                // row missing แก้เอง/revert entirely
                // ("wqs ราคา / ตรว ที่ใช้เวลาแก้ไขยังไม่ขึ้นสถานะและปุ่มให้ใช้ระบบคำนวณ"); this
                // branch and the market-approach one below it had no hint of any kind
                // before, not even the old roundingHint().
                editedBadge(
                  finalValueAdjustedPath(),
                  gv => Number(gv(finalValueFinalValueRoundedPath())) || 0,
                  gv => Number(gv(finalValueFinalValueRoundedPath())) || 0,
                  'wqs.summary.roundingHintHundred',
                ),
              )}
              {kvRow(
                <>
                  <span className="mr-1 text-gray-400">×</span>
                  {areaRowLabel}
                </>,
                valueDisplay(unitAreaPath),
                unitAreaLabel,
              )}
            </>
          )}

          {/* ── COST APPROACH, no building cost, unit=03 (machinery) ──
          No separate "Final Value" input: the rounded "Indicated Value"
          input below writes to BOTH appraisalPrice AND finalValueAdjusted. */}

          {/* ── MARKET APPROACH ──
          Include-area is auto-derived from the comparables' measure unit
          (isUnitPrice = PerSqWa or PerSqm). Same gating as cost approach. */}
          {!isCostApproach && isUnitPrice && (
            <>
              {kvRow(
                t('wqs.summary.finalValueLabel'),
                valueDisplay(finalValueFinalValueRoundedPath()),
                t('wqs.summary.baht'),
              )}
              {kvRow(
                t('wqs.summary.rateUsedLabel', { unit: unitAreaLabel }),
                <RHFInputCell
                  fieldName={finalValueAdjustedPath()}
                  inputType="number"
                  number={{
                    decimalPlaces: 2,
                    maxIntegerDigits: 15,
                    maxValue: 999_999_999_999_999.0,
                    allowNegative: false,
                  }}
                  // Grey, borderless input — mock:192-197's `.in` (26px tall in this .kv
                  // context, mock:586). `dense` gives NumberInput's own dense branch the
                  // rest (transparent border, #f6f9f9 fill, hover/focus states); only the
                  // height/font-size differ from that branch's own 21px/12px default.
                  dense
                  inputClassName="h-[26px]! text-[12.5px]! w-full!"
                />,
                t('wqs.summary.baht'),
                // Same seed rule as every other occurrence of this field (line 160) — no
                // rounding of its own, raw and computed are the same read. User found this
                // row missing แก้เอง/revert entirely
                // ("wqs ราคา / ตรว ที่ใช้เวลาแก้ไขยังไม่ขึ้นสถานะและปุ่มให้ใช้ระบบคำนวณ"); this
                // branch and the market-approach one below it had no hint of any kind
                // before, not even the old roundingHint().
                editedBadge(
                  finalValueAdjustedPath(),
                  gv => Number(gv(finalValueFinalValueRoundedPath())) || 0,
                  gv => Number(gv(finalValueFinalValueRoundedPath())) || 0,
                  'wqs.summary.roundingHintHundred',
                ),
              )}
              {kvRow(
                <>
                  <span className="mr-1 text-gray-400">×</span>
                  {areaRowLabel}
                </>,
                valueDisplay(unitAreaPath),
                unitAreaLabel,
              )}
            </>
          )}

          {/* ── COST APPROACH, no building cost: appraisalPrice input ──
          Mock drops the read-only "Appraisal Price" row here and on the market-approach
          branch below — it duplicated the same _rawLandPrice figure the editable row's
          own diff badge already compares against, so removing it only removes a
          repeated display, not a value. */}
          {isCostApproach && !includeBuildingCost && (
            <>
              {kvRow(
                indicatedValueLabel(),
                <RHFInputCell
                  fieldName={appraisalPricePath()}
                  inputType="number"
                  number={{
                    decimalPlaces: 2,
                    maxIntegerDigits: 15,
                    maxValue: 999_999_999_999_999.0,
                    allowNegative: false,
                  }}
                  // Green — mock:587-589's `.kv .final .in`, the one input in this card the
                  // user asked to keep highlighted ("ยกเว้น มูลค่าตามวิธี ให้คงไว้ตามเดิมแต่ใช้
                  // ฟ้อนเขียวแบบใน mock"). Not `dense` + override like the grey inputs — this
                  // palette (bold text + tinted border + tinted fill, all non-default
                  // colours) has nothing in common with dense's own transparent-border
                  // treatment to reuse, so it's fully specified here instead.
                  inputClassName="bg-[#f0fdfa]! border-[#99f6e4]! text-[#0f766e]! font-bold! text-[12.5px]! h-[26px]! py-0! px-[5px]! rounded-[4px]! w-full!"
                  onUserChange={
                    // For unit 03 (machinery) the rounded appraisal price IS the user's
                    // adjusted final value — sync them so finalValueAdjusted persists too.
                    !isUnitPrice
                      ? (next: any) => {
                          setValue(finalValueAdjustedPath(), next, { shouldDirty: true });
                          return next;
                        }
                      : undefined
                  }
                />,
                t('wqs.summary.baht'),
                editedBadge(appraisalPricePath(), getAppraisalUpstream),
              )}
            </>
          )}

          {/* ── MARKET APPROACH: appraisalPrice editable ── */}
          {!isCostApproach && (
            <>
              {kvRow(
                indicatedValueLabel(),
                <RHFInputCell
                  fieldName={appraisalPricePath()}
                  inputType="number"
                  number={{
                    decimalPlaces: 2,
                    maxIntegerDigits: 15,
                    maxValue: 999_999_999_999_999.0,
                    allowNegative: false,
                  }}
                  // Green — mock:587-589's `.kv .final .in`, same reasoning as the other
                  // two green inputs below.
                  inputClassName="bg-[#f0fdfa]! border-[#99f6e4]! text-[#0f766e]! font-bold! text-[12.5px]! h-[26px]! py-0! px-[5px]! rounded-[4px]! w-full!"
                  onUserChange={
                    // For unit 03 (total price comparables) the rounded appraisal price
                    // IS the user's adjusted final value — sync them on input.
                    !isUnitPrice
                      ? (next: any) => {
                          setValue(finalValueAdjustedPath(), next, { shouldDirty: true });
                          return next;
                        }
                      : undefined
                  }
                />,
                t('wqs.summary.baht'),
                editedBadge(appraisalPricePath(), getAppraisalUpstream),
              )}
            </>
          )}

          {/* ── INCLUDE BUILDING COST CHECKBOX — only when it's OFF.
            When ON, the checkbox is rendered after "Land Price" inside
            the includeBuildingCost section below for better visual grouping.
            mock:1517 — a checkbox, not a toggle switch. */}
          {isCostApproach &&
            !includeBuildingCost &&
            kvRow(
              buildingCostCheckbox,
              // mock:1610 puts this note in the VALUE cell (`<span class="v muted">`), which
              // is where it belongs now that the checkbox has vacated that cell — it used to
              // be the row's `hint` only because the value cell was occupied. Same string,
              // same row, same meaning: unticked, the indicated value is land-only.
              <span className="text-[10.5px] text-[#8a96a0]">
                {t('wqs.summary.includeBuildingCostOff')}
              </span>,
            )}

          {/* ── COST APPROACH, with building cost ──
          Row order is the user's ruling (mock:1512-1559), not a guess: regression
          rate → editable rate (+ rounding hint) → area → editable land value (+
          formula hint) → checkbox → read-only building rollup + link → editable
          indicated value (+ formula hint). The old "ราคาที่ดิน" read-only row, the
          separate "+ ต้นทุนอาคาร" row, the divider and the "ราคาประเมิน" row aren't
          in that list — dropped rather than left in because they weren't asked
          about; nothing here changes what's calculated, only what's shown. */}
          {isCostApproach && includeBuildingCost && (
            <>
              {isUnitPrice &&
                kvRow(
                  t('wqs.summary.finalValueLabel'),
                  valueDisplay(finalValueFinalValueRoundedPath()),
                  t('wqs.summary.baht'),
                )}
              {isUnitPrice &&
                kvRow(
                  t('wqs.summary.rateUsedLabel', { unit: unitAreaLabel }),
                  <RHFInputCell
                    fieldName={finalValueAdjustedPath()}
                    inputType="number"
                    number={{
                      decimalPlaces: 2,
                      maxIntegerDigits: 15,
                      maxValue: 999_999_999_999_999.0,
                      allowNegative: false,
                    }}
                    // Grey, borderless input — see the rate row above for the
                    // dense/override split this reuses.
                    dense
                    inputClassName="h-[26px]! text-[12.5px]! w-full!"
                  />,
                  t('wqs.summary.baht'),
                  // This row's own seed rule (line 160) copies
                  // finalValueFinalValueRoundedPath() verbatim — no rounding of its own,
                  // so raw and computed are the same read, not raw→roundToThousand(raw).
                  // User found this row missing แก้เอง/revert entirely
                  // ("wqs ราคา / ตรว ที่ใช้เวลาแก้ไขยังไม่ขึ้นสถานะและปุ่มให้ใช้ระบบคำนวณ") — it
                  // had only ever had the old roundingHint() with no edited state at all.
                  editedBadge(
                    finalValueAdjustedPath(),
                    gv => Number(gv(finalValueFinalValueRoundedPath())) || 0,
                    gv => Number(gv(finalValueFinalValueRoundedPath())) || 0,
                    'wqs.summary.roundingHintHundred',
                  ),
                )}
              {/* mock:1587-1589 — `unitRows()`'s lump-sum branch emits no "× area" row at all;
              only its per-unit branch does (mock:1592), and `buildingBlock()`
              (mock:1610-1618) adds a toggle, a building-cost row and a total, never an
              area row. Read from the mock, not inferred from the rows around it. Ungated,
              this row rendered in lump-sum mode with no rate above it and no product
              below it — arithmetic on screen whose multiplicand and result are both
              absent, the same defect as the stray "=" on the Indicated Value label. The
              two sibling branches above already gate their own copy of this row the same
              way. Per-unit rendering is unchanged: when `isUnitPrice` is true this emits
              exactly what it emitted before. */}
              {isUnitPrice &&
                kvRow(
                  <>
                    <span className="mr-1 text-gray-400">×</span>
                    {areaRowLabel}
                  </>,
                  valueDisplay(unitAreaPath),
                  unitAreaLabel,
                )}
              {/* mock:1530 — this row reads "มูลค่าที่ดิน" (Land Value) once building cost is
              included, distinct from the "ราคาที่ดิน" (Land Price per unit) row that used
              to sit above it; was reusing that row's key by mistake. */}
              {kvRow(
                <span className="font-semibold text-gray-800">
                  <span className="mr-1 text-gray-400">=</span>
                  {t('wqs.summary.landValueLabel')}
                </span>,
                <RHFInputCell
                  fieldName={landValuePath()}
                  inputType="number"
                  number={{
                    decimalPlaces: 2,
                    maxIntegerDigits: 15,
                    maxValue: 999_999_999_999_999.0,
                    allowNegative: false,
                  }}
                  // Grey, borderless input — see the rate row above for the
                  // dense/override split this reuses.
                  dense
                  inputClassName="h-[26px]! text-[12.5px]! w-full!"
                />,
                t('wqs.summary.baht'),
                editedBadge(
                  landValuePath(),
                  getValues => Number(getValues('WQSFinalValue._rawLandPrice')) || 0,
                  undefined,
                  undefined,
                  mutedSubLine(t('wqs.summary.landValueFormulaHint')),
                ),
              )}

              {/* Ticked: mock:1610's value cell is empty on this branch — the "ไม่รวม …" note
              only exists to explain the unticked state. */}
              {kvRow(buildingCostCheckbox, null)}

              {/* Read-only rollup + link, replacing the inline RCN/depreciation table —
              user's call once shown the mock side by side ("เอาตัวตาราง cost ออกได้แล้ว
              เป็นลิ้งไปเปิด cost แทนตามใน mock เลย", mock:1558). The number itself is
              unchanged — same `buildingCostPath()` the table used to feed via the
              useEffect above, itself a live sum of the same building properties'
              `depreciationDetails` the Building Cost method screen
              (`CostBuildingPanel.tsx`) computes its own total from, so nothing here is
              a value that only existed in the table. The link stacks under the value as
              this row's hint instead of its own row, same `.vf`/`.ovh` shape as the
              edited-badge rows. */}
              {kvRow(
                <span className="pl-3">
                  {t('wqs.summary.buildingCostFromLabel', { count: buildingCost?.length ?? 0 })}
                </span>,
                valueDisplay(buildingCostPath()),
                t('wqs.summary.baht'),
                // Now a working link. It renders nothing when the group has no Building Cost
                // method — there would be nowhere to go, and the row is showing its fallback
                // roll-up in that case.
                <BuildingCostLink
                  labelKey="wqs.summary.editAtBuildingCost"
                  confirmMessageKey="wqs.summary.leaveUnsaved"
                />,
              )}

              {kvRow(
                indicatedValueLabel(t('wqs.summary.includeBuildingSuffix')),
                <RHFInputCell
                  fieldName={appraisalPricePath()}
                  inputType="number"
                  number={{
                    decimalPlaces: 2,
                    maxIntegerDigits: 15,
                    maxValue: 999_999_999_999_999.0,
                    allowNegative: false,
                  }}
                  // Green — mock:587-589's `.kv .final .in`, same reasoning as the other
                  // two green inputs above.
                  inputClassName="bg-[#f0fdfa]! border-[#99f6e4]! text-[#0f766e]! font-bold! text-[12.5px]! h-[26px]! py-0! px-[5px]! rounded-[4px]! w-full!"
                />,
                t('wqs.summary.baht'),
                editedBadge(
                  appraisalPricePath(),
                  getAppraisalUpstream,
                  undefined,
                  undefined,
                  mutedSubLine(t('wqs.summary.indicatedValueFormulaHint')),
                ),
              )}
            </>
          )}
        </div>
      </div>
      <WQSValueRangeCard />
    </div>
  );
};
