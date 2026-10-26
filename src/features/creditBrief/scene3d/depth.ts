/** The 3D scene's camera maths that more than one place needs: framing distance, zoom steps, depth planes. */

/** The distance at which a sphere of radius `r` fills the view (a little less than edge to edge). */
export function fitDistance(r: number, fovDeg: number, aspect: number) {
  const vf = (fovDeg * Math.PI) / 180;
  const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
  return (r / Math.sin(Math.min(vf, hf) / 2)) * 0.86;
}

/** One press of + (distance x 0.82) and of - (x 1.22); the camera never gets closer than 0.6 frame radii. */
export const ZOOM_IN = 0.82;
export const ZOOM_OUT = 1.22;
export const ZOOM_FLOOR = 0.6;

/** The farthest the camera may zoom out from its target: eight frame radii, or 2.5 scene radii. */
export const zoomOutCap = (frameRadius: number, extent: number) =>
  Math.max(frameRadius * 8, extent * 2.5);

/** Whether a camera distance is one + or - may reach: not closer than the floor, not past the cap. */
export const canZoomTo = (len: number, frameRadius: number, cap = Infinity) =>
  len >= frameRadius * ZOOM_FLOOR && len <= cap;

/**
 * Near and far planes follow the camera's distance to its target.
 *
 * Near is a fixed share of that distance: the camera is never closer than about 0.19 x distance to
 * the ground (the orbit stops at a polar angle of 1.38), so this never clips the ground or the
 * scene. The share is big enough that the depth steps stay small where the thin ground layers (lot,
 * bays, pond, pads) sit, even at the closest zoom on a large parcel, so they do not shimmer. Far
 * reaches past the whole scene; far / near is a few thousand at the closest zoom, far less
 * elsewhere.
 */
export function depthPlanes(dist: number, extent: number) {
  return { near: Math.max(0.05, dist * 0.03), far: dist + extent * 6 };
}
