import clsx from 'clsx';
import { RHFInputCell, toNumber } from '../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';

interface MethodSpecifiedRentalIncomePerSquareMeterProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
}
export function MethodSpecifiedRentalIncomePerSquareMeter({
  name,
  expanded,
  totalNumberOfYears,
}: MethodSpecifiedRentalIncomePerSquareMeterProps) {
  const rules: DerivedFieldRule<unknown>[] = Array.from({ length: totalNumberOfYears }).flatMap(
    (_, idx) => {
      return [
        {
          targetPath: `${name}.detail.occupancyRate.${idx}`,
          deps: [
            `${name}.detail.occupancyRateFirstYearPct`,
            `${name}.detail.occupancyRatePct`,
            `${name}.detail.occupancyRateYrs`,
          ],
          when: ({ getFieldState, formState }) => {
            const { isDirty } = getFieldState(`${name}.detail.occupancyRate.${idx}`, formState);
            return !isDirty;
          },
          compute: ({ value, getValues }) => {
            const occupancyRateFirstYearPct =
              getValues(`${name}.detail.occupancyRateFirstYearPct`) ?? 0;
            const occupancyRatePct = getValues(`${name}.detail.occupancyRatePct`) ?? 0;
            const occupancyRateYrs = getValues(`${name}.detail.occupancyRateYrs`) ?? 0;

            if (idx === 0) return occupancyRateFirstYearPct;

            const prevOccupancyRate = getValues(`${name}.detail.occupancyRate.${idx - 1}`) ?? 0;

            if (idx % occupancyRateYrs === 0) return prevOccupancyRate + occupancyRatePct;

            return prevOccupancyRate;
          },
        },
        {
          targetPath: `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
          deps: [`${name}.detail.sumSaleableArea`],
          compute: ({ getValues }) => {
            const saleableArea = getValues(`${name}.detail.sumSaleableArea`) ?? 0;
            const occupancyRate = getValues(`${name}.detail.occupancyRate.${idx}`) ?? 0;
            return toNumber(saleableArea * (occupancyRate / 100));
          },
        },
        {
          targetPath: `${name}.detail.rentalRateIncrease.${idx}`,
          deps: [`${name}.detail.increaseRatePct`, `${name}.detail.increaseRateYrs`],
          compute: ({ getValues }) => {
            const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
            const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
            if (idx === 0) return 0;
            if (idx % increateRateYrs === 0) return toNumber(increaseRatePct);
            return 0;
          },
        },
        {
          targetPath: `${name}.detail.avgRentalRate.${idx}`,
          deps: [
            `${name}.detail.avgRentalRatePerMonth`,
            `${name}.detail.rentalRateIncrease.${idx}`,
          ],
          compute: ({ getValues }) => {
            const avgRentalRatePerMonth = getValues(`${name}.detail.avgRentalRatePerMonth`) ?? 0;
            const increaseRate = getValues(`${name}.detail.rentalRateIncrease.${idx}`) ?? 0;

            if (idx === 0) return toNumber(avgRentalRatePerMonth);

            const prevAvgRentalRate = getValues(`${name}.detail.avgRentalRate.${idx - 1}`) ?? 0;

            return toNumber(prevAvgRentalRate * (1 + increaseRate / 100));
          },
        },
        {
          targetPath: `${name}.detail.totalRentalIncome.${idx}`,
          deps: [
            `${name}.detail.avgRentalRate.${idx}`,
            `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
          ],
          compute: ({ getValues }) => {
            const avgRentalRate = getValues(`${name}.detail.avgRentalRate.${idx}`) ?? 0;
            const totalSaleableAreaDeductByOccRate =
              getValues(`${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`) ?? 0;

            return toNumber(avgRentalRate * totalSaleableAreaDeductByOccRate * 12);
          },
        },
        {
          targetPath: `${name}.totalMethodValues.${idx}`,
          deps: [`${name}.detail.totalRentalIncome.${idx}`],
          compute: ({ getValues }) => {
            return getValues(`${name}.detail.totalRentalIncome.${idx}`) ?? 0;
          },
        },
      ];
    },
  );
  useDerivedFields({ rules });

  return (
    <>
      {expanded && (
        <MethodSpecifiedRentalIncomePerSquareMeterTable
          name={name}
          totalNumberOfYear={totalNumberOfYears}
        />
      )}
    </>
  );
}

interface MethodSpecifiedRentalIncomePerSquareMeterTableProps {
  name: string;
  totalNumberOfYear: number;
}
function MethodSpecifiedRentalIncomePerSquareMeterTable({
  name,
  totalNumberOfYear,
}: MethodSpecifiedRentalIncomePerSquareMeterTableProps) {
  const rowHeaderStyle =
    'pl-24 px-1.5 h-12 text-sm text-gray-500 border-b border-gray-300 bg-white';
  const rowBodyStyle =
    'px-1.5 h-12 text-sm text-right text-gray-500 border-b border-gray-300 bg-white';

  return (
    <>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Total Saleable Area</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.totalSaleableArea`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Actual Saleable Area</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.sumSaleableArea`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Occupancy Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell fieldName={`${name}.detail.occupancyRate.${idx}`} inputType="number" />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Increase Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.rentalRateIncrease.${idx}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Average Rental Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.avgRentalRate.${idx}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>
          <span>Total Rental Income</span>
        </td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <div className="flex flex-row justify-end items-center">
                <RHFInputCell
                  fieldName={`${name}.detail.totalRentalIncome.${idx}`}
                  inputType="display"
                  accessor={({ value }) => (
                    <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                  )}
                />
              </div>
            </td>
          );
        })}
      </tr>
    </>
  );
}
