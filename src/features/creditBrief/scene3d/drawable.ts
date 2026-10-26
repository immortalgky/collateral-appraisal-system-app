import type { BriefAsset, BriefProject, BriefTower } from '../api/appraisalBrief';
import { bringsLand, kindOf } from '../sceneModel';

/**
 * Whether the 3D scene can draw an application at all. Its own tiny module, apart from the scene
 * model, so the switch can ask before three.js is loaded: the 3D chunk (the scene and three.js)
 * is fetched only when there is something to draw. The scene model itself is bundled with the
 * brief, because the property list reads it.
 */

/**
 * A tower with neither a name nor a floor count is a leftover, not a building: it is not drawn or
 * counted as a tower.
 */
const isRealTower = (t: BriefTower) => !!t.towerName?.trim() || t.numberOfFloors != null;

/** The real towers of a project. */
export const towersOf = (project: BriefProject) => (project.towers ?? []).filter(isRealTower);

/** The leftovers `towersOf` drops: not drawn, but their units still belong to the project. */
export const ghostTowersOf = (project: BriefProject) =>
  (project.towers ?? []).filter(t => !isRealTower(t));

export interface Plan {
  kind: 'land' | 'condo';
  land: BriefAsset[];
  building: BriefAsset[];
  condo: BriefAsset[];
  machines: number;
}

/**
 * What the application is, as ONE site. A land-and-building property brings its parcel along.
 * ponytail: a mix of condo units with land, buildings or machines has no single honest picture;
 * that returns null and the caller shows the hero without a model, which lists every kind. Machines
 * alone are drawn: the ground for reference, with the machines in a yard.
 */
export function planOf(assets: BriefAsset[]): Plan | null {
  const by = { land: [], building: [], condo: [] } as Record<
    'land' | 'building' | 'condo',
    BriefAsset[]
  >;
  let machines = 0;
  for (const a of assets) {
    const kind = kindOf(a.propertyType);
    if (!kind) continue;
    if (kind === 'machine') {
      machines++;
      continue;
    }
    by[kind].push(a);
    if (bringsLand(a.propertyType)) by.land.push(a);
  }
  const plan = {
    land: by.land,
    building: by.building,
    condo: by.condo,
    machines,
  };
  if (by.condo.length) {
    return by.land.length || by.building.length || machines ? null : { ...plan, kind: 'condo' };
  }
  // Machines and nothing else: the apron path, the ground drawn for reference with the machines in a yard.
  return by.land.length || by.building.length || machines ? { ...plan, kind: 'land' } : null;
}

/** The plots of a horizontal project, which is drawn as a village when it has any. */
export const plotsOf = (project: BriefProject) => project.plots ?? [];

/** Cheap check the lazy switch uses BEFORE loading three.js. */
export const canDraw3D = (assets: BriefAsset[], project: BriefProject | null) =>
  project ? towersOf(project).length > 0 || plotsOf(project).length > 0 : planOf(assets) !== null;
