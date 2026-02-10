import { useLocation } from 'react-router-dom';
import { useEffect, useState, type JSX } from 'react';
import { Icon } from '@/shared/components';
import {
  useGetMarketSurvey,
  useGetProperty,
} from '@features/appraisal/components/priceAnalysis/features/selection/api/api.ts';
import { PriceAnalysisAccordion } from '@features/appraisal/components/priceAnalysis/features/selection/components/PriceAnalysisAccordion.tsx';
import { ActiveMethodPanel } from '@features/appraisal/components/priceAnalysis/components/ActiveMethodPanel.tsx';

export function PriceAnalysisTab(): JSX.Element {
  const location = useLocation();
  const { state } = location;
  const { groupId } = state; // groupId from property

  /**
   * (1) fetch property and market survey
   */

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

  const [isCurrentLoading, setIsCurrentLoading] = useState<boolean>(true);
  useEffect(() => {
    if (isLoadingMarketSurvey || isLoadingProperty) return;
    setTimeout(() => {
      setIsCurrentLoading(false);
    }, 500);
  }, [isLoadingProperty, isLoadingMarketSurvey]);

  const [isDirty, setIsDirty] = useState(false);
  const handleOnCalculationMethodDirty = (check: boolean) => {
    setIsDirty(check);
  };

  /** Query selected approach & method */
  // TODO:

  /** State link between component `PriceAnalysisAccordion` and `ActiveMethodPanel`
   * - when user click on pencil button to start calculation on the method, will set methodId on this state
   * - the state will pass to `ActiveMethodPanel` to show method
   */
  const [methodId, setMethodId] = useState<string | undefined>('');

  // When user tries to switch method while there are unsaved changes,
  // we confirm first and only then allow the switch.
  const confirmDiscardUnsavedChanges = () => {
    return window.confirm(
      'You have unsaved changes in the current calculation method.\n\nDiscard changes and switch methods?',
    );
  };

  const handleOnSelectCalculationMethod = (nextMethodId: string) => {
    // no-op if selecting the same method
    if (nextMethodId === methodId) return;

    // TODO: If current method has unsaved changes, confirm before switching.
    if (isDirty && methodId) {
      const ok = confirmDiscardUnsavedChanges();
      if (!ok) return;

      // Clear dirty flag for the current method since we're discarding changes.
      // (The current method component will unmount after we switch.)
      setIsDirty(false);
    }

    setMethodId(nextMethodId);
  };

  /**
   * How to manage property to send to each method?
   * (1) In case that we have 1 land multiple building, how to map?
   */

  const property = properties[2];

  if (isPropertyError || isMarketSurveyError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">Failed to load price analysis</p>
        <p className="text-sm text-gray-400">{(propertyError as Error)?.message}</p>
        <p className="text-sm text-gray-400">{(marketSurveyError as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 min-h-0 flex-col">
      {!isCurrentLoading && (
        <div>
          <PriceAnalysisAccordion
            groupId={groupId}
            onSelectCalculationMethod={handleOnSelectCalculationMethod}
          />
          {methodId != undefined && (
            <ActiveMethodPanel
              key={methodId}
              methodId={methodId}
              property={property}
              marketSurveys={marketSurveys}
              onCalculationMethodDirty={handleOnCalculationMethodDirty}
            />
          )}
        </div>
      )}
    </div>
  );
}
