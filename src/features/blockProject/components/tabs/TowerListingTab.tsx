import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import type { AxiosError } from 'axios';

import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useGetProjectTowers, useDeleteProjectTower } from '../../api/projectTower';
import { useGetGalleryPhotos } from '@/features/appraisal/api/gallery';
import { toGalleryImage } from '@/features/appraisal/types/gallery';
import type { GalleryPhotoDtoType } from '@shared/schemas/v1';
import type { ProjectTower } from '../../types';
import type { ApiError } from '@/shared/types/api';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';

type AppError = AxiosError & { apiError?: ApiError };

type ViewMode = 'grid' | 'list';

// ── Tower Card ────────────────────────────────────────────────────────────────

interface TowerCardProps {
  tower: ProjectTower;
  viewMode: ViewMode;
  thumbnailSrc?: string;
  readOnly: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function TowerCard({ tower, viewMode, thumbnailSrc, readOnly, onClick, onDelete }: TowerCardProps) {
  const cardProps = {
    role: 'button' as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
  };

  if (viewMode === 'list') {
    return (
      <tr className="bg-white even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors group">
        <td className="px-2 py-2 cursor-pointer" onClick={onClick}>
          <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex items-center justify-center">
            {thumbnailSrc ? (
              <img src={thumbnailSrc} alt={tower.towerName ?? 'Tower'} className="w-full h-full object-cover" />
            ) : (
              <Icon name="building" style="solid" className="text-gray-400 w-5 h-5" />
            )}
          </div>
        </td>
        <td className="px-3 py-2 cursor-pointer" onClick={onClick}>
          <p className="text-sm font-medium text-gray-900 truncate">{tower.towerName ?? 'Unnamed Tower'}</p>
        </td>
        <td className="px-3 py-2 text-sm text-gray-700 cursor-pointer" onClick={onClick}>
          {tower.numberOfUnits?.toLocaleString() ?? '-'}
        </td>
        <td className="px-3 py-2 text-sm text-gray-700 cursor-pointer" onClick={onClick}>
          {tower.numberOfFloors ?? '-'}
        </td>
        <td className="px-2 py-2">
          <div className="flex items-center justify-end gap-1">
            {!readOnly && (
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Delete tower"
              >
                <Icon name="trash-can" style="regular" className="size-3.5" />
              </button>
            )}
            <Icon name="chevron-right" style="solid" className="text-gray-400 w-4 h-4" />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div
      {...cardProps}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all text-left group cursor-pointer"
    >
      <div className="relative aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
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
        {!readOnly && (
          <button
            type="button"
            onClick={onDelete}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete tower"
          >
            <Icon name="trash-can" style="regular" className="size-3.5" />
          </button>
        )}
      </div>

      <div className="p-4">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {tower.towerName ?? 'Unnamed Tower'}
        </p>

        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">No. of Units</span>
            <span className="text-gray-700 font-medium">
              {tower.numberOfUnits?.toLocaleString() ?? '-'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">No. of Floors</span>
            <span className="text-gray-700 font-medium">{tower.numberOfFloors ?? '-'}</span>
          </div>
        </div>
      </div>
    </div>
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
  const readOnly = usePageReadOnly();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: towersData, isLoading, isError } = useGetProjectTowers(appraisalId ?? '');
  const { mutate: deleteTower, isPending: isDeleting } = useDeleteProjectTower();
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

  const handleDeleteConfirm = () => {
    if (readOnly || !appraisalId || !deleteTarget) return;
    deleteTower(
      { appraisalId, towerId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success(`Tower "${deleteTarget.name}" deleted`);
          setDeleteTarget(null);
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? 'Failed to delete tower');
          setDeleteTarget(null);
        },
      },
    );
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

        {!readOnly && (
          <Button variant="primary" onClick={handleAddTower} className="flex items-center gap-2">
            <Icon name="plus" />
            Add Tower
          </Button>
        )}
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
              readOnly={readOnly}
              onClick={() => handleTowerClick(tower.id)}
              onDelete={e => { e.stopPropagation(); setDeleteTarget({ id: tower.id, name: tower.towerName ?? 'this tower' }); }}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-14 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tower Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. of Units</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. of Floors</th>
                <th className="w-16 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {towers.map(tower => (
                <TowerCard
                  key={tower.id}
                  tower={tower}
                  thumbnailSrc={thumbnailByTowerId.get(tower.id)}
                  viewMode="list"
                  readOnly={readOnly}
                  onClick={() => handleTowerClick(tower.id)}
                  onDelete={e => { e.stopPropagation(); setDeleteTarget({ id: tower.id, name: tower.towerName ?? 'this tower' }); }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Tower"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
