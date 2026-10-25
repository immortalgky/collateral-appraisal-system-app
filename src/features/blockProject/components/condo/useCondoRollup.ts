import { useMemo } from 'react';

import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';

import { useGetProjectLand } from '../../api/projectLand';
import { useGetProjectModels } from '../../api/projectModel';
import { useGetProjectTowers } from '../../api/projectTower';
import { useGetProjectUnits } from '../../api/projectUnit';
import { useGetUnitPriceSource } from '../../api/projectUnitPrice';
import { isCondo } from '../../types';
import { useBlockProjectType } from './CondoShellContext';

export interface CondoRollup {
  units: number;
  sold: number;
  models: number;
  /** Models with no appraised value yet. */
  pendingModels: number;
  /** Condo only; 0 for LB and L (the towers query does not run). */
  towers: number;
  /** Title deeds of the project land. LB and L only; 0 for condo (the land query does not run). */
  titles: number;
  /** Total project land in square wa, from the land record. */
  landSqWa: number;
  /** Units that currently hold a price. */
  priced: number;
  /** null when no unit is priced (the API sends null, not 0): show "—", not ฿0. */
  appraisedTotal: number | null;
  forceSaleTotal: number | null;
}

/**
 * The figures the project header and the Unit For Sale hint are built from. No request of its own:
 * it reads the units, models, unit-price-source (and, per type, towers or project-land) queries the
 * page already runs (React Query dedupes by key). The heavy unit-prices list is deliberately not
 * read here. Towers run for condo only and project land for LB/L only.
 */
export function useCondoRollup(): CondoRollup {
  const appraisalId = useAppraisalId() ?? '';
  const projectType = useBlockProjectType();
  const { data: unitsData } = useGetProjectUnits(appraisalId);
  const { data: models } = useGetProjectModels(appraisalId);
  const { data: towers } = useGetProjectTowers(appraisalId, isCondo(projectType));
  const { data: land } = useGetProjectLand(appraisalId, !isCondo(projectType));
  const { data: source } = useGetUnitPriceSource(appraisalId);

  const total = unitsData?.totalCount ?? 0;

  return useMemo(() => {
    return {
      units: total,
      sold: total - (unitsData?.remainingCount ?? total),
      models: models?.length ?? 0,
      pendingModels: models?.filter(m => m.finalAppraisedValue == null).length ?? 0,
      towers: towers?.length ?? 0,
      titles: land?.titles?.length ?? 0,
      landSqWa: land?.totalLandAreaInSqWa ?? 0,
      priced: source?.pricedUnitCount ?? 0,
      appraisedTotal: source?.totalAppraisalValueRounded ?? null,
      forceSaleTotal: source?.totalForceSellingPrice ?? null,
    };
  }, [total, unitsData?.remainingCount, models, towers, land, source]);
}
