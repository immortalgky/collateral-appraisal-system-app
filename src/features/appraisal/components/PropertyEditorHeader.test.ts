import { describe, expect, it } from 'vitest';
import type { PropertyGroup } from '../types';
import { findProperty } from './PropertyEditorHeader';

const groups = [
  { id: 'g1', name: 'Group 1', items: [{ id: 'c2be433e-f36b-1410-8973-006f4f934fe1' }] },
] as unknown as PropertyGroup[];

describe('findProperty', () => {
  it('finds a property whichever case the id is written in', () => {
    const lower = findProperty(groups, 'c2be433e-f36b-1410-8973-006f4f934fe1');
    const upper = findProperty(groups, 'C2BE433E-F36B-1410-8973-006F4F934FE1');
    expect(lower?.group.name).toBe('Group 1');
    expect(upper?.item).toBe(lower?.item);
  });

  it('is null for no id or an unknown one', () => {
    expect(findProperty(groups, undefined)).toBeNull();
    expect(findProperty(groups, 'other')).toBeNull();
  });
});
