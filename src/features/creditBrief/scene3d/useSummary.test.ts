import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { BriefAsset } from '../api/appraisalBrief';
import type { SceneEnv } from './model';
import { useSummary } from './useSummary';

const hero = vi.hoisted(() => ({ fail: false }));
vi.mock('./heroModel', async importOriginal => {
  const real = await importOriginal<typeof import('./heroModel')>();
  return {
    ...real,
    buildHero: (...args: Parameters<typeof real.buildHero>) => {
      if (hero.fail) throw new Error('unreadable field');
      return real.buildHero(...args);
    },
  };
});

const env: SceneEnv = {
  t: (key, opts) => (opts ? `${key}${JSON.stringify(opts)}` : key),
  label: (group, code) => (code ? `${group}:${code}` : '—'),
  nf: n => String(n),
};
const assets = [
  { propertyType: 'L', areaRai: 1, areaNgan: 0, areaSquareWa: 0, landUseType: [] },
  { propertyType: 'VEH' },
  { propertyType: 'VEH' },
] as unknown as BriefAsset[];

describe('useSummary', () => {
  it('returns the same object across renders until an input changes', () => {
    hero.fail = false;
    const { result, rerender } = renderHook(() => useSummary(env, assets, null, undefined));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('degrades to a count per kind instead of throwing when the hero cannot be built', () => {
    hero.fail = true;
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useSummary(env, assets, null, undefined));
    // The failure is visible, not swallowed.
    expect(logged).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message: 'unreadable field' }),
    );
    logged.mockRestore();
    expect(result.current.hero).toMatchObject({
      title: 'hero.mixedTitle',
      tiles: [],
      figure: null,
    });
    expect(result.current.items.map(i => [i.title, i.key])).toEqual([
      ['PropertyType:L', 'values.itemsCount{"count":1,"n":"1"}'],
      ['PropertyType:VEH', 'values.itemsCount{"count":2,"n":"2"}'],
    ]);
    hero.fail = false;
  });
});
