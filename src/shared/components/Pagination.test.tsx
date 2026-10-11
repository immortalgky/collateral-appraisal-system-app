import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import '@/i18n';
import { render, screen, within } from '@/test/test-utils';
import Pagination from './Pagination';

function Harness({ initial }: { initial: number }) {
  const [size, setSize] = useState(initial);
  return (
    <Pagination
      currentPage={0}
      totalPages={3}
      totalCount={60}
      pageSize={size}
      onPageChange={() => {}}
      onPageSizeChange={setSize}
    />
  );
}

const optionsOf = async (user: ReturnType<typeof render>['user']) => {
  await user.click(screen.getByRole('button', { name: 'Rows per page' }));
  const options = within(screen.getByRole('listbox'))
    .getAllByRole('option')
    .map(o => o.textContent ?? '');
  await user.keyboard('{Escape}');
  return options;
};

describe('Pagination page size', () => {
  it('lists the common page sizes, 20 included, so a list that starts at 20 can come back to it', async () => {
    const { user } = render(<Harness initial={20} />);
    expect(screen.getByRole('button', { name: 'Rows per page' })).toHaveTextContent('20');
    await user.click(screen.getByRole('button', { name: 'Rows per page' }));
    await user.click(screen.getByRole('option', { name: '50' }));
    expect(await optionsOf(user)).toEqual(['10', '20', '25', '50', '100']);
  });

  it('shows a size outside the options (from the URL) as the selected one, and lists it once', async () => {
    const { user } = render(<Harness initial={15} />);
    expect(screen.getByRole('button', { name: 'Rows per page' })).toHaveTextContent('15');
    expect(await optionsOf(user)).toEqual(['10', '15', '20', '25', '50', '100']);
  });

  it('does not keep a picked size as a default after a remount', async () => {
    const { user, unmount } = render(<Harness initial={25} />);
    await user.click(screen.getByRole('button', { name: 'Rows per page' }));
    await user.click(screen.getByRole('option', { name: '100' }));
    unmount();
    const second = render(<Harness initial={15} />);
    expect(await optionsOf(second.user)).toEqual(['10', '15', '20', '25', '50', '100']);
  });

  it('ignores a nonsense size from the URL instead of listing it', async () => {
    const { user } = render(<Harness initial={5000} />);
    expect(await optionsOf(user)).toEqual(['10', '20', '25', '50', '100']);
  });
});
