// Wire contract: docs/failed-messages/api-contract.md (API repo).
// Nulls are omitted from JSON (DefaultIgnoreCondition = WhenWritingNull), so every field the
// contract marks nullable/absent is an optional property here — never `T | null`.

export type FailedMessageStatus = 'Pending' | 'RetryRequested' | 'Retried' | 'Discarded';
export type FailedMessageStatusFilter = FailedMessageStatus | 'All';
export type FailedMessageKind = 'Error' | 'Skipped';

// refType/outbox module are the two lowercase exceptions to the otherwise-PascalCase enum convention.
export type RefType = 'appraisal' | 'request' | 'quotation' | 'meeting' | 'document';

export type ManagementStatus = 'Ok' | 'Unauthorized' | 'Unreachable';

export type OutboxModule =
  | 'request'
  | 'appraisal'
  | 'document'
  | 'workflow'
  | 'collateral'
  | 'reporting';
export const OUTBOX_MODULES: readonly OutboxModule[] = [
  'request',
  'appraisal',
  'document',
  'workflow',
  'collateral',
  'reporting',
];

export type OutboxStatus = 'Pending' | 'Processing' | 'Processed' | 'Failed';
export type OutboxStatusFilter = 'Failed' | 'Stuck' | 'Resent' | 'All';

export interface PaginatedResult<T> {
  items: T[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface QueueHealth {
  name: string;
  // Absent (not zero) when the collector has no broker snapshot row for this queue at all.
  ready?: number;
  unacked?: number;
  consumers?: number;
  publishRate?: number;
  deliverRate?: number;
  samples: number[];
  errorCount: number;
  skippedCount: number;
  isOrdered: boolean;
}

export interface NodeHealth {
  node: string;
  // Both omitted together — a node can have a Pending FailedMessage but no BrokerSnapshot row yet,
  // in which case its `queues` also carry only name/errorCount/skippedCount/samples/isOrdered.
  collectedAt?: string;
  managementStatus?: ManagementStatus;
  lastError?: string;
  queues: QueueHealth[];
}

export interface TopGroup {
  queue: string;
  exceptionType: string;
  count: number;
}

export interface FailedMessagesSummary {
  // Zone-less Bangkok local, like every other timestamp — the server's clock at the moment this
  // summary was built. Used (with `dataUpdatedAt`) to derive an "now" that never drifts against a
  // skewed or differently-zoned browser clock; see `serverOffsetMs`/`serverClock` in utils/queueHealth.ts.
  serverTime: string;
  pendingCount: number;
  oldestPendingAt?: string;
  last24h: { total: number; retried: number; discarded: number };
  topGroups: TopGroup[];
  outboxFailedCount: number;
  outboxStuckCount: number;
  nodes: NodeHealth[];
}

export interface FailedMessageListItem {
  id: string;
  node: string;
  sourceQueue: string;
  kind: FailedMessageKind;
  status: FailedMessageStatus;
  messageId?: string;
  messageType?: string;
  consumerType?: string;
  // Never absent: the collector stores the literal 'Skipped' for a row from a `_skipped` queue (no
  // exception happened) — render it via exceptionTypeLabel, not raw.
  exceptionType: string;
  exceptionMessage?: string;
  retryCount: number;
  faultedAt: string;
  collectedAt: string;
  refType?: RefType;
  refId?: string;
  refNumber?: string;
  isOrderedQueue: boolean;
  isNonTransient: boolean;
  siblingCount: number;
  // Present only once status leaves Pending.
  actionBy?: string;
  actionAt?: string;
  // Present only while still Pending and within the 5-minute post-fault window a same-MessageId
  // retry would otherwise be skipped for (`TooSoon`); absent once the window has passed.
  retryAvailableAt?: string;
}

export interface FailedMessageSibling {
  id: string;
  sourceQueue: string;
  kind: FailedMessageKind;
  status: FailedMessageStatus;
  faultedAt: string;
}

export interface FailedMessageHistoryEntry {
  // Kept as `string` (not a union) so an unknown future action still renders instead of failing types.
  // Includes `RetryFailed` — a server-generated entry (no actor) when a retry couldn't be delivered.
  action: string;
  // Absent for server-generated entries (e.g. `RetryFailed`) — no human actor to attribute it to.
  actorCode?: string;
  at: string;
  reason?: string;
}

export type FailedMessageDetail = Omit<FailedMessageListItem, 'siblingCount'> & {
  conversationId?: string;
  contentType?: string;
  headers?: Record<string, string>;
  body: string;
  // Absent when the fault had no stack trace (Skipped rows never do).
  stackTrace?: string;
  actionReason?: string;
  siblings: FailedMessageSibling[];
  history: FailedMessageHistoryEntry[];
};

export interface BulkActionSkipped {
  id: string;
  // `TooSoon` — retry only. `Publishing` — discard only (a RetryRequested row the collector has
  // claimed and is publishing right now); see api-contract.md's 2026-09-29 changelog.
  reason: 'NotFound' | 'NotPending' | 'TooSoon' | 'Publishing';
  by?: string;
  at?: string;
}

export interface BulkActionResult {
  accepted: string[];
  skipped: BulkActionSkipped[];
}

// Backend's machine-readable failure kind; not the FE's `OutboxFailureClass` (queueHealth.ts).
export type OutboxBackendFailureClass = 'Disallowed' | 'Unresolvable' | 'Deserialization';

export interface OutboxListItem {
  module: OutboxModule;
  id: string;
  eventType: string;
  correlationId?: string;
  occurredAt: string;
  processingStartedAt?: string;
  processedAt?: string;
  error?: string;
  retryCount: number;
  status: OutboxStatus;
  refType?: RefType;
  refId?: string;
  refNumber?: string;
  // Null = unknown: Processed history older than the 7-day retention has been purged, so
  // "was a newer event already sent?" can't be answered. Never read it as 0.
  // Required-nullable, unlike the header's optional-not-null rule: the API always serialises it.
  newerSentCount: number | null;
  typeResolvable: boolean;
  // Why the backend failed the row, or null (transient/unclassified). Always serialised, so null arrives explicitly.
  failureClass: OutboxBackendFailureClass | null;
}

export type OutboxDetail = OutboxListItem & {
  payload: string;
  headers?: Record<string, string>;
};

export interface OutboxItemRef {
  module: OutboxModule;
  id: string;
}

export interface OutboxResendResult {
  accepted: OutboxItemRef[];
  skipped: (OutboxItemRef & { reason: 'NotFound' | 'NotFailed' | 'UnknownModule' })[];
}

export interface GetFailedMessagesParams {
  status?: FailedMessageStatusFilter;
  queue?: string;
  node?: string;
  exceptionType?: string;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetOutboxMessagesParams {
  status?: OutboxStatusFilter;
  module?: OutboxModule;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}
