export type AssignedType = '1' | '2';
export type AppliesToType = 'Ext' | 'Int' | 'Both';

export interface FeeApprovalTierDto {
  id: string;
  minAmount: number;
  maxAmount?: number | null;
  approverCode: string;
  assignedType: AssignedType;
  tierLabel: string;
  priority: number;
  isActive: boolean;
  appliesTo: AppliesToType;
}

export type FeeApprovalTierCreateRequest = Omit<FeeApprovalTierDto, 'id'>;
export type FeeApprovalTierUpdateRequest = Omit<FeeApprovalTierDto, 'id'>;

export interface AppointmentApprovalRuleDto {
  id: string;
  weekendHolidayEnabled: boolean;
  weekdayEnabled: boolean;
  leadTimeEnabled: boolean;
  leadTimeDays?: number | null;
  rescheduleEnabled: boolean;
  rescheduleThreshold?: number | null;
  appliesTo: AppliesToType;
}

export type AppointmentApprovalRuleUpdateRequest = Omit<AppointmentApprovalRuleDto, 'id'>;
