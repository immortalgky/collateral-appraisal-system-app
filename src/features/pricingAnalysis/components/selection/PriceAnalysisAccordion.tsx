import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PriceAnalysisApproachMethodSelector } from './PriceAnalysisApproachMethodSelector';
import { PropertyCardContent } from '@features/appraisal/components/PropertyCardContent';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import type { SelectionState } from '@features/pricingAnalysis/store/selectionReducer';
import type { PropertyGroupItemDto } from '@features/appraisal/api';
import { mapGroupItemToPropertyItem } from '@features/appraisal/hooks/useEnrichedPropertyGroups';

interface PriceAnalysisAccordionProps {
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
  isPriceAnalysisAccordionOpen: boolean;
  onPriceAnalysisAccordionChange: () => void;

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
  onCancelPricingAccordion: () => void;

  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateApproach: (approachType: string) => void;
}

export const PriceAnalysisAccordion = ({
  state,
  group,
  onPriceAnalysisAccordionChange,
  isPriceAnalysisAccordionOpen,
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
  onCancelPricingAccordion,

  onSelectCandidateMethod,
  onSelectCandidateApproach,
}: PriceAnalysisAccordionProps) => {
  /** Map group properties to PropertyItem for rendering */
  const propertyItems = useMemo(
    () =>
      (group.properties ?? [])
        .slice()
        .sort((a, b) => (a.sequenceInGroup ?? 0) - (b.sequenceInGroup ?? 0))
        .map(mapGroupItemToPropertyItem),
    [group.properties],
  );

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
        <div className="col-span-8">
          <span>{`Group: ${group?.number ?? ''} ${group?.name ?? ''} ( ${group?.properties?.length ?? 0} item(s) )`}</span>
        </div>
        <div className="col-span-4 flex items-center justify-end gap-1">
          <div className="flex flex-row gap-1 items-center justify-end">
            <span>
              {state.summarySelected?.find(appr => appr.isCandidated)
                ? (Number(
                    state.summarySelected?.find(appr => appr.isCandidated)?.appraisalValue,
                  ).toLocaleString() ?? 0)
                : 0}
            </span>
            <Icon name="baht-sign" style="light" className="size-4" />
          </div>
          <button
            type="button"
            onClick={onPriceAnalysisAccordionChange}
            className="btn btn-ghost btn-sm"
            aria-expanded={isPriceAnalysisAccordionOpen}
          >
            <Icon
              name="chevron-down"
              style="solid"
              className={clsx(
                'size-4 text-gray-400 transition-transform duration-300 ease-in-out',
                isPriceAnalysisAccordionOpen ? 'rotate-180' : 'rotate-0',
              )}
            />
          </button>
        </div>
      </div>

      {/* detail */}
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: isPriceAnalysisAccordionOpen ? detailMaxHeight : 0 }}
      >
        <div
          ref={detailInnerRef}
          className={clsx(
            'pb-4 text-gray-700 transition-opacity duration-200',
            isPriceAnalysisAccordionOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none',
          )}
        >
          <div className="flex w-full gap-0">
            {/* Left: Property List (50%) */}
            <div className="w-1/2 shrink-0 overflow-y-auto space-y-2 pr-3 border-r border-gray-200">
              {propertyItems.length > 0 ? (
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
              <PriceAnalysisApproachMethodSelector
                state={state}
                isSystemCalculation={systemCalculationMode}
                onSystemCalculationChange={onSystemCalculationChange}
                onEnterEdit={onEnterEdit}
                onEditModeSave={onEditModeSave}
                onSummaryModeSave={onSummaryModeSave}
                onToggleMethod={onToggleMethod}
                onSelectCalculationMethod={onSelectCalculationMethod}
                onCancelPricingAccordion={onCancelPricingAccordion}
                onCancelEditMode={onCancelEditMode}
                onSelectCandidateMethod={onSelectCandidateMethod}
                onSelectCandidateApproach={onSelectCandidateApproach}
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
