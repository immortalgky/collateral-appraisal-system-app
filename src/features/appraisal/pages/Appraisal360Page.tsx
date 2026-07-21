import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAppraisalId, useIsTaskOwner } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import Icon from '@/shared/components/Icon';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import { useGetAppraisalById, useGetPreviousAppraisalChain } from '../api/appraisal';
import { useGetAppraisalDocuments } from '../api/appraisalDocuments';
import { useViewDocument } from '@features/request/api/documents';
import { useGetDecisionSummary } from '../api/decisionSummary';
import { useGetTaskById } from '../api/workflow';
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
import PreviousAppraisalsMenu from '../components/360/PreviousAppraisalsMenu';
import StickyRemarkFooter from '../components/360/StickyRemarkFooter';
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

// ==================== Report Documents ====================

// Valuation report types openable from the header (parameter.DocumentTypes, category VAL_REPORT).
const APPRAISAL_REPORT_CODE = 'D001'; // Complete Valuation Report / เล่มประเมินสมบูรณ์
const APPRAISAL_SUMMARY_CODE = 'D043'; // Property Valuation Summary Report

// ==================== Page Component ====================

const Appraisal360Page = () => {
  const { t } = useTranslation('appraisal');
  const appraisalId = useAppraisalId();
  const { taskId } = useParams<{ taskId: string }>();
  const isTaskOwner = useIsTaskOwner();
  const isReadOnly = usePageReadOnly();
  const [slideOver, setSlideOver] = useState<SlideOverState>({ type: 'closed' });
  const [mapOpen, setMapOpen] = useState(false);
  // Collapse the sticky header once the content is scrolled past a small threshold.
  const [scrolled, setScrolled] = useState(false);

  // Data hooks
  const {
    data: appraisal,
    isLoading: isLoadingAppraisal,
    isError: isAppraisalError,
    error: appraisalError,
    refetch: refetchAppraisal,
  } = useGetAppraisalById(appraisalId);
  // Task decision draft — powers the editable Comment footer below. Same query key
  // as TaskLayout's fetch, so this is served from cache when opened via /tasks/:taskId.
  const { data: taskData } = useGetTaskById(taskId);
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

  // Valuation document checklist — fetched on mount rather than on click: useViewDocument has
  // to open the tab synchronously inside the click gesture (Safari popup blocker), so the
  // documentId must already be in hand. Shares its query key with the Documents page.
  const { data: appraisalDocuments } = useGetAppraisalDocuments(appraisalId);
  const viewDocument = useViewDocument();
  // Reappraisal / construction-inspection lineage — powers the "Previous Appraisals" header menu.
  const { data: previousChain } = useGetPreviousAppraisalChain(appraisalId);

  // View-only: opens the newest file attached to a report type, or explains that there is none.
  // These reports are never auto-attached — they land here only once someone generates and
  // attaches them from the Documents page.
  const openLatestReportDocument = useCallback(
    (code: string, missingMessage: string) => {
      const files = (
        appraisalDocuments?.types.find(type => type.code === code)?.files ?? []
      ).filter((file): file is typeof file & { documentId: string } => !!file.documentId);

      if (files.length === 0) {
        toast.error(missingMessage);
        return;
      }

      // Newest first; sortOrder breaks ties when uploadedAt is missing or identical.
      const latest = [...files].sort(
        (a, b) =>
          (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? '') || b.sortOrder - a.sortOrder,
      )[0];

      viewDocument(latest.documentId);
    },
    [appraisalDocuments, viewDocument],
  );

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
    <div className="relative flex flex-col h-full min-h-0">
      {/* Sticky Header */}
      <StickyHeaderCard
        appraisal={appraisal}
        decisionSummary={decisionSummary}
        customerName={request?.customers?.[0]?.name}
        contactNumber={request?.customers?.[0]?.contactNumber}
        compact={scrolled}
        actions={
          <>
            <PreviousAppraisalsMenu items={previousChain ?? []} />
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
              onClick={() =>
                openLatestReportDocument(
                  APPRAISAL_REPORT_CODE,
                  t('toasts.appraisalReportNotAvailable'),
                )
              }
            >
              <Icon name="file-arrow-down" style="solid" className="w-3.5 h-3.5 text-teal-600" />
              Appraisal Report
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
              onClick={() =>
                openLatestReportDocument(
                  APPRAISAL_SUMMARY_CODE,
                  t('toasts.appraisalSummaryNotAvailable'),
                )
              }
            >
              <Icon name="file-arrow-down" style="solid" className="w-3.5 h-3.5 text-purple-600" />
              Appraisal Summary
            </button>
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              {/* Google Maps-style multicolor pin */}
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
                <defs>
                  <clipPath id="gmapPin">
                    <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
                  </clipPath>
                </defs>
                <g clipPath="url(#gmapPin)">
                  <rect x="0" y="0" width="12" height="9" fill="#4285F4" />
                  <rect x="12" y="0" width="12" height="9" fill="#EA4335" />
                  <rect x="0" y="9" width="12" height="15" fill="#FBBC04" />
                  <rect x="12" y="9" width="12" height="15" fill="#34A853" />
                </g>
                <circle cx="12" cy="9" r="2.6" fill="#fff" />
              </svg>
              View on Map
            </button>
          </>
        }
      />

      {/* Scrollable Content */}
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        onScroll={e => setScrolled(e.currentTarget.scrollTop > 8)}
      >
        <div className="flex flex-col gap-6 py-6">
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

      {/* Sticky Remark Footer */}
      <StickyRemarkFooter
        taskId={taskId}
        taskDraft={taskData}
        canEdit={!!taskId && isTaskOwner && !isReadOnly}
      />

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
