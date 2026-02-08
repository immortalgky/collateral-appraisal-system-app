import {
  useDerivedFields,
  type DerivedFieldRule,
} from '@features/appraisal/components/priceAnalysis/components/useDerivedFieldArray.tsx';
import { saleGridFieldPath } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/adapters/fieldPath.ts';
import { RHFInputCell } from '@features/appraisal/components/priceAnalysis/components/table/RHFInputCell.tsx';
import { shouldAutoDefault } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/domain/shouldAutoDefault.ts';

export function SaleAdjustmentGridAdjustAppraisalPriceSection({ property }) {
  const {
    finalValueRounded: finalValueRoundedPath,
    appraisalPrice: appraisalPricePath,
    appraisalPriceRounded: appraisalPriceRoundedPath,
  } = saleGridFieldPath;

  const rules: DerivedFieldRule[] = [
    {
      targetPath: appraisalPricePath(),
      deps: [finalValueRoundedPath()],
      compute: ({ getValues, ctx }) => {
        console.log(ctx);
        const collateralType = ctx?.property?.collateralType ?? '';
        const finalValue = getValues(finalValueRoundedPath()) ?? 0;

        if (collateralType === 'L') {
          const landArea = ctx?.property?.landArea ?? 0;
          return finalValue * landArea;
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

  useDerivedFields({ rules: rules, ctx: { property: property } });

  return (
    <div className="flex flex-col gap-4 text-sm py-2">
      {property.collateralType === 'L' && (
        <div className="grid grid-cols-12">
          <div className="col-span-3">Area</div>
          <div className="col-span-1 text-right">{property.landArea ?? 0}</div>
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
