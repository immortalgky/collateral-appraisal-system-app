import { Icon } from '@/shared/components';
import Badge from '@/shared/components/Badge';
import clsx from 'clsx';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PricingAnalysisApproachMethodSelector } from './PricingAnalysisApproachMethodSelector';
import { PropertyCardContent } from '@features/appraisal/components/PropertyCardContent';
import { ModelCardContent } from './ModelCardContent';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import type { SelectionState } from '@features/pricingAnalysis/store/selectionReducer';
import type { PropertyGroupItemDto } from '@features/appraisal/api';
import type { PricingAnalysisConfigType } from '../../schemas';
import { mapGroupItemToPropertyItem } from '@features/appraisal/hooks/useEnrichedPropertyGroups';
import type { FlatContext, ProjectModelPricingContextDto } from '../../utils/flattenPricingContext';

interface PricingAnalysisAccordionProps {
  state: SelectionState;
  appraisalId: string;
  group: {
    id: string;
    number: number;
    name: string;
    description: string;
    useSystemCalc: boolean;
    properties: PropertyGroupItemDto[];
  };
  isPricingAnalysisAccordionOpen: boolean;
  onPricingAnalysisAccordionChange: () => void;

  onEnterEdit: () => void;
  onEditModeSave: () => void;
  onCancelEditMode: () => void;
  onSummaryModeSave: () => void;
  onToggleMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCalculationMethod: (arg: { approachType: string; methodType: string }) => void;

  isConfirmDeselectedMethodOpen: boolean;
  onConfirmDeselectMethod: () => void;
  onCancelDeselectMethod: () => void;
  onSystemCalculationChange: (check: boolean) => void;
  systemCalculationMode: string;

  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateApproach: (approachType: string) => void;

  onAddMethod?: (arg: { approachType: string; methodType: string }) => void;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
  pricingConfiguration?: PricingAnalysisConfigType[];
  /** When true the left panel renders a single Model card instead of property list. */
  isModelSubject?: boolean;
  flatContext?: FlatContext;
  pricingContext?: ProjectModelPricingContextDto;
  /** Resolved thumbnail src for the project model card (projectModel subjects only). */
  modelThumbnailSrc?: string;
  deleteConfirm?: {
    isOpen: boolean;
    hasData: boolean;
    isDeleting: boolean;
    confirmDelete: () => void;
    cancelDelete: () => void;
  };
  onManualValueChange?: (arg: { approachType: string; methodType: string; value: number }) => void;
}

export const PricingAnalysisAccordion = ({
  state,
  group,
  onPricingAnalysisAccordionChange,
  isPricingAnalysisAccordionOpen,
  onSelectCalculationMethod,
  onCancelEditMode,

  onEnterEdit,
  onEditModeSave,
  onSummaryModeSave,
  onToggleMethod,

  isConfirmDeselectedMethodOpen,
  onConfirmDeselectMethod,
  onCancelDeselectMethod,
  onSystemCalculationChange,
  systemCalculationMode,

  onSelectCandidateMethod,
  onSelectCandidateApproach,

  onAddMethod,
  onDeleteMethod,
  pricingConfiguration,
  isModelSubject = false,
  flatContext,
  pricingContext,
  modelThumbnailSrc,
  deleteConfirm,
  onManualValueChange,
}: PricingAnalysisAccordionProps) => {
  /** Map group properties to PropertyItem for rendering */
  const propertyItems = useMemo(
    () =>
      (group.properties ?? [])
        .slice()
        .sort((a, b) => (a.sequenceInGroup ?? 0) - (b.sequenceInGroup ?? 0))
        .map(mapGroupItemToPropertyItem),
    [group.properties],
  );

  /** Find selected approach name for header badge */
  const selectedApproach = state.summarySelected?.find(appr => appr.isSelected);

  /** accordion effect */
  const detailInnerRef = useRef<HTMLDivElement>(null);
  const [detailMaxHeight, setDetailMaxHeight] = useState(0);
  useLayoutEffect(() => {
    const el = detailInnerRef.current;
    if (!el) return;

    const measure = () => setDetailMaxHeight(el.scrollHeight);

    const raf = requestAnimationFrame(measure);

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-2">
      {/* header */}
      <div className="grid grid-cols-12 justify-between items-center h-12">
        <div className="col-span-8 flex items-center gap-2">
          {isModelSubject ? (
            <span className="font-semibold flex items-center gap-1.5 min-w-0">
              <span className="text-gray-500 truncate">
                {flatContext?.projectName ? String(flatContext.projectName) : 'Project'}
              </span>
              <Icon name="chevron-right" style="solid" className="text-gray-300 size-3 shrink-0" />
              <span className="text-gray-900 truncate">
                {flatContext?.modelName ? String(flatContext.modelName) : 'Model'}
              </span>
            </span>
          ) : (
            <>
              <span className="font-semibold">{`Group: ${group?.number ?? ''} ${group?.name ?? ''}`}</span>
              <span className="text-sm text-gray-400">{`${group?.properties?.length ?? 0} item(s)`}</span>
            </>
          )}
          {selectedApproach && (
            <Badge
              size="xs"
              badgeStyle="soft"
              type="status"
              value="inprogress"
              dot={false}
            >
              {selectedApproach.label}
            </Badge>
          )}
        </div>
        <div className="col-span-4 flex items-center justify-end gap-1">
          <div className="flex flex-row gap-1 items-center justify-end">
            <span>
              {state.summarySelected?.find(appr => appr.isSelected)
                ? (Number(
                    state.summarySelected?.find(appr => appr.isSelected)?.appraisalValue,
                  ).toLocaleString() ?? 0)
                : 0}
            </span>
            <Icon name="baht-sign" style="light" className="size-4" />
          </div>
          <button
            type="button"
            onClick={onPricingAnalysisAccordionChange}
            className="btn btn-ghost btn-sm"
            aria-expanded={isPricingAnalysisAccordionOpen}
          >
            <Icon
              name="chevron-down"
              style="solid"
              className={clsx(
                'size-4 text-gray-400 transition-transform duration-300 ease-in-out',
                isPricingAnalysisAccordionOpen ? 'rotate-180' : 'rotate-0',
              )}
            />
          </button>
        </div>
      </div>

      {/* detail */}
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: isPricingAnalysisAccordionOpen ? detailMaxHeight : 0 }}
      >
        <div
          ref={detailInnerRef}
          className={clsx(
            'pb-4 text-gray-700 transition-opacity duration-200',
            isPricingAnalysisAccordionOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none',
          )}
        >
          <div className="flex w-full gap-0">
            {/* Left: Model card (projectModel) or Property list (propertyGroup) */}
            <div className="w-1/2 shrink-0 overflow-y-auto space-y-2 pr-3 border-r border-gray-200">
              {isModelSubject ? (
                flatContext ? (
                  <ModelCardContent
                    flat={flatContext}
                    context={pricingContext}
                    projectType={
                      pricingContext != null
                        ? pricingContext.tower != null
                          ? 'Condo'
                          : 'LandAndBuilding'
                        : undefined
                    }
                    thumbnailSrc={modelThumbnailSrc}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Icon name="layer-group" className="text-2xl mb-2" />
                    <p className="text-xs">Loading model data...</p>
                  </div>
                )
              ) : propertyItems.length > 0 ? (
                propertyItems.map(property => (
                  <div
                    key={property.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow flex"
                  >
                    <PropertyCardContent property={property} showArrow={false} size="sm" />
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Icon name="folder-open" className="text-2xl mb-2" />
                  <p className="text-xs">No properties in this group</p>
                </div>
              )}
            </div>

            {/* Right: Approach & Method Selector (50%) */}
            <div className="w-1/2 min-w-0 pl-3">
              <PricingAnalysisApproachMethodSelector
                state={state}
                isSystemCalculation={systemCalculationMode}
                onSystemCalculationChange={onSystemCalculationChange}
                onEnterEdit={onEnterEdit}
                onEditModeSave={onEditModeSave}
                onSummaryModeSave={onSummaryModeSave}
                onToggleMethod={onToggleMethod}
                onSelectCalculationMethod={onSelectCalculationMethod}
                onCancelEditMode={onCancelEditMode}
                onSelectCandidateMethod={onSelectCandidateMethod}
                onSelectCandidateApproach={onSelectCandidateApproach}
                onAddMethod={onAddMethod}
                onDeleteMethod={onDeleteMethod}
                pricingConfiguration={pricingConfiguration}
                deleteConfirm={deleteConfirm}
                onManualValueChange={onManualValueChange}
              />
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={isConfirmDeselectedMethodOpen}
        onClose={onCancelDeselectMethod}
        onConfirm={onConfirmDeselectMethod}
        message={`Are you sure? If you confirm the appraisal value of this method will be removed.`}
      />
    </div>
  );
};
