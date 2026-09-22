import '@features/pricingAnalysis/i18n';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import MarketsTab from '@features/appraisal/components/tabs/MarketsTab';
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
import { usePageReadOnly, PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import toast from 'react-hot-toast';
import { PricingAnalysisAccordion } from '@features/pricingAnalysis/components/selection/PricingAnalysisAccordion';
import { AddMethodPopover } from '@features/pricingAnalysis/components/selection/AddMethodPopover';
import type { MethodKey } from '@features/pricingAnalysis/hooks/useSelectionActions';
import { MethodSectionRenderer } from '@features/pricingAnalysis/components/MethodSectionRenderer';
import { MarketReferenceMethodPanel } from '@features/pricingAnalysis/components/MarketReferenceMethodPanel';
import { METHOD_PARAM, REFERENCE_PARAM } from '@features/pricingAnalysis/constants/urlParams';
import type {
  ManualCostBreakdownContext,
  PricingServerData,
} from '@features/pricingAnalysis/types/selection';
import { propertyGroupKeys } from '@features/appraisal/api/propertyGroup';
import { useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { useCreateProjectModelPricingAnalysis } from '@features/blockProject/api/projectPricingAnalysis';
import { pricingAnalysisKeys } from '@features/pricingAnalysis/api/queryKeys';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { MethodTopBarPortalCtx } from '@features/pricingAnalysis/store/methodTopBarPortalContext';
import { mapGroupItemToPropertyItem } from '@features/appraisal/hooks/useEnrichedPropertyGroups';
import { PropertyTypeChip } from '@features/appraisal/components/PropertyTypeChip';
import { requiredComponents } from '@features/pricingAnalysis/utils/costRequiredComponents';

/** Top-bar group-type badge (mock `gtBadge`, mock:3375) — one of the mock's three `GTYPES` labels
 *  (mock:3276-3305). There's no stored group-type field (same gap `requiredComponents` already
 *  works around, see costRequiredComponents.ts), so it's derived from what the group's properties
 *  require: land/building present -> land-and-building, else machinery present -> machinery, else
 *  (condo/unit only, `required` empty) -> unit. This priority is our own call, not something the
 *  mock's hand-picked demo toggle proves. */
function groupTypeLabel(
  required: ReturnType<typeof requiredComponents>,
): 'landBuilding' | 'unit' | 'machinery' {
  if (required.includes('Land') || required.includes('Building')) return 'landBuilding';
  if (required.includes('Machinery')) return 'machinery';
  return 'unit';
}

type TabId = 'properties' | 'markets' | 'gallery' | 'laws';

// Compact-layout top bar: badge shown for the method types whose panel portals its
// chip/value/actions into the bar (WQS/SAG/DC in slice 1, BC/MC/LH in slice 2). Other
// method types (DCF, Leasehold, Hypothesis, etc.) keep their own in-body
// header/footer until a later slice. Badge -> full name is resolved via literal
// t() calls below (not a key lookup table) so the strict i18next key typing still
// catches typos.
const METHOD_TOP_BAR_BADGE: Record<
  string,
  'WQS' | 'SAG' | 'DC' | 'BC' | 'MC' | 'LH' | 'PR' | 'DCF' | 'HYP'
> = {
  WQS_MARKET: 'WQS',
  WQS_COST: 'WQS',
  SAG_MARKET: 'SAG',
  SAG_COST: 'SAG',
  DC_MARKET: 'DC',
  DC_COST: 'DC',
  BC: 'BC',
  MC_COST: 'MC',
  LH: 'LH',
  PR: 'PR',
  I: 'DCF',
  // Hypothesis portals its variant chip and its save/cancel row into this bar (see
  // HypothesisPanel and LandBuildingTabs/CondominiumTabs). Without an entry here the page kept
  // showing the SELECTION arm as well, so the bar carried the board's "+ เพิ่มวิธี" and group
  // value beside the method's own value and a second Save button.
  //
  // This map is now exhaustive over MethodSectionRenderer's switch — every case it can render
  // has an entry. Adding a method there without adding it here reproduces exactly this bug, and
  // it is silent: nothing errors, the bar just carries two screens' controls at once.
  Hypothesis: 'HYP',
};

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const initialState: SelectionState = {
  viewMode: 'summary',
  editDraft: [],
  editSaved: [],
  summarySelected: [],
  systemCalculationMode: 'System',
  dirtyManualValueKeys: [],
  dirtyCostBreakdownKeys: [],
  dirtyMethodRemarkKeys: [],
  dirtyMethodApproachTypes: [],
  dirtyApproachSelection: false,
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
  const resolvedSubject: PricingAnalysisSubject =
    subject ??
    (params.modelId
      ? { kind: 'projectModel', modelId: params.modelId }
      : { kind: 'propertyGroup', groupId: params.groupId ?? '' });

  // The "canonical" id used by PricingAnalysisContent as the group context.
  // For the model subject we pass the modelId as the groupId placeholder so
  // PricingAnalysisContent can still call useSelectionActions (which only uses
  // groupId for its cancelPricingAccordion navigation — we override that below).
  const subjectId =
    resolvedSubject.kind === 'projectModel' ? resolvedSubject.modelId : resolvedSubject.groupId;

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
          onSuccess: data => {
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
            navigate(`${basePath}/${prefix}/pricing-analysis/${newId}`, { replace: true });
          },
          onError: err => {
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
          navigate(`${basePath}/groups/${resolvedSubject.groupId}/pricing-analysis/${newId}`, {
            replace: true,
          });
        })
        .catch(err => {
          creatingRef.current = false;
          setCreateState('error');
          setCreateError(err?.message ?? 'An unexpected error occurred.');
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReadOnly, pricingAnalysisId, subjectId, appraisalId]);

  const { t } = useTranslation('pricingAnalysis');

  // Readonly mode with no pricing analysis — show empty state
  if (isReadOnly && !pricingAnalysisId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Icon name="eye" style="solid" className="text-2xl text-gray-400" />
        <p className="text-sm text-gray-500 font-medium">{t('page.noAnalysisAvailable')}</p>
      </div>
    );
  }

  // Show error with retry if auto-create failed
  if (!pricingAnalysisId && createState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Icon name="circle-exclamation" style="solid" className="text-2xl text-danger" />
        <p className="text-sm text-gray-700 font-medium">{t('page.failedToCreate')}</p>
        <p className="text-xs text-gray-400">{createError}</p>
        <button
          type="button"
          onClick={() => {
            creatingRef.current = false;
            setCreateState('idle');
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t('page.retry')}
        </button>
      </div>
    );
  }

  // Show loading while creating
  if (!pricingAnalysisId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Icon name="spinner" className="text-2xl text-primary animate-spin" />
        <p className="text-sm text-gray-500">{t('page.creating')}</p>
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
    <PageReadOnlyContext.Provider value={isReadOnly}>
      <PricingAnalysisContent
        appraisalId={appraisalId ?? ''}
        groupId={subjectId}
        pricingAnalysisId={pricingAnalysisId}
        isModelSubject={resolvedSubject.kind === 'projectModel'}
        returnTo={returnTo}
      />
    </PageReadOnlyContext.Provider>
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
  const { t } = useTranslation('pricingAnalysis');
  const isReadOnly = usePageReadOnly();
  const [activeTab, setActiveTab] = useState<TabId>('properties');
  // Tab label: "Properties" for group subjects; "Model" for projectModel subjects.
  // Tab id stays 'properties' in both cases to avoid breaking reducer/URL state.
  const TABS: Tab[] = isModelSubject
    ? [
        { id: 'properties', label: t('page.tabs.model'), icon: 'layer-group' },
        { id: 'markets', label: t('page.tabs.markets'), icon: 'chart-line' },
      ]
    : [
        { id: 'properties', label: t('page.tabs.properties'), icon: 'buildings' },
        { id: 'markets', label: t('page.tabs.markets'), icon: 'chart-line' },
      ];
  const [pendingSystemCalcMode, setPendingSystemCalcMode] = useState<boolean | null>(null);

  // Slots the active method panel (WQS/SAG/DC) portals into — the template chip next to
  // the method-name badge, the value figure and actions at the right end of the bar.
  // See MethodTopBarPortal.tsx and methodTopBarPortalContext.ts.
  const [topBarSlot, setTopBarSlot] = useState<HTMLDivElement | null>(null);
  const [topBarChipSlot, setTopBarChipSlot] = useState<HTMLDivElement | null>(null);
  const topBarSlots = useMemo(
    () => ({ chip: topBarChipSlot, actions: topBarSlot }),
    [topBarChipSlot, topBarSlot],
  );
  // The group chip's own property-list popover — stands in for the group card that's
  // hidden while a WQS/SAG/DC method is active (see topBarBadge below).
  const [isGroupPopoverOpen, setIsGroupPopoverOpen] = useState(false);
  // Top-bar "+ เพิ่มวิธี" popover (mock:3867-3884) — replaces the old behaviour of dropping
  // straight into edit mode (still reachable via "แก้ไขแนวทาง" in
  // PricingAnalysisApproachMethodSelector).
  const [isAddMethodPopoverOpen, setIsAddMethodPopoverOpen] = useState(false);

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

  // Chip/badge for the active method's top bar (see METHOD_TOP_BAR_BADGE for which methods).
  const topBarBadge = state.activeMethod?.methodType
    ? METHOD_TOP_BAR_BADGE[state.activeMethod.methodType]
    : undefined;
  const topBarMethodName =
    topBarBadge === 'WQS'
      ? t('wqs.methodName')
      : topBarBadge === 'SAG'
        ? t('saleAdjustmentGrid.methodName')
        : topBarBadge === 'DC'
          ? t('directComparison.methodName')
          : topBarBadge === 'BC'
            ? t('costBuilding.methodName')
            : topBarBadge === 'MC'
              ? t('costMachine.methodName')
              : topBarBadge === 'LH'
                ? t('leasehold.methodName')
                : topBarBadge === 'PR'
                  ? t('profitRent.headerTitle')
                  : topBarBadge === 'DCF'
                    ? t('methodTabs.dcf.methodName')
                    : topBarBadge === 'HYP'
                      ? t('hypothesis.methodName')
                      : '';

  // Top bar's "ราคาประเมิน (แนวทางที่เลือก)" (mock:1032) — the same figure the group card's
  // header already shows (see PricingAnalysisAccordion), not re-derived here.
  const selectedApproachValue = state.summarySelected?.find(
    appr => appr.isSelected,
  )?.appraisalValue;

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
        remark: pricingSelection?.remark,
        documents: pricingSelection?.documents,
      },
    });

    // If user was in editing mode (e.g. after add/delete mutation), stay in editing mode
    if (wasEditing) {
      dispatch({ type: 'EDIT_ENTER' });
      return;
    }

    // Always start in summary mode — user opens the edit modal explicitly
    dispatch({ type: 'SUMMARY_ENTER' });
  }, [
    groupDetail,
    pricingConfiguration,
    pricingSelection,
    allFactors,
    pricingAnalysisId,
    isModelSubject,
  ]);

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

  // ── The open method lives in the URL ──────────────────────────────────────
  // Opening a method used to be pure component state, so the address never changed and the
  // browser had no entry to go back to — Back left the feature entirely. `?method=` gives that
  // layer a history entry, which also makes refresh and a pasted link land back on the method.
  //
  // The URL is the single source of truth here: handlers write it, and the effect below is the
  // only thing that moves state. Deriving the URL from state as well would have the two writing
  // to each other, and a browser Back would immediately be undone by the state it popped.
  //
  // approachType+methodType, not the ids: startCalculation resolves both ids out of
  // summarySelected itself, and those ids are a mix of server UUIDs and config placeholders
  // (see isServerId), so a URL carrying one could not be restored after a reload.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeMethodKey =
    state.activeMethod?.approachType && state.activeMethod?.methodType
      ? `${state.activeMethod.approachType}.${state.activeMethod.methodType}`
      : null;

  const writeMethodParam = useCallback(
    (key: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (key) next.set(METHOD_PARAM, key);
      else next.delete(METHOD_PARAM);
      // Opening pushes so Back closes the method; closing replaces, because the entry being
      // left is the one we are closing — pushing there would need two Backs to escape.
      setSearchParams(next, { replace: !key });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const param = searchParams.get(METHOD_PARAM);
    if (param === activeMethodKey) return;

    if (!param) {
      if (activeMethodKey) {
        calcFlow.cancelCalculationMethod();
        openSelectionPanel();
      }
      return;
    }

    const [approachType, methodType] = param.split('.');
    if (!approachType || !methodType) return;

    // Wait for the analysis to arrive before acting on the URL. startCalculation toasts when it
    // cannot resolve the method's ids, so firing it against an empty summarySelected — exactly
    // the state every reload starts in — would greet the user with an error toast every time.
    const approach = state.summarySelected?.find(appr => appr.approachType === approachType);
    const method = approach?.methods.find(m => m.methodType === methodType);
    if (!approach?.id || !method?.id) return;

    calcFlow.startCalculation({ approachType, methodType });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, activeMethodKey, state.summarySelected]);

  /** Board → method. Writes the URL; the effect above is what moves the state. */
  const handleOpenCalculationMethod = (k: { approachType: string; methodType: string }) => {
    writeMethodParam(`${k.approachType}.${k.methodType}`);
  };

  const handleCancelCalculationMethod = () => {
    calcFlow.cancelCalculationMethod();
    openSelectionPanel();
    writeMethodParam(null);
  };

  /**
   * `?ref=<referencePricingAnalysisId>` — a market reference opened as a full page, which is the
   * layer ABOVE a method: it replaces the board the same way a method does, rather than floating
   * over it in a dialog. GroupReferencesSection writes the param (see useOpenReference there);
   * this reads it.
   *
   * Nothing is mirrored into the reducer. A reference is its own PricingAnalysis with its own
   * approach and methods, and MarketReferenceMethodPanel fetches all of that itself, so the id in
   * the URL is the entire layer — there is no second copy to keep in sync.
   */
  const openReferenceId = searchParams.get(REFERENCE_PARAM);

  const closeReference = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(REFERENCE_PARAM);
    // Replace, not push: the entry being left is the reference itself, and pushing there would
    // take two Backs to escape. Same reasoning as writeMethodParam(null).
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // (8) Dirty state tracking for calculation panels
  const [, setIsDirty] = useState(false);
  const handleOnCalculationMethodDirty = (check: boolean) => {
    setIsDirty(check);
  };

  // (8b) Update method value on manual mode when (1) immediately on blur (2) debounce ~1s after typeing stop
  const handleManualValueSync = useCallback(
    ({
      approachType,
      methodType,
      value,
      methodId,
    }: {
      approachType: string;
      methodType: string;
      value: number;
      methodId?: string;
    }) => {
      dispatch({
        type: 'SUMMARY_UPDATE_METHOD_VALUE',
        payload: { approachType, methodType, value, methodId },
      });
    },
    [dispatch],
  );

  // (8c) Land price per square wa, typed on a manual Cost-approach card. Batched into the same
  // Save click as the value above; saveSummary routes a Cost method carrying a rate to the
  // manual-cost-breakdown endpoint so the appraisal summary can split ที่ดิน from สิ่งปลูกสร้าง.
  const handleManualLandRateSync = useCallback(
    ({
      approachType,
      methodType,
      rate,
      methodId,
    }: {
      approachType: string;
      methodType: string;
      rate: number | null;
      methodId?: string;
    }) => {
      dispatch({
        type: 'SUMMARY_UPDATE_METHOD_LAND_RATE',
        payload: { approachType, methodType, rate, methodId },
      });
    },
    [dispatch],
  );

  // (8d) Manual-mode "source of this value" note, bound to Method.remark. Same batching as
  // handleManualValueSync above — debounced into local state by the row, folded into the same
  // updateMethod request as the value at Save (see useSelectionActions.saveSummary).
  const handleManualNoteSync = useCallback(
    ({
      approachType,
      methodType,
      remark,
      methodId,
    }: {
      approachType: string;
      methodType: string;
      remark: string;
      methodId?: string;
    }) => {
      dispatch({
        type: 'SUMMARY_UPDATE_METHOD_REMARK',
        payload: { approachType, methodType, remark, methodId },
      });
    },
    [dispatch],
  );

  const manualCostBreakdown: ManualCostBreakdownContext = useMemo(
    () => ({
      landAreaInSqWa: pricingSelection?.landAreaInSqWa ?? null,
      buildingValue: pricingSelection?.buildingValue ?? null,
      onLandRateSync: handleManualLandRateSync,
    }),
    [pricingSelection?.landAreaInSqWa, pricingSelection?.buildingValue, handleManualLandRateSync],
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

  const handleAddMethods = async (picks: MethodKey[]) => {
    const { succeeded, failed } = await selectionActions.addMethods(picks);
    if (failed.length === 0) {
      toast.success(t('toasts.methodsAdded', { count: succeeded.length }));
    } else if (succeeded.length > 0) {
      toast.error(
        t('toasts.methodsAddedPartial', { succeeded: succeeded.length, total: picks.length }),
      );
    } else {
      toast.error(t('toasts.saveFailed'));
    }
    return { succeeded, failed };
  };

  const handleSystemCalculationChangeRequest = (newMode: boolean) => {
    setPendingSystemCalcMode(newMode);
  };

  const handleConfirmChangeCalculation = async () => {
    if (pendingSystemCalcMode === null) return;
    try {
      // await onChangechangeSystemCalculation();
      selectionActions.changeSystemCalculation(pendingSystemCalcMode);
      toast.success(t('toasts.changed'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('toasts.saveFailed'));
    } finally {
      setPendingSystemCalcMode(null);
    }
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
                      {/* The group card comes off the calculation page once a WQS/SAG/DC
                          method is active — the group survives as the chip in the top bar
                          (with its property list in that chip's popover). Cancelling a
                          calculation clears activeMethod and brings this back. */}
                      {!topBarBadge && (
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
                          onSelectCalculationMethod={handleOpenCalculationMethod}
                          onSummaryModeSave={selectionActions.saveSummary}
                          isSummarySaving={selectionActions.isSavingSummary}
                          onEditModeSave={selectionActions.saveEdit}
                          onToggleMethod={selectionActions.toggleMethod}
                          onPricingAnalysisAccordionChange={onPricingAnalysisAccordionChange}
                          isPricingAnalysisAccordionOpen={isPricingAnalysisAccordionOpen}
                          onSystemCalculationChange={handleSystemCalculationChangeRequest}
                          systemCalculationMode={state.systemCalculationMode}
                          isConfirmDeselectedMethodOpen={selectionActions.confirm.isOpen}
                          onConfirmDeselectMethod={selectionActions.confirm.confirmDeselect}
                          onCancelDeselectMethod={selectionActions.confirm.cancelDeselect}
                          onEnterEdit={selectionActions.enterEdit}
                          onCancelEditMode={selectionActions.cancelEdit}
                          onSelectCandidateMethod={selectionActions.selectCandidateMethod}
                          onSelectCandidateApproach={selectionActions.selectCandidateApproach}
                          onAddMethod={selectionActions.addMethod}
                          onAddMethods={handleAddMethods}
                          onDeleteMethod={selectionActions.requestDeleteMethod}
                          pricingConfiguration={pricingConfiguration}
                          isModelSubject={isModelSubject}
                          flatContext={flatContext}
                          pricingContext={pricingContext}
                          modelThumbnailSrc={modelThumbnailSrc}
                          deleteConfirm={selectionActions.deleteConfirm}
                          onManualValueSync={handleManualValueSync}
                          onSelectMethodRole={selectionActions.selectMethodRole}
                          onManualNoteSync={handleManualNoteSync}
                          manualCostBreakdown={manualCostBreakdown}
                          onRequestRemoveDocument={selectionActions.requestRemoveDocument}
                          removeDocumentConfirm={selectionActions.removeDocumentConfirm}
                        />
                      )}
                      {!isCalcLoading && (
                        <MethodSectionRenderer
                          state={state}
                          serverData={serverData}
                          appraisalId={appraisalId}
                          calculationMethodData={calculationMethodData}
                          groupNetLandSqWa={pricingSelection?.landAreaInSqWa ?? 0}
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
    <MethodTopBarPortalCtx.Provider value={topBarSlots}>
      <div className="flex flex-col h-full min-h-0">
        {/* Page header — back + tabs, plus the active method's chip/value/actions (portaled) */}
        <div className="shrink-0 pb-4 flex items-center gap-3">
          {/* Back goes up ONE level, not straight out. Three layers can be on screen — a
              reference (?ref=), a method (?method=), or the selection board — and firing
              cancelPricingAccordion unconditionally skipped straight past the board to the
              property page. Both inner layers live in the URL, so the browser's own Back button
              steps out the same way this one does. */}
          <button
            type="button"
            onClick={() =>
              openReferenceId
                ? closeReference()
                : state.activeMethod?.methodType
                  ? handleCancelCalculationMethod()
                  : selectionActions.cancelPricingAccordion()
            }
            aria-label={t('page.back')}
            title={t('page.back')}
            className="flex items-center px-2 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
          >
            <Icon name="arrow-left" style="solid" className="size-3.5" />
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
          {/* Selection-screen arm of the bar (mock:1026-1032) — group/model label + the
              add-method popover trigger. Replaced by the badge arm below once a WQS/SAG/DC
              method is active. No second ทรัพย์สิน|ตลาด control here: the TABS nav above
              already is that switch. */}
          {!topBarBadge && !openReferenceId && (
            <>
              <span className="w-px h-5 bg-gray-200 shrink-0" />
              <span className="text-[13px] font-semibold text-gray-800 truncate">
                {isModelSubject
                  ? `${flatContext?.projectName ? String(flatContext.projectName) : 'Project'} › ${flatContext?.modelName ? String(flatContext.modelName) : 'Model'}`
                  : `${t('accordion.group')} ${groupDetail?.groupNumber ?? ''} · ${groupDetail?.groupName ?? ''} · ${t('accordion.items', { count: groupDetail?.properties?.length ?? 0 })}`}
              </span>
              {!isModelSubject && (
                <span className="shrink-0 rounded-[5px] bg-[#f0fdfa] px-[6px] py-px text-[11px] font-semibold text-[#0f766e]">
                  {t(
                    `accordion.groupType.${groupTypeLabel(requiredComponents(groupDetail?.properties ?? []))}` as `accordion.groupType.${ReturnType<typeof groupTypeLabel>}`,
                  )}
                </span>
              )}
              {!isReadOnly && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddMethodPopoverOpen(o => !o)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    {t('board.addMethod')}
                  </button>
                  {isAddMethodPopoverOpen && pricingConfiguration && (
                    <AddMethodPopover
                      pricingConfiguration={pricingConfiguration}
                      addedApproaches={state.summarySelected}
                      onClose={() => setIsAddMethodPopoverOpen(false)}
                      onAdd={handleAddMethods}
                    />
                  )}
                </div>
              )}
            </>
          )}
          {topBarBadge && (
            <>
              <span className="w-px h-5 bg-gray-200 shrink-0" />
              {/* Left side yields space before the right-hand value/actions ever can: the
                  group label shrinks first, then the method name; both truncate with a
                  title. shrink-[100], not a small factor — flex-shrink is weighted by
                  basis, so shrink-[3] still clipped the name alongside the group. */}
              <div className="relative min-w-0 shrink-[100]">
                <button
                  type="button"
                  onClick={() => setIsGroupPopoverOpen(o => !o)}
                  title={`${t('accordion.group')} ${groupDetail?.groupNumber ?? ''} · ${groupDetail?.groupName ?? ''} · ${t('accordion.items', { count: groupDetail?.properties?.length ?? 0 })}`}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap max-w-full"
                >
                  <span
                    className="truncate"
                    title={`${t('accordion.group')} ${groupDetail?.groupNumber ?? ''} · ${groupDetail?.groupName ?? ''} · ${t('accordion.items', { count: groupDetail?.properties?.length ?? 0 })}`}
                  >
                    {t('accordion.group')} {groupDetail?.groupNumber ?? ''} ·{' '}
                    {groupDetail?.groupName ?? ''} ·{' '}
                    {t('accordion.items', { count: groupDetail?.properties?.length ?? 0 })}
                  </span>
                  <Icon name="chevron-down" style="solid" className="size-2.5 text-gray-400" />
                </button>
                {isGroupPopoverOpen && (
                  <div className="absolute left-0 top-full mt-1 z-30 w-72 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg flex flex-col gap-1">
                    {(groupDetail?.properties ?? []).length === 0 && (
                      <span className="text-xs text-gray-400 px-2 py-1">
                        {t('accordion.noProperties')}
                      </span>
                    )}
                    {(groupDetail?.properties ?? []).map(item => {
                      const p = mapGroupItemToPropertyItem(item);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50"
                        >
                          <PropertyTypeChip code={p.type} variant="dot" />
                          <span className="text-xs text-gray-700 truncate">
                            {p.titleNo || p.address}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <span className="inline-flex items-center gap-[6px] min-w-0 text-[13px] font-semibold text-gray-800">
                <span className="shrink-0 rounded-[5px] bg-[#f0fdfa] px-[6px] py-[1px] text-[11px] font-semibold text-[#0f766e]">
                  {topBarBadge}
                </span>
                <span className="truncate" title={topBarMethodName}>
                  {topBarMethodName}
                </span>
              </span>
              {/* The active panel's template chip lands here, beside the method name.
                  Kept inside this block deliberately: it renders only while a badged
                  method is active, which is exactly when a panel has a chip to portal —
                  so no empty flex child (and no stray gap) the rest of the time. */}
              <div ref={setTopBarChipSlot} className="flex items-center shrink-0" />
            </>
          )}
          {/* A reference hides the group label and the add-method trigger above — neither belongs
              to it — but its panel still portals a template chip, so the slot has to survive.
              Exactly one of the two mounts: openReferenceId is only ever set while topBarBadge is
              undefined (a reference and a group method cannot both be open). */}
          {openReferenceId && (
            <>
              <span className="w-px h-5 bg-gray-200 shrink-0" />
              <div ref={setTopBarChipSlot} className="flex items-center shrink-0" />
            </>
          )}
          {/* Populated via MethodTopBarPortal by whichever content currently owns the bar:
              the active WQS/SAG/DC panel (its value figure and cancel/reset/save) when
              topBarBadge is set, or the selection board's own Save button
              (PricingAnalysisApproachMethodSelector) otherwise — the two never overlap,
              since the board unmounts whenever a method takes over. Empty (zero width)
              when neither is active. */}
          {/* No min-w-0: the value figure and cancel/reset/save must never be squeezed
              under the left side — flex's default min-width:auto keeps them whole, and
              the left-hand labels truncate instead. */}
          <div ref={setTopBarSlot} className="flex items-center gap-2 flex-1 justify-end">
            {/* mock's .grow + .result (mock:1030-1032) — this div is already flex-1/justify-end,
                so it doubles as both. */}
            {/* order-first, not a JSX move: the Save button arrives here through
                createPortal, so its position in the DOM isn't ours to choose — only the
                flex order is. Value on the left, then a divider, then Save. */}
            {/* Not while a reference is open: that figure is the GROUP's selected-approach value,
                and showing it beside the reference's own value — which its panel portals into
                this same row — reads as two numbers for one thing. */}
            {!topBarBadge && !openReferenceId && selectedApproachValue != null && (
              <div className="order-first flex items-center gap-2">
                <span aria-hidden="true" className="w-px h-6 bg-gray-200" />
                <div className="flex flex-col items-end leading-[1.15] px-1.5">
                  <span className="text-[10.5px] text-gray-400">
                    {t('page.selectedApproachValue')}
                  </span>
                  <span className="text-[15px] font-semibold text-primary tabular-nums">
                    {Number(selectedApproachValue).toLocaleString()} ฿
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {openReferenceId ? (
            /* The reference replaces the tab content wholesale — board, accordion and all — so it
               occupies the page exactly like a method does. templateList is left to the panel's
               own fetch: this page never loads one, and a deep link has no row to inherit it from.
               subjectProperty likewise: only MachineryCostRef has one and only the reference row
               can fetch it, so machinery auto-fill is unavailable on this route. */
            <MarketReferenceMethodPanel
              pricingAnalysisId={openReferenceId}
              marketSurveys={marketSurveyDetails ?? []}
              templateList={undefined}
              onBack={closeReference}
              /* The page header already has a back button, and it calls this same onBack. The
                 panel's own one is for the modal, where there is no page header to use. */
              showBack={false}
            />
          ) : (
            renderTabContent()
          )}
        </div>
        <ConfirmDialog
          isOpen={pendingSystemCalcMode !== null}
          onClose={() => setPendingSystemCalcMode(null)}
          onConfirm={handleConfirmChangeCalculation}
          title={t('confirm.changeCalculationTitle')}
          message={t('confirm.changeCalculationMessage', {
            mode: pendingSystemCalcMode
              ? t('calculationMode.systemToggle')
              : t('calculationMode.manualToggle'),
          })}
          confirmText={t('confirm.confirmText')}
          variant="warning"
        />
      </div>
    </MethodTopBarPortalCtx.Provider>
  );
}

export default PricingAnalysisPage;
