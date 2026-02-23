import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { useAppraisalContext } from '../../context/AppraisalContext';
import { useGetMarketComparables } from '../../api/marketComparable';
import FormCard from '@shared/components/sections/FormCard';
import CollateralSelectModal from '../CollateralSelectModal';

import type { MarketComparableDtoType } from '@/shared/schemas/v1';

interface MarketComparableItem {
  id: string;
  comparableNumber: string;
  propertyType: string;
  dataSource?: string;
  transactionType?: string | null;
  transactionDate?: string | null;
  transactionPrice?: number | null;
  status?: string | null;
}

const propertyTypeOptions = [
  { code: 'Land', description: 'Land' },
  { code: 'Building', description: 'Building' },
  { code: 'LandAndBuilding', description: 'Land and Building' },
  { code: 'Condo', description: 'Condominium' },
  { code: 'Machine', description: 'Machinery' },
  { code: 'LS', description: 'Lease Agreement Lands' },
  { code: 'BS', description: 'Lease Agreement Building' },
  { code: 'LBS', description: 'Lease Agreement Land and Building' },
];

export const MarketsTab = () => {
  const navigate = useNavigate();
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId;

  const { data: marketComparables, isLoading, isError } = useGetMarketComparables(appraisalId);

  // Collateral type select modal state
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenCreateModal = (e: React.MouseEvent) => {
    setModalPosition({ x: e.clientX, y: e.clientY });
    setIsModalOpen(true);
  };

  const handleCreateSelect = (item: any) => {
    setIsModalOpen(false);
    navigate(`/appraisal/${appraisalId}/property/market-comparable/new?propertyType=${item.code}`);
  };

  const handleViewComparable = (comparableId: string) => {
    navigate(`/appraisal/${appraisalId}/property/market-comparable/${comparableId}`);
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
        <p className="text-sm font-medium">Failed to load market comparables</p>
        <p className="text-xs text-gray-400 mt-1">Please try again later</p>
      </div>
    );
  }

  // Transform API response to match component interface
  const comparables: MarketComparableItem[] =
    (marketComparables as MarketComparableDtoType[] | undefined)?.map(item => ({
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
          <h3 className="text-sm font-semibold text-gray-900">Market Comparables</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {comparables.length} comparable{comparables.length !== 1 ? 's' : ''} linked to this appraisal
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreateModal} className="flex items-center gap-2">
          <Icon name="plus" />
          Create Comparable
        </Button>
      </div>

      {/* Comparable List */}
      {comparables.length === 0 ? (
        <FormCard title="Market Comparables" subtitle="Comparative market analysis">
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <Icon name="chart-line" className="text-2xl text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No market comparables yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Create a market comparable to analyze comparable properties
            </p>
            <Button
              variant="outline"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2"
            >
              <Icon name="plus" />
              Create First Comparable
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
            {comparables.map(comparable => (
              <div
                key={comparable.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => handleViewComparable(comparable.id)}
              >
                <div className="col-span-2 flex items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {comparable.comparableNumber}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {comparable.propertyType}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-gray-600 truncate">{comparable.dataSource || '-'}</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-gray-600 truncate">
                    {comparable.transactionType || '-'}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-gray-700">
                    {comparable.transactionPrice
                      ? new Intl.NumberFormat('th-TH', {
                          style: 'currency',
                          currency: 'THB',
                          maximumFractionDigits: 0,
                        }).format(comparable.transactionPrice)
                      : '-'}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleViewComparable(comparable.id);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="View comparable"
                  >
                    <Icon name="eye" style="solid" />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleViewComparable(comparable.id);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit comparable"
                  >
                    <Icon name="pen-to-square" style="solid" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Property Type Select Modal */}
      {isModalOpen && (
        <CollateralSelectModal
          items={propertyTypeOptions}
          position={modalPosition || { x: 0, y: 0 }}
          onSelect={handleCreateSelect}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MarketsTab;
