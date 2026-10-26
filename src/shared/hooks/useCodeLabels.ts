import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThaiAddress } from '@/shared/data/thaiAddresses';
import { useAddressStore } from '@/shared/store';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';

/**
 * Resolvers for the raw codes the API returns.
 *
 * Several endpoints hand back storage codes rather than labels — `province` is a TIS-1099 geocode
 * ("71"), `propertyTypes` is a comma-joined list of collateral-type codes ("B, L"). The maps that
 * translate them are already in the browser: the address list and the parameter list are both
 * fetched once per session into global stores, so resolving costs nothing.
 *
 * These live here because more than one screen needs them and two copies would drift. Every
 * resolver falls back to the raw code, which matters on the first render — the store loaders are
 * siblings of the screens that use them, so the maps are briefly empty.
 */

/**
 * One map from a geocode to its name, over the address lists. Title first: the two families have
 * diverged, and Title is the one the appraisal and collateral data use; DOPA only fills a code
 * Title lacks. The resolver gives back the raw code when it is unknown and '' when there is none.
 */
function useGeoName(
  pick: (address: ThaiAddress) => readonly [code: string, name: string],
): (code: string | null | undefined) => string {
  const titleAddresses = useAddressStore(s => s.titleAddresses);
  const dopaAddresses = useAddressStore(s => s.dopaAddresses);

  const codeToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const addr of [...titleAddresses, ...dopaAddresses]) {
      const [code, name] = pick(addr);
      if (!map.has(code)) map.set(code, name);
    }
    return map;
    // `pick` is one of the module-level pickers below, never a new function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleAddresses, dopaAddresses]);

  return useCallback(code => (code ? (codeToName.get(code) ?? code) : ''), [codeToName]);
}

const pickProvince = (a: ThaiAddress) => [a.provinceCode, a.provinceName] as const;
const pickDistrict = (a: ThaiAddress) => [a.districtCode, a.districtName] as const;
const pickSubDistrict = (a: ThaiAddress) => [a.subDistrictCode, a.subDistrictName] as const;

/** Maps a province geocode to its name, e.g. "71" -> "กาญจนบุรี". */
export const useProvinceName = () => useGeoName(pickProvince);

/** Maps a district geocode (4 digits) to its name. */
export const useDistrictName = () => useGeoName(pickDistrict);

/** Maps a sub-district geocode (6 digits) to its name. */
export const useSubDistrictName = () => useGeoName(pickSubDistrict);

/**
 * Maps the view's comma-joined collateral-type codes to their descriptions,
 * e.g. "B, L" -> "สิ่งปลูกสร้าง, ที่ดินเปล่า". Unknown codes pass through unchanged.
 */
export function usePropertyTypeLabels(): (codes: string | null | undefined) => string {
  const propertyTypes = useParametersByGroup('PropertyType');

  const codeToLabel = useMemo(
    () => new Map(propertyTypes.map(p => [p.code, p.description])),
    [propertyTypes],
  );

  return useCallback(
    codes =>
      codes
        ? codes
            .split(',')
            .map(code => code.trim())
            .filter(Boolean)
            .map(code => codeToLabel.get(code) ?? code)
            .join(', ')
        : '',
    [codeToLabel],
  );
}

/**
 * Maps an appraisal's type (`New`, `ReAppraisal`, …) to its AppraisalType parameter description in
 * the current language. The group is keyed on those same names (see the backend patch
 * 20260927120000_PatchAppraisalTypeParameterCodes.sql), so no translation table is needed.
 * Returns undefined when the master has no row for it, so callers can fall back to their own text.
 */
export function useAppraisalTypeLabel(): (type: string | null | undefined) => string | undefined {
  const types = useParametersByGroup('AppraisalType');
  const codeToLabel = useMemo(
    () => new Map(types.map(p => [p.code, p.description.trim()])),
    [types],
  );
  // `|| undefined`: a blank description must fall back too, not render as nothing.
  return useCallback(
    type => (type ? codeToLabel.get(type) || undefined : undefined),
    [codeToLabel],
  );
}

/**
 * Maps the field a search matched on (`prevAppraisalNumber`, `titleNumber`, …) to its label under
 * `nav:search.fields`. A field the server adds before the locales catch up shows as its raw name.
 */
export function useSearchFieldLabel(): (field: string) => string {
  const { t } = useTranslation('nav');
  return useCallback(
    field => t(`search.fields.${field}` as never, { defaultValue: field }) as string,
    [t],
  );
}
