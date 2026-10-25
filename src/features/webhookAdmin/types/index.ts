export type WebhookDeliveryStatus = 'Pending' | 'Delivered' | 'Failed';

export interface WebhookDeliveryListItem {
  id: string;
  subscriptionId: string;
  systemCode: string;
  eventType: string;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  lastStatusCode: number | null;
  lastError: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface WebhookDeliveryDetail extends WebhookDeliveryListItem {
  payload: string;
  /** Of the delivery's subscription. */
  callbackUrl: string;
  httpMethod: WebhookHttpMethod;
  authType: WebhookAuthType;
  /** Null = the subscription is a catch-all for its system. */
  subscriptionEventType: string | null;
}

export interface WebhookDeliveryFilters {
  status?: WebhookDeliveryStatus | '';
  subscriptionId?: string;
  /** Exact match (the failure-by-event chips). */
  eventType?: string;
  /** Exact match on the subscription's system code. */
  systemCode?: string;
  /** Event type contains it, or the delivery id equals it. */
  search?: string;
  fromDate?: string;
  toDate?: string;
}

/** The list filters without the status, which the summary counts per tab. */
export type WebhookDeliverySummaryParams = Omit<
  WebhookDeliveryFilters,
  'status' | 'subscriptionId'
>;

export interface WebhookDeliverySummary {
  total: number;
  pending: number;
  delivered: number;
  failed: number;
  /** Null when nothing is pending. */
  oldestPending: {
    /** Null in the corner case where rows are pending but none has a CreatedAt. */
    createdAt: string | null;
    /** Pending rows that were never attempted. */
    neverAttemptedCount: number;
    bySystem: { systemCode: string; count: number }[];
  } | null;
  failedByEventType: { eventType: string; count: number }[];
  /** Top 3 by count. */
  failedByCause: {
    systemCode: string;
    lastStatusCode: number | null;
    httpMethod: WebhookHttpMethod;
    callbackUrl: string;
    count: number;
  }[];
}

export interface WebhookDeliveryListResult {
  items: WebhookDeliveryListItem[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetWebhookDeliveriesParams extends WebhookDeliveryFilters {
  pageNumber?: number;
  pageSize?: number;
}

// ─── Webhook Subscriptions ────────────────────────────────────────────────────

export type WebhookAuthType = 'HMAC' | 'TokenBearer';
export type WebhookHttpMethod = 'POST' | 'PUT';
export type WebhookSecretField = 'SecretKey' | 'ClientSecret';

export interface WebhookSubscription {
  id: string;
  systemCode: string;
  /** Null = catch-all (every event for the system code). */
  eventType: string | null;
  callbackUrl: string;
  httpMethod: WebhookHttpMethod;
  authType: WebhookAuthType;
  tokenEndpoint: string | null;
  clientId: string | null;
  /** Secrets are stored encrypted and never returned — only whether one is set. */
  hasSecretKey: boolean;
  hasClientSecret: boolean;
  /** False for a secret saved before encryption — re-enter it to encrypt. */
  secretKeyEncrypted: boolean;
  clientSecretEncrypted: boolean;
  isActive: boolean;
  lastDeliveryAt: string | null;
  createdAt: string | null;
}

export interface WebhookSubscriptionListResult {
  items: WebhookSubscription[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetWebhookSubscriptionsParams {
  pageNumber?: number;
  pageSize?: number;
  systemCode?: string;
  isActive?: boolean;
}

interface WebhookConnectionFields {
  callbackUrl: string;
  httpMethod: WebhookHttpMethod;
  authType: WebhookAuthType;
  tokenEndpoint?: string;
  clientId?: string;
}

export interface CreateWebhookSubscriptionRequest extends WebhookConnectionFields {
  systemCode: string;
  eventType?: string;
  secretKey?: string;
  clientSecret?: string;
}

export interface UpdateWebhookSubscriptionRequest extends WebhookConnectionFields {
  /** Only sent when setting/replacing a secret; omitted leaves the stored one unchanged. */
  secretKey?: string;
  clientSecret?: string;
}
