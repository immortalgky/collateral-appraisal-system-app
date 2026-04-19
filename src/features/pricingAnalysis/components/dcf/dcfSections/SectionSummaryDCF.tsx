import clsx from 'clsx';
import { RHFInputCell } from '../../table/RHFInputCell';
import { roundToThousand } from '../../../domain/calculation';

interface SectionSummaryDCFProps {
  name: string;
  totalNumberOfYears: number;
  isReadOnly?: boolean;
}
export function SectionSummaryDCF({ name, totalNumberOfYears, isReadOnly }: SectionSummaryDCFProps) {
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
  const rowStyle = 'bg-white';

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
        <td className={clsx(rowHeaderStyle)}>Net Operating Income (EBITDA) : NOI/ Gross Revenue</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td key={idx} className={clsx(rowBodyStyle)}>
            <div className="text-right text-sm">
              <RHFInputCell
                fieldName={`${name}.grossRevenue.${idx}`}
                inputType="display"
                accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : 0}</span>}
              />
            </div>
          </td>
        ))}
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>NOI/ Gross Revenue</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td key={idx} className={clsx(rowBodyStyle)}>
            <div className="text-right text-sm">
              <RHFInputCell
                fieldName={`${name}.grossRevenueProportional.${idx}`}
                inputType="display"
                accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : 0}</span>}
              />
            </div>
          </td>
        ))}
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>
          <div className="flex flex-row justify-between items-center">
            <div>Terminal Revenue (Capitalization Rate)</div>
            <div className="w-28 text-sm flex flex-row gap-1 justitfy-end items-center">
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
        {Array.from({ length: totalNumberOfYears }, (_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              {idx === totalNumberOfYears - 2 && (
                <RHFInputCell
                  fieldName={`${name}.terminalRevenue.${idx}`}
                  inputType="display"
                  accessor={({ value }) => (
                    <span>{value ? Number(value).toLocaleString() : 0}</span>
                  )}
                />
              )}
            </td>
          );
        })}
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>Total Net Cashflow</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td key={idx} className={clsx(rowBodyStyle)}>
            {idx !== totalNumberOfYears - 1 && (
              <RHFInputCell
                fieldName={`${name}.totalNet.${idx}`}
                inputType="display"
                accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : 0}</span>}
              />
            )}
          </td>
        ))}
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>
          <div className="flex flex-row justify-between items-center">
            <div>Discount Rate</div>
            <div className="w-28 flex flex-row gap-1 justitfy-end items-center">
              <RHFInputCell
                fieldName="discountedRate"
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
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td key={idx} className={clsx(rowBodyStyle)}>
            <RHFInputCell
              fieldName={`${name}.discount.${idx}`}
              inputType="display"
              accessor={({ value }) => <span>{value ? Number(value).toFixed(6) : ''}</span>}
            />
          </td>
        ))}
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>Present Vaue of Cashflows</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td key={idx} className={clsx(rowBodyStyle)}>
            {idx !== totalNumberOfYears - 1 && (
              <RHFInputCell
                fieldName={`${name}.presentValue.${idx}`}
                inputType="display"
                accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : 0}</span>}
              />
            )}
          </td>
        ))}
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>Final Value</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => {
          if (idx === 0) {
            return (
              <td key={idx} className={clsx(rowBodyStyle)}>
                {idx === 0 && (
                  <RHFInputCell
                    fieldName={'finalValue'}
                    inputType="display"
                    accessor={({ value }) => (
                      <span>{value ? Number(value).toLocaleString() : 0}</span>
                    )}
                  />
                )}
              </td>
            );
          }
          return <td key={idx} className={clsx(rowBodyStyle)}></td>;
        })}
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>Final Value (Rounded)</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => {
          if (idx === 0) {
            return (
              <td key={idx} className={clsx(rowBodyStyle)}>
                <RHFInputCell
                  fieldName={'finalValue'}
                  inputType="display"
                  accessor={({ value }) => (
                    <span>{value ? roundToThousand(Number(value)).toLocaleString() : 0}</span>
                  )}
                />
              </td>
            );
          }
          return <td key={idx} className={clsx(rowBodyStyle)}></td>;
        })}
      </tr>
    </>
  );
}
