import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import Dropdown from '@shared/components/inputs/Dropdown';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import GroupDetailPanel from '../components/GroupDetailPanel';
import ListSortMenu from '../components/ListSortMenu';
import { useGetGroups, useCreateGroup } from '../api/groups';
import type { GroupScope } from '../types';

type ScopeTab = 'Bank' | 'Company';

const GroupListPage = () => {
  const { t } = useTranslation(['userManagement', 'common']);
  const [activeTab, setActiveTab] = useState<ScopeTab>('Bank');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    description: string;
    scope: GroupScope;
  }>({ name: '', description: '', scope: 'Bank' });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedGroupId(null);
  }, [activeTab]);

  const { data, isLoading } = useGetGroups({
    search: debouncedSearch || undefined,
    scope: activeTab,
    pageNumber: 1,
    pageSize: 50,
  });

  const groups = useMemo(() => data?.items ?? [], [data?.items]);
  const sortedGroups = useMemo(
    () =>
      [...groups].sort((a, b) => {
        const cmp =
          sortKey === 'members' ? a.userCount - b.userCount : a.name.localeCompare(b.name);
        return sortAsc ? cmp : -cmp;
      }),
    [groups, sortKey, sortAsc],
  );
  const createGroup = useCreateGroup();

  const SORT_OPTIONS = [
    { key: 'name', label: t('sort.name') },
    { key: 'members', label: t('sort.members') },
  ];

  const SCOPE_OPTIONS = [
    { value: 'Bank', label: t('tabs.bank') },
    { value: 'Company', label: t('tabs.company') },
  ];

  const handleOpenCreate = () => {
    // Default the scope to the tab the user is on, but let them change it in the dropdown.
    setCreateForm({ name: '', description: '', scope: activeTab as GroupScope });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    if (!createForm.name) {
      toast.error(t('validation.nameRequired'));
      return;
    }
    createGroup.mutate(
      {
        name: createForm.name,
        description: createForm.description,
        scope: createForm.scope,
      },
      {
        onSuccess: (data: any) => {
          toast.success(t('toasts.groupCreated'));
          setShowCreateModal(false);
          if (data?.id) setSelectedGroupId(data.id);
        },
        onError: () => toast.error(t('toasts.groupCreateFailed')),
      },
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 gap-3">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">{t('page.groups.title')}</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {data?.totalCount ?? groups.length}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{t('page.groups.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left panel — group list */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          {/* Scope toggle tabs */}
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
                placeholder={t('placeholders.searchGroups')}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              title={t('aria.addGroup')}
              aria-label={t('aria.addGroup')}
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

          {/* Group list */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton columns={[{ width: 'w-full' }]} rows={6} />
                </tbody>
              </table>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-xs gap-1">
                <Icon name="users-rectangle" style="regular" className="size-7 opacity-40" />
                <span>{t('empty.noGroupsFound')}</span>
              </div>
            ) : (
              sortedGroups.map(group => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className={clsx(
                    'w-full text-left px-3 py-2.5 transition-colors',
                    selectedGroupId === group.id
                      ? 'bg-primary/5 border-l-2 border-primary'
                      : 'hover:bg-gray-50 border-l-2 border-transparent',
                  )}
                >
                  <div className="text-sm font-medium text-gray-800 truncate">{group.name}</div>
                  {group.description && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">{group.description}</div>
                  )}
                  <div className="mt-0.5 text-xs text-gray-400">
                    {t('counts.members', { count: group.userCount })}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel — group detail */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto">
          {selectedGroupId ? (
            <GroupDetailPanel
              key={selectedGroupId}
              groupId={selectedGroupId}
              onDeleted={() => setSelectedGroupId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Icon name="users-rectangle" style="regular" className="size-12 opacity-30" />
              <p className="text-sm">{t('empty.selectGroup')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('dialogs.createGroup.title')}
        size="sm"
      >
        <div className="grid grid-cols-1 gap-4 p-6">
          <TextInput
            label={t('fields.name')}
            value={createForm.name}
            onChange={e => {
              const value = e.currentTarget.value;
              setCreateForm(prev => ({ ...prev, name: value }));
            }}
            required
            placeholder={t('placeholders.groupName')}
          />
          <Dropdown
            label={t('fields.scope')}
            value={createForm.scope}
            onChange={(val: string | null) =>
              setCreateForm(prev => ({ ...prev, scope: (val ?? 'Bank') as GroupScope }))
            }
            options={SCOPE_OPTIONS}
            required
          />
          <TextInput
            label={t('fields.description')}
            value={createForm.description}
            onChange={e => {
              const value = e.currentTarget.value;
              setCreateForm(prev => ({ ...prev, description: value }));
            }}
            placeholder={t('placeholders.groupDescription')}
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={createGroup.isPending}
            onClick={handleCreate}
          >
            {t('buttons.create')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default GroupListPage;
