import clsx from 'clsx';
import { RHFInputCell } from '../table/RHFInputCell';
import { useFormContext } from 'react-hook-form';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import type { DCFSection, DCFSummarySection } from '../../types/dcf';
import { toNumber } from '../../domain/calculation';

interface DirectCashFlowSummarySectionProps {
  name: string;
  totalNumberOfYears: number;
}
export function DirectCashFlowSummarySection({
  name,
  totalNumberOfYears,
}: DirectCashFlowSummarySectionProps) {
  const { getValues } = useFormContext();
  const sections = (getValues('sections') ?? []).filter((s: DCFSection) => s.identifier != 'empty');

  const rules: DerivedFieldRule<unknown>[] = [
    {
      targetPath: `${name}.totalNet`,
      deps: ['sections'],
      compute: ({ getValues, ctx }) => {
        const grossRevenue = ctx.sections.reduce((prev, curr) => {
          const identifer = curr.identifier ?? '';
          if (identifer === 'positive') return prev + Number(curr.totalSectionValues?.[0] ?? 0);
          if (identifer === 'negative') return prev - Number(curr.totalSectionValues?.[0] ?? 0);
          return prev;
        }, 0);

        // minus contract fee from lease agreement
        const contractRentalFee = getValues(`${name}.contractRentalFee`) ?? 0;
        return grossRevenue - contractRentalFee;
      },
    },
    {
      targetPath: `${name}.contractRentalFee`,
      deps: [],
      compute: ({ getValues }) => {
        return 0;
      },
    },
    {
      targetPath: `${name}.presentValue`,
      deps: [`capitalizeRate`, `${name}.totalNet`],
      compute: ({ getValues }) => {
        const capitalizeRate = getValues(`capitalizeRate`);
        const totalNet = getValues(`${name}.totalNet`) ?? 0;

        if (!capitalizeRate) return 0;

        return toNumber(totalNet / capitalizeRate / 100);
      },
    },
  ];

  useDerivedFields({ rules, ctx: { sections, totalNumberOfYears } });

  return <SummarySectionTable name={name} totalNumberOfYears={totalNumberOfYears} />;
}

interface SummarySectionTableProps {
  name: string;
  totalNumberOfYears: number;
}
function SummarySectionTable({ name, totalNumberOfYears }: SummarySectionTableProps) {
  const rowHeaderStyle = 'px-1.5 h-12 text-sm text-gray-700 border-b border-gray-300';
  const rowBodyStyle = 'px-1.5 h-12 text-sm text-right text-gray-700 border-b border-gray-300';
  const rowStyle = 'bg-white hover:bg-secondary/10';

  return (
    <>
      {/* last section */}
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>Contract Rental Fee</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td key={idx} className={clsx(rowBodyStyle)}>
            <RHFInputCell
              fieldName={`${name}.contractRentalFee.${idx}`}
              inputType="display"
              accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : 0}</span>}
            />
          </td>
        ))}
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>
          <div className="flex flex-row justify-between items-center">
            <div>Net Operating Income (EBITDA) : NOI/ Gross Revenue</div>
            <div className="w-16 text-sm flex flex-row gap-1 justitfy-end items-center">
              <RHFInputCell
                fieldName="capitalizeRate"
                inputType="number"
                number={{
                  decimalPlaces: 0,
                  maxIntegerDigits: 3,
                  maxValue: 367,
                  allowNegative: false,
                }}
              />
              <span>%</span>
            </div>
          </div>
        </td>
        <td className={clsx(rowBodyStyle)}>
          <div className="text-right text-sm">
            <RHFInputCell
              fieldName={`${name}.totalNet`}
              inputType="display"
              accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : 0}</span>}
            />
          </div>
        </td>
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>Final Value</td>
        <td className={clsx(rowBodyStyle)}>
          <RHFInputCell
            fieldName={`${name}.presentValue`}
            inputType="display"
            accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : ''}</span>}
          />
        </td>
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>Final Value (Rounded)</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => {
          if (idx === 0) {
            return (
              <td key={idx} className={clsx(rowBodyStyle)}>
                <div className="flex flex-row justify-end items-center">
                  <div className="w-28">
                    <RHFInputCell fieldName={'finalValueRounded'} inputType="number" />
                  </div>
                </div>
              </td>
            );
          }
          return <td key={idx} className={clsx(rowBodyStyle)}></td>;
        })}
      </tr>
    </>
  );
}
