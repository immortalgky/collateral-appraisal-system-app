import type { TFunction } from 'i18next';
import { findAddressBySubDistrictCode, findProvinceNameByCode } from '@shared/data/thaiAddresses';

/**
 * Resolves administrative address codes to a display string
 * "SubDistrict, District, Province" (names) via the shared address store —
 * the same lookup the appraisal address forms use. A 6-digit sub-district code
 * yields all three names; when only a province code is present (e.g. condo),
 * the province name is resolved on its own. Falls back to the raw codes when
 * the store has no match (data not loaded / unknown code).
 */
export function formatAddressNames(
  subDistrict: string | null | undefined,
  district: string | null | undefined,
  province: string | null | undefined,
): string {
  const found = subDistrict ? findAddressBySubDistrictCode(subDistrict) : undefined;
  const provinceName =
    found?.provinceName ?? (province ? findProvinceNameByCode(province) : undefined) ?? province;
  const parts = [
    found?.subDistrictName ?? subDistrict,
    found?.districtName ?? district,
    provinceName,
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Detail-screen address: free-text street prepended to the resolved
 * sub-district/district/province names. Used by the collateral detail Summary.
 */
export function formatIdentityAddress(
  street: string | null | undefined,
  subDistrict: string | null | undefined,
  district: string | null | undefined,
  province: string | null | undefined,
): string {
  const names = formatAddressNames(subDistrict, district, province);
  return [street, names].filter(Boolean).join(', ');
}

/**
 * Maps a collateral-type code to its human-readable label via the
 * historySearch i18n namespace.
 *
 * Code → i18n key mapping mirrors COLLATERAL_TYPE_OPTIONS in SearchPanel.tsx.
 * LSL / LSB / LS all resolve to the "leasehold" label (FSD §2.6.7).
 * Falls back to the raw code when the code is unknown.
 */
export function getCollateralTypeLabel(
  code: string | null | undefined,
  t: TFunction<'historySearch'>,
): string {
  if (!code) return '';

  const KEY_MAP: Record<string, string> = {
    L: 'searchPanel.collateralTypeOptions.land',
    LB: 'searchPanel.collateralTypeOptions.landAndBuilding',
    U: 'searchPanel.collateralTypeOptions.condo',
    LSL: 'searchPanel.collateralTypeOptions.leasehold',
    LSB: 'searchPanel.collateralTypeOptions.leasehold',
    LS: 'searchPanel.collateralTypeOptions.leasehold',
    MAC: 'searchPanel.collateralTypeOptions.machine',
  };

  const key = KEY_MAP[code.toUpperCase()];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return key ? t(key as any) : code;
}
