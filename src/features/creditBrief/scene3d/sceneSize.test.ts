import { describe, expect, it } from 'vitest';
import {
  SCENE_HEIGHT,
  SCENE_HEIGHT_COMPACT,
  SCENE_HEIGHT_COMPACT_PX,
  SCENE_HEIGHT_PX,
} from './sceneSize';

describe('scene height', () => {
  it('is a class of the stylesheet, and the pixel stand-in lies in its range', () => {
    expect(SCENE_HEIGHT).toBe('cs3d-h');
    expect(SCENE_HEIGHT_PX).toBeGreaterThanOrEqual(460);
    expect(SCENE_HEIGHT_PX).toBeLessThanOrEqual(620);
  });

  it('has one value for the compact view too, as the Tailwind class and as pixels', () => {
    expect(SCENE_HEIGHT_COMPACT).toBe(`h-[${SCENE_HEIGHT_COMPACT_PX}px]`);
  });
});
