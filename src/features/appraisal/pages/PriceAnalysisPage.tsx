import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useReducer, useState } from 'react';
import { useLocation } from 'react-router-dom';
import MarketsTab from '../components/tabs/MarketsTab';
import GalleryTab from '../components/tabs/GalleryTab';
import LawsRegulationTab from '../components/tabs/LawsRegulationTab';
import { PriceAnalysisTab } from '@features/appraisal/components/priceAnalysis/components/PriceAnalysisTab.tsx';
import {
  DispatchCtx,
  StateCtx,
} from '../components/priceAnalysis/features/selection/domain/selectionContext';
import {
  approachMethodReducer,
  type PriceAnalysisSelectorState,
} from '@features/appraisal/components/priceAnalysis/features/selection/domain/useReducer.tsx';

type TabId = 'properties' | 'markets' | 'gallery' | 'laws';
type ViewMode = 'grid' | 'list';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'properties', label: 'Properties', icon: 'buildings' },
  { id: 'markets', label: 'Markets', icon: 'chart-line' },
  { id: 'gallery', label: 'Gallery', icon: 'images' },
  { id: 'laws', label: 'Laws', icon: 'gavel' },
];

function PriceAnalysisPage() {
  const location = useLocation();
  const { state: navigationState } = location;
  // const { groupId } = navigationState; // groupId from property

  // api call to get property data which belongs to this group

  const [activeTab, setActiveTab] = useState<TabId>('properties');
  // const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'properties': {
        // when click this tab, actually should show Property tab as default so user can click 'AP' button to go back to Price Analysis tab
        /** Initial reducer state */
        const initialState: PriceAnalysisSelectorState = {
          viewMode: 'summary',
          editDraft: [],
          editSaved: [],
          summarySelected: [],
          systemCalculationMode: 'System', // base on group detail query

          groupDetails: {},
          property: {},
          marketSurveys: [],
        };

        const _groupId = 'D7AA433E-F36B-1410-8965-006F4F934FE1';

        const [state, dispatch] = useReducer(approachMethodReducer, initialState);
        return (
          <StateCtx.Provider value={state}>
            <DispatchCtx.Provider value={dispatch}>
              <PriceAnalysisTab groupId={_groupId} />
            </DispatchCtx.Provider>
          </StateCtx.Provider>
        );
      }
      case 'markets':
        return <MarketsTab />;
      case 'gallery':
        return <GalleryTab />;
      case 'laws':
        return <LawsRegulationTab />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab Navigation - Compact */}
      <div className="shrink-0 pb-4">
        <nav className="flex gap-0.5 bg-gray-50/80 p-0.5 rounded-lg border border-gray-100">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50',
                )}
              >
                <Icon
                  name={tab.icon}
                  style="solid"
                  className={clsx('size-3.5', isActive ? 'text-primary' : 'text-gray-400')}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">{renderTabContent()}</div>
    </div>
  );
}

export default PriceAnalysisPage;
