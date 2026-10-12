import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { AppraisalDto } from '../../api/appraisalSearch';

/**
 * Sections of the "add filter" menu. Twelve fields in one flat list is what made the old grid
 * unreadable — finding "province" meant scanning all of them.
 */
export const FILTER_GROUPS = ['work', 'kind', 'owner', 'area', 'time'] as const;
export type FilterGroup = (typeof FILTER_GROUPS)[number];

export interface FilterField {
  key: string;
  label: string;
  /** Section of the add-filter menu. Omitted on hidden fields, which the menu never offers. */
  group?: FilterGroup;
  type:
    | 'text'
    | 'select'
    | 'date'
    | 'date-range'
    | 'province-autocomplete'
    | 'company-autocomplete'
    | 'requestor-autocomplete'
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
  /** type 'date-range' only: offer forward-looking presets (Tomorrow, Next 7 days). Off for dates
   *  that can only be in the past, like Created, where they would always return nothing. */
  futureDates?: boolean;
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
  /**
   * A column that holds two sortable things in one cell (appraisal number over customer). The
   * header draws one sort button per entry instead of making the whole header a single sort
   * target, and `key` is only the column's identity (visibility, width, pinning).
   */
  headSorts?: { key: string; label: string }[];
  /**
   * The field the API sorts by when it is not the column's own key. The SLA column sorts by its due
   * date (nearest first on ascending), which reads as the deadline order the cell shows, while its
   * `key` stays what the width, visibility and filters know it by.
   */
  sortKey?: string;
}

/**
 * What the API returns when no sort is sent — AppraisalFilterBuilder.BuildOrderBy falls back to
 * CreatedAt DESC. The list sends nothing for "no sort", so this is what its header must show as
 * active. Keep it in step with the BE.
 */
export const APPRAISAL_DEFAULT_SORT = { by: 'createdAt', dir: 'desc' } as const;

/** What the header shows as sorted: the user's choice, else the API default. */
export const effectiveSort = (sortBy: string, sortDir: string) =>
  sortBy
    ? { by: sortBy, dir: sortDir }
    : { by: APPRAISAL_DEFAULT_SORT.by, dir: APPRAISAL_DEFAULT_SORT.dir };

const sameKey = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Next sort after a click on a header: ascending → descending → off, where "off" is the API
 * default (`sortBy: ''`) and the header then shows that default as active.
 *
 * The default column is the one wrinkle. It already shows as sorted, so for it the cycle is
 * default (desc) → asc → back to default: "off" would change nothing, and a click that visibly
 * does nothing is worse than skipping the state. Same rule as the request listing.
 */
export const nextAppraisalSort = (
  sortBy: string,
  sortDir: string,
  field: string,
): { sortBy: string; sortDir: string } => {
  const cur = effectiveSort(sortBy, sortDir);
  const isDefaultField = sameKey(field, APPRAISAL_DEFAULT_SORT.by);
  const off = { sortBy: '', sortDir: 'desc' };
  if (!sameKey(cur.by, field)) return { sortBy: field, sortDir: 'asc' };
  if (cur.dir === 'asc') return isDefaultField ? off : { sortBy: field, sortDir: 'desc' };
  return isDefaultField ? { sortBy: field, sortDir: 'asc' } : off;
};

export const makeAppraisalFilters = (t: TFunction<'appraisal'>): FilterField[] => [
  {
    key: 'status',
    group: 'work',
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
    group: 'work',
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
    group: 'work',
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
    group: 'kind',
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
    group: 'owner',
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
    group: 'owner',
    label: t('list.filters.bankingSegmentLabel'),
    type: 'parameter-select',
    parameterGroup: 'BankingSegment',
    placeholder: t('list.filters.bankingSegmentPlaceholder'),
  },
  {
    key: 'purpose',
    group: 'kind',
    label: t('list.filters.purposeLabel'),
    type: 'parameter-select',
    parameterGroup: 'AppraisalPurpose',
    placeholder: t('list.filters.purposePlaceholder'),
  },
  {
    key: 'propertyType',
    group: 'kind',
    label: t('list.filters.propertyTypeLabel'),
    type: 'parameter-select',
    parameterGroup: 'PropertyType',
    placeholder: t('list.filters.propertyTypePlaceholder'),
  },
  {
    key: 'province',
    group: 'area',
    label: t('common.province'),
    type: 'province-autocomplete',
    placeholder: t('list.filters.provincePlaceholder'),
  },
  {
    key: 'assigneeCompanyId',
    group: 'owner',
    label: t('common.company'),
    type: 'company-autocomplete',
    placeholder: t('list.filters.companyPlaceholder'),
  },
  // Who raised the request — how a credit officer finds their own customers' work. Options are
  // searched on the server (/auth/requestors), not listed: there are over a thousand users.
  {
    key: 'requestor',
    group: 'owner',
    label: t('list.filters.requestorLabel'),
    type: 'requestor-autocomplete',
  },
  {
    key: 'created',
    group: 'time',
    label: t('list.filters.created'),
    type: 'date-range',
    fromKey: 'createdFrom',
    toKey: 'createdTo',
  },
  // Was two hidden keys that only "Today's appointments" could set. A range control writes the same
  // two keys, so that quick view still lights this chip — and now anyone can pick "next 7 days".
  {
    key: 'appointment',
    group: 'time',
    label: t('list.filters.appointment'),
    type: 'date-range',
    fromKey: 'appointmentDateFrom',
    toKey: 'appointmentDateTo',
    futureDates: true,
  },
  {
    key: 'slaDueDate',
    group: 'time',
    label: t('list.filters.slaDue'),
    type: 'date-range',
    fromKey: 'slaDueDateFrom',
    toKey: 'slaDueDateTo',
    futureDates: true,
  },

  // Quick views ("Today's appointments", "Assigned this week") set these, and the page rebuilds
  // its filter state from the URL using this list as the whitelist — so while they were missing
  // here, picking such a view worked until you refreshed, at which point the filter silently
  // vanished and the list quietly widened to everything.
  //
  // hidden: they belong in the whitelist and want a chip, but nobody types them, so they get no
  // control. Removing them from the array instead would bring the refresh bug straight back.
  // "My assignments" sets this (GetAppraisalViewsQueryHandler.cs:99). Same reason as the dates
  // below: without it the view works, writes ?assigneeUserId=… to the URL, and then loses the
  // filter on refresh while the view chip stays lit — the list silently widens from "my work" to
  // everything.
  {
    key: 'assigneeUserId',
    label: t('list.filters.assigneeUserId'),
    type: 'text',
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
  // Number over customer, one column: the number is the row's link and identity, the customer is
  // who it is for — and while the table scrolls sideways this is the column that stays, so the
  // two travel together instead of leaving a number with no name beside it.
  // `appraisalCustomer`, not `appraisalNumber`: widths are stored per column key, and this column
  // replaced the old number-only one — a ~110px width a user dragged that to would otherwise be
  // applied here and leave the customer name no room.
  {
    key: 'appraisalCustomer',
    label: t('list.columns.appraisalNumberCustomer'),
    sortable: true,
    width: 220,
    headSorts: [
      { key: 'appraisalNumber', label: t('list.columns.appraisalNumber') },
      { key: 'customerName', label: t('list.columns.customer') },
    ],
  },
  { key: 'status', label: t('list.columns.status'), sortable: true, width: 135 },
  // Purpose over job type (appraisal type): the job type is a second line, not a column, so the
  // sort stays on the purpose.
  { key: 'purpose', label: t('list.columns.purposeAndType'), sortable: true, width: 190 },
  // Comma-joined aggregate across the appraisal's properties — not meaningfully sortable
  { key: 'propertyTypes', label: t('list.columns.propertyType'), sortable: false, width: 140 },
  {
    key: 'slaStatus',
    label: t('list.columns.sla'),
    sortable: true,
    sortKey: 'slaDueDate',
    width: 170,
  },
  { key: 'priority', label: t('list.columns.priority'), sortable: true, width: 120 },
  // Who has the job, in one cell: the company for External work (the person there is not recorded —
  // see the note on APPRAISAL_DEFAULT_HIDDEN_COLUMNS), the user code for Internal.
  { key: 'assignee', label: t('list.columns.assignee'), sortable: false, width: 230 },
  { key: 'appointmentDateTime', label: t('list.columns.appointment'), sortable: true, width: 150 },
  { key: 'province', label: t('list.columns.province'), sortable: true, width: 130 },
  { key: 'requestor', label: t('list.columns.requestor'), sortable: false, width: 190 },
  { key: 'bankingSegment', label: t('list.columns.bankingSegment'), sortable: true, width: 150 },
  { key: 'createdAt', label: t('list.columns.created'), sortable: true, width: 150 },

  // Off by default — see APPRAISAL_DEFAULT_HIDDEN_COLUMNS. Kept after the visible ones so turning
  // one on does not land it in the middle of the default order.
  { key: 'assignmentType', label: t('list.columns.assignment'), sortable: true, width: 110 },
  { key: 'companyName', label: t('list.columns.company'), sortable: false, width: 180 },
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
  // High priority is a red flag beside the appraisal number, so the column would only repeat it.
  'priority',
  // Both are folded into `assignee`; still offered in the picker for anyone who wants them apart.
  'assignmentType',
  'companyName',
  'slaBusinessDays',
  'submittedAt',
  'groupTag',
] as const;

// Keep backward-compatible static exports (English fallback) for callers that can't use t yet
