import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { render, screen, waitFor, within } from '@/test/test-utils';
import FilterChipBar from './FilterChipBar';
import type { FilterField } from './tabConfigs';

const L = (key: string, opts?: object) =>
  String(i18n.t(`appraisal:list.filters.${key}` as never, opts as never));

const select = (key: string, label: string, group: FilterField['group']): FilterField => ({
  key,
  label,
  group,
  type: 'select',
  options: [
    { value: 'A', label: `${label} A` },
    { value: 'B', label: `${label} B` },
  ],
});

// Group order is work, kind, owner, area, time: "Channel" (kind) is listed before "Owner" (owner)
const filters: FilterField[] = [
  select('owner', 'Owner', 'owner'),
  select('status', 'Status', 'work'),
  select('channel', 'Channel', 'kind'),
  select('purpose', 'Purpose', 'work'),
];

const DEFAULT_PINS = ['status', 'purpose'];

function Harness({ initial = {} }: { initial?: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [pins, setPins] = useState<string[] | null>(null);
  const pinned = pins ?? DEFAULT_PINS;
  return (
    <>
      <output data-testid="pins">{pinned.join(',')}</output>
      <output data-testid="values">{JSON.stringify(values)}</output>
      <FilterChipBar
        filters={filters}
        values={values}
        pinned={pinned}
        pinControls={{
          onTogglePin: k =>
            setPins(pinned.includes(k) ? pinned.filter(x => x !== k) : [...pinned, k]),
          onReorderPins: (a, o) => {
            const next = pinned.filter(x => x !== a);
            next.splice(pinned.indexOf(o), 0, a);
            setPins(next);
          },
          onResetPins: () => setPins(null),
          canReset: pins !== null,
        }}
        onChange={(k, v) => setValues(p => ({ ...p, [k]: v }))}
        onRemove={k =>
          setValues(p => {
            const n = { ...p };
            delete n[k];
            return n;
          })
        }
        onClear={() => setValues({})}
      />
    </>
  );
}

const addButton = () => screen.getByRole('button', { name: L('add') });
const openMenu = async (user: ReturnType<typeof render>['user']) => {
  await user.click(addButton());
  return within(document.getElementById(addButton().getAttribute('aria-controls')!)!);
};
const pins = () => screen.getByTestId('pins').textContent;
const rowNames = (menu: ReturnType<typeof within>) =>
  menu
    .getAllByRole('button', { name: /^(Pin|Unpin) / })
    .map((b: HTMLElement) => b.getAttribute('aria-label'));

describe('FilterChipBar pin menu', () => {
  it('lists the pinned filters in bar order, then the rest in group order, a handle on pinned rows only', async () => {
    const { user } = render(<Harness initial={{ channel: 'A' }} />);
    const menu = await openMenu(user);

    expect(rowNames(menu)).toEqual([
      L('unpin', { label: 'Status' }),
      L('unpin', { label: 'Purpose' }),
      L('pin', { label: 'Channel' }),
      L('pin', { label: 'Owner' }),
    ]);
    expect(menu.getAllByRole('button', { name: L('dragToReorder') })).toHaveLength(2);
    // a filter in use says so, pinned or not
    expect(menu.getByRole('button', { name: `Channel ${L('inUse')}` })).toBeTruthy();
  });

  it('pins a filter last on the bar, and unpinning one keeps its value', async () => {
    const { user } = render(<Harness initial={{ status: 'A' }} />);
    let menu = await openMenu(user);

    await user.click(menu.getByRole('button', { name: L('pin', { label: 'Owner' }) }));
    expect(pins()).toBe('status,purpose,owner');
    // its chip is on the bar now, beside its row in the menu
    expect(screen.getAllByRole('button', { name: /^Owner/ })).toHaveLength(2);

    await user.click(menu.getByRole('button', { name: L('unpin', { label: 'Status' }) }));
    expect(pins()).toBe('purpose,owner');
    expect(screen.getByTestId('values').textContent).toBe('{"status":"A"}');
    // the row moved to the other section, and its pin kept the keyboard
    await waitFor(() =>
      expect(document.activeElement).toBe(
        menu.getByRole('button', { name: L('pin', { label: 'Status' }) }),
      ),
    );
    menu = within(document.getElementById(addButton().getAttribute('aria-controls')!)!);
    expect(rowNames(menu)[0]).toBe(L('unpin', { label: 'Purpose' }));
  });

  it('moves a pinned filter with Alt + arrows on its pin, and the focus goes with it', async () => {
    const { user } = render(<Harness />);
    const menu = await openMenu(user);
    const statusPin = menu.getByRole('button', { name: L('unpin', { label: 'Status' }) });

    statusPin.focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(pins()).toBe('purpose,status');
    expect(document.activeElement).toBe(statusPin);

    await user.keyboard('{Alt>}{ArrowDown}{/Alt}'); // already last: stays
    expect(pins()).toBe('purpose,status');
    await user.keyboard('{ArrowUp}'); // no Alt: not a move
    expect(pins()).toBe('purpose,status');
  });

  it('only offers Reset once the pins differ from the defaults', async () => {
    const { user } = render(<Harness />);
    const menu = await openMenu(user);
    const reset = menu.getByRole('button', { name: L('resetPins') });
    expect(reset).toBeDisabled();

    await user.click(menu.getByRole('button', { name: L('unpin', { label: 'Purpose' }) }));
    expect(reset).toBeEnabled();
    await user.click(reset);
    expect(pins()).toBe('status,purpose');
  });

  it("opens a filter's values in the same menu from its name, with a pin toggle, and back to the list", async () => {
    const { user } = render(<Harness />);
    const menu = await openMenu(user);

    // a pinned filter: its values, said to be pinned
    await user.click(menu.getByRole('button', { name: 'Status' }));
    expect(menu.getByRole('checkbox', { name: 'Status A' })).toBeTruthy();
    expect(menu.getByRole('button', { name: L('pinnedAction') })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(menu.getByText(L('pinnedValueHint'))).toBeTruthy();
    expect(addButton()).toHaveAttribute('aria-expanded', 'true'); // still the same menu

    // back to the list, then an unpinned one: pick a value, then pin it from its header
    await user.click(
      menu.getByRole('button', { name: String(i18n.t('common:actions.back' as never)) }),
    );
    await user.click(menu.getByRole('button', { name: 'Owner' }));
    expect(menu.getByText(L('unpinnedValueHint'))).toBeTruthy();
    await user.click(menu.getByRole('checkbox', { name: 'Owner A' }));
    expect(screen.getByTestId('values').textContent).toBe('{"owner":"A"}');
    expect(pins()).toBe('status,purpose'); // picking a value does not pin

    await user.click(menu.getByRole('button', { name: L('pinAction') }));
    expect(pins()).toBe('status,purpose,owner');
    expect(menu.getByRole('button', { name: L('pinnedAction') })).toBeTruthy();
  });

  it('drops a filter left with no value when the menu closes', async () => {
    const { user } = render(<Harness />);
    const menu = await openMenu(user);
    await user.click(menu.getByRole('button', { name: 'Owner' }));
    await user.click(menu.getByRole('checkbox', { name: 'Owner A' }));
    await user.click(menu.getByRole('checkbox', { name: 'Owner A' })); // unticked: owner is ''
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByTestId('values').textContent).toBe('{}'));
  });

  it("opens a pinned chip's values from the bar itself", async () => {
    const { user } = render(<Harness />);
    await user.click(screen.getByRole('button', { name: /^Status/ }));
    expect(await screen.findByRole('checkbox', { name: 'Status A' })).toBeTruthy();
    expect(addButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('still offers the menu with every filter pinned, and shows none pinned when all are unpinned', async () => {
    const { user } = render(<Harness />);
    const menu = await openMenu(user);
    await user.click(menu.getByRole('button', { name: L('unpin', { label: 'Status' }) }));
    await user.click(
      within(document.getElementById(addButton().getAttribute('aria-controls')!)!).getByRole(
        'button',
        { name: L('unpin', { label: 'Purpose' }) },
      ),
    );
    expect(pins()).toBe('');
    expect(screen.getByText(L('noPinned'))).toBeTruthy();
  });
});
