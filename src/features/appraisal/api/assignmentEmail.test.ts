import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { historyPollInterval } from './assignmentEmail';

const failed = (status?: number) =>
  new AxiosError('x', undefined, undefined, undefined, status ? ({ status } as never) : undefined);

describe('historyPollInterval', () => {
  it('polls while the latest email waits, and stops once it is settled', () => {
    expect(historyPollInterval('Queued', null, 0)).toBe(15_000);
    expect(historyPollInterval('Pending', null, 0)).toBe(60_000);
    expect(historyPollInterval('Sent', null, 0)).toBe(false);
    expect(historyPollInterval(undefined, null, 0)).toBe(false);
  });

  it('keeps polling after a network or 5xx failure, backing off up to 5 minutes', () => {
    expect(historyPollInterval('Queued', failed(), 0)).toBe(15_000);
    expect(historyPollInterval('Queued', failed(503), 1)).toBe(30_000);
    expect(historyPollInterval('Queued', failed(500), 3)).toBe(120_000);
    expect(historyPollInterval('Pending', failed(500), 5)).toBe(300_000);
    expect(historyPollInterval('Queued', failed(429), 0)).toBe(15_000);
  });

  it('stops for a refusal that polling cannot change', () => {
    expect(historyPollInterval('Queued', failed(403), 0)).toBe(false);
    expect(historyPollInterval('Pending', failed(404), 0)).toBe(false);
  });
});
