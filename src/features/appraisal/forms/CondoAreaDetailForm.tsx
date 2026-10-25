import { useEffect, useRef } from 'react';
import {
  type Control,
  type FieldValues,
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { Input, NumberInput } from '@/shared/components';
import {
  FormTable,
  FormTableDash,
  FormTableHeading,
  FormTableRowActions,
  type FormTableColumn,
} from '@/shared/components/form';
import { useFormReadOnly } from '@/shared/components/form/context';
import { useTranslation } from 'react-i18next';

interface CondoAreaDetailFormProps {
  name: string;
  /** The "รายละเอียดพื้นที่" sub-heading above the table. A caller whose section is titled the same leaves it out. */
  showTitle?: boolean;
}

type AreaRow = {
  areaDescription?: string | null;
  areaSize?: number | string | null;
  sequence?: number;
};

/** A row with its place in the field array: rows show in `sequence` order, not array order. */
type AreaItem = { index: number; row: AreaRow };

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

// The scroll target for a cell's error sits on an empty anchor beside the input.
function DescriptionCell({
  name,
  index,
  position,
  control,
  onEnter,
}: {
  name: string;
  /** Field-array index: the field path and the element id. */
  index: number;
  /** Place on screen: the row number a screen reader hears. */
  position: number;
  control: Control<FieldValues>;
  onEnter: () => void;
}) {
  const { t } = useTranslation('appraisal');
  const path = `${name}.${index}.areaDescription`;
  const { field, fieldState } = useController({ name: path, control });
  return (
    <div>
      <span data-field={path} />
      <Input
        {...field}
        cell
        id={`${name}-${index}-areaDescription`}
        value={field.value ?? ''}
        maxLength={200}
        placeholder={t('forms.condo.areaDescriptionPlaceholder')}
        aria-label={t('forms.condo.areaDetailRow', { n: position + 1 })}
        error={fieldState.error?.message}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    </div>
  );
}

function SizeCell({
  name,
  index,
  position,
  control,
  onEnter,
}: {
  name: string;
  index: number;
  position: number;
  control: Control<FieldValues>;
  onEnter: () => void;
}) {
  const { t } = useTranslation('appraisal');
  const path = `${name}.${index}.areaSize`;
  const { field, fieldState } = useController({ name: path, control });
  return (
    <div>
      <span data-field={path} />
      <NumberInput
        {...field}
        cell
        id={`${name}-${index}-areaSize`}
        decimalPlaces={2}
        maxIntegerDigits={5}
        placeholder="0.00"
        aria-label={t('forms.condo.areaRow', { n: position + 1 })}
        error={fieldState.error?.message}
        className="text-right tabular-nums"
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    </div>
  );
}

function CondoAreaDetailForm({ name, showTitle = true }: CondoAreaDetailFormProps) {
  const { t } = useTranslation('appraisal');
  const { control, getValues, setValue } = useFormContext();
  const { fields, append, replace } = useFieldArray({ control, name });
  const readOnly = useFormReadOnly();
  const rows: AreaRow[] = useWatch({ control, name }) ?? [];

  const focusIndex = useRef<number | null>(null);

  const order = displayOrder(rows);
  const items: AreaItem[] = order.map(index => ({ index, row: rows[index] }));
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

  // Focus the new row's first cell once it has rendered. The rows come from `useWatch`, which
  // catches up with `fields` one render later, so the cell may not exist yet when `fields` grows:
  // the request stays pending until the element is found.
  useEffect(() => {
    if (focusIndex.current == null) return;
    const cell = document.getElementById(`${name}-${focusIndex.current}-areaDescription`);
    if (!cell) return;
    cell.focus();
    focusIndex.current = null;
  }, [fields.length, rows.length, name]);

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

  const columns: FormTableColumn<AreaItem>[] = [
    { key: 'no', kind: 'index', header: '#' },
    {
      key: 'description',
      kind: 'input',
      header: t('fieldLabels.condo.areaDescription'),
      card: { span: 6, title: ({ row }) => row?.areaDescription },
      cell: ({ index, row }, { readOnly: ro, position }) =>
        ro ? (
          row?.areaDescription || <FormTableDash />
        ) : (
          <DescriptionCell
            name={name}
            index={index}
            position={position}
            control={control}
            onEnter={() => nextFrom(index, 'areaDescription')}
          />
        ),
    },
    {
      key: 'size',
      kind: 'input',
      align: 'end',
      width: '10rem',
      header: t('fieldLabels.condo.areaSize'),
      total: fmt(total),
      cell: ({ index, row }, { readOnly: ro, position }) => {
        if (!ro)
          return (
            <SizeCell
              name={name}
              index={index}
              position={position}
              control={control}
              onEnter={() => nextFrom(index, 'areaSize')}
            />
          );
        return row?.areaSize === '' || row?.areaSize == null ? (
          <FormTableDash />
        ) : (
          fmt(toNum(row.areaSize))
        );
      },
    },
    {
      key: 'actions',
      kind: 'action',
      width: '7rem',
      cell: ({ index }, { position }) => (
        <FormTableRowActions
          position={position}
          count={items.length}
          onMoveUp={() => move(index, -1)}
          onMoveDown={() => move(index, 1)}
          onDelete={() => removeRow(index)}
        />
      ),
    },
  ];

  return (
    <div className="col-span-12">
      <span data-field={name} />
      {showTitle && <FormTableHeading>{t('forms.condo.areaDetail')}</FormTableHeading>}
      <FormTable
        columns={columns}
        rows={items}
        rowKey={item => fields[item.index]?.id ?? item.index}
        rowProps={item => ({
          onKeyDown: e => {
            if (readOnly || !e.altKey) return;
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              move(item.index, e.key === 'ArrowUp' ? -1 : 1);
            }
          },
        })}
        add={[{ label: t('forms.condo.addArea'), onClick: addRow }]}
        empty={{ icon: 'ruler-combined', message: t('forms.condo.areaDetailEmpty') }}
      />
    </div>
  );
}

/**
 * The area table's total against the usable area, shown under the usable-area field: whether they
 * match, and if not, a way to take the table's figure.
 */
export function UsableAreaCheck({ name }: { name: string }) {
  const { t } = useTranslation('appraisal');
  const { setValue } = useFormContext();
  const readOnly = useFormReadOnly();
  const rows: AreaRow[] = useWatch({ name }) ?? [];
  const usableArea = useWatch({ name: USABLE_AREA });

  const hasUsableArea = usableArea !== undefined && usableArea !== null && usableArea !== '';
  if (rows.length === 0 || !hasUsableArea) return null;

  const total = rows.reduce((sum, row) => sum + toNum(row?.areaSize), 0);
  const difference = total - toNum(usableArea);
  if (Math.abs(difference) < 0.005)
    return (
      <span className="whitespace-nowrap rounded-full bg-(--palette-accent-wash) px-2 text-[0.8571rem] font-semibold text-(--palette-accent-ink)">
        {t('forms.condo.matchesUsable')}
      </span>
    );

  return (
    // One line, no flex-wrap.
    <span className="inline-flex items-center gap-x-1.5 whitespace-nowrap">
      <span className="rounded-full bg-(--palette-warn-wash) px-2 text-[0.8571rem] font-semibold tabular-nums text-(--palette-warn)">
        {t('forms.condo.diffVsUsable', {
          diff: `${difference > 0 ? '+' : '−'}${fmt(Math.abs(difference))}`,
        })}
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
          className="text-(--palette-primary-text) underline underline-offset-2"
        >
          {t('forms.condo.useTableTotal')}
        </button>
      )}
    </span>
  );
}

export default CondoAreaDetailForm;
