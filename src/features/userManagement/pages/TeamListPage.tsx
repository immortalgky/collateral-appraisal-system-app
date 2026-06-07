import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import TeamDetailPanel from '../components/TeamDetailPanel';
import { useGetTeams, useCreateTeam } from '../api/teams';
import type { TeamType } from '../types';

const TeamListPage = () => {
  const { t } = useTranslation(['userManagement', 'common']);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<{ name: string; type: TeamType }>({
    name: '',
    type: 'Internal',
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useGetTeams({
    search: debouncedSearch || undefined,
    pageNumber: 1,
    pageSize: 50,
  });

  const teams = data?.items ?? [];
  const createTeam = useCreateTeam();

  const handleOpenCreate = () => {
    setCreateForm({ name: '', type: 'Internal' });
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
        type: createForm.type,
        isActive: true,
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
    <div className="px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-4">
      <SectionHeader
        title={t('page.teams.title')}
        subtitle={t('page.teams.subtitle')}
        icon="people-group"
        iconColor="cyan"
      />

      <div className="flex gap-4">
        {/* Left panel */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
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
          </div>

          {/* Team list */}
          <div className="overflow-y-auto max-h-[calc(100vh-240px)] divide-y divide-gray-50">
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
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {/* Type badge */}
                    <span
                      className={clsx(
                        'shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                        team.type === 'Internal'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-violet-50 text-violet-700',
                      )}
                    >
                      {t(team.type === 'Internal' ? 'fields.teamTypeInternal' : 'fields.teamTypeExternal')}
                    </span>
                    {/* Active badge */}
                    <span
                      className={clsx(
                        'shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                        team.isActive
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {team.isActive ? t('status.active') : t('status.inactive')}
                    </span>
                    {/* Member count */}
                    <span className="shrink-0 text-xs text-gray-400 ml-auto">
                      {t('counts.members', { count: team.memberCount })}
                    </span>
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
              {t('fields.teamType')}
            </label>
            <select
              value={createForm.type}
              onChange={e => setCreateForm(prev => ({ ...prev, type: e.target.value as TeamType }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="Internal">{t('fields.teamTypeInternal')}</option>
              <option value="External">{t('fields.teamTypeExternal')}</option>
            </select>
          </div>
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
