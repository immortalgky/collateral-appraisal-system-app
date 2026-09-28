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
}

export interface WebhookDeliveryFilters {
  status?: WebhookDeliveryStatus | '';
  subscriptionId?: string;
  eventType?: string;
  fromDate?: string;
  toDate?: string;
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
