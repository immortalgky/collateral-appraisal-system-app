import { useMemo } from 'react';

import { useGetGalleryPhotos } from '@/features/appraisal/api/gallery';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { toGalleryImage } from '@/features/appraisal/types/gallery';
import type { GalleryPhotoDtoType } from '@shared/schemas/v1';

import { useGetProjectModels } from '../../../api/projectModel';
import { useGetProjectTowers } from '../../../api/projectTower';
import { useGetProjectUnits } from '../../../api/projectUnit';
import { isCondo } from '../../../types';
import type { ProjectModel, ProjectTower } from '../../../types';
import { useBlockProjectType } from '../CondoShellContext';

export interface UnitCount {
  total: number;
  sold: number;
}

const NONE: UnitCount = { total: 0, sold: 0 };

/** Name fallback key: a Condo model's identity is (tower, model name), a unit's towerName + modelType. */
const modelKey = (tower: string | null | undefined, model: string | null | undefined) =>
  `${(tower ?? '').trim()}\u0000${(model ?? '').trim()}`;

function sortByName<T>(list: T[] | undefined, nameOf: (item: T) => string | undefined): T[] {
  return [...(list ?? [])].sort((a, b) =>
    (nameOf(a) ?? '').localeCompare(nameOf(b) ?? '', undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}

/**
 * The figures the tower and model tabs and detail pages share, from queries the page already runs
 * (units, towers, models; React Query dedupes by key). The heavy unit-prices list is not read.
 *
 * Units are matched to towers and models by id (`projectTowerId`, `projectModelId`), as
 * `useCondoRollup` does. A unit whose id is null falls back to names: a tower by `towerName`, a model
 * by (its tower's name, `modelName`). `towers` and `models` come back in list order, which is also
 * the order prev/next and "n of N" follow.
 */
export function useTowerModelFigures() {
  const appraisalId = useAppraisalId() ?? '';
  const { data: unitsData } = useGetProjectUnits(appraisalId);
  const projectType = useBlockProjectType();
  const { data: towerData } = useGetProjectTowers(appraisalId, isCondo(projectType));
  const { data: modelData } = useGetProjectModels(appraisalId);

  const towers = useMemo(() => sortByName(towerData, t => t.towerName), [towerData]);
  const models = useMemo(
    () => sortByName(Array.isArray(modelData) ? modelData : undefined, m => m.modelName),
    [modelData],
  );

  return useMemo(() => {
    // A unit counts for its tower / model by id. Only a unit whose id is null is counted by name.
    const towerById = new Map<string, UnitCount>();
    const towerByName = new Map<string, UnitCount>();
    const modelById = new Map<string, UnitCount>();
    const modelByName = new Map<string, UnitCount>();
    const bump = (map: Map<string, UnitCount>, key: string, sold: boolean) => {
      const count = map.get(key) ?? { total: 0, sold: 0 };
      count.total += 1;
      if (sold) count.sold += 1;
      map.set(key, count);
    };
    for (const unit of unitsData?.units ?? []) {
      if (unit.projectTowerId) bump(towerById, unit.projectTowerId, unit.isSold);
      else bump(towerByName, (unit.towerName ?? '').trim(), unit.isSold);
      if (unit.projectModelId) bump(modelById, unit.projectModelId, unit.isSold);
      else bump(modelByName, modelKey(unit.towerName, unit.modelType), unit.isSold);
    }
    const sum = (a: UnitCount | undefined, b: UnitCount | undefined): UnitCount =>
      !a && !b
        ? NONE
        : { total: (a?.total ?? 0) + (b?.total ?? 0), sold: (a?.sold ?? 0) + (b?.sold ?? 0) };

    const towerNameById = new Map(towers.map(t => [t.id, t.towerName]));
    const modelsPerTower = new Map<string, number>();
    for (const model of models) {
      if (!model.projectTowerId) continue;
      modelsPerTower.set(model.projectTowerId, (modelsPerTower.get(model.projectTowerId) ?? 0) + 1);
    }

    return {
      towers,
      models,
      unitTotal: unitsData?.totalCount ?? 0,
      /** False until a unit list exists: with nothing counted there is nothing to compare against. */
      hasUnits: (unitsData?.totalCount ?? 0) > 0,
      unitsOfTower: (tower: Pick<ProjectTower, 'id' | 'towerName'>): UnitCount =>
        sum(towerById.get(tower.id), towerByName.get((tower.towerName ?? '').trim())),
      unitsOfModel: (model: ProjectModel): UnitCount =>
        sum(
          modelById.get(model.id),
          modelByName.get(modelKey(towerNameById.get(model.projectTowerId ?? ''), model.modelName)),
        ),
      modelsOfTower: (tower: ProjectTower): number => modelsPerTower.get(tower.id) ?? 0,
      towerNameOfModel: (model: ProjectModel): string | undefined =>
        towerNameById.get(model.projectTowerId ?? ''),
    };
  }, [unitsData, towers, models]);
}

/** Cover photo URL per entity id, from the appraisal's gallery, for the list thumbnails. */
export function useCoverThumbnails(
  items: { id: string; images?: { galleryPhotoId: string; isThumbnail: boolean }[] }[],
) {
  const appraisalId = useAppraisalId();
  const { data: galleryData } = useGetGalleryPhotos(appraisalId ?? undefined);
  return useMemo(() => {
    const photoById = new Map(
      ((galleryData?.photos ?? []) as GalleryPhotoDtoType[]).map(p => [p.id, p]),
    );
    const covers = new Map<string, string>();
    for (const item of items) {
      const cover = item.images?.find(i => i.isThumbnail);
      const photo = cover && photoById.get(cover.galleryPhotoId);
      if (photo) covers.set(item.id, toGalleryImage(photo).thumbnailSrc);
    }
    return covers;
  }, [galleryData, items]);
}
