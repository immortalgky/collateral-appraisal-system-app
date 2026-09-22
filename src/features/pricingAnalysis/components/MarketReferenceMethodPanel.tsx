/**
 * MarketReferenceMethodPanel
 *
 * Hosts the WQS / SAG / DC panel for a single reference PricingAnalysis method.
 * The panel is opened from MarketReferenceModal when the user clicks "Open" on a
 * reference row, or right after CreateOrGetReference returns on the first add.
 *
 * The panel is wrapped in a minimal ServerDataCtx.Provider so the existing
 * MarketSurveySelectionModal (which reads that context for subject-pin data) works
 * without changes.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Icon } from '@/shared/components';
import { WQSPanel } from './WQSPanel';
import { SaleAdjustmentGridPanel } from './SaleAdjustmentGridPanel';
import { DirectComparisonPanel } from './DirectComparisonPanel';
import { ServerDataCtx } from '../store/selectionContext';
import {
  useGetPricingAnalysis,
  useGetComparativeFactors,
  useGetAllFactors,
  useAddPricingAnalysisMethod,
} from '../api';
import type { MarketComparableDetailType, FactorDataType } from '../schemas';
import type { TemplateDtoType } from '@/shared/schemas/v1';
import { PricingAnalysisSubjectType as SubjectType, normalizeSubjectType } from '../api/references';
import { useGetComparativeAnalysisTemplates } from '@features/templateManagement/api/comparativeTemplate';
import { mapToServerMethodType } from '../store/saveEditingSelection';
import type { PricingServerData } from '../types/selection';

// The reference panel works only within the Market approach. Methods are picked/displayed
// using the FE composite codes (WQS_MARKET/SAG_MARKET/DC_MARKET — what MethodSectionRenderer and
// the WQS/SAG/DC panels switch on), but the backend stores/returns the canonical method type
// (WQS/SaleGrid/DirectComparison). Map server → composite on read; mapToServerMethodType (composite
// → server) on add.
const SERVER_TO_MARKET_COMPOSITE: Record<string, string> = {
  WQS: 'WQS_MARKET',
  SaleGrid: 'SAG_MARKET',
  DirectComparison: 'DC_MARKET',
};

function toMarketComposite(methodType: string | undefined): string | undefined {
  if (!methodType) return methodType;
  return SERVER_TO_MARKET_COMPOSITE[methodType] ?? methodType;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarketReferenceMethodPanelProps {
  /** The reference PricingAnalysis id */
  pricingAnalysisId: string;
  /** SubjectType — used to determine manualSubject mode */
  subjectType?: import('../api/references').PricingAnalysisSubjectType;
  /** Market surveys available for this appraisal — passed down from parent */
  marketSurveys: MarketComparableDetailType[];
  /** Template list for WQS/SAG/DC selectors */
  templateList: TemplateDtoType[] | undefined;
  /**
   * Subject property (auto-fill mode: machinery-detail / land-detail).
   *
   * Only MachineryCostRef has one, and only a caller that already holds the reference row can
   * fetch it — the full-page route reaches this panel from a URL alone, so it passes nothing and
   * the machinery auto-fill column stays empty there. Every other kind is manualSubject anyway.
   */
  subjectProperty?: Record<string, unknown>;
  /** Called when user clicks back */
  onBack: () => void;
  /**
   * Render this panel's own back button. True inside MarketReferenceModal, where back means
   * "return to the reference list" and nothing else on screen offers it. False on the full-page
   * route, where the page header already carries a back button wired to the same onBack — two
   * of them, one above the other, is what the first full-page version shipped.
   */
  showBack?: boolean;
}

// Stable server data — minimal shape required by MarketSurveySelectionModal and the
// scoring sub-sections (WQS/SAG/DC), which read the master factor list from `serverData.allFactors`
// to resolve factor names. allFactors MUST be threaded in or the Factors column renders blank.
function buildServerData(
  marketSurveys: MarketComparableDetailType[],
  subjectProperty: Record<string, unknown> | undefined,
  allFactors: FactorDataType[] | undefined,
): PricingServerData {
  return {
    groupDetail: undefined,
    properties: subjectProperty ? [subjectProperty] : [],
    propertiesMap:
      subjectProperty && (subjectProperty.propertyId as string)
        ? { [subjectProperty.propertyId as string]: subjectProperty }
        : {},
    marketSurveyDetails: marketSurveys,
    allFactors,
    pricingConfiguration: undefined,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MarketReferenceMethodPanel({
  pricingAnalysisId,
  subjectType,
  marketSurveys,
  templateList,
  subjectProperty,
  onBack,
  showBack = true,
}: MarketReferenceMethodPanelProps) {
  const { t } = useTranslation('pricingAnalysis');

  // Fetch the pricing analysis to get approaches and methods
  const { data: pricingAnalysis, isLoading: isLoadingAnalysis } =
    useGetPricingAnalysis(pricingAnalysisId);

  // A deep link (?ref=<id>) reaches this panel with no subjectType prop — nothing has loaded the
  // reference list it would have come from. The analysis carries its own, serialized as the enum's
  // string name, so normalize it. Falls back to PropertyGroup (0), which keeps manualSubject true:
  // the safe direction, since only MachineryCostRef must be false.
  const resolvedSubjectType =
    subjectType ?? normalizeSubjectType((pricingAnalysis as any)?.subjectType);

  // manualSubject=true for every reference kind with no backing property row to price against.
  //
  // Only MachineryCostRef has one (its anchor IS a property, and callers fetch machinery-detail
  // for it) — the land-value kinds anchor to a method's analysis, and every caller consequently
  // passes `subjectProperty: undefined` for them. Leaving them out meant WQSPanel's
  // `isLoading = !manualSubject && !property` never cleared, so its whole body stayed switched
  // off: the reference opened as an empty panel with no table and no inputs, from any entry
  // point that reached it. Being explicit about the one kind that HAS a property, rather than
  // listing the ones that don't, is what stops the next kind added here from inheriting that.
  const manualSubject = resolvedSubjectType !== SubjectType.MachineryCostRef;

  // Not every caller threads the WQS/SAG/DC comparative template list down to here — a deep link
  // has none, and the DCF / room-income flow passes undefined — which leaves the in-panel Template
  // dropdown permanently empty. Fall back to fetching it: same cached query, so callers that do
  // provide it pay nothing.
  const { data: fetchedTemplateList = [] } = useGetComparativeAnalysisTemplates(
    !(templateList && templateList.length > 0),
  );
  const resolvedTemplateList =
    templateList && templateList.length > 0 ? templateList : fetchedTemplateList;

  const allFactorsQuery = useGetAllFactors();

  // The Market approach — there should be exactly one (created by CreateOrGetReference)
  const marketApproach =
    (pricingAnalysis?.approaches ?? []).find(
      (a: any) => a.approachType === 'Market' || a.type === 'Market',
    ) ?? (pricingAnalysis?.approaches ?? [])[0];
  const marketApproachId: string = marketApproach?.id ?? '';
  const methods: any[] = marketApproach?.methods ?? [];
  const [activeMethodId, setActiveMethodId] = useState<string | null>(null);

  // Once methods load, default to first method if none selected
  useEffect(() => {
    if (methods.length > 0 && !activeMethodId) {
      setActiveMethodId(methods[0].id);
    }
  }, [methods, activeMethodId]);

  const addMethodMutation = useAddPricingAnalysisMethod();

  const activeMethod = methods.find((m: any) => m.id === activeMethodId);

  // Fetch comparative factors for the active method
  const { data: comparativeFactors } = useGetComparativeFactors(
    activeMethodId ? pricingAnalysisId : undefined,
    activeMethodId ?? undefined,
  );

  const handleAddMethod = async (methodType: 'WQS_MARKET' | 'SAG_MARKET' | 'DC_MARKET') => {
    try {
      await addMethodMutation.mutateAsync({
        pricingAnalysisId,
        approachId: marketApproachId,
        // Send the canonical server method type (WQS/SaleGrid/DirectComparison), not the composite.
        request: { methodType: mapToServerMethodType(methodType), status: null },
      });
    } catch {
      toast.error(t('toasts.saveFailed'));
    }
  };

  const noop = useCallback(() => {}, []);

  // Minimal server data for context
  const serverData = buildServerData(marketSurveys, subjectProperty, allFactorsQuery.data);

  if (isLoadingAnalysis) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // No methods yet — offer to add one
  if (methods.length === 0) {
    return (
      <ServerDataCtx.Provider value={serverData}>
        <div className="flex flex-col gap-4">
          {showBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors self-start"
            >
              <Icon name="arrow-left" className="size-3.5" />
              {t('marketRef.backToList')}
            </button>
          )}
          <div className="flex flex-col items-center justify-center gap-3 py-12 border border-dashed border-gray-200 rounded-xl">
            <span className="text-sm text-gray-500">{t('comparativeAnalysis.noSurveys')}</span>
            <div className="flex gap-2">
              {(['WQS_MARKET', 'SAG_MARKET', 'DC_MARKET'] as const).map(mt => (
                <button
                  key={mt}
                  type="button"
                  onClick={() => handleAddMethod(mt)}
                  disabled={addMethodMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {mt === 'WQS_MARKET' ? 'WQS' : mt === 'SAG_MARKET' ? 'SAG' : 'DC'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ServerDataCtx.Provider>
    );
  }

  // activeMethod.methodType is the backend server code (WQS/SaleGrid/DirectComparison);
  // normalize to the FE composite the render switch + child panels expect.
  const methodType = toMarketComposite(activeMethod?.methodType as string | undefined);

  const panelProps = {
    activeMethod: {
      pricingAnalysisId,
      approachId: marketApproachId,
      approachType: 'Market',
      methodId: activeMethodId ?? undefined,
      methodType,
    },
    properties: subjectProperty ? [subjectProperty] : [],
    marketSurveys,
    allFactors: allFactorsQuery.data,
    templateList: resolvedTemplateList,
    linkedComparables: comparativeFactors?.linkedComparables,
    savedComparativeFactors: comparativeFactors?.comparativeFactors,
    savedFactorScores: comparativeFactors?.factorScores,
    savedCalculations: comparativeFactors?.calculations,
    savedComparativeAnalysisTemplateId: comparativeFactors?.comparativeAnalysisTemplateId,
    savedFinalValueAdjusted: (comparativeFactors as any)?.finalValue?.finalValueOverride ?? null,
    savedLandValue: (comparativeFactors as any)?.finalValue?.landValue ?? null,
    savedBuildingCost: (comparativeFactors as any)?.finalValue?.buildingValue ?? null,
    savedAppraisalPrice: (comparativeFactors as any)?.finalValue?.indicatedValue ?? null,
    savedHasBuildingCost: (comparativeFactors as any)?.finalValue?.hasBuildingValue ?? null,
    savedIncludeLandArea: (comparativeFactors as any)?.finalValue?.includeLandArea ?? null,
    // No-ops: the reference result is shown in the parent list, not fed back into
    // any parent form context here.
    onCalculationSave: noop as any,
    onCalculationMethodDirty: noop,
    onCancelCalculationMethod: onBack,
  };

  return (
    <ServerDataCtx.Provider value={serverData}>
      {/* No top-bar slot override here. A reference now opens as a full page, so the panels'
          portaled template chip and value/save row reach the page's real top bar — the same one
          a normal method uses. Providing slots of our own would duplicate those controls. */}
      <div className="flex flex-col gap-4 h-full">
        {/* Back + method tabs. Both halves can be absent — the full-page route takes its back
            button from the page header, and a reference usually holds a single method — so the
            whole row is conditional. Left unconditional it would render an empty flex box, whose
            gap still pushes the panel down for no reason the user can see. */}
        {(showBack || methods.length > 1) && (
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Icon name="arrow-left" className="size-3.5" />
                {t('page.back')}
              </button>
            )}
            {methods.length > 1 && (
              <div className="flex gap-1 ml-2">
                {methods.map((m: any) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveMethodId(m.id)}
                    className={clsx(
                      'px-3 py-1 text-xs font-medium rounded-lg transition-colors',
                      m.id === activeMethodId
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    )}
                  >
                    {m.methodType}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel */}
        <div className="flex-1 min-h-0 overflow-auto">
          {methodType === 'WQS_MARKET' && (
            <WQSPanel {...panelProps} manualSubject={manualSubject} />
          )}
          {methodType === 'SAG_MARKET' && (
            <SaleAdjustmentGridPanel {...panelProps} manualSubject={manualSubject} />
          )}
          {methodType === 'DC_MARKET' && (
            <DirectComparisonPanel {...panelProps} manualSubject={manualSubject} />
          )}
        </div>
      </div>
    </ServerDataCtx.Provider>
  );
}
