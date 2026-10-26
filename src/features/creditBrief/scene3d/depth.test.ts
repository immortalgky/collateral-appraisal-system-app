import { describe, expect, it } from 'vitest';
import { canZoomTo, depthPlanes, fitDistance, ZOOM_IN, zoomOutCap } from './depth';

const FOV = (30 * Math.PI) / 180; // the engine's camera
const POLAR = [0.1, 0.8, 1.38]; // from the vertical; 1.38 is the orbit's limit

/** View depth where the bottom frustum edge (fov/2 below the view direction) meets the ground y = 0. */
function groundDepth(dist: number, polar: number) {
  const height = dist * Math.cos(polar);
  const below = Math.PI / 2 - polar + FOV / 2; // angle of that edge below the horizontal
  return (height / Math.sin(below)) * Math.cos(FOV / 2);
}

/** Distance from the camera to the scene's box (x, z within +-extent of the target, y from 0 to extent). */
function nearestBoxPoint(dist: number, polar: number, extent: number) {
  const x = dist * Math.sin(polar);
  const y = dist * Math.cos(polar);
  return Math.hypot(Math.max(-extent - x, 0, x - extent), Math.max(-y, 0, y - extent));
}

// An ordinary scene (the subject fills it) and a 12 m house on a parcel of 200 m extent.
/** The closest distance + can reach from the framing distance, by pressing it while the real rule allows. */
function closestReachable(fit: number, frameRadius: number) {
  let d = fit;
  while (canZoomTo(d * ZOOM_IN, frameRadius)) d *= ZOOM_IN;
  return d;
}

const SCENES = [
  { name: 'ordinary scene', frame: 25, extent: 25 },
  { name: 'small house on a large parcel', frame: 15, extent: 200 },
];

describe('depthPlanes', () => {
  it.each(SCENES)('keeps the ground and the scene past near at the zoom cap: $name', s => {
    const dist = zoomOutCap(s.frame, s.extent);
    const { near } = depthPlanes(dist, s.extent);
    for (const polar of POLAR) {
      expect(near).toBeLessThan(groundDepth(dist, polar));
      expect(near).toBeLessThan(nearestBoxPoint(dist, polar, s.extent));
    }
  });

  it.each(SCENES)('keeps the depth step on the far side of the parcel small: $name', s => {
    // The framing distance the engine uses, the closest + can reach, and the zoom cap; the far
    // side of the parcel is `extent` past the target.
    const fit = fitDistance(s.frame, 30, 788 / 380);
    for (const dist of [fit, closestReachable(fit, s.frame), zoomOutCap(s.frame, s.extent)]) {
      const { near } = depthPlanes(dist, s.extent);
      const z = dist + s.extent;
      expect((z * z) / (near * 2 ** 24)).toBeLessThan(0.01);
    }
  });

  it('canZoomTo is the one rule + and - are held to: not closer than the floor, not past the cap', () => {
    expect(canZoomTo(8.9, 15)).toBe(false); // 15 * 0.6 = 9
    expect(canZoomTo(9, 15)).toBe(true);
    expect(canZoomTo(100, 15, 99)).toBe(false);
    // The last + step from the framing distance is the last one this rule allows.
    const near = closestReachable(fitDistance(15, 30, 2), 15);
    expect(canZoomTo(near, 15)).toBe(true);
    expect(canZoomTo(near * 0.82, 15)).toBe(false);
  });

  it('keeps the far plane past the whole scene', () => {
    const { far } = depthPlanes(40, 200);
    expect(far).toBeGreaterThan(40 + 2 * 200);
  });
});
