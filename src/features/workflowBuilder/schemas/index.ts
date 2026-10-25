import { z } from 'zod';
import type { TFunction } from 'i18next';
import { tokenT, vmsg } from '@/shared/components/form/validationMessage';

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const startPropertiesSchema = z.object({}).passthrough();

export const taskPropertiesSchema = z
  .object({
    activityName: z.string().min(1, vmsg('workflowBuilder:validation.activityNameRequired')),
    assigneeRole: z.string().optional(),
    assigneeGroup: z.string().min(1, vmsg('workflowBuilder:validation.assigneeGroupRequired')),
    assignmentStrategies: z.string(),
    initialAssignmentStrategies: z.array(z.string()),
    revisitAssignmentStrategies: z.array(z.string()),
    timeoutDuration: z.string().min(1, vmsg('workflowBuilder:validation.timeoutRequired')),
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
    name: z.string().min(1, vmsg('workflowBuilder:validation.nameRequired')),
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
    name: z.string().min(1, vmsg('workflowBuilder:validation.nameRequired')),
    description: z.string(),
    category: z.string(),
    activities: z.array(activitySchema),
    transitions: z.array(transitionSchema),
    variables: z.record(z.string(), z.string()),
    metadata: workflowMetadataSchema,
  })
  .passthrough();

// Form schema factories (t-parameterised for i18n validation messages)

export const makeStartFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
  });

export const makeTaskFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    activityName: z.string().min(1, t('validation.activityNameRequired')),
    assigneeRole: z.string().optional(),
    assigneeGroup: z.string().min(1, t('validation.assigneeGroupRequired')),
    initialAssignmentStrategies: z.array(z.string()).min(1),
    revisitAssignmentStrategies: z.array(z.string()).min(1),
    timeoutDuration: z.string().min(1, t('validation.timeoutRequired')),
    decisionConditions: z.array(
      z.object({
        key: z.string().min(1, t('validation.decisionNameRequired')),
        value: z.string().min(1, t('validation.conditionRequired')),
      }),
    ),
    requiredRoles: z.array(z.string()),
    actions: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
        assignmentMode: z.enum(['system', 'user']),
        movement: z.enum(['F', 'B', 'C']),
        condition: z.string().optional(),
      }),
    ),
    canRaiseFollowup: z.boolean().optional(),
    canRaiseQuotation: z.boolean().optional(),
    teamIdVariable: z.string().optional(),
    teamConstrained: z.boolean().optional(),
    assigneeVariable: z.string().optional(),
    inputMappings: z.array(z.object({ key: z.string(), value: z.string() })),
  });

export const makeRoutingFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    routingConditions: z.array(
      z.object({
        key: z.string().min(1, t('validation.conditionNameRequired')),
        value: z.string().min(1, t('validation.conditionExpressionRequired')),
      }),
    ),
    defaultDecision: z.string(),
  });

export const makeEndFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    completionMessage: z.string(),
  });

export const makeCompanySelectionFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    selectionMethod: z.enum(['roundrobin', 'manual']),
    loanTypeVariable: z.string(),
  });

export const makeIfElseFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    condition: z.string().min(1, t('validation.conditionRequired')),
  });

export const makeSwitchFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    expression: z.string().min(1, t('validation.expressionRequired')),
    cases: z.array(z.string().min(1, t('validation.caseValueRequired'))),
  });

export const makeForkFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    branches: z.array(z.string().min(1, t('validation.branchNameRequired'))),
    forkType: z.enum(['parallel', 'inclusive']),
    maxConcurrency: z.coerce.number().min(0),
  });

export const makeJoinFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    forkId: z.string(),
    joinType: z.enum(['all', 'any', 'n_of_m']),
    timeoutMinutes: z.coerce.number().min(0),
    mergeStrategy: z.enum(['first', 'last', 'merge']),
    timeoutAction: z.enum(['continue', 'cancel', 'error']),
  });

export const makeDynamicPropertyFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
  });

export const makeTransitionFormSchema = () =>
  z.object({
    type: z.enum(['Normal', 'Conditional']),
    condition: z.string().nullable(),
  });

export const makeApprovalFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    activityName: z.string().optional(),
    memberSourceType: z.string().min(1, t('validation.memberSourceRequired')),
    valueExpression: z.string().optional(),
    thresholds: z.array(
      z.object({
        committeeCode: z.string(),
        maxValue: z.string(),
      }),
    ),
    quorumType: z.enum(['count', 'percent']),
    quorumValue: z.coerce.number().min(1),
    majorityType: z.enum(['count', 'percent']),
    majorityValue: z.coerce.number().min(1),
    voteOptions: z.array(z.string().min(1)),
    voteMovements: z.array(z.object({ key: z.string(), value: z.string() })),
    decisionConditions: z.array(z.object({ key: z.string(), value: z.string() })),
    timeoutDuration: z.string().min(1, t('validation.timeoutRequired2')),
  });

export const makeMeetingFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    meetingName: z.string(),
    notes: z.string(),
  });

export const makeAwaitSignalFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    signalName: z.string().min(1, t('validation.signalNameRequired')),
    correlationKey: z.string().min(1, t('validation.correlationKeyRequired')),
    completionVariable: z.string(),
  });

export const makeInternalFollowupSelectionFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
  });

export const makeRequestSubmissionActivityFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    propertyType: z.string().min(1, t('validation.propertyTypeRequired')),
    propertyAddress: z.string().min(1, t('validation.propertyAddressRequired')),
    estimatedValue: z.coerce.number().min(0),
    purpose: z.string().min(1, t('validation.purposeRequired')),
    requestorId: z.string(),
  });

export const makeAdminReviewActivityFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    reviewDeadline: z.string(),
    autoApprovalThreshold: z.coerce.number().min(0),
  });

export const makeTimerFormSchema = (t: TFunction<'workflowBuilder'>) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string(),
    duration: z.string().min(1, t('validation.durationRequired')),
    scheduledTime: z.string(),
    timerName: z.string(),
    allowEarlyCancellation: z.boolean(),
  });

// Static schemas (kept for the inferred types and for callers without a `t`). The factories above,
// built with the token `t`, so each message is the token of the same key.
const tokens = tokenT('workflowBuilder');

export const startFormSchema = makeStartFormSchema(tokens);
export const taskFormSchema = makeTaskFormSchema(tokens);
export const routingFormSchema = makeRoutingFormSchema(tokens);
export const endFormSchema = makeEndFormSchema(tokens);
export const companySelectionFormSchema = makeCompanySelectionFormSchema(tokens);
export const ifElseFormSchema = makeIfElseFormSchema(tokens);
export const switchFormSchema = makeSwitchFormSchema(tokens);
export const forkFormSchema = makeForkFormSchema(tokens);
export const joinFormSchema = makeJoinFormSchema(tokens);
export const dynamicPropertyFormSchema = makeDynamicPropertyFormSchema(tokens);
export const transitionFormSchema = makeTransitionFormSchema();
export const approvalFormSchema = makeApprovalFormSchema(tokens);
export const meetingFormSchema = makeMeetingFormSchema(tokens);
export const awaitSignalFormSchema = makeAwaitSignalFormSchema(tokens);
export const internalFollowupSelectionFormSchema = makeInternalFollowupSelectionFormSchema(tokens);
export const requestSubmissionActivityFormSchema = makeRequestSubmissionActivityFormSchema(tokens);
export const adminReviewActivityFormSchema = makeAdminReviewActivityFormSchema(tokens);
export const timerFormSchema = makeTimerFormSchema(tokens);

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
export type InternalFollowupSelectionFormValues = z.infer<
  typeof internalFollowupSelectionFormSchema
>;
export type RequestSubmissionActivityFormValues = z.infer<
  typeof requestSubmissionActivityFormSchema
>;
export type AdminReviewActivityFormValues = z.infer<typeof adminReviewActivityFormSchema>;
export type TimerFormValues = z.infer<typeof timerFormSchema>;
