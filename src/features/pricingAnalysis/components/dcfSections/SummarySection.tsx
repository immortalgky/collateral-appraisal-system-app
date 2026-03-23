import clsx from 'clsx';
import { RHFInputCell } from '../table/RHFInputCell';

interface SummarySectionProps {
  name: string;
  totalNumberOfYears: number;
}
export function SummarySection({ name, totalNumberOfYears }: SummarySectionProps) {
  return (
    <>
      {/* last section */}
      {}
      <tr className="bg-white">
        <td className="border-b border-gray-300">Contract Rental Fee</td>
        {Array.from({ length: totalNumberOfYears }, (_, i) => (
          <td
            key={i}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap text-[14px] border-b border-gray-300',
            )}
          >
            xxxxxx
          </td>
        ))}
      </tr>
      <tr className="bg-white">
        <td className="border-b border-gray-300">
          Net Operating Income (EBITDA) : NOI/ Gross Revenue
        </td>
        {Array.from({ length: totalNumberOfYears }, (_, i) => (
          <td
            key={i}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap text-[14px] border-b border-gray-300',
            )}
          >
            xxxxxx
          </td>
        ))}
      </tr>
      <tr className="bg-white">
        <td className="border-b border-gray-300">
          <div className="flex flex-row justify-between items-center">
            <div>Terminal Revenue (Capitalization Rate)</div>
            <div className="w-16 flex flex-row gap-1 justitfy-end items-center">
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
        {Array.from({ length: totalNumberOfYears }, (_, i) => (
          <td
            key={i}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap text-[14px] border-b border-gray-300',
            )}
          >
            xxxxxx
          </td>
        ))}
      </tr>
      <tr className="bg-white">
        <td className="border-b border-gray-300">Total Net Cashflow</td>
        {Array.from({ length: totalNumberOfYears }, (_, i) => (
          <td
            key={i}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap text-[14px] border-b border-gray-300',
            )}
          >
            xxxxxx
          </td>
        ))}
      </tr>
      <tr className="bg-white">
        <td className="border-b border-gray-300">
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
        {Array.from({ length: totalNumberOfYears }, (_, i) => (
          <td
            key={i}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap text-[14px] border-b border-gray-300',
            )}
          >
            xxxxxx
          </td>
        ))}
      </tr>
      <tr className="bg-white">
        <td className="border-b border-gray-300">Present Vaue of Cashflows</td>
        {Array.from({ length: totalNumberOfYears }, (_, i) => (
          <td
            key={i}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap text-[14px] border-b border-gray-300',
            )}
          >
            xxxxxx
          </td>
        ))}
      </tr>
      <tr className="bg-white">
        <td className="border-b border-gray-300">Final Value</td>
        {Array.from({ length: totalNumberOfYears }, (_, i) => (
          <td
            key={i}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap text-[14px] border-b border-gray-300',
            )}
          >
            xxxxxx
          </td>
        ))}
      </tr>
      <tr className="bg-white">
        <td>Final Value (Rounded)</td>
        {Array.from({ length: totalNumberOfYears }, (_, i) => (
          <td
            key={i}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap text-[14px] border-b border-gray-300',
            )}
          >
            xxxxxx
          </td>
        ))}
      </tr>
    </>
  );
}
