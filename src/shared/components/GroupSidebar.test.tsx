import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import GroupSidebar, { type GroupSidebarItem } from './GroupSidebar';

const groups: GroupSidebarItem[] = [
  { key: 'a', label: 'Alpha', count: 10, breached: 2, atRisk: 1 },
  { key: 'b', label: 'Beta', count: 4, breached: 0, atRisk: 0 },
  { key: '', label: 'None', count: 1, breached: 0, atRisk: 0, disabled: true },
];

const setup = (props: Partial<React.ComponentProps<typeof GroupSidebar>> = {}) => {
  const onSelect = vi.fn();
  const utils = render(
    <GroupSidebar
      caption="Group by"
      title="Status"
      groups={groups}
      isLoading={false}
      activeKeys={[]}
      onSelect={onSelect}
      emptyLabel="No records"
      {...props}
    />,
  );
  return { onSelect, ...utils };
};

describe('GroupSidebar', () => {
  it('shows each group with its total, and a red / amber count only when there is one', () => {
    setup();
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getAllByTitle(/breached/)).toHaveLength(1);
    expect(screen.getAllByTitle(/at risk/)).toHaveLength(1);
  });

  it('can leave the amber count out', () => {
    setup({ showAtRisk: false });
    expect(screen.queryByTitle(/at risk/)).toBeNull();
  });

  it('can leave the red count out', () => {
    setup({ showBreached: false });
    expect(screen.queryByTitle(/breached/)).toBeNull();
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('marks the active group, and hands back null when it is the only one and is clicked again', () => {
    const { onSelect } = setup({ activeKeys: ['a'] });
    const active = screen.getByText('Alpha').closest('button')!;
    expect(active).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Beta').closest('button')).toHaveAttribute('aria-pressed', 'false');
    active.click();
    expect(onSelect).toHaveBeenCalledWith(null);
    screen.getByText('Beta').closest('button')!.click();
    expect(onSelect).toHaveBeenLastCalledWith(groups[1]);
  });

  it('marks every selected group, and a click on one of several narrows to that group', () => {
    const { onSelect } = setup({ activeKeys: ['a', 'b'] });
    expect(screen.getByText('Alpha').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Beta').closest('button')).toHaveAttribute('aria-pressed', 'true');
    screen.getByText('Alpha').closest('button')!.click();
    expect(onSelect).toHaveBeenCalledWith(groups[0]);
  });

  it('names the rail for assistive tech', () => {
    setup();
    expect(screen.getByRole('complementary', { name: 'Status' })).toBeTruthy();
  });

  it('shows the error line, not the empty state, when the counts failed to load', () => {
    setup({ groups: [], isError: true, errorLabel: 'Could not load' });
    expect(screen.getByText('Could not load')).toBeTruthy();
    expect(screen.queryByText('No records')).toBeNull();
  });

  it('draws a disabled group but does not let it be picked', () => {
    const { onSelect } = setup();
    const none = screen.getByText('None').closest('button')!;
    expect(none).toBeDisabled();
    none.click();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows skeleton rows while loading and the empty label when there are no groups', () => {
    const { container, rerender } = setup({ isLoading: true });
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(6);
    rerender(
      <GroupSidebar
        caption="c"
        title="t"
        groups={[]}
        isLoading={false}
        activeKeys={[]}
        onSelect={vi.fn()}
        emptyLabel="No records"
      />,
    );
    expect(screen.getByText('No records')).toBeTruthy();
  });
});
