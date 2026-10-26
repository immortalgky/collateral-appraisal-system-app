import type { TFunction } from 'i18next';
import type { FilterField } from '@/features/appraisal/components/search/tabConfigs';
import { APPRAISAL_STATUS_FILTER_OPTIONS } from '@shared/constants/appraisalStatus';
import { ACTIVITY_IDS } from '../../config/activityConfig';
import type { ActiveTab } from '../../config/resolveInitialTab';
import type { GroupByField } from '../../types';

/** The SLA values a task row can carry, in urgency order (NoSla: no clock runs on it). */
export const SLA_STATUS_VALUES = ['Breached', 'AtRisk', 'OnTime', 'NoSla'] as const;

/** The ways the board can group its lanes. */
export const GROUP_BY_VALUES: GroupByField[] = [
  'status',
  'purpose',
  'priority',
  'activity',
  'slaStatus',
];

/** Filters drawn as a chip even when unset, per tab; the rest are added from "add filter". */
export const PINNED_TASK_FILTERS: Record<ActiveTab, string[]> = {
  personal: ['activityId', 'status', 'appointment'],
  pool: ['activityId', 'status', 'purpose', 'channel', 'appointment'],
};

/** The content area is at least this wide: the filter panel has room beside the table. */
export const FILTER_PANEL_MIN_WIDTH = 1280;

/**
 * The filters of the task list (My and Pool alike), as the appraisal list's chip bar and value
 * panel take them. Each list facet is multi-select, stored comma-joined in one key — the one
 * query value the API takes. The three date ranges are separate keys, so they combine.
 *
 * Legacy keys follow, `hidden`: a dashboard drill-down or an old link can still carry them. They
 * get a removable chip and no input — dropping them from this list would filter the list by
 * something the page never shows. (The old single date range is not among them: it is turned into
 * one of the three ranges when the address is read.)
 */
export const makeTaskFilters = (t: TFunction<['task', 'appraisal']>): FilterField[] => [
  {
    key: 'activityId',
    group: 'work',
    label: t('task:filters.taskType'),
    type: 'select',
    options: ACTIVITY_IDS.map(id => ({
      value: id,
      label: t(`task:activity.${id}`, { defaultValue: id }),
    })),
  },
  {
    key: 'status',
    group: 'work',
    label: t('task:filters.status'),
    type: 'select',
    options: APPRAISAL_STATUS_FILTER_OPTIONS.map(o => ({
      value: o.value,
      label: t(`appraisal:list.status.${o.value}`),
    })),
  },
  {
    key: 'purpose',
    group: 'kind',
    label: t('task:filters.purpose'),
    type: 'parameter-select',
    parameterGroup: 'AppraisalPurpose',
  },
  {
    key: 'channel',
    group: 'kind',
    label: t('task:filters.channel'),
    type: 'parameter-select',
    parameterGroup: 'Channel',
  },
  {
    key: 'slaStatus',
    group: 'work',
    label: t('task:filters.slaStatus'),
    type: 'select',
    options: SLA_STATUS_VALUES.map(v => ({ value: v, label: t(`task:sla.${v}`) })),
  },
  {
    key: 'appointment',
    group: 'time',
    label: t('task:filters.appointment'),
    type: 'date-range',
    fromKey: 'appointmentFrom',
    toKey: 'appointmentTo',
    futureDates: true,
  },
  {
    key: 'assigned',
    group: 'time',
    label: t('task:filters.assigned'),
    type: 'date-range',
    fromKey: 'assignedFrom',
    toKey: 'assignedTo',
  },
  {
    key: 'requested',
    group: 'time',
    label: t('task:filters.requested'),
    type: 'date-range',
    fromKey: 'requestedFrom',
    toKey: 'requestedTo',
  },
  // Legacy keys, see above.
  { key: 'appraisalNumber', label: t('task:filters.appraisalNumber'), type: 'text', hidden: true },
  { key: 'customerName', label: t('task:filters.customerName'), type: 'text', hidden: true },
  { key: 'pendingTaskStatus', label: t('task:filters.taskStatus'), type: 'text', hidden: true },
  { key: 'assigneeUserId', label: t('task:filters.assignee'), type: 'text', hidden: true },
];
