import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';

import Icon from '@shared/components/Icon';
import {
  GalleryTab,
  LawsRegulationTab,
  MarketsTab,
  PhotosTab,
} from '@/features/appraisal/components/tabs';

import type { ProjectType } from '../types';
import ProjectInfoTab from '../components/tabs/ProjectInfoTab';
import UnitListingTab from '../components/tabs/UnitListingTab';
import ProjectLandTab from '../components/tabs/ProjectLandTab';
import ModelListingTab from '../components/tabs/ModelListingTab';
import TowerListingTab from '../components/tabs/TowerListingTab';
import UnitPriceTab from '../components/tabs/UnitPriceTab';

// ── Tab definitions ───────────────────────────────────────────────────────────

type CondoTabId =
  | 'project-info'
  | 'unit-listing'
  | 'models'
  | 'towers'
  | 'unit-price'
  | 'markets'
  | 'gallery'
  | 'photos'
  | 'laws';

type LbTabId =
  | 'project-info'
  | 'unit-listing'
  | 'project-land'
  | 'models'
  | 'unit-price'
  | 'markets'
  | 'gallery'
  | 'photos'
  | 'laws';

type TabId = CondoTabId | LbTabId;

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

const CONDO_TABS: TabDef[] = [
  { id: 'project-info', label: 'Project Info', icon: 'building-columns' },
  { id: 'unit-listing', label: 'Unit Listing', icon: 'table-list' },
  { id: 'models', label: 'Model', icon: 'layer-group' },
  { id: 'towers', label: 'Tower', icon: 'building' },
  { id: 'unit-price', label: 'Unit Price', icon: 'tags' },
  { id: 'markets', label: 'Markets', icon: 'chart-line' },
  { id: 'gallery', label: 'Gallery', icon: 'images' },
  { id: 'photos', label: 'Photo', icon: 'camera' },
  { id: 'laws', label: 'Laws and Regulation', icon: 'gavel' },
];

const LB_TABS: TabDef[] = [
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

function getTabs(projectType: ProjectType): TabDef[] {
  return projectType === 'Condo' ? CONDO_TABS : LB_TABS;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface BlockProjectPageProps {
  projectType: ProjectType;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Unified block project page for both Condo and LandAndBuilding project types.
 * Tab list is derived from projectType; content components receive projectType
 * as a prop and branch internally.
 */
export default function BlockProjectPage({ projectType }: BlockProjectPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabs = getTabs(projectType);
  const validTabIds = tabs.map(t => t.id);

  const tabParam = searchParams.get('tab') as TabId | null;
  const activeTab: TabId =
    tabParam && validTabIds.includes(tabParam) ? tabParam : 'project-info';

  const handleTabChange = (tabId: TabId) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'project-info':
        return <ProjectInfoTab projectType={projectType} />;
      case 'unit-listing':
        return <UnitListingTab projectType={projectType} />;
      case 'project-land':
        // LandAndBuilding only — safe because the tab only appears in LB_TABS
        return <ProjectLandTab />;
      case 'models':
        return <ModelListingTab projectType={projectType} />;
      case 'towers':
        // Condo only — safe because the tab only appears in CONDO_TABS
        return <TowerListingTab />;
      case 'unit-price':
        return <UnitPriceTab projectType={projectType} />;
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
          {tabs.map(tab => {
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
