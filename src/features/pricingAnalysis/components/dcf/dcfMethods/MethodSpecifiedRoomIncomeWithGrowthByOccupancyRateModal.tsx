import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateModalProps {
  name: string;
}
export function MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateModal({
  name,
}: MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateModalProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Saleable Area</span>
        <div className={'w-44'}>
          <RHFInputCell fieldName={`${name}.saleableArea`} inputType={'number'} />
        </div>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Total Number of Saleable Area</span>
        <div className={'w-44'}>
          <RHFInputCell fieldName={`${name}.totalNumberOfSaleableArea`} inputType={'number'} />
        </div>
        <span>Remark</span>
        <div className={'w-56'}>
          <RHFInputCell fieldName={`${name}.remark`} inputType={'text'} />
        </div>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Room Income</span>
        <div className={'w-44'}>
          <RHFInputCell fieldName={`${name}.firstYearAmt`} inputType={'number'} />
        </div>
        <span className={''}>Bath/ Year</span>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Increase</span>
        <div className="w-24">
          <RHFInputCell
            fieldName={`${name}.increaseRatePct`}
            inputType={'number'}
            number={{ decimalPlaces: 2, maxIntegerDigits: 3, allowNegative: false }}
          />
        </div>
        <span className={''}>% every</span>
        <div className="w-24">
          <RHFInputCell
            fieldName={`${name}.increaseRateYrs`}
            inputType={'number'}
            number={{ decimalPlaces: 2, maxIntegerDigits: 3, maxValue: 100, allowNegative: false }}
          />
        </div>
        <span className={''}>year(s)</span>
      </div>
      <div className="flex flex-row gap-1.5">
        <span className={'w-56'}>Occupancy Rate - First Year</span>
        <div className={'w-24'}>
          <RHFInputCell fieldName={`${name}.occupancyRateFirstYearPct`} inputType={'number'} />
        </div>
        <span className={''}>% with growth</span>
        <div className={'w-24'}>
          <RHFInputCell
            fieldName={`${name}.occupancyRatePct`}
            inputType={'number'}
            number={{ decimalPlaces: 2, maxIntegerDigits: 3, maxValue: 100, allowNegative: false }}
          />
        </div>
        <span className={''}>% every</span>
        <div className={'w-24'}>
          <RHFInputCell
            fieldName={`${name}.occupancyRateYrs`}
            inputType={'number'}
            number={{ decimalPlaces: 0, maxIntegerDigits: 3, maxValue: 100, allowNegative: false }}
          />
        </div>
        <span className={''}>year(s)</span>
      </div>
    </div>
  );
}
