import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown';

const labels = { a: 'Alpha', b: 'Beta', c: 'Gamma' };

const setup = (
  extra: Partial<React.ComponentProps<typeof ColumnVisibilityDropdown<'a' | 'b' | 'c'>>> = {},
) => {
  const onToggle = vi.fn();
  const onRowNumber = vi.fn();
  const utils = render(
    <ColumnVisibilityDropdown<'a' | 'b' | 'c'>
      orderedColumns={['a', 'b', 'c']}
      hidden={new Set(['c'])}
      alwaysVisible={new Set(['a'])}
      labels={labels}
      onToggle={onToggle}
      onReorder={vi.fn()}
      onReset={vi.fn()}
      extraToggles={[
        { key: 'rowNumber', label: 'Row number', checked: true, onChange: onRowNumber },
      ]}
      {...extra}
    />,
  );
  return { onToggle, onRowNumber, ...utils };
};

const open = (user: ReturnType<typeof render>['user']) =>
  user.click(screen.getByRole('button', { name: /column/i }));

describe('ColumnVisibilityDropdown checkboxes', () => {
  it('shows a real checkbox per column, checked when visible, the pinned one disabled', async () => {
    const { user } = setup({ checkboxes: true });
    await open(user);
    const a = screen.getByRole('checkbox', { name: 'Alpha' });
    const b = screen.getByRole('checkbox', { name: 'Beta' });
    const c = screen.getByRole('checkbox', { name: 'Gamma' });
    expect(a).toBeChecked();
    expect(a).toBeDisabled();
    expect(b).toBeChecked();
    expect(c).not.toBeChecked();
    // no eye toggles in this mode
    expect(screen.queryByRole('button', { name: /^(Show|Hide) column/i })).toBeNull();
  });

  it('toggles a column once per click on its checkbox, and once per click on the row', async () => {
    const { user, onToggle } = setup({ checkboxes: true });
    await open(user);
    await user.click(screen.getByRole('checkbox', { name: 'Gamma' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenLastCalledWith('c');
    await user.click(screen.getByText('Beta'));
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(onToggle).toHaveBeenLastCalledWith('b');
  });

  it('turns the extra toggle (row number) into a checkbox too', async () => {
    const { user, onRowNumber } = setup({ checkboxes: true });
    await open(user);
    await user.click(screen.getByRole('checkbox', { name: 'Row number' }));
    expect(onRowNumber).toHaveBeenCalledTimes(1);
  });

  it('keeps the eye toggles and the switch for callers that do not opt in', async () => {
    const { user } = setup();
    await open(user);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByRole('switch', { name: /Row number/ })).toBeTruthy();
  });
});

describe('ColumnVisibilityDropdown neutral button', () => {
  it('is the plain neutral tool button, with no indigo and no count badge', () => {
    setup({ neutralButton: true, hiddenBeyondDefault: 0 });
    const btn = screen.getByRole('button', { name: /column/i });
    expect(btn.className).toContain('border-gray-200');
    expect(btn.className).toContain('bg-white');
    expect(btn.className).not.toContain('indigo');
  });

  it('shows a customised layout as a subtle active state, still with no badge', () => {
    setup({ neutralButton: true, hiddenBeyondDefault: 2 });
    const btn = screen.getByRole('button', { name: /column/i });
    expect(btn.className).toContain('bg-gray-100');
    expect(btn.className).not.toContain('indigo');
    expect(btn.textContent).toBe('');
  });

  it('keeps the indigo button and its badge by default', () => {
    setup({ hiddenBeyondDefault: 2 });
    const btn = screen.getByRole('button', { name: /column/i });
    expect(btn.className).toContain('indigo');
    expect(btn.textContent).toBe('2');
  });
});
