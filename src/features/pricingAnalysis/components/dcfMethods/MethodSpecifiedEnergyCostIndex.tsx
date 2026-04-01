import clsx from 'clsx';
import { RHFInputCell } from '../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { getDCFFilteredAssumptions } from '../../domain/getDCFFilteredAssumptions';
import { toNumber } from '../../domain/calculation';

interface MethodSpecifiedEnergyCostIndexProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
}
export function MethodSpecifiedEnergyCostIndex({
  name,
  expanded,
  totalNumberOfYears,
}: MethodSpecifiedEnergyCostIndexProps) {
  // const rules: DerivedFieldRule<unknown>[] = Array.from({ length: totalNumberOfYears }).flatMap(
  //   (_, idx) => {
  //     return [
  //       {
  //         targetPath: `${name}.detail.increaseRate.${idx}`,
  //         deps: [`${name}.detail.increaseRatePct`, `${name}.detail.increaseRateYrs`],
  //         compute: ({ getValues }) => {
  //           const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
  //           const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
  //           if (idx === 0) return 0;
  //           if (idx % increateRateYrs === 0) return increaseRatePct;
  //           return 0;
  //         },
  //       },
  //       {
  //         targetPath: `${name}.detail.energyCostIndexIncrease.${idx}`,
  //         deps: [`${name}.detail.increaseRate.${idx}`, `${name}.detail.energyCostIndex`],
  //         compute: ({ getValues }) => {
  //           const firstYearAmt = getValues(`${name}.detail.energyCostIndex`) ?? 0;

  //           if (idx === 0) return firstYearAmt;

  //           const prevEnergyCostIndexIncrease =
  //             getValues(`${name}.detail.energyCostIndexIncrease.${idx - 1}`) ?? 0;
  //           const increaseRate = getValues(`${name}.detail.increaseRate.${idx}`) ?? 0;

  //           return toNumber(prevEnergyCostIndexIncrease * (1 + increaseRate / 100));
  //         },
  //       },
  //       {
  //         targetPath: `${name}.detail.totalEnegyCost.${idx}`,
  //         deps: [`${name}.detail.energyCostIndexIncrease.${idx}`],
  //         compute: ({ getValues }) => {
  //           const totalEnegyCost = getValues(`${name}.detail.energyCostIndexIncrease.${idx}`) ?? 0;
  //           const totalNumberOfSaleableArea =
  //             getDCFFilteredAssumptions(getValues, a => a.method.methodType === '06')?.[0]
  //               ?.assumption.method?.detail?.totalSaleableAreaDeductByOccRate?.[idx] ?? 0;

  //           return toNumber(totalEnegyCost) * toNumber(totalNumberOfSaleableArea) * 12;
  //         },
  //       },
  //       {
  //         targetPath: `${name}.totalMethodValues.${idx}`,
  //         deps: [`${name}.detail.totalEnegyCost.${idx}`],
  //         compute: ({ getValues }) => {
  //           return getValues(`${name}.detail.totalEnegyCost.${idx}`) ?? 0;
  //         },
  //       },
  //     ];
  //   },
  // );
  // useDerivedFields({ rules });

  return (
    <>
      {expanded && (
        <MethodSpecifiedEnergyCostIndexTable name={name} totalNumberOfYear={totalNumberOfYears} />
      )}
    </>
  );
}

interface MethodSpecifiedEnergyCostIndexTableProps {
  name: string;
  totalNumberOfYear: number;
}
function MethodSpecifiedEnergyCostIndexTable({
  name,
  totalNumberOfYear,
}: MethodSpecifiedEnergyCostIndexTableProps) {
  const rowHeaderStyle = 'pl-24 px-1.5 h-12 text-sm text-gray-600 border-b border-gray-300';
  const rowBodyStyle = 'px-1.5 h-12 text-sm text-right text-gray-600 border-b border-gray-300';

  return (
    <>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Increase Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.increaseRate.${idx}`}
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
          <span>Enegy Cost Index</span>
        </td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <div className="flex flex-row justify-end items-center">
                <div className="w-16">
                  <RHFInputCell
                    fieldName={`${name}.detail.energyCostIndexIncrease.${idx}`}
                    inputType="display"
                    accessor={({ value }) => (
                      <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                    )}
                  />
                </div>
              </div>
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>
          <span>Total Energy Cost</span>
        </td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <div className="flex flex-row justify-end items-center">
                <div className="w-16">
                  <RHFInputCell
                    fieldName={`${name}.detail.totalEnegyCost.${idx}`}
                    inputType="display"
                    accessor={({ value }) => (
                      <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                    )}
                  />
                </div>
              </div>
            </td>
          );
        })}
      </tr>
    </>
  );
}
