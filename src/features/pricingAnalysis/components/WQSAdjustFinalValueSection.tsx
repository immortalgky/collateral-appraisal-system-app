import { useContext, useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Icon } from '@/shared/components';
import { RHFInputCell } from './table/RHFInputCell';
import { wqsFieldPath } from '../adapters/wqsFieldPath';
import {
  floorToThousands,
  round2,
  toFiniteNumber,
} from '@features/pricingAnalysis/domain/calculateWQS.ts';
import {
  type DerivedFieldRule,
  useDerivedFields,
} from '@features/pricingAnalysis/adapters/useDerivedFieldArray.tsx';
import { ServerDataCtx } from '../store/selectionContext';
import { deriveGroupCollateralType } from '../domain/deriveGroupCollateralType';
import { BuildingCostTable } from './BuildingCostTable';

interface AdjustFinalValueSectionProp {
  property: Record<string, unknown>;
  buildingCost?: Record<string, unknown>[];
  isCostApproach: boolean;
}

export const AdjustFinalValueSection = ({
  property,
  buildingCost,
  isCostApproach,
}: AdjustFinalValueSectionProp) => {
  const {
    finalValueCoefficientOfDecision: coeffPath,
    finalValueIncludeLandArea: includeLandAreaPath,
    finalValueHasBuildingCost: hasBuildingCostPath,
    finalValueLandArea: landAreaPath,
    finalValueUsableArea: usableAreaPath,
    finalValueFinalValueRounded: finalValueRoundedPath,
    finalValueAppraisalPrice: finalValueAppraisalPricePath,
    finalValueAppraisalPriceRounded: appraisalPriceRoundedPath,
    finalValuePriceDifferentiate: priceDifferentiatePath,
    finalValueTotalBuildingCost: totalBuildingCostPath,
    finalValueAppraisalPriceIncludeBuildingCost: appraisalPriceIncludeBuildingCostPath,
    finalValueAppraisalPriceIncludeBuildingCostRounded:
      appraisalPriceIncludeBuildingCostRoundedPath,
    finalValuePriceIncludeBuildingCostDifferentiate: priceIncludeBuildingCostDifferentiatePath,
  } = wqsFieldPath;

  const { control, setValue } = useFormContext();
  const includeLandArea = useWatch({ control, name: includeLandAreaPath() });
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

  // Track previous finalValueRounded to detect actual changes.
  // On initial load: preserve saved appraisalPriceRounded (auto-fill only if 0).
  // After initial load: always auto-default when finalValueRounded changes.
  const prevFinalValueRef = useRef<number | null>(null);
  const prevValueIncludeCostRef = useRef<number | null>(null);

  const rules: DerivedFieldRule[] = [
    {
      targetPath: finalValueAppraisalPricePath(),
      deps: [finalValueRoundedPath()],
      compute: ({ getValues }) => {
        const finalValueRounded = getValues(finalValueRoundedPath()) ?? 0;

        const isIncludeLandArea = getValues(includeLandAreaPath());
        const landArea = getValues(landAreaPath());
        if (isIncludeLandArea && !!landArea) {
          return floorToThousands(finalValueRounded * (landArea ?? 0));
        }

        const usableArea = getValues(usableAreaPath());
        if (isIncludeLandArea && !!usableArea) {
          return floorToThousands(finalValueRounded * (usableArea ?? 0));
        }

        return finalValueRounded;
      },
    },
    {
      targetPath: appraisalPriceRoundedPath(),
      deps: [finalValueAppraisalPricePath()],
      compute: ({ getValues }) => Number(getValues(finalValueAppraisalPricePath())) || 0,
      when: ({ getValues }) => {
        const depValue = Number(getValues(finalValueAppraisalPricePath())) || 0;
        const current = Number(getValues(appraisalPriceRoundedPath())) || 0;

        if (prevFinalValueRef.current === null) {
          prevFinalValueRef.current = depValue;
          return current === 0;
        }

        if (prevFinalValueRef.current !== depValue) {
          prevFinalValueRef.current = depValue;
          return true;
        }

        return false;
      },
    },
    {
      targetPath: priceDifferentiatePath(),
      deps: [appraisalPriceRoundedPath(), finalValueAppraisalPricePath()],
      compute: ({ getValues }) => {
        const appraisalPriceRounded = getValues(appraisalPriceRoundedPath()) ?? 0;
        const finalValueRounded = getValues(finalValueAppraisalPricePath()) ?? 0;
        return appraisalPriceRounded - finalValueRounded;
      },
    },
    {
      targetPath: appraisalPriceIncludeBuildingCostPath(),
      deps: [appraisalPriceRoundedPath(), totalBuildingCostPath()],
      compute: ({ getValues }) => {
        const landPrice = Number(getValues(appraisalPriceRoundedPath())) || 0;
        const buildingCost = Number(getValues(totalBuildingCostPath())) || 0;
        return landPrice + buildingCost;
      },
    },
    {
      targetPath: appraisalPriceIncludeBuildingCostRoundedPath(),
      deps: [appraisalPriceIncludeBuildingCostPath()],
      compute: ({ getValues }) => Number(getValues(appraisalPriceIncludeBuildingCostPath())) || 0,
      when: ({ getValues }) => {
        const depValue = Number(getValues(appraisalPriceIncludeBuildingCostPath())) || 0;
        const current = Number(getValues(appraisalPriceIncludeBuildingCostRoundedPath())) || 0;

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
      compute: ({ getValues }) => {
        const appraisalPriceRounded =
          getValues(appraisalPriceIncludeBuildingCostRoundedPath()) ?? 0;
        const finalValueRounded = getValues(appraisalPriceIncludeBuildingCostPath()) ?? 0;
        return appraisalPriceRounded - finalValueRounded;
      },
    },
  ];
  useDerivedFields({ rules });

  const serverData = useContext(ServerDataCtx);
  const groupCollateralType = deriveGroupCollateralType(serverData?.groupDetail?.properties ?? []);

  const isLand = groupCollateralType === 'L';
  const isUsable = groupCollateralType === 'U';
  const areaUnit = isLand ? 'Sq. Wa' : 'Sq. m.';
  const areaFieldPath = isLand ? landAreaPath() : usableAreaPath();

  return (
    <div className="flex flex-col gap-3 text-sm">
      {/* Coefficient of decision */}
      <div className="flex items-center gap-4">
        <span className="w-48 text-gray-500">Coefficient of decision</span>
        <RHFInputCell
          fieldName={coeffPath()}
          inputType="display"
          accessor={({ value }) => {
            const coeff = toFiniteNumber(value);
            return coeff < 0.85 ? (
              <div className="flex items-center gap-4 text-danger">
                <span className="font-medium">{value}</span>
                <span className="text-xs">{'Consider for the market survey data'}</span>
              </div>
            ) : (
              <span className="font-medium text-gray-800">{value}</span>
            );
          }}
        />
      </div>

      {/* Include Area toggle */}
      {(isLand || isUsable) && (
        <div className="flex items-center gap-4">
          <span className="w-48 text-gray-500">Include Area</span>
          <RHFInputCell
            fieldName={includeLandAreaPath()}
            inputType="toggle"
            toggle={{ checked: includeLandArea, options: ['No', 'Yes'] }}
          />
        </div>
      )}

      {/* Area (shown when include area is on) */}
      {includeLandArea && (isLand || isUsable) && (
        <div className="flex items-center gap-4">
          <span className="w-48 text-gray-500">Area</span>
          <span className="font-medium text-gray-800">
            <RHFInputCell
              fieldName={areaFieldPath}
              inputType="display"
              accessor={({ value }) => (value ? Number(value).toLocaleString() : '0')}
            />
          </span>
          <span className="text-gray-500">{areaUnit}</span>
        </div>
      )}

      {/* Final Value (Rounded) */}
      <div className="flex items-center gap-4">
        <span className="w-48 text-gray-500">
          Final Value (Rounded) {includeLandArea ? 'x Area' : ''}
        </span>
        <span className="font-medium text-gray-800">
          <RHFInputCell
            fieldName={finalValueAppraisalPricePath()}
            inputType="display"
            accessor={({ value }) => (value ? Number(value).toLocaleString() : '0')}
          />
        </span>
        <span className="text-gray-500">Baht</span>
      </div>

      {/* Appraisal Price */}
      <div className="flex items-center gap-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 -mx-4">
        <span className="w-48 shrink-0 font-semibold text-gray-800">Appraisal Price</span>
        <div className="w-40">
          <RHFInputCell
            fieldName={appraisalPriceRoundedPath()}
            inputType="number"
            number={{
              decimalPlaces: 2,
              maxIntegerDigits: 15,
              maxValue: 999_999_999_999_999.0,
              allowNegative: false,
            }}
          />
        </div>
        <span className="text-gray-500">Baht</span>
        <div className="flex items-center">
          <RHFInputCell
            fieldName={priceDifferentiatePath()}
            inputType="display"
            accessor={({ value }) => {
              const num = Number(value) || 0;
              if (num === 0) return <span className="text-gray-400"></span>;
              const color = num > 0 ? 'text-green-600' : 'text-red-600';
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
        </div>
      </div>

      {/* Include building cost toggle */}
      {isCostApproach && (
        <div className="flex items-center gap-4">
          <span className="w-48 text-gray-500">Include building cost</span>
          <RHFInputCell
            fieldName={hasBuildingCostPath()}
            inputType="toggle"
            toggle={{ checked: includeBuildingCost, options: ['No', 'Yes'] }}
          />
        </div>
      )}

      {includeBuildingCost && isCostApproach && (
        <div className="flex flex-col gap-3 text-sm">
          <div className="">
            {includeBuildingCost && (
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <BuildingCostTable buildingCost={buildingCost ?? []} />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="w-48 text-gray-500">Land Price</span>
            <span className="font-medium text-gray-800">
              <RHFInputCell
                fieldName={appraisalPriceRoundedPath()}
                inputType="display"
                accessor={({ value }) => (value ? Number(value).toLocaleString() : '0')}
              />
            </span>
            <span className="text-gray-500">Baht</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="w-48 text-gray-500">Building Cost</span>
            <span className="font-medium text-gray-800">
              <RHFInputCell
                fieldName={totalBuildingCostPath()}
                inputType="display"
                accessor={({ value }) => (value ? Number(value).toLocaleString() : '0')}
              />
            </span>
            <span className="text-gray-500">Baht</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="w-48 text-gray-500">Appraisal Price Include Building Cost</span>
            <span className="font-medium text-gray-800">
              <RHFInputCell
                fieldName={appraisalPriceIncludeBuildingCostPath()}
                inputType="display"
                accessor={({ value }) => (value ? Number(value).toLocaleString() : '0')}
              />
            </span>
            <span className="text-gray-500">Baht</span>
          </div>

          <div className="flex items-center gap-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 -mx-4">
            <span className="w-48 text-xs shrink-0 font-semibold text-gray-800">
              Appraisal Price Include Building Cost (rounded)
            </span>
            <div className="w-40">
              <RHFInputCell
                fieldName={appraisalPriceIncludeBuildingCostRoundedPath()}
                inputType="number"
                number={{
                  decimalPlaces: 2,
                  maxIntegerDigits: 15,
                  maxValue: 999_999_999_999_999.0,
                  allowNegative: false,
                }}
              />
            </div>
            <span className="text-gray-500">Baht</span>
            <div className="flex items-center">
              <RHFInputCell
                fieldName={priceIncludeBuildingCostDifferentiatePath()}
                inputType="display"
                accessor={({ value }) => {
                  const num = Number(value) || 0;
                  if (num === 0) return <span className="text-gray-400"></span>;
                  const color = num > 0 ? 'text-green-600' : 'text-red-600';
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
