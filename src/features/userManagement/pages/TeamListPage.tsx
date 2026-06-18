import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import TeamDetailPanel from '../components/TeamDetailPanel';
import ListSortMenu from '../components/ListSortMenu';
import { useGetTeams, useCreateTeam } from '../api/teams';
import type { TeamScope } from '../types';

type ScopeTab = 'Bank' | 'Company';

const TeamListPage = () => {
  const { t } = useTranslation(['userManagement', 'common']);
  const [activeTab, setActiveTab] = useState<ScopeTab>('Bank');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    scope: TeamScope;
    description: string;
  }>({
    name: '',
    scope: 'Bank',
    description: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset selection when switching scope tab.
  useEffect(() => {
    setSelectedTeamId(null);
  }, [activeTab]);

  const { data, isLoading } = useGetTeams({
    search: debouncedSearch || undefined,
    pageNumber: 1,
    pageSize: 50,
  });

  // Teams have no scope param on the API; filter client-side by the active tab.
  const teams = useMemo(
    () =>
      (data?.items ?? [])
        .filter(tm => tm.scope === activeTab)
        .sort((a, b) => {
          const cmp =
            sortKey === 'members' ? a.memberCount - b.memberCount : a.name.localeCompare(b.name);
          return sortAsc ? cmp : -cmp;
        }),
    [data?.items, activeTab, sortKey, sortAsc],
  );
  const createTeam = useCreateTeam();

  const SORT_OPTIONS = [
    { key: 'name', label: t('sort.name') },
    { key: 'members', label: t('sort.members') },
  ];

  const handleOpenCreate = () => {
    setCreateForm({ name: '', scope: activeTab, description: '' });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    if (!createForm.name) {
      toast.error(t('validation.nameRequired'));
      return;
    }
    createTeam.mutate(
      {
        name: createForm.name,
        scope: createForm.scope,
        description: createForm.description.trim() || null,
      },
      {
        onSuccess: (data: any) => {
          toast.success(t('toasts.teamCreated'));
          setShowCreateModal(false);
          if (data?.id) setSelectedTeamId(data.id);
        },
        onError: () => toast.error(t('toasts.teamCreateFailed')),
      },
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 gap-3">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">{t('page.teams.title')}</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {teams.length}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{t('page.teams.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left panel */}
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
                placeholder={t('placeholders.searchTeams')}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              title={t('aria.addTeam')}
              aria-label={t('aria.addTeam')}
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

          {/* Team list */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton columns={[{ width: 'w-full' }]} rows={6} />
                </tbody>
              </table>
            ) : teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-xs gap-1">
                <Icon name="people-group" style="regular" className="size-7 opacity-40" />
                <span>{t('empty.noTeamsFound')}</span>
              </div>
            ) : (
              teams.map(team => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setSelectedTeamId(team.id)}
                  className={clsx(
                    'w-full text-left px-3 py-2.5 transition-colors',
                    selectedTeamId === team.id
                      ? 'bg-primary/5 border-l-2 border-primary'
                      : 'hover:bg-gray-50 border-l-2 border-transparent',
                  )}
                >
                  <div className="text-sm font-medium text-gray-800 truncate">{team.name}</div>
                  {team.description && (
                    <div className="mt-0.5 text-xs text-gray-400 truncate">{team.description}</div>
                  )}
                  <div className="mt-0.5 text-xs text-gray-400">
                    {t('counts.members', { count: team.memberCount })}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel — detail */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto">
          {selectedTeamId ? (
            <TeamDetailPanel
              key={selectedTeamId}
              teamId={selectedTeamId}
              onDeleted={() => setSelectedTeamId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Icon name="people-group" style="regular" className="size-12 opacity-30" />
              <p className="text-sm">{t('empty.selectTeam')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('dialogs.createTeam.title')}
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
            placeholder={t('placeholders.teamName')}
          />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('fields.scope')}
            </label>
            <select
              value={createForm.scope}
              onChange={e =>
                setCreateForm(prev => ({ ...prev, scope: e.target.value as TeamScope }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="Bank">{t('tabs.bank')}</option>
              <option value="Company">{t('tabs.company')}</option>
            </select>
          </div>
          <TextInput
            label={t('fields.description')}
            value={createForm.description}
            onChange={e => {
              const value = e.currentTarget.value;
              setCreateForm(prev => ({ ...prev, description: value }));
            }}
            placeholder={t('placeholders.teamDescription')}
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={createTeam.isPending}
            onClick={handleCreate}
          >
            {t('buttons.create')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default TeamListPage;
