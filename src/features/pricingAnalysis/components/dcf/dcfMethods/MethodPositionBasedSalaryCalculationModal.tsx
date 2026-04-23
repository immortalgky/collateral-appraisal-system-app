import { Icon } from '@/shared/components';
import { RHFInputCell } from '../../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';
import { useFieldArray, useFormContext, type UseFormGetValues } from 'react-hook-form';
import { ScrollableTableContainer } from '../../ScrollableTableContainer';
import { toNumber } from '../../../domain/calculation';
import { jobPositionParameters } from '@/features/pricingAnalysis/data/dcfParameters';

interface MethodPositionBasedSalaryCalculationModalProps {
  name: string;
  getOuterFormValues: UseFormGetValues<any>;
  isReadOnly?: boolean;
}
export function MethodPositionBasedSalaryCalculationModal({
  name,
  getOuterFormValues,
  isReadOnly,
}: MethodPositionBasedSalaryCalculationModalProps) {
  const { getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ name: `${name}.jobPositionDetails` });

  const handleOnAdd = () => {
    append({});
  };

  const handleOnRemove = (index: number) => {
    remove(index);
  };

  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return [
      ...fields.flatMap((_, idx) => {
        return [
          {
            targetPath: `${name}.jobPositionDetails.${idx}.totalSalaryPerYear`,
            deps: [
              `${name}.jobPositionDetails.${idx}.salaryBahtPerPersonPerMonth`,
              `${name}.jobPositionDetails.${idx}.numberOfEmployees`,
            ],
            compute: ({ getValues }) => {
              const salaryBahtPerPersonPerMonth =
                getValues(`${name}.jobPositionDetails.${idx}.salaryBahtPerPersonPerMonth`) ?? 0;
              const numberOfEmployees =
                getValues(`${name}.jobPositionDetails.${idx}.numberOfEmployees`) ?? 0;
              return toNumber(salaryBahtPerPersonPerMonth) * (toNumber(numberOfEmployees) * 12);
            },
          },
        ];
      }),
      {
        targetPath: `${name}.sumNumberOfEmployees`,
        deps: [`${name}.jobPositionDetails`],
        compute: ({ getValues }) => {
          const jobPositionDetails = getValues(`${name}.jobPositionDetails`) ?? [];
          const sumNumberOfEmployees = jobPositionDetails.reduce((prev, curr) => {
            const currNumberOfEmployees = curr.numberOfEmployees
              ? toNumber(curr.numberOfEmployees)
              : 0;
            return prev + currNumberOfEmployees;
          }, 0);
          return toNumber(sumNumberOfEmployees);
        },
      },
      {
        targetPath: `${name}.sumSalaryBahtPerPersonPerMonth`,
        deps: [`${name}.jobPositionDetails`],
        compute: ({ getValues }) => {
          const jobPositionDetails = getValues(`${name}.jobPositionDetails`) ?? [];
          const sumSalaryBahtPerPersonPerMonth = jobPositionDetails.reduce((prev, curr) => {
            const currSalaryBahtPerPersonPerMonth = curr.salaryBahtPerPersonPerMonth
              ? toNumber(curr.salaryBahtPerPersonPerMonth)
              : 0;
            return prev + currSalaryBahtPerPersonPerMonth;
          }, 0);
          return sumSalaryBahtPerPersonPerMonth;
        },
      },
      {
        targetPath: `${name}.sumTotalSalaryPerYear`,
        deps: [`${name}.jobPositionDetails`],
        compute: ({ getValues }) => {
          const jobPositionDetails = getValues(`${name}.jobPositionDetails`) ?? [];
          const sumTotalSalaryPerYear = jobPositionDetails.reduce((prev, curr) => {
            const currTotalSalaryPerYear = curr.totalSalaryPerYear
              ? toNumber(curr.totalSalaryPerYear)
              : 0;
            return prev + currTotalSalaryPerYear;
          }, 0);
          return sumTotalSalaryPerYear;
        },
      },
    ];
  }, [fields.length]);
  useDerivedFields({ rules });

  return (
    <div className="flex flex-col gap-2">
      <div className="border border-gray-300 rounded-xl p-1.5 overflow-auto">
        <ScrollableTableContainer className="flex-1 min-h-0 max-h-[274px]">
          <div className="overflow-auto max-h-[274px]">
            <table className={'table table-sm'}>
              <thead>
                <tr>
                  <th className="px-1.5 py-1.5 bg-gray-100">Job Position</th>
                  <th className="px-1.5 py-1.5 bg-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <span>Salary</span>
                      <span>Bath / Person / Month</span>
                    </div>
                  </th>
                  <th className="px-1.5 py-1.5 bg-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <span>Number of Employees</span>
                    </div>
                  </th>
                  <th className="px-1.5 py-1.5 bg-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <span>Total Salary</span>
                      <span>Bath / Year</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {fields.map((r, index) => {
                  const jobPosition = getValues(`${name}.jobPositionDetails.${index}.jobPosition`);
                  return (
                    <tr key={index}>
                      <td className="px-1.5 py-1.5 border-b border-gray-300">
                        <div className="flex flex-row gap-1.5">
                          <RHFInputCell
                            fieldName={`${name}.jobPositionDetails.${index}.jobPosition`}
                            inputType="select"
                            disabled={isReadOnly}
                            options={jobPositionParameters.map(p => ({
                              value: p.code,
                              label: p.description,
                            }))}
                          />
                          {String(jobPosition) === '99' && (
                            <RHFInputCell
                              fieldName={`${name}.jobPositionDetails.${index}.jobPositionOther`}
                              inputType="text"
                              disabled={isReadOnly}
                              text={{ maxLength: 50 }}
                            />
                          )}
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleOnRemove(index)}
                              className="size-5 flex-shrink-0 flex items-center justify-center cursor-pointer rounded text-gray-300 hover:text-danger-600 hover:bg-danger-50 transition-colors opacity-100"
                              title="Delete"
                            >
                              <Icon style="solid" name="trash" className="size-1" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-1.5 py-1.5 border-b border-gray-300">
                        <RHFInputCell
                          fieldName={`${name}.jobPositionDetails.${index}.salaryBahtPerPersonPerMonth`}
                          inputType="number"
                          disabled={isReadOnly}
                          number={{ decimalPlaces: 2, maxIntegerDigits: 15, allowNegative: false }}
                        />
                      </td>
                      <td className="px-1.5 py-1.5 border-b border-gray-300">
                        <RHFInputCell
                          fieldName={`${name}.jobPositionDetails.${index}.numberOfEmployees`}
                          inputType="number"
                          disabled={isReadOnly}
                          number={{ decimalPlaces: 0, maxIntegerDigits: 4, allowNegative: false }}
                        />
                      </td>
                      <td className="px-1.5 py-1.5 border-b border-gray-300">
                        <div className="flex justify-end items-center text-right">
                          <RHFInputCell
                            fieldName={`${name}.jobPositionDetails.${index}.totalSalaryPerYear`}
                            inputType="display"
                            accessor={({ value }) => (
                              <span className="text-right">
                                {value ? value.toLocaleString() : 0}
                              </span>
                            )}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isReadOnly && (
                  <tr>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleOnAdd()}
                        className="px-3 py-1.5 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
                      >
                        + Add Job Position
                      </button>
                    </td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                )}
                <tr>
                  <td className="sticky bottom-0 px-1.5 bg-white">Total</td>
                  <td className="sticky bottom-0 px-1.5 bg-white">
                    <div className="text-right">
                      <RHFInputCell
                        fieldName={`${name}.sumSalaryBahtPerPersonPerMonth`}
                        inputType="display"
                        accessor={({ value }) => (
                          <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                        )}
                      />
                    </div>
                  </td>
                  <td className="sticky bottom-0 px-1.5 bg-white">
                    <div className="text-right">
                      <RHFInputCell
                        fieldName={`${name}.sumNumberOfEmployees`}
                        inputType="display"
                        accessor={({ value }) => (
                          <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                        )}
                      />
                    </div>
                  </td>
                  <td className="sticky bottom-0 px-1.5 bg-white">
                    <div className="text-right">
                      <RHFInputCell
                        fieldName={`${name}.sumTotalSalaryPerYear`}
                        inputType="display"
                        accessor={({ value }) => (
                          <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                        )}
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ScrollableTableContainer>
      </div>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-row gap-1.5 items-center">
          <span className={'w-56'}>Total Salary</span>
          <div className={'w-56 text-right'}>
            <RHFInputCell
              fieldName={`${name}.sumTotalSalaryPerYear`}
              inputType={'display'}
              accessor={({ value }) => (
                <span className="text-right">{value ? value.toLocaleString() : 0}</span>
              )}
            />
          </div>
          <span>Baht / Year</span>
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-56'}>Increase Rate</span>
          <div className={'w-56'}>
            <RHFInputCell
              fieldName={`${name}.increaseRatePct`}
              inputType={'number'}
              disabled={isReadOnly}
              number={{
                decimalPlaces: 2,
                maxIntegerDigits: 3,
                allowNegative: false,
              }}
            />
          </div>
          <span className={''}>% every</span>
          <div className={'w-56'}>
            <RHFInputCell
              fieldName={`${name}.increaseRateYrs`}
              inputType={'number'}
              disabled={isReadOnly}
              number={{
                decimalPlaces: 0,
                maxIntegerDigits: 3,
                maxValue: 100,
                allowNegative: false,
              }}
            />
          </div>
          <span className={'w-44'}>year(s)</span>
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-56'}>Start In</span>
          <div className={'w-44'}>
            <RHFInputCell
              fieldName={`${name}.startIn`}
              inputType={'number'}
              disabled={isReadOnly}
              number={{
                decimalPlaces: 2,
                maxIntegerDigits: 3,
                maxValue: getOuterFormValues('totalNumberOfYears') ?? 100,
                allowNegative: false,
              }}
            />
          </div>
          <span className={''}>year(s)</span>
        </div>
      </div>
    </div>
  );
}
