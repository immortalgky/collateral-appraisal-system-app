import { findAddressBySubDistrictCode } from '@/shared/data/thaiAddresses';
import type { AddressSource } from '@/shared/types';
import type { BriefAsset } from '../api/appraisalBrief';
import { dedupe } from './values';

/** Where a property or project is, by name. */
export interface Place {
  subDistrict: string | null;
  district: string | null;
  province: string | null;
}

/**
 * Names from the brief; an older API sends only the sub-district geocode, which the address master
 * resolves. With a `cache` each distinct code is looked up once (the master is a long list).
 */
export const placeOf = (
  p: { subDistrict?: string | null; district?: string | null; province?: string | null },
  code: string | null | undefined,
  source: AddressSource = 'dopa',
  cache?: Map<string, Place | null>,
): Place | null => {
  if (p.province || p.district || p.subDistrict)
    return {
      subDistrict: p.subDistrict ?? null,
      district: p.district ?? null,
      province: p.province ?? null,
    };
  if (!code) return null;
  const key = `${source}:${code}`;
  const hit = cache?.get(key);
  if (hit !== undefined) return hit;
  const a = findAddressBySubDistrictCode(code, source);
  // A location that is not a geocode (free text) and resolves to nothing is shown as the text it is,
  // as the old list showed it; an unresolved geocode says nothing (a bare number is not a place).
  const place = a
    ? { subDistrict: a.subDistrictName, district: a.districtName, province: a.provinceName }
    : /^\d+$/.test(code.trim())
      ? null
      : { subDistrict: code.trim(), district: null, province: null };
  cache?.set(key, place);
  return place;
};

/** The deed address of a property (Title masters): what the report's title clause prints. */
export const deedNames = (a: BriefAsset) => ({
  subDistrict: a.deedSubDistrictName,
  district: a.deedDistrictName,
  province: a.deedProvinceName,
});

/**
 * Where a property is (DOPA masters): the report's property location, so what the hero names. An
 * older API sends only `location`, which is the DEED's (Title) geocode: it is resolved in the Title
 * master, never looked up as a DOPA code.
 */
export const dopaPlace = (a: BriefAsset, cache?: Map<string, Place | null>) =>
  placeOf(
    {
      subDistrict: a.dopaSubDistrictName,
      district: a.dopaDistrictName,
      province: a.dopaProvinceName,
    },
    a.location,
    'title',
    cache,
  );

/** "Sub-district · district · province" down to what the places share: one sub-district, one district, or just provinces. */
export function placeParts(places: (Place | null)[]): string[] {
  const rows = places.filter((p): p is Place => !!p);
  const key = (p: Place) => [p.subDistrict, p.district, p.province].join('/');
  const distinct = dedupe(rows.map(key));
  if (distinct.length === 0) return [];
  const first = rows[0];
  const parts = (p: Place, n: number) =>
    [p.subDistrict, p.district, p.province].slice(n).filter((x): x is string => !!x);
  if (distinct.length === 1) return parts(first, 0);
  if (rows.every(r => r.district === first.district && r.province === first.province))
    return parts(first, 1);
  const provinces = dedupe(rows.map(r => r.province).filter((x): x is string => !!x));
  return provinces.length > 2
    ? [`${provinces.slice(0, 2).join(', ')} +${provinces.length - 2}`]
    : provinces.length
      ? [provinces.join(', ')]
      : [];
}

/** The deed places of properties, one cache for the geocodes: what the card's title clause names. */
export const deedPlaces = (assets: BriefAsset[]) => {
  const cache = new Map<string, Place | null>();
  return assets.map(a => placeOf(deedNames(a), a.location, 'title', cache));
};

export const assetPlaces = (assets: BriefAsset[]) => {
  const cache = new Map<string, Place | null>();
  return assets.map(a => dopaPlace(a, cache));
};
