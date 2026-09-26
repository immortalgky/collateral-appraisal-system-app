import { describe, it, expect } from 'vitest';
import {
  getPropertyHref,
  getTypeIconName,
  typeToDetailEndpoint,
  typeToIconName,
} from './propertyTypeConfig';

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

describe('getPropertyHref', () => {
  it('builds the property page route from the type code', () => {
    expect(getPropertyHref('/appraisals/a1', 'L', 'p1')).toBe('/appraisals/a1/property/land/p1');
  });

  // BuildingCostTable passes propertyType through as-is, which may be a display name.
  it('accepts a display name and a lease code too', () => {
    expect(getPropertyHref('/appraisals/a1', 'Land and building', 'p1')).toBe(
      '/appraisals/a1/property/land-building/p1',
    );
    expect(getPropertyHref('/appraisals/a1', 'LSL', 'p1')).toBe(
      '/appraisals/a1/property/lease-land/p1',
    );
  });

  // Callers render plain text on undefined — a partial URL would be a dead link.
  it.each([
    ['no base path', '', 'L', 'p1'],
    ['no type', '/appraisals/a1', undefined, 'p1'],
    ['unknown type', '/appraisals/a1', 'NOPE', 'p1'],
    ['no id', '/appraisals/a1', 'L', undefined],
  ])('is undefined with %s', (_, basePath, type, id) => {
    expect(getPropertyHref(basePath, type, id)).toBeUndefined();
  });
});
