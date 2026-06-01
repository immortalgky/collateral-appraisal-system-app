import { useMemo, useState } from 'react';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import Icon from '@/shared/components/Icon';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import { useGetAppraisalById } from '../api/appraisal';
import { useGetDecisionSummary } from '../api/decisionSummary';
import { useGetRequestById } from '@features/request/api/requests';
import { useEnrichedPropertyGroups } from '../hooks/useEnrichedPropertyGroups';
import type { PropertyType } from '../types';
import { useGetAppraisalMapPins } from '../api/marketComparable';
import { HistorySearchMapDrawer } from '@/features/common/historySearch/HistorySearchMapDrawer';
import type {
  AppraisalPinDto,
  MarketComparablePinDto,
} from '@/features/common/historySearch/types';

import StickyHeaderCard from '../components/360/StickyHeaderCard';
import RequestInfoSection from '../components/360/RequestInfoSection';
import PropertyGroupsSection from '../components/360/PropertyGroupsSection';
import PricingAnalysisSection from '../components/360/PricingAnalysisSection';
import FooterSection from '../components/360/FooterSection';
import PropertyDetailSlideOver from '../components/360/PropertyDetailSlideOver';
import PricingBreakdownSlideOver from '../components/360/PricingBreakdownSlideOver';
import DataErrorState from '@/shared/components/DataErrorState';

// ==================== Slide-Over State ====================

type SlideOverState =
  | { type: 'closed' }
  | { type: 'property'; propertyId: string; propertyType: PropertyType; groupName: string }
  | { type: 'pricing'; groupId: string; pricingAnalysisId: string; groupName: string };

// ==================== Page Component ====================

const Appraisal360Page = () => {
  const appraisalId = useAppraisalId();
  const [slideOver, setSlideOver] = useState<SlideOverState>({ type: 'closed' });
  const [mapOpen, setMapOpen] = useState(false);

  // Data hooks
  const {
    data: appraisal,
    isLoading: isLoadingAppraisal,
    isError: isAppraisalError,
    error: appraisalError,
    refetch: refetchAppraisal,
  } = useGetAppraisalById(appraisalId);
  const {
    data: request,
    isError: isRequestError,
    error: requestError,
    refetch: refetchRequest,
  } = useGetRequestById(appraisal?.requestId);
  const { groups, isLoading: isLoadingGroups } = useEnrichedPropertyGroups(appraisalId);
  const {
    data: decisionSummary,
    isLoading: isLoadingDecision,
    isError: isDecisionError,
    error: decisionError,
    refetch: refetchDecision,
  } = useGetDecisionSummary(appraisalId);

  // Map-pins data — fetched lazily when the user opens the map
  const { data: mapPinsData } = useGetAppraisalMapPins(mapOpen ? appraisalId : undefined);

  // Map the API shapes to the history-search DTOs (pad missing fields with null).
  // appraisalId is set to the current page's appraisalId so PinDetailDrawer can
  // look up appraisal data correctly. appraisalPropertyId is used as the React key
  // via the per-property lat/lon uniqueness — it's not stored in the DTO shape.
  const appraisingCollateralPins = useMemo<AppraisalPinDto[]>(
    () =>
      (mapPinsData?.collateral ?? []).map(c => ({
        appraisalId: appraisalId ?? '',
        appraisalNumber: null,
        lat: c.lat,
        lon: c.lon,
        propertyType: c.propertyType,
        buildingType: null,
        appraisedValue: null,
        appraisedDate: null,
        distanceKm: null,
        province: c.province,
        district: c.district,
        subDistrict: c.subDistrict,
        customerName: null,
      })),
    [mapPinsData, appraisalId],
  );

  const appraisingMcPins = useMemo<MarketComparablePinDto[]>(
    () =>
      (mapPinsData?.marketComparables ?? []).map(m => ({
        marketComparableId: m.marketComparableId,
        lat: m.lat,
        lon: m.lon,
        propertyType: m.propertyType,
        surveyName: m.surveyName,
        infoDateTime: m.infoDateTime,
        offerPrice: m.offerPrice,
        salePrice: m.salePrice,
        distanceKm: null,
        appraisalNumber: null,
        customerName: null,
        appraisalDate: null,
      })),
    [mapPinsData],
  );

  // Center the map on the first collateral pin if available.
  const mapInitialCenter = appraisingCollateralPins[0]
    ? { lat: appraisingCollateralPins[0].lat, lon: appraisingCollateralPins[0].lon }
    : undefined;

  const isPageLoading = isLoadingAppraisal;

  const handlePropertyClick = (
    propertyId: string,
    propertyType: PropertyType,
    groupName: string,
  ) => {
    setSlideOver({ type: 'property', propertyId, propertyType, groupName });
  };

  const handleCloseSlideOver = () => {
    setSlideOver({ type: 'closed' });
  };

  const handleGoToPricingAnalysis = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const paId = group?.pricingAnalysisId;
    if (paId) {
      setSlideOver({
        type: 'pricing',
        groupId,
        pricingAnalysisId: paId,
        groupName: group?.name || '',
      });
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAppraisalError) {
    return (
      <DataErrorState
        title="Failed to load appraisal"
        message={(appraisalError as Error)?.message}
        onRetry={refetchAppraisal}
      />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sticky Header */}
      <StickyHeaderCard
        appraisal={appraisal}
        decisionSummary={decisionSummary}
        customerName={request?.customers?.[0]?.name}
        contactNumber={request?.customers?.[0]?.contactNumber}
      />

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-6 p-6">
          {/* Download Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
              onClick={() => {
                /* TODO: download appraisal report */
              }}
            >
              <Icon name="file-arrow-down" style="solid" className="w-3.5 h-3.5 text-teal-600" />
              Appraisal Report
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
              onClick={() => {
                /* TODO: download summary document */
              }}
            >
              <Icon name="file-arrow-down" style="solid" className="w-3.5 h-3.5 text-purple-600" />
              Appraisal Summary
            </button>
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100 hover:border-blue-300 transition-colors"
            >
              <Icon name="map-location-dot" style="solid" className="w-3.5 h-3.5" />
              View on Map
            </button>
          </div>

          {/* Request Information */}
          {isRequestError ? (
            <DataErrorState
              variant="inline"
              title="Failed to load request info"
              message={(requestError as Error)?.message}
              onRetry={refetchRequest}
            />
          ) : (
            <RequestInfoSection appraisal={appraisal} request={request} />
          )}

          {/* Property Groups */}
          <PropertyGroupsSection
            groups={groups}
            isLoading={isLoadingGroups}
            onPropertyClick={handlePropertyClick}
          />

          {/* Pricing Analysis */}
          {isDecisionError ? (
            <DataErrorState
              variant="inline"
              title="Failed to load pricing analysis"
              message={(decisionError as Error)?.message}
              onRetry={refetchDecision}
            />
          ) : (
            <PricingAnalysisSection
              decisionSummary={decisionSummary}
              isLoading={isLoadingDecision}
              onGroupClick={handleGoToPricingAnalysis}
            />
          )}

          {/* Footer */}
          <FooterSection appraisal={appraisal} />
        </div>
      </div>

      {/* Slide-Over Panels */}
      <SlideOverPanel
        isOpen={slideOver.type === 'property'}
        onClose={handleCloseSlideOver}
        title={slideOver.type === 'property' ? 'Property Detail' : ''}
        subtitle={slideOver.type === 'property' ? slideOver.groupName : undefined}
        width="xl"
      >
        {slideOver.type === 'property' && (
          <PropertyDetailSlideOver
            appraisalId={appraisalId!}
            propertyId={slideOver.propertyId}
            propertyType={slideOver.propertyType}
          />
        )}
      </SlideOverPanel>

      <SlideOverPanel
        isOpen={slideOver.type === 'pricing'}
        onClose={handleCloseSlideOver}
        title={slideOver.type === 'pricing' ? 'Pricing Breakdown' : ''}
        subtitle={slideOver.type === 'pricing' ? slideOver.groupName : undefined}
        width="xl"
      >
        {slideOver.type === 'pricing' && (
          <PricingBreakdownSlideOver
            appraisalId={appraisalId!}
            groupId={slideOver.groupId}
            pricingAnalysisId={slideOver.pricingAnalysisId}
          />
        )}
      </SlideOverPanel>

      {/* 360 view-only map — shows this appraisal's own pins + nearby history results */}
      <HistorySearchMapDrawer
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        initialCenter={mapInitialCenter}
        initialRadiusKm={5}
        appraisingCollateralPins={appraisingCollateralPins}
        appraisingMcPins={appraisingMcPins}
        defaultExpanded
      />
    </div>
  );
};

export default Appraisal360Page;
