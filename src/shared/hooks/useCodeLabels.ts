import { useCallback, useMemo } from 'react';
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

/** Maps a province geocode to its name, e.g. "71" -> "กาญจนบุรี". */
export function useProvinceName(): (code: string | null | undefined) => string {
  const titleAddresses = useAddressStore(s => s.titleAddresses);
  const dopaAddresses = useAddressStore(s => s.dopaAddresses);

  const codeToName = useMemo(() => {
    const map = new Map<string, string>();
    // Title first: the two families have diverged, and Title is the one the appraisal data uses.
    for (const addr of [...titleAddresses, ...dopaAddresses]) {
      if (!map.has(addr.provinceCode)) map.set(addr.provinceCode, addr.provinceName);
    }
    return map;
  }, [titleAddresses, dopaAddresses]);

  return useCallback(code => (code ? (codeToName.get(code) ?? code) : ''), [codeToName]);
}

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
