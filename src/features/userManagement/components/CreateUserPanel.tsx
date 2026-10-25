import { useId, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Button from '@shared/components/Button';
import TextInput from '@shared/components/inputs/TextInput';
import Dropdown from '@shared/components/inputs/Dropdown';
import Icon from '@shared/components/Icon';
import AssignmentTable from './AssignmentTable';
import PasswordPolicyChecklist from './PasswordPolicyChecklist';
import { usePasswordPolicyChecks } from '../hooks/usePasswordPolicyChecks';
import { useCreateUser, useLdapLookup } from '../api/users';
import { useGetRoles } from '../api/roles';
import { useGetGroups } from '../api/groups';
import { useGetTeams } from '../api/teams';
import { useGetAdminCompanies } from '../api/companies';
import { useLocalizedCompanyName } from '@shared/utils/companyName';

interface CreateUserPanelProps {
  onCreated?: (userId: string) => void;
  onCancel: () => void;
}

type AuthSource = 'Local' | 'LDAP';
type AccessTab = 'roles' | 'groups' | 'teams';
type Scope = 'Bank' | 'Company';

interface FormState {
  scope: Scope;
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  aoCode: string;
  employeeId: string;
  companyId: string;
  roles: string[];
  groups: string[];
  teams: string[];
  authSource: AuthSource;
  /** Ad-hoc account: no password, starts closed, gets one per admin-opened access window. */
  isTemporaryAccess: boolean;
  /** The admin's last explicit auth choice (initially the LDAP default), restored whenever LDAP is allowed again. */
  preferredAuth: AuthSource;
}

const EMPTY_FORM: FormState = {
  scope: 'Bank',
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  firstName: '',
  lastName: '',
  position: '',
  department: '',
  aoCode: '',
  employeeId: '',
  companyId: '',
  roles: [],
  groups: [],
  teams: [],
  authSource: 'LDAP',
  isTemporaryAccess: false,
  preferredAuth: 'LDAP',
};

// LDAP needs an AD account: company staff are outside the bank's AD, and a temporary-access
// account is issued a local password per access window — both must authenticate locally.
const canUseLdap = (f: Pick<FormState, 'scope' | 'isTemporaryAccess'>) =>
  f.scope === 'Bank' && !f.isTemporaryAccess;

// Re-derive the auth source: the admin's preference (LDAP by default) whenever LDAP is allowed,
// else Local. LDAP users authenticate against AD, so LDAP drops any typed local password; a
// temporary-access account is issued a password per access window, so it never keeps one either.
const withDefaultAuth = (f: FormState): FormState => {
  if (!canUseLdap(f)) {
    return {
      ...f,
      authSource: 'Local',
      ...(f.isTemporaryAccess && { password: '', confirmPassword: '' }),
    };
  }
  if (f.preferredAuth === 'Local') return { ...f, authSource: 'Local' };
  return { ...f, authSource: 'LDAP', password: '', confirmPassword: '' };
};

// A lookup answer may only be applied while the form still matches what was looked up.
// (LDAP is only selectable when canUseLdap holds, so authSource alone covers scope/temporary.)
const isLookupCurrent = (f: FormState, sentUsername: string) =>
  f.authSource === 'LDAP' && f.username.trim().toLowerCase() === sentUsername.toLowerCase();

const ICON_COLORS = {
  blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500',
  rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-500',
  cyan: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-500',
  amber: 'bg-(--palette-warn-wash) text-amber-500',
  violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-500',
} as const;

const SectionLabel = ({
  icon,
  color,
  children,
}: {
  icon: string;
  color: keyof typeof ICON_COLORS;
  children: React.ReactNode;
}) => (
  <div className="mb-3 flex items-center gap-2">
    <div className={clsx('flex size-6 items-center justify-center rounded-md', ICON_COLORS[color])}>
      <Icon name={icon} style="solid" className="size-3" />
    </div>
    <span className="text-sm font-semibold text-(--palette-ink)">{children}</span>
  </div>
);

const Hint = ({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    id={id}
    className={clsx(
      'flex items-center rounded-lg bg-(--palette-surface-2) border border-(--palette-line-soft) px-3 py-2',
      className,
    )}
  >
    <p className="text-xs text-(--palette-gray-500)">{children}</p>
  </div>
);

const CreateUserPanel = ({ onCreated, onCancel }: CreateUserPanelProps) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const localizeCompanyName = useLocalizedCompanyName();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // Latest form for async callbacks (the lookup answer), so they judge the current state.
  const formRef = useRef(form);
  useLayoutEffect(() => {
    formRef.current = form;
  }, [form]);
  const [accessTab, setAccessTab] = useState<AccessTab>('roles');
  const createUser = useCreateUser();
  const ldapLookup = useLdapLookup();

  const isLdap = form.authSource === 'LDAP';
  const isCompany = form.scope === 'Company';
  const ldapLocked = !canUseLdap(form);
  const ldapHintId = useId();

  // Live password-policy evaluation (same DB-maintained policy as every other password field).
  const { allPassed: passwordPolicyMet } = usePasswordPolicyChecks(form.password);

  // Roles/Groups are scoped server-side by the Bank/Company toggle. Teams have no scope
  // param, so filter client-side by type (Bank → Internal, Company → External).
  const { data: rolesData } = useGetRoles({ scope: form.scope, pageSize: 200 });
  const { data: groupsData } = useGetGroups({ scope: form.scope, pageSize: 200 });
  const { data: teamsData } = useGetTeams({ pageSize: 200 });
  const { data: companiesData } = useGetAdminCompanies({ pageSize: 200 });
  // Only show options whose scope matches the selected Bank/Company scope.
  const roleOptions = (rolesData?.items ?? []).filter(r => r.scope === form.scope);
  const groupOptions = (groupsData?.items ?? []).filter(g => g.scope === form.scope);
  const teamOptions = (teamsData?.items ?? []).filter(tm => tm.scope === form.scope);
  const companies = companiesData?.companies ?? [];

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // Switching scope changes which roles/groups/teams are valid, so clear those selections.
  // Bank users carry position/department; Company users carry a company instead.
  const setScope = (scope: Scope) => {
    // Re-clicking the selected scope must not wipe selections or a chosen auth source.
    setForm(prev =>
      prev.scope === scope
        ? prev
        : withDefaultAuth({
            ...prev,
            scope,
            roles: [],
            groups: [],
            teams: [],
            companyId: scope === 'Bank' ? '' : prev.companyId,
            department: scope === 'Company' ? '' : prev.department,
            aoCode: scope === 'Company' ? '' : prev.aoCode,
            employeeId: scope === 'Company' ? '' : prev.employeeId,
          }),
    );
    setAccessTab('roles');
  };

  const setAuthSource = (src: AuthSource) =>
    // Company / temporary access can only be Local, so a click there is not a preference.
    setForm(prev => (canUseLdap(prev) ? withDefaultAuth({ ...prev, preferredAuth: src }) : prev));

  // A temporary-access account must authenticate locally — LDAP has no concept of an
  // admin-opened window — and gets no password here.
  const setTemporaryAccess = (value: boolean) =>
    setForm(prev => withDefaultAuth({ ...prev, isTemporaryAccess: value }));

  const handleLdapLookup = () => {
    if (!form.username.trim()) {
      toast.error(t('validation.usernameRequired'));
      return;
    }
    const sentUsername = form.username.trim();
    ldapLookup.mutate(sentUsername, {
      onSuccess: data => {
        // A late answer for a changed form (Local/Company/temporary/other username) is dropped
        // silently: no fill and no toast.
        if (!isLookupCurrent(formRef.current, sentUsername)) return;
        if (!data.found) {
          toast.error(t('toasts.ldapUserNotFound', 'User not found in LDAP/AD'));
          return;
        }
        setForm(prev => ({
          ...prev,
          username: data.username || prev.username,
          email: data.email ?? prev.email,
          firstName: data.firstName ?? prev.firstName,
          lastName: data.lastName ?? prev.lastName,
          department: data.department ?? prev.department,
          position: data.position ?? prev.position,
        }));
        toast.success(t('toasts.ldapInfoLoaded', 'Loaded info from LDAP'));
      },
      onError: () => {
        toast.error(t('toasts.ldapLookupFailed', 'LDAP lookup failed'));
      },
    });
  };

  const validate = (): string | null => {
    if (!form.username.trim()) return t('validation.usernameRequired');
    if (!form.email.trim()) return t('validation.emailRequired');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return t('validation.emailInvalid');
    // LDAP users authenticate against AD, and temporary-access accounts get no password at
    // all (one is issued per access window) — neither carries a local password here.
    if (!isLdap && !form.isTemporaryAccess) {
      if (!form.password) return t('validation.passwordRequired');
      // Complexity is driven by the DB-maintained policy (see the checklist below the field).
      if (!passwordPolicyMet) return t('validation.passwordPolicyNotMet');
      if (!form.confirmPassword) return t('validation.confirmPasswordRequired');
      if (form.password !== form.confirmPassword) return t('validation.passwordsDoNotMatch');
    }
    if (!form.firstName.trim()) return t('validation.firstNameRequired');
    if (!form.lastName.trim()) return t('validation.lastNameRequired');
    if (isCompany && !form.companyId) return t('validation.companyRequired');
    if (form.roles.length === 0) return t('validation.selectAtLeastOneRole');
    return null;
  };

  const handleCreate = () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    createUser.mutate(
      {
        username: form.username.trim(),
        password: isLdap || form.isTemporaryAccess ? '' : form.password,
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        position: form.position.trim() || null,
        department: isCompany ? null : form.department.trim() || null,
        aoCode: isCompany ? null : form.aoCode.trim() || null,
        employeeId: isCompany ? null : form.employeeId.trim() || null,
        companyId: isCompany ? form.companyId : null,
        roles: form.roles,
        groupIds: form.groups,
        teamIds: form.teams,
        authSource: form.authSource,
        isTemporaryAccess: form.isTemporaryAccess,
      },
      {
        onSuccess: data => {
          toast.success(t('toasts.userCreated'));
          if (data?.id) onCreated?.(data.id);
        },
        onError: (err: unknown) => {
          // The shared axios interceptor attaches a normalized `apiError` ({ detail, title }).
          const apiError = (err as { apiError?: { detail?: string; title?: string } })?.apiError;
          toast.error(apiError?.detail || apiError?.title || t('toasts.userUpdateFailed'));
        },
      },
    );
  };

  const ACCESS_TABS: { key: AccessTab; label: string; count: number; required?: boolean }[] = [
    { key: 'roles', label: t('sections.roles'), count: form.roles.length, required: true },
    { key: 'groups', label: t('sections.groups'), count: form.groups.length },
    { key: 'teams', label: t('sections.teams'), count: form.teams.length },
  ];

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-(--palette-line-soft) bg-(--palette-surface) px-6 py-4">
        <h3 className="text-base font-semibold text-(--palette-ink)">
          {t('dialogs.createUser.title')}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('common:actions.cancel')}
          className="text-(--palette-gray-400) transition-colors hover:text-(--palette-gray-600)"
        >
          <Icon name="xmark" style="solid" className="size-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-5 p-6">
        {/* Scope — Bank vs Company drives roles/groups/teams and profile fields */}
        <section>
          <SectionLabel icon="building" color="blue">
            {t('fields.scope')}
          </SectionLabel>
          <div className="inline-flex rounded-lg border border-(--palette-line) p-0.5">
            {(['Bank', 'Company'] as Scope[]).map(s => (
              <button
                key={s}
                type="button"
                aria-pressed={form.scope === s}
                onClick={() => setScope(s)}
                className={clsx(
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                  form.scope === s
                    ? 'bg-primary text-white'
                    : 'text-(--palette-gray-500) hover:text-(--palette-ink)',
                )}
              >
                {s === 'Bank' ? t('tabs.bank') : t('tabs.company')}
              </button>
            ))}
          </div>
        </section>

        {/* Authentication */}
        <section>
          <SectionLabel icon="shield-halved" color="rose">
            {t('fields.authSource', 'Authentication')}
          </SectionLabel>
          <div className="inline-flex rounded-lg border border-(--palette-line) p-0.5">
            {(
              [
                ['Local', t('fields.authSourceLocal', 'Local password')],
                ['LDAP', t('fields.authSourceLdap', 'LDAP / Active Directory')],
              ] as [AuthSource, string][]
            ).map(([src, label]) => {
              const active = form.authSource === src;
              const locked = src === 'LDAP' && ldapLocked;
              return (
                <button
                  key={src}
                  type="button"
                  aria-pressed={active}
                  aria-disabled={locked ? true : undefined}
                  aria-describedby={locked ? ldapHintId : undefined}
                  onClick={() => setAuthSource(src)}
                  className={clsx(
                    'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                    active ? 'bg-primary text-white' : 'text-(--palette-gray-500)',
                    !active && !locked && 'hover:text-(--palette-ink)',
                    locked && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {ldapLocked && (
            <Hint id={ldapHintId} className="mt-2">
              {t('hints.ldapUnavailable')}
            </Hint>
          )}
        </section>

        {/* Account */}
        <section>
          <SectionLabel icon="circle-user" color="cyan">
            {t('sections.account', 'Account')}
          </SectionLabel>
          <label className="mb-4 flex items-start gap-2 text-sm text-(--palette-ink) cursor-pointer">
            <input
              type="checkbox"
              checked={form.isTemporaryAccess}
              onChange={e => setTemporaryAccess(e.target.checked)}
              className="mt-0.5 size-4 rounded border-(--palette-line-strong) text-(--palette-primary-text) focus:ring-primary/30"
            />
            {t('fields.isTemporaryAccess')}
          </label>
          {form.isTemporaryAccess && (
            <Hint className="mb-4">{t('hints.temporaryAccessCreate')}</Hint>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <TextInput
                label={t('fields.username')}
                value={form.username}
                onChange={e => setField('username', e.currentTarget.value)}
                required
                placeholder={t('placeholders.username')}
              />
              {isLdap && (
                <Button
                  variant="outline"
                  size="xs"
                  className="mt-1.5"
                  isLoading={
                    ldapLookup.isPending && isLookupCurrent(form, ldapLookup.variables ?? '')
                  }
                  onClick={handleLdapLookup}
                >
                  {t('buttons.retrieveFromLdap', 'Retrieve from LDAP')}
                </Button>
              )}
            </div>
            <TextInput
              label={t('fields.email')}
              type="email"
              value={form.email}
              onChange={e => setField('email', e.currentTarget.value)}
              required
              placeholder={t('placeholders.email')}
            />
            {isLdap ? (
              <Hint className="sm:col-span-2">
                {t(
                  'hints.ldapPassword',
                  'Password is managed by Active Directory — the user signs in with their AD credentials.',
                )}
              </Hint>
            ) : form.isTemporaryAccess ? null : (
              <>
                <TextInput
                  label={t('fields.password')}
                  type="password"
                  value={form.password}
                  onChange={e => setField('password', e.currentTarget.value)}
                  required
                  autoComplete="new-password"
                />
                <TextInput
                  label={t('fields.confirmPassword')}
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => setField('confirmPassword', e.currentTarget.value)}
                  required
                  placeholder={t('placeholders.reEnterNewPassword')}
                  autoComplete="new-password"
                />
                <div className="sm:col-span-2">
                  <PasswordPolicyChecklist password={form.password} />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Profile */}
        <section>
          <SectionLabel icon="id-card" color="amber">
            {t('sections.profile', 'Profile')}
          </SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label={t('fields.firstName')}
              value={form.firstName}
              onChange={e => setField('firstName', e.currentTarget.value)}
              required
            />
            <TextInput
              label={t('fields.lastName')}
              value={form.lastName}
              onChange={e => setField('lastName', e.currentTarget.value)}
              required
            />
            {isCompany ? (
              <>
                <Dropdown
                  label={t('fields.company')}
                  required
                  value={form.companyId}
                  onChange={val => setField('companyId', (val as string) ?? '')}
                  options={companies.map(c => ({
                    value: c.id,
                    label: localizeCompanyName(c.name, c.nameLocal),
                  }))}
                  placeholder={t('placeholders.selectCompany')}
                  showValuePrefix={false}
                />
                <TextInput
                  label={t('fields.position')}
                  value={form.position}
                  onChange={e => setField('position', e.currentTarget.value)}
                />
              </>
            ) : (
              <>
                <TextInput
                  label={t('fields.position')}
                  value={form.position}
                  onChange={e => setField('position', e.currentTarget.value)}
                />
                <TextInput
                  label={t('fields.department')}
                  value={form.department}
                  onChange={e => setField('department', e.currentTarget.value)}
                />
                <TextInput
                  label={t('fields.aoCode')}
                  value={form.aoCode}
                  onChange={e => setField('aoCode', e.currentTarget.value)}
                  placeholder={t('placeholders.aoCode')}
                />
                <TextInput
                  label={t('fields.employeeId')}
                  value={form.employeeId}
                  onChange={e => setField('employeeId', e.currentTarget.value)}
                  placeholder={t('placeholders.employeeId')}
                  maxLength={50}
                />
              </>
            )}
          </div>
        </section>

        {/* Access — roles / groups / teams */}
        <section>
          <SectionLabel icon="user-shield" color="violet">
            {t('sections.access', 'Access')}
          </SectionLabel>
          <div className="flex gap-1 border-b border-(--palette-line-soft) mb-3">
            {ACCESS_TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setAccessTab(tab.key)}
                className={clsx(
                  '-mb-px px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                  accessTab === tab.key
                    ? 'text-(--palette-primary-text) border-primary'
                    : 'text-(--palette-gray-500) border-transparent hover:text-(--palette-ink)',
                )}
              >
                {tab.label}
                {tab.required && <span className="text-red-500 ml-0.5">*</span>}
                {tab.count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-(--palette-primary-text)">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {accessTab === 'roles' && (
            <AssignmentTable
              items={roleOptions}
              getId={r => r.id}
              getLabel={r => r.name}
              columns={[
                { key: 'name', label: t('fields.name'), sortable: true },
                { key: 'scope', label: t('fields.scope'), sortable: true },
                {
                  key: 'description',
                  label: t('fields.description'),
                  render: r => r.description || '—',
                },
              ]}
              selectedIds={form.roles}
              onChange={ids => setField('roles', ids)}
              searchPlaceholder={t('placeholders.searchRoles')}
              searchFields={r => [r.name, r.scope, r.description ?? '']}
            />
          )}
          {accessTab === 'groups' && (
            <AssignmentTable
              items={groupOptions}
              getId={g => g.id}
              getLabel={g => g.name}
              columns={[
                { key: 'name', label: t('fields.name'), sortable: true },
                { key: 'scope', label: t('fields.scope'), sortable: true },
                {
                  key: 'description',
                  label: t('fields.description'),
                  render: g => g.description || '—',
                },
              ]}
              selectedIds={form.groups}
              onChange={ids => setField('groups', ids)}
              searchPlaceholder={t('placeholders.searchGroups')}
              searchFields={g => [g.name, g.scope, g.description ?? '']}
            />
          )}
          {accessTab === 'teams' && (
            <AssignmentTable
              items={teamOptions}
              getId={tm => tm.id}
              getLabel={tm => tm.name}
              columns={[
                { key: 'name', label: t('fields.name'), sortable: true },
                {
                  key: 'scope',
                  label: t('fields.scope'),
                  sortable: true,
                  render: tm => t(tm.scope === 'Bank' ? 'tabs.bank' : 'tabs.company'),
                },
                {
                  key: 'description',
                  label: t('fields.description'),
                  render: tm => tm.description || '—',
                },
              ]}
              selectedIds={form.teams}
              onChange={ids => setField('teams', ids)}
              searchPlaceholder={t('placeholders.searchTeams')}
              searchFields={tm => [tm.name, tm.scope, tm.description ?? '']}
            />
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-(--palette-line-soft) bg-(--palette-surface) px-6 py-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('common:actions.cancel')}
        </Button>
        <Button variant="primary" size="sm" isLoading={createUser.isPending} onClick={handleCreate}>
          {t('buttons.create')}
        </Button>
      </div>
    </div>
  );
};

export default CreateUserPanel;
