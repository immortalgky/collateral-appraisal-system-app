import { useEffect } from 'react';
import { useForm, FormProvider, useFieldArray, useWatch, useFormContext } from 'react-hook-form';
import { RHFInputCell } from '../table/RHFInputCell';
import { roomTypeParameters } from '../../data/dcfParameters';

function createEmptySeasonCell(index: number): SeasonCell {
  return {
    seasonId: `season-${index + 1}`,
    roomIncome: null,
    saleableArea: null,
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
  const { control, register, setValue, getValues, reset } = useFormContext();
  // const form = useForm<SeasonalRateFormValues>({
  //   defaultValues: {
  //     seasonCount: 2,
  //     seasonLabels: ['Season 1', 'Season 2'],
  //     rows: [
  //       {
  //         id: 'standard',
  //         roomType: 'Standard',
  //         seasons: [createEmptySeasonCell(0), createEmptySeasonCell(1)],
  //       },
  //     ],
  //   },
  // });

  // const { control, register, setValue, getValues, reset, handleSubmit } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rows',
  });

  const seasonCount = useWatch({ control, name: 'seasonCount' }) ?? 1;
  const rows = useWatch({ control, name: 'rows' }) ?? [];

  useEffect(() => {
    const current = getValues();
    const normalized = normalizeSeasonCount(current, seasonCount);
    reset(normalized);
  }, [seasonCount, getValues, reset]);

  const onAddRoomType = () => {
    append({
      id: crypto.randomUUID(),
      roomType: '',
      seasons: Array.from({ length: seasonCount }, (_, i) => createEmptySeasonCell(i)),
    });
  };

  const onSubmit = (values: SeasonalRateFormValues) => {
    console.log(values);
  };

  return (
    <>
      <div>
        <span>Number of seasons</span>
        <RHFInputCell
          fieldName="seasonCount"
          inputType="number"
          number={{ decimalPlaces: 0, maxIntegerDigits: 3, maxValue: 10, allowNegative: false }}
        />
        <button type="button" onClick={onAddRoomType}>
          Add room type
        </button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full">
          <thead>
            <tr>
              <th rowSpan={2}>Room Type</th>
              {Array.from({ length: seasonCount }, (_, seasonIndex) => (
                <th key={`head-${seasonIndex}`} colSpan={3}>
                  {rows[0]?.seasons?.[seasonIndex]?.seasonId ?? `Season ${seasonIndex + 1}`}
                </th>
              ))}
              <th rowSpan={2}></th>
            </tr>
            <tr>
              {Array.from({ length: seasonCount }, (_, seasonIndex) => (
                <>
                  <th key={`income-${seasonIndex}`}>Room Income</th>
                  <th key={`area-${seasonIndex}`}>Saleable Area</th>
                  <th key={`total-${seasonIndex}`}>Total/Day</th>
                </>
              ))}
            </tr>
          </thead>

          <tbody>
            {fields.map((field, rowIndex) => (
              <tr key={field.id}>
                <td>
                  <RHFInputCell
                    fieldName={`rows.${rowIndex}.roomType`}
                    inputType="select"
                    options={roomTypeParameters.map(p => ({
                      value: p.code,
                      label: p.description,
                    }))}
                  />
                </td>

                {Array.from({ length: seasonCount }, (_, seasonIndex) => {
                  const cell = rows[rowIndex]?.seasons?.[seasonIndex];
                  const total = getRoomIncomePerDay(cell);

                  return (
                    <>
                      <td key={`ri-${field.id}-${seasonIndex}`}>
                        <input
                          type="number"
                          step="0.01"
                          {...register(
                            `rows.${rowIndex}.seasons.${seasonIndex}.roomIncome` as const,
                            { valueAsNumber: true, min: 0 },
                          )}
                        />
                      </td>
                      <td key={`sa-${field.id}-${seasonIndex}`}>
                        <input
                          type="number"
                          step="0.01"
                          {...register(
                            `rows.${rowIndex}.seasons.${seasonIndex}.saleableArea` as const,
                            { valueAsNumber: true, min: 0 },
                          )}
                        />
                      </td>
                      <td key={`td-${field.id}-${seasonIndex}`}>{total.toFixed(2)}</td>
                    </>
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
                const totals = getSeasonTotals(rows, seasonIndex);
                return (
                  <>
                    <td key={`foot-empty-${seasonIndex}`}></td>
                    <td key={`foot-area-${seasonIndex}`}>{totals.saleableArea.toFixed(2)}</td>
                    <td key={`foot-total-${seasonIndex}`}>
                      {totals.totalRoomIncomePerDay.toFixed(2)}
                    </td>
                  </>
                );
              })}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
