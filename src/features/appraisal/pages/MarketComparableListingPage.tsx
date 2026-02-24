import ResizableSidebar from '@/shared/components/ResizableSidebar';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import MarketComparableTable from '../components/tables/MarketComparableTable';
import { useDeleteMarketComparable, useGetMarketComparables } from '../api/marketComparable';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CollateralSelectModal from '../components/CollateralSelectModal';
import Icon from '@/shared/components/Icon';
import toast from 'react-hot-toast';

const MarketComparableListingPage = () => {
  const { isOpen, onToggle } = useDisclosure();
  // Fetch market comparable data (general pool, no appraisalId needed)
  const { data: marketComparables, isLoading } = useGetMarketComparables();
  const { mutate: deleteComparable } = useDeleteMarketComparable();

  const items = (marketComparables ?? []).map(item => ({
    id: item.id ?? '',
    comparableNumber: item.comparableNumber ?? '',
    surveyName: item.surveyName ?? '',
    propertyType: item.propertyType ?? '',
    infoDateTime: item.infoDateTime ?? '',
    sourceInfo: item.sourceInfo ?? '',
    notes: item.notes ?? '',
    createdOn: item.createdOn ?? '',
  }));

  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const navigate = useNavigate();

  // Handle opening of collateral select modal and set position
  const handleOpenModal = (e: React.MouseEvent) => {
    setModalPosition({
      x: e.clientX,
      y: e.clientY,
    });
    setIsOpenModal(true);
  };

  // Handle selection of market comparable for editing
  const handleEditSelect = (item: any) => {
    navigate(`/market-comparable/detail?id=${item.id}`, {
      state: {
        market: item,
      },
    });
  };

  // Handle deletion of market comparable
  const handleDelete = (id: string) => {
    deleteComparable(id, {
      onSuccess: () => {
        toast.success('Market comparable deleted successfully');
      },
      onError: () => {
        toast.error('Failed to delete market comparable');
      },
    });
  };

  // Handle selection of collateral type for creating new market comparable
  const handleCreateSelect = (item: any) => {
    navigate(`/market-comparable/detail?propertyType=${item.code}`);
    setIsOpenModal(false);
  };

  if (isLoading) {
    return (
      <div className="w-full flex justify-center col-span-4">
        <span className="loading loading-spinner text-primary"></span>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Market Comparables</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {items.length} comparable{items.length !== 1 ? 's' : ''} linked to this appraisal
        </p>
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto h-[calc(100dvh-15rem)] scroll-smooth">
        <ResizableSidebar
          isOpen={isOpen}
          onToggle={onToggle}
          openedWidth="w-1/5"
          closedWidth="w-1/50"
        >
          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pt-3">
            <div className="flex-auto flex flex-col gap-6">
              <Section anchor className="flex flex-col gap-6">
                <MarketComparableTable
                  headers={headers}
                  data={items}
                  onSelect={handleEditSelect}
                  onDelete={handleDelete}
                />
              </Section>
            </div>
            <div className="border-t border-gray-100 sticky bottom-0 pt-3">
              <button
                type="button"
                onClick={handleOpenModal}
                className="w-full flex items-center justify-center gap-2 py-4 mt-2 text-sm font-medium
                    border-2 border-dashed border-misc-1 text-neutral-5 bg-white hover:bg-neutral-1
                    transition-colors rounded-lg"
              >
                <div className="w-6 h-6 rounded-full bg-neutral-5 flex items-center justify-center">
                  <Icon style="solid" name="circle-plus" className="size-3 text-neutral-5" />
                </div>
                Add market comparable
              </button>
            </div>
            {isOpenModal && (
              <CollateralSelectModal
                items={parameters.values}
                position={modalPosition || { x: 0, y: 0 }}
                onSelect={handleCreateSelect}
                onCancel={() => setIsOpenModal(false)}
              />
            )}
          </div>
        </ResizableSidebar>
      </div>
    </div>
  );
};

const parameters = {
  parameterGroup: 'propertyType',
  values: [
    { code: 'Land', description: 'Land' },
    { code: 'Building', description: 'Building' },
    { code: 'LandAndBuilding', description: 'Land and Building' },
    { code: 'Condo', description: 'Condominium' },
    { code: 'Machine', description: 'Machinery' },
    { code: 'LSL', description: 'Lease Agreement Lands' },
    { code: 'LSB', description: 'Lease Agreement Building' },
    { code: 'LS', description: 'Lease Agreement Land and Building' },
  ],
};

const headers = [
  { name: 'comparableNumber', label: 'Comparable No.' },
  { name: 'surveyName', label: 'Comparable Name' },
  { name: 'propertyType', label: 'Property Type' },
  { name: 'createdOn', label: 'Created On' },
];

export default MarketComparableListingPage;
