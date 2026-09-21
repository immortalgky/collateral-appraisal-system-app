import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { getPropertyIcon, typeToBase, typeToDetailEndpoint } from './propertyTypeConfig';

/** Symbol ids actually present in our own sprite. */
const spriteIds = new Set(
  [
    ...readFileSync(join(process.cwd(), 'public/icons/property.svg'), 'utf8').matchAll(
      /id="([^"]+)"/g,
    ),
  ].map(m => m[1]),
);

describe('property type icons', () => {
  it('resolves every property type', () => {
    for (const code of Object.keys(typeToDetailEndpoint)) {
      const icon = getPropertyIcon(code);
      expect(icon.name, code).toBeTruthy();
      expect(['property', 'solid'], code).toContain(icon.style);
    }
  });

  // `<use>` pointing at a symbol id that does not exist renders nothing and throws nothing, so a
  // typo here would only ever show up as a blank square someone eventually notices.
  it('only names symbols that exist in property.svg', () => {
    for (const code of Object.keys(typeToDetailEndpoint)) {
      const icon = getPropertyIcon(code);
      if (icon.style === 'property') expect(spriteIds, code).toContain(icon.name);
    }
  });

  // The bug this is here to stop: Font Awesome had `house` for a building and `house-chimney`
  // for a land-and-building — two houses differing by a chimney, indistinguishable at 16px.
  it('draws the four base kinds differently from each other', () => {
    const names = ['L', 'B', 'LB', 'U'].map(c => getPropertyIcon(c).name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('gives a lease type the same drawing as its freehold twin', () => {
    for (const [lease, freehold] of [
      ['LSL', 'L'],
      ['LSB', 'B'],
      ['LS', 'LB'],
      ['LSU', 'U'],
    ]) {
      expect(getPropertyIcon(lease), lease).toEqual(getPropertyIcon(freehold));
      expect(typeToBase[lease], lease).toBe(typeToBase[freehold]);
    }
  });

  // Machinery, vehicles and vessels were never the problem — they stay on Font Awesome.
  it('leaves machinery, vehicles and vessels on Font Awesome', () => {
    expect(getPropertyIcon('MAC')).toEqual({ style: 'solid', name: 'gears' });
    expect(getPropertyIcon('VEH')).toEqual({ style: 'solid', name: 'car' });
    expect(getPropertyIcon('VES')).toEqual({ style: 'solid', name: 'ship' });
  });

  it('accepts legacy display names as well as wire codes', () => {
    expect(getPropertyIcon('Machine')).toEqual(getPropertyIcon('MAC'));
    expect(getPropertyIcon('Lands')).toEqual(getPropertyIcon('L'));
  });
});
