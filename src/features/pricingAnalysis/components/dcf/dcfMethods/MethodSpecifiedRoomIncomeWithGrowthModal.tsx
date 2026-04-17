import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedRoomIncomeWithGrowthModalProps {
  name: string;
  isReadOnly?: boolean;
}
export function MethodSpecifiedRoomIncomeWithGrowthModal({
  name,
  isReadOnly,
}: MethodSpecifiedRoomIncomeWithGrowthModalProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Saleable Area</span>
        <div className={'w-44'}>
          <RHFInputCell
            fieldName={`${name}.saleableArea`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 0, maxIntegerDigits: 6, allowNegative: false }}
          />
        </div>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Total Number of Saleable Area</span>
        <div className={'w-44'}>
          <RHFInputCell
            fieldName={`${name}.totalNumberOfSaleableArea`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 0, maxIntegerDigits: 6, allowNegative: false }}
          />
        </div>
        <span>Remark</span>
        <div className={'w-56'}>
          <RHFInputCell
            fieldName={`${name}.remark`}
            inputType={'text'}
            disabled={isReadOnly}
            text={{ maxLength: 4000 }}
          />
        </div>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Room Income</span>
        <div className={'w-44'}>
          <RHFInputCell
            fieldName={`${name}.firstYearAmt`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 2, maxIntegerDigits: 15, allowNegative: false }}
          />
        </div>
        <span className={''}>Bath/ Year</span>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Increase</span>
        <div className="w-44">
          <RHFInputCell
            fieldName={`${name}.increaseRatePct`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 2, maxIntegerDigits: 3, allowNegative: false }}
          />
        </div>
        <span className={''}>% every</span>
        <div className="w-44">
          <RHFInputCell
            fieldName={`${name}.increaseRateYrs`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 0, maxIntegerDigits: 3, maxValue: 100, allowNegative: false }}
          />
        </div>
        <span className={''}>year(s)</span>
      </div>
    </div>
  );
}
