/**
 * Height of the collateral scene, so the CSS scene never differs from the 3D scene it stands in
 * for and nothing jumps when one replaces the other. Two cases:
 *  - Standing in for a 3D-capable application (while the 3D chunk loads, or after the context was
 *    lost once 3D had shown): the hero's height, SCENE_HEIGHT, a class of collateralScene.css
 *    (clamp(460px, 48cqw, 620px) over the desk width, shorter below it); change it there only.
 *  - The permanent view (the application cannot be drawn in 3D, or WebGL is unavailable from the
 *    start): SCENE_HEIGHT_COMPACT. The CSS scene was 250px before this branch; 380px is the
 *    phase-1 decision (2026-10-18). There is no hero to match, and a 3D-sized stage would leave
 *    the small isometric plot lost in empty space.
 * The 3D scene reads its real canvas height at runtime, so no other number depends on these.
 */
export const SCENE_HEIGHT = 'cs3d-h';
/** A height inside the hero's range: the CSS scene's fit uses it before it has measured itself. */
export const SCENE_HEIGHT_PX = 520;
export const SCENE_HEIGHT_COMPACT = 'h-[380px]';
export const SCENE_HEIGHT_COMPACT_PX = 380;
