import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AdminUserDetail } from '../types';
import UserDetailPanel from './UserDetailPanel';

const state = vi.hoisted(() => ({
  user: undefined as unknown,
  canManageUsers: true,
  askedPermission: undefined as string | undefined,
  resetTwoFactor: vi.fn(),
  revokePasskeys: vi.fn(),
  currentUserId: 'admin-1' as string | undefined,
}));

// The panel pulls in a dozen hooks for sections this test does not look at; stub them all.
const mutation = vi.hoisted(() => () => ({ mutate: vi.fn(), isPending: false }));
vi.mock('../api/users', () => ({
  useGetUserById: () => ({ data: state.user, isLoading: false }),
  useAdminUpdateUser: mutation,
  useUpdateUserRoles: mutation,
  useUpdateUserGroups: mutation,
  useUpdateUserTeams: mutation,
  useSetUserActivation: mutation,
  useUnlockUser: mutation,
  useResetPassword: mutation,
  useLdapLookup: mutation,
  useSetAccessWindow: mutation,
  useChangePassword: mutation,
  useResetTwoFactor: () => ({ mutate: state.resetTwoFactor, isPending: false }),
  useRevokePasskeys: () => ({ mutate: state.revokePasskeys, isPending: false }),
  useGetPasswordPolicy: () => ({ data: undefined }),
}));
vi.mock('../api/roles', () => ({ useGetRoles: () => ({ data: undefined }) }));
vi.mock('../api/groups', () => ({ useGetGroups: () => ({ data: undefined }) }));
vi.mock('../api/teams', () => ({ useGetTeams: () => ({ data: undefined }) }));
vi.mock('../api/companies', () => ({ useGetEligibleCompanies: () => ({ data: undefined }) }));
vi.mock('../admin/api/passwordPolicyAdmin', () => ({
  useGetPasswordPolicyConfig: () => ({ data: undefined }),
}));
vi.mock('@features/auth/store', () => ({
  useAuthStore: (select: (s: { user: { id?: string } }) => unknown) =>
    select({ user: { id: state.currentUserId } }),
}));
vi.mock('@shared/utils/companyName', () => ({ useLocalizedCompanyName: () => (n: string) => n }));
vi.mock('@shared/hooks/useHasPermission', () => ({
  useHasPermission: (permission: string) => {
    state.askedPermission = permission;
    return state.canManageUsers;
  },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const user = (extra: Partial<AdminUserDetail> = {}): AdminUserDetail => ({
  id: 'u1',
  username: 'ann',
  email: 'ann@example.com',
  firstName: 'Ann',
  lastName: 'Lee',
  position: null,
  department: null,
  companyId: null,
  roles: [],
  isActive: true,
  isLocked: false,
  isTemporaryAccess: false,
  accessExpiresAt: null,
  avatarUrl: null,
  authSource: 'Local',
  aoCode: null,
  employeeId: null,
  companyName: null,
  groups: [],
  teams: [],
  lastLoginAt: null,
  twoFactorEnabled: true,
  passkeys: [],
  ...extra,
});

const RESET = 'twoFactor.admin.button';
const REVOKE = 'passkeys.admin.button';
const PASSKEYS = [
  {
    id: 'p1',
    name: 'MacBook Touch ID',
    synced: true,
    createdAt: '2026-10-12T09:00:00',
    lastUsedAt: '2026-10-15T09:14:00',
  },
  {
    id: 'p2',
    name: 'Office PC',
    synced: false,
    createdAt: '2026-10-03T09:00:00',
    lastUsedAt: null,
  },
];

describe('UserDetailPanel Reset 2FA', () => {
  beforeEach(() => {
    state.canManageUsers = true;
    state.askedPermission = undefined;
    state.currentUserId = 'admin-1';
    state.resetTwoFactor.mockReset();
    state.user = user();
  });

  it('is hidden when the user has no 2FA', () => {
    state.user = user({ twoFactorEnabled: false });
    render(<UserDetailPanel userId="u1" />);
    expect(screen.queryByText(RESET)).not.toBeInTheDocument();
  });

  it('is hidden without USER_MANAGE, the permission behind the API policy', () => {
    state.canManageUsers = false;
    render(<UserDetailPanel userId="u1" />);
    expect(state.askedPermission).toBe('USER_MANAGE');
    expect(screen.queryByText(RESET)).not.toBeInTheDocument();
  });

  it("is hidden on the signed-in admin's own account (managed from Profile)", () => {
    state.currentUserId = 'u1';
    render(<UserDetailPanel userId="u1" />);
    expect(screen.queryByText(RESET)).not.toBeInTheDocument();
  });

  it('is offered for an LDAP account too', () => {
    state.user = user({ authSource: 'LDAP' });
    render(<UserDetailPanel userId="u1" />);
    expect(screen.getByText(RESET)).toBeInTheDocument();
  });

  it('asks first, and only calls the API after confirming', () => {
    render(<UserDetailPanel userId="u1" />);
    expect(screen.queryByText('twoFactor.admin.confirmTitle')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(RESET));
    expect(screen.getByText('twoFactor.admin.confirmTitle')).toBeInTheDocument();
    expect(state.resetTwoFactor).not.toHaveBeenCalled();

    // The dialog's confirm button carries the same label as the one that opened it.
    const dialog = screen.getByText('twoFactor.admin.confirmTitle').closest('dialog')!;
    const confirm = Array.from(dialog.querySelectorAll('button')).find(
      b => b.textContent === RESET,
    )!;
    fireEvent.click(confirm);
    expect(state.resetTwoFactor).toHaveBeenCalledTimes(1);
    expect(state.resetTwoFactor.mock.calls[0][0]).toBe('u1');
  });

  it('cancelling does not call the API', () => {
    render(<UserDetailPanel userId="u1" />);
    fireEvent.click(screen.getByText(RESET));
    fireEvent.click(screen.getByText('actions.cancel'));
    expect(state.resetTwoFactor).not.toHaveBeenCalled();
    expect(screen.queryByText('twoFactor.admin.confirmTitle')).not.toBeInTheDocument();
  });
});

describe('UserDetailPanel passkeys', () => {
  beforeEach(() => {
    state.canManageUsers = true;
    state.currentUserId = 'admin-1';
    state.revokePasskeys.mockReset();
    state.user = user({ passkeys: PASSKEYS });
  });

  it('lists each passkey read-only: name, type and last use', () => {
    render(<UserDetailPanel userId="u1" />);
    expect(screen.getByText('MacBook Touch ID')).toBeInTheDocument();
    expect(screen.getByText('passkeys.typeSynced')).toBeInTheDocument();
    expect(screen.getByText('Office PC')).toBeInTheDocument();
    expect(screen.getByText('passkeys.typeDevice')).toBeInTheDocument();
    expect(screen.getByText('passkeys.neverUsed')).toBeInTheDocument();
  });

  it('shows neither list nor button when the user has none, or the API sends no field', () => {
    state.user = user({ passkeys: [] });
    const first = render(<UserDetailPanel userId="u1" />);
    expect(screen.queryByText('passkeys.admin.title')).not.toBeInTheDocument();
    expect(screen.queryByText(REVOKE)).not.toBeInTheDocument();
    first.unmount();

    state.user = { ...user(), passkeys: undefined };
    render(<UserDetailPanel userId="u1" />);
    expect(screen.queryByText(REVOKE)).not.toBeInTheDocument();
  });

  it('keeps the list but hides the button without USER_MANAGE', () => {
    state.canManageUsers = false;
    render(<UserDetailPanel userId="u1" />);
    expect(screen.getByText('MacBook Touch ID')).toBeInTheDocument();
    expect(screen.queryByText(REVOKE)).not.toBeInTheDocument();
  });

  it("hides the button on the signed-in admin's own account, like Reset 2FA", () => {
    state.currentUserId = 'u1';
    render(<UserDetailPanel userId="u1" />);
    expect(screen.getByText('MacBook Touch ID')).toBeInTheDocument();
    expect(screen.queryByText(REVOKE)).not.toBeInTheDocument();
  });

  it('is offered with a passkey even when the user has no 2FA', () => {
    state.user = user({ twoFactorEnabled: false, passkeys: PASSKEYS });
    render(<UserDetailPanel userId="u1" />);
    expect(screen.getByText(REVOKE)).toBeInTheDocument();
    expect(screen.queryByText('twoFactor.admin.button')).not.toBeInTheDocument();
  });

  it('asks first, and only calls the API after confirming', () => {
    render(<UserDetailPanel userId="u1" />);
    fireEvent.click(screen.getByText(REVOKE));
    expect(screen.getByText('passkeys.admin.confirmTitle')).toBeInTheDocument();
    expect(state.revokePasskeys).not.toHaveBeenCalled();

    const dialog = screen.getByText('passkeys.admin.confirmTitle').closest('dialog')!;
    const confirm = Array.from(dialog.querySelectorAll('button')).find(
      b => b.textContent === REVOKE,
    )!;
    fireEvent.click(confirm);
    expect(state.revokePasskeys).toHaveBeenCalledTimes(1);
    expect(state.revokePasskeys.mock.calls[0][0]).toBe('u1');
  });

  it('cancelling does not call the API', () => {
    render(<UserDetailPanel userId="u1" />);
    fireEvent.click(screen.getByText(REVOKE));
    fireEvent.click(screen.getByText('actions.cancel'));
    expect(state.revokePasskeys).not.toHaveBeenCalled();
    expect(screen.queryByText('passkeys.admin.confirmTitle')).not.toBeInTheDocument();
  });
});
