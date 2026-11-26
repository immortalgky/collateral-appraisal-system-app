/** Row of GET /appraisals/suspensions (AppraisalSuspensionRow in the API). */
export interface AppraisalSuspensionRow {
  appraisalId: string;
  appraisalNumber: string;
  customerName: string | null;
  appraisedValue: number | null;
  appraisalType: string;
  completedAt: string | null;
  isSuspended: boolean;
}

/** Matches the API's SuspensionFilter enum (`?status=`). */
export type SuspensionFilter = 'All' | 'Active' | 'Suspended';

export interface AppraisalSuspensionPage {
  items: AppraisalSuspensionRow[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export type SuspensionAction = 'Suspended' | 'Reactivated';

/** Row of GET /appraisals/{id}/suspension-logs. */
export interface AppraisalSuspensionLog {
  action: SuspensionAction;
  reason: string;
  actionAt: string;
  actionBy: string;
}
