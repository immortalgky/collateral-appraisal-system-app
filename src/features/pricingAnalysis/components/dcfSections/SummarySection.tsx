import clsx from 'clsx';
import { RHFInputCell } from '../table/RHFInputCell';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import type { DCFSection } from '../../types/dcf';

interface SummarySectionProps {
  name: string;
  totalNumberOfYears: number;
}
export function SummarySection({ name, totalNumberOfYears }: SummarySectionProps) {
  const { getValues } = useFormContext();
  const sections = (getValues('sections') ?? []).filter((s: DCFSection) => s.identifier != 'empty');

  const rules: DerivedFieldRule<unknown>[] = [
    ...Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
      return [
        {
          targetPath: `${name}.grossRevenue.${idx}`,
          deps: ['sections'],
          compute: ({ ctx }) => {
            const grossRevenue = ctx.sections.reduce((prev, curr) => {
              const identifer = curr.identifier ?? '';
              if (identifer === 'positive')
                return prev + Number(curr.totalSectionValues?.[idx] ?? 0);
              if (identifer === 'negative')
                return prev - Number(curr.totalSectionValues?.[idx] ?? 0);
              return prev;
            }, 0);
            return grossRevenue;
          },
        },
        {
          targetPath: `${name}.grossRevenueProportional.${idx}`,
          deps: ['sections'],
          compute: ({ getValues, ctx }) => {
            const grossRevenue = getValues(`${name}.grossRevenue.${idx}`) ?? 0;
            const income = ctx.sections.reduce((prev, curr) => {
              const identifer = curr.identifier ?? '';
              if (identifer === 'positive')
                return prev + Number(curr.totalSectionValues?.[idx] ?? 0);
              return prev;
            }, 0);
            if (income == 0) return 0;
            return (grossRevenue / income) * 100;
          },
        },
        {
          targetPath: `${name}.contractRentalFee.${idx}`,
          deps: [],
          compute: ({ getValues }) => {
            return 0;
          },
        },
      ];
    }),
    ...Array.from({ length: totalNumberOfYears - 1 }).flatMap((_, idx) => {
      return [
        {
          targetPath: `${name}.terminalRevenue.${idx}`,
          deps: ['sections'],
          when: ({ ctx }) => {
            return idx === ctx.totalNumberOfYears - 2;
          },
          compute: ({ getValues, ctx }) => {
            const lastYearGrossRevenue =
              getValues(`${name}.grossRevenue.${ctx.totalNumberOfYears - 1}`) ?? 0;
            const capRate = getValues(`capitalizeRate`) ?? 0;
            if (capRate === 0) return 0;
            return lastYearGrossRevenue / (capRate / 100);
          },
        },
        {
          targetPath: `${name}.totalNet.${idx}`,
          deps: ['sections'],
          compute: ({ getValues, ctx }) => {
            const terminalRevenue = getValues(`${name}.terminalRevenue.${idx}`) ?? 0;
            const grossRevenue = getValues(`${name}.grossRevenue.${idx}`) ?? 0;
            return Number(terminalRevenue) + Number(grossRevenue);
          },
        },
        {
          targetPath: `${name}.discount.${idx}`,
          deps: [],
          compute: ({ getValues }) => {
            const dicountedRate = getValues('discountedRate');
            console.log(1 / Math.pow(1 + dicountedRate / 100, idx + 1));
            return 1 / Math.pow(1 + dicountedRate / 100, idx + 1);
          },
        },
        {
          targetPath: `${name}.presentValue.${idx}`,
          deps: [],
          compute: ({ getValues }) => {
            const discount = getValues(`${name}.discount.${idx}`) ?? 0;
            const totalNet = getValues(`${name}.totalNet.${idx}`) ?? 0;
            return discount * totalNet;
          },
        },
      ];
    }),
    {
      targetPath: `finalValue`,
      deps: ['sections'],
      compute: ({ ctx }) => {
        const summarySection = ctx.sections.filter(s => s.sectionType === 'summary');
        const finalValue = (summarySection?.presentValue ?? []).reduce((prev, curr) => {
          return prev + Number(curr ?? 0);
        }, 0);
        return finalValue;
      },
    },
    {
      targetPath: `finalValueRounded`,
      deps: [],
      when: ({ getValues, getFieldState, formState }) => {
        const { isDirty } = getFieldState('finalValueRounded', formState);
        return !isDirty;
      },
      compute: ({ getValues }) => {
        const finalValue = getValues('finalValue') ?? 0;
        return finalValue;
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
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap border-b border-gray-300',
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
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td
            key={idx}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap border-b border-gray-300',
            )}
          >
            <div className="text-right text-sm">
              <RHFInputCell
                fieldName={`${name}.grossRevenue.${idx}`}
                inputType="display"
                accessor={({ value }) => <span>{value ? value.toLocaleString() : 0}</span>}
              />
            </div>
          </td>
        ))}
      </tr>
      <tr className="bg-white">
        <td className="border-b border-gray-300">NOI/ Gross Revenue</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td
            key={idx}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap border-b border-gray-300',
            )}
          >
            <div className="text-right text-sm">
              <RHFInputCell
                fieldName={`${name}.grossRevenueProportional.${idx}`}
                inputType="display"
                accessor={({ value }) => <span>{value ? value.toLocaleString() : 0}</span>}
              />
            </div>
          </td>
        ))}
      </tr>
      <tr className="bg-white">
        <td className="border-b border-gray-300">
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
            <td
              key={idx}
              className={clsx(
                'text-right px-1.5 py-1.5 text-sm whitespace-nowrap border-b border-gray-300',
              )}
            >
              <RHFInputCell
                fieldName={`${name}.terminalRevenue.${idx}`}
                inputType="display"
                accessor={({ value }) => <span>{value ? value.toLocaleString() : ''}</span>}
              />
            </td>
          );
        })}
      </tr>
      <tr className="bg-white">
        <td className="border-b border-gray-300">Total Net Cashflow</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td
            key={idx}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap border-b border-gray-300',
            )}
          >
            <RHFInputCell
              fieldName={`${name}.totalNet.${idx}`}
              inputType="display"
              accessor={({ value }) => <span>{value ? value.toLocaleString() : ''}</span>}
            />
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
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td
            key={idx}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap border-b border-gray-300',
            )}
          >
            <RHFInputCell
              fieldName={`${name}.discount.${idx}`}
              inputType="display"
              accessor={({ value }) => <span>{value ? Number(value).toFixed(6) : ''}</span>}
            />
          </td>
        ))}
      </tr>
      <tr className="bg-white">
        <td className="border-b border-gray-300">Present Vaue of Cashflows</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td
            key={idx}
            className={clsx(
              'text-right px-1.5 py-1.5 text-sm whitespace-nowrap border-b border-gray-300',
            )}
          >
            <RHFInputCell
              fieldName={`${name}.presentValue.${idx}`}
              inputType="display"
              accessor={({ value }) => <span>{value ? value.toLocaleString() : ''}</span>}
            />
          </td>
        ))}
      </tr>
      <tr className="bg-white">
        <td className="border-b border-gray-300">Final Value</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => {
          if (idx === 0) {
            return (
              <td
                key={idx}
                className={clsx(
                  'text-right px-1.5 py-1.5 text-sm whitespace-nowrap border-b border-gray-300',
                )}
              >
                <RHFInputCell
                  fieldName={'finalValue'}
                  inputType="display"
                  accessor={({ value }) => <span>{value ? value.toLocaleString() : ''}</span>}
                />
              </td>
            );
          }
          return (
            <td
              key={idx}
              className={clsx(
                'text-right px-1.5 py-1.5 text-sm whitespace-nowrap border-b border-gray-300',
              )}
            ></td>
          );
        })}
      </tr>
      <tr className="bg-white">
        <td>Final Value (Rounded)</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => {
          if (idx === 0) {
            return (
              <td
                key={idx}
                className={clsx(
                  'text-right px-1.5 py-1.5 text-sm whitespace-nowrap border-b border-gray-300',
                )}
              >
                <div className="flex flex-row justify-end items-center">
                  <div className="w-16">
                    <RHFInputCell fieldName={'finalValueRounded'} inputType="number" />
                  </div>
                </div>
              </td>
            );
          }
          return (
            <td
              key={idx}
              className={clsx(
                'text-right px-1.5 py-1.5 text-sm whitespace-nowrap border-b border-gray-300',
              )}
            ></td>
          );
        })}
      </tr>
    </>
  );
}
