import { BoxGeometry, Color, Vector3 } from 'three';
import { flatten } from './instancing';
import { Kit, type Xform } from './kit';
import { houseSetback, villagePlotInfo, type VillageSceneSpec } from './model';
import { building, facilityClub, facilityGym, facilityPool, trees } from './parts';
import { groupBy } from './values';
import { SPINE_W } from './villageLayout';

/** Ground of the parcel, and what sits on it. */
const GROUND = 0.6;
const ROAD_H = 0.1;

/** Up to this many drawn houses, the house block is an obstacle for the callout cards. */
export const SMALL_VILLAGE = 40;

/**
 * A horizontal project as a village: the parcel, an entrance road, internal roads with plots back
 * to back, a common area, and one house per plot. Houses of the same model, floor count and state
 * share one instanced geometry per material, so 300 houses cost a few dozen draw calls, not
 * thousands. Everything about WHERE things stand is assumed (see villageLayout.ts).
 */
export function buildVillage(kit: Kit, spec: VillageSceneSpec) {
  const { P, env } = kit;
  const { layout, parcel } = spec;
  const top = GROUND;

  // Parcel slab.
  const slab = kit.box(parcel.width, GROUND, parcel.depth, kit.mat(P.land), { cast: false });
  slab.position.y = GROUND / 2;
  kit.world.add(
    kit.pick(kit.outline(slab, parcel.dashed ? 0.9 : 0.35, P.edge, parcel.dashed), parcel.info),
  );

  // Roads. The last layout road is the spine; it is extended to the parcel's front edge.
  const road = (x: number, z: number, w: number, d: number) => {
    const m = kit.box(w, ROAD_H, d, kit.mat(P.road), { cast: false });
    m.position.set(x, top + ROAD_H / 2, z);
    return m;
  };
  layout.roads.forEach((r, i) => {
    const isSpine = i === layout.roads.length - 1;
    kit.world.add(kit.pick(road(r.x, r.z, r.w, r.d), isSpine ? spec.entranceInfo : spec.roadInfo));
  });
  const front = layout.depth / 2;
  const reach = parcel.depth / 2 - front;
  if (reach > 0.1) {
    kit.world.add(
      kit.pick(road(layout.spineX, front + reach / 2, SPINE_W, reach), spec.entranceInfo),
    );
  }

  // Plot pads: sold plots tinted like sold condo units.
  const pads: Xform[] = [];
  const padColors: Color[] = [];
  const lawn = new Color(P.lawn);
  const soldPad = lawn.clone().lerp(new Color(P.sold), 0.85);
  layout.plots.forEach(p => {
    const plot = spec.plots[p.index];
    pads.push([p.x, top + 0.04, p.z, 0, Math.max(1, p.w - 0.6), 0.08, Math.max(1, p.d - 0.6)]);
    padColors.push(plot.sold ? soldPad : lawn);
  });
  if (pads.length) {
    kit.world.add(
      kit.instanced(new BoxGeometry(1, 1, 1), kit.mat(0xffffff), pads, {
        cast: false,
        colors: padColors,
      }),
    );
  }

  // Houses: one prototype per (model, floors, under construction), instanced over its plots.
  const groups = groupBy(
    spec.plots.map((_, i) => i),
    i => {
      const p = spec.plots[i];
      return `${p.model}|${p.floors}|${p.under ? 1 : 0}`;
    },
  );
  const placement = new Map(layout.plots.map(p => [p.index, p]));
  const soldTint = new Color(1, 1, 1).lerp(new Color(P.sold), 0.6);
  for (const members of groups.values()) {
    const first = spec.plots[members[0]];
    const model = spec.models[first.model];
    const w = members.reduce((s, i) => s + spec.plots[i].houseW, 0) / members.length;
    const d = members.reduce((s, i) => s + spec.plots[i].houseD, 0) / members.length;
    const proto = building(kit, {
      w,
      d,
      floors: first.floors,
      fh: model.fh,
      roofStyle: model.roofStyle,
      roofColor: model.roofColor,
      under: first.under,
      type: model.type,
      // The prototype is never added to the world: it is only copied from.
      rise: false,
    });
    const forms: Xform[] = members.map(i => {
      const plot = spec.plots[i];
      const at = placement.get(i)!;
      const back = houseSetback(at.d, plot.houseD);
      const dz =
        at.facing === 1 ? at.d / 2 - back - plot.houseD / 2 : -at.d / 2 + back + plot.houseD / 2;
      return [
        at.x,
        top,
        at.z + dz,
        at.facing === 1 ? 0 : Math.PI,
        plot.houseW / w,
        1,
        plot.houseD / d,
      ];
    });
    const colors = members.map(i => (spec.plots[i].sold ? soldTint : new Color(1, 1, 1)));
    let flagged = false;
    for (const part of flatten(proto.group)) {
      const tint = !first.under && part.material === proto.body.material;
      const im = kit.instanced(part.geometry, part.material, forms, {
        colors: tint ? colors : undefined,
      });
      // In a small village each house group's box (all its instances) is one obstacle, flagged on
      // one part only: cards stand clear of the house block, not of each house. A big village
      // fills the canvas, so no card would find room.
      if (spec.plots.length <= SMALL_VILLAGE && !flagged) {
        im.userData.obstacle = true;
        flagged = true;
      }
      kit.world.add(
        kit.pick(im, { title: model.name, rows: [] }, k => villagePlotInfo(env, spec, members[k])),
      );
    }
  }

  // Common area: a lawn with the facilities the project records. All positions assumed.
  const plaza = layout.plaza;
  // Nothing recorded about the facilities: they are scenery, and answer nothing.
  const quiet = spec.facilitiesAssumed;
  if (plaza) {
    // 0.12 high, the roads 0.1: the pad's top is above the spine that crosses it, so they do not z-fight.
    const pad = kit.box(plaza.w, 0.12, plaza.d, kit.mat(spec.has.garden ? P.crop : P.roadLight), {
      cast: false,
    });
    pad.position.set(plaza.x, top + 0.06, plaza.z);
    kit.world.add(quiet ? pad : kit.pick(pad, spec.plazaInfo));
    const y = top + 0.12;
    const { x: cx, z: cz } = plaza;
    if (spec.has.pool) facilityPool(kit, cx - 10, y, cz + 7, quiet ? null : spec.facilityInfo.pool);
    if (spec.has.club) facilityClub(kit, cx + 14, y, cz + 8, quiet ? null : spec.facilityInfo.club);
    if (spec.has.fitness)
      facilityGym(kit, cx + 14, y, cz - 6, quiet ? null : spec.facilityInfo.fitness);
    if (spec.has.stadium) {
      const court = kit.outline(
        kit.box(20, 0.06, 9, kit.mat(P.accent), { cast: false }),
        0.9,
        0xffffff,
      );
      court.position.set(cx - 9, y + 0.03, cz - 6.5);
      kit.world.add(quiet ? court : kit.pick(court, spec.facilityInfo.stadium));
    }
    if (spec.has.parking) {
      const lot = kit.box(36, 0.05, 3, kit.mat(P.road), { cast: false });
      lot.position.set(cx, y + 0.03, cz);
      kit.world.add(quiet ? lot : kit.pick(lot, spec.facilityInfo.parking));
    }
    if (spec.has.garden) {
      trees(
        kit,
        [
          [cx - 20, cz - 13],
          [cx - 20, cz + 13],
          [cx + 20, cz - 13],
          [cx + 20, cz + 13],
          [cx + 2, cz - 13],
          [cx - 8, cz + 13],
        ],
        y,
        quiet ? null : { title: env.label('Facilities', '08'), rows: [] },
      );
    }
  }

  // Callouts. The project's goes over the common area (or the middle); legal beside it.
  const hub = plaza
    ? new Vector3(plaza.x, top + 9, plaza.z)
    : new Vector3(layout.spineX, top + 9, 0);
  kit.callout(hub, spec.callout);
  kit.callout(
    new Vector3(-parcel.width / 2 + 2, top, parcel.depth / 2 - 2),
    spec.landCallout,
    true,
  );
  if (spec.legal)
    kit.callout(new Vector3(parcel.width / 2 - 2, top, parcel.depth / 2 - 2), spec.legal);
}
