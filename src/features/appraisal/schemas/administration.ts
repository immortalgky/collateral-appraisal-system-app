import { z } from 'zod';

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
  registrationNo: z.string(),
  contactPerson: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  rating: z.number(),
  activeAssignments: z.number(),
});

/**
 * Assignment form validation schema
 */
export const assignmentFormSchema = z
  .object({
    assignmentType: z.enum(['internal', 'external'], {
      required_error: 'Please select an assignment type',
    }),
    assignmentMethod: z.enum(['manual', 'roundRobin', 'quotation'], {
      required_error: 'Please select an assignment method',
    }),
    staffId: z.string().nullable(),
    companyId: z.string().nullable(),
    selectedStaff: internalStaffSchema.nullable(),
    selectedCompany: externalCompanySchema.nullable(),
    followupStaffId: z.string().nullable(),
    selectedFollowupStaff: internalStaffSchema.nullable(),
    remarks: z.string().max(500, 'Remarks must not exceed 500 characters'),
  })
  .refine(
    data => {
      // For manual selection, require either staffId or companyId based on type
      if (data.assignmentMethod === 'manual') {
        if (data.assignmentType === 'internal') {
          return data.staffId !== null && data.staffId.length > 0;
        } else {
          return data.companyId !== null && data.companyId.length > 0;
        }
      }
      // Round-robin and quotation don't require upfront selection
      return true;
    },
    {
      message: 'Please select an assignee',
      path: ['staffId'], // Will show on staffId field
    }
  )
  .refine(
    data => {
      // For external assignments, require followup staff
      if (data.assignmentType === 'external') {
        return data.followupStaffId !== null && data.followupStaffId.length > 0;
      }
      return true;
    },
    {
      message: 'Please select an internal followup staff',
      path: ['followupStaffId'],
    }
  );

export type AssignmentFormType = z.infer<typeof assignmentFormSchema>;

/**
 * Default values for the assignment form
 */
export const assignmentFormDefaults: AssignmentFormType = {
  assignmentType: 'internal',
  assignmentMethod: 'manual',
  staffId: null,
  companyId: null,
  selectedStaff: null,
  selectedCompany: null,
  followupStaffId: null,
  selectedFollowupStaff: null,
  remarks: '',
};
