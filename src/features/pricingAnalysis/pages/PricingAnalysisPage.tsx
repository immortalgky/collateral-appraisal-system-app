import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import MarketsTab from '@features/appraisal/components/tabs/MarketsTab';
import { DispatchCtx, ServerDataCtx, StateCtx, } from '@features/pricingAnalysis/store/selectionContext';
import { approachMethodReducer, type SelectionState, } from '@features/pricingAnalysis/store/selectionReducer';
import { useEnrichedPricingAnalysis } from '@features/pricingAnalysis/hooks/useEnrichedPricingAnalysis';
import { useEnrichedCalculationMethod } from '@features/pricingAnalysis/hooks/useEnrichedCalculationMethod';
import { useSelectionActions } from '@features/pricingAnalysis/hooks/useSelectionActions';
import { useCalculationFlow } from '@features/pricingAnalysis/hooks/useCalculationFlow';
import { createInitialState } from '@features/pricingAnalysis/store/createInitialState';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import toast from 'react-hot-toast';
import { useSetFinalValue } from '@features/pricingAnalysis/api';
import { PricingAnalysisAccordion } from '@features/pricingAnalysis/components/selection/PricingAnalysisAccordion';
import { MethodSectionRenderer } from '@features/pricingAnalysis/components/MethodSectionRenderer';
import type { PricingServerData } from '@features/pricingAnalysis/types/selection';
import type { SetFinalValueRequestType } from '@features/pricingAnalysis/schemas';
import { propertyGroupKeys } from '@features/appraisal/api/propertyGroup';
import { useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { useCreateProjectModelPricingAnalysis } from '@features/blockProject/api/projectPricingAnalysis';
import { pricingAnalysisKeys } from '@features/pricingAnalysis/api/queryKeys';

type TabId = 'properties' | 'markets' | 'gallery' | 'laws';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const PROPERTY_GROUP_TABS: Tab[] = [
  { id: 'properties', label: 'Properties', icon: 'buildings' },
  { id: 'markets', label: 'Markets', icon: 'chart-line' },
];

const PROJECT_MODEL_TABS: Tab[] = [
  { id: 'properties', label: 'Model', icon: 'layer-group' },
  { id: 'markets', label: 'Markets', icon: 'chart-line' },
];

const initialState: SelectionState = {
  viewMode: 'summary',
  editDraft: [],
  editSaved: [],
  summarySelected: [],
  systemCalculationMode: 'System',
};

// ─── Subject discriminant ─────────────────────────────────────────────────────

export type PricingAnalysisSubject =
  | { kind: 'propertyGroup'; groupId: string }
  /** routePrefix: the path segment between basePath and /pricing-analysis/:id
   *  e.g. "block-condo/model/abc123" */
  | { kind: 'projectModel'; modelId: string; routePrefix?: string };

interface PricingAnalysisPageProps {
  subject?: PricingAnalysisSubject;
}

/**
 * Wrapper: when pricingAnalysisId is missing (new route), auto-create one
 * and redirect. Once we have an ID, render the full content component.
 *
 * Accepts an optional `subject` prop:
 *   - { kind: 'propertyGroup', groupId } (default, reads groupId from route)
 *   - { kind: 'projectModel', modelId }  (new, reads modelId from route)
 *
 * Everything downstream of pricingAnalysisId is subject-agnostic and unchanged.
 */
function PricingAnalysisPage({ subject }: PricingAnalysisPageProps) {
  const params = useParams<{
    groupId?: string;
    modelId?: string;
    pricingAnalysisId?: string;
  }>();

  const appraisalId = useAppraisalId();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const queryClient = useQueryClient();
  const isReadOnly = usePageReadOnly();

  // Resolve the effective subject from prop or route params
  const resolvedSubject: PricingAnalysisSubject = subject ?? (
    params.modelId
      ? { kind: 'projectModel', modelId: params.modelId }
      : { kind: 'propertyGroup', groupId: params.groupId ?? '' }
  );

  // The "canonical" id used by PricingAnalysisContent as the group context.
  // For the model subject we pass the modelId as the groupId placeholder so
  // PricingAnalysisContent can still call useSelectionActions (which only uses
  // groupId for its cancelPricingAccordion navigation — we override that below).
  const subjectId =
    resolvedSubject.kind === 'projectModel'
      ? resolvedSubject.modelId
      : resolvedSubject.groupId;

  const [createState, setCreateState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [createError, setCreateError] = useState<string>('');
  const creatingRef = useRef(false);

  // Hook for model-subject auto-create (called unconditionally per rules of hooks)
  const createModelAnalysisMutation = useCreateProjectModelPricingAnalysis();

  // Effective id: prefer the URL param, but fall back to the freshly-created id from
  // the mutation's data so we don't hang on the "Creating..." spinner if the route
  // transition / remount doesn't propagate the new param immediately.
  const pricingAnalysisId =
    params.pricingAnalysisId ?? createModelAnalysisMutation.data?.id ?? undefined;

  // Auto-create pricing analysis when navigating to "new" route
  useEffect(() => {
    if (isReadOnly) return;
    if (pricingAnalysisId || !subjectId || !appraisalId) return;
    if (creatingRef.current) return;
    creatingRef.current = true;

    setCreateState('loading');

    if (resolvedSubject.kind === 'projectModel') {
      // Use the React Query mutation — handles cache invalidation + 409 self-heal
      createModelAnalysisMutation.mutate(
        { appraisalId, modelId: resolvedSubject.modelId },
        {
          onSuccess: (data) => {
            const newId = data?.id;
            if (!newId) {
              creatingRef.current = false;
              setCreateState('error');
              setCreateError('No ID returned from server');
              return;
            }
            // Also invalidate the new analysis detail so it hydrates on redirect
            queryClient.invalidateQueries({
              queryKey: pricingAnalysisKeys.detail(newId),
            });
            // routePrefix is always supplied by the wrapper components in router.tsx
            const prefix = resolvedSubject.routePrefix ?? '';
            navigate(
              `${basePath}/${prefix}/pricing-analysis/${newId}`,
              { replace: true },
            );
          },
          onError: (err) => {
            creatingRef.current = false;
            setCreateState('error');
            const anyErr = err as { message?: string };
            setCreateError(anyErr?.message ?? 'An unexpected error occurred.');
          },
        },
      );
    } else {
      // PropertyGroup branch — unchanged inline POST
      axios
        .post(`/property-groups/${resolvedSubject.groupId}/pricing-analysis`)
        .then(({ data }) => {
          const newId = data?.id;
          if (!newId) {
            creatingRef.current = false;
            setCreateState('error');
            setCreateError('No ID returned from server');
            return;
          }
          queryClient.invalidateQueries({
            queryKey: propertyGroupKeys.detail(appraisalId, resolvedSubject.groupId),
          });
          navigate(
            `${basePath}/groups/${resolvedSubject.groupId}/pricing-analysis/${newId}`,
            { replace: true },
          );
        })
        .catch(err => {
          creatingRef.current = false;
          setCreateState('error');
          setCreateError(err?.message ?? 'An unexpected error occurred.');
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReadOnly, pricingAnalysisId, subjectId, appraisalId]);

  // Readonly mode with no pricing analysis — show empty state
  if (isReadOnly && !pricingAnalysisId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Icon name="eye" style="solid" className="text-2xl text-gray-400" />
        <p className="text-sm text-gray-500 font-medium">No pricing analysis available</p>
      </div>
    );
  }

  // Show error with retry if auto-create failed
  if (!pricingAnalysisId && createState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Icon name="circle-exclamation" style="solid" className="text-2xl text-danger" />
        <p className="text-sm text-gray-700 font-medium">Failed to create pricing analysis</p>
        <p className="text-xs text-gray-400">{createError}</p>
        <button
          type="button"
          onClick={() => {
            creatingRef.current = false;
            setCreateState('idle');
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

  // returnTo: the path the "Back" button and any latent "isNew" nav should go to.
  // For model subjects: basePath + routePrefix (model detail page).
  // For propertyGroup subjects: left undefined → hook defaults to basePath/property.
  const returnTo =
    resolvedSubject.kind === 'projectModel' && resolvedSubject.routePrefix
      ? `${basePath}/${resolvedSubject.routePrefix}`
      : undefined;

  return (
    <PricingAnalysisContent
      appraisalId={appraisalId ?? ''}
      groupId={subjectId}
      pricingAnalysisId={pricingAnalysisId}
      isModelSubject={resolvedSubject.kind === 'projectModel'}
      returnTo={returnTo}
    />
  );
}

/**
 * Content: always receives a valid pricingAnalysisId.
 * All hooks run unconditionally.
 */
function PricingAnalysisContent({
  appraisalId,
  groupId,
  pricingAnalysisId,
  isModelSubject = false,
  returnTo,
}: {
  appraisalId: string;
  groupId: string;
  pricingAnalysisId: string;
  isModelSubject?: boolean;
  returnTo?: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>('properties');
  // Tab label: "Properties" for group subjects; "Model" for projectModel subjects.
  // Tab id stays 'properties' in both cases to avoid breaking reducer/URL state.
  const TABS = isModelSubject ? PROJECT_MODEL_TABS : PROPERTY_GROUP_TABS;
  // (1) Fetch all server data
  const {
    groupDetail,
    properties,
    propertiesMap,
    marketSurveyDetails,
    pricingConfiguration,
    pricingSelection,
    allFactors,
    isLoading,
    flatContext,
    pricingContext,
    modelThumbnailSrc,
  } = useEnrichedPricingAnalysis({
    appraisalId,
    groupId,
    pricingAnalysisId,
    skipGroupDetail: isModelSubject,
  });

  // (2) Own the reducer
  const [state, dispatch] = useReducer(approachMethodReducer, initialState);

  // Track viewMode so INIT can preserve editing mode after add/delete mutations
  const viewModeRef = useRef(state.viewMode);
  useEffect(() => {
    viewModeRef.current = state.viewMode;
  }, [state.viewMode]);

  // (3) INIT effect — depends on actual data, not loading boolean
  useEffect(() => {
    // For model subjects there is no groupDetail — only require pricingConfiguration etc.
    if (!isModelSubject && !groupDetail) return;
    if (!pricingConfiguration || !pricingSelection || !allFactors) return;
    const approaches = createInitialState(pricingConfiguration, pricingSelection);

    const wasEditing = viewModeRef.current === 'editing';

    dispatch({
      type: 'INIT',
      payload: {
        pricingAnalysisId,
        approaches,
        useSystemCalc: (pricingSelection as any)?.useSystemCalc,
      },
    });

    // If user was in editing mode (e.g. after add/delete mutation), stay in editing mode
    if (wasEditing) {
      dispatch({ type: 'EDIT_ENTER' });
      return;
    }

    // Always start in summary mode — user opens the edit modal explicitly
    dispatch({ type: 'SUMMARY_ENTER' });
  }, [groupDetail, pricingConfiguration, pricingSelection, allFactors, pricingAnalysisId, isModelSubject]);

  // (4) Selection actions
  const selectionActions = useSelectionActions({
    state,
    dispatch,
    pricingAnalysisId,
    groupId,
    returnTo,
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
    isOpen: isPricingAnalysisAccordionOpen,
    onToggle: onPricingAnalysisAccordionChange,
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

  // (8b) Manual mode — set final value on blur
  const setFinalValueMutation = useSetFinalValue();
  const handleManualValueChange = useCallback(
    ({
      approachType,
      methodType,
      value,
    }: {
      approachType: string;
      methodType: string;
      value: number;
    }) => {
      // Find the method's server ID from summarySelected
      const approach = state.summarySelected?.find(a => a.approachType === approachType);
      const method = approach?.methods.find(m => m.methodType === methodType);
      if (!method?.id) return;

      setFinalValueMutation.mutate(
        {
          pricingAnalysisId,
          methodId: method.id,
          request: {
            finalValue: value,
            finalValueRounded: value,
          } as SetFinalValueRequestType,
        },
        {
          onSuccess: () => toast.success('Value saved'),
          onError: () => toast.error('Failed to save value'),
        },
      );
    },
    [state.summarySelected, pricingAnalysisId, setFinalValueMutation],
  );

  // (9) Assemble server data for context
  const serverData: PricingServerData = {
    groupDetail,
    properties,
    propertiesMap: propertiesMap ?? {},
    marketSurveyDetails: marketSurveyDetails ?? [],
    allFactors,
    pricingConfiguration,
    flatContext,
    pricingContext,
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
                  <div className="h-full min-w-0 min-h-0 flex flex-col">
                    <div className="flex flex-col gap-2 flex-1 min-h-0">
                      <PricingAnalysisAccordion
                        state={state}
                        appraisalId={appraisalId}
                        group={{
                          id: groupId,
                          number: groupDetail?.groupNumber ?? 0,
                          name: groupDetail?.groupName ?? '',
                          description: groupDetail?.description ?? '',
                          useSystemCalc: (pricingSelection as any)?.useSystemCalc ?? true,
                          properties: groupDetail?.properties ?? [],
                        }}
                        onSelectCalculationMethod={calcFlow.startCalculation}
                        onSummaryModeSave={selectionActions.saveSummary}
                        onEditModeSave={selectionActions.saveEdit}
                        onToggleMethod={selectionActions.toggleMethod}
                        onPricingAnalysisAccordionChange={onPricingAnalysisAccordionChange}
                        isPricingAnalysisAccordionOpen={isPricingAnalysisAccordionOpen}
                        onSystemCalculationChange={selectionActions.changeSystemCalculation}
                        systemCalculationMode={state.systemCalculationMode}
                        isConfirmDeselectedMethodOpen={selectionActions.confirm.isOpen}
                        onConfirmDeselectMethod={selectionActions.confirm.confirmDeselect}
                        onCancelDeselectMethod={selectionActions.confirm.cancelDeselect}
                        onEnterEdit={selectionActions.enterEdit}
                        onCancelEditMode={selectionActions.cancelEdit}
                        onSelectCandidateMethod={selectionActions.selectCandidateMethod}
                        onSelectCandidateApproach={selectionActions.selectCandidateApproach}
                        onAddMethod={selectionActions.addMethod}
                        onDeleteMethod={selectionActions.requestDeleteMethod}
                        pricingConfiguration={pricingConfiguration}
                        isModelSubject={isModelSubject}
                        flatContext={flatContext}
                        pricingContext={pricingContext}
                        modelThumbnailSrc={modelThumbnailSrc}
                        deleteConfirm={selectionActions.deleteConfirm}
                        onManualValueChange={handleManualValueChange}
                      />
                      {!isCalcLoading && (
                        <MethodSectionRenderer
                          state={state}
                          serverData={serverData}
                          appraisalId={appraisalId}
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
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header — back + tabs */}
      <div className="shrink-0 pb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => selectionActions.cancelPricingAccordion()}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
        >
          <Icon name="arrow-left" style="solid" className="size-3.5" />
          <span className="font-medium">Back</span>
        </button>
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

export default PricingAnalysisPage;
