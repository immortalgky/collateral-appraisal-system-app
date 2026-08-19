import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import { Dropdown, type ListBoxItem, NumberInput } from '@/shared/components/inputs';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import {
  type Control,
  type FieldValues,
  useController,
  useFieldArray,
  useFormContext,
} from 'react-hook-form';
import { useFormReadOnly } from '@/shared/components/form/context';
import ParameterDisplay from '@/shared/components/ParameterDisplay';

// --- Types ---

interface FormTableProps {
  name: string;
  columns: FormTableColumn[];
  sumColumns?: string[];
  totalFieldName?: string;
  allowOverride?: boolean;
  sequenceField?: string;
}

type FormTableColumn = FormTableRegularColumn | FormTableRowNumberColumn;

interface FormTableRegularColumn {
  name: string;
  label: string;
  inputType?: 'text' | 'number' | 'dropdown';
  width?: string;
  align?: 'left' | 'center' | 'right';
  decimalPlaces?: number;
  maxIntegerDigits?: number;
  allowNegative?: boolean;
  maxLength?: number;
  options?: ListBoxItem[];
  group?: string;
}

interface FormTableRowNumberColumn {
  rowNumberColumn: true;
  label: string;
}

// --- Helpers ---

const isRegular = (col: FormTableColumn): col is FormTableRegularColumn => 'name' in col;
const isRowNum = (col: FormTableColumn): col is FormTableRowNumberColumn =>
  'rowNumberColumn' in col;
const fmtNum = (n: number, dp = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

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
    className={`${size === 7 ? 'shrink-0 w-6 h-6' : 'w-7 h-7'} flex items-center justify-center rounded-md transition-colors ${className}`}
  >
    <Icon style="solid" name={icon} className={iconSize} />
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
      <span className="text-sm font-semibold text-gray-900 text-right block">
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
      <span className="flex-1 text-sm font-semibold text-gray-900 text-right block px-3">
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

  const input = () => {
    if (isNum)
      return (
        <NumberInput
          {...field}
          decimalPlaces={dp}
          maxIntegerDigits={column.maxIntegerDigits}
          allowNegative={column.allowNegative}
        />
      );
    // Spread the whole field (not just value/onChange): without field.ref, react-hook-form has no
    // focusable handle on the dropdown, unlike the number and text branches above.
    // Split branches because Dropdown takes `group` or `options`, and the column type has both optional.
    if (column.inputType === 'dropdown') {
      if (column.options) return <Dropdown {...field} options={column.options} />;
      if (column.group) return <Dropdown {...field} group={column.group} />;
    }
    return <Input type={column.inputType} {...field} maxLength={column.maxLength} />;
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
}: FormTableProps) => {
  const { t } = useTranslation(['request', 'common']);
  const { getValues, setValue, control, watch } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const { fields, append, remove } = useFieldArray({ control, name });
  const values = getValues(name);
  const watchedValues = watch(name);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; index: number | null }>({
    isOpen: false,
    index: null,
  });
  const [isOverridden, setIsOverridden] = useState(false);

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

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    for (const col of columns) if (isRegular(col)) newRow[col.name] = '';
    if (sequenceField) {
      const maxSeq = rowList.reduce((m, r) => Math.max(m, Number(r?.[sequenceField]) || 0), 0);
      newRow[sequenceField] = maxSeq + 1;
    }
    append(newRow);
  };

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

  const calcSum = (col: string): number =>
    (watchedValues || values || []).reduce(
      (s: number, r: Record<string, any>) => s + (parseFloat(r?.[col]) || 0),
      0,
    );
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
                              <ParameterDisplay group={col.group} code={field[col.name]} />
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
                        <IconBtn
                          onClick={() => setDeleteConfirm({ isOpen: true, index: originalIndex })}
                          icon="trash"
                          className="bg-danger-50 text-danger-600 hover:bg-danger-100"
                          title={t('table.deleteRow')}
                        />
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
                      <td key={i} className="py-3 px-4 text-sm font-semibold text-gray-600">
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
      {!isEmpty && !isReadOnly && (
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
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, index: null })}
        onConfirm={() => {
          if (deleteConfirm.index !== null) {
            remove(deleteConfirm.index);
            if (sequenceField) {
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
            }
            setDeleteConfirm({ isOpen: false, index: null });
          }
        }}
        title={t('table.deleteRowTitle')}
        message={t('table.deleteRowMessage')}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
      />
    </div>
  );
};

export default FormTable;
