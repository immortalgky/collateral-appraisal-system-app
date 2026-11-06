import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen, within } from '@/test/test-utils';
import { TaskTabs } from './TaskTabs';

const setup = (props: Partial<ComponentProps<typeof TaskTabs>> = {}) => {
  const onTabChange = vi.fn();
  const view = render(
    <TaskTabs
      activeTab="personal"
      onTabChange={onTabChange}
      counts={{ personal: 4, pool: null }}
      {...props}
    />,
  );
  return { ...view, onTabChange };
};

describe('TaskTabs', () => {
  it('marks the open tab as selected and reports the one picked', async () => {
    const { user, onTabChange } = setup();
    const tabs = within(screen.getByRole('tablist', { name: 'Task view' }));
    const pool = tabs.getByRole('tab', { name: /Pool/ });
    expect(tabs.getByRole('tab', { name: /My Tasks/ })).toHaveAttribute('aria-selected', 'true');
    expect(pool).toHaveAttribute('aria-selected', 'false');

    await user.click(pool);
    expect(onTabChange).toHaveBeenCalledWith('pool');
  });

  it('shows a count only once it is known: no data is not a 0', () => {
    setup();
    expect(screen.getByRole('tab', { name: /My Tasks/ })).toHaveTextContent('4');
    expect(screen.getByRole('tab', { name: /Pool/ })).not.toHaveTextContent(/\d/);
  });

  it('keeps the trailing content out of the tab list', () => {
    setup({ trailing: <button type="button">Extra</button> });
    expect(screen.getByRole('button', { name: 'Extra' })).toBeInTheDocument();
    expect(within(screen.getByRole('tablist')).queryByRole('button', { name: 'Extra' })).toBeNull();
  });
});
