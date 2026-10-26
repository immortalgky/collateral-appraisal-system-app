import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { act, render, screen, userEvent, within } from '@/test/test-utils';
import CreateUserPanel from './CreateUserPanel';

type LookupCallbacks = { onSuccess: (d: object) => void; onError: () => void };
const { createMutate, lookupMutate, lookup, toastSuccess, toastError } = vi.hoisted(() => ({
  createMutate: vi.fn(),
  lookupMutate: vi.fn(),
  // The mutation in flight: its callbacks, and a way to finish it (like the server answering).
  lookup: {
    callbacks: null as LookupCallbacks | null,
    finish: null as unknown as (data: object) => void,
    fail: null as unknown as () => void,
  },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: toastSuccess, error: toastError } }));
const empty = { data: undefined };
const companies = { data: { companies: [{ id: 'c1', name: 'Acme', nameLocal: 'Acme' }] } };
const rolesFor = (scope: string) => ({
  data: { items: [{ id: 'r1', name: 'Admin', scope, description: '' }] },
});
vi.mock('../api/users', () => ({
  useCreateUser: () => ({ mutate: createMutate, isPending: false }),
  // Behaves like a TanStack v5 mutation for what the panel relies on: pending after mutate()
  // until the answer; a second mutate() replaces the callbacks, so the old ones never fire.
  useLdapLookup: () => {
    const [state, setState] = useState<{ isPending: boolean; variables?: string }>({
      isPending: false,
    });
    const mutate = (username: string, callbacks: LookupCallbacks) => {
      lookupMutate(username, callbacks);
      lookup.callbacks = callbacks;
      setState({ isPending: true, variables: username });
    };
    lookup.finish = data => {
      setState(prev => ({ ...prev, isPending: false }));
      lookup.callbacks?.onSuccess(data);
    };
    lookup.fail = () => {
      setState(prev => ({ ...prev, isPending: false }));
      lookup.callbacks?.onError();
    };
    return { mutate, ...state };
  },
}));
vi.mock('../api/roles', () => ({ useGetRoles: ({ scope }: { scope: string }) => rolesFor(scope) }));
vi.mock('../api/groups', () => ({ useGetGroups: () => empty }));
vi.mock('../api/teams', () => ({ useGetTeams: () => empty }));
vi.mock('../api/companies', () => ({ useGetAdminCompanies: () => companies }));
vi.mock('../hooks/usePasswordPolicyChecks', () => ({
  usePasswordPolicyChecks: () => ({ allPassed: true, checks: [] }),
}));

beforeEach(() => {
  lookup.callbacks = null;
});

const ldapBtn = () => screen.getByRole('button', { name: /^LDAP \/ Active Directory$/ });
const localBtn = () => screen.getByRole('button', { name: /^Local password$/ });
const scopeBtn = (name: 'Bank' | 'Company') => screen.getByRole('button', { name });
const tempBox = () => screen.getByRole('checkbox', { name: /Temporary-access/ });
const pressed = (el: HTMLElement) => el.getAttribute('aria-pressed') === 'true';

const selectRole = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(within(screen.getByRole('row', { name: /Admin/ })).getByRole('checkbox'));

type User = ReturnType<typeof userEvent.setup>;
const fillRequired = async (user: User) => {
  await user.type(screen.getByLabelText(/^Username/), 'jdoe');
  await user.type(screen.getByLabelText(/^Email/), 'jdoe@bank.test');
  await user.type(screen.getByLabelText(/^First Name/), 'Jane');
  await user.type(screen.getByLabelText(/^Last Name/), 'Doe');
  await selectRole(user);
};
const create = (user: User) => user.click(screen.getByRole('button', { name: 'Create' }));
const submitted = () => createMutate.mock.calls[0][0];

/** Starts a lookup for "jdoe" and returns the response callback to fire later. */
const startLookup = async (user: User) => {
  await user.type(screen.getByLabelText(/^Username/), 'jdoe');
  await user.click(screen.getByRole('button', { name: 'Retrieve from LDAP' }));
  return (data: object) => lookup.finish(data);
};
const response = {
  found: true,
  username: 'JDoe',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'ldap@bank.test',
  department: 'Appraisal',
  position: 'Senior Appraiser',
};

describe('CreateUserPanel authentication default', () => {
  it('defaults to LDAP for Bank scope', () => {
    render(<CreateUserPanel onCancel={vi.fn()} />);
    expect(pressed(ldapBtn())).toBe(true);
    expect(ldapBtn()).not.toHaveAttribute('aria-disabled');
  });

  it('forces Local and disables LDAP for Company scope, restores LDAP on Bank', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(scopeBtn('Company'));
    expect(pressed(localBtn())).toBe(true);
    expect(ldapBtn()).toHaveAttribute('aria-disabled', 'true');
    await user.click(ldapBtn());
    expect(pressed(localBtn())).toBe(true);
    await user.click(scopeBtn('Bank'));
    expect(pressed(ldapBtn())).toBe(true);
    expect(ldapBtn()).not.toHaveAttribute('aria-disabled');
  });

  it('ticking temporary access forces Local; unticking returns to LDAP', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(tempBox());
    expect(pressed(localBtn())).toBe(true);
    expect(ldapBtn()).toHaveAttribute('aria-disabled', 'true');
    await user.click(tempBox());
    expect(pressed(ldapBtn())).toBe(true);
  });

  it('stays Local after untick while Company scope', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(scopeBtn('Company'));
    await user.click(tempBox());
    await user.click(tempBox());
    expect(pressed(localBtn())).toBe(true);
    expect(ldapBtn()).toHaveAttribute('aria-disabled', 'true');
  });

  it('stays Local when temporary access is ticked and scope goes Company then Bank', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(tempBox());
    await user.click(scopeBtn('Company'));
    await user.click(scopeBtn('Bank'));
    expect(pressed(localBtn())).toBe(true);
    expect(ldapBtn()).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps a chosen Local, typed password and selections when Bank is re-clicked', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(localBtn());
    await user.type(screen.getByLabelText(/^Password/), 'Secret#123');
    await selectRole(user);
    await user.click(scopeBtn('Bank'));
    expect(pressed(localBtn())).toBe(true);
    expect(screen.getByLabelText(/^Password/)).toHaveValue('Secret#123');
    expect(within(screen.getByRole('row', { name: /Admin/ })).getByRole('checkbox')).toBeChecked();
  });

  it('keeps Company scope, its company and Local when Company is re-clicked', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(scopeBtn('Company'));
    await user.type(screen.getByLabelText(/^Password/), 'Secret#123');
    await user.click(scopeBtn('Company'));
    expect(pressed(scopeBtn('Company'))).toBe(true);
    expect(pressed(localBtn())).toBe(true);
    expect(screen.getByLabelText(/^Password/)).toHaveValue('Secret#123');
  });

  it('keeps the chosen company when Company is re-clicked', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(scopeBtn('Company'));
    await user.click(screen.getByRole('button', { name: /Select a company/ }));
    await user.click(screen.getByRole('option', { name: /Acme/ }));
    await user.click(scopeBtn('Company'));
    expect(screen.queryByRole('button', { name: /Select a company/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Acme/ })).toBeInTheDocument();
  });

  it('clears a typed password when returning to LDAP', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(scopeBtn('Company'));
    await user.type(screen.getByLabelText(/^Password/), 'Secret#123');
    await user.type(screen.getByLabelText(/^Confirm Password/), 'Secret#123');
    await user.click(scopeBtn('Bank'));
    await user.click(localBtn());
    expect(screen.getByLabelText(/^Password/)).toHaveValue('');
    expect(screen.getByLabelText(/^Confirm Password/)).toHaveValue('');
  });

  it('clears a typed password when temporary access is ticked', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(scopeBtn('Company'));
    await user.type(screen.getByLabelText(/^Password/), 'Secret#123');
    await user.type(screen.getByLabelText(/^Confirm Password/), 'Secret#123');
    await user.click(tempBox());
    await user.click(tempBox());
    expect(screen.getByLabelText(/^Password/)).toHaveValue('');
    expect(screen.getByLabelText(/^Confirm Password/)).toHaveValue('');
  });

  it('keeps a Bank Local typed password when switching to Company', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(localBtn());
    await user.type(screen.getByLabelText(/^Password/), 'Secret#123');
    await user.click(scopeBtn('Company'));
    expect(pressed(localBtn())).toBe(true);
    expect(screen.getByLabelText(/^Password/)).toHaveValue('Secret#123');
  });

  it('keeps an explicit Local with its password after Bank to Company and back to Bank', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(localBtn());
    await user.type(screen.getByLabelText(/^Password/), 'Secret#123');
    await user.click(scopeBtn('Company'));
    await user.click(scopeBtn('Bank'));
    expect(pressed(localBtn())).toBe(true);
    expect(ldapBtn()).not.toHaveAttribute('aria-disabled');
    expect(screen.getByLabelText(/^Password/)).toHaveValue('Secret#123');
  });

  it('keeps an explicit Local after temporary access is ticked and unticked', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(localBtn());
    await user.click(tempBox());
    await user.click(tempBox());
    expect(pressed(localBtn())).toBe(true);
    expect(ldapBtn()).not.toHaveAttribute('aria-disabled');
  });

  it('goes back to LDAP after an explicit Local is switched back to LDAP', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(localBtn());
    await user.click(ldapBtn());
    await user.click(scopeBtn('Company'));
    await user.click(scopeBtn('Bank'));
    expect(pressed(ldapBtn())).toBe(true);
  });

  it('does not treat a Local click in Company scope as a preference', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(scopeBtn('Company'));
    await user.click(localBtn());
    await user.click(scopeBtn('Bank'));
    expect(pressed(ldapBtn())).toBe(true);
  });

  it('ignores a click on the locked LDAP button under temporary access', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(tempBox());
    await user.click(ldapBtn());
    expect(pressed(localBtn())).toBe(true);
    expect(pressed(ldapBtn())).toBe(false);
  });

  it('does not treat a Local click under temporary access as a preference', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(tempBox());
    await user.click(localBtn());
    await user.click(tempBox());
    expect(pressed(ldapBtn())).toBe(true);
  });

  it('explains why LDAP is unavailable, and ties the hint to the disabled button', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const hint = /LDAP isn't available for company users or temporary-access accounts/;
    expect(screen.queryByText(hint)).not.toBeInTheDocument();
    await user.click(scopeBtn('Company'));
    expect(ldapBtn()).toHaveAccessibleDescription(hint);
    await user.click(scopeBtn('Bank'));
    expect(screen.queryByText(hint)).not.toBeInTheDocument();
    await user.click(tempBox());
    expect(ldapBtn()).toHaveAccessibleDescription(hint);
  });

  it('is Local with LDAP disabled and a hint for Company plus temporary access', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(scopeBtn('Company'));
    await user.click(tempBox());
    expect(pressed(localBtn())).toBe(true);
    expect(ldapBtn()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getAllByText(/LDAP isn't available/)).toHaveLength(1);
  });

  it('does not render Retrieve from LDAP while the form is on Local', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Retrieve from LDAP' })).toBeInTheDocument();
    await user.click(localBtn());
    expect(screen.queryByRole('button', { name: 'Retrieve from LDAP' })).not.toBeInTheDocument();
  });
});

describe('CreateUserPanel submit', () => {
  it('sends a Bank user as LDAP with no password by default', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await fillRequired(user);
    await create(user);
    expect(submitted()).toMatchObject({
      username: 'jdoe',
      authSource: 'LDAP',
      password: '',
      isTemporaryAccess: false,
      roles: ['r1'],
    });
  });

  it('sends an explicit Bank Local user with the typed password', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(localBtn());
    await fillRequired(user);
    await user.type(screen.getByLabelText(/^Password/), 'Secret#123');
    await user.type(screen.getByLabelText(/^Confirm Password/), 'Secret#123');
    await create(user);
    expect(submitted()).toMatchObject({ authSource: 'Local', password: 'Secret#123' });
  });

  it('sends a Company user as Local', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(scopeBtn('Company'));
    await fillRequired(user);
    await user.type(screen.getByLabelText(/^Password/), 'Secret#123');
    await user.type(screen.getByLabelText(/^Confirm Password/), 'Secret#123');
    await user.click(screen.getByRole('button', { name: /Select a company/ }));
    await user.click(screen.getByRole('option', { name: /Acme/ }));
    await create(user);
    expect(submitted()).toMatchObject({
      authSource: 'Local',
      companyId: 'c1',
      password: 'Secret#123',
    });
  });

  it('sends a temporary-access user as Local with no password', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await user.click(tempBox());
    await fillRequired(user);
    await create(user);
    expect(submitted()).toMatchObject({
      authSource: 'Local',
      password: '',
      isTemporaryAccess: true,
    });
  });
});

describe('CreateUserPanel LDAP lookup', () => {
  it('fills the profile from an in-time response and stays LDAP', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const onSuccess = await startLookup(user);
    act(() => onSuccess(response));
    expect(screen.getByLabelText(/^Username/)).toHaveValue('JDoe');
    expect(screen.getByLabelText(/^First Name/)).toHaveValue('Jane');
    expect(screen.getByLabelText(/^Last Name/)).toHaveValue('Doe');
    expect(screen.getByLabelText(/^Email/)).toHaveValue('ldap@bank.test');
    expect(screen.getByLabelText(/^Department/)).toHaveValue('Appraisal');
    expect(screen.getByLabelText(/^Position/)).toHaveValue('Senior Appraiser');
    expect(pressed(ldapBtn())).toBe(true);
  });

  it('drops a response that arrives after switching to Local', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const onSuccess = await startLookup(user);
    await user.click(localBtn());
    await user.type(screen.getByLabelText(/^Email/), 'mine@bank.test');
    await user.type(screen.getByLabelText(/^Password/), 'Secret#123');
    act(() => onSuccess(response));
    expect(pressed(localBtn())).toBe(true);
    expect(screen.getByLabelText(/^Username/)).toHaveValue('jdoe');
    expect(screen.getByLabelText(/^First Name/)).toHaveValue('');
    expect(screen.getByLabelText(/^Email/)).toHaveValue('mine@bank.test');
    expect(screen.getByLabelText(/^Password/)).toHaveValue('Secret#123');
  });

  it('drops a response that arrives after switching to Company', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const onSuccess = await startLookup(user);
    await user.click(scopeBtn('Company'));
    act(() => onSuccess(response));
    expect(pressed(localBtn())).toBe(true);
    expect(screen.getByLabelText(/^First Name/)).toHaveValue('');
    expect(screen.getByLabelText(/^Email/)).toHaveValue('');
  });

  it('drops a response for a username that has since been edited', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const onSuccess = await startLookup(user);
    await user.type(screen.getByLabelText(/^Username/), '2');
    act(() => onSuccess(response));
    expect(screen.getByLabelText(/^Username/)).toHaveValue('jdoe2');
    expect(screen.getByLabelText(/^First Name/)).toHaveValue('');
  });

  it('shows no toast for a dropped answer, found or not', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const onSuccess = await startLookup(user);
    await user.click(localBtn());
    act(() => onSuccess(response));
    act(() => onSuccess({ found: false }));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('toasts for an accepted answer, found or not', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const onSuccess = await startLookup(user);
    act(() => onSuccess(response));
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    act(() => onSuccess({ found: false }));
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('accepts an answer after Bank to Company and back to Bank', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const onSuccess = await startLookup(user);
    await user.click(scopeBtn('Company'));
    await user.click(scopeBtn('Bank'));
    act(() => onSuccess(response));
    expect(screen.getByLabelText(/^First Name/)).toHaveValue('Jane');
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it('accepts an answer after LDAP to Local and back to LDAP', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const onSuccess = await startLookup(user);
    await user.click(localBtn());
    await user.click(ldapBtn());
    act(() => onSuccess(response));
    expect(screen.getByLabelText(/^First Name/)).toHaveValue('Jane');
  });

  it('drops an answer after temporary access is ticked', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const onSuccess = await startLookup(user);
    await user.click(tempBox());
    act(() => onSuccess(response));
    expect(screen.getByLabelText(/^First Name/)).toHaveValue('');
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  const retrieve = () => screen.getByRole('button', { name: 'Retrieve from LDAP' });

  it('keeps Retrieve busy while pending and the form matches, free after the answer', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const onSuccess = await startLookup(user);
    expect(retrieve()).toBeDisabled();
    act(() => onSuccess(response));
    expect(retrieve()).toBeEnabled();
  });

  it('frees Retrieve as soon as the username is edited', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await startLookup(user);
    await user.type(screen.getByLabelText(/^Username/), '2');
    expect(retrieve()).toBeEnabled();
  });

  it.each([
    ['Local', async (u: User) => u.click(localBtn()), async (u: User) => u.click(ldapBtn())],
    [
      'Company',
      async (u: User) => u.click(scopeBtn('Company')),
      async (u: User) => u.click(scopeBtn('Bank')),
    ],
    [
      'temporary access',
      async (u: User) => u.click(tempBox()),
      async (u: User) => u.click(tempBox()),
    ],
  ])(
    'frees Retrieve for a corrected username after leaving and returning via %s',
    async (_n, leave, back) => {
      const user = userEvent.setup();
      render(<CreateUserPanel onCancel={vi.fn()} />);
      await startLookup(user);
      await leave(user);
      await user.type(screen.getByLabelText(/^Username/), '2');
      await back(user);
      expect(retrieve()).toBeEnabled();
    },
  );

  it('keeps Retrieve busy and accepts the answer after a round trip with the same username', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const onSuccess = await startLookup(user);
    await user.click(localBtn());
    await user.click(ldapBtn());
    expect(retrieve()).toBeDisabled();
    act(() => onSuccess(response));
    expect(screen.getByLabelText(/^First Name/)).toHaveValue('Jane');
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it('accepts an answer when only the case of the username changed', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    const onSuccess = await startLookup(user);
    await user.clear(screen.getByLabelText(/^Username/));
    await user.type(screen.getByLabelText(/^Username/), 'JDOE');
    act(() => onSuccess({ ...response, username: 'JDOE' }));
    expect(screen.getByLabelText(/^First Name/)).toHaveValue('Jane');
  });

  it('on a failed current lookup toasts the error, fills nothing and frees Retrieve', async () => {
    const user = userEvent.setup();
    render(<CreateUserPanel onCancel={vi.fn()} />);
    await startLookup(user);
    expect(retrieve()).toBeDisabled();
    act(() => lookup.fail());
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^First Name/)).toHaveValue('');
    expect(retrieve()).toBeEnabled();
  });
});
