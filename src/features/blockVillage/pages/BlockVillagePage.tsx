import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import {
  GalleryTab,
  LawsRegulationTab,
  MarketsTab,
  PhotosTab,
} from '@/features/appraisal/components/tabs';
import ProjectInfoTab from '../components/tabs/ProjectInfoTab';
import UnitListingTab from '../components/tabs/UnitListingTab';
import ProjectLandTab from '../components/tabs/ProjectLandTab';
import ModelListingTab from '../components/tabs/ModelListingTab';
import UnitPriceTab from '../components/tabs/UnitPriceTab';

type TabId =
  | 'project-info'
  | 'unit-listing'
  | 'project-land'
  | 'models'
  | 'unit-price'
  | 'markets'
  | 'gallery'
  | 'photos'
  | 'laws';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'project-info', label: 'Project Info', icon: 'building-columns' },
  { id: 'unit-listing', label: 'Unit Listing', icon: 'table-list' },
  { id: 'project-land', label: 'Project Land', icon: 'map' },
  { id: 'models', label: 'Model', icon: 'house' },
  { id: 'unit-price', label: 'Unit Price', icon: 'tags' },
  { id: 'markets', label: 'Markets', icon: 'chart-line' },
  { id: 'gallery', label: 'Gallery', icon: 'images' },
  { id: 'photos', label: 'Photo', icon: 'camera' },
  { id: 'laws', label: 'Laws and Regulation', icon: 'gavel' },
];

const VALID_TABS = TABS.map(t => t.id);

export default function BlockVillagePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;
  const activeTab: TabId = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'project-info';

  const handleTabChange = (tabId: TabId) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'project-info':
        return <ProjectInfoTab />;
      case 'unit-listing':
        return <UnitListingTab />;
      case 'project-land':
        return <ProjectLandTab />;
      case 'models':
        return <ModelListingTab />;
      case 'unit-price':
        return <UnitPriceTab />;
      case 'markets':
        return <MarketsTab />;
      case 'gallery':
        return <GalleryTab />;
      case 'photos':
        return <PhotosTab />;
      case 'laws':
        return <LawsRegulationTab />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab Navigation */}
      <div className="shrink-0 pb-4">
        <nav className="flex gap-0.5 bg-gray-50/80 p-0.5 rounded-lg border border-gray-100 overflow-x-auto">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
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
