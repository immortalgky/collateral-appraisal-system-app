import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { FormReadOnlyContext } from '@/shared/components/form/context';
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
vi.mock('../LandTitleInputModal', () => ({
  default: (props: { defaultValues?: { titleNumber?: string } }) => (
    <div
      data-testid="modal"
      data-mode={props.defaultValues ? 'edit' : 'add'}
      data-number={props.defaultValues?.titleNumber}
    />
  ),
}));

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
  readOnly = false,
}: {
  titles: ReturnType<typeof title>[];
  orderable?: boolean;
  readOnly?: boolean;
}) {
  const methods = useForm({ defaultValues: { titles } });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...methods}>
        <LandTitleTable name="titles" fields={[]} orderable={orderable} />
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
}

const totalRow = () => document.querySelector('tfoot tr');

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

const numbers = () => [...document.querySelectorAll('span.break-all')].map(c => c.textContent);
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

const modal = () => screen.queryByTestId('modal');
const rowOf = (n: number) => [...document.querySelectorAll<HTMLElement>('tbody tr[tabindex]')][n];

describe('LandTitleTable row actions', () => {
  it('opens the edit dialog from a click anywhere on the row, and names the row for a screen reader', () => {
    render(<Harness titles={[title(1), title(2)]} />);
    expect(rowOf(1)).toHaveAttribute('aria-label', 'titleEntry.list.editTitle');
    fireEvent.click(rowOf(1));
    expect(modal()).toHaveAttribute('data-mode', 'edit');
    expect(modal()).toHaveAttribute('data-number', '2');
  });

  it('opens it from the keyboard with Enter or Space on the row', () => {
    const { unmount } = render(<Harness titles={[title(1), title(2)]} />);
    fireEvent.keyDown(rowOf(0), { key: 'Enter' });
    expect(modal()).toHaveAttribute('data-number', '1');
    unmount();
    render(<Harness titles={[title(1), title(2)]} />);
    fireEvent.keyDown(rowOf(1), { key: ' ' });
    expect(modal()).toHaveAttribute('data-number', '2');
  });

  it('has no pencil, and the trash deletes after a confirm without opening the dialog', () => {
    render(<Harness titles={[title(1), title(2)]} />);
    expect(screen.queryByRole('button', { name: 'titleEntry.list.edit' })).toBeNull();
    const trash = screen.getAllByRole('button', { name: 'actions.deleteRowN' })[0];
    fireEvent.click(trash);
    expect(modal()).toBeNull();
    expect(numbers()).toEqual(['1', '2']);
    fireEvent.click(screen.getByRole('button', { name: 'actions.confirmDeleteLabel' }));
    expect(modal()).toBeNull();
    expect(numbers()).toEqual(['2']);
  });

  it('does not open the dialog from the drag handle', () => {
    render(<Harness titles={[title(1), title(2)]} />);
    fireEvent.click(handles()[0]);
    expect(modal()).toBeNull();
  });

  it('adds from the last row of the table, and has no add button under it', () => {
    render(<Harness titles={[title(1)]} />);
    const add = screen.getByRole('button', { name: /titleEntry\.list\.add/ });
    expect(add.closest('tbody')).not.toBeNull();
    expect(add.closest('tr')).toBe(document.querySelector('tbody')!.lastElementChild);
    fireEvent.click(add);
    expect(modal()).toHaveAttribute('data-mode', 'add');
    expect(screen.getAllByRole('button', { name: /titleEntry\.list\.add/ })).toHaveLength(1);
  });

  it('sorts from the number header, same as the old button, and goes quiet once sorted', () => {
    render(<Harness titles={[title(3), title(1), title(2)]} />);
    const header = screen.getByRole('button', { name: /titleEntry\.list\.document/ });
    expect(header.closest('th')).not.toBeNull();
    expect(header).toBeEnabled();
    fireEvent.click(header);
    expect(numbers()).toEqual(['1', '2', '3']);
    expect(header).toBeDisabled();
    expect(screen.queryByRole('button', { name: /titleEntry\.list\.sortByNumber/ })).toBeNull();
  });

  it('is a plain header with no sort, add or trash on a read page; the rows still open', () => {
    render(<Harness titles={[title(3), title(1)]} readOnly />);
    expect(screen.queryByRole('button', { name: /titleEntry\.list\.document/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /titleEntry\.list\.add/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'actions.deleteRowN' })).toBeNull();
    fireEvent.click(rowOf(0));
    expect(modal()).toHaveAttribute('data-number', '3');
  });
});
