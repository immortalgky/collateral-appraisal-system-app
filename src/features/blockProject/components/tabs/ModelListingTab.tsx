import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import type { AxiosError } from 'axios';

import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { useGetProjectModels } from '../../api/projectModel';
import { useCreateProjectModelPricingAnalysis } from '../../api/projectPricingAnalysis';
import { useGetGalleryPhotos } from '@/features/appraisal/api/gallery';
import { toGalleryImage } from '@/features/appraisal/types/gallery';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import type { GalleryPhotoDtoType } from '@shared/schemas/v1';
import type { ProjectModel, ProjectType } from '../../types';
import type { ApiError } from '@/shared/types/api';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';

type AppError = AxiosError & { apiError?: ApiError };

type ViewMode = 'grid' | 'list';

// ── Formatters ────────────────────────────────────────────────────────────────

function formatAreaRange(min?: number | null, max?: number | null): string {
  if (!min && !max) return '-';
  if (min && max) return `${min} - ${max} sq.m.`;
  return `${min ?? max} sq.m.`;
}

function formatPriceRange(min?: number | null, max?: number | null): string {
  if (!min && !max) return '-';
  if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()}`;
  return (min ?? max)?.toLocaleString() ?? '-';
}

function formatLandAreaRange(min?: number | null, max?: number | null): string {
  if (!min && !max) return '-';
  if (min && max) return `${min} - ${max} sq.wa`;
  return `${min ?? max} sq.wa`;
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
  onClick: () => void;
  onPricingAnalysis: () => void;
  isPricingAnalysisPending: boolean;
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
  const sizeCls = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors shrink-0',
        sizeCls,
        hasAnalysis
          ? 'bg-primary/10 text-primary hover:bg-primary/15'
          : 'bg-primary text-white hover:bg-primary/90',
        isPending && 'opacity-60 cursor-not-allowed',
      )}
    >
      <Icon name={hasAnalysis ? 'chart-line' : 'play'} style="solid" className="size-3" />
      {hasAnalysis ? 'Pricing' : 'Run Pricing'}
    </button>
  );
}

function ModelCard({
  model,
  projectType,
  viewMode,
  thumbnailSrc,
  onClick,
  onPricingAnalysis,
  isPricingAnalysisPending,
}: ModelCardProps) {
  const icon = projectType === 'Condo' ? 'layer-group' : 'house';
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
      <div
        {...cardProps}
        className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all text-left cursor-pointer"
      >
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt={model.modelName ?? 'Model thumbnail'}
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon name={icon} style="solid" className="text-gray-400 w-7 h-7" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {model.modelName ?? 'Unnamed Model'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {model.modelDescription ?? '-'}
          </p>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-400">Usable Area</p>
            <p className="text-sm font-medium text-gray-700">
              {formatAreaRange(model.usableAreaMin, model.usableAreaMax)}
            </p>
          </div>

          {projectType === 'Condo' && (
            <>
              <div className="text-right">
                <p className="text-xs text-gray-400">Price</p>
                <p className="text-sm font-medium text-gray-700">
                  {formatPriceRange(model.startingPriceMin, model.startingPriceMax)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Room Type</p>
                <p className="text-sm font-medium text-gray-700">{roomTypeDescription || '-'}</p>
              </div>
            </>
          )}

          {projectType === 'LandAndBuilding' && (
            <>
              <div className="text-right">
                <p className="text-xs text-gray-400">Land Area (Std)</p>
                <p className="text-sm font-medium text-gray-700">
                  {model.standardLandArea ? `${model.standardLandArea} sq.wa` : '-'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Houses</p>
                <p className="text-sm font-medium text-gray-700">{model.numberOfHouse ?? '-'}</p>
              </div>
            </>
          )}

          {standardPrice && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Standard Price</p>
              <p className="text-sm font-semibold text-primary">{standardPrice}</p>
            </div>
          )}
        </div>

        <PricingAnalysisAction
          hasAnalysis={hasAnalysis}
          isPending={isPricingAnalysisPending}
          onClick={onPricingAnalysis}
        />

        <Icon name="chevron-right" style="solid" className="text-gray-400 w-4 h-4 shrink-0" />
      </div>
    );
  }

  return (
    <div
      {...cardProps}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all text-left group cursor-pointer"
    >
      <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={model.modelName ?? 'Model thumbnail'}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon
            name={icon}
            style="solid"
            className="text-gray-300 w-10 h-10 group-hover:text-gray-400 transition-colors"
          />
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {model.modelName ?? 'Unnamed Model'}
          </p>
          <PricingAnalysisAction
            hasAnalysis={hasAnalysis}
            isPending={isPricingAnalysisPending}
            onClick={onPricingAnalysis}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">
          {model.modelDescription ?? '-'}
        </p>

        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Usable Area</span>
            <span className="text-gray-700 font-medium">
              {formatAreaRange(model.usableAreaMin, model.usableAreaMax)}
            </span>
          </div>

          {projectType === 'Condo' && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Starting Price</span>
                <span className="text-gray-700 font-medium">
                  {formatPriceRange(model.startingPriceMin, model.startingPriceMax)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Room Type</span>
                <span className="text-gray-700 font-medium">{roomTypeDescription || '-'}</span>
              </div>
            </>
          )}

          {projectType === 'LandAndBuilding' && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Land Area</span>
                <span className="text-gray-700 font-medium">
                  {formatLandAreaRange(model.landAreaMin, model.landAreaMax)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Houses</span>
                <span className="text-gray-700 font-medium">{model.numberOfHouse ?? '-'}</span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Standard Price</span>
            {standardPrice ? (
              <span className="text-gray-700 font-medium">{standardPrice}</span>
            ) : (
              <span className="text-gray-400 italic">Pending analysis</span>
            )}
          </div>
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
  const appraisalId = useAppraisalId();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const { data: modelsData, isLoading, isError } = useGetProjectModels(appraisalId ?? '');
  const models = useMemo(
    () =>
      (Array.isArray(modelsData) ? [...modelsData] : []).sort((a, b) =>
        (a.modelName ?? '').localeCompare(b.modelName ?? '', undefined, { numeric: true, sensitivity: 'base' }),
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

  const routeSegment = projectType === 'Condo' ? 'block-condo' : 'block-village';

  const { mutate: createPricingAnalysis, isPending: isCreatingPricingAnalysis, variables: pricingMutationVars } =
    useCreateProjectModelPricingAnalysis();

  const handleModelClick = (modelId: string) => {
    navigate(`${basePath}/${routeSegment}/model/${modelId}`);
  };

  const handleAddModel = () => {
    navigate(`${basePath}/${routeSegment}/model/new`);
  };

  const handlePricingAnalysis = (model: ProjectModel) => {
    if (model.pricingAnalysisId) {
      navigate(
        `${basePath}/${routeSegment}/model/${model.id}/pricing-analysis/${model.pricingAnalysisId}`,
      );
      return;
    }
    if (!appraisalId) return;
    createPricingAnalysis(
      { appraisalId, modelId: model.id },
      {
        onSuccess: data => {
          if (!data?.id) {
            toast.error('No pricing analysis ID returned from server');
            return;
          }
          navigate(
            `${basePath}/${routeSegment}/model/${model.id}/pricing-analysis/${data.id}`,
          );
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? 'Failed to create pricing analysis');
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
        <p className="text-sm font-medium text-red-500">Failed to load models</p>
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

        <Button variant="primary" onClick={handleAddModel} className="flex items-center gap-2">
          <Icon name="plus" />
          Add Model
        </Button>
      </div>

      {/* Model List */}
      {models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Icon
            name={projectType === 'Condo' ? 'layer-group' : 'house'}
            className="text-4xl mb-3"
          />
          <p className="text-sm font-medium text-gray-500">No models yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Model" to create your first model</p>
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
              onClick={() => handleModelClick(model.id)}
              onPricingAnalysis={() => handlePricingAnalysis(model)}
              isPricingAnalysisPending={
                isCreatingPricingAnalysis && pricingMutationVars?.modelId === model.id
              }
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto">
          {models.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              projectType={projectType}
              thumbnailSrc={thumbnailByModelId.get(model.id)}
              viewMode="list"
              onClick={() => handleModelClick(model.id)}
              onPricingAnalysis={() => handlePricingAnalysis(model)}
              isPricingAnalysisPending={
                isCreatingPricingAnalysis && pricingMutationVars?.modelId === model.id
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
