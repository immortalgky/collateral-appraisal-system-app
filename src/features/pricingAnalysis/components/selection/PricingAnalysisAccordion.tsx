import clsx from 'clsx';
import { useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PricingAnalysisApproachMethodSelector } from './PricingAnalysisApproachMethodSelector';
import { PricingAnalysisPropertyRail } from './PricingAnalysisPropertyRail';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import type { SelectionState } from '@features/pricingAnalysis/store/selectionReducer';
import type { PropertyGroupItemDto } from '@features/appraisal/api';
import type { PricingAnalysisConfigType } from '../../schemas';
import type { ManualCostBreakdownContext, MethodRole } from '../../types/selection';
import type { MethodKey } from '../../hooks/useSelectionActions';
import type { FlatContext, ProjectModelPricingContextDto } from '../../utils/flattenPricingContext';
import { ServerDataCtx } from '../../store/selectionContext';

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
  onSummaryModeSave: (
    pdfFiles: File[],
    remark: string,
  ) =>
    | { success: boolean; failedFileNames: string[] }
    | Promise<{ success: boolean; failedFileNames: string[] }>;
  isSummarySaving?: boolean;
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
  /** See PricingAnalysisApproachMethodSelector — threaded to the board's per-approach popover. */
  onAddMethods?: (picks: MethodKey[]) => Promise<{ succeeded: MethodKey[]; failed: MethodKey[] }>;
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
  onManualValueSync?: (arg: {
    approachType: string;
    methodType: string;
    value: number;
    methodId?: string;
  }) => void;
  /** Present only for the Cost approach in manual mode — see ManualCostBreakdown. */
  manualCostBreakdown?: ManualCostBreakdownContext;
  onSelectMethodRole?: (arg: { approachType: string; methodType: string; role: MethodRole }) => void;
  onManualNoteSync?: (arg: {
    approachType: string;
    methodType: string;
    remark: string;
    methodId?: string;
  }) => void;
  onRequestRemoveDocument?: (documentEntryId: string, fileName?: string | null) => void;
  removeDocumentConfirm?: {
    isOpen: boolean;
    pending: { documentEntryId: string; fileName?: string | null } | null;
    confirmRemove: () => void;
    cancelRemove: () => void;
    isRemoving: boolean;
  };
}

export const PricingAnalysisAccordion = ({
  state,
  group,
  // No longer called from here — its button was removed (see the comment above the detail
  // panel). Still part of the contract with PricingAnalysisPage; flagged to the team lead
  // rather than deleted. Underscore-prefixed only to satisfy noUnusedParameters.
  onPricingAnalysisAccordionChange: _onPricingAnalysisAccordionChange,
  isPricingAnalysisAccordionOpen,
  onSelectCalculationMethod,
  onCancelEditMode,

  onEnterEdit,
  onEditModeSave,
  onSummaryModeSave,
  isSummarySaving,
  onToggleMethod,

  isConfirmDeselectedMethodOpen,
  onConfirmDeselectMethod,
  onCancelDeselectMethod,
  onSystemCalculationChange,
  systemCalculationMode,

  onSelectCandidateMethod,
  onSelectCandidateApproach,

  onAddMethod,
  onAddMethods,
  onDeleteMethod,
  pricingConfiguration,
  isModelSubject = false,
  deleteConfirm,
  onManualValueSync,
  onSelectMethodRole,
  onManualNoteSync,
  manualCostBreakdown,
  onRequestRemoveDocument,
  removeDocumentConfirm,
}: PricingAnalysisAccordionProps) => {
  const { t } = useTranslation('pricingAnalysis');
  const serverData = useContext(ServerDataCtx);

  /** Flatten all methods across all summary approaches for the references section label lookup */
  const groupMethods = useMemo(
    () =>
      (state.summarySelected ?? []).flatMap(approach =>
        (approach.methods ?? []).map(m => ({
          id: m.id,
          methodType: m.methodType,
          label: m.label,
        })),
      ),
    [state.summarySelected],
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

  /**
   * maxHeight can only drive the open animation — it must be released once that finishes.
   * Holding it pinned to the content's own height gave every descendant exactly as much room
   * as it needed, so the rail's and the board's `overflow-y-auto` never had anything to
   * scroll and the board's sticky header had nothing to stick to. Worse, pairing it with
   * `h-full` on the child created a measurement feedback loop — child fills the box, its
   * scrollHeight drops, the ResizeObserver shrinks maxHeight, repeat — which collapsed both
   * columns to 3px. Releasing it breaks that loop and lets flex hand down a real height.
   * The cost is that collapsing no longer animates (`none` → `0` has nothing to tween);
   * expanding still does, and the collapse only happens on CALCULATION_ENTER, where the
   * content is being swapped out anyway.
   */
  const [isExpanded, setIsExpanded] = useState(isPricingAnalysisAccordionOpen);
  useLayoutEffect(() => {
    if (!isPricingAnalysisAccordionOpen) {
      setIsExpanded(false);
      return;
    }
    const id = setTimeout(() => setIsExpanded(true), 300);
    return () => clearTimeout(id);
  }, [isPricingAnalysisAccordionOpen]);

  return (
    <div className="flex flex-col min-h-0">
      {/* No manual collapse toggle — the mock has no equivalent of this in-place collapse
          (mock's .work, mock:259, is always expanded), so the visible control was removed.
          The collapse mechanism itself stays: PricingAnalysisPage still drives
          isPricingAnalysisAccordionOpen programmatically, closing this
          (isPricingAnalysisAccordionOpen=false) on CALCULATION_ENTER to make room for a
          BC/MC/LH method's inline calculation board below, and reopening it on cancel. */}

      {/* detail — rail + board, siblings owning the screen per the mock's .work (mock:259):
          no card, no border box around either. */}
      <div
        className={clsx(
          'overflow-hidden transition-[max-height] duration-300 ease-in-out',
          // Once expanded, take the space that is left instead of the content's own height —
          // that is what gives the rail and the board a bounded height to scroll inside.
          isExpanded && 'flex-1 min-h-0',
        )}
        style={{
          maxHeight: isExpanded ? undefined : isPricingAnalysisAccordionOpen ? detailMaxHeight : 0,
        }}
      >
        <div
          ref={detailInnerRef}
          // Faded out, not unmounted — `inert` keeps Tab off controls nobody can see.
          inert={!isPricingAnalysisAccordionOpen}
          className={clsx(
            'flex pb-4 text-gray-700 transition-opacity duration-200',
            // Fill the box rather than growing past it, so each column scrolls its own
            // section — the rail stays pinned while its list scrolls, and the board keeps
            // its header in place (mock:259's `.work`, two siblings owning the screen).
            isExpanded && 'h-full min-h-0',
            isPricingAnalysisAccordionOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none',
          )}
        >
          <PricingAnalysisPropertyRail />
          <div className="flex-1 min-w-0 pl-3">
            <PricingAnalysisApproachMethodSelector
              state={state}
              isSystemCalculation={systemCalculationMode}
              onSystemCalculationChange={onSystemCalculationChange}
              onEnterEdit={onEnterEdit}
              onEditModeSave={onEditModeSave}
              onSummaryModeSave={onSummaryModeSave}
              isSummarySaving={isSummarySaving}
              onToggleMethod={onToggleMethod}
              onSelectCalculationMethod={onSelectCalculationMethod}
              onCancelEditMode={onCancelEditMode}
              onSelectCandidateMethod={onSelectCandidateMethod}
              onSelectCandidateApproach={onSelectCandidateApproach}
              onAddMethod={onAddMethod}
              onAddMethods={onAddMethods}
              onDeleteMethod={onDeleteMethod}
              pricingConfiguration={pricingConfiguration}
              deleteConfirm={deleteConfirm}
              onManualValueSync={onManualValueSync}
              onSelectMethodRole={onSelectMethodRole}
              onManualNoteSync={onManualNoteSync}
              manualCostBreakdown={manualCostBreakdown}
              onRequestRemoveDocument={onRequestRemoveDocument}
              removeDocumentConfirm={removeDocumentConfirm}
              // References band — folded into the board's own <table> as its last group of
              // rows (see PricingAnalysisMethodBoard), not a separate section below it.
              // propertyGroup subjects only, same gate the old standalone section used.
              references={
                !isModelSubject && state.pricingAnalysisId
                  ? {
                      pricingAnalysisId: state.pricingAnalysisId,
                      groupMethods,
                      groupProperties: group.properties ?? [],
                      marketSurveys: serverData?.marketSurveyDetails ?? [],
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={isConfirmDeselectedMethodOpen}
        onClose={onCancelDeselectMethod}
        onConfirm={onConfirmDeselectMethod}
        message={t('confirm.deselectMethod')}
      />
    </div>
  );
};
