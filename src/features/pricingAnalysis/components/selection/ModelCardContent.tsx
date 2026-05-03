import Icon from '@shared/components/Icon';
import type { FlatContext } from '../../utils/flattenPricingContext';
import type { ProjectModelPricingContextDto } from '../../utils/flattenPricingContext';

type ProjectType = 'Condo' | 'LandAndBuilding';

interface ModelCardContentProps {
  flat: FlatContext;
  context?: ProjectModelPricingContextDto;
  /**
   * Explicit project type. When provided, used directly instead of inferring
   * from context.tower — avoids a layout flash during context loading.
   */
  projectType?: ProjectType;
  /** Resolved gallery thumbnail URL for the model. Falls back to the icon when absent. */
  thumbnailSrc?: string;
}

function formatAreaRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null && max == null) return '-';
  if (min != null && max != null) return `${min} - ${max} sq.m.`;
  return `${min ?? max} sq.m.`;
}

function formatPriceRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min == null && max == null) return '-';
  if (min != null && max != null) return `${min.toLocaleString()} - ${max.toLocaleString()}`;
  return (min ?? max)!.toLocaleString();
}

/** Row of label (left) + value (right) — matches ModelListingTab card. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  );
}

/**
 * Read-only Model card for projectModel pricing analysis subjects.
 * Mirrors the model card on ModelListingTab.
 * Displayed inside PricingAnalysisAccordion instead of the propertyItems list.
 */
export function ModelCardContent({ flat, context, projectType, thumbnailSrc }: ModelCardContentProps) {
  // Prefer the explicit prop; fall back to inferring from tower presence.
  const resolvedProjectType: ProjectType | undefined =
    projectType ?? (context != null ? (context.tower != null ? 'Condo' : 'LandAndBuilding') : undefined);

  if (resolvedProjectType == null) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <span className="text-xs">Loading model data...</span>
      </div>
    );
  }

  const isCondo = resolvedProjectType === 'Condo';
  const icon = isCondo ? 'layer-group' : 'house';

  const usableArea = formatAreaRange(
    typeof flat.usableAreaMin === 'number' ? flat.usableAreaMin : null,
    typeof flat.usableAreaMax === 'number' ? flat.usableAreaMax : null,
  );
  const startingPrice = formatPriceRange(
    typeof flat.startingPriceMin === 'number' ? flat.startingPriceMin : null,
    typeof flat.startingPriceMax === 'number' ? flat.startingPriceMax : null,
  );
  const roomType = flat.roomLayoutType ? String(flat.roomLayoutType) : '-';
  const landArea =
    typeof flat.landAreaSquareWa === 'number' ? `${flat.landAreaSquareWa} sq.wa` : '-';
  const utilization = flat.utilizationType ? String(flat.utilizationType) : '-';

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={flat.modelName ? String(flat.modelName) : 'Model thumbnail'}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon name={icon} style="solid" className="text-gray-300 w-10 h-10" />
        )}
      </div>

      <div className="p-4">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {flat.modelName ? String(flat.modelName) : 'Unnamed Model'}
        </p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">-</p>

        <div className="mt-3 space-y-1">
          <Row label="Usable Area" value={usableArea} />
          {isCondo ? (
            <>
              <Row label="Starting Price" value={startingPrice} />
              <Row label="Room Type" value={roomType} />
            </>
          ) : (
            <>
              <Row label="Land Area" value={landArea} />
              <Row label="Utilization" value={utilization} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
