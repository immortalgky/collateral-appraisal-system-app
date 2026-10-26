import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getParameterDescription, useParametersByGroup } from '@/shared/utils/parameterUtils';
import { numberFormat } from '../sceneModel';
import type { ParamGroup, SceneEnv } from './model';

const KEY = 'activityTracking.brief.collateral.scene3d.';

/**
 * The shared parameter lookup (`getParameterDescription`: the current locale, else EN, else the
 * code itself) with this scene's rules on top: a code with no description, or an empty one, shows
 * as itself, except 99, which every group reads as "Other" (never a bare "99" in any language).
 */
export function paramLabel(
  group: ParamGroup,
  code: string | null | undefined,
  other: () => string,
): string {
  if (!code) return '—';
  const description = getParameterDescription(group, code);
  if (description && description !== code) return description;
  return code === '99' ? other() : code;
}

/**
 * Strings, parameter labels and number formatting for the scene model. Labels come from the
 * parameter store (the same source the property screens read), never from literals in the scene.
 */
export function useSceneEnv(): SceneEnv {
  const { t, i18n } = useTranslation('appraisal');
  // One hook per group, called unconditionally and in a fixed order.
  const groups: Record<ParamGroup, ReturnType<typeof useParametersByGroup>> = {
    BuildingType: useParametersByGroup('BuildingType'),
    Roof: useParametersByGroup('Roof'),
    Fence: useParametersByGroup('Fence'),
    LandShape: useParametersByGroup('LandShape'),
    LandUse: useParametersByGroup('LandUse'),
    Landfill: useParametersByGroup('Landfill'),
    RoadSurface: useParametersByGroup('RoadSurface'),
    Facilities: useParametersByGroup('Facilities'),
    LocationView: useParametersByGroup('LocationView'),
    PropertyType: useParametersByGroup('PropertyType'),
  };
  // The scene model builds keys from data (`dir.${dir}`, `legal.${flag}`), which the typed `t` rejects.
  const tr = t as unknown as (key: string, opts?: Record<string, unknown>) => string;
  const language = i18n.language;

  return useMemo(
    () => ({
      // A key starting with '@' is absolute (a label that lives outside the scene3d block).
      t: (key, opts) => tr(key.startsWith('@') ? key.slice(1) : `${KEY}${key}`, opts),
      label: (group, code) => paramLabel(group, code, () => tr(`${KEY}values.otherCode`)),
      nf: numberFormat(language),
    }),
    // `groups` is rebuilt every render; its members are the stable inputs, and the lookup reads
    // the same stores they subscribe to, so a changed table or language builds a new env.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tr, language, ...Object.values(groups)],
  );
}
