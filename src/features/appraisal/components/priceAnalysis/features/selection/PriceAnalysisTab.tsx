import { useLocation } from 'react-router-dom';
import { PriceAnalysisAccordion } from './PriceAnalysisAccordion';
import { WQSSection } from '../wqs/WQSSection';
import { useEffect, useState, type JSX } from 'react';
import { boolean } from 'zod';
import { useGetMarketSurvey, useGetProperty } from '../../api/api';
import { ActiveMethodPanel } from '../../components/ActiveMethodPanel';
import { Icon } from '@/shared/components';

export function PriceAnalysisTab(): JSX.Element {
  const location = useLocation();
  const { state } = location;
  const { groupId } = state; // groupId from property

  /**
   * (1) fetch property and market survey
   */

  const {
    data: propertyData,
    isLoading: isLoadingProperty,
    isError: isPropertyError,
    error: propertyError,
  } = useGetProperty(groupId);
  const propertyQueryResult = propertyData?.result ?? propertyData;
  const properties = propertyQueryResult?.items ?? [];

  const {
    data: marketSurveyData,
    isLoading: isLoadingMarketSurvey,
    isError: isMarketSurveyError,
    error: marketSurveyError,
  } = useGetMarketSurvey(groupId);
  const marketSurveyQueryResult = propertyData?.result ?? propertyData;
  const marketSurveys = marketSurveyQueryResult?.items ?? [];

  const [isCurrentLoading, setIsCurrentLoading] = useState<boolean>(true);
  useEffect(() => {
    if (isLoadingMarketSurvey || isLoadingProperty) return;
    setTimeout(() => {
      setIsCurrentLoading(false);
    }, 500);
  }, [isLoadingProperty, isLoadingMarketSurvey]);

  const [methodId, setMethodId] = useState<string | undefined>('SAG_MARKET');

  const handleOnSetMethodId = (methodId: string) => {
    setMethodId(methodId);
  };

  /**
   * How to manage property to send to each method?
   * (1) In case that we have 1 land multiple building, how to map?
   */

  const property = properties[0];

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
            onSelectCalculationMethod={handleOnSetMethodId}
          />
          {methodId != undefined && (
            <ActiveMethodPanel
              methodId={methodId}
              properties={property}
              marketSurveys={marketSurveys}
            />
          )}
        </div>
      )}
    </div>
  );
}
