import { useFormContext, useWatch } from 'react-hook-form';
import { RHFInputCell, toNumber } from '../table/RHFInputCell';
import { Icon } from '@/shared/components';
import { convertLandAreaToTotalSqWa } from '../../domain/convertLandAreaToTotalSqWa';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { floorToThousands } from '../../domain/calculation';
import { useEffect, useRef } from 'react';
import { shouldAutoDefault } from '../../domain/shouldAutoDefault';

interface DiscountedCashFlowHighestBestUsedProps {
  isReadOnly?: boolean;
}

export function DiscountedCashFlowHighestBestUsed({ isReadOnly }: DiscountedCashFlowHighestBestUsedProps) {
  const { control, getValues, setValue } = useFormContext();
  const isHighestBestUsed = useWatch({ control, name: 'isHighestBestUsed' });

  const rules: DerivedFieldRule[] = [
    {
      targetPath: 'highestBestUsed.totalWa',
      deps: ['highestBestUsed.areaRai', 'highestBestUsed.areaNgan', 'highestBestUsed.areaWa'],
      compute: ({ getValues }) => {
        const areaRai = toNumber(getValues('highestBestUsed.areaRai')) ?? 0;
        const areaNgan = toNumber(getValues('highestBestUsed.areaNgan')) ?? 0;
        const areaWa = toNumber(getValues('highestBestUsed.areaWa')) ?? 0;
        return convertLandAreaToTotalSqWa(areaRai, areaNgan, areaWa);
      },
    },
    {
      targetPath: 'highestBestUsed.totalValue',
      deps: ['highestBestUsed.totalWa', 'highestBestUsed.pricePerSqWa'],
      compute: ({ getValues }) => {
        const pricePerSqWa = toNumber(getValues('highestBestUsed.pricePerSqWa')) ?? 0;
        const totalWa = toNumber(getValues('highestBestUsed.totalWa')) ?? 0;
        return pricePerSqWa * totalWa;
      },
    },
    {
      targetPath: 'appraisalPrice',
      deps: ['finalValueRounded'],
      compute: ({ getValues }) => {
        const finalValueRounded = getValues('finalValueRounded') ?? 0;

        const isHighestBestUsed = getValues('isHighestBestUsed') ?? false;
        const totalHighestBestUsedValue = getValues('highestBestUsed.totalValue');
        if (!isHighestBestUsed && !!totalHighestBestUsedValue) {
          return floorToThousands(finalValueRounded + totalHighestBestUsedValue);
        }

        return finalValueRounded;
      },
    },
    {
      targetPath: 'appraisalPriceRounded',
      deps: ['appraisalPrice'],
      compute: ({ getValues }) => Number(getValues('appraisalPrice')) || 0,
      when: ({ getValues, getFieldState, formState }) => {
        const curr = getValues('appraisalPriceRounded') ?? 0;
        const { isDirty } = getFieldState('appraisalPriceRounded', formState);
        return shouldAutoDefault({ value: curr, isDirty });
      },
    },
  ];
  useDerivedFields({ rules });

  return (
    <div className="flex flex-col gap-3 text-sm">
      {/* is hightest and best used? */}
      <div className="flex items-center gap-4">
        <span className="w-56 text-gray-500">Highest and Best Used</span>
        <RHFInputCell
          fieldName={'isHighestBestUsed'}
          inputType="toggle"
          disabled={isReadOnly}
          toggle={{ checked: isHighestBestUsed, options: ['No', 'Yes'] }}
          onUserChange={e => {
            if (!e) {
              setValue('highestBestUsed.areaRai', null);
              setValue('highestBestUsed.areaNgan', null);
              setValue('highestBestUsed.areaWa', null);
              setValue('highestBestUsed.pricePerSqWa', null);
              setValue('highestBestUsed.totalWa', null);
              setValue('highestBestUsed.totalValue', null);
            }
            return e;
          }}
        />
      </div>
      {/* Area (shown when include area is on) */}
      {!isHighestBestUsed && (
        <>
          <div className="flex flex-col justify-start gap-4">
            <div className="flex flex-row justify-start items-end gap-1.5">
              <span className="w-56 text-gray-500"></span>
              <div className="w-36">
                <RHFInputCell
                  fieldName={'highestBestUsed.areaRai'}
                  inputType="number"
                  disabled={isReadOnly}
                  number={{
                    label: 'Rai',
                    decimalPlaces: 0,
                    maxIntegerDigits: 5,
                    allowNegative: false,
                  }}
                />
              </div>
              <div className="w-36">
                <RHFInputCell
                  fieldName={'highestBestUsed.areaNgan'}
                  inputType="number"
                  disabled={isReadOnly}
                  number={{
                    label: 'Ngan',
                    decimalPlaces: 0,
                    maxIntegerDigits: 1,
                    maxValue: 3,
                    allowNegative: false,
                  }}
                />
              </div>
              <div className="w-36">
                <RHFInputCell
                  fieldName={'highestBestUsed.areaWa'}
                  inputType="number"
                  disabled={isReadOnly}
                  number={{
                    label: 'Wa',
                    decimalPlaces: 2,
                    maxIntegerDigits: 3,
                    allowNegative: false,
                  }}
                />
              </div>
              <span className="text-gray-500">
                Total:{' '}
                {getValues('highestBestUsed.totalWa')
                  ? Number(getValues('highestBestUsed.totalWa')).toLocaleString()
                  : 0}{' '}
                Sq. Wa
              </span>
            </div>
            <div className="flex flex-row justify-start items-end gap-1.5">
              <span className="w-56 text-gray-500"></span>
              <div className="w-36">
                <RHFInputCell
                  fieldName={'highestBestUsed.pricePerSqWa'}
                  inputType="number"
                  disabled={isReadOnly}
                  number={{
                    label: 'Price/ Sq.Wa',
                    decimalPlaces: 2,
                    maxIntegerDigits: 15,
                    allowNegative: false,
                  }}
                />
              </div>
              <span className="text-gray-500">
                Total:{' '}
                {getValues('highestBestUsed.totalValue')
                  ? toNumber(getValues('highestBestUsed.totalValue'))?.toLocaleString()
                  : 0}{' '}
                Baht
              </span>
            </div>
          </div>
        </>
      )}
      {/* Final Value (Rounded) */}
      <div className="flex items-center gap-4">
        <span className="w-48 text-gray-500">
          Final Value (Rounded) {isHighestBestUsed ? '' : '+ Land Value'}
        </span>
        <span className="font-medium text-gray-800">
          <RHFInputCell
            fieldName={'appraisalPrice'}
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
            fieldName={'appraisalPriceRounded'}
            inputType="number"
            disabled={isReadOnly}
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
            fieldName={'appraisalPriceDifferentiate'}
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
  );
}
