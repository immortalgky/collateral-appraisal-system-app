import { Fragment, useEffect, useMemo } from 'react';
import { useForm, FormProvider, useFieldArray, useWatch, useFormContext } from 'react-hook-form';
import { RHFInputCell } from '../../table/RHFInputCell';
import { roomTypeParameters } from '../../../data/dcfParameters';
import { Icon } from '@shared/components';
import { ScrollableTableContainer } from '../../ScrollableTableContainer';
import { toNumber } from '../../../domain/calculation';
import { useDerivedFields, type DerivedFieldRule } from '../../../adapters/useDerivedFieldArray';
import clsx from 'clsx';

type SeasonRateInput = {
  seasonId: string;
  roomIncome: number | null;
  saleableArea: number | null;
};

type RoomIncomeRow = {
  id: string;
  roomType: string;
  roomTypeOther?: string;
  seasons: SeasonRateInput[];
};

export function calculateRoomIncomePerDay(input?: SeasonRateInput): number {
  const roomIncome = Number(input?.roomIncome) || 0;
  const saleableArea = Number(input?.saleableArea) || 0;
  return roomIncome * saleableArea;
}

export function calculateSeasonTotals(rows: RoomIncomeRow[], seasonIndex: number) {
  return rows.reduce(
    (acc, row) => {
      const season = row.seasons[seasonIndex];
      const saleableArea = Number(season?.saleableArea) || 0;
      const totalRoomIncomePerDay = calculateRoomIncomePerDay(season);
      acc.saleableArea += saleableArea;
      acc.totalRoomIncomePerDay += totalRoomIncomePerDay;

      return acc;
    },
    {
      saleableArea: 0,
      totalRoomIncomePerDay: 0,
    },
  );
}

function createEmptySeason(index: number): SeasonRateInput {
  return {
    seasonId: `season-${index + 1}`,
    roomIncome: null,
    saleableArea: null,
  };
}

function createEmptyRow(seasonCount: number): RoomIncomeRow {
  return {
    id: crypto.randomUUID(),
    roomType: '',
    roomTypeOther: '',
    seasons: Array.from({ length: seasonCount }, (_, i) => createEmptySeason(i)),
  };
}

function resizeRowSeasons(row: RoomIncomeRow, seasonCount: number): RoomIncomeRow {
  return {
    ...row,
    seasons: Array.from({ length: seasonCount }, (_, i) => row.seasons[i] ?? createEmptySeason(i)),
  };
}

interface MethodSpecifiedRoomIncomeBySeasonalRatesModalProps {
  name: string;
  isReadOnly: boolean;
}
export function MethodSpecifiedRoomIncomeBySeasonalRatesModal({
  name,
  isReadOnly,
}: MethodSpecifiedRoomIncomeBySeasonalRatesModalProps) {
  const { control, getValues, setValue } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `${name}.roomDetails`,
  });

  const seasonCount = useWatch({ control, name: `${name}.seasonCount` }) ?? 1;
  const seasonDetails = useWatch({ control, name: `${name}.seasonDetails` }) ?? [];
  const rows = useWatch({ control, name: `${name}.roomDetails` }) ?? [];

  const handleSeasonCountChange = (nextCount: number) => {
    setValue(`${name}.seasonCount`, nextCount);

    const roomDetails = getValues(`${name}.roomDetails`);

    roomDetails.forEach((row, rowIndex) => {
      setValue(
        `${name}.roomDetails.${rowIndex}.seasons`,
        resizeRowSeasons(row, nextCount).seasons,
        {
          shouldDirty: true,
        },
      );
    });
  };

  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return [
      ...Array.from({ length: seasonCount }, (_, seasonIndex) => {
        return {
          targetPath: `${name}.seasonDetails.${seasonIndex}.avgTotalRoomIncomePerDay`,
          deps: [`${name}.roomDetails`],
          compute: ({ getValues }) => {
            const roomDetails = getValues(`${name}.roomDetails`) ?? [];
            const total = calculateSeasonTotals(roomDetails, seasonIndex);
            if (total.saleableArea === 0) return 0;
            return toNumber(total.totalRoomIncomePerDay / total.saleableArea);
          },
        };
      }),
      ...Array.from({ length: seasonCount }, (_, seasonIndex) => {
        return {
          targetPath: `${name}.seasonDetails.${seasonIndex}.avgTotalRoomIncomePerSeason`,
          deps: [
            `${name}.seasonDetails.${seasonIndex}.avgTotalRoomIncomePerDay`,
            `${name}.seasonDetails.${seasonIndex}.numberOfMonths`,
          ],
          compute: ({ getValues }) => {
            const avgTotalRoomIncomePerDay =
              getValues(`${name}.seasonDetails.${seasonIndex}.avgTotalRoomIncomePerDay`) ?? 0;
            const numberOfMonths =
              getValues(`${name}.seasonDetails.${seasonIndex}.numberOfMonths`) ?? 0;
            const avgTotalRoomIncomePerSeason = avgTotalRoomIncomePerDay * numberOfMonths * 30;
            console.log(getValues(`${name}.seasonDetails.${seasonIndex}.numberOfMonths`));
            return toNumber(avgTotalRoomIncomePerSeason);
          },
        };
      }),
      {
        targetPath: `${name}.avgRoomRate`,
        deps: [`${name}.seasonDetails`],
        compute: ({ getValues }) => {
          const sumAvgTotalRoomIncomePerSeason = (getValues(`${name}.seasonDetails`) ?? []).reduce(
            (acc, curr) => {
              return acc + toNumber(curr.avgTotalRoomIncomePerSeason ?? 0);
            },
            0,
          );
          const avg = sumAvgTotalRoomIncomePerSeason / 360;

          return toNumber(avg);
        },
      },
    ];
  }, [name, seasonCount]);

  useDerivedFields({ rules });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <div className="w-80">
          <span>Number of seasons</span>
        </div>
        <div className="w-56">
          <RHFInputCell
            fieldName="seasonCount"
            inputType="number"
            onUserChange={v => {
              if (v) handleSeasonCountChange(v);
              return v;
            }}
            number={{ decimalPlaces: 0, maxIntegerDigits: 1, allowNegative: false }}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <div className="overflow-auto flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-300 rounded-xl p-1.5">
        <ScrollableTableContainer maxHeight={'200px'} className="flex-1 min-h-0">
          <table className="table table-xs min-w-max border-separate border-spacing-0">
            <thead>
              <tr>
                <th rowSpan={2} className="border-b border-r border-gray-300">
                  Room Type
                </th>
                {Array.from({ length: seasonCount }, (_, seasonIndex) => (
                  <th
                    key={seasonIndex}
                    colSpan={3}
                    className={clsx(
                      'border-b border-gray-300',
                      seasonIndex !== seasonCount - 1 ? 'border-r' : 0,
                    )}
                  >
                    <div className="flex flex-col gap-2 p-1.5">
                      <div className="flex flex-row items-center">
                        <span className="w-64">Season Name</span>
                        <RHFInputCell
                          fieldName={`${name}.seasonDetails.${seasonIndex}.seasonName`}
                          inputType="text"
                          text={{ maxLength: 50 }}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="flex flex-row items-center">
                        <span className="w-64">No. Of Month</span>
                        <RHFInputCell
                          fieldName={`${name}.seasonDetails.${seasonIndex}.numberOfMonths`}
                          inputType="number"
                          number={{
                            decimalPlaces: 0,
                            maxIntegerDigits: 2,
                            maxValue: 12,
                            allowNegative: false,
                          }}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="flex flex-row items-center">
                        <span className="w-64">Season Description</span>
                        <RHFInputCell
                          fieldName={`${name}.seasonDetails.${seasonIndex}.description`}
                          inputType="text"
                          text={{ maxLength: 100 }}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
              <tr>
                {Array.from({ length: seasonCount }, (_, seasonIndex) => (
                  <Fragment key={seasonIndex}>
                    <th className="border-b border-gray-300 text-right">Room Income</th>
                    <th className="border-b border-gray-300 text-right">Saleable Area</th>
                    <th
                      className={clsx(
                        'border-b border-gray-300 text-right',
                        seasonIndex !== seasonCount - 1 ? 'border-r' : 0,
                      )}
                    >
                      Total / Day
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {fields.map((field, rowIndex) => {
                const roomType = getValues(`${name}.roomDetails.${rowIndex}.roomType`);
                return (
                  <tr key={field.id}>
                    <td className={clsx('border-b border-r border-gray-300 p-1')}>
                      <div className="flex gap-1.5 items-center">
                        <RHFInputCell
                          fieldName={`${name}.roomDetails.${rowIndex}.roomType`}
                          inputType="select"
                          options={roomTypeParameters.map(p => ({
                            value: p.code,
                            label: p.description,
                          }))}
                          disabled={isReadOnly}
                        />
                        {String(roomType) === '99' && (
                          <RHFInputCell
                            fieldName={`${name}.roomDetails.${rowIndex}.roomTypeOther`}
                            inputType="text"
                            text={{ maxLength: 50 }}
                            disabled={isReadOnly}
                          />
                        )}
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => remove(rowIndex)}
                            className="size-5 flex-shrink-0 flex items-center justify-center cursor-pointer rounded text-gray-300 hover:text-danger-600 hover:bg-danger-50 transition-colors opacity-100"
                            title="Delete"
                          >
                            <Icon style="solid" name="trash" className="size-1" />
                          </button>
                        )}
                      </div>
                    </td>

                    {Array.from({ length: seasonCount }, (_, seasonIndex) => {
                      const cell = rows[rowIndex]?.seasons?.[seasonIndex];
                      const total =
                        (Number(cell?.roomIncome) || 0) * (Number(cell?.saleableArea) || 0);

                      return (
                        <Fragment key={`${field.id}-${seasonIndex}`}>
                          <td className="border-b border-gray-300 p-1">
                            <RHFInputCell
                              fieldName={`${name}.roomDetails.${rowIndex}.seasons.${seasonIndex}.roomIncome`}
                              inputType="number"
                              number={{
                                decimalPlaces: 2,
                                maxIntegerDigits: 15,
                                allowNegative: false,
                              }}
                              disabled={isReadOnly}
                            />
                          </td>
                          <td className="border-b border-gray-300 p-1">
                            <RHFInputCell
                              fieldName={`${name}.roomDetails.${rowIndex}.seasons.${seasonIndex}.saleableArea`}
                              inputType="number"
                              number={{
                                decimalPlaces: 0,
                                maxIntegerDigits: 6,
                                allowNegative: false,
                              }}
                              disabled={isReadOnly}
                            />
                          </td>
                          <td
                            className={clsx(
                              'border-b border-gray-300 text-sm text-right',
                              seasonIndex !== seasonCount - 1 ? 'border-r' : 0,
                            )}
                          >
                            {Number(total.toFixed(2)).toLocaleString()}
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                );
              })}
              {!isReadOnly && (
                <tr>
                  <td className={clsx('border-b border-r border-gray-300 p-1')}>
                    <button
                      type="button"
                      onClick={() => append(createEmptyRow(seasonCount))}
                      className="px-3 py-1.5 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
                    >
                      + Add Room Type
                    </button>
                  </td>
                  {Array.from({ length: seasonCount }, (_, seasonIndex) => {
                    return (
                      <Fragment key={`${seasonIndex}`}>
                        <td className="border-b border-gray-300 p-1"></td>
                        <td className="border-b border-gray-300 p-1"></td>
                        <td
                          className={clsx(
                            'border-b border-gray-300 p-1',
                            seasonIndex !== seasonCount - 1 ? 'border-r' : 0,
                          )}
                        ></td>
                      </Fragment>
                    );
                  })}
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr>
                <td className="border-b border-r border-gray-300 p-1.5">Totals</td>
                {Array.from({ length: seasonCount }, (_, seasonIndex) => {
                  const totals = calculateSeasonTotals(rows, seasonIndex);

                  return (
                    <Fragment key={`totals-${seasonIndex}`}>
                      <td className="border-b border-gray-300 p-1.5"></td>
                      <td className="border-b border-gray-300 p-1.5 text-right">
                        {Number(totals.saleableArea.toFixed(2)).toLocaleString()}
                      </td>
                      <td
                        className={clsx(
                          'border-b border-gray-300 text-right',
                          seasonIndex !== seasonCount - 1 ? 'border-r' : 0,
                        )}
                      >
                        {Number(totals.totalRoomIncomePerDay.toFixed(2)).toLocaleString()}
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
              <tr>
                <td className="border-b border-r border-gray-300 p-1.5">Average/ Room/ Day</td>
                {Array.from({ length: seasonCount }, (_, seasonIndex) => {
                  const totals = calculateSeasonTotals(rows, seasonIndex);
                  const avg = totals.totalRoomIncomePerDay / totals.saleableArea;
                  return (
                    <Fragment key={`totals-${seasonIndex}`}>
                      <td className="border-b border-gray-300 p-1.5"></td>
                      <td className="border-b border-gray-300 p-1.5"></td>
                      <td
                        className={clsx(
                          'border-b border-gray-300 text-right text-sm',
                          seasonIndex !== seasonCount - 1 ? 'border-r' : 0,
                        )}
                      >
                        {toNumber(avg).toLocaleString() ?? 0}
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
              <tr>
                <td className="border-b border-r border-gray-300 p-1.5">Average/ Room/ Season</td>
                {Array.from({ length: seasonCount }, (_, seasonIndex) => {
                  const totals = calculateSeasonTotals(rows, seasonIndex);
                  const avg = totals.totalRoomIncomePerDay / totals.saleableArea;
                  const avgPerSeason = avg * (seasonDetails[seasonIndex]?.numberOfMonths ?? 0) * 30;
                  return (
                    <Fragment key={`totals-${seasonIndex}`}>
                      <td className="border-b border-gray-300 p-1.5"></td>
                      <td className="border-b border-gray-300 p-1.5"></td>
                      <td
                        className={clsx(
                          'border-b border-gray-300 text-right',
                          seasonIndex !== seasonCount - 1 ? 'border-r' : 0,
                        )}
                      >
                        {toNumber(avgPerSeason).toLocaleString() ?? 0}
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </ScrollableTableContainer>
      </div>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-row gap-1.5 items-center">
          <span className={'w-80'}>Average Room Rate</span>
          <div className={'w-44 text-right'}>
            <RHFInputCell
              fieldName={`${name}.avgRoomRate`}
              inputType={'display'}
              accessor={({ value }) => (
                <span className="text-right">{value ? value.toLocaleString() : 0}</span>
              )}
            />
          </div>
        </div>
        <div className="flex flex-row gap-1.5 items-center">
          <span className={'w-80'}>Total Number of Saleable Area</span>
          <div className={'w-44'}>
            <RHFInputCell
              fieldName={`${name}.totalSaleableArea`}
              inputType={'number'}
              number={{ decimalPlaces: 0, maxIntegerDigits: 6, allowNegative: false }}
              disabled={isReadOnly}
            />
          </div>
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-80'}>Increase Rate</span>
          <div className={'w-44'}>
            <RHFInputCell
              fieldName={`${name}.increaseRatePct`}
              inputType={'number'}
              number={{
                decimalPlaces: 2,
                maxIntegerDigits: 3,
                allowNegative: false,
              }}
              disabled={isReadOnly}
            />
          </div>
          <span className={''}>every</span>
          <div className={'w-44'}>
            <RHFInputCell
              fieldName={`${name}.increaseRateYrs`}
              inputType={'number'}
              number={{
                decimalPlaces: 0,
                maxIntegerDigits: 3,
                maxValue: 100,
                allowNegative: false,
              }}
              disabled={isReadOnly}
            />
          </div>
          <span className={'w-44'}>year(s)</span>
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-80'}>Occupancy Rate - First Year</span>
          <div className={'w-44'}>
            <RHFInputCell
              fieldName={`${name}.occupancyRateFirstYearPct`}
              inputType={'number'}
              number={{
                decimalPlaces: 2,
                maxIntegerDigits: 3,
                maxValue: 100,
                allowNegative: false,
              }}
              disabled={isReadOnly}
            />
          </div>
          <span className={''}>% with growth</span>
          <div className={'w-44'}>
            <RHFInputCell
              fieldName={`${name}.occupancyRatePct`}
              inputType={'number'}
              number={{
                decimalPlaces: 2,
                maxIntegerDigits: 3,
                maxValue: 100,
                allowNegative: false,
              }}
              disabled={isReadOnly}
            />
          </div>
          <span className={''}>% every</span>
          <div className={'w-44'}>
            <RHFInputCell
              fieldName={`${name}.occupancyRateYrs`}
              inputType={'number'}
              number={{
                decimalPlaces: 0,
                maxIntegerDigits: 3,
                maxValue: 100,
                allowNegative: false,
              }}
              disabled={isReadOnly}
            />
          </div>
          <span className={''}>year(s)</span>
        </div>
      </div>
    </div>
  );
}
