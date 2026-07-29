import { describe, it, expect } from 'vitest';
import { getTypeIconName, typeToDetailEndpoint, typeToIconName } from './propertyTypeConfig';

describe('propertyTypeConfig icons', () => {
  // The original bug: typeToIconName was keyed by display names ('Machine', 'Vehicle')
  // while callers pass wire codes, so MAC/VEH/VES and all four lease codes fell
  // through to the generic 'building' glyph. This assertion is what would have
  // caught that drift, and catches it again when a new property type is added.
  it('covers exactly the same property type codes as typeToDetailEndpoint', () => {
    expect(Object.keys(typeToIconName).sort()).toEqual(Object.keys(typeToDetailEndpoint).sort());
  });

  it('resolves both wire codes and legacy display names', () => {
    expect(getTypeIconName('MAC')).toBe('gears');
    expect(getTypeIconName('Machine')).toBe('gears');
    expect(getTypeIconName('VEH')).toBe('car');
    expect(getTypeIconName('VES')).toBe('ship');
    expect(getTypeIconName('L')).toBe('earth-asia');
  });

  it('falls back to the generic glyph for an unknown type', () => {
    expect(getTypeIconName('NOPE')).toBe('building');
  });
});
