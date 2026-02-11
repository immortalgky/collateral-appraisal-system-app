import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useReducer, useRef, useState, type JSX } from 'react';
import { Icon } from '@/shared/components';
import {
  useGetMarketSurvey,
  useGetPricingAnalysis,
  useGetProperty,
} from '@features/appraisal/components/priceAnalysis/features/selection/api/api.ts';
import { PriceAnalysisAccordion } from '@features/appraisal/components/priceAnalysis/features/selection/components/PriceAnalysisAccordion.tsx';
import { ActiveMethodPanel } from '@features/appraisal/components/priceAnalysis/components/ActiveMethodPanel.tsx';
import { useGetPriceAnalysisConfigQuery } from '../domain/usePriceAnalysisQuery';
import { DispatchCtx, StateCtx } from '../features/selection/domain/selectionContext';
import {
  approachMethodReducer,
  type PriceAnalysisSelectorState,
} from '../features/selection/domain/useReducer';
import { createInitialState } from '../features/selection/domain/createInitialState';

export function PriceAnalysisTab(): JSX.Element {
  const location = useLocation();
  const { state: navigationState } = location;
  const { groupId } = navigationState; // groupId from property

  /** Initial reducer state */
  const initialState: PriceAnalysisSelectorState = {
    viewMode: 'summary',
    editDraft: [],
    editSaved: [],
    summarySelected: [],
  };

  /** start using reducer with initial state */
  const [state, dispatch] = useReducer(approachMethodReducer, initialState);

  useEffect(() => {
    console.log('Reload');
  }, []);

  /** Query group data by group Id */
  // =>

  /** Query property data by group Id */
  const {
    data: propertyData,
    isLoading: isLoadingProperty,
    isError: isPropertyError,
    error: propertyError,
  } = useGetProperty(groupId);
  const propertyQueryResult = propertyData?.result ?? propertyData;
  const properties = propertyQueryResult?.items ?? [];

  /** Query market survey data by group Id */
  const {
    data: marketSurveyData,
    isLoading: isLoadingMarketSurvey,
    isError: isMarketSurveyError,
    error: marketSurveyError,
  } = useGetMarketSurvey(groupId);
  const marketSurveyQueryResult = marketSurveyData?.result ?? marketSurveyData;
  const marketSurveys = marketSurveyQueryResult?.items ?? [];

  /** fetch price analysis configuration */
  const {
    data: getPriceAnalysisConfigData,
    isLoading: isGetPriceAnalysisConfigLoading,
    isError: isGetPriceAnalysisConfigError,
    error: getPriceAnalysisConfigError,
  } = useGetPriceAnalysisConfigQuery();

  /** Query price analysis data */
  const {
    data: getPricingAnalysisData,
    isLoading: isGetPricingAnalysisLoading,
    isError: isGetPricingAnalysisError,
    error: getPricingAnalysisError,
  } = useGetPricingAnalysis(groupId);

  /** Query method detail by method Id */

  /** Initial reducer state */
  useEffect(() => {
    if (isGetPriceAnalysisConfigLoading || isGetPricingAnalysisLoading) return;

    if (getPriceAnalysisConfigData && getPricingAnalysisData) {
      const approaches = createInitialState(getPriceAnalysisConfigData, getPricingAnalysisData);

      dispatch({ type: 'INIT', payload: { approaches } });
      dispatch({ type: 'SUMMARY_ENTER' }); // TODO: check when these parameter, mode will switch to summary
    }
  }, [
    getPriceAnalysisConfigData,
    getPricingAnalysisData,
    isGetPriceAnalysisConfigLoading,
    isGetPricingAnalysisLoading,
    isGetPriceAnalysisConfigError,
    isGetPricingAnalysisError,
  ]);

  const isError =
    isPropertyError ||
    isMarketSurveyError ||
    isGetPriceAnalysisConfigError ||
    isGetPricingAnalysisError;

  const [isCurrentLoading, setIsCurrentLoading] = useState<boolean>(true);
  const [isCurrentError, setIsCurrentError] = useState<boolean>(false);

  useEffect(() => {
    if (
      isPropertyError ||
      isMarketSurveyError ||
      isGetPriceAnalysisConfigError ||
      isGetPricingAnalysisError
    )
      return setIsCurrentError(true);
    return setIsCurrentError(false);
  }, [
    isGetPriceAnalysisConfigError,
    isGetPricingAnalysisError,
    isMarketSurveyError,
    isPropertyError,
  ]);

  useEffect(() => {
    if (
      isLoadingMarketSurvey ||
      isLoadingProperty ||
      isGetPriceAnalysisConfigLoading ||
      isGetPricingAnalysisLoading
    )
      return;

    if (propertyData && marketSurveyData && getPriceAnalysisConfigData && getPricingAnalysisData)
      return setIsCurrentLoading(false);
  }, [
    isLoadingProperty,
    isLoadingMarketSurvey,
    isGetPriceAnalysisConfigLoading,
    isGetPricingAnalysisLoading,
    propertyData,
    marketSurveyData,
    getPriceAnalysisConfigData,
    getPricingAnalysisData,
  ]);

  const [isDirty, setIsDirty] = useState(false);
  const handleOnCalculationMethodDirty = (check: boolean) => {
    setIsDirty(check);
  };

  /** Query selected approach & method */
  // TODO:

  /** State link between component `PriceAnalysisAccordion` and `ActiveMethodPanel`
   * - when user clicks on pencil button to start calculation on the method, will set methodId on this state
   * - the state will pass to `ActiveMethodPanel` to show method
   */
  const [calculationMethod, setCalculationMethod] = useState<
    { methodId: string; methodType: string } | undefined
  >(undefined);

  // When a user tries to switch method while there are unsaved changes,
  // we confirm first and only then allow the switch.
  const confirmDiscardUnsavedChanges = () => {
    return window.confirm(
      'You have unsaved changes in the current calculation method.\n\nDiscard changes and switch methods?',
    );
  };

  const handleOnSelectCalculationMethod = (nextMethodId: string, nextMethodType: string) => {
    // need methodId and methodType

    // no-op if selecting the same method
    if (nextMethodId === calculationMethod?.methodId) return;

    // TODO: If current method has unsaved changes, confirm before switching.
    if (isDirty && calculationMethod?.methodId) {
      const ok = confirmDiscardUnsavedChanges();
      if (!ok) return;

      // Clear dirty flag for the current method since we're discarding changes.
      // (The current method component will unmount after we switch.)
      setIsDirty(false);
    }

    setCalculationMethod({ methodId: nextMethodId, methodType: nextMethodType });
  };

  /**
   * How to manage property to send to each method?
   * (1) In case that we have 1 land multiple building, how to map?
   */

  const property = properties[2];

  if (isCurrentError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">Failed to load price analysis</p>
        <p className="text-sm text-gray-400">{(propertyError as Error)?.message}</p>
        <p className="text-sm text-gray-400">{(marketSurveyError as Error)?.message}</p>
        <p className="text-sm text-gray-400">{(getPriceAnalysisConfigError as Error)?.message}</p>
        <p className="text-sm text-gray-400">{(getPricingAnalysisError as Error)?.message}</p>
      </div>
    );
  }

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        <div className="flex-1 min-w-0 min-h-0 flex-col">
          {!isCurrentLoading && (
            <div>
              <PriceAnalysisAccordion
                groupId={groupId}
                onSelectCalculationMethod={handleOnSelectCalculationMethod}
              />
              {calculationMethod != undefined && (
                <ActiveMethodPanel
                  methodId={calculationMethod.methodId}
                  methodType={calculationMethod.methodType}
                  property={property}
                  marketSurveys={marketSurveys}
                  onCalculationMethodDirty={handleOnCalculationMethodDirty}
                />
              )}
            </div>
          )}
        </div>
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}
