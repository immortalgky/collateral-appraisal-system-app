import { useEffect, useMemo } from 'react';
import { useForm, FormProvider, useFieldArray, useWatch, useFormContext } from 'react-hook-form';
import { RHFInputCell } from '../table/RHFInputCell';
import { roomTypeParameters } from '../../data/dcfParameters';
import { Icon } from '@shared/components';

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
    seasons: Array.from({ length: seasonCount }, (_, i) => createEmptySeason(i)),
  };
}

function resizeRowSeasons(row: RoomIncomeRow, seasonCount: number): RoomIncomeRow {
  return {
    ...row,
    seasons: Array.from({ length: seasonCount }, (_, i) => row.seasons[i] ?? createEmptySeason(i)),
  };
}

function normalizeSeasonCount(
  values: SeasonalRateFormValues,
  nextSeasonCount: number,
): SeasonalRateFormValues {
  return {
    seasonCount: nextSeasonCount,
    seasonLabels: Array.from(
      { length: nextSeasonCount },
      (_, i) => values.seasonLabels[i] ?? `Season ${i + 1}`,
    ),
    rows: values.rows.map(row => ({
      ...row,
      seasons: Array.from(
        { length: nextSeasonCount },
        (_, i) => row.seasons[i] ?? createEmptySeasonCell(i),
      ),
    })),
  };
}

export function MethodSpecifiedRoomIncomeBySeasonalRatesModal() {
  const methods = useForm<SeasonalRoomIncomeFormValues>({
    defaultValues: {
      seasonCount: 2,
      seasonLabels: ['Season 1', 'Season 2'],
      rows: [createEmptyRow(2)],
    },
  });

  const { control, register, getValues, setValue, handleSubmit } = methods;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'rows',
  });

  const seasonCount = useWatch({ control, name: 'seasonCount' }) ?? 1;
  const rows = useWatch({ control, name: 'rows' }) ?? [];

  const handleSeasonCountChange = (nextCount: number) => {
    setValue('seasonCount', nextCount);

    const currentRows = getValues('rows');
    replace(currentRows.map(row => resizeRowSeasons(row, nextCount)));

    const currentLabels = getValues('seasonLabels');
    setValue(
      'seasonLabels',
      Array.from({ length: nextCount }, (_, i) => currentLabels[i] ?? `Season ${i + 1}`),
    );
  };

  const onSubmit = (values: SeasonalRoomIncomeFormValues) => {
    console.log(values);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-3">
          <label>Number of seasons</label>
          <input
            type="number"
            min={1}
            max={12}
            value={seasonCount}
            onChange={e => handleSeasonCountChange(Number(e.target.value) || 1)}
          />

          <button type="button" onClick={() => append(createEmptyRow(seasonCount))}>
            Add Room Type
          </button>
        </div>

        <div className="overflow-auto border rounded">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th rowSpan={2}>Room Type</th>
                {Array.from({ length: seasonCount }, (_, seasonIndex) => (
                  <th key={seasonIndex} colSpan={3}>
                    {getValues(`seasonLabels.${seasonIndex}`) || `Season ${seasonIndex + 1}`}
                  </th>
                ))}
                <th rowSpan={2}></th>
              </tr>
              <tr>
                {Array.from({ length: seasonCount }, (_, seasonIndex) => (
                  <tsx-fragment key={seasonIndex}>
                    <th>Room Income</th>
                    <th>Saleable Area</th>
                    <th>Total / Day</th>
                  </tsx-fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {fields.map((field, rowIndex) => (
                <tr key={field.id}>
                  <td>
                    <input
                      {...register(`rows.${rowIndex}.roomType` as const, {
                        required: true,
                      })}
                    />
                  </td>

                  {Array.from({ length: seasonCount }, (_, seasonIndex) => {
                    const cell = rows[rowIndex]?.seasons?.[seasonIndex];
                    const total =
                      (Number(cell?.roomIncome) || 0) * (Number(cell?.saleableArea) || 0);

                    return (
                      <tsx-fragment key={`${field.id}-${seasonIndex}`}>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            {...register(
                              `rows.${rowIndex}.seasons.${seasonIndex}.roomIncome` as const,
                              { valueAsNumber: true, min: 0 },
                            )}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            {...register(
                              `rows.${rowIndex}.seasons.${seasonIndex}.saleableArea` as const,
                              { valueAsNumber: true, min: 0 },
                            )}
                          />
                        </td>
                        <td>{total.toFixed(2)}</td>
                      </tsx-fragment>
                    );
                  })}

                  <td>
                    <button type="button" onClick={() => remove(rowIndex)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr>
                <td>Totals</td>
                {Array.from({ length: seasonCount }, (_, seasonIndex) => {
                  const totals = calculateSeasonTotals(rows, seasonIndex);

                  return (
                    <tsx-fragment key={`totals-${seasonIndex}`}>
                      <td></td>
                      <td>{totals.saleableArea.toFixed(2)}</td>
                      <td>{totals.totalRoomIncomePerDay.toFixed(2)}</td>
                    </tsx-fragment>
                  );
                })}
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button">Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </FormProvider>
  );
}
