import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { PriceAnalysisApproachMethodSelector } from './PriceAnalysisApproachMethodSelector';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import type { PriceAnalysisSelectorState } from '@features/appraisal/components/priceAnalysis/features/selection/domain/useReducer.tsx';
import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Flow:
 * (1) no approach or method id
 * (2) [Editing mode] user choose approach and method under approach => save
 * (3) fire api to save data and return approach ids and method ids
 * (4) reload to [Summart mode] and query approach and method with ids
 * (5) ids will be assign to variables
 */

interface PriceAnalysisAccordionProps {
  state: PriceAnalysisSelectorState;
  appraisalId: string;
  group: {
    id: string;
    number: number;
    name: string;
    description: string;
    useSystemCalc: boolean;
    properties: Record<string, unknown>;
  };
  isPriceAnalysisAccordionOpen: boolean;
  onPriceAnalysisAccordionChange: any;

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
  onCancelPricingAccordian: () => void;

  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateApproach: (approachType: string) => void;
}

export const PriceAnalysisAccordion = ({
  state,
  appraisalId,
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
  onCancelPricingAccordian,

  onSelectCandidateMethod,
  onSelectCandidateApproach,
}: PriceAnalysisAccordionProps) => {
  /** left side panel, show collateral in the group */
  // const { groups } = usePropertyStore();
  // const group = groups.find(group => group.id === groupId) ?? null;
  // const [contextMenu, setContextMenu] = useState<ContextMenuState>({
  //   visible: false,
  //   x: 0,
  //   y: 0,
  //   property: null,
  //   groupId: null,
  // });

  /** Local state:  */

  /** api to save approach and method on editing mode */
  // const {
  //   mutate: addPriceAnalysisApproachMutate,
  //   isPending: isAddingApproach,
  //   isSuccess: isAddApproachSuccess,
  // } = useAddPriceAnalysisApproach();
  // const {
  //   mutate: addPriceAnalysisMethodMutate,
  //   isPending: isAddingMethod,
  //   isSuccess: isAddMethodSuccess,
  // } = useAddPriceAnalysisMethod();
  //
  // const isApiPending = isAddingApproach || isAddingMethod;
  // const isApiSuccess = isAddApproachSuccess && isAddMethodSuccess;

  /** accordian effect */
  const detailInnerRef = useRef<HTMLDivElement>(null);
  const [detailMaxHeight, setDetailMaxHeight] = useState(0);
  useLayoutEffect(() => {
    const el = detailInnerRef.current;
    if (!el) return;

    const measure = () => setDetailMaxHeight(el.scrollHeight);

    // measure once now (and after layout settles)
    const raf = requestAnimationFrame(measure);

    // keep it correct if content changes size (data loads, resizing panels, etc.)
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
            'px-4 pb-4 text-gray-700 transition-opacity duration-200',
            isPriceAnalysisAccordionOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none',
          )}
        >
          <Group className="flex-1 min-h-0 h-full gap-4">
            <Panel className="h-full min-h-0" minSize="20%" maxSize="40%">
              {/* {group && (
                <SortableContext
                  items={group.items.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="h-full min-h-0 overflow-y-auto space-y-2">
                    {group.items.map(property => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        groupId={group.id}
                        onContextMenu={contextMenu}
                      />
                    ))}
                  </div>
                </SortableContext>
              )} */}
            </Panel>

            <Separator>
              <div className="flex items-center justify-center w-5 h-full hover:bg-gray-50 border-gray-200 flex-shrink-0 border-r">
                <Icon name="grip-vertical" className="text-gray-400" />
              </div>
            </Separator>

            <Panel className="h-full min-h-0">
              <div className="h-full min-h-0">
                <PriceAnalysisApproachMethodSelector
                  state={state}
                  isSystemCalculation={systemCalculationMode}
                  onSystemCalculationChange={onSystemCalculationChange}
                  onEnterEdit={onEnterEdit}
                  onEditModeSave={onEditModeSave}
                  onSummaryModeSave={onSummaryModeSave}
                  onToggleMethod={onToggleMethod}
                  onSelectCalculationMethod={onSelectCalculationMethod}
                  onCancelPricingAccordian={onCancelPricingAccordian}
                  onCancelEditMode={onCancelEditMode}
                  onSelectCandidateMethod={onSelectCandidateMethod}
                  onSelectCandidateApproach={onSelectCandidateApproach}
                />
              </div>
            </Panel>
          </Group>
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
