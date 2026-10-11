import { describe, expect, it } from 'vitest';
import { hasDirtyFields } from './formDirty';

describe('hasDirtyFields', () => {
  it('is false for no dirty field, however the form state is shaped', () => {
    expect(hasDirtyFields({})).toBe(false);
    expect(hasDirtyFields(undefined)).toBe(false);
    expect(hasDirtyFields({ titles: [{}, undefined, { documents: false }] })).toBe(false);
  });

  it('is true for a dirty field at any depth, in an object or an array', () => {
    expect(hasDirtyFields({ purpose: true })).toBe(true);
    expect(hasDirtyFields({ detail: { address: { road: true } } })).toBe(true);
    expect(hasDirtyFields({ titles: [{}, { titleNumber: true }] })).toBe(true);
  });
});
