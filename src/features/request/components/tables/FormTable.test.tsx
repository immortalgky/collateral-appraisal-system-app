import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import FormTable, { type FormTableColumn, type FormTableRegularColumn } from './FormTable';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import { emptyRowFor, isBlankRow, sumColumn } from './formTableUtils';
import type { GetRequestByIdResultType } from '../../api';
import { PROPERTY_COLUMNS } from '../../configs/tableColumns';
import { mapRequestResponseToForm } from '../../utils/mappers';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const columns: FormTableColumn[] = [
  { rowNumberColumn: true, label: '#' },
  { name: 'item', label: 'Item', inputType: 'text' },
  { name: 'qty', label: 'Qty', inputType: 'number' },
];

let methods: UseFormReturn<Record<string, unknown>>;

function Harness({
  hideAddButton,
  addRowRef,
  rows = [{ item: 'a', qty: '1' }],
  seedEmptyRow,
  readOnly = false,
  variant,
  cols = columns,
  sumColumns,
}: {
  hideAddButton?: boolean;
  addRowRef?: React.Ref<() => void>;
  rows?: Record<string, unknown>[];
  seedEmptyRow?: boolean;
  readOnly?: boolean;
  variant?: 'table' | 'plain';
  cols?: FormTableColumn[];
  sumColumns?: string[];
}) {
  methods = useForm<Record<string, unknown>>({ defaultValues: { rows } });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...methods}>
        <FormTable
          name="rows"
          columns={cols}
          variant={variant}
          sumColumns={sumColumns}
          totalLabel="Sum"
          hideAddButton={hideAddButton}
          addRowRef={addRowRef}
          seedEmptyRow={seedEmptyRow}
        />
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
}

const bodyRows = () => document.querySelectorAll('tbody > tr').length;

describe('FormTable add-row API', () => {
  it('renders its own add bar by default', () => {
    render(<Harness />);
    expect(screen.getByText('table.addRow')).toBeInTheDocument();
  });

  it('does not render the add bar with hideAddButton', () => {
    render(<Harness hideAddButton />);
    expect(screen.queryByText('table.addRow')).not.toBeInTheDocument();
  });

  it('exposes its add action through addRowRef: one row, shaped by emptyRowFor', () => {
    const ref = createRef<() => void>();
    render(<Harness hideAddButton addRowRef={ref} />);
    expect(bodyRows()).toBe(1);
    expect(ref.current).toBeTypeOf('function');

    act(() => ref.current!());

    expect(bodyRows()).toBe(2);
    expect(methods.getValues('rows')).toEqual([{ item: 'a', qty: '1' }, emptyRowFor(columns)]);
  });

  it('clears addRowRef when the table unmounts', () => {
    const ref = createRef<() => void>();
    const { unmount } = render(<Harness addRowRef={ref} />);
    expect(ref.current).not.toBeNull();
    unmount();
    expect(ref.current).toBeNull();
  });
});

describe('FormTable seedEmptyRow', () => {
  it('is off by default: an empty table shows the add-first-item state', () => {
    render(<Harness rows={[]} />);
    expect(screen.getByText('table.addFirstItem')).toBeInTheDocument();
    expect(methods.getValues('rows')).toEqual([]);
  });

  it('puts one empty editable row in an empty table, without marking the form dirty', () => {
    render(<Harness rows={[]} seedEmptyRow />);
    expect(screen.queryByText('table.addFirstItem')).not.toBeInTheDocument();
    expect(bodyRows()).toBe(1);
    expect(methods.getValues('rows')).toEqual([emptyRowFor(columns)]);
    expect(methods.formState.isDirty).toBe(false);
  });

  it('leaves rows that are already there alone', () => {
    render(<Harness seedEmptyRow />);
    expect(methods.getValues('rows')).toEqual([{ item: 'a', qty: '1' }]);
  });

  it('seeds again after a reset to an empty array, as the page does when it opens', () => {
    render(<Harness seedEmptyRow />);
    act(() => methods.reset({ rows: [] }));
    expect(methods.getValues('rows')).toEqual([emptyRowFor(columns)]);
  });

  it('seeds nothing when read-only', () => {
    render(<Harness rows={[]} seedEmptyRow readOnly />);
    expect(methods.getValues('rows')).toEqual([]);
  });

  const deleteButton = () => document.querySelector('tbody button') as HTMLButtonElement;

  it('cannot delete the lone empty row, which would only come back', () => {
    render(<Harness rows={[]} seedEmptyRow />);
    expect(deleteButton()).toBeDisabled();
  });

  it('can delete a row that has data', () => {
    render(<Harness seedEmptyRow />);
    expect(deleteButton()).not.toBeDisabled();
  });
});

describe('FormTable variant', () => {
  const plainCols: FormTableColumn[] = [
    { rowNumberColumn: true, label: 'No.' },
    { name: 'item', label: 'Item', inputType: 'text', placeholder: 'Type an item' },
    { name: 'qty', label: 'Qty', inputType: 'number', width: '9rem' },
  ];

  it('default is the daisyUI table, unchanged', () => {
    render(<Harness />);
    expect(document.querySelector('table')).toBeInTheDocument();
    expect(document.querySelector('[style*="--cas-cols"]')).not.toBeInTheDocument();
  });

  it('plain renders rows on a grid, not a table, with a # header and the row-number circle', () => {
    render(<Harness variant="plain" cols={plainCols} hideAddButton />);
    expect(document.querySelector('table')).not.toBeInTheDocument();
    expect(screen.getByText('#')).toBeInTheDocument();
    // the header, and the label a stacked row shows above its input
    expect(screen.getAllByText('Item')).toHaveLength(2);
    expect(screen.getByPlaceholderText('Type an item')).toHaveValue('a');
    expect(document.querySelector('[style*="--cas-cols"]')).toHaveStyle({
      '--cas-cols': '2rem minmax(0,1fr) 9rem 2.1429rem',
    });
    expect(screen.queryByText('table.addRow')).not.toBeInTheDocument();
  });

  it("plain keeps the sum row, with the caller's label", () => {
    render(<Harness variant="plain" cols={plainCols} sumColumns={['qty']} hideAddButton />);
    expect(screen.getByText('Sum')).toBeInTheDocument();
  });

  it('plain shows inline errors under the cell', () => {
    render(<Harness variant="plain" cols={plainCols} hideAddButton />);
    act(() => methods.setError('rows.0.item', { type: 'required', message: 'Item is required' }));
    expect(screen.getByText('Item is required')).toBeInTheDocument();
  });

  it('plain read-only shows plain values and a dash for an empty one', () => {
    render(<Harness variant="plain" cols={plainCols} rows={[{ item: 'a', qty: '' }]} readOnly />);
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('plain seeds a row and keeps the lone blank row undeletable', () => {
    render(<Harness variant="plain" cols={plainCols} rows={[]} seedEmptyRow hideAddButton />);
    expect(methods.getValues('rows')).toEqual([emptyRowFor(plainCols)]);
    expect(document.querySelector('button')).toBeDisabled();
  });
});

describe('FormTable disableWhen', () => {
  const disableWhen = { field: 'type', is: ['L'], operator: 'in' } as const;
  const gated: FormTableColumn[] = [
    { name: 'type', label: 'Type', inputType: 'text' },
    {
      name: 'kind',
      label: 'Kind',
      inputType: 'dropdown',
      options: [{ value: 'x', label: 'X' }],
      disableWhen,
    },
  ];
  // the Building Type shape: a parameter group with an inline "other" text (DropdownOtherCell)
  const withOther: FormTableColumn[] = [
    gated[0],
    {
      name: 'kind',
      label: 'Kind',
      inputType: 'dropdown',
      group: 'Kind',
      otherField: true,
      otherFieldName: 'kindOther',
      disableWhen,
    },
  ];
  const cell = (row: number) =>
    document.querySelector<HTMLButtonElement>(`[data-field="rows.${row}.kind"] button`)!;

  it('disables the cell of a matching row and clears it, leaving the others', () => {
    render(
      <Harness
        cols={gated}
        hideAddButton
        rows={[
          { type: 'L', kind: 'x' },
          { type: 'LB', kind: 'x' },
        ]}
      />,
    );
    expect(methods.getValues('rows')).toEqual([
      { type: 'L', kind: null },
      { type: 'LB', kind: 'x' },
    ]);
    expect(cell(0)).toBeDisabled();
    expect(cell(1)).not.toBeDisabled();
  });

  it('clears the cell and its "other" text when the user changes one row\'s type to a matching one', () => {
    render(<Harness cols={withOther} rows={[{ type: 'LB', kind: '99', kindOther: 'x' }]} />);
    act(() => methods.setValue('rows.0.type' as never, 'L' as never));
    expect(methods.getValues('rows.0')).toEqual({ type: 'L', kind: null, kindOther: null });
  });

  it('drops a stale error on the cell when the type changes in place', () => {
    render(<Harness cols={gated} rows={[{ type: 'LB', kind: null }]} />);
    act(() => methods.setError('rows.0.kind' as never, { message: 'required' }));
    expect(methods.getFieldState('rows.0.kind' as never).error).toBeDefined();
    act(() => methods.setValue('rows.0.type' as never, 'L' as never));
    expect(methods.getFieldState('rows.0.kind' as never).error).toBeUndefined();
  });

  it('clears the cell when its options are also filtered by the same field', () => {
    const filtered: FormTableColumn[] = [
      gated[0],
      {
        ...(withOther[1] as FormTableRegularColumn),
        filterOptions: { type: 'dynamic', field: 'type', map: { LB: ['x'] } },
      },
    ];
    render(<Harness cols={filtered} rows={[{ type: 'LB', kind: '99', kindOther: 'x' }]} />);
    act(() => methods.setValue('rows.0.type' as never, 'L' as never));
    expect(methods.getValues('rows.0')).toEqual({ type: 'L', kind: null, kindOther: null });
  });

  it('clears the "other" text even when the cell itself is already empty', () => {
    render(<Harness cols={withOther} rows={[{ type: 'L', kind: null, kindOther: 'x' }]} />);
    expect(methods.getValues('rows.0.kindOther')).toBeNull();
  });

  it('enables the cell again when the gate changes back to a non-matching value', () => {
    render(<Harness cols={gated} rows={[{ type: 'L', kind: null }]} />);
    expect(cell(0)).toBeDisabled();
    act(() => methods.setValue('rows.0.type' as never, 'LB' as never));
    expect(cell(0)).not.toBeDisabled();
  });

  it('leaves a legacy row pristine once the real mapper has cleaned it, dirty if it had not', () => {
    const legacy = [
      { propertyType: 'L', buildingType: '99', buildingTypeOther: 'x', sellingPrice: 1 },
    ];
    const mapped = mapRequestResponseToForm({
      properties: legacy,
    } as unknown as GetRequestByIdResultType).properties;
    render(<Harness cols={PROPERTY_COLUMNS} rows={[]} />);

    act(() => methods.reset({ rows: mapped }));
    expect(methods.formState.dirtyFields).toEqual({});
    expect(methods.getValues('rows.0')).toMatchObject({ buildingType: null });

    // the same row without the mapper is changed by the table, and the form says so
    act(() => methods.reset({ rows: legacy }));
    expect(methods.formState.dirtyFields).toEqual({ rows: [{ buildingType: true }] });
  });

  it('clears the "other" text and a stale error with it', () => {
    render(<Harness cols={withOther} rows={[{ type: 'LB', kind: '99', kindOther: 'x' }]} />);
    act(() => methods.setError('rows.0.kind', { message: 'required' }));
    act(() => methods.setValue('rows', [{ type: 'L', kind: '99', kindOther: 'x' }]));
    expect(methods.getValues('rows.0')).toEqual({ type: 'L', kind: null, kindOther: null });
    expect(methods.formState.errors.rows).toBeUndefined();
  });
});

describe('formTableUtils', () => {
  it('tells a blank row from one with data', () => {
    expect(isBlankRow({ item: '', qty: null }, columns)).toBe(true);
    expect(isBlankRow({ item: 'a', qty: '' }, columns)).toBe(false);
  });

  it('builds an empty row from the regular columns only, "other" text included', () => {
    expect(
      emptyRowFor([
        { rowNumberColumn: true, label: '#' },
        { name: 'a', label: 'A' },
        { name: 'b', label: 'B', otherFieldName: 'bOther' },
      ]),
    ).toEqual({ a: '', b: '', bOther: '' });
  });

  it('sums a column the way the total row reads it', () => {
    expect(sumColumn([{ v: '1.5' }, { v: 2 }, { v: '' }, { v: 'x' }, null, {}], 'v')).toBe(3.5);
    expect(sumColumn(undefined, 'v')).toBe(0);
  });
});
