import { z } from 'zod';
import type { TFunction } from 'i18next';
import { tokenT } from '@/shared/components/form/validationMessage';

/**
 * Zod schema for internal staff
 */
export const internalStaffSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  name: z.string(),
  email: z.string(),
  department: z.string(),
  avatar: z.string().nullable(),
  currentWorkload: z.number(),
});

/**
 * Zod schema for external company
 */
export const externalCompanySchema = z.object({
  id: z.string(),
  companyName: z.string(),
  companyNameLocal: z.string().nullish(),
  registrationNo: z.string(),
  contactPerson: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  rating: z.number(),
  activeAssignments: z.number(),
});

/** Allowed form values; the schema and the Appraisal Type defaults mapper share them. */
export const ASSIGNMENT_TYPES = ['internal', 'external', 'external-offline'] as const;
export const ASSIGNMENT_METHODS = ['manual', 'roundrobin', 'quotation'] as const;
export const FOLLOWUP_STAFF_METHODS = ['manual', 'roundrobin'] as const;

/**
 * Assignment form validation schema factory
 */
export const makeAssignmentFormSchema = (t: TFunction<'appraisal'>) =>
  z
    .object({
      // 'external-offline' = the bank engaged a company OUTSIDE the system; an internal
      // appraiser keys that company's book in afterwards. The admin picks nothing here —
      // the company and the book's appraisal date are recorded later by the keyer, who has
      // the paper book in hand.
      assignmentType: z.enum(ASSIGNMENT_TYPES, {
        required_error: t('validation.assignmentTypeRequired'),
      }),
      assignmentMethod: z.enum(ASSIGNMENT_METHODS, {
        required_error: t('validation.assignmentMethodRequired'),
      }),
      staffId: z.string().nullable(),
      companyId: z.string().nullable(),
      selectedStaff: internalStaffSchema.nullable(),
      selectedCompany: externalCompanySchema.nullable(),
      followupStaffId: z.string().nullable(),
      selectedFollowupStaff: internalStaffSchema.nullable(),
      followupStaffMethod: z.enum(FOLLOWUP_STAFF_METHODS),
      remarks: z.string().max(4000, t('validation.remarksMaxLength')),
    })
    .refine(
      data => {
        // For manual selection, require either staffId or companyId based on type.
        // Off-system external picks no COMPANY here (the keyer records it later from the book),
        // but it does pick the internal appraiser who keys it in — so it requires staffId, exactly
        // like the internal path.
        if (data.assignmentMethod === 'manual') {
          if (data.assignmentType === 'internal' || data.assignmentType === 'external-offline') {
            return data.staffId !== null && data.staffId.length > 0;
          }
          return data.companyId !== null && data.companyId.length > 0;
        }
        // Round-robin and quotation don't require upfront selection
        return true;
      },
      {
        message: t('validation.selectAssignee'),
        path: ['staffId'], // Will show on staffId field
      },
    )
    .refine(
      data => {
        // For external assignments, only require followup staff when method is manual
        if (data.assignmentType === 'external' && data.followupStaffMethod === 'manual') {
          return data.followupStaffId !== null && data.followupStaffId.length > 0;
        }
        return true;
      },
      {
        message: t('validation.selectFollowupStaff'),
        path: ['followupStaffId'],
      },
    );

// Built once with the token `t`: the messages are translated where they are shown, so this one
// schema serves every language.
export const assignmentFormSchema = makeAssignmentFormSchema(tokenT('appraisal'));

export type AssignmentFormType = z.infer<typeof assignmentFormSchema>;

export const useAssignmentFormSchema = () => assignmentFormSchema;

/**
 * Default values for the assignment form
 */
export const assignmentFormDefaults: AssignmentFormType = {
  assignmentType: 'external',
  assignmentMethod: 'quotation',
  staffId: null,
  companyId: null,
  selectedStaff: null,
  selectedCompany: null,
  followupStaffId: null,
  selectedFollowupStaff: null,
  followupStaffMethod: 'roundrobin',
  remarks: '',
};
