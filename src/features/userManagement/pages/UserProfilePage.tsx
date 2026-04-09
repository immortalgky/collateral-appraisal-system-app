import { useEffect, useState } from 'react';
import clsx from 'clsx';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Icon from '@shared/components/Icon';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import UserDetailPanel from '../components/UserDetailPanel';
import CreateUserModal from '../components/CreateUserModal';
import { useGetUsers } from '../api/users';

type ScopeTab = 'Bank' | 'Company';

const UserProfilePage = () => {
  const [activeTab, setActiveTab] = useState<ScopeTab>('Bank');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSelectedUserId(null);
  }, [activeTab]);

  const { data, isLoading } = useGetUsers({
    search: debouncedSearch || undefined,
    scope: activeTab,
    pageNumber: 1,
    pageSize: 50,
  });

  const filteredUsers = data?.items ?? [];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <SectionHeader
        title="Users"
        subtitle="Manage user accounts, roles, and access"
        icon="users"
        iconColor="purple"
      />

      <div className="flex gap-4 flex-1 min-h-0 mt-4">
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
                {tab}
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
                placeholder="Search users..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              title="Add user"
              className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors"
            >
              <Icon name="plus" style="solid" className="size-3.5" />
            </button>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton columns={[{ width: 'w-full' }]} rows={6} />
                </tbody>
              </table>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-xs gap-1">
                <Icon name="users" style="regular" className="size-7 opacity-40" />
                <span>No users found</span>
              </div>
            ) : (
              filteredUsers.map(user => {
                const displayName = `${user.firstName} ${user.lastName}`.trim() || user.userName;
                const initials =
                  (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '') ||
                  user.userName[0].toUpperCase();
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={clsx(
                      'w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors',
                      selectedUserId === user.id
                        ? 'bg-primary/5 border-l-2 border-primary'
                        : 'hover:bg-gray-50 border-l-2 border-transparent',
                    )}
                  >
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{displayName}</div>
                      {user.position && (
                        <div className="text-xs text-gray-400 truncate">{user.position}</div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel — user detail */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm min-h-0 overflow-hidden">
          {selectedUserId ? (
            <UserDetailPanel key={selectedUserId} userId={selectedUserId} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Icon name="circle-user" style="regular" className="size-12 opacity-30" />
              <p className="text-sm">Select a user to view details</p>
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
