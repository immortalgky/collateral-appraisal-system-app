import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MarketsTab from '@features/appraisal/components/tabs/MarketsTab';
import GalleryTab from '@features/appraisal/components/tabs/GalleryTab';
import LawsRegulationTab from '@features/appraisal/components/tabs/LawsRegulationTab';
import {
  DispatchCtx,
  ServerDataCtx,
  StateCtx,
} from '@features/pricingAnalysis/store/selectionContext';
import {
  approachMethodReducer,
  type SelectionState,
} from '@features/pricingAnalysis/store/selectionReducer';
import { useEnrichedPricingAnalysis } from '@features/pricingAnalysis/hooks/useEnrichedPricingAnalysis';
import { useEnrichedCalculationMethod } from '@features/pricingAnalysis/hooks/useEnrichedCalculationMethod';
import { useSelectionActions } from '@features/pricingAnalysis/hooks/useSelectionActions';
import { useCalculationFlow } from '@features/pricingAnalysis/hooks/useCalculationFlow';
import { createInitialState } from '@features/pricingAnalysis/store/createInitialState';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { PriceAnalysisAccordion } from '@features/pricingAnalysis/components/selection/PriceAnalysisAccordion';
import { MethodSectionRenderer } from '@features/pricingAnalysis/components/MethodSectionRenderer';
import type { PricingServerData } from '@features/pricingAnalysis/types/selection';
import { useCreatePricingAnalysis } from '@features/pricingAnalysis/api';
import { propertyGroupKeys } from '@features/appraisal/api/propertyGroup';
import { useQueryClient } from '@tanstack/react-query';

type TabId = 'properties' | 'markets' | 'gallery' | 'laws';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'properties', label: 'Properties', icon: 'buildings' },
  { id: 'markets', label: 'Markets', icon: 'chart-line' },
  { id: 'gallery', label: 'Gallery', icon: 'images' },
  { id: 'laws', label: 'Laws', icon: 'gavel' },
];

const initialState: SelectionState = {
  viewMode: 'summary',
  editDraft: [],
  editSaved: [],
  summarySelected: [],
  systemCalculationMode: 'System',
};

/**
 * Wrapper: when pricingAnalysisId is missing (new route), auto-create one
 * and redirect. Once we have an ID, render the full content component.
 */
function PriceAnalysisPage() {
  const { appraisalId, groupId, pricingAnalysisId } = useParams<{
    appraisalId: string;
    groupId: string;
    pricingAnalysisId?: string;
  }>();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createPricingAnalysis = useCreatePricingAnalysis();
  const hasTriggeredCreate = useRef(false);

  // Auto-create pricing analysis when navigating to "new" route
  useEffect(() => {
    if (pricingAnalysisId || !groupId || hasTriggeredCreate.current) return;
    hasTriggeredCreate.current = true;

    createPricingAnalysis.mutate(
      { groupId },
      {
        onSuccess: (result) => {
          // Invalidate group detail so pricingAnalysisId is updated in cache
          if (appraisalId) {
            queryClient.invalidateQueries({
              queryKey: propertyGroupKeys.detail(appraisalId, groupId),
            });
          }
          // Redirect to the existing pricing analysis route
          navigate(
            `/appraisal/${appraisalId}/groups/${groupId}/pricing-analysis/${result.id}`,
            { replace: true },
          );
        },
      },
    );
  }, [pricingAnalysisId, groupId, appraisalId, createPricingAnalysis, navigate, queryClient]);

  // Show error with retry if auto-create failed
  if (!pricingAnalysisId && createPricingAnalysis.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Icon name="circle-exclamation" style="solid" className="text-2xl text-danger" />
        <p className="text-sm text-gray-700 font-medium">Failed to create pricing analysis</p>
        <p className="text-xs text-gray-400">
          {createPricingAnalysis.error?.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={() => {
            hasTriggeredCreate.current = false;
            createPricingAnalysis.reset();
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show loading while creating
  if (!pricingAnalysisId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Icon name="spinner" className="text-2xl text-primary animate-spin" />
        <p className="text-sm text-gray-500">Creating pricing analysis...</p>
      </div>
    );
  }

  return (
    <PriceAnalysisContent
      appraisalId={appraisalId ?? ''}
      groupId={groupId ?? ''}
      pricingAnalysisId={pricingAnalysisId}
    />
  );
}

/**
 * Content: always receives a valid pricingAnalysisId.
 * All hooks run unconditionally.
 */
function PriceAnalysisContent({
  appraisalId,
  groupId,
  pricingAnalysisId,
}: {
  appraisalId: string;
  groupId: string;
  pricingAnalysisId: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>('properties');

  // (1) Fetch all server data
  const {
    groupDetail,
    properties,
    marketSurveyDetails,
    pricingConfiguration,
    pricingSelection,
    allFactors,
    isLoading,
  } = useEnrichedPricingAnalysis({
    appraisalId,
    groupId,
    pricingAnalysisId,
  });

  // (2) Own the reducer
  const [state, dispatch] = useReducer(approachMethodReducer, initialState);

  // (3) INIT effect — depends on actual data, not loading boolean
  useEffect(() => {
    if (!groupDetail || !pricingConfiguration || !pricingSelection || !allFactors) return;
    const approaches = createInitialState(pricingConfiguration, pricingSelection);

    dispatch({
      type: 'INIT',
      payload: { pricingAnalysisId, approaches },
    });

    // If no methods are selected yet (freshly created), enter edit mode
    // so the user can pick approaches/methods. Otherwise show summary.
    const hasSelections = approaches.some(a => a.methods.some(m => m.isSelected));
    if (hasSelections) {
      dispatch({ type: 'SUMMARY_ENTER' });
    } else {
      dispatch({ type: 'EDIT_ENTER' });
    }
  }, [groupDetail, pricingConfiguration, pricingSelection, allFactors, pricingAnalysisId]);

  // (4) Selection actions
  const selectionActions = useSelectionActions({
    state,
    dispatch,
    pricingAnalysisId,
    groupId,
  });

  // (5) Calculation flow
  const calcFlow = useCalculationFlow({ state, dispatch });

  // (6) Fetch calculation method data (templates + comparative factors)
  const { calculationMethodData, isLoading: isCalcLoading } = useEnrichedCalculationMethod({
    pricingAnalysisId: state.activeMethod?.pricingAnalysisId ?? '',
    methodId: state.activeMethod?.methodId ?? '',
    methodType: state.activeMethod?.methodType ?? '',
  });

  // (7) CALCULATION_ENTER effect — when calc data loads, dispatch and close panel
  const {
    isOpen: isPriceAnalysisAccordionOpen,
    onToggle: onPriceAnalysisAccordionChange,
    onClose: closeSelectionPanel,
    onOpen: openSelectionPanel,
  } = useDisclosure({ defaultIsOpen: true });

  useEffect(() => {
    if (!state.activeMethod?.approachType || !state.activeMethod?.methodType) return;
    if (isCalcLoading) return;

    dispatch({ type: 'CALCULATION_ENTER' });
    closeSelectionPanel();
  }, [isCalcLoading, state.activeMethod?.approachType, state.activeMethod?.methodType]);

  const handleCancelCalculationMethod = () => {
    calcFlow.cancelCalculationMethod();
    openSelectionPanel();
  };

  // (8) Dirty state tracking for calculation panels
  const [, setIsDirty] = useState(false);
  const handleOnCalculationMethodDirty = (check: boolean) => {
    setIsDirty(check);
  };

  // (9) Assemble server data for context
  const serverData: PricingServerData = {
    groupDetail,
    properties,
    marketSurveyDetails: marketSurveyDetails ?? [],
    allFactors,
    pricingConfiguration,
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'properties': {
        if (!appraisalId || !groupId) return <div></div>;

        return (
          <ServerDataCtx.Provider value={serverData}>
            <StateCtx.Provider value={state}>
              <DispatchCtx.Provider value={dispatch}>
                {!isLoading && (
                  <div className="flex-1 min-w-0 min-h-0 flex-col">
                    <div>
                      <PriceAnalysisAccordion
                        state={state}
                        appraisalId={appraisalId}
                        group={{
                          id: groupId,
                          number: groupDetail?.groupNumber ?? 0,
                          name: groupDetail?.groupName ?? '',
                          description: groupDetail?.description ?? '',
                          useSystemCalc: groupDetail?.useSystemCalc ?? true,
                          properties: groupDetail?.properties ?? [],
                        }}
                        onSelectCalculationMethod={calcFlow.startCalculation}
                        onSummaryModeSave={selectionActions.saveSummary}
                        onEditModeSave={selectionActions.saveEdit}
                        onToggleMethod={selectionActions.toggleMethod}
                        onPriceAnalysisAccordionChange={onPriceAnalysisAccordionChange}
                        isPriceAnalysisAccordionOpen={isPriceAnalysisAccordionOpen}
                        onSystemCalculationChange={selectionActions.changeSystemCalculation}
                        systemCalculationMode={state.systemCalculationMode}
                        onCancelPricingAccordion={selectionActions.cancelPricingAccordion}
                        isConfirmDeselectedMethodOpen={selectionActions.confirm.isOpen}
                        onConfirmDeselectMethod={selectionActions.confirm.confirmDeselect}
                        onCancelDeselectMethod={selectionActions.confirm.cancelDeselect}
                        onEnterEdit={selectionActions.enterEdit}
                        onCancelEditMode={selectionActions.cancelEdit}
                        onSelectCandidateMethod={selectionActions.selectCandidateMethod}
                        onSelectCandidateApproach={selectionActions.selectCandidateApproach}
                      />
                      {!isCalcLoading && (
                        <MethodSectionRenderer
                          state={state}
                          serverData={serverData}
                          calculationMethodData={calculationMethodData}
                          onCalculationSave={calcFlow.onCalculationSave}
                          onCalculationMethodDirty={handleOnCalculationMethodDirty}
                          onCancelCalculationMethod={handleCancelCalculationMethod}
                        />
                      )}
                    </div>
                  </div>
                )}
              </DispatchCtx.Provider>
            </StateCtx.Provider>
          </ServerDataCtx.Provider>
        );
      }
      case 'markets':
        return <MarketsTab />;
      case 'gallery':
        return <GalleryTab />;
      case 'laws':
        return <LawsRegulationTab />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab Navigation - Compact */}
      <div className="shrink-0 pb-4">
        <nav className="flex gap-0.5 bg-gray-50/80 p-0.5 rounded-lg border border-gray-100">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50',
                )}
              >
                <Icon
                  name={tab.icon}
                  style="solid"
                  className={clsx('size-3.5', isActive ? 'text-primary' : 'text-gray-400')}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">{renderTabContent()}</div>
    </div>
  );
}

export default PriceAnalysisPage;
