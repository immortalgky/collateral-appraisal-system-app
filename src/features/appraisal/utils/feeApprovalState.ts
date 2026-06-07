import type { AppointmentDto2Type, AppraisalFeeItemDtoType } from '@shared/schemas/v1';

export interface FeeApprovalState {
  hasDraft: boolean;
  hasSubmitted: boolean;
  draftDateChange: boolean;
  draftFeeCount: number;
  submittedDateChange: boolean;
  submittedFeeCount: number;
}

/**
 * Derives approval UI state from the appointment + fee items returned by the server.
 *
 * Draft   = requiresApproval is true AND approvalSubmittedAt is null/absent
 * Submitted = requiresApproval is true AND approvalSubmittedAt is non-null
 */
export function deriveFeeApprovalState(
  appointment: AppointmentDto2Type | null,
  feeItems: AppraisalFeeItemDtoType[],
): FeeApprovalState {
  // Appointment fields arrive via .passthrough() — cast to access new backend fields
  const appt = appointment as (AppointmentDto2Type & {
    requiresApproval?: boolean;
    approvalSubmittedAt?: string | null;
  }) | null;

  const appointmentRequiresApproval = appt?.requiresApproval === true;
  const appointmentSubmittedAt = appt?.approvalSubmittedAt ?? null;

  const draftDateChange = appointmentRequiresApproval && !appointmentSubmittedAt;
  const submittedDateChange = appointmentRequiresApproval && !!appointmentSubmittedAt;

  // Fee items also arrive via .passthrough() — cast for new approvalSubmittedAt field
  type FeeItemExtended = AppraisalFeeItemDtoType & { approvalSubmittedAt?: string | null };

  const draftFeeItems = feeItems.filter((item) => {
    const ext = item as FeeItemExtended;
    return (
      item.requiresApproval === true &&
      (item.approvalStatus?.toLowerCase() === 'pending' || item.approvalStatus == null) &&
      !ext.approvalSubmittedAt
    );
  });

  const submittedFeeItems = feeItems.filter((item) => {
    const ext = item as FeeItemExtended;
    return item.requiresApproval === true && !!ext.approvalSubmittedAt;
  });

  return {
    hasDraft: draftDateChange || draftFeeItems.length > 0,
    hasSubmitted: submittedDateChange || submittedFeeItems.length > 0,
    draftDateChange,
    draftFeeCount: draftFeeItems.length,
    submittedDateChange,
    submittedFeeCount: submittedFeeItems.length,
  };
}

/**
 * Builds a human-readable summary string for use in the submit button label.
 * Callers must pass pre-translated part strings; this joins them with ", ".
 *
 * Example: buildApprovalSummary({ dateLabel: "1 date change", feesLabel: "2 fees" })
 *   → "1 date change, 2 fees"
 */
export function buildApprovalSummaryParts(state: FeeApprovalState, labels: {
  dateLabel: string;
  feeLabel: (count: number) => string;
}): string {
  const parts: string[] = [];
  if (state.draftDateChange) parts.push(labels.dateLabel);
  if (state.draftFeeCount > 0) parts.push(labels.feeLabel(state.draftFeeCount));
  return parts.join(', ');
}
