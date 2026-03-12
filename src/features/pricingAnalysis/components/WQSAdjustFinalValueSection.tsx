import { useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Icon } from '@/shared/components';
import { RHFInputCell } from './table/RHFInputCell';
import { wqsFieldPath } from '../adapters/wqsFieldPath';
import { round2, toFiniteNumber } from '@features/pricingAnalysis/domain/calculateWQS.ts';
import {
  type DerivedFieldRule,
  useDerivedFields,
} from '@features/pricingAnalysis/adapters/useDerivedFieldArray.tsx';

export const AdjustFinalValueSection = ({ property }: { property: Record<string, unknown> }) => {
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
  } = wqsFieldPath;

  const { control } = useFormContext();
  const includeLandArea = useWatch({ control, name: includeLandAreaPath() });

  // Track previous finalValueRounded to detect actual changes.
  // On initial load: preserve saved appraisalPriceRounded (auto-fill only if 0).
  // After initial load: always auto-default when finalValueRounded changes.
  const prevFinalValueRef = useRef<number | null>(null);

  const rules: DerivedFieldRule[] = [
    {
      targetPath: finalValueAppraisalPricePath(),
      deps: [finalValueRoundedPath()],
      compute: ({ getValues }) => {
        const finalValueRounded = getValues(finalValueRoundedPath()) ?? 0;

        const isIncludeLandArea = getValues(includeLandAreaPath());
        const landArea = getValues(landAreaPath());
        if (isIncludeLandArea && !!landArea) {
          return round2(finalValueRounded * (landArea ?? 0));
        }

        const usableArea = getValues(usableAreaPath());
        if (isIncludeLandArea && !!usableArea) {
          return round2(finalValueRounded * (usableArea ?? 0));
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
  ];
  useDerivedFields({ rules });

  const isLand = property.propertyType === 'L';
  const isUsable = property.propertyType === 'U';
  const areaUnit = isLand ? 'Sq. Wa' : 'Sq. m.';
  const areaFieldPath = isLand ? landAreaPath() : usableAreaPath();

  return (
    <div className="flex flex-col gap-3 text-sm">
      {/* Coefficient of decision */}
      <div className="flex items-center gap-4">
        <span className="w-44 text-gray-500">Coefficient of decision</span>
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
      <div className="flex items-center gap-4">
        <span className="w-44 text-gray-500">Include Area</span>
        <RHFInputCell
          fieldName={includeLandAreaPath()}
          inputType="toggle"
          toggle={{ checked: includeLandArea, options: ['No', 'Yes'] }}
        />
      </div>

      {/* Area (shown when include area is on) */}
      {includeLandArea && (isLand || isUsable) && (
        <div className="flex items-center gap-4">
          <span className="w-44 text-gray-500">Area</span>
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
        <span className="w-44 text-gray-500">Final Value (Rounded)</span>
        <span className="font-medium text-gray-800">
          <RHFInputCell
            fieldName={finalValueRoundedPath()}
            inputType="display"
            accessor={({ value }) => (value ? Number(value).toLocaleString() : '0')}
          />
        </span>
        <span className="text-gray-500">Baht</span>
      </div>

      {/* Appraisal Price */}
      <div className="flex items-center gap-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 -mx-4">
        <span className="w-44 shrink-0 font-semibold text-gray-800">Appraisal Price</span>
        <div className="w-40">
          <RHFInputCell fieldName={appraisalPriceRoundedPath()} inputType="number" />
        </div>
        <span className="text-gray-500">Baht</span>
        <div className="flex items-center">
          <RHFInputCell
            fieldName={priceDifferentiatePath()}
            inputType="display"
            accessor={({ value }) => {
              const num = Number(value) || 0;
              if (num === 0) return <span className="text-gray-400">-</span>;
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
      {/* <div className="flex items-center gap-4">
        <span className="w-44 text-gray-500">Include building cost</span>
        <RHFInputCell
          fieldName={hasBuildingCostPath()}
          inputType="toggle"
          toggle={{ checked: false, options: ['No', 'Yes'] }}
        />
      </div> */}
    </div>
  );
};
