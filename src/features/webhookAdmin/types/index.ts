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

export interface WebhookSubscription {
  id: string;
  systemCode: string;
  callbackUrl: string;
  isActive: boolean;
  /** Last 4 chars of the shared HMAC secret — the full secret is never returned. */
  secretLast4: string | null;
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

export interface CreateWebhookSubscriptionRequest {
  systemCode: string;
  callbackUrl: string;
  secretKey: string;
}

export interface UpdateWebhookSubscriptionRequest {
  callbackUrl: string;
  /** Only sent when replacing the shared secret; omitted leaves it unchanged. */
  secretKey?: string;
}
