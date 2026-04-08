import clsx from 'clsx';
import { RHFInputCell } from '../../table/RHFInputCell';

interface SectionSummaryDCFProps {
  name: string;
  totalNumberOfYears: number;
}
export function SectionSummaryDCF({ name, totalNumberOfYears }: SectionSummaryDCFProps) {
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
        {Array.from({ length: totalNumberOfYears }, (_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.terminalRevenue.${idx}`}
                inputType="display"
                accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : ''}</span>}
              />
            </td>
          );
        })}
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>Total Net Cashflow</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td key={idx} className={clsx(rowBodyStyle)}>
            <RHFInputCell
              fieldName={`${name}.totalNet.${idx}`}
              inputType="display"
              accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : ''}</span>}
            />
          </td>
        ))}
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>
          <div className="flex flex-row justify-between items-center">
            <div>Discount Rate</div>
            <div className="w-16 flex flex-row gap-1 justitfy-end items-center">
              <RHFInputCell
                fieldName="discountedRate"
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
            <RHFInputCell
              fieldName={`${name}.presentValue.${idx}`}
              inputType="display"
              accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : ''}</span>}
            />
          </td>
        ))}
      </tr>
      <tr className={clsx(rowStyle)}>
        <td className={clsx(rowHeaderStyle)}>Final Value</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => {
          if (idx === 0) {
            return (
              <td key={idx} className={clsx(rowBodyStyle)}>
                <RHFInputCell
                  fieldName={'finalValue'}
                  inputType="display"
                  accessor={({ value }) => (
                    <span>{value ? Number(value).toLocaleString() : ''}</span>
                  )}
                />
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
