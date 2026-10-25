import type { WebhookDeliveryStatus } from '../types';

/** Badge tone of each delivery status. */
export const deliveryStatusTone = {
  Failed: 'red',
  Pending: 'yellow',
  Delivered: 'green',
} as const satisfies Record<WebhookDeliveryStatus, string>;
