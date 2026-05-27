/**
 * URL serialization helpers for History Search deep-linking.
 *
 * Only non-empty fields are written to the URL to keep it readable.
 * buildingTypeCodes is comma-joined (e.g. "Type1,Type2").
 * page is always included when non-zero so refreshing restores the page.
 */

import type { HistorySearchFormValues } from './types';

// ─── Serialize ────────────────────────────────────────────────────────────────

export function formValuesToParams(
  values: HistorySearchFormValues,
  page: number,
): URLSearchParams {
  const params = new URLSearchParams();

  const setIfPresent = (key: string, value: string) => {
    if (value.trim()) params.set(key, value.trim());
  };

  // Spatial / period
  setIfPresent('centerLat', values.centerLat);
  setIfPresent('centerLon', values.centerLon);
  setIfPresent('radiusKm', values.radiusKm);
  if (values.period) params.set('period', values.period);

  // Attribute filters
  setIfPresent('appraisalReportNo', values.appraisalReportNo);
  setIfPresent('titleDeedNo', values.titleDeedNo);
  setIfPresent('collateralType', values.collateralType);
  setIfPresent('customerName', values.customerName);
  setIfPresent('landAreaFromSqWa', values.landAreaFromSqWa);
  setIfPresent('landAreaToSqWa', values.landAreaToSqWa);
  setIfPresent('valueFrom', values.valueFrom);
  setIfPresent('valueTo', values.valueTo);
  if (values.buildingTypeCodes.length > 0) {
    params.set('buildingTypeCodes', values.buildingTypeCodes.join(','));
  }
  setIfPresent('subDistrict', values.subDistrict);
  setIfPresent('district', values.district);
  setIfPresent('province', values.province);
  setIfPresent('dateFrom', values.dateFrom);
  setIfPresent('dateTo', values.dateTo);

  // Pagination (omit page 0 to keep URL cleaner)
  if (page > 0) params.set('page', String(page));

  return params;
}

// ─── Deserialize ──────────────────────────────────────────────────────────────

interface ParsedUrlState {
  values: Partial<HistorySearchFormValues>;
  page: number;
  /** True when the URL contained at least one recognised search parameter */
  hasAny: boolean;
}

export function paramsToFormValues(sp: URLSearchParams): ParsedUrlState {
  const getString = (key: string): string => sp.get(key) ?? '';

  const buildingTypeRaw = sp.get('buildingTypeCodes') ?? '';
  const buildingTypeCodes = buildingTypeRaw
    ? buildingTypeRaw.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const pageRaw = sp.get('page');
  const page = pageRaw ? Math.max(0, parseInt(pageRaw, 10) || 0) : 0;

  // Treat any recognised key being present as "has a search state"
  const knownKeys = [
    'centerLat', 'centerLon', 'radiusKm', 'period',
    'appraisalReportNo', 'titleDeedNo', 'collateralType', 'customerName',
    'landAreaFromSqWa', 'landAreaToSqWa', 'valueFrom', 'valueTo',
    'buildingTypeCodes', 'subDistrict', 'district', 'province',
    'dateFrom', 'dateTo', 'page',
  ];
  const hasAny = knownKeys.some(k => sp.has(k));

  const values: Partial<HistorySearchFormValues> = {
    centerLat: getString('centerLat'),
    centerLon: getString('centerLon'),
    radiusKm: getString('radiusKm') || '1',
    period: (sp.get('period') as HistorySearchFormValues['period']) || 'Past3y',
    appraisalReportNo: getString('appraisalReportNo'),
    titleDeedNo: getString('titleDeedNo'),
    collateralType: getString('collateralType'),
    customerName: getString('customerName'),
    landAreaFromSqWa: getString('landAreaFromSqWa'),
    landAreaToSqWa: getString('landAreaToSqWa'),
    valueFrom: getString('valueFrom'),
    valueTo: getString('valueTo'),
    buildingTypeCodes,
    subDistrict: getString('subDistrict'),
    district: getString('district'),
    province: getString('province'),
    dateFrom: getString('dateFrom'),
    dateTo: getString('dateTo'),
  };

  return { values, page, hasAny };
}
