import { z } from 'zod';

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const startPropertiesSchema = z.object({}).passthrough();

export const taskPropertiesSchema = z
  .object({
    activityName: z.string().min(1, 'Activity name is required'),
    assigneeRole: z.string().optional(),
    assigneeGroup: z.string().min(1, 'Assignee group is required'),
    assignmentStrategies: z.string(),
    initialAssignmentStrategies: z.array(z.string()),
    revisitAssignmentStrategies: z.array(z.string()),
    timeoutDuration: z.string().min(1, 'Timeout is required'),
    decisionConditions: z.record(z.string(), z.string()),
  })
  .passthrough();

export const routingPropertiesSchema = z
  .object({
    routingConditions: z.record(z.string(), z.string()),
    defaultDecision: z.string(),
  })
  .passthrough();

export const endPropertiesSchema = z
  .object({
    completionMessage: z.string(),
  })
  .passthrough();

export const activitySchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, 'Name is required'),
    type: z.string(),
    description: z.string(),
    properties: z.union([
      startPropertiesSchema,
      taskPropertiesSchema,
      routingPropertiesSchema,
      endPropertiesSchema,
    ]),
    position: positionSchema,
    requiredRoles: z.array(z.string()),
    isStartActivity: z.boolean(),
    isEndActivity: z.boolean(),
  })
  .passthrough();

export const transitionSchema = z
  .object({
    id: z.string(),
    from: z.string(),
    to: z.string(),
    condition: z.string().nullable(),
    properties: z.record(z.string(), z.unknown()),
    type: z.enum(['Normal', 'Conditional']),
  })
  .passthrough();

export const workflowMetadataSchema = z
  .object({
    author: z.string(),
    createdDate: z.string(),
    version: z.string(),
    tags: z.array(z.string()),
    customProperties: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const workflowSchemaSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, 'Workflow name is required'),
    description: z.string(),
    category: z.string(),
    activities: z.array(activitySchema),
    transitions: z.array(transitionSchema),
    variables: z.record(z.string(), z.string()),
    metadata: workflowMetadataSchema,
  })
  .passthrough();

// Form schemas for property panels

export const startFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
});

export const taskFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  activityName: z.string().min(1, 'Activity name is required'),
  assigneeRole: z.string().min(1, 'Assignee role is required'),
  assigneeGroup: z.string().min(1, 'Assignee group is required'),
  initialAssignmentStrategies: z.array(z.string()).min(1),
  revisitAssignmentStrategies: z.array(z.string()).min(1),
  timeoutDuration: z.string().min(1, 'Timeout is required'),
  decisionConditions: z.array(
    z.object({
      key: z.string().min(1, 'Decision name is required'),
      value: z.string().min(1, 'Condition is required'),
    }),
  ),
  requiredRoles: z.array(z.string()),
});

export const routingFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  routingConditions: z.array(
    z.object({
      key: z.string().min(1, 'Condition name is required'),
      value: z.string().min(1, 'Condition expression is required'),
    }),
  ),
  defaultDecision: z.string(),
});

export const endFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  completionMessage: z.string(),
});

export const companySelectionFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  selectionMethod: z.enum(['roundrobin', 'manual']),
  loanTypeVariable: z.string(),
});

export const ifElseFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  condition: z.string().min(1, 'Condition is required'),
});

export const switchFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  expression: z.string().min(1, 'Expression is required'),
  cases: z.array(z.string().min(1, 'Case value is required')),
});

export const forkFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  branches: z.array(z.string().min(1, 'Branch name is required')),
  forkType: z.enum(['parallel', 'inclusive']),
  maxConcurrency: z.coerce.number().min(0),
});

export const joinFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  forkId: z.string(),
  joinType: z.enum(['all', 'any', 'n_of_m']),
  timeoutMinutes: z.coerce.number().min(0),
  mergeStrategy: z.enum(['first', 'last', 'merge']),
  timeoutAction: z.enum(['continue', 'cancel', 'error']),
});

export const dynamicPropertyFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
});

export const transitionFormSchema = z.object({
  type: z.enum(['Normal', 'Conditional']),
  condition: z.string().nullable(),
});

// Phase 2 form schemas

export const approvalFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  memberSourceType: z.string().min(1, 'Member source type is required'),
  quorumType: z.enum(['count', 'percent']),
  quorumValue: z.coerce.number().min(1),
  majorityType: z.enum(['count', 'percent']),
  majorityValue: z.coerce.number().min(1),
  voteOptions: z.array(z.string().min(1)),
  decisionConditions: z.array(z.object({ key: z.string(), value: z.string() })),
  timeoutDuration: z.string().min(1, 'Timeout is required'),
});

export const meetingFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  meetingName: z.string(),
  notes: z.string(),
});

export const awaitSignalFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  signalName: z.string().min(1, 'Signal name is required'),
  correlationKey: z.string().min(1, 'Correlation key is required'),
  completionVariable: z.string(),
});

export const internalFollowupSelectionFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
});

export const requestSubmissionActivityFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  propertyType: z.string().min(1, 'Property type is required'),
  propertyAddress: z.string().min(1, 'Property address is required'),
  estimatedValue: z.coerce.number().min(0),
  purpose: z.string().min(1, 'Purpose is required'),
  requestorId: z.string(),
});

export const adminReviewActivityFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  reviewDeadline: z.string(),
  autoApprovalThreshold: z.coerce.number().min(0),
});

export const timerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  duration: z.string().min(1, 'Duration is required'),
  scheduledTime: z.string(),
  timerName: z.string(),
  allowEarlyCancellation: z.boolean(),
});

export type StartFormValues = z.infer<typeof startFormSchema>;
export type TaskFormValues = z.infer<typeof taskFormSchema>;
export type RoutingFormValues = z.infer<typeof routingFormSchema>;
export type EndFormValues = z.infer<typeof endFormSchema>;
export type CompanySelectionFormValues = z.infer<typeof companySelectionFormSchema>;
export type IfElseFormValues = z.infer<typeof ifElseFormSchema>;
export type SwitchFormValues = z.infer<typeof switchFormSchema>;
export type ForkFormValues = z.infer<typeof forkFormSchema>;
export type JoinFormValues = z.infer<typeof joinFormSchema>;
export type DynamicPropertyFormValues = z.infer<typeof dynamicPropertyFormSchema>;
export type TransitionFormValues = z.infer<typeof transitionFormSchema>;
export type ApprovalFormValues = z.infer<typeof approvalFormSchema>;
export type MeetingFormValues = z.infer<typeof meetingFormSchema>;
export type AwaitSignalFormValues = z.infer<typeof awaitSignalFormSchema>;
export type InternalFollowupSelectionFormValues = z.infer<typeof internalFollowupSelectionFormSchema>;
export type RequestSubmissionActivityFormValues = z.infer<typeof requestSubmissionActivityFormSchema>;
export type AdminReviewActivityFormValues = z.infer<typeof adminReviewActivityFormSchema>;
export type TimerFormValues = z.infer<typeof timerFormSchema>;
