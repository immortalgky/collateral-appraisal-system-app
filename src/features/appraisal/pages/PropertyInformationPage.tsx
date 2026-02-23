import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import {
  GalleryTab,
  LawsRegulationTab,
  MarketsTab,
  PhotosTab,
  PropertiesTab,
} from '../components/tabs';

type TabId = 'properties' | 'markets' | 'gallery' | 'photos' | 'laws';
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
  { id: 'photos', label: 'Photos', icon: 'camera' },
  { id: 'laws', label: 'Laws', icon: 'gavel' },
];

const VALID_TABS: TabId[] = ['properties', 'markets', 'gallery', 'photos', 'laws'];

export default function PropertyInformationPage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'properties';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'properties':
        return <PropertiesTab viewMode={viewMode} onViewModeChange={setViewMode} />;
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
