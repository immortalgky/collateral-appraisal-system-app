import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { useGetCondoModels } from '../../api/condoModel';
import type { CondoModel } from '../../types';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';

type ViewMode = 'grid' | 'list';

function formatPriceRange(min?: number | null, max?: number | null): string {
  if (!min && !max) return '-';
  if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()}`;
  return (min ?? max)?.toLocaleString() ?? '-';
}

function formatAreaRange(min?: number | null, max?: number | null): string {
  if (!min && !max) return '-';
  if (min && max) return `${min} - ${max} sq.m.`;
  return `${(min ?? max)} sq.m.`;
}

// ==================== Model Card ====================

interface ModelCardProps {
  model: CondoModel;
  viewMode: ViewMode;
  onClick: () => void;
}

function ModelCard({ model, viewMode, onClick }: ModelCardProps) {
  if (viewMode === 'list') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all text-left"
      >
        {/* Thumbnail placeholder */}
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <Icon name="layer-group" style="solid" className="text-gray-400 w-7 h-7" />
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
            <p className="text-xs text-gray-400">Area</p>
            <p className="text-sm font-medium text-gray-700">
              {formatAreaRange(model.usableAreaMin, model.usableAreaMax)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Price</p>
            <p className="text-sm font-medium text-gray-700">
              {formatPriceRange(model.startingPriceMin, model.startingPriceMax)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Room Type</p>
            <p className="text-sm font-medium text-gray-700">{model.roomLayoutType ?? '-'}</p>
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
      {/* Image area */}
      <div className="aspect-video bg-gray-100 flex items-center justify-center">
        <Icon
          name="layer-group"
          style="solid"
          className="text-gray-300 w-10 h-10 group-hover:text-gray-400 transition-colors"
        />
      </div>

      <div className="p-4">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {model.modelName ?? 'Unnamed Model'}
        </p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">
          {model.modelDescription ?? '-'}
        </p>

        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Area</span>
            <span className="text-gray-700 font-medium">
              {formatAreaRange(model.usableAreaMin, model.usableAreaMax)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Starting Price</span>
            <span className="text-gray-700 font-medium">
              {formatPriceRange(model.startingPriceMin, model.startingPriceMax)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Room Type</span>
            <span className="text-gray-700 font-medium">{model.roomLayoutType ?? '-'}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ==================== Main Component ====================

export default function ModelListingTab() {
  const appraisalId = useAppraisalId();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const { data: modelsData, isLoading, isError } = useGetCondoModels(appraisalId ?? '');
  const models = Array.isArray(modelsData) ? modelsData : Array.isArray(modelsData?.models) ? modelsData.models : [];

  const handleModelClick = (modelId: string) => {
    navigate(`${basePath}/block-condo/model/${modelId}`);
  };

  const handleAddModel = () => {
    navigate(`${basePath}/block-condo/model/new`);
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
        {/* View Mode Toggle */}
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
          <Icon name="layer-group" className="text-4xl mb-3" />
          <p className="text-sm font-medium text-gray-500">No models yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Model" to create your first model</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto">
          {models.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              viewMode="grid"
              onClick={() => handleModelClick(model.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto">
          {models.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              viewMode="list"
              onClick={() => handleModelClick(model.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
