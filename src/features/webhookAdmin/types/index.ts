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
