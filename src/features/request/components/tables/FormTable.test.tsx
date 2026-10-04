import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import FormTable, { type FormTableColumn } from './FormTable';
import { emptyRowFor, sumColumn } from './formTableUtils';

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
}: {
  hideAddButton?: boolean;
  addRowRef?: React.Ref<() => void>;
}) {
  methods = useForm<Record<string, unknown>>({
    defaultValues: { rows: [{ item: 'a', qty: '1' }] },
  });
  return (
    <FormProvider {...methods}>
      <FormTable
        name="rows"
        columns={columns}
        hideAddButton={hideAddButton}
        addRowRef={addRowRef}
      />
    </FormProvider>
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

describe('formTableUtils', () => {
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
