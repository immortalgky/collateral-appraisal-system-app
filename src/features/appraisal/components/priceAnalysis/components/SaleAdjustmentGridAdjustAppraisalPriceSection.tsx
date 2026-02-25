import { shouldAutoDefault } from '@features/appraisal/components/priceAnalysis/domain/shouldAutoDefault.ts';
import { saleGridFieldPath } from '@features/appraisal/components/priceAnalysis/adapters/saleAdjustmentGridfieldPath.ts';
import {
  type DerivedFieldRule,
  useDerivedFields,
} from '@features/appraisal/components/priceAnalysis/adapters/useDerivedFieldArray.tsx';
import { RHFInputCell } from '@features/appraisal/components/priceAnalysis/components/table/RHFInputCell.tsx';
import { useFormContext } from 'react-hook-form';

interface SaleAdjustmentGridAdjustAppraisalPriceSectionProps {
  property: Record<string, unknown>;
}
export function SaleAdjustmentGridAdjustAppraisalPriceSection({
  property,
}: SaleAdjustmentGridAdjustAppraisalPriceSectionProps) {
  const { getValues } = useFormContext();

  const {
    finalValueRounded: finalValueRoundedPath,
    landArea: landAreaPath,
    usableArea: usableAreaPath,
    appraisalPrice: appraisalPricePath,
    appraisalPriceRounded: appraisalPriceRoundedPath,
  } = saleGridFieldPath;

  const rules: DerivedFieldRule[] = [
    {
      targetPath: appraisalPricePath(),
      deps: [finalValueRoundedPath()],
      compute: ({ getValues }) => {
        const finalValue = getValues(finalValueRoundedPath()) ?? 0;

        const landArea = getValues(landAreaPath());
        console.log(getValues(usableAreaPath()));
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
      targetPath: appraisalPriceRoundedPath(),
      deps: [appraisalPricePath()],
      when: ({ getValues, getFieldState, formState }) => {
        const target = appraisalPriceRoundedPath();
        const curr = getValues(target);
        const { isDirty } = getFieldState(target, formState);
        return shouldAutoDefault({ value: curr, isDirty });
      },
      compute: ({ getValues }) => {
        const finalValueRounded = getValues(appraisalPricePath()) ?? 0;
        return finalValueRounded;
      },
    },
  ];

  useDerivedFields({ rules: rules });

  return (
    <div className="flex flex-col gap-4 text-sm py-2">
      {property.propertyType === 'L' && (
        <div className="grid grid-cols-12">
          <div className="col-span-3">Land Area</div>
          <div className="col-span-1 text-right">{getValues(landAreaPath()) ?? 0}</div>
        </div>
      )}
      {property.propertyType === 'U' && (
        <div className="grid grid-cols-12">
          <div className="col-span-3">Usable Area</div>
          <div className="col-span-1 text-right">{getValues(usableAreaPath()) ?? 0}</div>
        </div>
      )}
      <div className="grid grid-cols-12">
        <div className="col-span-3">Appraisal Price</div>
        <div className="col-span-1">
          <div className={'text-right'}>
            <RHFInputCell
              fieldName={appraisalPricePath()}
              inputType={'display'}
              accessor={({ value }) => {
                return value.toLocaleString() ?? '';
              }}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3 flex items-center">{'Appraisal Price (rounded)'}</div>
        <div className="col-span-1">
          <RHFInputCell fieldName={appraisalPriceRoundedPath()} inputType={'number'} />
        </div>
      </div>
    </div>
  );
}
