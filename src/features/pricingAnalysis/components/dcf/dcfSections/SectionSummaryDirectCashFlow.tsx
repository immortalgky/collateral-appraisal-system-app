import clsx from 'clsx';
import { RHFInputCell } from '../../table/RHFInputCell';
import { useFormContext } from 'react-hook-form';
import { useDerivedFields, type DerivedFieldRule } from '../../../adapters/useDerivedFieldArray';
import type { DCFSection } from '../../../types/dcf';
import { toNumber } from '../../../domain/calculation';

interface SectionSummaryDirectCashFlowProps {
  name: string;
  totalNumberOfYears: number;
  isReadOnly?: boolean;
}
export function SectionSummaryDirectCashFlow({
  name,
  totalNumberOfYears,
  isReadOnly,
}: SectionSummaryDirectCashFlowProps) {
  return <SummarySectionTable name={name} totalNumberOfYears={totalNumberOfYears} isReadOnly={isReadOnly} />;
}

interface SummarySectionTableProps {
  name: string;
  totalNumberOfYears: number;
  isReadOnly?: boolean;
}
function SummarySectionTable({ name, totalNumberOfYears, isReadOnly }: SummarySectionTableProps) {
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
                disabled={isReadOnly}
                number={{
                  decimalPlaces: 2,
                  maxIntegerDigits: 5,
                  maxValue: 100,
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
                    <RHFInputCell
                      fieldName={`finalValueRounded`}
                      inputType="number"
                      disabled={isReadOnly}
                      number={{
                        decimalPlaces: 2,
                        maxIntegerDigits: 15,
                        allowNegative: false,
                      }}
                    />
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
