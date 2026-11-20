import { describe, expect, it } from 'vitest';
import { COLOR_SWATCH, RECOMMENDED_COLOR, recommendedColor } from './urbanPlanningColor';

describe('recommendedColor', () => {
  it.each([
    ['01', '01'],
    ['02', '02'],
    ['03', '03'],
    ['04', '04'],
    ['06', '05'],
    ['07', '07'],
    ['08', '06'],
    ['09', '09'],
    ['10', '08'],
  ])('planning type %s usually carries colour %s', (type, colour) => {
    expect(recommendedColor(type)).toBe(colour);
  });

  it('has none for type 05, an unknown type or no type', () => {
    expect(recommendedColor('05')).toBeUndefined();
    expect(recommendedColor('99')).toBeUndefined();
    expect(recommendedColor('')).toBeUndefined();
    expect(recommendedColor(null)).toBeUndefined();
  });

  it('only recommends colours that have a swatch (07 is drawn specially)', () => {
    for (const colour of Object.values(RECOMMENDED_COLOR))
      expect(colour === '07' || COLOR_SWATCH[colour]).toBeTruthy();
  });
});
