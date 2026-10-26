import type { ParamGroup, SceneEnv } from './model';

/** Small readers of brief fields, shared by the scene model, the hero and the property list. */

export const list = <T>(v: T[] | null | undefined): T[] => v ?? [];
export const dedupe = <T>(v: T[]): T[] => [...new Set(v)];
/** A finite number, else 0. */
export const num = (v: number | null | undefined) => (v != null && Number.isFinite(v) ? v : 0);
/** A finite number above zero, else null: "not recorded". */
export const positive = (v: number | null | undefined) =>
  v != null && Number.isFinite(v) && v > 0 ? v : null;

/** The labels of some parameter codes, once each, comma-joined; '' for none. */
export const labelList = (env: SceneEnv, group: ParamGroup, codes: string[]) =>
  dedupe(codes)
    .map(c => env.label(group, c))
    .join(', ');

/** Land area as rai-ngan-wa, with the rai unit unless `unit` is off ("10-0-0 ไร่"), as the report and the figure card print it. */
export const rnw = (env: SceneEnv, a: { rai: number; ngan: number; wa: number }, unit = true) =>
  `${env.nf(a.rai, 2)}-${env.nf(a.ngan, 2)}-${env.nf(a.wa, 2)}${unit ? ` ${env.t('hero.rai')}` : ''}`;

/** Items grouped by a key, in first-seen order. */
export const groupBy = <T, K>(items: T[], key: (item: T) => K) => {
  const by = new Map<K, T[]>();
  for (const x of items) {
    const k = key(x);
    const group = by.get(k);
    if (group) group.push(x);
    else by.set(k, [x]);
  }
  return by;
};

/** A counted text ("1 room" / "3 rooms"): `count` picks the plural form, `n` is the formatted number the text prints. */
export const plural = (env: SceneEnv, key: string, count: number) =>
  env.t(key, { count, n: env.nf(count) });
