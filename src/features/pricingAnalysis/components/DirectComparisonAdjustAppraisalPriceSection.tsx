import { Icon } from '@/shared/components';
import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import {
  useDerivedFields,
  type DerivedFieldRule,
} from '@features/pricingAnalysis/adapters/useDerivedFieldArray.tsx';
import { directComparisonPath } from '@features/pricingAnalysis/adapters/directComparisonFieldPath.ts';
import { useEffect, useMemo, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { floorToTenThousands, roundToThousand } from '../domain/calculateDirectComparison';
import { BuildingCostTable } from './BuildingCostTable';

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
    finalValue: finalValuePath,
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

  const { control, setValue } = useFormContext();

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

  const isUnitPrice = detectedUnit === '01' || detectedUnit === '02';
  const unitAreaPath = detectedUnit === '02' ? usableAreaPath() : landAreaPath();
  const unitAreaLabel = detectedUnit === '02' ? 'Sq.M' : 'Sq.Wa';

  // Auto-derive includeLandArea from the comparables' measure unit.
  useEffect(() => {
    setValue(includeLandAreaPath(), isUnitPrice, { shouldDirty: false });
  }, [isUnitPrice, setValue, includeLandAreaPath]);

  const rules: DerivedFieldRule[] = [
    {
      // Seed rule: re-seed finalValueAdjusted from finalValueRounded only when upstream changes.
      targetPath: finalValueAdjustedPath(),
      deps: [finalValueRoundedPath()],
      when: ({ getValues: gv }) => {
        const rounded = Number(gv(finalValueRoundedPath())) || 0;
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
      compute: ({ getValues: gv }) => Number(gv(finalValueRoundedPath())) || 0,
    },
    {
      // Unit-aware: 01/02 → finalValueAdjusted × area; other → finalValue (auto-computed)
      targetPath: appraisalPricePath(),
      deps: [finalValueAdjustedPath(), finalValuePath(), unitAreaPath],
      compute: ({ getValues: gv }) => {
        const fvAdj = Number(gv(finalValueAdjustedPath())) || 0;
        const fv = Number(gv(finalValuePath())) || 0;
        const area = Number(gv(unitAreaPath)) || 0;
        return isUnitPrice && area ? roundToThousand(fvAdj * area) : roundToThousand(fv);
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
      compute: ({ getValues: gv }) =>
        floorToTenThousands(Number(gv(appraisalPricePath())) || 0),
      when: ({ getValues: gv }) => {
        const depValue = Number(gv(appraisalPricePath())) || 0;
        const current = Number(gv(appraisalPriceRoundedPath())) || 0;

        if (prevAppraisalPriceRef.current === null) {
          prevAppraisalPriceRef.current = depValue;
          return current === 0;
        }

        if (prevAppraisalPriceRef.current !== depValue) {
          prevAppraisalPriceRef.current = depValue;
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
        Number(gv(appraisalPriceIncludeBuildingCostPath())) || 0,
      when: ({ getValues: gv }) => {
        const depValue = Number(gv(appraisalPriceIncludeBuildingCostPath())) || 0;
        const current = Number(gv(appraisalPriceIncludeBuildingCostRoundedPath())) || 0;

        if (prevValueIncludeCostRef.current === null) {
          prevValueIncludeCostRef.current = depValue;
          return current === 0;
        }

        if (prevValueIncludeCostRef.current !== depValue) {
          prevValueIncludeCostRef.current = depValue;
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

  useEffect(() => {
    if (!buildingCost?.length) {
      setValue(totalBuildingCostPath(), 0, { shouldDirty: false });
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

        // Pass 1: compute priceBeforeDepreciation and priceDepreciation
        const priceBeforeDepreciation =
          toNum(row['area']) * toNum(row['pricePerSqMBeforeDepreciation']);

        const periods: any[] = row['depreciationPeriods'] ?? [];
        const priceDepreciation = periods.reduce(
          (acc: number, b: any) => acc + toNum(b.priceDepreciation),
          0,
        );

        // Pass 2: priceAfterDepreciation = before - depreciation
        const priceAfterDepreciation = priceBeforeDepreciation - priceDepreciation;
        grandTotal += priceAfterDepreciation;
      }
    }

    setValue(totalBuildingCostPath(), grandTotal, { shouldDirty: false });
  }, [buildingCost, totalBuildingCostPath, setValue]);

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

      {/* ── MARKET APPROACH ── */}
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

      {/* Market approach: Appraisal Price computed display */}
      {!isCostApproach && (
        <div className="flex items-center gap-4">
          <span className="w-48 shrink-0 text-gray-500">Appraisal Price</span>
          {valueDisplay(appraisalPricePath())}
          <span className="text-gray-500">Baht</span>
        </div>
      )}

      {/* ── COST APPROACH, no building cost: Appraisal Price display + rounded input ── */}
      {isCostApproach && !includeBuildingCost && (
        <>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 text-gray-500">Appraisal Price</span>
            {valueDisplay(appraisalPricePath())}
            <span className="text-gray-500">Baht</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 font-semibold text-gray-800">
              Appraisal Price
              <span className="ml-1 text-xs font-normal text-gray-400">(rounded)</span>
            </span>
            <div className="w-40">
              <RHFInputCell
                fieldName={appraisalPriceRoundedPath()}
                inputType="number"
                number={{ decimalPlaces: 2, maxIntegerDigits: 15, maxValue: 999_999_999_999_999.0, allowNegative: false }}
                onUserChange={
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
            {diffBadge(priceDifferentiatePath())}
          </div>
        </>
      )}

      {/* ── MARKET APPROACH: Appraisal Price rounded input ── */}
      {!isCostApproach && (
        <div className="flex items-center gap-4">
          <span className="w-48 shrink-0 font-semibold text-gray-800">
            Appraisal Price
            <span className="ml-1 text-xs font-normal text-gray-400">(rounded)</span>
          </span>
          <div className="w-40">
            <RHFInputCell
              fieldName={appraisalPriceRoundedPath()}
              inputType="number"
              number={{ decimalPlaces: 2, maxIntegerDigits: 15, maxValue: 999_999_999_999_999.0, allowNegative: false }}
              onUserChange={
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
          {diffBadge(priceDifferentiatePath())}
        </div>
      )}

      {/* ── INCLUDE BUILDING COST TOGGLE — only when toggle is OFF ── */}
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
            {valueDisplay(appraisalPricePath())}
            <span className="text-gray-500">Baht</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 font-semibold text-gray-800">
              Land Price
              <span className="ml-1 text-xs font-normal text-gray-400">(rounded)</span>
            </span>
            <div className="w-40">
              <RHFInputCell
                fieldName={appraisalPriceRoundedPath()}
                inputType="number"
                number={{ decimalPlaces: 2, maxIntegerDigits: 15, maxValue: 999_999_999_999_999.0, allowNegative: false }}
              />
            </div>
            <span className="text-gray-500">Baht</span>
            {diffBadge(priceDifferentiatePath())}
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
            {valueDisplay(totalBuildingCostPath())}
            <span className="text-gray-500">Baht</span>
          </div>
          <div className="border-t border-gray-200 -mx-1" />
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 text-gray-500">Appraisal Price</span>
            {valueDisplay(appraisalPriceIncludeBuildingCostPath())}
            <span className="text-gray-500">Baht</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-48 shrink-0 font-semibold text-gray-800">
              Appraisal Price
              <span className="ml-1 text-xs font-normal text-gray-400">(rounded)</span>
            </span>
            <div className="w-40">
              <RHFInputCell
                fieldName={appraisalPriceIncludeBuildingCostRoundedPath()}
                inputType="number"
                number={{ decimalPlaces: 2, maxIntegerDigits: 15, maxValue: 999_999_999_999_999.0, allowNegative: false }}
              />
            </div>
            <span className="text-gray-500">Baht</span>
            {diffBadge(priceIncludeBuildingCostDifferentiatePath())}
          </div>
        </>
      )}
    </div>
  );
}
