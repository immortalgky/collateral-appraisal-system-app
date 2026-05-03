import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { useGetProjectTowers } from '../../api/projectTower';
import { useGetGalleryPhotos } from '@/features/appraisal/api/gallery';
import { toGalleryImage } from '@/features/appraisal/types/gallery';
import type { GalleryPhotoDtoType } from '@shared/schemas/v1';
import type { ProjectTower } from '../../types';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';

type ViewMode = 'grid' | 'list';

// ── Tower Card ────────────────────────────────────────────────────────────────

interface TowerCardProps {
  tower: ProjectTower;
  viewMode: ViewMode;
  thumbnailSrc?: string;
  onClick: () => void;
}

function TowerCard({ tower, viewMode, thumbnailSrc, onClick }: TowerCardProps) {
  if (viewMode === 'list') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all text-left"
      >
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt={tower.towerName ?? 'Tower thumbnail'}
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon name="building" style="solid" className="text-gray-400 w-7 h-7" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {tower.towerName ?? 'Unnamed Tower'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Reg No: {tower.condoRegistrationNumber ?? '-'}
          </p>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-400">Units</p>
            <p className="text-sm font-medium text-gray-700">
              {tower.numberOfUnits?.toLocaleString() ?? '-'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Floors</p>
            <p className="text-sm font-medium text-gray-700">{tower.numberOfFloors ?? '-'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Building Age</p>
            <p className="text-sm font-medium text-gray-700">{tower.buildingAge ?? '-'}</p>
          </div>
        </div>

        <Icon name="chevron-right" style="solid" className="text-gray-400 w-4 h-4 shrink-0" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all text-left group"
    >
      <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={tower.towerName ?? 'Tower thumbnail'}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon
            name="building"
            style="solid"
            className="text-gray-300 w-10 h-10 group-hover:text-gray-400 transition-colors"
          />
        )}
      </div>

      <div className="p-4">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {tower.towerName ?? 'Unnamed Tower'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Reg No: {tower.condoRegistrationNumber ?? '-'}
        </p>

        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Unit Count</span>
            <span className="text-gray-700 font-medium">
              {tower.numberOfUnits?.toLocaleString() ?? '-'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Floor Count</span>
            <span className="text-gray-700 font-medium">{tower.numberOfFloors ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Building Age</span>
            <span className="text-gray-700 font-medium">{tower.buildingAge ?? '-'}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * Condo-only tab listing project towers.
 * Navigation uses block-condo route segment (Towers are Condo-only).
 */
export default function TowerListingTab() {
  const appraisalId = useAppraisalId();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const { data: towersData, isLoading, isError } = useGetProjectTowers(appraisalId ?? '');
  const towers = useMemo(
    () =>
      [...(towersData ?? [])].sort((a, b) =>
        (a.towerName ?? '').localeCompare(b.towerName ?? '', undefined, { numeric: true, sensitivity: 'base' }),
      ),
    [towersData],
  );

  const { data: galleryData } = useGetGalleryPhotos(appraisalId ?? undefined);
  const thumbnailByTowerId = useMemo(() => {
    const galleryPhotos = (galleryData?.photos ?? []) as GalleryPhotoDtoType[];
    const photoById = new Map(galleryPhotos.map(p => [p.id, p]));
    const map = new Map<string, string>();
    for (const tower of towers) {
      const cover = tower.images?.find(i => i.isThumbnail);
      const photo = cover && photoById.get(cover.galleryPhotoId);
      if (photo) map.set(tower.id, toGalleryImage(photo).thumbnailSrc);
    }
    return map;
  }, [galleryData, towers]);

  const handleTowerClick = (towerId: string) => {
    navigate(`${basePath}/block-condo/tower/${towerId}`);
  };

  const handleAddTower = () => {
    navigate(`${basePath}/block-condo/tower/new`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between mb-4">
          <div className="h-9 w-40 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl bg-gray-100 animate-pulse aspect-[4/3]" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-red-50 rounded-xl border-2 border-dashed border-red-200">
        <Icon name="exclamation-triangle" className="text-4xl mb-3 text-red-400" />
        <p className="text-sm font-medium text-red-500">Failed to load towers</p>
        <p className="text-xs text-red-400 mt-1">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={clsx(
              'px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm font-medium',
              viewMode === 'grid'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50',
            )}
          >
            <Icon name="grid-2" style="solid" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={clsx(
              'px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm font-medium',
              viewMode === 'list'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50',
            )}
          >
            <Icon name="list" style="solid" />
            <span>List</span>
          </button>
        </div>

        <Button variant="primary" onClick={handleAddTower} className="flex items-center gap-2">
          <Icon name="plus" />
          Add Tower
        </Button>
      </div>

      {/* Tower List */}
      {towers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Icon name="building" className="text-4xl mb-3" />
          <p className="text-sm font-medium text-gray-500">No towers yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Tower" to create your first tower</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto">
          {towers.map(tower => (
            <TowerCard
              key={tower.id}
              tower={tower}
              thumbnailSrc={thumbnailByTowerId.get(tower.id)}
              viewMode="grid"
              onClick={() => handleTowerClick(tower.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto">
          {towers.map(tower => (
            <TowerCard
              key={tower.id}
              tower={tower}
              thumbnailSrc={thumbnailByTowerId.get(tower.id)}
              viewMode="list"
              onClick={() => handleTowerClick(tower.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
