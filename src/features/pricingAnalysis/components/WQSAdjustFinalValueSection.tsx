import { useEffect, useMemo, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Icon } from '@/shared/components';
import { RHFInputCell } from './table/RHFInputCell';
import { wqsFieldPath } from '../adapters/wqsFieldPath';
import {
  floorToThousands,
  toFiniteNumber,
} from '@features/pricingAnalysis/domain/calculateWQS.ts';
import {
  type DerivedFieldRule,
  useDerivedFields,
} from '@features/pricingAnalysis/adapters/useDerivedFieldArray.tsx';
import { BuildingCostTable } from './BuildingCostTable';

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
    finalValueCoefficientOfDecision: coeffPath,
    finalValueIncludeLandArea: includeLandAreaPath,
    finalValueHasBuildingCost: hasBuildingCostPath,
    finalValueLandArea: landAreaPath,
    finalValueUsableArea: usableAreaPath,
    finalValueFinalValueAdjusted: finalValueAdjustedPath,
    finalValueFinalValue: finalValueFinalValuePath,
    finalValueFinalValueRounded: finalValueFinalValueRoundedPath,
    finalValueLandValue: landValuePath,
    finalValueBuildingCost: buildingCostPath,
    finalValueAppraisalPrice: appraisalPricePath,
  } = wqsFieldPath;

  const { control, setValue } = useFormContext();
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

  const isUnitPrice = detectedUnit === '01' || detectedUnit === '02'; // per Sq.Wa or per Sq.m
  const unitAreaPath = detectedUnit === '02' ? usableAreaPath() : landAreaPath();
  const unitAreaLabel = detectedUnit === '02' ? 'Sq.m' : 'Sq.Wa';

  // The "Include Area" toggle is auto-derived from the comparables' measure unit
  // (01/02 → land area applies; 03 → total price, no area). Keeps the form field
  // populated so the backend persists the right value, even though the UI no longer
  // exposes a manual toggle.
  useEffect(() => {
    setValue(includeLandAreaPath(), isUnitPrice, { shouldDirty: false });
  }, [isUnitPrice, setValue, includeLandAreaPath]);

  // Sync buildingCost from the BuildingCostTable computation into the form field
  useEffect(() => {
    if (!buildingCost?.length) {
      setValue(buildingCostPath(), 0, { shouldDirty: false });
      return;
    }

    const toNum = (v: any): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    let grandTotal = 0;

    for (const building of buildingCost) {
      const rawRows: any[] = (building.depreciationDetails as any[]) ?? [];

      for (let rowIndex = 0; rowIndex < rawRows.length; rowIndex++) {
        const row = { ...rawRows[rowIndex] };

        const priceBeforeDepreciation =
          toNum(row['area']) * toNum(row['pricePerSqMBeforeDepreciation']);

        const periods: any[] = row['depreciationPeriods'] ?? [];
        const priceDepreciation = periods.reduce(
          (acc: number, b: any) => acc + toNum(b.priceDepreciation),
          0,
        );

        const priceAfterDepreciation = priceBeforeDepreciation - priceDepreciation;
        grandTotal += priceAfterDepreciation;
      }
    }

    setValue(buildingCostPath(), grandTotal, { shouldDirty: false });
  }, [buildingCost, buildingCostPath, setValue]);

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
      // finalValueAdjusted: re-seed from finalValueRounded only when it actually changes.
      // Lives here (rather than in buildWQSDerivedRules) so it shares the ref-guard
      // pattern with landValue/appraisalPrice; otherwise reset(value) and rule-array
      // re-creation after save would clobber the user's saved override.
      targetPath: finalValueAdjustedPath(),
      deps: [finalValueFinalValueRoundedPath()],
      when: ({ getValues }) => {
        const rounded = Number(getValues(finalValueFinalValueRoundedPath())) || 0;
        if (prevFinalValueRoundedRef.current === null) {
          prevFinalValueRoundedRef.current = rounded;
          return false;
        }
        if (prevFinalValueRoundedRef.current !== rounded) {
          prevFinalValueRoundedRef.current = rounded;
          return true;
        }
        return false;
      },
      compute: ({ getValues }) => Number(getValues(finalValueFinalValueRoundedPath())) || 0,
    },
    {
      // rawLandPrice: computed display value (not stored). Same logic for cost and market.
      // unit 01/02 (per-unit price): finalValueAdjusted × matchingArea
      // unit 03 (total price):       finalValue (RSQ result; user's rounded total is
      //                              bound to appraisalPrice and synced to finalValueAdjusted)
      targetPath: 'WQSFinalValue._rawLandPrice',
      deps: [finalValueAdjustedPath(), finalValueFinalValuePath(), rawLandPriceAreaPath],
      compute: ({ getValues }) => {
        const fvAdj = Number(getValues(finalValueAdjustedPath())) || 0;
        const fv = Number(getValues(finalValueFinalValuePath())) || 0;
        const area = Number(getValues(rawLandPriceAreaPath)) || 0;
        return isUnitPrice && area ? floorToThousands(fvAdj * area) : fv;
      },
    },
    {
      // landValue: re-seed from rawLandPrice only when rawLandPrice actually changes.
      // The ref-based guard is required because landValue is a dep of _totalPrice/_landDiff,
      // so the effect re-runs when the user types here; without the guard the seed
      // would overwrite the user's edit.
      targetPath: landValuePath(),
      deps: ['WQSFinalValue._rawLandPrice'],
      when: ({ getValues }) => {
        const rawPrice = Number(getValues('WQSFinalValue._rawLandPrice')) || 0;
        if (prevRawLandPriceRef.current === null) {
          prevRawLandPriceRef.current = rawPrice;
          return false;
        }
        if (prevRawLandPriceRef.current !== rawPrice) {
          prevRawLandPriceRef.current = rawPrice;
          return true;
        }
        return false;
      },
      compute: ({ getValues }) => Number(getValues('WQSFinalValue._rawLandPrice')) || 0,
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
      targetPath: appraisalPricePath(),
      deps: ['WQSFinalValue._totalPrice', 'WQSFinalValue._rawLandPrice', hasBuildingCostPath()],
      when: ({ getValues }) => {
        const upstream = getAppraisalUpstream(getValues);
        if (prevTotalPriceRef.current === null) {
          prevTotalPriceRef.current = upstream;
          return false;
        }
        if (prevTotalPriceRef.current !== upstream) {
          prevTotalPriceRef.current = upstream;
          return true;
        }
        return false;
      },
      compute: ({ getValues }) => getAppraisalUpstream(getValues),
    },
    {
      // appraisalDiff: appraisalPrice − upstream (negative = user rounded down).
      targetPath: 'WQSFinalValue._appraisalDiff',
      deps: ['WQSFinalValue._totalPrice', 'WQSFinalValue._rawLandPrice', appraisalPricePath(), hasBuildingCostPath()],
      compute: ({ getValues }) => {
        const upstream = getAppraisalUpstream(getValues);
        const appraisalVal = Number(getValues(appraisalPricePath())) || 0;
        return appraisalVal - upstream;
      },
    },
  ];
  useDerivedFields({ rules });

  const diffBadge = (fieldPath: string) => (
    <RHFInputCell
      fieldName={fieldPath}
      inputType="display"
      accessor={({ value }) => {
        const num = Number(value) || 0;
        if (num === 0) return <span />;
        const color = num > 0 ? 'text-green-600' : 'text-red-500';
        const bgColor = num > 0 ? 'bg-green-50' : 'bg-red-50';
        const icon = num > 0 ? 'arrow-up' : 'arrow-down';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} ${bgColor}`}
          >
            <Icon name={icon} style="solid" className="size-3" />
            {Math.abs(num).toLocaleString()}
          </span>
        );
      }}
    />
  );

  const valueDisplay = (fieldPath: string) => (
    <div className="w-40 text-right">
      <RHFInputCell
        fieldName={fieldPath}
        inputType="display"
        accessor={({ value }) => (
          <span className="font-semibold text-gray-800 tabular-nums">
            {value ? Number(value).toLocaleString() : '0'}
          </span>
        )}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-3 text-sm">

      {/* Coefficient of decision */}
      <div className="flex items-center gap-4">
        <span className="w-48 shrink-0 text-gray-500">Coefficient of decision</span>
        <RHFInputCell
          fieldName={coeffPath()}
          inputType="display"
          accessor={({ value }) => {
            const coeff = toFiniteNumber(value);
            return coeff < 0.85 ? (
              <span className="inline-flex items-center gap-2">
                <span className="font-semibold text-red-500">{value}</span>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-500">
                  Low — review market survey data
                </span>
              </span>
            ) : (
              <span className="font-semibold text-gray-800">{value}</span>
            );
          }}
        />
      </div>

      {/* ── COST APPROACH, no building cost, unit=01/02 ── */}
      {isCostApproach && !includeBuildingCost && isUnitPrice && (
        <>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 text-gray-500">Final Value</span>
            <div className="w-40">
              <RHFInputCell
                fieldName={finalValueAdjustedPath()}
                inputType="number"
                number={{ decimalPlaces: 2, maxIntegerDigits: 15, maxValue: 999_999_999_999_999.0, allowNegative: false }}
              />
            </div>
            <span className="text-gray-500">Baht/{unitAreaLabel}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 text-gray-500">Area</span>
            {valueDisplay(unitAreaPath)}
            <span className="text-gray-500">{unitAreaLabel}</span>
          </div>
        </>
      )}

      {/* ── COST APPROACH, no building cost, unit=03 (machinery) ──
          No separate "Final Value" input: the rounded "Appraisal Price (rounded)"
          input below writes to BOTH appraisalPrice AND finalValueAdjusted. */}

      {/* ── MARKET APPROACH ──
          Include-area is auto-derived from the comparables' measure unit
          (isUnitPrice = unit 01 or 02). Same gating as cost approach. */}
      {!isCostApproach && isUnitPrice && (
        <>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 text-gray-500">Final Value</span>
            <div className="w-40">
              <RHFInputCell
                fieldName={finalValueAdjustedPath()}
                inputType="number"
                number={{ decimalPlaces: 2, maxIntegerDigits: 15, maxValue: 999_999_999_999_999.0, allowNegative: false }}
              />
            </div>
            <span className="text-gray-500">Baht/{unitAreaLabel}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 text-gray-500">Area</span>
            {valueDisplay(unitAreaPath)}
            <span className="text-gray-500">{unitAreaLabel}</span>
          </div>
        </>
      )}
      {/* Market approach: rawLandPrice computed row */}
      {!isCostApproach && (
        <div className="flex items-center gap-4">
          <span className="w-48 shrink-0 text-gray-500">
            Appraisal Price{isUnitPrice ? '' : ' (RSQ)'}
          </span>
          {valueDisplay('WQSFinalValue._rawLandPrice')}
          <span className="text-gray-500">Baht</span>
        </div>
      )}

      {/* ── COST APPROACH, no building cost: Appraisal Price display + appraisalPrice input ── */}
      {isCostApproach && !includeBuildingCost && (
        <>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 text-gray-500">Appraisal Price</span>
            {valueDisplay('WQSFinalValue._rawLandPrice')}
            <span className="text-gray-500">Baht</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 font-semibold text-gray-800">
              Appraisal Price
              <span className="ml-1 text-xs font-normal text-gray-400">(rounded)</span>
            </span>
            <div className="w-40">
              <RHFInputCell
                fieldName={appraisalPricePath()}
                inputType="number"
                number={{ decimalPlaces: 2, maxIntegerDigits: 15, maxValue: 999_999_999_999_999.0, allowNegative: false }}
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
              />
            </div>
            <span className="text-gray-500">Baht</span>
            {diffBadge('WQSFinalValue._appraisalDiff')}
          </div>
        </>
      )}

      {/* ── MARKET APPROACH: appraisalPrice editable ── */}
      {!isCostApproach && (
        <div className="flex items-center gap-4">
          <span className="w-48 shrink-0 font-semibold text-gray-800">
            Appraisal Price
            <span className="ml-1 text-xs font-normal text-gray-400">(rounded)</span>
          </span>
          <div className="w-40">
            <RHFInputCell
              fieldName={appraisalPricePath()}
              inputType="number"
              number={{ decimalPlaces: 2, maxIntegerDigits: 15, maxValue: 999_999_999_999_999.0, allowNegative: false }}
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
            />
          </div>
          <span className="text-gray-500">Baht</span>
          {diffBadge('WQSFinalValue._appraisalDiff')}
        </div>
      )}

      {/* ── INCLUDE BUILDING COST TOGGLE — only when toggle is OFF.
            When ON, the toggle is rendered after "Land Price (rounded)" inside
            the includeBuildingCost section below for better visual grouping. */}
      {isCostApproach && !includeBuildingCost && (
        <div className="flex items-center gap-4">
          <span className="w-48 shrink-0 text-gray-500">Include building cost</span>
          <RHFInputCell
            fieldName={hasBuildingCostPath()}
            inputType="toggle"
            toggle={{ checked: includeBuildingCost, options: ['No', 'Yes'] }}
          />
        </div>
      )}

      {/* ── COST APPROACH, with building cost ── */}
      {isCostApproach && includeBuildingCost && (
        <>
          {isUnitPrice && (
            <div className="flex items-center gap-4">
              <span className="w-48 shrink-0 text-gray-500">Price/{unitAreaLabel}</span>
              <div className="w-40">
                <RHFInputCell
                  fieldName={finalValueAdjustedPath()}
                  inputType="number"
                  number={{ decimalPlaces: 2, maxIntegerDigits: 15, maxValue: 999_999_999_999_999.0, allowNegative: false }}
                />
              </div>
              <span className="text-gray-500">Baht/{unitAreaLabel}</span>
            </div>
          )}
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 text-gray-500">Area</span>
            {valueDisplay(unitAreaPath)}
            <span className="text-gray-500">{unitAreaLabel}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 text-gray-500">Land Price</span>
            {valueDisplay('WQSFinalValue._rawLandPrice')}
            <span className="text-gray-500">Baht</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 font-semibold text-gray-800">
              Land Price
              <span className="ml-1 text-xs font-normal text-gray-400">(rounded)</span>
            </span>
            <div className="w-40">
              <RHFInputCell
                fieldName={landValuePath()}
                inputType="number"
                number={{ decimalPlaces: 2, maxIntegerDigits: 15, maxValue: 999_999_999_999_999.0, allowNegative: false }}
              />
            </div>
            <span className="text-gray-500">Baht</span>
            {diffBadge('WQSFinalValue._landDiff')}
          </div>

          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 text-gray-500">Include building cost</span>
            <RHFInputCell
              fieldName={hasBuildingCostPath()}
              inputType="toggle"
              toggle={{ checked: includeBuildingCost, options: ['No', 'Yes'] }}
            />
          </div>

          <BuildingCostTable buildingCost={buildingCost ?? []} />

          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 text-gray-500">
              <span className="mr-1 text-gray-400">+</span>Building Cost
            </span>
            {valueDisplay(buildingCostPath())}
            <span className="text-gray-500">Baht</span>
          </div>
          <div className="border-t border-gray-200 -mx-1" />
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 text-gray-500">Appraisal Price</span>
            {valueDisplay('WQSFinalValue._totalPrice')}
            <span className="text-gray-500">Baht</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 font-semibold text-gray-800">
              Appraisal Price
              <span className="ml-1 text-xs font-normal text-gray-400">(rounded)</span>
            </span>
            <div className="w-40">
              <RHFInputCell
                fieldName={appraisalPricePath()}
                inputType="number"
                number={{ decimalPlaces: 2, maxIntegerDigits: 15, maxValue: 999_999_999_999_999.0, allowNegative: false }}
              />
            </div>
            <span className="text-gray-500">Baht</span>
            {diffBadge('WQSFinalValue._appraisalDiff')}
          </div>
        </>
      )}
    </div>
  );
};
