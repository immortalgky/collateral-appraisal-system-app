import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import {
  type Control,
  type FieldValues,
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { Icon, NumberInput } from '@/shared/components';
import { useFormReadOnly } from '@/shared/components/form/context';
import { useTranslation } from 'react-i18next';

interface CondoAreaDetailFormProps {
  name: string;
}

type AreaRow = {
  areaDescription?: string | null;
  areaSize?: number | string | null;
  sequence?: number;
};

const SEQUENCE = 'sequence';
const USABLE_AREA = 'usableArea';

const toNum = (v: unknown) => {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Row positions in display order — the stored `sequence`, not the array index. */
const displayOrder = (rows: AreaRow[]) =>
  rows
    .map((_, i) => i)
    .sort((a, b) => (Number(rows[a]?.[SEQUENCE]) || 0) - (Number(rows[b]?.[SEQUENCE]) || 0));

// Cells read as plain text until hovered or focused. The scroll target for a cell's error sits on
// an empty anchor beside the input: formLayout.css restyles every input inside a [data-field].
const cellClass =
  'w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[13.5px] text-gray-900 outline-none group-hover:border-gray-200 focus:!border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100';

function DescriptionCell({
  name,
  index,
  control,
  onEnter,
}: {
  name: string;
  index: number;
  control: Control<FieldValues>;
  onEnter: () => void;
}) {
  const path = `${name}.${index}.areaDescription`;
  const { field, fieldState } = useController({ name: path, control });
  return (
    <div>
      <span data-field={path} className="cas-repeater" />
      <input
        {...field}
        id={`${name}-${index}-areaDescription`}
        value={field.value ?? ''}
        maxLength={200}
        placeholder="e.g. Unit, balcony"
        aria-label={`Area detail, row ${index + 1}`}
        className={cellClass}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
        }}
      />
      {fieldState.error && <p className="px-2 text-xs text-danger">{fieldState.error.message}</p>}
    </div>
  );
}

function SizeCell({
  name,
  index,
  control,
  onEnter,
}: {
  name: string;
  index: number;
  control: Control<FieldValues>;
  onEnter: () => void;
}) {
  const path = `${name}.${index}.areaSize`;
  const { field, fieldState } = useController({ name: path, control });
  return (
    <div>
      <span data-field={path} className="cas-repeater" />
      <NumberInput
        {...field}
        id={`${name}-${index}-areaSize`}
        decimalPlaces={2}
        maxIntegerDigits={5}
        placeholder="0.00"
        aria-label={`Area, row ${index + 1}`}
        className={clsx(cellClass, '!text-right tabular-nums !shadow-none')}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
        }}
      />
      {fieldState.error && (
        <p className="px-2 text-right text-xs text-danger">{fieldState.error.message}</p>
      )}
    </div>
  );
}

function CondoAreaDetailForm({ name }: CondoAreaDetailFormProps) {
  const { t } = useTranslation('appraisal');
  const { control, getValues, setValue } = useFormContext();
  const { fields, append, replace } = useFieldArray({ control, name });
  const readOnly = useFormReadOnly();
  const rows: AreaRow[] = useWatch({ control, name }) ?? [];
  const usableArea = useWatch({ control, name: USABLE_AREA });

  const focusIndex = useRef<number | null>(null);

  const order = displayOrder(rows);
  const total = rows.reduce((sum, row) => sum + toNum(row?.areaSize), 0);

  // Writes the rows back in one step, in display order, with `sequence` renumbered 1…n. Setting
  // `sequence` field by field right after remove() wrote through to the removed index and brought
  // the last row back.
  const replaceInOrder = (list: AreaRow[]) =>
    replace(list.map((row, position) => ({ ...row, [SEQUENCE]: position + 1 })));

  const addRow = () => {
    const maxSequence = rows.reduce((m, row) => Math.max(m, Number(row?.[SEQUENCE]) || 0), 0);
    focusIndex.current = rows.length;
    append(
      { areaDescription: '', areaSize: '', [SEQUENCE]: maxSequence + 1 },
      { shouldFocus: false },
    );
  };

  // Focus the new row's first cell once it has rendered.
  useEffect(() => {
    if (focusIndex.current == null || fields.length <= focusIndex.current) return;
    document.getElementById(`${name}-${focusIndex.current}-areaDescription`)?.focus();
    focusIndex.current = null;
  }, [fields.length, name]);

  const move = (index: number, direction: -1 | 1) => {
    const position = order.indexOf(index);
    const target = position + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[position], next[target]] = [next[target], next[position]];
    next.forEach((i, pos) => setValue(`${name}.${i}.${SEQUENCE}`, pos + 1, { shouldDirty: true }));
  };

  const removeRow = (index: number) => {
    const live: AreaRow[] = getValues(name) ?? [];
    replaceInOrder(order.filter(i => i !== index).map(i => live[i]));
  };

  // Enter moves on: description → its area, area → next row's description, last row → a new row.
  const nextFrom = (index: number, cell: 'areaDescription' | 'areaSize') => {
    if (cell === 'areaDescription') {
      document.getElementById(`${name}-${index}-areaSize`)?.focus();
      return;
    }
    const position = order.indexOf(index);
    if (position === order.length - 1) return addRow();
    document.getElementById(`${name}-${order[position + 1]}-areaDescription`)?.focus();
  };

  const isEmpty = rows.length === 0;
  const hasUsableArea = usableArea !== undefined && usableArea !== null && usableArea !== '';
  const difference = total - toNum(usableArea);
  const matches = Math.abs(difference) < 0.005;

  return (
    <div>
      <span data-field={name} className="cas-repeater" />
      <div className="cas-table-card overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('forms.condo.areaDetail')}</h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
              {isEmpty ? (
                'Each part of the unit and its area'
              ) : (
                <>
                  <span>
                    {rows.length} {rows.length === 1 ? 'item' : 'items'} ·{' '}
                    <b className="font-medium tabular-nums text-gray-600">{fmt(total)} m²</b>
                  </span>
                  {hasUsableArea &&
                    (matches ? (
                      <span className="rounded-full bg-primary-50 px-2 text-[11px] font-semibold text-primary-700">
                        Matches Usable Area
                      </span>
                    ) : (
                      <>
                        <span className="rounded-full bg-amber-50 px-2 text-[11px] font-semibold tabular-nums text-amber-700">
                          {difference > 0 ? '+' : '−'}
                          {fmt(Math.abs(difference))} vs Usable Area
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              setValue(USABLE_AREA, Math.round(total * 100) / 100, {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                            }
                            className="text-primary-600 underline underline-offset-2"
                          >
                            ใช้ยอดจากตาราง
                          </button>
                        )}
                      </>
                    ))}
                </>
              )}
            </div>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={addRow}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              + Add area
            </button>
          )}
        </div>

        <div className="overflow-x-auto border-t border-gray-200">
          <table className="w-full min-w-[480px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="w-11 px-2 py-2 text-center font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">
                  {t('fieldLabels.condo.areaDescription')}
                </th>
                <th className="w-40 px-3 py-2 text-right font-semibold">
                  {t('fieldLabels.condo.areaSize')}
                </th>
                {!readOnly && <th className="w-24" aria-hidden />}
              </tr>
            </thead>
            <tbody>
              {isEmpty && (
                <tr>
                  <td colSpan={readOnly ? 3 : 4} className="px-3 py-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="solid" name="ruler-combined" className="size-4 text-gray-300" />
                      <p className="text-sm text-gray-500">No area details yet</p>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={addRow}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          + Add first area
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {order.map((index, position) => {
                const row = rows[index];
                return (
                  <tr
                    key={fields[index]?.id ?? index}
                    className="group border-b border-gray-100 hover:bg-gray-50"
                    onKeyDown={e => {
                      if (readOnly || !e.altKey) return;
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        move(index, e.key === 'ArrowUp' ? -1 : 1);
                      }
                    }}
                  >
                    <td className="px-2 text-center tabular-nums text-gray-400">{position + 1}</td>
                    {readOnly ? (
                      <>
                        <td className="truncate px-3 py-1.5">{row?.areaDescription || '-'}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {row?.areaSize === '' || row?.areaSize == null
                            ? '-'
                            : fmt(toNum(row.areaSize))}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-1 py-0.5">
                          <DescriptionCell
                            name={name}
                            index={index}
                            control={control}
                            onEnter={() => nextFrom(index, 'areaDescription')}
                          />
                        </td>
                        <td className="px-1 py-0.5">
                          <SizeCell
                            name={name}
                            index={index}
                            control={control}
                            onEnter={() => nextFrom(index, 'areaSize')}
                          />
                        </td>
                        <td className="pr-2">
                          <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                            <RowButton
                              icon="arrow-up"
                              label={`Move row ${position + 1} up`}
                              disabled={position === 0}
                              onClick={() => move(index, -1)}
                            />
                            <RowButton
                              icon="arrow-down"
                              label={`Move row ${position + 1} down`}
                              disabled={position === order.length - 1}
                              onClick={() => move(index, 1)}
                            />
                            <RowButton
                              icon="trash"
                              label={`Remove row ${position + 1}`}
                              danger
                              onClick={() => removeRow(index)}
                            />
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}

              {!isEmpty && !readOnly && (
                <tr>
                  <td colSpan={4} className="py-1 pl-12 pr-3">
                    <button
                      type="button"
                      onClick={addRow}
                      className="rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-[11px] text-gray-500 hover:border-primary-500 hover:text-primary-700"
                    >
                      + Add area
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
            {!isEmpty && (
              <tfoot>
                <tr className="border-t-2 border-gray-800 font-bold text-gray-900">
                  <td />
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(total)}</td>
                  {!readOnly && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function RowButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={clsx(
        'flex size-6 items-center justify-center rounded-md text-gray-400 disabled:opacity-30',
        danger
          ? 'enabled:hover:bg-red-50 enabled:hover:text-red-600'
          : 'enabled:hover:bg-gray-200 enabled:hover:text-gray-700',
      )}
    >
      <Icon style="solid" name={icon} className="size-3" />
    </button>
  );
}

export default CondoAreaDetailForm;
