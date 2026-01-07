import ResizableSidebar from '@/shared/components/ResizableSidebar';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import MarketSurveyTable from '../components/tables/MarketSurveyTable';
import { useGetMarketSurvey, useGetParameter } from '../api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CollateralSelectModal from '../components/CollateralSelectModal';
import Icon from '@/shared/components/Icon';

const ListMarketSurveyPage = () => {
  const { isOpen, onToggle } = useDisclosure();
  // Fetch market survey data
  const { data: marketSurvey, isLoading } = useGetMarketSurvey('appraisalId');

  // Fetch parameter data for collateral types
  const { data: parameter } = useGetParameter();

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

  // Helper to get parameter values by group
  const getParameterValues = (parameters: any[] | undefined, group: string) => {
    return parameters?.find(p => p.parameterGroup === group)?.values ?? [];
  };
  // Handle selection of market survey for editing
  const handleEditSelect = (item: any) => {
    navigate(`/market-survey/detail?id=${item.id}`, {
      state: {
        market: item,
      },
    });
  };

  // Handle selection of collateral type for creating new market survey
  const handleCreateSelect = (item: any) => {
    navigate(`/market-survey/detail?collateralType=${item.description}`);
    setIsOpenModal(false);
  };

  if (isLoading) {
    return <span className="loading loading-spinner loading-xl"></span>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Market Survey</h1>

      <div className="flex flex-col gap-6 overflow-y-auto h-[calc(100dvh-15rem)] scroll-smooth">
        <ResizableSidebar
          isOpen={isOpen}
          onToggle={onToggle}
          openedWidth="w-1/5"
          closedWidth="w-1/50"
        >
          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pt-3">
            <div className="flex-auto flex flex-col gap-6 ">
              <Section anchor className="flex flex-col gap-6">
                <MarketSurveyTable
                  headers={headers}
                  data={marketSurvey}
                  onSelect={handleEditSelect}
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
                Add market survey
              </button>
            </div>
            {isOpenModal && (
              <CollateralSelectModal
                items={getParameterValues(parameter, 'collateralType')}
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

const headers = [
  { name: 'surveyNumber', label: 'Survey No.' },
  { name: 'surveyName', label: 'Survey Name' },
  { name: 'surveyTemplateCode', label: 'Template' },
  { name: 'collateralType', label: 'Property Type' },
];

export default ListMarketSurveyPage;
