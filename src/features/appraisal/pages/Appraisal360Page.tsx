import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import Icon from '@/shared/components/Icon';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import { useGetAppraisalById } from '../api/appraisal';
import { useGetDecisionSummary } from '../api/decisionSummary';
import { useGetRequestById } from '@features/request/api/requests';
import { useEnrichedPropertyGroups } from '../hooks/useEnrichedPropertyGroups';
import type { PropertyType } from '../types';

import StickyHeaderCard from '../components/360/StickyHeaderCard';
import RequestInfoSection from '../components/360/RequestInfoSection';
import PropertyGroupsSection from '../components/360/PropertyGroupsSection';
import PricingAnalysisSection from '../components/360/PricingAnalysisSection';
import FooterSection from '../components/360/FooterSection';
import PropertyDetailSlideOver from '../components/360/PropertyDetailSlideOver';
import PricingBreakdownSlideOver from '../components/360/PricingBreakdownSlideOver';

// ==================== Slide-Over State ====================

type SlideOverState =
  | { type: 'closed' }
  | { type: 'property'; propertyId: string; propertyType: PropertyType; groupName: string }
  | { type: 'pricing'; groupId: string; pricingAnalysisId: string; groupName: string };

// ==================== Page Component ====================

const Appraisal360Page = () => {
  const appraisalId = useAppraisalId();
  const [slideOver, setSlideOver] = useState<SlideOverState>({ type: 'closed' });

  // Data hooks
  const { data: appraisal, isLoading: isLoadingAppraisal } = useGetAppraisalById(appraisalId);
  const { data: request } = useGetRequestById(appraisal?.requestId);
  const { groups, isLoading: isLoadingGroups } = useEnrichedPropertyGroups(appraisalId);
  const { data: decisionSummary, isLoading: isLoadingDecision } = useGetDecisionSummary(appraisalId);


  const isPageLoading = isLoadingAppraisal;

  const handlePropertyClick = (propertyId: string, propertyType: PropertyType, groupName: string) => {
    setSlideOver({ type: 'property', propertyId, propertyType, groupName });
  };

  const handleCloseSlideOver = () => {
    setSlideOver({ type: 'closed' });
  };

  const handleGoToPricingAnalysis = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const paId = group?.pricingAnalysisId;
    if (paId) {
      setSlideOver({ type: 'pricing', groupId, pricingAnalysisId: paId, groupName: group?.name || '' });
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
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
              onClick={() => {/* TODO: download appraisal report */}}
            >
              <Icon name="file-arrow-down" style="solid" className="w-3.5 h-3.5 text-teal-600" />
              Appraisal Report
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
              onClick={() => {/* TODO: download summary document */}}
            >
              <Icon name="file-arrow-down" style="solid" className="w-3.5 h-3.5 text-purple-600" />
              Appraisal Summary
            </button>
          </div>

          {/* Request Information */}
          <RequestInfoSection appraisal={appraisal} request={request} />

          {/* Property Groups */}
          <PropertyGroupsSection
            groups={groups}
            isLoading={isLoadingGroups}
            onPropertyClick={handlePropertyClick}
          />

          {/* Pricing Analysis */}
          <PricingAnalysisSection
            decisionSummary={decisionSummary}
            isLoading={isLoadingDecision}
            onGroupClick={handleGoToPricingAnalysis}
          />

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
    </div>
  );
};

export default Appraisal360Page;
