import { describe, it, expect } from 'vitest';
import { isFormLayout } from './formLayoutConstants';

describe('form layout preference', () => {
  it('accepts the two layouts and nothing else', () => {
    for (const value of ['grid', 'classic']) expect(isFormLayout(value)).toBe(true);
    for (const value of ['compact', 'Grid', '', null, undefined, 1])
      expect(isFormLayout(value)).toBe(false);
  });
});
