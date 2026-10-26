import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NativeSelect from '@/shared/components/inputs/NativeSelect';
import toast from 'react-hot-toast';
import { arrayMove } from '@dnd-kit/sortable';
import { ActivityType } from '@features/workflowBuilder/types';
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
import {
  additionalConfigurationForSave,
  combineUsage,
  listUsesSameAssignee,
  withSameAssignee,
} from '../utils/sameAssignee';

const inputClass =
  'w-full rounded-lg border border-(--palette-line-strong) px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

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

  const move = (index: number, delta: -1 | 1) =>
    onChange(arrayMove(selected, index, index + delta));

  return (
    <div>
      <label className="block text-sm font-medium text-(--palette-ink) mb-1">{label}</label>
      {baseline !== undefined && (
        <p className="text-xs text-(--palette-gray-400) mb-1.5">
          {t('strategies.baseline', {
            list: baseline.length ? baseline.join(', ') : t('strategies.baselineNone'),
          })}
        </p>
      )}
      {selected.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-(--palette-gray-400) mb-1">{t('strategies.orderHint')}</p>
          <ol className="rounded-md border border-(--palette-line-strong) bg-(--palette-surface) divide-y divide-(--palette-line-soft)">
            {selected.map((token, i) => (
              <li key={token} className="flex items-center gap-2 px-2 py-1 text-xs">
                <span className="w-4 text-(--palette-gray-400) text-right">{i + 1}.</span>
                <span className="flex-1 font-mono text-(--palette-ink)">{token}</span>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={t('strategies.moveUp', { strategy: token })}
                  className="px-1.5 text-(--palette-gray-500) hover:text-(--palette-ink) disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === selected.length - 1}
                  aria-label={t('strategies.moveDown', { strategy: token })}
                  className="px-1.5 text-(--palette-gray-500) hover:text-(--palette-ink) disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↓
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1">
        {ASSIGNMENT_STRATEGIES.map(token => (
          <label key={token} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(token)}
              onChange={() => toggle(token)}
              className="h-3.5 w-3.5 rounded border-(--palette-line-strong) text-blue-600 dark:text-blue-400"
            />
            <span className="font-mono text-(--palette-ink)">{token}</span>
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
  activitiesLoading: boolean;
  activitiesUnavailable: boolean;
  onSave: (body: SaveTaskAssignmentConfigBody, id?: string) => void;
  isSaving: boolean;
}

function ConfigModal({
  isOpen,
  onClose,
  editing,
  activities,
  activitiesLoading,
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
  // '' = inherit the workflow definition JSON; 'on'/'off' force the flag.
  const [teamConstrained, setTeamConstrained] = useState<'' | 'on' | 'off'>('');
  // null = inherit the workflow definition JSON; an array (possibly empty) overrides it.
  const [excludeAssigneesFrom, setExcludeAssigneesFrom] = useState<string[] | null>(null);
  // Whole bag is kept so unknown keys round-trip; only `sameAssigneeAsActivity` is edited here.
  const [additionalConfiguration, setAdditionalConfiguration] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isActive, setIsActive] = useState(true);
  const sourceFieldId = useId();

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
    setTeamConstrained(
      editing?.teamConstrained == null ? '' : editing.teamConstrained ? 'on' : 'off',
    );
    setExcludeAssigneesFrom(editing?.excludeAssigneesFrom ?? null);
    setAdditionalConfiguration(editing?.additionalConfiguration ?? null);
    setIsActive(editing?.isActive ?? true);
  }, [editing, isOpen]);

  const baseline = useMemo(
    () => activities.find(a => a.id === activityId) ?? null,
    [activities, activityId],
  );

  const storedSource = additionalConfiguration?.sameAssigneeAsActivity;
  // Non-string values are shown as text and kept as-is on save unless the admin edits them.
  const sameAssigneeAsActivity = storedSource == null ? '' : String(storedSource);
  const baselineSource = baseline?.sameAssigneeAsActivity?.trim() || '';
  // Automatic system step: no strategies, the source activity is the only thing an override sets.
  const isFollowupSelection = baseline?.type === ActivityType.INTERNAL_FOLLOWUP_SELECTION;
  // true = in effect, false = known unused, null = unknown (never drop a stored value then).
  const sameAssigneeUsed = combineUsage(
    [
      listUsesSameAssignee(
        primaryStrategies,
        specificAssignee,
        baseline?.initialAssignmentStrategies,
      ),
      listUsesSameAssignee(
        routeBackStrategies,
        specificAssignee,
        baseline?.revisitAssignmentStrategies,
      ),
    ],
    isFollowupSelection,
  );
  // From the row as opened (not the live value), so the field stays mounted while it is edited.
  const hadStoredSource = editing?.additionalConfiguration?.sameAssigneeAsActivity != null;
  const showSameAssignee =
    sameAssigneeUsed === true ||
    (sameAssigneeUsed === null && (hadStoredSource || sameAssigneeAsActivity !== ''));
  // Automatic steps complete as SYSTEM, so they can be neither a source nor an exclusion.
  // A missing type (older backend) counts as a task activity.
  const exclusionOptions = activities.filter(
    a => a.id !== activityId && a.type !== ActivityType.INTERNAL_FOLLOWUP_SELECTION,
  );
  // The BE accepts only a plain TaskActivity as a source (not fan-out).
  const sourceOptions = activities.filter(
    a => a.id !== activityId && (!a.type || a.type === ActivityType.TASK),
  );

  const setSameAssignee = (value: string) =>
    setAdditionalConfiguration(prev => withSameAssignee(prev, value));

  const handleSave = () => {
    if (!activityId.trim()) {
      toast.error(t('errors.activityRequired'));
      return;
    }
    const source = sameAssigneeAsActivity.trim();
    const body: SaveTaskAssignmentConfigBody = {
      activityId: activityId.trim(),
      bankingSegment: bankingSegment || null,
      assigneeGroup: assigneeGroup.trim() || null,
      primaryStrategies,
      routeBackStrategies,
      specificAssignee: specificAssignee.trim() || null,
      adminPoolId: adminPoolId.trim() || null,
      escalateToAdminPool,
      teamConstrained: teamConstrained === '' ? null : teamConstrained === 'on',
      excludeAssigneesFrom,
      additionalConfiguration: additionalConfigurationForSave(
        additionalConfiguration,
        sameAssigneeUsed,
        source,
      ),
      isActive,
    };
    onSave(
      // The follow-up selection step has no strategies (the BE rejects non-empty lists) or pool fields.
      isFollowupSelection
        ? {
            ...body,
            assigneeGroup: null,
            primaryStrategies: [],
            routeBackStrategies: [],
            specificAssignee: null,
            adminPoolId: null,
            escalateToAdminPool: false,
            teamConstrained: null,
            excludeAssigneesFrom: null,
          }
        : body,
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
        <fieldset disabled={activitiesLoading} className="min-w-0 space-y-4">
          {activitiesLoading && (
            <p className="text-xs text-(--palette-gray-400)">{t('fields.activitiesLoading')}</p>
          )}
          {/* Activity */}
          <div>
            <label className="block text-sm font-medium text-(--palette-ink) mb-1">
              {t('fields.activity')} <span className="text-red-500">*</span>
            </label>
            {editing ? (
              <input
                type="text"
                value={activityId}
                disabled
                className={`${inputClass} bg-(--palette-surface-2)`}
              />
            ) : activitiesUnavailable ? (
              <>
                <input
                  type="text"
                  value={activityId}
                  onChange={e => setActivityId(e.target.value)}
                  className={inputClass}
                  placeholder={t('fields.activityFreePlaceholder')}
                />
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {t('fields.activityUnavailable')}
                </p>
              </>
            ) : (
              <NativeSelect
                value={activityId}
                onChange={e => setActivityId(e.target.value)}
                className="w-full"
              >
                <option value="">{t('fields.activitySelect')}</option>
                {activities.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.id})
                  </option>
                ))}
              </NativeSelect>
            )}
          </div>

          {/* Baseline being overridden */}
          {baseline && !isFollowupSelection && (
            <div className="rounded-md border border-(--palette-line) bg-(--palette-surface-2) px-3 py-2 text-xs text-(--palette-gray-600) space-y-0.5">
              <p className="font-medium text-(--palette-gray-500)">{t('baseline.heading')}</p>
              <p>
                {t('baseline.group')}:{' '}
                <span className="font-mono">
                  {baseline.assigneeGroup || (
                    <span className="italic text-(--palette-gray-400)">{t('baseline.none')}</span>
                  )}
                </span>
              </p>
              <p>
                {t('baseline.initial')}:{' '}
                <span className="font-mono">
                  {baseline.initialAssignmentStrategies.join(', ') || '—'}
                </span>
              </p>
              <p>
                {t('baseline.routeBack')}:{' '}
                <span className="font-mono">
                  {baseline.revisitAssignmentStrategies.join(', ') || '—'}
                </span>
              </p>
            </div>
          )}

          {isFollowupSelection && (
            <p className="rounded-md border border-(--palette-line) bg-(--palette-surface-2) px-3 py-2 text-xs text-(--palette-gray-600)">
              {t('fields.followupSelectionHint')}
            </p>
          )}

          {/* Banking segment */}
          <div>
            <label className="block text-sm font-medium text-(--palette-ink) mb-1">
              {t('fields.bankingSegment')}
            </label>
            <NativeSelect
              value={bankingSegment}
              onChange={e => setBankingSegment(e.target.value as '' | BankingSegment)}
              className="w-full"
            >
              <option value="">{t('fields.anySegment')}</option>
              {SEGMENTS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          </div>

          {!isFollowupSelection && (
            <>
              {/* Assignee group override */}
              <div>
                <label className="block text-sm font-medium text-(--palette-ink) mb-1">
                  {t('fields.assigneeGroup')}
                </label>
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

              {/* Team constraint (tri-state) */}
              <div>
                <label className="block text-sm font-medium text-(--palette-ink) mb-1">
                  {t('fields.teamConstrained')}{' '}
                  <span className="text-xs font-normal text-(--palette-gray-400)">
                    {t('fields.teamConstrainedHint')}
                  </span>
                </label>
                <NativeSelect
                  value={teamConstrained}
                  onChange={e => setTeamConstrained(e.target.value as '' | 'on' | 'off')}
                  className="w-full"
                >
                  <option value="">{t('fields.teamConstrainedInherit')}</option>
                  <option value="on">{t('fields.teamConstrainedOn')}</option>
                  <option value="off">{t('fields.teamConstrainedOff')}</option>
                </NativeSelect>
              </div>

              {/* Exclude assignees who completed an earlier activity */}
              <div>
                <label className="block text-sm font-medium text-(--palette-ink) mb-1">
                  {t('fields.excludeAssigneesFrom')}{' '}
                  <span className="text-xs font-normal text-(--palette-gray-400)">
                    {t('fields.excludeAssigneesFromHint')}
                  </span>
                </label>
                {excludeAssigneesFrom === null ? (
                  <button
                    type="button"
                    onClick={() => setExcludeAssigneesFrom([])}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('fields.excludeAssigneesFromInherit')}
                  </button>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-(--palette-line) p-2 max-h-40 overflow-y-auto">
                      {exclusionOptions.length === 0 ? (
                        <p className="col-span-2 text-xs text-(--palette-gray-400)">
                          {t('fields.excludeAssigneesFromNoActivities')}
                        </p>
                      ) : (
                        exclusionOptions.map(a => (
                          <label key={a.id} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={excludeAssigneesFrom.includes(a.id)}
                              onChange={() =>
                                setExcludeAssigneesFrom(prev =>
                                  (prev ?? []).includes(a.id)
                                    ? (prev ?? []).filter(x => x !== a.id)
                                    : [...(prev ?? []), a.id],
                                )
                              }
                              className="h-3.5 w-3.5 rounded border-(--palette-line-strong) text-blue-600 dark:text-blue-400"
                            />
                            <span className="font-mono text-(--palette-ink)">{a.id}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setExcludeAssigneesFrom(null)}
                      className="mt-1 text-xs text-(--palette-gray-500) hover:underline"
                    >
                      {t('fields.excludeAssigneesFromReset')}
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* Same assignee as an earlier activity */}
          {showSameAssignee && (
            <div>
              <label
                htmlFor={sourceFieldId}
                className="block text-sm font-medium text-(--palette-ink) mb-1"
              >
                {t('fields.sameAssigneeAsActivity')}
                {!isFollowupSelection && (
                  <span className="text-xs font-normal text-(--palette-gray-400)">
                    {' '}
                    {t('fields.sameAssigneeAsActivityHint')}
                  </span>
                )}
              </label>
              {activitiesUnavailable ? (
                <input
                  id={sourceFieldId}
                  type="text"
                  value={sameAssigneeAsActivity}
                  onChange={e => setSameAssignee(e.target.value)}
                  className={`${inputClass} bg-(--palette-surface)`}
                  placeholder={t('fields.sameAssigneeFreePlaceholder')}
                />
              ) : (
                <NativeSelect
                  id={sourceFieldId}
                  value={sameAssigneeAsActivity}
                  onChange={e => setSameAssignee(e.target.value)}
                  className="w-full"
                >
                  <option value="">
                    {t('fields.sameAssigneeInherit', {
                      value: baselineSource || t('baseline.none'),
                    })}
                  </option>
                  {/* Saved value that is not selectable (activity gone, or the activity itself): show it, not "Inherit". */}
                  {sameAssigneeAsActivity &&
                    !sourceOptions.some(a => a.id === sameAssigneeAsActivity) && (
                      <option value={sameAssigneeAsActivity}>{sameAssigneeAsActivity}</option>
                    )}
                  {sourceOptions.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.id})
                    </option>
                  ))}
                </NativeSelect>
              )}
            </div>
          )}

          {!isFollowupSelection && (
            <>
              {/* Specific assignee */}
              <div>
                <label className="block text-sm font-medium text-(--palette-ink) mb-1">
                  {t('fields.specificAssignee')}{' '}
                  <span className="text-xs font-normal text-(--palette-gray-400)">
                    {t('fields.specificAssigneeHint')}
                  </span>
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
                  <label className="block text-sm font-medium text-(--palette-ink) mb-1">
                    {t('fields.adminPoolId')}{' '}
                    <span className="text-xs font-normal text-(--palette-gray-400)">
                      {t('fields.adminPoolHint')}
                    </span>
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
                  <label className="flex items-center gap-2 text-sm font-medium text-(--palette-ink)">
                    <input
                      type="checkbox"
                      checked={escalateToAdminPool}
                      onChange={e => setEscalateToAdminPool(e.target.checked)}
                      className="h-4 w-4 rounded border-(--palette-line-strong) text-blue-600 dark:text-blue-400"
                    />
                    {t('fields.escalate')}
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Active toggle */}
          <label className="flex items-center gap-2 text-sm font-medium text-(--palette-ink)">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-(--palette-line-strong) text-blue-600 dark:text-blue-400"
            />
            {t('fields.isActive')}
            <span className="text-xs font-normal text-(--palette-gray-400)">
              {t('fields.isActiveHint')}
            </span>
          </label>
        </fieldset>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!activityId.trim() || activitiesLoading}
          >
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
  const {
    data: activities = [],
    isError: activitiesError,
    isLoading: activitiesLoading,
  } = useListWorkflowActivities();

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
          <h3 className="text-base font-semibold text-(--palette-ink)">{t('page.title')}</h3>
          <p className="text-xs text-(--palette-gray-500) mt-0.5">{t('page.subtitle')}</p>
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
                : 'bg-(--palette-surface) text-(--palette-gray-600) border-(--palette-line-strong) hover:border-(--palette-line-strong)'
            }`}
          >
            {seg || t('filter.all')}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Icon
            name="spinner"
            style="solid"
            className="w-5 h-5 animate-spin text-(--palette-gray-400)"
          />
        </div>
      ) : configs.length === 0 ? (
        <div className="bg-(--palette-surface) rounded-lg border border-(--palette-line) px-4 py-8 text-center text-sm text-(--palette-gray-400) italic">
          {t('table.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-(--palette-line) bg-(--palette-surface)">
          <table className="min-w-full divide-y divide-(--palette-line) text-sm">
            <thead className="bg-(--palette-surface-2)">
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
                    className="px-4 py-2.5 text-left text-xs font-medium text-(--palette-gray-500) uppercase last:w-20"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-(--palette-surface) divide-y divide-(--palette-line)">
              {configs.map(row => (
                <tr key={row.id} className="hover:bg-(--palette-surface-2)">
                  <td className="px-4 py-3">
                    <p className="font-medium text-(--palette-ink)">
                      {activityName(row.activityId)}
                    </p>
                    <p className="text-xs text-(--palette-gray-400) font-mono">{row.activityId}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.bankingSegment ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300">
                        {row.bankingSegment}
                      </span>
                    ) : (
                      <span className="text-(--palette-gray-400) text-xs italic">
                        {t('table.any')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-(--palette-ink)">
                    {row.assigneeGroup || (
                      <span className="text-(--palette-gray-300) italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-(--palette-gray-500) max-w-xs">
                    <span className="font-mono">{row.primaryStrategies.join(', ') || '—'}</span>
                    {row.routeBackStrategies.length > 0 && (
                      <span className="block text-(--palette-gray-400)">
                        ↩ {row.routeBackStrategies.join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-(--palette-ink)">
                    {row.specificAssignee || (
                      <span className="text-(--palette-gray-300) italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-(--palette-surface-3) text-(--palette-gray-500)'
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
                        className="p-1 text-(--palette-gray-400) hover:text-(--palette-gray-600) rounded"
                        aria-label={`Edit ${row.activityId}`}
                      >
                        <Icon name="pen" style="solid" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="p-1 text-(--palette-gray-400) hover:text-(--palette-danger) rounded"
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
        activitiesLoading={activitiesLoading}
        activitiesUnavailable={!activitiesLoading && (activitiesError || activities.length === 0)}
        onSave={handleSave}
        isSaving={createConfig.isPending || updateConfig.isPending}
      />
    </div>
  );
};

export default TaskAssignmentConfigPage;
