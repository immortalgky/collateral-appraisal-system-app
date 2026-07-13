// Per-activity field selection for the Kanban card's detail grid — mirrors the
// column-config pattern in columnDefs.tsx but scoped to the handful of fields
// that fit a card instead of a full table.

export type CardFieldKey =
  | 'requestNumber'
  | 'propertyType'
  | 'appraiser'
  | 'appointment'
  | 'priority'
  | 'movement'
  | 'requestedBy'
  | 'reportReceived'
  | 'purpose'
  | 'assignedDate';

// Priority is shown as a flag at the top of every card (see TaskKanbanCard), so it
// is intentionally omitted from the detail-grid field lists below.
const DEFAULT_FIELDS: CardFieldKey[] = ['propertyType', 'appointment', 'movement'];

const CARD_FIELD_CONFIG: Record<string, CardFieldKey[]> = {
  'appraisal-initiation': ['requestNumber', 'requestedBy', 'propertyType'],
  'appraisal-initiation-check': ['requestNumber', 'requestedBy', 'propertyType'],
  'appraisal-assignment': ['propertyType', 'purpose'],
  'ext-appraisal-assignment': ['appointment', 'appraiser', 'propertyType'],
  'ext-appraisal-execution': ['appointment', 'appraiser', 'propertyType'],
  'int-appraisal-execution': ['appointment', 'appraiser', 'propertyType'],
  'fee-appointment-approval': ['appointment', 'appraiser', 'propertyType'],
  'ext-appraisal-check': ['appraiser', 'reportReceived', 'propertyType'],
  'int-appraisal-check': ['appraiser', 'reportReceived', 'propertyType'],
  'appraisal-book-verification': ['appraiser', 'reportReceived', 'propertyType'],
  'ext-appraisal-verification': ['appraiser', 'reportReceived'],
  'int-appraisal-verification': ['appraiser', 'reportReceived'],
  'int-pma-input': ['propertyType', 'appraiser'],
  'pending-approval': ['propertyType', 'appraiser'],
  'provide-additional-documents': ['requestedBy', 'propertyType'],
  'ext-collect-submissions': ['purpose', 'propertyType', 'requestedBy'],
  'admin-review-submissions': ['purpose', 'propertyType', 'requestedBy'],
  'rm-pick-winner': ['purpose', 'propertyType', 'requestedBy'],
  'admin-finalize': ['purpose', 'propertyType', 'requestedBy'],
  'ext-respond-negotiation': ['purpose', 'propertyType', 'requestedBy'],
};

export function getKanbanCardConfig(activityId: string | null | undefined): CardFieldKey[] {
  const base = !activityId ? DEFAULT_FIELDS : (CARD_FIELD_CONFIG[activityId] ?? DEFAULT_FIELDS);
  // Assigned Date is universally useful ("how long has this sat in my queue"), so
  // append it to every activity's card unless a config already lists it.
  return base.includes('assignedDate') ? base : [...base, 'assignedDate'];
}
