import { describe, expect, it } from 'vitest';
import { isStandaloneQuotation } from './isStandaloneQuotation';

describe('isStandaloneQuotation', () => {
  it('is true for a quotation with no workflow instance', () => {
    expect(isStandaloneQuotation({ workflowInstanceId: null })).toBe(true);
    expect(isStandaloneQuotation({})).toBe(true);
  });

  it('is false for a quotation started from an appraisal task, even without a task execution id', () => {
    expect(
      isStandaloneQuotation({ workflowInstanceId: '8b0c2c3e-6f55-4f0c-9c3c-0d0d6a6a3a11' }),
    ).toBe(false);
  });
});
