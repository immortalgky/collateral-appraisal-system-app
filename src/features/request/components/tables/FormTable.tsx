import React, { useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import {
  Dropdown,
  type ListBoxItem,
  type OptionFilter,
  NumberInput,
} from '@/shared/components/inputs';
import ConfirmDeleteButton from '@/shared/components/ConfirmDeleteButton';
import {
  type Control,
  type FieldValues,
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { useFormReadOnly } from '@/shared/components/form/context';
import { evaluateConditions } from '@/shared/components/form/conditions';
import type { FieldCondition } from '@/shared/components/form/types';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { emptyRowFor, isBlankRow, isEmptyCell, isRegular, sumColumn } from './formTableUtils';

// --- Types ---

interface FormTableProps {
  name: string;
  columns: FormTableColumn[];
  sumColumns?: string[];
  totalFieldName?: string;
  allowOverride?: boolean;
  sequenceField?: string;
  /** Leave out the add-row bar under the table — for a parent that puts its own add link elsewhere. */
  hideAddButton?: boolean;
  /** Exposes this table's add-row action to a parent (`ref.current?.()`) while it is mounted. */
  addRowRef?: React.Ref<() => void>;
  /**
   * Keep one empty editable row in the table instead of the "add first item" state: it is put there
   * whenever the array is empty (mount, a reset, the last row deleted), without marking the form
   * dirty. Never in read-only. Default off.
   */
  seedEmptyRow?: boolean;
  /**
   * `plain`: rows of inputs on a grid with no header band, borders or add bar, stacking into
   * label-over-input cards when the table's own container is narrow. Each regular column's `width`
   * is its grid track (default `minmax(0,1fr)`). The first track is always the row-number circle (a
   * `rowNumberColumn` entry is not needed), the last the delete button; no reorder (`sequenceField`
   * is ignored). Default `table`, the daisyUI table every other page uses.
   */
  variant?: 'table' | 'plain';
  /** Label of the total row under a `plain` table (default: the shared "Total"). */
  totalLabel?: string;
}

export type FormTableColumn = FormTableRegularColumn | FormTableRowNumberColumn;

export interface FormTableRegularColumn {
  name: string;
  label: string;
  inputType?: 'text' | 'number' | 'dropdown';
  width?: string;
  align?: 'left' | 'center' | 'right';
  decimalPlaces?: number;
  maxIntegerDigits?: number;
  allowNegative?: boolean;
  maxLength?: number;
  /** Placeholder of the text or number input. */
  placeholder?: string;
  options?: ListBoxItem[];
  group?: string;
  otherField?: boolean;
  otherFieldName?: string;
  otherTriggerValue?: string;
  filterOptions?: OptionFilter;
  /**
   * Disables the cell, and clears it with its "other" text, while this holds for the row.
   * Row-relative, one plain field only: `$root.` and dotted paths are not supported here.
   */
  disableWhen?: FieldCondition;
}

interface FormTableRowNumberColumn {
  rowNumberColumn: true;
  label: string;
}

// --- Helpers ---

const isRowNum = (col: FormTableColumn): col is FormTableRowNumberColumn =>
  'rowNumberColumn' in col;
const fmtNum = (n: number, dp = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

// `plain` variant. Sizes are rem so the viewport step and density scale them with the rest of the UI
// (the mock's 28/30/24px at a 14px root). The stack point is 640px at 14px, measured on the table's
// own container (the card), not the viewport. Class names are written out in full for Tailwind.
const PLAIN_COLS_NARROW = '@max-[45.7143rem]:grid-cols-[2rem_minmax(0,1fr)_2.1429rem]';
const PLAIN_COLS_NARROW_READONLY = '@max-[45.7143rem]:grid-cols-[2rem_minmax(0,1fr)]';
// Top-aligned, so an inline error under one cell does not push its neighbours down.
const PLAIN_ROW = 'grid grid-cols-(--cas-cols) items-start gap-x-[0.5714rem]';
// The row-number circle and delete button (1.7143rem) are centred on the standard 2.5357rem input
// (35.5px at a 14px root): 0.4107rem down, plus the label a stacked row shows above its input
// (1.5357rem) when the table is narrow.
const PLAIN_ROW_ACTION = 'mt-[0.4107rem] @max-[45.7143rem]:mt-[1.9464rem]';
const PlainReadOnlyValue = ({
  column,
  row,
}: {
  column: FormTableRegularColumn;
  row: Record<string, unknown>;
}) => {
  const raw = row[column.name];
  const text = raw == null ? '' : String(raw);
  const other = column.otherFieldName ? String(row[column.otherFieldName] ?? '') : '';
  if (column.inputType === 'dropdown' && column.group && text) {
    return (
      <>
        <ParameterDisplay group={column.group} code={text} />
        {column.otherField && text === (column.otherTriggerValue ?? '99') && other && (
          <> — {other}</>
        )}
      </>
    );
  }
  if (column.inputType === 'number') {
    const n = parseFloat(text);
    return isNaN(n) ? '—' : fmtNum(n, column.decimalPlaces ?? 2);
  }
  return text || '—';
};

const IconBtn = ({
  onClick,
  icon,
  size = 8,
  iconSize = 'size-3.5',
  className,
  title,
}: {
  onClick: () => void;
  icon: string;
  size?: 7 | 8;
  iconSize?: string;
  className: string;
  title: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`${size === 7 ? 'shrink-0 w-6 h-6' : 'w-7 h-7'} flex items-center justify-center rounded-md transition-colors ${className}`}
  >
    <Icon style="solid" name={icon} className={iconSize} />
  </button>
);

// --- AddRowButton: the tinted "+ add" action a parent puts in its section header ---

export const AddRowButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
  >
    <Icon style="solid" name="plus" className="size-3" /> {label}
  </button>
);

// --- TotalCell: the sum column in tfoot ---

const TotalCell = ({
  value,
  calculatedTotal,
  totalFieldName,
  isOverridden,
  isReadOnly,
  allowOverride,
  onOverride,
  onReset,
  onSetValue,
}: {
  value: number;
  calculatedTotal: number;
  totalFieldName?: string;
  isOverridden: boolean;
  isReadOnly: boolean;
  allowOverride: boolean;
  onOverride: () => void;
  onReset: () => void;
  onSetValue: (v: any) => void;
}) => {
  const { t } = useTranslation('request');

  if (isReadOnly || !totalFieldName) {
    return (
      <span className="text-sm font-semibold text-gray-900 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink-strong)] text-right block">
        {fmtNum(totalFieldName ? value : calculatedTotal)}
      </span>
    );
  }

  if (isOverridden) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <NumberInput
            value={value}
            onChange={e => onSetValue(e.target.value)}
            decimalPlaces={2}
            className="!bg-amber-50 !border-amber-300 font-semibold"
          />
          <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px]">
            <Icon style="solid" name="pen" className="size-2" />
          </span>
        </div>
        <IconBtn
          size={7}
          onClick={onReset}
          icon="rotate-left"
          className="bg-primary/10 text-primary hover:bg-primary/20"
          title={t('table.resetToCalculated')}
        />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm font-semibold text-gray-900 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink-strong)] text-right block px-3">
        {fmtNum(value)}
      </span>
      {allowOverride && (
        <IconBtn
          size={7}
          onClick={onOverride}
          icon="pen"
          className="bg-primary/10 text-primary hover:bg-primary/20"
          title={t('table.overrideTotal')}
        />
      )}
    </div>
  );
};

// --- SequenceCell: editable position input driving reorder ---

const SequenceCell = ({
  name,
  index,
  sequenceField,
  total,
  control,
  onCommit,
}: {
  name: string;
  index: number;
  sequenceField: string;
  total: number;
  control: Control<FieldValues>;
  onCommit: (fromIndex: number, target: number) => void;
}) => {
  const { field } = useController({ name: `${name}.${index}.${sequenceField}`, control });

  return (
    <NumberInput
      {...field}
      decimalPlaces={0}
      allowNegative={false}
      thousandSeparator={false}
      min={1}
      max={total}
      className="!text-center"
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      onBlur={() => {
        field.onBlur();
        onCommit(index, Number(field.value) || index + 1);
      }}
    />
  );
};

// --- DropdownOtherCell: dropdown + inline "Other" text field ---

const DropdownOtherCell = ({
  name,
  index,
  column,
  control,
  field,
  filterWatchValues,
  disabled,
}: {
  name: string;
  index: number;
  column: FormTableRegularColumn;
  control: Control<FieldValues, any, FieldValues>;
  field: ReturnType<typeof useController>['field'];
  filterWatchValues?: Record<string, unknown>;
  disabled?: boolean;
}) => {
  const {
    field: otherField,
    fieldState: { error: otherError },
  } = useController({
    name: `${name}.${index}.${column.otherFieldName}`,
    control,
  });

  if (!column.group) return null;

  return (
    <Dropdown
      {...field}
      disabled={disabled}
      group={column.group}
      filterOptions={column.filterOptions}
      filterWatchValues={filterWatchValues}
      otherField
      otherTriggerValue={column.otherTriggerValue}
      otherText={otherField.value}
      onOtherTextChange={otherField.onChange}
      otherMaxLength={column.maxLength}
      error={otherError?.message}
    />
  );
};

// --- TableCell ---

const TableCell = ({
  name,
  index,
  column,
  control,
}: {
  name: string;
  index: number;
  column: FormTableRegularColumn;
  control: Control<FieldValues, any, FieldValues>;
}) => {
  const {
    field,
    fieldState: { error },
  } = useController({ name: `${name}.${index}.${column.name}`, control });
  const isNum = column.inputType === 'number';
  const dp = column.decimalPlaces ?? 2;

  const rowField = column.filterOptions?.type === 'dynamic' ? column.filterOptions.field : null;
  // ponytail: one watch serves the option filter and disableWhen, so they must name the same field
  const watchedField = rowField ?? column.disableWhen?.field;
  const rowFieldValue = useWatch({
    control,
    name: `${name}.${index}.${watchedField ?? column.name}`,
  });
  const filterWatchValues = rowField ? { [rowField]: rowFieldValue } : undefined;

  const { setValue, getValues, getFieldState, clearErrors } = useFormContext();
  const disabled =
    !!column.disableWhen &&
    evaluateConditions(column.disableWhen, { [column.disableWhen.field]: rowFieldValue }, '');
  const isDisabled = disabled || field.disabled;
  const { value, onChange } = field;
  React.useEffect(() => {
    if (!disabled) return;
    const cell = `${name}.${index}.${column.name}`;
    const other = column.otherFieldName ? `${name}.${index}.${column.otherFieldName}` : null;
    if (!isEmptyCell(value)) onChange(null);
    if (other && !isEmptyCell(getValues(other))) setValue(other, null);
    // also when already empty, so a stale "required" error goes
    const paths = other ? [cell, other] : [cell];
    if (paths.some(path => getFieldState(path).error)) clearErrors(paths);
  }, [
    disabled,
    value,
    onChange,
    setValue,
    getValues,
    getFieldState,
    clearErrors,
    name,
    index,
    column.name,
    column.otherFieldName,
  ]);

  const input = () => {
    if (isNum)
      return (
        <NumberInput
          {...field}
          decimalPlaces={dp}
          maxIntegerDigits={column.maxIntegerDigits}
          allowNegative={column.allowNegative}
          placeholder={column.placeholder}
          disabled={isDisabled}
        />
      );
    // Spread the whole field (not just value/onChange): without field.ref, react-hook-form has no
    // focusable handle on the dropdown, unlike the number and text branches above.
    // Split branches because Dropdown takes `group` or `options`, and the column type has both optional.
    if (column.inputType === 'dropdown') {
      if (column.options)
        return <Dropdown {...field} disabled={isDisabled} options={column.options} />;
      if (column.group) {
        if (column.otherField && column.otherFieldName) {
          return (
            <DropdownOtherCell
              name={name}
              index={index}
              column={column}
              control={control}
              field={field}
              filterWatchValues={filterWatchValues}
              disabled={isDisabled}
            />
          );
        }
        return (
          <Dropdown
            {...field}
            disabled={isDisabled}
            group={column.group}
            filterOptions={column.filterOptions}
            filterWatchValues={filterWatchValues}
          />
        );
      }
    }
    return (
      <Input
        type={column.inputType}
        {...field}
        maxLength={column.maxLength}
        placeholder={column.placeholder}
        disabled={isDisabled}
      />
    );
  };

  return (
    <div data-field={`${name}.${index}.${column.name}`}>
      {input()}
      {error && <div className="mt-1 text-sm text-danger">{error?.message}</div>}
    </div>
  );
};

// --- FormTable ---

const FormTable = ({
  name,
  columns,
  sumColumns = [],
  totalFieldName,
  allowOverride = false,
  sequenceField,
  hideAddButton = false,
  addRowRef,
  seedEmptyRow = false,
  variant = 'table',
  totalLabel,
}: FormTableProps) => {
  const { t } = useTranslation(['request', 'common']);
  const { getValues, setValue, control, watch } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const { fields, append, remove } = useFieldArray({ control, name });
  const values = getValues(name);
  const watchedValues = watch(name);
  const [isOverridden, setIsOverridden] = useState(false);

  const deleteRow = (index: number) => {
    remove(index);
    if (!sequenceField) return;
    const remaining = (getValues(name) as Record<string, unknown>[] | undefined) ?? [];
    remaining
      .map((_, i) => i)
      .sort(
        (a, b) =>
          (Number(remaining[a]?.[sequenceField]) || 0) -
          (Number(remaining[b]?.[sequenceField]) || 0),
      )
      .forEach((origIdx, pos) => {
        setValue(`${name}.${origIdx}.${sequenceField}`, pos + 1, { shouldDirty: true });
      });
  };

  // Display order from the current sequence values
  const rowList = (values as Record<string, unknown>[] | undefined) ?? [];
  const displayOrder = sequenceField
    ? rowList
        .map((_, i) => i)
        .sort(
          (a, b) =>
            (Number(rowList[a]?.[sequenceField]) || 0) - (Number(rowList[b]?.[sequenceField]) || 0),
        )
    : rowList.map((_, i) => i);

  // Reads the rows when it runs, not from this render, so the copy a parent holds never goes stale.
  const handleAddRow = React.useCallback(() => {
    const newRow = emptyRowFor(columns);
    if (sequenceField) {
      const current = (getValues(name) as Record<string, unknown>[] | undefined) ?? [];
      const maxSeq = current.reduce((m, r) => Math.max(m, Number(r?.[sequenceField]) || 0), 0);
      newRow[sequenceField] = maxSeq + 1;
    }
    append(newRow);
  }, [columns, sequenceField, getValues, name, append]);
  useImperativeHandle(addRowRef, () => handleAddRow, [handleAddRow]);

  // Reads the array when it runs (not from this render) so a reset that lands first is not undone.
  // Not dirty: the row is the page's starting point, not an edit.
  const seeding = seedEmptyRow && !isReadOnly;
  const rowCount = rowList.length;
  React.useEffect(() => {
    if (!seeding || rowCount > 0) return;
    if (((getValues(name) as unknown[] | undefined) ?? []).length > 0) return;
    setValue(name, [emptyRowFor(columns)], { shouldDirty: false });
  }, [seeding, rowCount, name, columns, getValues, setValue]);

  const handleSequenceCommit = (originalIndex: number, rawTarget: number) => {
    if (!sequenceField) return;
    const total = displayOrder.length;
    if (total === 0) return;
    const currentPos = displayOrder.indexOf(originalIndex);
    const targetPos = Math.min(Math.max(Math.round(rawTarget) || currentPos + 1, 1), total) - 1;
    const newOrder = [...displayOrder];
    if (targetPos !== currentPos) {
      newOrder.splice(currentPos, 1);
      newOrder.splice(targetPos, 0, originalIndex);
    }
    newOrder.forEach((origIdx, pos) => {
      setValue(`${name}.${origIdx}.${sequenceField}`, pos + 1, { shouldDirty: true });
    });
  };

  const calcSum = (col: string): number => sumColumn(watchedValues || values, col);
  const calculatedTotal = sumColumns.length > 0 ? calcSum(sumColumns[0]) : 0;

  React.useEffect(() => {
    if (totalFieldName && !isOverridden) setValue(totalFieldName, calculatedTotal);
  }, [calculatedTotal, totalFieldName, isOverridden, setValue]);

  const handleResetTotal = () => {
    setIsOverridden(false);
    if (totalFieldName) setValue(totalFieldName, calculatedTotal);
  };

  const isEmpty = values?.length === 0;
  const hasSumRow = sumColumns.length > 0 && !isEmpty;
  const colSpan = isReadOnly ? columns.length : columns.length + 1;
  const colStyle = (col: FormTableColumn) =>
    isRowNum(col)
      ? { width: '60px' }
      : { width: (col as FormTableRegularColumn).width ?? 'auto', minWidth: '100px' };

  if (variant === 'plain') {
    const regular = columns.filter(isRegular);
    // The row-number circle is always the first track, whether or not the columns list a
    // `rowNumberColumn`; each regular column is one track, and the delete button the last.
    const cols = [
      '2rem',
      ...regular.map(c => c.width ?? 'minmax(0,1fr)'),
      ...(isReadOnly ? [] : ['2.1429rem']),
    ].join(' ');
    const rowClass = clsx(PLAIN_ROW, isReadOnly ? PLAIN_COLS_NARROW_READONLY : PLAIN_COLS_NARROW);
    return (
      <div data-field={name} className="@container">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-1.5 py-4">
            <div className="flex size-9 items-center justify-center rounded-full bg-gray-100">
              <Icon style="regular" name="inbox" className="size-4 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500">{t('table.noData')}</p>
            {!isReadOnly && <AddRowButton onClick={handleAddRow} label={t('table.addFirstItem')} />}
          </div>
        ) : (
          <div style={{ '--cas-cols': cols } as React.CSSProperties}>
            <div
              className={clsx(
                rowClass,
                'pb-[0.2857rem] text-xs font-semibold text-gray-600 @max-[45.7143rem]:hidden',
              )}
            >
              <span>#</span>
              {regular.map(col => (
                <span key={col.name} className={clsx(col.align === 'right' && 'text-right')}>
                  {col.label}
                </span>
              ))}
              {!isReadOnly && <span />}
            </div>
            {displayOrder.map((originalIndex, displayPos) => {
              const row = rowList[originalIndex] as Record<string, unknown>;
              return (
                <div
                  key={fields[originalIndex]?.id ?? originalIndex}
                  className={clsx(
                    rowClass,
                    'py-[0.2143rem] @max-[45.7143rem]:border-b @max-[45.7143rem]:border-gray-100 @max-[45.7143rem]:py-2',
                  )}
                >
                  <span
                    className={clsx(
                      'grid size-[1.7143rem] place-items-center rounded-full bg-gray-100 text-xs font-medium text-gray-600',
                      PLAIN_ROW_ACTION,
                    )}
                  >
                    {displayPos + 1}
                  </span>
                  {regular.map((col, ri) => (
                    <div
                      key={col.name}
                      className={clsx('min-w-0', ri > 0 && '@max-[45.7143rem]:col-start-2')}
                    >
                      <span className="mb-1 hidden text-xs text-gray-500 @max-[45.7143rem]:block">
                        {col.label}
                      </span>
                      {isReadOnly ? (
                        <div
                          className={clsx(
                            'py-[0.5714rem] text-sm',
                            col.align === 'right' || col.inputType === 'number'
                              ? 'text-right tabular-nums'
                              : 'truncate',
                          )}
                        >
                          <PlainReadOnlyValue column={col} row={row} />
                        </div>
                      ) : (
                        <TableCell
                          name={name}
                          index={originalIndex}
                          column={col}
                          control={control}
                        />
                      )}
                    </div>
                  ))}
                  {!isReadOnly && (
                    <div
                      className={clsx(
                        'flex justify-end @max-[45.7143rem]:col-start-3 @max-[45.7143rem]:row-start-1',
                        PLAIN_ROW_ACTION,
                      )}
                    >
                      <ConfirmDeleteButton
                        onConfirm={() => deleteRow(originalIndex)}
                        rowNumber={displayPos + 1}
                        disabled={seeding && rowCount === 1 && isBlankRow(row, columns)}
                        className="flex size-[1.7143rem] items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                      >
                        <Icon style="solid" name="trash" className="size-3.5" />
                      </ConfirmDeleteButton>
                    </div>
                  )}
                </div>
              );
            })}
            {hasSumRow && (
              <div className="mt-[0.5714rem] flex items-center gap-3.5 rounded-b-lg border-t-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 tabular-nums">
                <span className="mr-auto">{totalLabel ?? t('table.total')}</span>
                {isOverridden && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                    {t('table.override')}
                  </span>
                )}
                {/* Right edge on the last input's, not the delete column's: that column and its gap
                    (2.7143rem) less the footer's own 0.75rem padding. */}
                <div
                  className={clsx(
                    'min-w-[8rem]',
                    !isReadOnly && 'mr-[1.9643rem] @max-[45.7143rem]:mr-0',
                  )}
                >
                  <TotalCell
                    value={
                      totalFieldName ? (watch(totalFieldName) ?? calculatedTotal) : calculatedTotal
                    }
                    calculatedTotal={calculatedTotal}
                    totalFieldName={totalFieldName}
                    isOverridden={isOverridden}
                    isReadOnly={isReadOnly}
                    allowOverride={allowOverride}
                    onOverride={() => setIsOverridden(true)}
                    onReset={handleResetTotal}
                    onSetValue={v => totalFieldName && setValue(totalFieldName, v)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    // Anchored on the array name so an "at least 1 item" error still has somewhere to scroll to:
    // when the array is empty there are no rows, hence no per-cell data-field.
    <div data-field={name}>
      <table className="table w-full table-fixed">
        <thead>
          <tr className="bg-primary/10">
            {columns.map((col, i) => (
              <th
                key={i}
                style={colStyle(col)}
                className={`text-primary text-xs font-semibold py-2 px-3 ${'align' in col && col.align ? `text-${col.align}` : 'text-left'} first:rounded-tl-lg ${isReadOnly && i === columns.length - 1 ? 'rounded-tr-lg' : ''}`}
              >
                {col.label}
              </th>
            ))}
            {!isReadOnly && (
              <th
                className="text-primary text-xs font-semibold py-2 px-3 text-right rounded-tr-lg"
                style={{ width: '60px' }}
              ></th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isEmpty ? (
            <tr>
              <td colSpan={colSpan} className="py-4 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon style="regular" name="inbox" className="size-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">{t('table.noData')}</p>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
                    >
                      <Icon style="solid" name="plus" className="size-3" />{' '}
                      {t('table.addFirstItem')}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            displayOrder.map((originalIndex, displayPos) => {
              const field = rowList[originalIndex] as Record<string, any>;
              return (
                <tr
                  key={fields[originalIndex]?.id ?? originalIndex}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {columns.map((col, ci) =>
                    isRegular(col) ? (
                      <td key={ci} className="py-1.5 px-3">
                        {isReadOnly ? (
                          <div
                            className={
                              col.inputType === 'number' ? 'text-right text-sm' : 'text-sm truncate'
                            }
                          >
                            {col.inputType === 'dropdown' && col.group ? (
                              <>
                                <ParameterDisplay group={col.group} code={field[col.name]} />
                                {col.otherField &&
                                  col.otherFieldName &&
                                  field[col.name] === (col.otherTriggerValue ?? '99') &&
                                  field[col.otherFieldName] && <> — {field[col.otherFieldName]}</>}
                              </>
                            ) : col.inputType === 'number' ? (
                              (() => {
                                const n = parseFloat(field[col.name]);
                                return isNaN(n) ? '-' : fmtNum(n, col.decimalPlaces ?? 2);
                              })()
                            ) : (
                              (field[col.name] ?? '-')
                            )}
                          </div>
                        ) : (
                          <TableCell
                            name={name}
                            index={originalIndex}
                            column={col}
                            control={control}
                          />
                        )}
                      </td>
                    ) : sequenceField && !isReadOnly ? (
                      <td key={ci} className="py-1.5 px-3" style={{ width: '60px' }}>
                        <SequenceCell
                          name={name}
                          index={originalIndex}
                          sequenceField={sequenceField}
                          total={displayOrder.length}
                          control={control}
                          onCommit={handleSequenceCommit}
                        />
                      </td>
                    ) : (
                      <td key={ci} className="py-1.5 px-3" style={{ width: '60px' }}>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                          {displayPos + 1}
                        </span>
                      </td>
                    ),
                  )}
                  {!isReadOnly && (
                    <td className="py-1.5 px-3">
                      <div className="flex gap-1 justify-end">
                        <ConfirmDeleteButton
                          onConfirm={() => deleteRow(originalIndex)}
                          rowNumber={displayPos + 1}
                          // The seeded row comes back the moment it goes, so there is nothing to delete
                          disabled={seeding && rowCount === 1 && isBlankRow(field, columns)}
                          className="cas-row-btn flex h-7 w-7 items-center justify-center rounded-md bg-danger-50 text-danger-600 transition-colors hover:bg-danger-100"
                        >
                          <Icon style="solid" name="trash" className="size-3.5" />
                        </ConfirmDeleteButton>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
        {hasSumRow && (
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              {(() => {
                let labelRendered = false;
                return columns.map((col, i) => {
                  if (isRegular(col) && sumColumns.includes(col.name)) {
                    const total = totalFieldName
                      ? (watch(totalFieldName) ?? calculatedTotal)
                      : calculatedTotal;
                    return (
                      <td
                        key={i}
                        className={`py-1.5 px-3 ${col.align === 'right' ? 'text-right' : ''}`}
                      >
                        <TotalCell
                          value={total}
                          calculatedTotal={calculatedTotal}
                          totalFieldName={totalFieldName}
                          isOverridden={isOverridden}
                          isReadOnly={isReadOnly}
                          allowOverride={allowOverride}
                          onOverride={() => setIsOverridden(true)}
                          onReset={handleResetTotal}
                          onSetValue={v => totalFieldName && setValue(totalFieldName, v)}
                        />
                      </td>
                    );
                  }
                  if (isRowNum(col)) return <td key={i} className="py-1.5 px-3" />;
                  if (!labelRendered) {
                    labelRendered = true;
                    return (
                      <td
                        key={i}
                        className="py-3 px-4 text-sm font-semibold text-gray-600 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink-2)]"
                      >
                        <div className="flex items-center gap-2">
                          {t('table.total')}
                          {isOverridden && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                              {t('table.override')}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  }
                  return <td key={i} className="py-1.5 px-3" />;
                });
              })()}
              {!isReadOnly && <td className="py-1.5 px-3" />}
            </tr>
          </tfoot>
        )}
      </table>
      {!isEmpty && !isReadOnly && !hideAddButton && (
        <div className="border-t border-gray-100">
          <button
            type="button"
            onClick={handleAddRow}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary bg-gray-50 hover:bg-primary/10 transition-colors rounded-b-lg"
          >
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Icon style="solid" name="plus" className="size-2.5 text-white" />
            </div>
            {t('table.addRow')}
          </button>
        </div>
      )}
    </div>
  );
};

export default FormTable;
