import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import SearchUserModal from './SearchUserModal';

const person = (id: string, name: string) => ({
  userId: `guid-${id}`,
  employeeId: id,
  name,
  email: `${id}@bank.test`,
  contactNo: null,
  aoCode: null,
  costCenterCode: null,
  costCenterDescription: null,
  department: 'Credit',
});

const respond = () =>
  server.use(
    http.get('*/auth/requestors', () =>
      HttpResponse.json({
        items: [person('E001', 'Somchai Current'), person('E002', 'Malee Other')],
        count: 2,
        pageNumber: 1,
        pageSize: 20,
      }),
    ),
  );

const current = { employeeId: 'E001', name: 'Somchai Current', email: 'E001@bank.test' };

const open = (props: Partial<React.ComponentProps<typeof SearchUserModal>> = {}) => {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <SearchUserModal
      isOpen
      onClose={onClose}
      onSelect={onSelect}
      initialRequestor={current}
      {...props}
    />,
  );
  return { ...view, onSelect, onClose };
};

describe('SearchUserModal', () => {
  it('search, select and confirm calls back with the chosen user and closes', async () => {
    respond();
    const { user, onSelect, onClose } = open();
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByRole('combobox'), 'ma');
    expect(await screen.findByText('2 found')).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /Malee Other/ }));
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 'E002', name: 'Malee Other' }),
    );
    expect(onSelect.mock.calls[0][0]).not.toHaveProperty('userId');
    expect(onClose).toHaveBeenCalled();
  });

  it('marks the current requestor and will not confirm them', async () => {
    respond();
    const { user, onSelect } = open();
    await user.type(screen.getByRole('combobox'), 'so');
    const row = await screen.findByRole('option', { name: /Somchai Current/ });
    expect(row).toHaveTextContent('Current');
    await user.click(row);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('arrow keys move the selection and Enter confirms it', async () => {
    respond();
    const { user, onSelect } = open();
    await user.type(screen.getByRole('combobox'), 'so');
    await screen.findByText('2 found');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 'E002' }));
  });

  it('double-click on a row confirms it', async () => {
    respond();
    const { user, onSelect } = open();
    await user.type(screen.getByRole('combobox'), 'ma');
    await user.dblClick(await screen.findByRole('option', { name: /Malee Other/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 'E002' }));
  });

  it('read-only shows the summary and a close button, no search', () => {
    const { onClose } = open({ readOnly: true });
    expect(screen.getByText('Somchai Current')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).toBeNull();
    screen.getByRole('button', { name: 'Close' }).click();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the employee code as the name, and its first two characters as the initials, for a user with no name', async () => {
    server.use(
      http.get('*/auth/requestors', () =>
        HttpResponse.json({
          items: [{ ...person('CBS0002S02', '- -'), name: '- -' }],
          count: 1,
          pageNumber: 1,
          pageSize: 20,
        }),
      ),
    );
    const { user } = open({ initialRequestor: { employeeId: 'CBS0002S02', name: '- -' } });
    // The current-requestor card
    expect(screen.getAllByText('CBS0002S02').length).toBeGreaterThan(0);
    expect(screen.queryByText('- -')).toBeNull();
    expect(screen.getByText('CB')).toBeInTheDocument();
    // And the result row
    await user.type(screen.getByRole('combobox'), 'cbs');
    const row = await screen.findByRole('option');
    expect(row).toHaveTextContent('CB');
    expect(row).not.toHaveTextContent('- -');
  });
});
