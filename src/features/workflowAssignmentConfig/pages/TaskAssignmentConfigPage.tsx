import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import {
  ASSIGNMENT_STRATEGIES,
  useCreateTaskAssignmentConfig,
  useDeleteTaskAssignmentConfig,
  useListTaskAssignmentConfigs,
  useListWorkflowActivities,
  useUpdateTaskAssignmentConfig,
  type BankingSegment,
  type SaveTaskAssignmentConfigBody,
  type TaskAssignmentConfigDto,
  type WorkflowActivityOption,
} from '../api/taskAssignmentConfig';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

const SEGMENTS: BankingSegment[] = ['Retail', 'IBG'];

// ──────────────────────────────────────────────────────────────────────────────
// Strategy multiselect (checkbox list)
// ──────────────────────────────────────────────────────────────────────────────

function StrategyPicker({
  label,
  selected,
  onChange,
  baseline,
}: {
  label: string;
  selected: string[];
  onChange: (next: string[]) => void;
  baseline?: string[];
}) {
  const { t } = useTranslation('workflowAssignmentConfig');

  const toggle = (token: string) => {
    onChange(selected.includes(token) ? selected.filter(s => s !== token) : [...selected, token]);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {baseline !== undefined && (
        <p className="text-xs text-gray-400 mb-1.5">
          {t('strategies.baseline', {
            list: baseline.length ? baseline.join(', ') : t('strategies.baselineNone'),
          })}
        </p>
      )}
      <div className="grid grid-cols-2 gap-1">
        {ASSIGNMENT_STRATEGIES.map(token => (
          <label key={token} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(token)}
              onChange={() => toggle(token)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
            />
            <span className="font-mono text-gray-700">{token}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Create / edit modal
// ──────────────────────────────────────────────────────────────────────────────

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: TaskAssignmentConfigDto | null;
  activities: WorkflowActivityOption[];
  activitiesUnavailable: boolean;
  onSave: (body: SaveTaskAssignmentConfigBody, id?: string) => void;
  isSaving: boolean;
}

function ConfigModal({
  isOpen,
  onClose,
  editing,
  activities,
  activitiesUnavailable,
  onSave,
  isSaving,
}: ConfigModalProps) {
  const { t } = useTranslation('workflowAssignmentConfig');

  const [activityId, setActivityId] = useState('');
  const [bankingSegment, setBankingSegment] = useState<'' | BankingSegment>('');
  const [assigneeGroup, setAssigneeGroup] = useState('');
  const [primaryStrategies, setPrimaryStrategies] = useState<string[]>([]);
  const [routeBackStrategies, setRouteBackStrategies] = useState<string[]>([]);
  const [specificAssignee, setSpecificAssignee] = useState('');
  const [adminPoolId, setAdminPoolId] = useState('');
  const [escalateToAdminPool, setEscalateToAdminPool] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Reset whenever the target row changes (same modal reused for create + each edit).
  useEffect(() => {
    setActivityId(editing?.activityId ?? '');
    setBankingSegment((editing?.bankingSegment as BankingSegment) ?? '');
    setAssigneeGroup(editing?.assigneeGroup ?? '');
    setPrimaryStrategies(editing?.primaryStrategies ?? []);
    setRouteBackStrategies(editing?.routeBackStrategies ?? []);
    setSpecificAssignee(editing?.specificAssignee ?? '');
    setAdminPoolId(editing?.adminPoolId ?? '');
    setEscalateToAdminPool(editing?.escalateToAdminPool ?? true);
    setIsActive(editing?.isActive ?? true);
  }, [editing, isOpen]);

  const baseline = useMemo(
    () => activities.find(a => a.id === activityId) ?? null,
    [activities, activityId],
  );

  const handleSave = () => {
    if (!activityId.trim()) {
      toast.error(t('errors.activityRequired'));
      return;
    }
    onSave(
      {
        activityId: activityId.trim(),
        bankingSegment: bankingSegment || null,
        assigneeGroup: assigneeGroup.trim() || null,
        primaryStrategies,
        routeBackStrategies,
        specificAssignee: specificAssignee.trim() || null,
        adminPoolId: adminPoolId.trim() || null,
        escalateToAdminPool,
        isActive,
      },
      editing?.id,
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? t('modal.editTitle') : t('modal.addTitle')}
      size="lg"
    >
      <div className="space-y-4">
        {/* Activity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.activity')} <span className="text-red-500">*</span>
          </label>
          {editing ? (
            <input type="text" value={activityId} disabled className={`${inputClass} bg-gray-50`} />
          ) : activitiesUnavailable ? (
            <>
              <input
                type="text"
                value={activityId}
                onChange={e => setActivityId(e.target.value)}
                className={inputClass}
                placeholder={t('fields.activityFreePlaceholder')}
              />
              <p className="mt-1 text-xs text-amber-600">{t('fields.activityUnavailable')}</p>
            </>
          ) : (
            <select
              value={activityId}
              onChange={e => setActivityId(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('fields.activitySelect')}</option>
              {activities.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.id})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Baseline being overridden */}
        {baseline && (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-500">{t('baseline.heading')}</p>
            <p>
              {t('baseline.group')}:{' '}
              <span className="font-mono">
                {baseline.assigneeGroup || <span className="italic text-gray-400">{t('baseline.none')}</span>}
              </span>
            </p>
            <p>
              {t('baseline.initial')}:{' '}
              <span className="font-mono">{baseline.initialAssignmentStrategies.join(', ') || '—'}</span>
            </p>
            <p>
              {t('baseline.routeBack')}:{' '}
              <span className="font-mono">{baseline.revisitAssignmentStrategies.join(', ') || '—'}</span>
            </p>
          </div>
        )}

        {/* Banking segment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.bankingSegment')}</label>
          <select
            value={bankingSegment}
            onChange={e => setBankingSegment(e.target.value as '' | BankingSegment)}
            className={inputClass}
          >
            <option value="">{t('fields.anySegment')}</option>
            {SEGMENTS.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee group override */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.assigneeGroup')}</label>
          <input
            type="text"
            value={assigneeGroup}
            onChange={e => setAssigneeGroup(e.target.value)}
            className={inputClass}
            placeholder={
              baseline?.assigneeGroup
                ? t('fields.assigneeGroupBaseline', { group: baseline.assigneeGroup })
                : t('fields.assigneeGroupEmpty')
            }
          />
        </div>

        {/* Strategies */}
        <StrategyPicker
          label={t('strategies.primary')}
          selected={primaryStrategies}
          onChange={setPrimaryStrategies}
          baseline={baseline?.initialAssignmentStrategies}
        />
        <StrategyPicker
          label={t('strategies.routeBack')}
          selected={routeBackStrategies}
          onChange={setRouteBackStrategies}
          baseline={baseline?.revisitAssignmentStrategies}
        />

        {/* Specific assignee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.specificAssignee')}{' '}
            <span className="text-xs font-normal text-gray-400">{t('fields.specificAssigneeHint')}</span>
          </label>
          <input
            type="text"
            value={specificAssignee}
            onChange={e => setSpecificAssignee(e.target.value)}
            className={inputClass}
            placeholder={t('fields.specificAssigneePlaceholder')}
          />
        </div>

        {/* Admin pool */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('fields.adminPoolId')}{' '}
              <span className="text-xs font-normal text-gray-400">{t('fields.adminPoolHint')}</span>
            </label>
            <input
              type="text"
              value={adminPoolId}
              onChange={e => setAdminPoolId(e.target.value)}
              className={inputClass}
              placeholder={t('fields.adminPoolPlaceholder')}
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={escalateToAdminPool}
                onChange={e => setEscalateToAdminPool(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              {t('fields.escalate')}
            </label>
          </div>
        </div>

        {/* Active toggle */}
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          {t('fields.isActive')}
          <span className="text-xs font-normal text-gray-400">{t('fields.isActiveHint')}</span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button type="button" onClick={handleSave} isLoading={isSaving} disabled={!activityId.trim()}>
            {editing ? t('actions.update') : t('actions.add')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────

const TaskAssignmentConfigPage = () => {
  const { t } = useTranslation('workflowAssignmentConfig');
  const [segmentFilter, setSegmentFilter] = useState<'' | BankingSegment>('');
  const [editing, setEditing] = useState<TaskAssignmentConfigDto | null>(null);
  const modal = useDisclosure();

  const { data: configs = [], isLoading } = useListTaskAssignmentConfigs(
    segmentFilter ? { bankingSegment: segmentFilter } : undefined,
  );
  const { data: activities = [], isError: activitiesError } = useListWorkflowActivities();

  const createConfig = useCreateTaskAssignmentConfig();
  const updateConfig = useUpdateTaskAssignmentConfig();
  const deleteConfig = useDeleteTaskAssignmentConfig();

  const activityName = useMemo(() => {
    const map = new Map(activities.map(a => [a.id, a.name]));
    return (id: string) => map.get(id) ?? id;
  }, [activities]);

  const handleAdd = () => {
    setEditing(null);
    modal.onOpen();
  };

  const handleEdit = (row: TaskAssignmentConfigDto) => {
    setEditing(row);
    modal.onOpen();
  };

  const handleDelete = (row: TaskAssignmentConfigDto) => {
    const segment = row.bankingSegment ? ` (${row.bankingSegment})` : '';
    if (!confirm(t('confirm.delete', { activity: row.activityId, segment }))) return;
    deleteConfig.mutate(row.id, {
      onSuccess: () => toast.success(t('toasts.deleted')),
      onError: () => toast.error(t('toasts.deleteFailed')),
    });
  };

  const handleSave = (body: SaveTaskAssignmentConfigBody, id?: string) => {
    const onSuccess = () => {
      toast.success(id ? t('toasts.updated') : t('toasts.created'));
      modal.onClose();
    };
    const onError = (err: unknown) => {
      const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
      toast.error(detail || t('toasts.saveFailed'));
    };

    if (id) updateConfig.mutate({ id, body }, { onSuccess, onError });
    else createConfig.mutate(body, { onSuccess, onError });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('page.title')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{t('page.subtitle')}</p>
        </div>
        <Button size="sm" type="button" onClick={handleAdd}>
          <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
          {t('actions.addOverride')}
        </Button>
      </div>

      {/* Segment filter */}
      <div className="flex gap-2">
        {(['', ...SEGMENTS] as const).map(seg => (
          <button
            key={seg || 'all'}
            type="button"
            onClick={() => setSegmentFilter(seg)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              segmentFilter === seg
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {seg || t('filter.all')}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : configs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-8 text-center text-sm text-gray-400 italic">
          {t('table.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  t('table.activity'),
                  t('table.segment'),
                  t('table.group'),
                  t('table.strategies'),
                  t('table.specific'),
                  t('table.status'),
                  '',
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase last:w-20"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configs.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{activityName(row.activityId)}</p>
                    <p className="text-xs text-gray-400 font-mono">{row.activityId}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.bankingSegment ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {row.bankingSegment}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs italic">{t('table.any')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {row.assigneeGroup || <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                    <span className="font-mono">{row.primaryStrategies.join(', ') || '—'}</span>
                    {row.routeBackStrategies.length > 0 && (
                      <span className="block text-gray-400">↩ {row.routeBackStrategies.join(', ')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {row.specificAssignee || <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.isActive ? t('table.active') : t('table.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        aria-label={`Edit ${row.activityId}`}
                      >
                        <Icon name="pen" style="solid" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        aria-label={`Delete ${row.activityId}`}
                      >
                        <Icon name="trash" style="solid" className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfigModal
        isOpen={modal.isOpen}
        onClose={modal.onClose}
        editing={editing}
        activities={activities}
        activitiesUnavailable={activitiesError || activities.length === 0}
        onSave={handleSave}
        isSaving={createConfig.isPending || updateConfig.isPending}
      />
    </div>
  );
};

export default TaskAssignmentConfigPage;
