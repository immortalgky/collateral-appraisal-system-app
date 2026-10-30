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

/** The remark's length limit: the schema, the textarea's maxLength and the slip's check share it. */
export const ASSIGNMENT_REMARKS_MAX = 4000;

/**
 * Assignment form validation schema factory
 */
export const makeAssignmentFormSchema = (t: TFunction<'appraisal'>) =>
  z
    .object({
      // 'external-offline' = the bank engaged a company OUTSIDE the system; an internal
      // appraiser keys that company's book in afterwards. The admin names the company here
      // (always a manual pick); the keyer records only the book's appraisal date.
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
      remarks: z
        .string()
        .max(
          ASSIGNMENT_REMARKS_MAX,
          t('validation.remarksMaxLength', { max: ASSIGNMENT_REMARKS_MAX }),
        ),
    })
    .refine(
      data => {
        // Manual internal needs staffId. Off-system external also picks the internal appraiser
        // who keys the book in, so a manual keyer requires staffId exactly like the internal path.
        const needsStaff =
          data.assignmentMethod === 'manual' &&
          (data.assignmentType === 'internal' || data.assignmentType === 'external-offline');
        return !needsStaff || (data.staffId !== null && data.staffId.length > 0);
      },
      {
        message: t('validation.selectAssignee'),
        path: ['staffId'],
      },
    )
    .refine(
      data => {
        // Manual external needs companyId, and so does off-system external whatever its keyer
        // method (its company is always picked by hand). It has its own path so the error lands
        // under the company picker.
        const needsCompany =
          (data.assignmentMethod === 'manual' && data.assignmentType === 'external') ||
          data.assignmentType === 'external-offline';
        return !needsCompany || (data.companyId !== null && data.companyId.length > 0);
      },
      {
        message: t('validation.selectCompany'),
        path: ['companyId'],
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
