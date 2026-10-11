import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { fireEvent } from '@testing-library/react';
import { render, screen, waitFor, within } from '@/test/test-utils';
import FilterChipBar from './FilterChipBar';
import type { FilterField } from './tabConfigs';

const L = (key: string) => i18n.t(`appraisal:list.${key}` as never) as string;

const filters: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    group: 'work',
    type: 'select',
    options: [
      { value: 'Pending', label: 'Pending' },
      { value: 'Assigned', label: 'Assigned' },
    ],
  },
  {
    key: 'appraisalType',
    label: 'Job type',
    group: 'kind',
    type: 'select',
    options: [
      { value: 'New', label: 'New' },
      { value: 'ReAppraisal', label: 'Re-appraisal' },
    ],
  },
  {
    key: 'created',
    label: 'Created',
    group: 'time',
    type: 'date-range',
    fromKey: 'createdFrom',
    toKey: 'createdTo',
  },
];

function Harness() {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <>
      <output data-testid="values">{JSON.stringify(values)}</output>
      <FilterChipBar
        filters={filters}
        values={values}
        pinned={['status']}
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

const addButton = () => screen.getByRole('button', { name: L('filters.add') });
const chipButton = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

describe('FilterChipBar add-filter hand-off', () => {
  it('opens the picked field as its own chip, and keeps the panel with that chip as values are ticked', async () => {
    const { user } = render(<Harness />);
    await user.click(addButton());
    await user.click(await screen.findByRole('button', { name: 'Job type' }));

    // the add menu is gone and the new chip's own panel is open, focus inside it
    const chip = await waitFor(() => {
      const b = chipButton('Job type');
      expect(b).toHaveAttribute('aria-expanded', 'true');
      return b;
    });
    expect(addButton()).toHaveAttribute('aria-expanded', 'false');
    const panel = document.getElementById(chip.getAttribute('aria-controls')!)!;
    expect(panel.contains(document.activeElement)).toBe(true);

    // ticking the first value turns it into a set chip — and the same panel stays open under it
    await user.click(screen.getByRole('checkbox', { name: 'New' }));
    const setChip = chipButton('Job type:');
    expect(setChip).toHaveAttribute('aria-expanded', 'true');
    expect(setChip.getAttribute('aria-controls')).toBe(chip.getAttribute('aria-controls'));
    expect(addButton()).toHaveAttribute('aria-expanded', 'false');

    // more values keep the panel with the chip
    await user.click(screen.getByRole('checkbox', { name: 'Re-appraisal' }));
    expect(chipButton('Job type:')).toHaveAttribute('aria-expanded', 'true');

    // Esc closes the chip's panel; the chip stays because it has values
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'New' })).toBeNull());
    expect(chipButton('Job type:')).toBeTruthy();
  });

  it('leaves no chip behind when the picked field is closed without a value', async () => {
    const { user } = render(<Harness />);
    await user.click(addButton());
    await user.click(await screen.findByRole('button', { name: 'Job type' }));
    await waitFor(() => expect(chipButton('Job type')).toHaveAttribute('aria-expanded', 'true'));

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('button', { name: /Job type/ })).toBeNull());
    // and the field is offered again by the add menu
    await user.click(addButton());
    expect(await screen.findByRole('button', { name: 'Job type' })).toBeTruthy();
  });

  it('draws one focus ring on the triggers, for keyboard focus only', () => {
    render(<Harness />);
    // the global :focus-visible outline is unlayered, so only an inline style switches it off; the
    // ring itself follows Headless UI's data-focus, which a mouse click does not set
    for (const trigger of [chipButton('Status'), addButton()]) {
      expect(trigger.style.outlineStyle).toBe('none');
      expect(trigger.className).toContain('data-focus:ring-2');
      expect(trigger.className).not.toContain('focus-visible:ring');
    }
  });

  it('draws no ring after the mouse, even when something was typed first, until the next Tab', async () => {
    const { user } = render(
      <>
        <input aria-label="search" />
        <Harness />
      </>,
    );
    // typing makes the page's input modality "keyboard", which is what Headless UI's data-focus follows
    await user.type(screen.getByLabelText('search'), 'abc');
    const hasRing = (b: HTMLElement) => b.className.includes('data-focus:ring-2');
    expect(hasRing(chipButton('Status'))).toBe(true);

    await user.click(chipButton('Status'));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Pending' })).toBeNull());
    // opened with the mouse, closed with Esc: the focus handed back to the chip must not be ringed
    expect(hasRing(chipButton('Status'))).toBe(false);
    expect(hasRing(addButton())).toBe(false);

    await user.tab();
    expect(hasRing(chipButton('Status'))).toBe(true);
    expect(hasRing(addButton())).toBe(true);
  });

  const values = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}');

  it('removes an added filter that is left with no value when its panel closes', async () => {
    const { user } = render(<Harness />);
    await user.click(addButton());
    await user.click(await screen.findByRole('button', { name: 'Job type' }));
    await user.click(await screen.findByRole('checkbox', { name: 'New' }));
    expect(values()).toEqual({ appraisalType: 'New' });
    await user.click(screen.getByRole('checkbox', { name: 'New' }));
    // all unticked: the panel stays under the cursor, the key is held empty for now
    expect(screen.getByRole('checkbox', { name: 'New' })).toBeInTheDocument();
    expect(values()).toEqual({ appraisalType: '' });

    await user.click(document.body); // click outside
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Job type/ })).toBeNull());
    // no chip, and no empty key left behind (the URL would otherwise get `appraisalType=`)
    expect(values()).toEqual({});
    // the field can be added again
    await user.click(addButton());
    expect(await screen.findByRole('button', { name: 'Job type' })).toBeTruthy();
  });

  it('draws a pinned filter with no value as the plain unset button, and drops its empty key', async () => {
    const { user } = render(<Harness />);
    await user.click(chipButton('Status'));
    await user.click(await screen.findByRole('checkbox', { name: 'Pending' }));
    await user.click(screen.getByRole('checkbox', { name: 'Pending' }));
    await user.click(document.body);
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Pending' })).toBeNull());
    // "Status" with its chevron, not "Status: All" in the filled style
    const chip = chipButton('Status');
    expect(chip).toHaveTextContent(/^Status$/);
    expect(chip.closest('span')?.className).toContain('bg-white');
    expect(chip.closest('span')?.className).not.toContain('bg-gray-100');
    expect(values()).toEqual({});
  });

  it('removes a date range with nothing in it the same way', async () => {
    const { user } = render(<Harness />);
    await user.click(addButton());
    await user.click(await screen.findByRole('button', { name: 'Created' }));
    await user.click(await screen.findByRole('button', { name: L('filters.presets.today') }));
    await user.click(screen.getByRole('button', { name: i18n.t('common:actions.clear') }));
    await user.click(document.body);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Created/ })).toBeNull());
    expect(values()).toEqual({});
  });

  it('does the same for a date-range field', async () => {
    const { user } = render(<Harness />);
    await user.click(addButton());
    await user.click(await screen.findByRole('button', { name: 'Created' }));
    const chip = await waitFor(() => {
      const b = chipButton('Created');
      expect(b).toHaveAttribute('aria-expanded', 'true');
      return b;
    });
    await user.click(screen.getByRole('button', { name: L('filters.presets.today') }));
    const setChip = chipButton('Created:');
    expect(setChip).toHaveAttribute('aria-expanded', 'true');
    expect(setChip.getAttribute('aria-controls')).toBe(chip.getAttribute('aria-controls'));
  });
});

// ── One line: chips that do not fit fold into "More +N" ─────────────────────────────────────────
// happy-dom has no layout, so widths are supplied: every chip is 100 wide, the overflow chip 60,
// the "Add filter" / "Clear all" tail 120, and the row 400. (The bar also keeps 10 spare for the
// overflow number growing a digit.) Chips + tail = 520, so two chips fit beside "More" and the tail.

const wide: FilterField[] = [
  ...filters,
  {
    key: 'slaStatus',
    label: 'SLA status',
    group: 'work',
    type: 'select',
    options: [
      { value: 'AtRisk', label: 'At risk' },
      { value: 'Breached', label: 'Breached' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    group: 'work',
    type: 'select',
    options: [
      { value: 'High', label: 'High' },
      { value: 'Normal', label: 'Normal' },
    ],
  },
];

function PinnedHarness() {
  const [values, setValues] = useState<Record<string, string>>({ appraisalType: 'New' });
  return (
    <FilterChipBar
      filters={wide}
      values={values}
      pinned={['status', 'slaStatus', 'priority']}
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
  );
}

function WideHarness({
  initial = { appraisalType: 'New', slaStatus: 'AtRisk', priority: 'High' },
  fields = wide,
}: {
  initial?: Record<string, string>;
  fields?: FilterField[];
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  return (
    <>
      <output data-testid="values">{JSON.stringify(values)}</output>
      <FilterChipBar
        filters={fields}
        values={values}
        pinned={['status']}
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

// (the bar keeps 1px back from the row's width, so the row is 401 for it to have 400 to use)
const widths = { chip: 100, more: 60, tail: 120, row: 401, slaOne: 100 };
const ROW = widths.row;
const SLA_ONE = widths.slaOne;
const proto = HTMLElement.prototype;
const originals = {
  offsetWidth: Object.getOwnPropertyDescriptor(proto, 'offsetWidth'),
  clientWidth: Object.getOwnPropertyDescriptor(proto, 'clientWidth'),
};

describe('FilterChipBar overflow', () => {
  beforeEach(() => {
    Object.defineProperty(proto, 'offsetWidth', {
      configurable: true,
      get(this: HTMLElement) {
        const text = this.textContent ?? '';
        if (text.includes(L('filters.add'))) return widths.tail;
        if (text.startsWith('More +')) return widths.more;
        // a chip that says "Any" (all its values unticked) is narrow, one with two values wide
        if (text.includes(`:${L('filters.anyValue')}`)) return 10;
        if (text.includes('SLA status:At risk') && !text.includes('+1')) return widths.slaOne;
        if (text.includes('+1')) return 160;
        return widths.chip;
      },
    });
    Object.defineProperty(proto, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.className.includes('min-w-0 flex-wrap') ? widths.row : 0;
      },
    });
  });
  afterEach(() => {
    widths.row = ROW;
    widths.slaOne = SLA_ONE;
    for (const [k, d] of Object.entries(originals)) {
      if (d) Object.defineProperty(proto, k, d);
    }
  });

  const hiddenChip = (text: RegExp) =>
    screen.getAllByRole('button', { hidden: true, name: text })[0].closest('.invisible');
  const moreButton = () => screen.getByRole('button', { name: /^More \+\d/ });
  // The menu is the overflow chip's popover. (The hidden chips are still in the DOM, so a plain
  // screen query for "SLA status: At risk" would find the chip as well as the row.)
  const menu = () => within(document.getElementById(moreButton().getAttribute('aria-controls')!)!);

  it('keeps what fits on the line and folds the rest into "More +N"', () => {
    render(<WideHarness />);
    expect(moreButton()).toHaveTextContent('More +2');
    // the visible text is in the name (WCAG 2.5.3), and the count agrees with it
    expect(moreButton()).toHaveAccessibleName('More +2 (2 more filters)');
    expect(hiddenChip(/^SLA status/)).not.toBeNull();
    expect(hiddenChip(/^Priority/)).not.toBeNull();
    expect(screen.getByRole('button', { name: /^Job type/ })).toBeVisible();
    // the tail is never folded
    expect(screen.getByRole('button', { name: L('filters.add') })).toBeVisible();
  });

  it('lists the hidden filters, opens one on click, and goes back to the list', async () => {
    const { user } = render(<WideHarness />);
    await user.click(moreButton());
    expect(moreButton()).toHaveAttribute('aria-expanded', 'true');
    await user.click(
      await waitFor(() => menu().getByRole('button', { name: 'SLA status: At risk' })),
    );

    expect(screen.getByRole('checkbox', { name: 'At risk' })).toBeChecked();
    // the panel belongs to the overflow chip's popover
    const panel = document.getElementById(moreButton().getAttribute('aria-controls')!)!;
    expect(panel.contains(screen.getByRole('checkbox', { name: 'At risk' }))).toBe(true);

    await user.click(screen.getByRole('button', { name: i18n.t('common:actions.back') }));
    expect(
      await waitFor(() => menu().getByRole('button', { name: 'Priority: High' })),
    ).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'At risk' })).toBeNull();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(moreButton()).toHaveAttribute('aria-expanded', 'false'));
    expect(moreButton()).toHaveFocus();
  });

  it('clears a hidden filter from the list, and the count follows', async () => {
    const { user } = render(<WideHarness />);
    await user.click(moreButton());
    await user.click(
      await waitFor(() => menu().getByRole('button', { name: `${L('removeFilter')}: Priority` })),
    );
    // Priority is gone from the bar; SLA status is still the one folded away
    await waitFor(() => expect(moreButton()).toHaveTextContent('More +1'));
    expect(moreButton()).toHaveAccessibleName('More +1 (1 more filter)');
  });

  it('never folds a pinned chip, wrapping them instead, and only the added ones count in "More"', () => {
    widths.row = 251;
    render(<PinnedHarness />);
    // Status, SLA status and Priority are pinned: all on show though they need two lines
    for (const name of [/^Status/, /^SLA status/, /^Priority/]) {
      expect(screen.getByRole('button', { name }).closest('.invisible')).toBeNull();
    }
    // the one added chip does not fit on those lines, so it is the only thing in "More"
    expect(moreButton()).toHaveTextContent('More +1');
    expect(hiddenChip(/^Job type/)).not.toBeNull();
  });

  it('closes the menu, and puts the focus on Add filter, when its last hidden filter is cleared', async () => {
    const { user } = render(<WideHarness />);
    await user.click(moreButton());
    const controls = moreButton().getAttribute('aria-controls')!;
    await user.click(
      await waitFor(() => menu().getByRole('button', { name: `${L('removeFilter')}: Priority` })),
    );
    await waitFor(() => expect(moreButton()).toHaveTextContent('More +1'));
    expect(document.getElementById(controls)).not.toBeNull();

    await user.click(
      await waitFor(() => menu().getByRole('button', { name: `${L('removeFilter')}: SLA status` })),
    );
    // nothing is hidden any more: no empty panel left open, and the focus is not lost
    await waitFor(() => expect(document.getElementById(controls)).toBeNull());
    expect(screen.getByRole('button', { name: L('filters.add') })).toHaveFocus();
  });

  it('goes back to the list, with the focus in it, when the filter opened from the menu is cleared', async () => {
    const { user } = render(<WideHarness />);
    await user.click(moreButton());
    await user.click(
      await waitFor(() => menu().getByRole('button', { name: 'SLA status: At risk' })),
    );
    await user.click(
      await waitFor(() => menu().getByRole('button', { name: i18n.t('common:actions.clear') })),
    );

    // the filter went with its values; the panel does not snap shut or leave the focus on the page
    expect(
      await waitFor(() => menu().getByRole('button', { name: 'Priority: High' })),
    ).toBeTruthy();
    const panel = document.getElementById(moreButton().getAttribute('aria-controls')!)!;
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it('keeps the layout still while a panel is open, and applies it when it closes', async () => {
    // one value is 10 wide, so after unticking the other the chip would fit
    widths.slaOne = 10;
    const { user } = render(
      <WideHarness
        initial={{ appraisalType: 'New', slaStatus: 'AtRisk,Breached', priority: 'High' }}
      />,
    );
    await user.click(moreButton());
    await user.click(
      await waitFor(() => menu().getByRole('button', { name: 'SLA status: At risk +1' })),
    );
    // unticking one of two values narrows the chip so that it would now fit on the line...
    await user.click(screen.getByRole('checkbox', { name: 'Breached' }));
    // ...but the panel being edited stays, and so does the chip's place in the overflow
    expect(screen.getByRole('checkbox', { name: 'At risk' })).toBeInTheDocument();
    expect(hiddenChip(/^SLA status/)).not.toBeNull();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(hiddenChip(/^SLA status/)).toBeNull());
  });

  it('does not fold a chip away while its own panel is open', async () => {
    const { user } = render(<WideHarness />);
    await user.click(screen.getByRole('button', { name: /^Job type/ }));
    // a second value widens the chip beyond what fits...
    await user.click(await screen.findByRole('checkbox', { name: 'Re-appraisal' }));
    expect(screen.getByRole('button', { name: /^Job type/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /^Job type/ }).closest('.invisible')).toBeNull();

    // ...and it goes to the overflow once the panel is closed
    await user.keyboard('{Escape}');
    await waitFor(() => expect(hiddenChip(/^Job type/)).not.toBeNull());
  });

  it('removes a hidden filter emptied inside the overflow menu once the menu closes', async () => {
    const { user } = render(<WideHarness />);
    await user.click(moreButton());
    await user.click(
      await waitFor(() => menu().getByRole('button', { name: 'SLA status: At risk' })),
    );
    await user.click(screen.getByRole('checkbox', { name: 'At risk' }));
    expect(JSON.parse(screen.getByTestId('values').textContent ?? '{}').slaStatus).toBe('');

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('values').textContent ?? '{}')).not.toHaveProperty(
        'slaStatus',
      ),
    );
    // what is left hidden is only the filter that still has a value
    await waitFor(() => expect(moreButton()).toHaveTextContent('More +1'));
  });

  it('hands the focus to the next row when a row is cleared from the menu', async () => {
    const { user } = render(<WideHarness />);
    await user.click(moreButton());
    await user.click(
      await waitFor(() => menu().getByRole('button', { name: `${L('removeFilter')}: SLA status` })),
    );
    // the rows were SLA status, Priority: the one after the cleared row takes the focus
    await waitFor(() =>
      expect(menu().getByRole('button', { name: 'Priority: High' })).toHaveFocus(),
    );
  });

  it('hands the focus to the row before when the cleared row was the last', async () => {
    const { user } = render(<WideHarness />);
    await user.click(moreButton());
    await user.click(
      await waitFor(() => menu().getByRole('button', { name: `${L('removeFilter')}: Priority` })),
    );
    await waitFor(() =>
      expect(menu().getByRole('button', { name: 'SLA status: At risk' })).toHaveFocus(),
    );
  });

  it('puts the focus on the ×, when the row it lands on is a quick-view one with a disabled open button', async () => {
    // a key a quick view set: it has no control to open, so its row's button is disabled
    const quick = wide.map(f => (f.key === 'slaStatus' ? { ...f, hidden: true } : f));
    const { user } = render(<WideHarness fields={quick} />);
    await user.click(moreButton());
    await user.click(
      await waitFor(() => menu().getByRole('button', { name: `${L('removeFilter')}: Priority` })),
    );
    // the row before is SLA status; its label button is disabled, so its × takes the focus
    await waitFor(() =>
      expect(
        menu().getByRole('button', { name: `${L('removeFilter')}: SLA status` }),
      ).toHaveFocus(),
    );
  });

  it('gives the chip ×, Clear all and the menu rows the keyboard ring, and none after the mouse', async () => {
    const { user } = render(<WideHarness />);
    const clearAll = () => screen.getByRole('button', { name: L('clearAll') });
    const chipX = () => screen.getByRole('button', { name: `${L('removeFilter')}: Job type` });
    for (const el of [clearAll(), chipX()]) {
      // the global :focus-visible outline can only be switched off inline
      expect(el.style.outlineStyle).toBe('none');
      expect(el.className).toContain('focus-visible:ring-2');
    }
    // opened from the keyboard, so nothing has turned the ring off
    moreButton().focus();
    await user.keyboard('{Enter}');
    const row = await waitFor(() => menu().getByRole('button', { name: 'SLA status: At risk' }));
    expect(row.style.outlineStyle).toBe('none');
    expect(row.className).toContain('focus-visible:ring-2');

    // a pointer press inside the bar turns the ring off, until the next Tab
    fireEvent.pointerDown(row);
    await waitFor(() => expect(row.className).not.toContain('focus-visible:ring-2'));
    expect(clearAll().className).not.toContain('focus-visible:ring-2');
    expect(chipX().className).not.toContain('focus-visible:ring-2');
    await user.keyboard('{Escape}');
    await user.tab();
    expect(clearAll().className).toContain('focus-visible:ring-2');
  });

  it('keeps a newly added filter on the line, pushing an earlier chip into the overflow', async () => {
    const { user } = render(<WideHarness />);
    await user.click(screen.getByRole('button', { name: L('filters.add') }));
    await user.click(await screen.findByRole('button', { name: 'Created' }));

    const chip = await waitFor(() => {
      const b = screen.getByRole('button', { name: /^Created/ });
      expect(b).toHaveAttribute('aria-expanded', 'true');
      return b;
    });
    expect(chip.closest('.invisible')).toBeNull();
    // the earlier Job type chip made room
    expect(hiddenChip(/^Job type/)).not.toBeNull();
    expect(moreButton()).toHaveTextContent('More +3');

    // Its panel closed with a value: from then on it is an ordinary added chip. It does not fit
    // beside the others, so it folds too, rather than growing the row by a line.
    await user.click(screen.getByRole('button', { name: L('filters.presets.today') }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(hiddenChip(/^Created/)).not.toBeNull());
    // the earlier chip it had pushed out is back on the line
    expect(screen.getByRole('button', { name: /^Job type/ }).closest('.invisible')).toBeNull();
    expect(moreButton()).toHaveTextContent('More +3');
  });
});
