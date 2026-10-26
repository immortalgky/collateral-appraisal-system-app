import { describe, expect, it } from 'vitest';
import { runLimited } from './runLimited';

describe('runLimited', () => {
  it('never has more than the limit in flight, and keeps the order of the results', async () => {
    let running = 0;
    let peak = 0;
    const task = (n: number) => async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise(resolve => setTimeout(resolve, 5));
      running--;
      return n;
    };
    const results = await runLimited([1, 2, 3, 4, 5, 6, 7].map(task), 3);
    expect(results).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(peak).toBe(3);
  });

  it('with no tasks, settles at once', async () => {
    expect(await runLimited([])).toEqual([]);
  });
});
