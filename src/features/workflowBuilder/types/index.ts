export const ActivityType = {
  START: 'StartActivity',
  END: 'EndActivity',
  TASK: 'TaskActivity',
  ROUTING: 'RoutingActivity',
  COMPANY_SELECTION: 'CompanySelectionActivity',
  IF_ELSE: 'IfElseActivity',
  SWITCH: 'SwitchActivity',
  FORK: 'ForkActivity',
  JOIN: 'JoinActivity',
  REQUEST_SUBMISSION: 'RequestSubmission',
  ADMIN_REVIEW: 'AdminReview',
} as const;

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const TransitionType = {
  NORMAL: 'Normal',
  CONDITIONAL: 'Conditional',
} as const;

export type TransitionType = (typeof TransitionType)[keyof typeof TransitionType];

export const AssignmentStrategy = {
  STARTED_BY: 'started_by',
  ROUND_ROBIN: 'round_robin',
  PREVIOUS_OWNER: 'previous_owner',
  RANDOM: 'random',
  WORKLOAD_BASED: 'workload_based',
  SUPERVISOR: 'supervisor',
  MANUAL: 'manual',
  TEAM_CONSTRAINED: 'team_constrained',
} as const;

export type AssignmentStrategy =
  (typeof AssignmentStrategy)[keyof typeof AssignmentStrategy];

export const VersionStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'Published',
  DEPRECATED: 'Deprecated',
  ARCHIVED: 'Archived',
} as const;

export type VersionStatus = (typeof VersionStatus)[keyof typeof VersionStatus];

export interface Position {
  x: number;
  y: number;
}

// Type-specific properties

export interface StartProperties {
  [key: string]: unknown;
}

export interface TaskProperties {
  activityName: string;
  assigneeRole: string;
  assigneeGroup: string;
  assignmentStrategies: string;
  initialAssignmentStrategies: string[];
  revisitAssignmentStrategies: string[];
  timeoutDuration: string;
  decisionConditions: Record<string, string>;
}

export interface RoutingProperties {
  routingConditions: Record<string, string>;
  defaultDecision: string;
}

export interface CompanySelectionProperties {
  selectionMethod: 'roundrobin' | 'manual';
  loanTypeVariable: string;
}

export interface IfElseProperties {
  condition: string;
}

export interface SwitchProperties {
  expression: string;
  cases: Record<string, string>;
}

export interface ForkProperties {
  branches: string[];
  forkType: 'parallel' | 'inclusive';
  maxConcurrency: number;
}

export interface JoinProperties {
  forkId: string;
  joinType: 'all' | 'any' | 'n_of_m';
  timeoutMinutes: number;
  mergeStrategy: 'first' | 'last' | 'merge';
  timeoutAction: 'continue' | 'cancel' | 'error';
}

export interface EndProperties {
  completionMessage: string;
}

export interface GenericProperties {
  [key: string]: unknown;
}

export type ActivityProperties =
  | StartProperties
  | TaskProperties
  | RoutingProperties
  | CompanySelectionProperties
  | IfElseProperties
  | SwitchProperties
  | ForkProperties
  | JoinProperties
  | EndProperties
  | GenericProperties;

export interface Activity {
  id: string;
  name: string;
  type: ActivityType | string;
  description: string;
  properties: ActivityProperties;
  position: Position;
  requiredRoles: string[];
  isStartActivity: boolean;
  isEndActivity: boolean;
}

export interface Transition {
  id: string;
  from: string;
  to: string;
  condition: string | null;
  properties: Record<string, unknown>;
  type: TransitionType;
}

export interface WorkflowMetadata {
  author: string;
  createdDate: string;
  version: string;
  tags: string[];
  customProperties: Record<string, unknown>;
}

export interface WorkflowSchema {
  id: string;
  name: string;
  description: string;
  category: string;
  activities: Activity[];
  transitions: Transition[];
  variables: Record<string, string>;
  metadata: WorkflowMetadata;
}

// Backend API response types

export interface WorkflowDefinitionSummary {
  id: string;
  name: string;
  description: string;
  version: number;
  isActive: boolean;
  category: string;
  createdOn: string;
  createdBy: string;
}

export interface WorkflowDefinitionVersion {
  id: string;
  definitionId: string;
  version: number;
  name: string;
  description: string;
  status: VersionStatus;
  category: string;
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string | null;
  createdBy: string;
  jsonSchema?: string;
}

export interface ActivityTypeDefinition {
  type: string;
  name: string;
  description: string;
  category: string;
  properties: ActivityPropertyDefinition[];
  icon: string;
  color: string;
}

export interface ActivityPropertyDefinition {
  name: string;
  displayName: string;
  type: string;
  required: boolean;
  defaultValue: string | null;
  description: string | null;
  options: string[] | null;
}

// Legacy type kept for backward compatibility
export interface WorkflowDefinition {
  name: string;
  description: string;
  category: string;
  createdBy: string;
  workflowSchema: WorkflowSchema;
}

// === Versioning & Migration types ===

export type BreakingChangeType =
  | 'ActivityRemoved'
  | 'PropertyChanged'
  | 'TransitionRemoved';

export type ChangeImpact = 'Low' | 'Medium' | 'High' | 'Critical';

export interface BreakingChange {
  type: BreakingChangeType;
  description: string;
  affectedComponent: string;
  impact: ChangeImpact;
  migrationData?: Record<string, unknown>;
}

export type InstanceImpact = 'Safe' | 'Unsafe';

export interface InstanceClassification {
  instanceId: string;
  currentActivityId: string;
  startedOn: string;
  classification: InstanceImpact;
}

export interface PublishImpactReport {
  breakingChanges: BreakingChange[];
  breakingChangeHash: string;
  safeCount: number;
  unsafeCount: number;
  sample: InstanceClassification[];
}

export interface PublishVersionResponse {
  isSuccess: boolean;
  version: number;
  versionId: string;
  errorMessage: string | null;
  impactReport: PublishImpactReport;
}

export interface RunningInstanceSummary {
  id: string;
  name: string;
  currentActivityId: string;
  startedOn: string;
  workflowDefinitionVersionId: string;
  status: string;
}

export interface MigrateInstancesRequest {
  targetVersionId: string;
  safeInstanceIds: string[];
  manualRemaps: Record<string, string>; // instanceId → new currentActivityId
  migratedBy: string;
}

export interface MigrateInstancesResult {
  migratedCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{ instanceId: string; message: string }>;
}

export type MigrationAction =
  | { kind: 'skip' }
  | { kind: 'bump' }
  | { kind: 'remap'; newActivityId: string };

// === Default properties factories ===

export function createDefaultTaskProperties(): TaskProperties {
  return {
    activityName: '',
    assigneeRole: '',
    assigneeGroup: '',
    assignmentStrategies: 'round_robin',
    initialAssignmentStrategies: ['round_robin'],
    revisitAssignmentStrategies: ['previous_owner'],
    timeoutDuration: 'PT72H',
    decisionConditions: {},
  };
}

export function createDefaultRoutingProperties(): RoutingProperties {
  return {
    routingConditions: {},
    defaultDecision: '',
  };
}

export function createDefaultCompanySelectionProperties(): CompanySelectionProperties {
  return {
    selectionMethod: 'roundrobin',
    loanTypeVariable: 'loanType',
  };
}

export function createDefaultIfElseProperties(): IfElseProperties {
  return {
    condition: '',
  };
}

export function createDefaultSwitchProperties(): SwitchProperties {
  return {
    expression: '',
    cases: {},
  };
}

export function createDefaultForkProperties(): ForkProperties {
  return {
    branches: [],
    forkType: 'parallel',
    maxConcurrency: 0,
  };
}

export function createDefaultJoinProperties(): JoinProperties {
  return {
    forkId: '',
    joinType: 'all',
    timeoutMinutes: 0,
    mergeStrategy: 'merge',
    timeoutAction: 'continue',
  };
}

export function createDefaultEndProperties(): EndProperties {
  return {
    completionMessage: '',
  };
}

export function createDefaultPropertiesForType(
  type: ActivityType | string,
): ActivityProperties {
  switch (type) {
    case ActivityType.START:
      return {};
    case ActivityType.TASK:
      return createDefaultTaskProperties();
    case ActivityType.ROUTING:
      return createDefaultRoutingProperties();
    case ActivityType.COMPANY_SELECTION:
      return createDefaultCompanySelectionProperties();
    case ActivityType.IF_ELSE:
      return createDefaultIfElseProperties();
    case ActivityType.SWITCH:
      return createDefaultSwitchProperties();
    case ActivityType.FORK:
      return createDefaultForkProperties();
    case ActivityType.JOIN:
      return createDefaultJoinProperties();
    case ActivityType.END:
      return createDefaultEndProperties();
    default:
      return {};
  }
}
