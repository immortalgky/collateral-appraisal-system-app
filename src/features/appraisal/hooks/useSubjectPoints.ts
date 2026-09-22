import { useMemo } from 'react';
import { useGetAppraisalMapPins } from '../api/marketComparable';
import { hasCoords, type LatLon } from '../utils/marketComparableFormat';

/**
 * Where the appraisal's own collateral is pinned — what a comparable's distance is measured
 * from. Empty outside an appraisal.
 */
export function useSubjectPoints(appraisalId: string | undefined): LatLon[] {
  const { data } = useGetAppraisalMapPins(appraisalId);
  return useMemo(
    () =>
      (data?.collateral ?? [])
        .filter(p => hasCoords(p.lat, p.lon))
        .map(p => ({ lat: Number(p.lat), lon: Number(p.lon) })),
    [data],
  );
}
