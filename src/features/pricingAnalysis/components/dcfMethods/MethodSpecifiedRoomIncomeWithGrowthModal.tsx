import { RHFInputCell } from '../table/RHFInputCell';

interface MethodSpecifiedRoomIncomeWithGrowthModalProps {
  name: string;
}
export function MethodSpecifiedRoomIncomeWithGrowthModal({
  name,
}: MethodSpecifiedRoomIncomeWithGrowthModalProps) {
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
          <RHFInputCell fieldName={`${name}.increaseRatePct`} inputType={'number'} />
        </div>
        <span className={''}>% every</span>
        <div className="w-24">
          <RHFInputCell fieldName={`${name}.increaseRateYrs`} inputType={'number'} />
        </div>
        <span className={''}>year(s)</span>
      </div>
    </div>
  );
}
