import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Icon from '@shared/components/Icon';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import UserDetailPanel from '../components/UserDetailPanel';
import CreateUserModal from '../components/CreateUserModal';
import { useGetUsers } from '../api/users';

type ScopeTab = 'Bank' | 'Company';
type StatusFilter = 'all' | 'active' | 'inactive';

const UserProfilePage = () => {
  const { t } = useTranslation('userManagement');
  const [activeTab, setActiveTab] = useState<ScopeTab>('Bank');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSelectedUserId(null);
  }, [activeTab]);

  const isActiveParam =
    statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined;

  const { data, isLoading } = useGetUsers({
    search: debouncedSearch || undefined,
    scope: activeTab,
    isActive: isActiveParam,
    pageNumber: 1,
    pageSize: 50,
  });

  const filteredUsers = data?.items ?? [];

  const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('filters.all') },
    { value: 'active', label: t('status.active') },
    { value: 'inactive', label: t('status.inactive') },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-4">
      <SectionHeader
        title={t('page.users.title')}
        subtitle={t('page.users.subtitle')}
        icon="users"
        iconColor="purple"
      />

      <div className="flex gap-4">
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
              onClick={() => setShowCreateModal(true)}
              title={t('aria.addUser')}
              aria-label={t('aria.addUser')}
              className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors"
            >
              <Icon name="plus" style="solid" className="size-3.5" />
            </button>
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

          {/* User list */}
          <div className="overflow-y-auto max-h-[calc(100vh-320px)] divide-y divide-gray-50">
            {isLoading ? (
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton columns={[{ width: 'w-full' }]} rows={6} />
                </tbody>
              </table>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-xs gap-1">
                <Icon name="users" style="regular" className="size-7 opacity-40" />
                <span>{t('empty.noUsersFound')}</span>
              </div>
            ) : (
              filteredUsers.map(user => {
                const displayName = `${user.firstName} ${user.lastName}`.trim() || user.username;
                const initials =
                  (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '') ||
                  user.username[0].toUpperCase();
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
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
                        {user.position && (
                          <span className="text-xs text-gray-400 truncate">{user.position}</span>
                        )}
                        {!user.isActive && (
                          <span className="shrink-0 text-xs text-gray-400 italic">
                            {t('status.inactive')}
                          </span>
                        )}
                        {user.isLocked && (
                          <Icon name="lock" style="solid" className="size-3 text-red-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel — user detail */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto">
          {selectedUserId ? (
            <UserDetailPanel key={selectedUserId} userId={selectedUserId} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Icon name="circle-user" style="regular" className="size-12 opacity-30" />
              <p className="text-sm">{t('empty.selectUser')}</p>
            </div>
          )}
        </div>
      </div>

      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={userId => setSelectedUserId(userId)}
      />
    </div>
  );
};

export default UserProfilePage;
