import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { AppraisalDto } from '../../api/appraisalSearch';

export interface FilterField {
  key: string;
  label: string;
  type:
    | 'text'
    | 'select'
    | 'date'
    | 'date-range'
    | 'province-autocomplete'
    | 'company-autocomplete'
    | 'parameter-select';
  options?: { value: string; label: string }[];
  /** Parameter group for type: 'parameter-select' (e.g. 'BankingSegment'). Options come from GET /parameters. */
  parameterGroup?: string;
  placeholder?: string;
  /**
   * Accepted from the URL and labelled on a chip, but never rendered as an input.
   *
   * For keys a quick view sets on the user's behalf. They have to stay in this array because the
   * page derives its URL whitelist and its chip labels from it — dropping them made a quick view's
   * filter vanish on refresh — but putting four more date boxes on screen for values nobody types
   * is what made the bar unreadable.
   */
  hidden?: boolean;
  /**
   * type 'date-range' only: the two filter keys this single control writes. The backend knows
   * `createdFrom`/`createdTo`, not `created` — `key` here is just the control's own identity.
   */
  fromKey?: string;
  toKey?: string;
}

// ── Enhanced Appraisal Search Config (for AppraisalListPage) ──

export interface AppraisalColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  /**
   * Default width in px when the user-managed layout is active. Sized for Thai labels, which run
   * longer than the English ones — a width that fits `en` truncates `th`.
   */
  width?: number;
  render?: (item: AppraisalDto) => ReactNode;
}

export const makeAppraisalFilters = (t: TFunction<'appraisal'>): FilterField[] => [
  {
    key: 'status',
    label: t('list.filters.statusLabel'),
    type: 'select',
    placeholder: t('list.filters.statusPlaceholder'),
    options: [
      { value: 'Pending', label: t('list.status.Pending') },
      { value: 'Assigned', label: t('list.status.Assigned') },
      { value: 'InProgress', label: t('list.status.InProgress') },
      { value: 'UnderReview', label: t('list.status.UnderReview') },
      { value: 'Completed', label: t('list.status.Completed') },
      { value: 'Cancelled', label: t('list.status.Cancelled') },
    ],
  },
  {
    key: 'priority',
    label: t('list.filters.priorityLabel'),
    type: 'select',
    placeholder: t('list.filters.priorityPlaceholder'),
    options: [
      { value: 'Normal', label: t('list.priority.Normal') },
      { value: 'High', label: t('list.priority.High') },
    ],
  },
  {
    key: 'slaStatus',
    label: t('list.filters.slaStatusLabel'),
    type: 'select',
    placeholder: t('list.filters.slaStatusPlaceholder'),
    options: [
      { value: 'OnTrack', label: t('list.sla.OnTrack') },
      { value: 'AtRisk', label: t('list.sla.AtRisk') },
      { value: 'Breached', label: t('list.sla.Breached') },
    ],
  },
  {
    key: 'appraisalType',
    label: t('list.filters.typeLabel'),
    type: 'select',
    placeholder: t('list.filters.typePlaceholder'),
    // Mirrors the backend's AppraisalTypes.ValidValues — stored verbatim in the DB.
    options: [
      { value: 'New', label: t('list.appraisalType.New') },
      { value: 'ReAppraisal', label: t('list.appraisalType.ReAppraisal') },
      { value: 'Progressive', label: t('list.appraisalType.Progressive') },
      { value: 'PreAppraisal', label: t('list.appraisalType.PreAppraisal') },
    ],
  },
  {
    key: 'assignmentType',
    label: t('list.filters.assignmentLabel'),
    type: 'select',
    placeholder: t('list.filters.assignmentPlaceholder'),
    options: [
      { value: 'Internal', label: t('list.assignmentType.Internal') },
      { value: 'External', label: t('list.assignmentType.External') },
    ],
  },
  {
    key: 'bankingSegment',
    label: t('list.filters.bankingSegmentLabel'),
    type: 'parameter-select',
    parameterGroup: 'BankingSegment',
    placeholder: t('list.filters.bankingSegmentPlaceholder'),
  },
  {
    key: 'purpose',
    label: t('list.filters.purposeLabel'),
    type: 'parameter-select',
    parameterGroup: 'AppraisalPurpose',
    placeholder: t('list.filters.purposePlaceholder'),
  },
  {
    key: 'propertyType',
    label: t('list.filters.propertyTypeLabel'),
    type: 'parameter-select',
    parameterGroup: 'PropertyType',
    placeholder: t('list.filters.propertyTypePlaceholder'),
  },
  {
    key: 'province',
    label: t('common.province'),
    type: 'province-autocomplete',
    placeholder: t('list.filters.provincePlaceholder'),
  },
  {
    key: 'assigneeCompanyId',
    label: t('common.company'),
    type: 'company-autocomplete',
    placeholder: t('list.filters.companyPlaceholder'),
  },
  {
    key: 'created',
    label: t('list.filters.created'),
    type: 'date-range',
    fromKey: 'createdFrom',
    toKey: 'createdTo',
  },
  {
    key: 'slaDueDate',
    label: t('list.filters.slaDue'),
    type: 'date-range',
    fromKey: 'slaDueDateFrom',
    toKey: 'slaDueDateTo',
  },

  // Quick views ("Today's appointments", "Assigned this week") set these, and the page rebuilds
  // its filter state from the URL using this list as the whitelist — so while they were missing
  // here, picking such a view worked until you refreshed, at which point the filter silently
  // vanished and the list quietly widened to everything.
  //
  // hidden: they belong in the whitelist and want a chip, but nobody types them, so they get no
  // control. Removing them from the array instead would bring the refresh bug straight back.
  {
    key: 'appointmentDateFrom',
    label: t('list.filters.appointmentDateFrom'),
    type: 'date',
    hidden: true,
  },
  {
    key: 'appointmentDateTo',
    label: t('list.filters.appointmentDateTo'),
    type: 'date',
    hidden: true,
  },
  {
    key: 'assignedDateFrom',
    label: t('list.filters.assignedDateFrom'),
    type: 'date',
    hidden: true,
  },
  { key: 'assignedDateTo', label: t('list.filters.assignedDateTo'), type: 'date', hidden: true },
];

/**
 * Flattens the filter list to the keys that actually travel in the URL and on chips.
 *
 * A 'date-range' field is one control but two backend keys — its own `key` ('created') is a
 * control identity the API has never heard of. Deriving the URL whitelist from `f.key` alone
 * therefore drops `createdFrom`/`createdTo` on the way back in, which is the same class of bug
 * that made quick-view filters vanish on refresh. Both the whitelist and the chip labels are
 * built from this one function so they cannot drift apart.
 *
 * @param rangeLabel renders the From/To suffix, e.g. `(from) => \`\${label} (\${from})\``
 */
export const expandFilterKeys = (
  fields: FilterField[],
  fromWord: string,
  toWord: string,
): { key: string; label: string }[] =>
  fields.flatMap(f =>
    f.type === 'date-range'
      ? [
          { key: f.fromKey ?? '', label: `${f.label} (${fromWord})` },
          { key: f.toKey ?? '', label: `${f.label} (${toWord})` },
        ].filter(x => x.key !== '')
      : [{ key: f.key, label: f.label }],
  );

export const makeAppraisalColumns = (t: TFunction<'appraisal'>): AppraisalColumnDef[] => [
  { key: 'appraisalNumber', label: t('list.columns.appraisalNumber'), sortable: true, width: 130 },
  { key: 'customerName', label: t('list.columns.customer'), sortable: true, width: 180 },
  { key: 'status', label: t('list.columns.status'), sortable: true, width: 110 },
  { key: 'priority', label: t('list.columns.priority'), sortable: true, width: 90 },
  { key: 'slaStatus', label: t('list.columns.sla'), sortable: true, width: 110 },
  { key: 'province', label: t('list.columns.province'), sortable: true, width: 130 },
  { key: 'assignmentType', label: t('list.columns.assignment'), sortable: true, width: 110 },
  { key: 'bankingSegment', label: t('list.columns.bankingSegment'), sortable: true, width: 150 },
  { key: 'purpose', label: t('list.columns.purpose'), sortable: true, width: 150 },
  // Comma-joined aggregate across the appraisal's properties — not meaningfully sortable
  { key: 'propertyTypes', label: t('list.columns.propertyType'), sortable: false, width: 140 },
  { key: 'companyName', label: t('list.columns.company'), sortable: false, width: 180 },
  { key: 'appointmentDateTime', label: t('list.columns.appointment'), sortable: true, width: 150 },
  { key: 'createdAt', label: t('list.columns.created'), sortable: true, width: 150 },

  // Returned by the API but off by default — see APPRAISAL_DEFAULT_HIDDEN_COLUMNS.
  { key: 'slaBusinessDays', label: t('list.columns.slaBusinessDays'), sortable: false, width: 120 },
  { key: 'submittedAt', label: t('list.columns.submittedAt'), sortable: false, width: 150 },
  { key: 'groupTag', label: t('list.columns.groupTag'), sortable: false, width: 120 },
];

/**
 * Columns that start hidden for a user who has never opened the column picker.
 *
 * All three are real API fields, but showing them by default would cost every user a column of
 * mostly blanks: on the dev database SubmittedAt is set on 20 of 105,475 appraisals and GroupTag
 * on 7. SLABusinessDays is populated nearly everywhere but restates SLA hours, which the SLA
 * column already conveys — useful to have, not useful enough to spend default width on.
 *
 * Two fields the API also returns are deliberately NOT columns at all: internalAppraiserName and
 * externalAppraiserName are never written by any assignment path (0 rows of 105,491, and 0 of the
 * 153 External assignments), so a column for either could only ever be empty.
 */
export const APPRAISAL_DEFAULT_HIDDEN_COLUMNS = [
  'slaBusinessDays',
  'submittedAt',
  'groupTag',
] as const;

// Keep backward-compatible static exports (English fallback) for callers that can't use t yet
