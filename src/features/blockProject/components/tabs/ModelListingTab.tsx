import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';

import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useGetProjectModels, useDeleteProjectModel } from '../../api/projectModel';
import { useCreateProjectModelPricingAnalysis } from '../../api/projectPricingAnalysis';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useGetGalleryPhotos } from '@/features/appraisal/api/gallery';
import { toGalleryImage } from '@/features/appraisal/types/gallery';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import type { GalleryPhotoDtoType } from '@shared/schemas/v1';
import { isCondo } from '../../types';
import type { ProjectModel, ProjectType } from '../../types';
import type { ApiError } from '@/shared/types/api';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';

type AppError = AxiosError & { apiError?: ApiError };

type ViewMode = 'grid' | 'list';

// ── Formatters ────────────────────────────────────────────────────────────────

function formatAreaRange(min?: number | null, max?: number | null): string {
  if (!min && !max) return '-';
  if (min && max) return min === max ? `${min} sq.m.` : `${min} - ${max} sq.m.`;
  return `${min ?? max} sq.m.`;
}

function formatPrice(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function formatPriceRange(min?: number | null, max?: number | null): string {
  if (!min && !max) return '-';
  if (min && max)
    return min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`;
  return formatPrice(min ?? max ?? 0);
}

function formatPriceRangeFull(min?: number | null, max?: number | null): string {
  if (!min && !max) return '-';
  if (min && max)
    return min === max ? min.toLocaleString() : `${min.toLocaleString()} - ${max.toLocaleString()}`;
  return (min ?? max)?.toLocaleString() ?? '-';
}

function formatLandAreaRange(min?: number | null, max?: number | null): string {
  if (!min && !max) return '-';
  if (min && max) return min === max ? `${min} Sq.Wa` : `${min} - ${max} Sq.Wa`;
  return `${min ?? max} Sq.Wa`;
}

function formatStandardPrice(value: number | null | undefined): string | null {
  if (value == null) return null;
  return `฿${value.toLocaleString()} / sq.m.`;
}

// ── Model Card ────────────────────────────────────────────────────────────────

interface ModelCardProps {
  model: ProjectModel;
  projectType: ProjectType;
  viewMode: ViewMode;
  thumbnailSrc?: string;
  readOnly: boolean;
  onClick: () => void;
  onPricingAnalysis: () => void;
  isPricingAnalysisPending: boolean;
  onDelete: (e: React.MouseEvent) => void;
}

/** Pricing-analysis CTA. Stops propagation so the card click doesn't navigate. */
function PricingAnalysisAction({
  hasAnalysis,
  isPending,
  onClick,
  size = 'sm',
}: {
  hasAnalysis: boolean;
  isPending: boolean;
  onClick: () => void;
  size?: 'sm' | 'xs';
}) {
  const { t } = useTranslation('blockProject');
  const sizeCls = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';

  return (
    <button
      type="button"
      disabled={isPending}
      title={
        hasAnalysis
          ? t('modelListing.aria.viewPricingAnalysis')
          : t('modelListing.aria.runPricingAnalysis')
      }
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors shrink-0',
        sizeCls,
        // #4 — distinct styles: solid CTA for Run, outlined ghost for View
        hasAnalysis
          ? 'border border-primary text-primary bg-transparent hover:bg-primary/5'
          : 'bg-primary text-white hover:bg-primary/90',
        isPending && 'opacity-60 cursor-not-allowed',
      )}
    >
      {/* #1 — spinner while pending */}
      <Icon
        name={isPending ? 'circle-notch' : hasAnalysis ? 'chart-line' : 'play'}
        style="solid"
        className={clsx('size-3', isPending && 'animate-spin')}
      />
      {/* #2 — "View Pricing" instead of "Pricing" */}
      {isPending
        ? t('modelListing.running')
        : hasAnalysis
          ? t('modelListing.viewPricing')
          : t('modelListing.runPricing')}
    </button>
  );
}

function ModelCard({
  model,
  projectType,
  viewMode,
  thumbnailSrc,
  readOnly,
  onClick,
  onPricingAnalysis,
  isPricingAnalysisPending,
  onDelete,
}: ModelCardProps) {
  const { t } = useTranslation('blockProject');
  const icon = isCondo(projectType) ? 'layer-group' : 'house';
  const hasAnalysis = Boolean(model.pricingAnalysisId);
  const standardPrice = formatStandardPrice(model.finalAppraisedValue);
  const roomTypeDescription = useParameterDescription('RoomLayout', model.roomLayoutType);

  // Card-level click & keyboard handlers (replaces the outer <button>)
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
              <img
                src={thumbnailSrc}
                alt={model.modelName ?? t('modelListing.unnamedModel')}
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon name={icon} style="solid" className="text-gray-400 w-5 h-5" />
            )}
          </div>
        </td>
        <td className="px-3 py-2 cursor-pointer" onClick={onClick}>
          <p className="text-sm font-medium text-gray-900 truncate">
            {model.modelName ?? t('modelListing.unnamedModel')}
          </p>
          {model.modelDescription && (
            <p className="text-xs text-gray-500 truncate">{model.modelDescription}</p>
          )}
        </td>
        <td className="px-3 py-2 text-sm text-gray-700 cursor-pointer" onClick={onClick}>
          {formatAreaRange(model.usableAreaMin, model.usableAreaMax)}
        </td>
        {isCondo(projectType) ? (
          <>
            <td className="px-3 py-2 text-sm text-gray-700 cursor-pointer" onClick={onClick}>
              {formatPriceRangeFull(model.startingPriceMin, model.startingPriceMax)}
            </td>
            <td className="px-3 py-2 text-sm text-gray-700 cursor-pointer" onClick={onClick}>
              {roomTypeDescription || '-'}
            </td>
          </>
        ) : (
          <>
            <td className="px-3 py-2 text-sm text-gray-700 cursor-pointer" onClick={onClick}>
              {model.standardLandArea ? `${model.standardLandArea} Sq.Wa` : '-'}
            </td>
            <td className="px-3 py-2 text-sm text-gray-700 cursor-pointer" onClick={onClick}>
              {model.numberOfHouse ?? '-'}
            </td>
          </>
        )}
        <td
          className="px-3 py-2 text-sm font-semibold text-primary cursor-pointer"
          onClick={onClick}
        >
          {standardPrice ?? '-'}
        </td>
        <td className="px-2 py-2">
          <div className="flex items-center justify-end gap-1">
            {(!readOnly || hasAnalysis) && (
              <PricingAnalysisAction
                hasAnalysis={hasAnalysis}
                isPending={isPricingAnalysisPending}
                onClick={onPricingAnalysis}
                size="xs"
              />
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title={t('modelListing.aria.deleteModel')}
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
      {/* #6 — tighter 4:3 image instead of 16:9 */}
      <div className="relative aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={model.modelName ?? t('modelListing.unnamedModel')}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon
            name={icon}
            style="solid"
            className="text-gray-300 w-10 h-10 group-hover:text-gray-400 transition-colors"
          />
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={onDelete}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete model"
          >
            <Icon name="trash-can" style="regular" className="size-3.5" />
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {model.modelName ?? t('modelListing.unnamedModel')}
          </p>
          {(!readOnly || hasAnalysis) && (
            <PricingAnalysisAction
              hasAnalysis={hasAnalysis}
              isPending={isPricingAnalysisPending}
              onClick={onPricingAnalysis}
            />
          )}
        </div>

        {/* #7 — 2-col stat grid */}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">
              {t('modelListing.usableArea')}
            </p>
            <p className="text-xs font-medium text-gray-700">
              {formatAreaRange(model.usableAreaMin, model.usableAreaMax)}
            </p>
          </div>

          {isCondo(projectType) ? (
            <>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {t('modelListing.startingPrice')}
                </p>
                <p className="text-xs font-medium text-gray-700">
                  {formatPriceRange(model.startingPriceMin, model.startingPriceMax)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {t('modelListing.roomType')}
                </p>
                <p className="text-xs font-medium text-gray-700">{roomTypeDescription || '-'}</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {t('modelListing.landArea')}
                </p>
                <p className="text-xs font-medium text-gray-700">
                  {formatLandAreaRange(model.landAreaMin, model.landAreaMax)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {t('modelListing.houses')}
                </p>
                <p className="text-xs font-medium text-gray-700">{model.numberOfHouse ?? '-'}</p>
              </div>
            </>
          )}
        </div>

        {/* #4 — pricing status indicator */}
        <div className="mt-3">
          {standardPrice ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold">
              <Icon name="chart-line" style="solid" className="size-3" />
              {standardPrice}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 text-xs font-medium">
              <Icon name="clock" style="regular" className="size-3" />
              {t('modelListing.pendingAnalysis')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ModelListingTabProps {
  projectType: ProjectType;
}

export default function ModelListingTab({ projectType }: ModelListingTabProps) {
  const { t } = useTranslation('blockProject');
  const appraisalId = useAppraisalId();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const readOnly = usePageReadOnly();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: modelsData, isLoading, isError } = useGetProjectModels(appraisalId ?? '');
  const { mutate: deleteModel, isPending: isDeleting } = useDeleteProjectModel();
  const models = useMemo(
    () =>
      (Array.isArray(modelsData) ? [...modelsData] : []).sort((a, b) =>
        (a.modelName ?? '').localeCompare(b.modelName ?? '', undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      ),
    [modelsData],
  );

  const { data: galleryData } = useGetGalleryPhotos(appraisalId ?? undefined);
  const thumbnailByModelId = useMemo(() => {
    const galleryPhotos = (galleryData?.photos ?? []) as GalleryPhotoDtoType[];
    const photoById = new Map(galleryPhotos.map(p => [p.id, p]));
    const map = new Map<string, string>();
    for (const model of models) {
      const cover = model.images?.find(i => i.isThumbnail);
      const photo = cover && photoById.get(cover.galleryPhotoId);
      if (photo) map.set(model.id, toGalleryImage(photo).thumbnailSrc);
    }
    return map;
  }, [galleryData, models]);

  const routeSegment = isCondo(projectType) ? 'block-condo' : 'block-village';

  const {
    mutate: createPricingAnalysis,
    isPending: isCreatingPricingAnalysis,
    variables: pricingMutationVars,
  } = useCreateProjectModelPricingAnalysis();

  const handleModelClick = (modelId: string) => {
    navigate(`${basePath}/${routeSegment}/model/${modelId}`);
  };

  const handleAddModel = () => {
    navigate(`${basePath}/${routeSegment}/model/new`);
  };

  const handleDeleteConfirm = () => {
    if (readOnly || !appraisalId || !deleteTarget) return;
    deleteModel(
      { appraisalId, modelId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success(t('toasts.model.deleteSuccess'));
          setDeleteTarget(null);
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? t('toasts.model.deleteFailed'));
          setDeleteTarget(null);
        },
      },
    );
  };

  const handlePricingAnalysis = (model: ProjectModel) => {
    if (model.pricingAnalysisId) {
      navigate(
        `${basePath}/${routeSegment}/model/${model.id}/pricing-analysis/${model.pricingAnalysisId}`,
      );
      return;
    }
    if (readOnly || !appraisalId) return;
    createPricingAnalysis(
      { appraisalId, modelId: model.id },
      {
        onSuccess: data => {
          if (!data?.id) {
            toast.error(t('toasts.model.pricingNoId'));
            return;
          }
          navigate(`${basePath}/${routeSegment}/model/${model.id}/pricing-analysis/${data.id}`);
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? t('toasts.model.pricingCreateFailed'));
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
          {[1, 2, 3, 4].map(i => (
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
        <p className="text-sm font-medium text-red-500">{t('modelListing.failedToLoad')}</p>
        <p className="text-xs text-red-400 mt-1">{t('modelListing.failedToLoadHint')}</p>
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
            <span>{t('modelListing.grid')}</span>
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
            <span>{t('modelListing.list')}</span>
          </button>
        </div>

        {!readOnly && (
          <Button variant="primary" onClick={handleAddModel} className="flex items-center gap-2">
            <Icon name="plus" />
            {t('modelListing.addModel')}
          </Button>
        )}
      </div>

      {/* Model List */}
      {models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Icon name={isCondo(projectType) ? 'layer-group' : 'house'} className="text-4xl mb-3" />
          <p className="text-sm font-medium text-gray-500">{t('modelListing.noModels')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('modelListing.noModelsHint')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto">
          {models.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              projectType={projectType}
              thumbnailSrc={thumbnailByModelId.get(model.id)}
              viewMode="grid"
              readOnly={readOnly}
              onClick={() => handleModelClick(model.id)}
              onPricingAnalysis={() => handlePricingAnalysis(model)}
              isPricingAnalysisPending={
                isCreatingPricingAnalysis && pricingMutationVars?.modelId === model.id
              }
              onDelete={e => {
                e.stopPropagation();
                setDeleteTarget({ id: model.id, name: model.modelName ?? 'this model' });
              }}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-14 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('modelListing.cols.image')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('modelListing.cols.modelName')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('modelListing.cols.usableArea')}
                </th>
                {isCondo(projectType) ? (
                  <>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('modelListing.cols.startingPrice')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('modelListing.cols.roomType')}
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('modelListing.cols.landAreaStd')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('modelListing.cols.houses')}
                    </th>
                  </>
                )}
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('modelListing.cols.standardPrice')}
                </th>
                <th className="w-28 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {models.map(model => (
                <ModelCard
                  key={model.id}
                  model={model}
                  projectType={projectType}
                  thumbnailSrc={thumbnailByModelId.get(model.id)}
                  viewMode="list"
                  readOnly={readOnly}
                  onClick={() => handleModelClick(model.id)}
                  onPricingAnalysis={() => handlePricingAnalysis(model)}
                  isPricingAnalysisPending={
                    isCreatingPricingAnalysis && pricingMutationVars?.modelId === model.id
                  }
                  onDelete={e => {
                    e.stopPropagation();
                    setDeleteTarget({ id: model.id, name: model.modelName ?? 'this model' });
                  }}
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
        title={t('dialogs.deleteModelListing.title')}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText={t('dialogs.deleteModelListing.confirm')}
        isLoading={isDeleting}
      />
    </div>
  );
}
