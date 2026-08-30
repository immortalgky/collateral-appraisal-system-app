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
    | 'province-autocomplete'
    | 'company-autocomplete'
    | 'parameter-select';
  options?: { value: string; label: string }[];
  /** Parameter group for type: 'parameter-select' (e.g. 'BankingSegment'). Options come from GET /parameters. */
  parameterGroup?: string;
  placeholder?: string;
}

// ── Enhanced Appraisal Search Config (for AppraisalListPage) ──

export interface AppraisalColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
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
  { key: 'createdFrom', label: t('list.filters.createdFrom'), type: 'date' },
  { key: 'createdTo', label: t('list.filters.createdTo'), type: 'date' },
  { key: 'slaDueDateFrom', label: t('list.filters.slaDueFrom'), type: 'date' },
  { key: 'slaDueDateTo', label: t('list.filters.slaDueTo'), type: 'date' },
];

export const makeAppraisalColumns = (t: TFunction<'appraisal'>): AppraisalColumnDef[] => [
  { key: 'appraisalNumber', label: t('list.columns.appraisalNumber'), sortable: true },
  { key: 'customerName', label: t('list.columns.customer'), sortable: true },
  { key: 'status', label: t('list.columns.status'), sortable: true },
  { key: 'priority', label: t('list.columns.priority'), sortable: true },
  { key: 'slaStatus', label: t('list.columns.sla'), sortable: true },
  { key: 'province', label: t('list.columns.province'), sortable: true },
  { key: 'assignmentType', label: t('list.columns.assignment'), sortable: true },
  { key: 'bankingSegment', label: t('list.columns.bankingSegment'), sortable: true },
  { key: 'purpose', label: t('list.columns.purpose'), sortable: true },
  // Comma-joined aggregate across the appraisal's properties — not meaningfully sortable
  { key: 'propertyTypes', label: t('list.columns.propertyType'), sortable: false },
  { key: 'companyName', label: t('list.columns.company'), sortable: false },
  { key: 'appointmentDateTime', label: t('list.columns.appointment'), sortable: true },
  { key: 'createdAt', label: t('list.columns.created'), sortable: true },
];

// Keep backward-compatible static exports (English fallback) for callers that can't use t yet
export const appraisalFilters: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    placeholder: 'All statuses',
    options: [
      { value: 'Pending', label: 'Pending' },
      { value: 'Assigned', label: 'Assigned' },
      { value: 'InProgress', label: 'In Progress' },
      { value: 'UnderReview', label: 'Under Review' },
      { value: 'Completed', label: 'Completed' },
      { value: 'Cancelled', label: 'Cancelled' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    placeholder: 'All priorities',
    options: [
      { value: 'Normal', label: 'Normal' },
      { value: 'High', label: 'High' },
    ],
  },
  {
    key: 'slaStatus',
    label: 'SLA Status',
    type: 'select',
    placeholder: 'All SLA',
    options: [
      { value: 'OnTrack', label: 'On Track' },
      { value: 'AtRisk', label: 'At Risk' },
      { value: 'Breached', label: 'Breached' },
    ],
  },
  {
    key: 'appraisalType',
    label: 'Type',
    type: 'select',
    placeholder: 'All types',
    options: [
      { value: 'New', label: 'New' },
      { value: 'ReAppraisal', label: 'Re-Appraisal' },
      { value: 'Progressive', label: 'Progressive' },
      { value: 'PreAppraisal', label: 'Pre-Appraisal' },
    ],
  },
  {
    key: 'assignmentType',
    label: 'Assignment',
    type: 'select',
    placeholder: 'All assignments',
    options: [
      { value: 'Internal', label: 'Internal' },
      { value: 'External', label: 'External' },
    ],
  },
  {
    key: 'bankingSegment',
    label: 'Banking Segment',
    type: 'parameter-select',
    parameterGroup: 'BankingSegment',
    placeholder: 'All segments',
  },
  {
    key: 'purpose',
    label: 'Purpose',
    type: 'parameter-select',
    parameterGroup: 'AppraisalPurpose',
    placeholder: 'All purposes',
  },
  {
    key: 'propertyType',
    label: 'Property Type',
    type: 'parameter-select',
    parameterGroup: 'PropertyType',
    placeholder: 'All property types',
  },
  {
    key: 'province',
    label: 'Province',
    type: 'province-autocomplete',
    placeholder: 'All provinces',
  },
  {
    key: 'assigneeCompanyId',
    label: 'Company',
    type: 'company-autocomplete',
    placeholder: 'Search company...',
  },
  { key: 'createdFrom', label: 'Created From', type: 'date' },
  { key: 'createdTo', label: 'Created To', type: 'date' },
  { key: 'slaDueDateFrom', label: 'SLA Due From', type: 'date' },
  { key: 'slaDueDateTo', label: 'SLA Due To', type: 'date' },
];

export const appraisalColumns: AppraisalColumnDef[] = [
  { key: 'appraisalNumber', label: 'Appraisal No.', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'slaStatus', label: 'SLA', sortable: true },
  { key: 'province', label: 'Province', sortable: true },
  { key: 'assignmentType', label: 'Assignment', sortable: true },
  { key: 'bankingSegment', label: 'Segment', sortable: true },
  { key: 'purpose', label: 'Purpose', sortable: true },
  { key: 'propertyTypes', label: 'Property Type', sortable: false },
  { key: 'companyName', label: 'Company', sortable: false },
  { key: 'appointmentDateTime', label: 'Appointment', sortable: true },
  { key: 'createdAt', label: 'Created', sortable: true },
];
