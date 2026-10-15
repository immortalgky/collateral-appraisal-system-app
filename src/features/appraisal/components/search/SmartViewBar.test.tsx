import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { render, screen } from '@/test/test-utils';
import SmartViewBar from './SmartViewBar';
import type { SmartViewDto } from '../../api/appraisalSearch';

const view = (key: string, description: string): SmartViewDto => ({
  key,
  name: key,
  description,
  filters: {},
});

describe('SmartViewBar descriptions', () => {
  const setup = (views: SmartViewDto[]) =>
    render(
      <SmartViewBar
        views={views}
        activeViewKey={null}
        onSelect={vi.fn()}
        onSelectAll={vi.fn()}
        isAllActive={false}
      />,
    );

  it('translates the tooltip from the view key, whatever English the server sent', () => {
    setup([view('sla-at-risk', 'Old server wording')]);
    const chip = screen.getByRole('button', {
      name: i18n.t('appraisal:list.smartViews.sla-at-risk'),
    });
    expect(chip.getAttribute('title')).toBe(
      i18n.t('appraisal:list.smartViewDescriptions.sla-at-risk'),
    );
    expect(chip.getAttribute('title')).not.toContain('Old server wording');
  });

  it('falls back to the server text for a key it has no translation for', () => {
    setup([view('brand-new-view', 'Something the server added')]);
    expect(screen.getByRole('button', { name: 'brand-new-view' }).getAttribute('title')).toBe(
      'Something the server added',
    );
  });

  it('has a description for every key the backend sends, in all three languages', () => {
    const keys = [
      'my-assignments',
      'my-requests',
      'sla-at-risk',
      'todays-appointments',
      'unassigned',
      'high-priority-active',
      'nearing-deadline',
      'external-assignments',
      'my-company-queue',
    ];
    for (const lng of ['th', 'en', 'zh']) {
      for (const k of keys) {
        expect(
          i18n.exists(`appraisal:list.smartViewDescriptions.${k}`, { lng }),
          `${lng} ${k}`,
        ).toBe(true);
      }
    }
  });
});

// ── One line: the views that do not fit fold into the "More" chip ───────────────────────────────
// happy-dom has no layout, so widths are supplied (as in FilterChipBar's tests): the label 60, the
// "all" chip and every view 100, the More chip 70 (the bar keeps 10 spare for its number growing a
// digit), the row as wide as each test says, no gap.

const KEYS = [
  'my-assignments',
  'my-requests',
  'sla-at-risk',
  'todays-appointments',
  'unassigned',
  'high-priority-active',
  'nearing-deadline',
  'external-assignments',
  'my-company-queue',
];
const allViews = KEYS.map(k => view(k, `${k} description`));
const proto = HTMLElement.prototype;
const originals = {
  offsetWidth: Object.getOwnPropertyDescriptor(proto, 'offsetWidth'),
  clientWidth: Object.getOwnPropertyDescriptor(proto, 'clientWidth'),
};
const rowWidth = { current: 560 };

describe('SmartViewBar one line', () => {
  beforeEach(() => {
    Object.defineProperty(proto, 'offsetWidth', {
      configurable: true,
      get(this: HTMLElement) {
        const text = this.textContent ?? '';
        if (text.startsWith(i18n.t('appraisal:list.quickViews'))) return 60;
        if (/^(More|อื่นๆ)/.test(text)) return 70;
        return 100;
      },
    });
    Object.defineProperty(proto, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.className.includes('flex-wrap') ? rowWidth.current : 0;
      },
    });
  });
  afterEach(() => {
    for (const [k, d] of Object.entries(originals)) {
      if (d) Object.defineProperty(proto, k, d);
    }
  });

  const setup = (activeViewKey: string | null = null, width = 560) => {
    rowWidth.current = width;
    const onSelect = vi.fn();
    const utils = render(
      <SmartViewBar
        views={allViews}
        activeViewKey={activeViewKey}
        onSelect={onSelect}
        onSelectAll={vi.fn()}
        isAllActive={activeViewKey === null}
      />,
    );
    return { onSelect, ...utils };
  };
  const label = (k: string) => i18n.t(`appraisal:list.smartViews.${k}` as never) as string;
  // a folded chip is `invisible`; the visible ones are the row
  const shown = () =>
    allViews.filter(
      v =>
        !(
          screen.getAllByText(label(v.key), { selector: 'button' })[0].closest('.invisible') !==
          null
        ),
    );
  const moreButton = () => screen.getByRole('button', { name: /more|อื่นๆ/i });

  it('keeps every view on show when the row is wide enough, and the More chip out of sight', () => {
    setup(null, 2000);
    expect(shown()).toHaveLength(9);
    expect(moreButton().closest('.invisible')).not.toBeNull();
  });

  it('folds the views that do not fit from the end, into a More chip with the count', () => {
    setup(null, 560);
    // 60 + 100 + the More chip 80 leaves room for three views of 100
    expect(shown().map(v => v.key)).toEqual(KEYS.slice(0, 3));
    expect(moreButton().closest('.invisible')).toBeNull();
    expect(moreButton().textContent).toContain('+6');
  });

  it('never folds the active view: an earlier one makes room for it', () => {
    setup('my-company-queue', 560);
    const keys = shown().map(v => v.key);
    expect(keys).toContain('my-company-queue');
    expect(keys).toHaveLength(3);
    // the ones right before it gave way, not the start of the row
    expect(keys[0]).toBe('my-assignments');
  });

  it('lists the folded views in the menu with their translated description, and picks one', async () => {
    const { user, onSelect } = setup(null, 560);
    await user.click(moreButton());
    const items = await screen.findAllByRole('menuitem');
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent(label('todays-appointments'));
    expect(items[0]).toHaveTextContent(
      i18n.t('appraisal:list.smartViewDescriptions.todays-appointments'),
    );
    await user.click(items[1]);
    expect(onSelect).toHaveBeenCalledWith(allViews[4]);
  });

  it('walks the list with the arrow keys, closes on Esc and gives the focus back to the chip', async () => {
    const { user } = setup(null, 560);
    await user.click(moreButton());
    await screen.findAllByRole('menuitem');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.activeElement?.textContent).toContain(label('unassigned'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(moreButton()).toHaveFocus();
  });

  it('draws the keyboard ring on the More chip only after the keyboard', async () => {
    const { user } = setup(null, 560);
    expect(moreButton().style.outlineStyle).toBe('none');
    expect(moreButton().className).toContain('data-focus:ring-2');
    await user.click(moreButton());
    await user.keyboard('{Escape}');
    expect(moreButton().className).not.toContain('data-focus:ring-2');
  });
});
