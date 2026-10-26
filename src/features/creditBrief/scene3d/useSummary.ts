import { useMemo } from 'react';
import { useAddressStore } from '@/shared/store';
import type { BriefAsset, BriefMachine, BriefProject } from '../api/appraisalBrief';
import { buildHero, minimalHero } from './heroModel';
import type { SceneEnv } from './model';
import { buildItems, countItems } from './summaryItems';

/** What the cards of the collateral hero show, for the 3D scene and for the CSS scene under it. */
export function useSummary(
  env: SceneEnv,
  assets: BriefAsset[],
  project: BriefProject | null,
  machines: BriefMachine[] | undefined,
) {
  // A brief from an older API names its places by geocode only, which the address master resolves
  // once it has loaded: re-build then.
  const addressesLoaded = useAddressStore(s => s.titleAddresses.length + s.dopaAddresses.length);
  // A field the builders cannot read must not take the panel down: fall back to the least they can say.
  return useMemo(() => {
    try {
      return {
        hero: buildHero(assets, project, env),
        items: buildItems(assets, project, machines, env),
      };
    } catch (e) {
      console.error('Collateral summary could not be built; showing the counts only', e);
      return { hero: minimalHero(assets, project, env), items: countItems(assets, project, env) };
    }
    // One object until an input changes: effects that depend on it must not re-run on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, project, machines, env, addressesLoaded]);
}
