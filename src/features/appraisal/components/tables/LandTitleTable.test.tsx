import { describe, it, expect, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import LandTitleTable from './LandTitleTable';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
  }),
}));
// The drag itself needs layout (pointer coordinates), which happy-dom does not have: capture the
// context's drop handler and call it, the way a drop would.
const dnd = vi.hoisted(() => ({ onDragEnd: undefined as undefined | ((e: unknown) => void) }));
vi.mock('@dnd-kit/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: (props: { children: React.ReactNode; onDragEnd: (e: unknown) => void }) => {
      dnd.onDragEnd = props.onDragEnd;
      return <>{props.children}</>;
    },
  };
});
vi.mock('@/shared/components/ParameterDisplay', () => ({ default: () => <span>deed</span> }));
vi.mock('../LandTitleInputModal', () => ({ default: () => null }));

const title = (n: number) => ({
  titleType: 'DEED',
  titleNumber: String(n),
  rai: 1,
  ngan: 0,
  squareWa: 0,
});

function Harness({
  titles,
  orderable,
}: {
  titles: ReturnType<typeof title>[];
  orderable?: boolean;
}) {
  const methods = useForm({ defaultValues: { titles } });
  return (
    <FormProvider {...methods}>
      <LandTitleTable name="titles" fields={[]} orderable={orderable} />
    </FormProvider>
  );
}

const totalRow = () => document.querySelector('tr.cas-total-row');

describe('LandTitleTable total row', () => {
  it('shows the total for a single title', () => {
    render(<Harness titles={[title(1)]} />);
    expect(totalRow()).toHaveTextContent('titleEntry.list.total:1');
  });

  it('shows the total for several titles', () => {
    render(<Harness titles={[title(1), title(2)]} />);
    expect(totalRow()).toHaveTextContent('titleEntry.list.total:2');
  });

  it('has no table, and so no total row, when there are no titles', () => {
    render(<Harness titles={[]} />);
    expect(document.querySelector('table')).toBeNull();
    expect(totalRow()).toBeNull();
  });
});

const numbers = () =>
  [...document.querySelectorAll('tbody tr')].map(
    r => r.querySelector('span.break-all')?.textContent,
  );
const handles = () => document.querySelectorAll('[data-handle]');
const drop = (from: number, to: number) =>
  act(() => dnd.onDragEnd?.({ active: { id: String(from) }, over: { id: String(to) } }));

describe('LandTitleTable reordering', () => {
  it('offers a drag handle per title only when there is something to order', () => {
    const { unmount } = render(<Harness titles={[title(1), title(2), title(3)]} />);
    expect(handles()).toHaveLength(3);
    unmount();
    render(<Harness titles={[title(1)]} />);
    expect(handles()).toHaveLength(0);
  });

  it('has no handles where the order is not saved', () => {
    render(<Harness titles={[title(1), title(2)]} orderable={false} />);
    expect(handles()).toHaveLength(0);
  });

  it('moves the dropped title and leaves the total row last', () => {
    render(<Harness titles={[title(1), title(2), title(3)]} />);
    expect(numbers()).toEqual(['1', '2', '3']);
    drop(0, 2);
    expect(numbers()).toEqual(['2', '3', '1']);
    expect(document.querySelector('table')?.lastElementChild?.tagName).toBe('TFOOT');
    expect(totalRow()).toHaveTextContent('titleEntry.list.total:3');
  });

  it('ignores a drop on itself or off the list', () => {
    render(<Harness titles={[title(1), title(2)]} />);
    drop(1, 1);
    act(() => dnd.onDragEnd?.({ active: { id: '0' }, over: null }));
    expect(numbers()).toEqual(['1', '2']);
  });
});
