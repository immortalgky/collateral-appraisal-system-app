import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import Icon from '@shared/components/Icon';
import {
  GalleryTab,
  LawsRegulationTab,
  MarketsTab,
  PhotosTab,
} from '@/features/appraisal/components/tabs';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';

import { isCondo } from '../types';
import type { ProjectType } from '../types';
import ProjectInfoTab from '../components/tabs/ProjectInfoTab';
import UnitListingTab from '../components/tabs/UnitListingTab';
import ProjectLandTab from '../components/tabs/ProjectLandTab';
import ModelListingTab from '../components/tabs/ModelListingTab';
import TowerListingTab from '../components/tabs/TowerListingTab';
import UnitPriceTab from '../components/tabs/UnitPriceTab';
import { useGetProject } from '../api/project';
import { useGetProjectModels } from '../api/projectModel';
import { useGetProjectTowers } from '../api/projectTower';
import { useGetProjectUnits } from '../api/projectUnit';
import { useGetProjectPricingAssumptions } from '../api/projectPricingAssumption';
import { useGetProjectLand } from '../api/projectLand';
import DataErrorState from '@shared/components/DataErrorState';

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
  const { t } = useTranslation('blockProject');
  const [searchParams, setSearchParams] = useSearchParams();
  const appraisalId = useAppraisalId() ?? '';

  const CONDO_TABS: TabDef[] = [
    { id: 'project-info', label: t('page.tabs.projectInfo'), icon: 'building-columns' },
    { id: 'unit-listing', label: t('page.tabs.unitListing'), icon: 'table-list' },
    { id: 'towers', label: t('page.tabs.towers'), icon: 'building' },
    { id: 'models', label: t('page.tabs.models'), icon: 'layer-group' },
    { id: 'unit-price', label: t('page.tabs.unitPrice'), icon: 'tags' },
    { id: 'markets', label: t('page.tabs.markets'), icon: 'magnifying-glass-chart' },
    { id: 'gallery', label: t('page.tabs.gallery'), icon: 'images' },
    { id: 'photos', label: t('page.tabs.photos'), icon: 'camera' },
    { id: 'laws', label: t('page.tabs.laws'), icon: 'gavel' },
  ];

  const LB_TABS: TabDef[] = [
    { id: 'project-info', label: t('page.tabs.projectInfo'), icon: 'building-columns' },
    { id: 'unit-listing', label: t('page.tabs.unitListing'), icon: 'table-list' },
    { id: 'project-land', label: t('page.tabs.projectLand'), icon: 'map' },
    { id: 'models', label: t('page.tabs.models'), icon: 'house' },
    { id: 'unit-price', label: t('page.tabs.unitPrice'), icon: 'tags' },
    { id: 'markets', label: t('page.tabs.markets'), icon: 'magnifying-glass-chart' },
    { id: 'gallery', label: t('page.tabs.gallery'), icon: 'images' },
    { id: 'photos', label: t('page.tabs.photos'), icon: 'camera' },
    { id: 'laws', label: t('page.tabs.laws'), icon: 'gavel' },
  ];

  const tabs = isCondo(projectType) ? CONDO_TABS : LB_TABS;
  const validTabIds = tabs.map(tab => tab.id);

  const tabParam = searchParams.get('tab') as TabId | null;
  const activeTab: TabId = tabParam && validTabIds.includes(tabParam) ? tabParam : 'project-info';

  // Seed `?tab=project-info` on first arrival so the URL is the source of truth
  // (the layout breadcrumb reads `?tab=` to render the active-tab crumb).
  useEffect(() => {
    if (!tabParam || !validTabIds.includes(tabParam as TabId)) {
      setSearchParams({ tab: 'project-info' }, { replace: true });
    }
    // validTabIds is derived from `tabs`, which depends only on projectType — stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam, setSearchParams]);

  const handleTabChange = (tabId: TabId) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  // ── Child count queries for the type-change dialog ────────────────────────
  // TanStack Query deduplicates these with the same keys used inside tab
  // subcomponents, so no extra network requests are made.
  const {
    data: project,
    isError: isProjectError,
    refetch: refetchProject,
  } = useGetProject(appraisalId, projectType);
  const {
    data: modelsData,
    isError: isModelsError,
    refetch: refetchModels,
  } = useGetProjectModels(appraisalId);
  const {
    data: towersData,
    isError: isTowersError,
    refetch: refetchTowers,
  } = useGetProjectTowers(appraisalId);
  const {
    data: unitsData,
    isError: isUnitsError,
    refetch: refetchUnits,
  } = useGetProjectUnits(appraisalId);
  const {
    data: pricingData,
    isError: isPricingError,
    refetch: refetchPricing,
  } = useGetProjectPricingAssumptions(appraisalId);
  const {
    data: landData,
    isError: isLandError,
    refetch: refetchLand,
  } = useGetProjectLand(appraisalId);

  // Latch: once the project is confirmed to exist, keep this true so transient
  // background refetches (triggered by invalidateQueries after save) don't
  // briefly flip hasExistingProject to false and disable the type dropdown.
  // The latch only goes true→false when appraisalId changes (different appraisal);
  // type changes navigate to a new route which unmounts/remounts this component.
  const [hasExistingProject, setHasExistingProject] = useState(() => project != null);
  useEffect(() => {
    if (project != null) setHasExistingProject(true);
  }, [project]);
  useEffect(() => {
    setHasExistingProject(project != null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appraisalId]);
  const childCounts = {
    models: modelsData?.length ?? 0,
    towers: towersData?.length ?? 0,
    units: unitsData?.totalCount ?? 0,
    hasLand: landData != null,
    hasPricing: pricingData != null,
  };

  if (isProjectError) {
    return <DataErrorState title={t('errors.failedToLoadProject')} onRetry={refetchProject} />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'project-info':
        return (
          <ProjectInfoTab
            projectType={projectType}
            hasExistingProject={hasExistingProject}
            childCounts={childCounts}
          />
        );
      case 'unit-listing':
        return isUnitsError ? (
          <DataErrorState variant="inline" onRetry={refetchUnits} />
        ) : (
          <UnitListingTab projectType={projectType} />
        );
      case 'project-land':
        return isLandError ? (
          <DataErrorState variant="inline" onRetry={refetchLand} />
        ) : (
          <ProjectLandTab />
        );
      case 'models':
        return isModelsError ? (
          <DataErrorState variant="inline" onRetry={refetchModels} />
        ) : (
          <ModelListingTab projectType={projectType} />
        );
      case 'towers':
        return isTowersError ? (
          <DataErrorState variant="inline" onRetry={refetchTowers} />
        ) : (
          <TowerListingTab />
        );
      case 'unit-price':
        return isPricingError ? (
          <DataErrorState variant="inline" onRetry={refetchPricing} />
        ) : (
          <UnitPriceTab projectType={projectType} />
        );
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
