import clsx from 'clsx';
import { NumberInput } from '@shared/components';
import { formatNumber } from '@shared/utils/formatUtils.ts';

export function SaleAdjustmentGridAdjustAppraisalPriceSection({ property }) {
  return (
    <div className="flex flex-col gap-4 text-sm py-2">
      {property.collateralType === 'L' && (
        <div className="grid grid-cols-12">
          <div className="col-span-3">Area</div>
          <div className="col-span-9">{property.landArea ?? 0}</div>
        </div>
      )}
      <div className="grid grid-cols-12">
        <div className="col-span-3">Appraisal Price</div>
        <div className="col-span-9">
          {property.collateralType === 'L'
            ? formatNumber(property.landArea * finalValueRounded)
            : finalValueRounded}
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Appraisal Price</div>
        <div className="col-span-9">{WQSFinalValue.appraisalPriceRounded - appraisalPrice}</div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3 flex items-center">{'Appraisal Price (rounded)'}</div>
        <div className="col-span-9">
          <NumberInput
            {...appraisalPriceRoundedField}
            error={appraisalPriceRoundedError?.message}
            className="w-[130px]"
            fullWidth={false}
          />
        </div>
      </div>
    </div>
  );
}
