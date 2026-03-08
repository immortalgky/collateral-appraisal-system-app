import { Icon } from '@/shared/components';
import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import {
  useDerivedFields,
  type DerivedFieldRule,
} from '@features/pricingAnalysis/adapters/useDerivedFieldArray.tsx';
import { directComparisonPath } from '@features/pricingAnalysis/adapters/directComparisonFieldPath.ts';
import { useFormContext } from 'react-hook-form';

interface DirectComparisonAdjustAppraisalPriceSectionProps {
  property: Record<string, unknown>;
}
export function DirectComparisonAdjustAppraisalPriceSection({
  property,
}: DirectComparisonAdjustAppraisalPriceSectionProps) {
  const { getValues } = useFormContext();

  const {
    finalValueRounded: finalValueRoundedPath,
    landArea: landAreaPath,
    usableArea: usableAreaPath,
    appraisalPrice: appraisalPricePath,
    appraisalPriceRounded: appraisalPriceRoundedPath,
    priceDifferentiate: priceDifferentiatePath,
  } = directComparisonPath;

  const rules: DerivedFieldRule[] = [
    {
      targetPath: appraisalPricePath(),
      deps: [finalValueRoundedPath()],
      compute: ({ getValues }) => {
        const finalValue = getValues(finalValueRoundedPath()) ?? 0;

        const landArea = getValues(landAreaPath());
        if (landArea) {
          return finalValue * landArea;
        }

        const usableArea = getValues(usableAreaPath());
        if (usableArea) {
          return finalValue * usableArea;
        }

        return finalValue;
      },
    },
    {
      targetPath: priceDifferentiatePath(),
      deps: [appraisalPriceRoundedPath(), finalValueRoundedPath()],
      compute: ({ getValues }) => {
        const appraisalPriceRounded = getValues(appraisalPriceRoundedPath()) ?? 0;
        const finalValueRounded = getValues(finalValueRoundedPath()) ?? 0;
        return appraisalPriceRounded - finalValueRounded;
      },
    },
    {
      targetPath: appraisalPriceRoundedPath(),
      deps: [appraisalPricePath()],
      compute: ({ getValues }) => Number(getValues(appraisalPricePath())) || 0,
      when: ({ getValues }) => {
        const current = Number(getValues(appraisalPriceRoundedPath())) || 0;
        return current === 0;
      },
    },
  ];

  useDerivedFields({ rules: rules });

  return (
    <div className="flex flex-col gap-3 text-sm">
      {property.propertyType === 'L' && (
        <div className="flex items-center gap-4">
          <span className="w-44 text-gray-500">Land Area</span>
          <span className="font-medium text-gray-800">{(getValues(landAreaPath()) ?? 0).toLocaleString()}</span>
        </div>
      )}
      {property.propertyType === 'U' && (
        <div className="flex items-center gap-4">
          <span className="w-44 text-gray-500">Usable Area</span>
          <span className="font-medium text-gray-800">{(getValues(usableAreaPath()) ?? 0).toLocaleString()}</span>
        </div>
      )}
      <div className="flex items-center gap-4">
        <span className="w-44 text-gray-500">Final Value (Rounded)</span>
        <span className="font-medium text-gray-800">
          <RHFInputCell
            fieldName={finalValueRoundedPath()}
            inputType={'display'}
            accessor={({ value }) => {
              return value?.toLocaleString() ?? '0';
            }}
          />
        </span>
        <span className="text-gray-500">Baht</span>
      </div>
      <div className="flex items-center gap-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 -mx-4">
        <span className="w-44 shrink-0 font-semibold text-gray-800">Appraisal Price</span>
        <div className="w-40">
          <RHFInputCell fieldName={appraisalPriceRoundedPath()} inputType={'number'} />
        </div>
        <span className="text-gray-500">Baht</span>
        <div className="flex items-center">
          <RHFInputCell
            fieldName={priceDifferentiatePath()}
            inputType={'display'}
            accessor={({ value }) => {
              const num = Number(value) || 0;
              if (num === 0) return <span className="text-gray-400">-</span>;
              const color = num > 0 ? 'text-green-600' : 'text-red-600';
              const bgColor = num > 0 ? 'bg-green-50' : 'bg-red-50';
              const icon = num > 0 ? 'arrow-up' : 'arrow-down';
              return (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} ${bgColor}`}>
                  <Icon name={icon} style="solid" className="size-3" />
                  {Math.abs(num).toLocaleString()}
                </span>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
