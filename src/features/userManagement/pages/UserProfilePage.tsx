import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import Dropdown from '@shared/components/inputs/Dropdown';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import ListSortMenu from '../components/ListSortMenu';
import UserDetailPanel from '../components/UserDetailPanel';
import CreateUserPanel from '../components/CreateUserPanel';
import { useGetUsers } from '../api/users';
import { useGetRoles } from '../api/roles';
import { useGetGroups } from '../api/groups';
import { useGetTeams } from '../api/teams';
import { useGetAdminCompanies } from '../api/companies';

type ScopeTab = 'Bank' | 'Company';
type StatusFilter = 'all' | 'active' | 'inactive';

const UserProfilePage = () => {
  const { t } = useTranslation('userManagement');
  const [activeTab, setActiveTab] = useState<ScopeTab>('Bank');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Any filter/search change starts the list fresh from the first page-worth of rows.
  useEffect(() => {
    setPageSize(50);
  }, [debouncedSearch, activeTab, statusFilter, roleFilter, groupFilter, teamFilter, companyFilter]);

  // Role/Group/Team/Company options are scope-specific (company only applies to Company users),
  // so clear those selections when the Bank/Company tab changes.
  useEffect(() => {
    setSelectedUserId(null);
    setRoleFilter('');
    setGroupFilter('');
    setTeamFilter('');
    setCompanyFilter('');
  }, [activeTab]);

  const isActiveParam =
    statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined;

  const { data, isLoading, isFetching } = useGetUsers({
    search: debouncedSearch || undefined,
    scope: activeTab,
    role: roleFilter || undefined,
    groupId: groupFilter || undefined,
    teamId: teamFilter || undefined,
    companyId: companyFilter || undefined,
    isActive: isActiveParam,
    pageNumber: 1,
    pageSize,
  });

  // Options for the assignment filters (load a large page; these lists are small).
  // Roles/Groups are scoped server-side via the Bank/Company tab. Teams have no scope
  // param, so filter them client-side by type (Bank → Internal, Company → External).
  const { data: rolesData } = useGetRoles({ scope: activeTab, pageNumber: 1, pageSize: 200 });
  const { data: groupsData } = useGetGroups({ scope: activeTab, pageNumber: 1, pageSize: 200 });
  const { data: teamsData } = useGetTeams({ pageNumber: 1, pageSize: 200 });
  const roleOptions = rolesData?.items ?? [];
  const groupOptions = groupsData?.items ?? [];
  const teamOptions = (teamsData?.items ?? []).filter(tm => tm.scope === activeTab);
  // Companies only apply to Company-scoped users; load once (small list).
  const { data: companiesData } = useGetAdminCompanies({ pageNumber: 1, pageSize: 200 });
  const companyOptions = companiesData?.companies ?? [];

  const filteredUsers = useMemo(() => data?.items ?? [], [data?.items]);
  const displayUsers = useMemo(
    () =>
      [...filteredUsers].sort((a, b) => {
        const cmp =
          sortKey === 'username'
            ? a.username.localeCompare(b.username)
            : (`${a.firstName} ${a.lastName}`.trim() || a.username).localeCompare(
                `${b.firstName} ${b.lastName}`.trim() || b.username,
              );
        return sortAsc ? cmp : -cmp;
      }),
    [filteredUsers, sortKey, sortAsc],
  );

  const SORT_OPTIONS = [
    { key: 'name', label: t('sort.name') },
    { key: 'username', label: t('sort.username') },
  ];
  const totalCount = data?.totalCount ?? filteredUsers.length;
  const hasMore = filteredUsers.length < totalCount;

  const hasActiveFilters =
    !!debouncedSearch ||
    statusFilter !== 'all' ||
    !!roleFilter ||
    !!groupFilter ||
    !!teamFilter ||
    !!companyFilter;

  const clearAllFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setRoleFilter('');
    setGroupFilter('');
    setTeamFilter('');
    setCompanyFilter('');
  };

  const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('filters.all') },
    { value: 'active', label: t('status.active') },
    { value: 'inactive', label: t('status.inactive') },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 gap-3">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">{t('page.users.title')}</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{t('page.users.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left panel — user list */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          {/* Bank / Company tabs */}
          <div className="flex border-b border-gray-100">
            {(['Bank', 'Company'] as ScopeTab[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'flex-1 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {tab === 'Bank' ? t('tabs.bank') : t('tabs.company')}
              </button>
            ))}
          </div>

          {/* Search + Add */}
          <div className="px-3 pt-3 pb-2 flex gap-2">
            <div className="relative flex-1">
              <Icon
                name="magnifying-glass"
                style="regular"
                className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('placeholders.searchUsers')}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedUserId(null);
                setCreating(true);
              }}
              title={t('aria.addUser')}
              aria-label={t('aria.addUser')}
              className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors"
            >
              <Icon name="plus" style="solid" className="size-3.5" />
            </button>
            <ListSortMenu
              options={SORT_OPTIONS}
              sortKey={sortKey}
              asc={sortAsc}
              onChange={(key, asc) => {
                setSortKey(key);
                setSortAsc(asc);
              }}
            />
          </div>

          {/* Status filter pills */}
          <div className="px-3 pb-2 flex gap-1">
            {STATUS_FILTERS.map(sf => (
              <button
                key={sf.value}
                type="button"
                onClick={() => setStatusFilter(sf.value)}
                className={clsx(
                  'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                  statusFilter === sf.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                )}
              >
                {sf.label}
              </button>
            ))}
          </div>

          {/* Role / Group / Team filters */}
          <div className="px-3 pb-2 flex flex-col gap-1.5">
            <Dropdown
              value={roleFilter}
              onChange={(val: string | null) => setRoleFilter(val ?? '')}
              placeholder={t('filters.allRoles')}
              showValuePrefix={false}
              options={roleOptions.map(r => ({ value: r.name, label: r.name }))}
            />
            <Dropdown
              value={groupFilter}
              onChange={(val: string | null) => setGroupFilter(val ?? '')}
              placeholder={t('filters.allGroups')}
              showValuePrefix={false}
              options={groupOptions.map(g => ({ value: g.id, label: g.name }))}
            />
            <Dropdown
              value={teamFilter}
              onChange={(val: string | null) => setTeamFilter(val ?? '')}
              placeholder={t('filters.allTeams')}
              showValuePrefix={false}
              options={teamOptions.map(tm => ({ value: tm.id, label: tm.name }))}
            />
            {/* Company only applies to Company-scoped users */}
            {activeTab === 'Company' && (
              <Dropdown
                value={companyFilter}
                onChange={(val: string | null) => setCompanyFilter(val ?? '')}
                placeholder={t('filters.allCompanies')}
                showValuePrefix={false}
                options={companyOptions.map(c => ({ value: c.id, label: c.name }))}
              />
            )}
          </div>

          {/* User list */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton columns={[{ width: 'w-full' }]} rows={6} />
                </tbody>
              </table>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-xs gap-2">
                <Icon name="users" style="regular" className="size-7 opacity-40" />
                <span>{t('empty.noUsersFound')}</span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-primary hover:underline font-medium"
                  >
                    {t('empty.clearFilters')}
                  </button>
                )}
              </div>
            ) : (
              <>
                {displayUsers.map(user => {
                  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.username;
                  const initials =
                    (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '') ||
                    user.username[0].toUpperCase();
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setCreating(false);
                        setSelectedUserId(user.id);
                      }}
                      className={clsx(
                        'w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors',
                        !user.isActive && 'opacity-50',
                        selectedUserId === user.id
                          ? 'bg-primary/5 border-l-2 border-primary'
                          : 'hover:bg-gray-50 border-l-2 border-transparent',
                      )}
                    >
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {displayName}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 truncate">
                            @{user.username}
                            {user.position ? ` · ${user.position}` : ''}
                          </span>
                          {!user.isActive && (
                            <span className="shrink-0 text-xs text-gray-400 italic">
                              {t('status.inactive')}
                            </span>
                          )}
                          {user.isLocked && (
                            <Icon
                              name="lock"
                              style="solid"
                              className="size-3 text-red-400 shrink-0"
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {hasMore && (
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => setPageSize(p => p + 50)}
                      disabled={isFetching}
                      className="w-full py-2 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isFetching
                        ? t('buttons.loadingMore')
                        : `${t('buttons.loadMore')} (${totalCount - filteredUsers.length})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right panel — create form, user detail, or empty state */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto">
          {creating ? (
            <CreateUserPanel
              onCreated={userId => {
                setCreating(false);
                setSelectedUserId(userId);
              }}
              onCancel={() => setCreating(false)}
            />
          ) : selectedUserId ? (
            <UserDetailPanel key={selectedUserId} userId={selectedUserId} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Icon name="circle-user" style="regular" className="size-12 opacity-30" />
              <p className="text-sm">{t('empty.selectUser')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
