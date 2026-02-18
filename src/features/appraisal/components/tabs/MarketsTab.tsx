import { useNavigate } from 'react-router-dom';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { useAppraisalContext } from '../../context/AppraisalContext';
import { useGetMarketSurvey } from '../../api';
import FormCard from '@shared/components/sections/FormCard';

import type { MarketComparableDtoType } from '@/shared/schemas/v1';

interface MarketSurveyItem {
  id: string;
  comparableNumber: string;
  propertyType: string;
  dataSource?: string;
  transactionType?: string | null;
  transactionDate?: string | null;
  transactionPrice?: number | null;
  status?: string | null;
}

export const MarketsTab = () => {
  const navigate = useNavigate();
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId;

  const { data: marketSurveys, isLoading, isError } = useGetMarketSurvey(appraisalId);

  const handleCreateSurvey = () => {
    navigate('/market-survey/detail');
  };

  const handleViewSurvey = (surveyId: string) => {
    navigate(`/market-survey/detail?id=${surveyId}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
          <div className="h-9 w-40 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-50 border-b border-gray-100" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 border-b border-gray-100 px-4 flex items-center gap-4">
                <div className="h-4 w-24 bg-gray-100 rounded" />
                <div className="h-4 w-32 bg-gray-100 rounded" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Icon name="triangle-exclamation" className="text-4xl mb-3 text-red-400" />
        <p className="text-sm font-medium">Failed to load market surveys</p>
        <p className="text-xs text-gray-400 mt-1">Please try again later</p>
      </div>
    );
  }

  // Transform API response to match component interface
  const surveys: MarketSurveyItem[] = (marketSurveys as MarketComparableDtoType[] | undefined)?.map(item => ({
    id: item.id ?? '',
    comparableNumber: item.comparableNumber ?? '',
    propertyType: item.propertyType ?? '',
    dataSource: item.dataSource,
    transactionType: item.transactionType,
    transactionDate: item.transactionDate,
    transactionPrice: item.transactionPrice,
    status: item.status,
  })) || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Market Surveys</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {surveys.length} survey{surveys.length !== 1 ? 's' : ''} linked to this appraisal
          </p>
        </div>
        <Button variant="primary" onClick={handleCreateSurvey} className="flex items-center gap-2">
          <Icon name="plus" />
          Create Survey
        </Button>
      </div>

      {/* Survey List */}
      {surveys.length === 0 ? (
        <FormCard title="Market Surveys" subtitle="Comparative market analysis">
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <Icon name="chart-line" className="text-2xl text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No market surveys yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Create a market survey to analyze comparable properties
            </p>
            <Button variant="outline" onClick={handleCreateSurvey} className="flex items-center gap-2">
              <Icon name="plus" />
              Create First Survey
            </Button>
          </div>
        </FormCard>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-primary/5 border-b border-gray-100 text-xs font-medium text-primary uppercase tracking-wider">
            <div className="col-span-2">Comparable No.</div>
            <div className="col-span-2">Property Type</div>
            <div className="col-span-2">Data Source</div>
            <div className="col-span-2">Transaction Type</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {surveys.map(survey => (
              <div
                key={survey.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => handleViewSurvey(survey.id)}
              >
                <div className="col-span-2 flex items-center">
                  <span className="text-sm font-medium text-gray-900">{survey.comparableNumber}</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {survey.propertyType}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-gray-600 truncate">{survey.dataSource || '-'}</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-gray-600 truncate">{survey.transactionType || '-'}</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-gray-700">
                    {survey.transactionPrice
                      ? new Intl.NumberFormat('th-TH', {
                          style: 'currency',
                          currency: 'THB',
                          maximumFractionDigits: 0
                        }).format(survey.transactionPrice)
                      : '-'}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleViewSurvey(survey.id);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="View survey"
                  >
                    <Icon name="eye" style="solid" />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleViewSurvey(survey.id);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit survey"
                  >
                    <Icon name="pen-to-square" style="solid" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketsTab;
