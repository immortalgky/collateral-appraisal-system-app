import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  GalleryTab,
  LawsRegulationTab,
  MarketsTab,
  PhotosTab,
} from '@/features/appraisal/components/tabs';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';

import { hasStructures, isCondo } from '../types';
import type { ProjectType } from '../types';
import ProjectInfoTab from '../components/tabs/ProjectInfoTab';
import UnitListingTab from '../components/tabs/UnitListingTab';
import ProjectLandTab from '../components/tabs/ProjectLandTab';
import ModelListingTab from '../components/tabs/ModelListingTab';
import TowerListingTab from '../components/tabs/TowerListingTab';
import UnitPriceTab from '../components/tabs/UnitPriceTab';
import { CondoFrame, CondoShellContext } from '../components/condo';
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
  /** The type the route stands for; only the fallback until the project loads (see below). */
  projectType: ProjectType;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Unified block project page for Condo (U), Land and Building (LB) and Land and Building
 * (Construction) (L, appraised as land only), all in the
 * one shell. The type that decides tabs and behaviour is the project's stored one, not the route's:
 * `block-village` serves both LB and L. Tabs receive that effective type as a prop, and anything
 * deeper reads it from `useBlockProjectType()`.
 */
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export default function BlockProjectPage({ projectType: routeType }: BlockProjectPageProps) {
  const { t } = useTranslation('blockProject');
  const [searchParams, setSearchParams] = useSearchParams();
  const appraisalId = useAppraisalId() ?? '';

  // The stored type is the source of truth; the route's is only the fallback while loading or when
  // the appraisal has no project yet.
  const {
    data: project,
    isError: isProjectError,
    refetch: refetchProject,
  } = useGetProject(appraisalId);
  const projectType: ProjectType = project?.projectType ?? routeType;
  const condo = isCondo(projectType);

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

  // L is appraised as land only (no models): the LB list without the models (แบบ) tab.
  const tabs = condo
    ? CONDO_TABS
    : hasStructures(projectType)
      ? LB_TABS
      : LB_TABS.filter(tab => tab.id !== 'models');
  const validTabIds = tabs.map(tab => tab.id);

  const tabParam = searchParams.get('tab') as TabId | null;
  const activeTab: TabId = tabParam && validTabIds.includes(tabParam) ? tabParam : 'project-info';

  // Seed `?tab=project-info` on first arrival so the URL is the source of truth
  // (the layout breadcrumb reads `?tab=` to render the active-tab crumb).
  useEffect(() => {
    if (!tabParam || !validTabIds.includes(tabParam as TabId)) {
      setSearchParams({ tab: 'project-info' }, { replace: true });
    }
    // validTabIds is derived from `tabs`, which depends only on projectType — stable. projectType
    // is a dep because it can change once the project loads (L drops the models tab).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam, projectType, setSearchParams]);

  // Condo "expand table": local UI state, only meaningful on the unit-price tab and dropped when
  // the user leaves it. Esc restores it unless a dialog or drawer is open (it owns Esc).
  const [focusOn, setFocusOn] = useState(false);

  const handleTabChange = (tabId: TabId) => {
    setFocusOn(false);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const focus = focusOn && activeTab === 'unit-price';
  useEffect(() => {
    if (!focus) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('dialog, [role="dialog"], [aria-modal="true"]')) return;
      setFocusOn(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [focus]);

  // ── Child count queries for the type-change dialog ────────────────────────
  // TanStack Query deduplicates these with the same keys used inside tab
  // subcomponents, so no extra network requests are made.
  const {
    data: modelsData,
    isError: isModelsError,
    refetch: refetchModels,
  } = useGetProjectModels(appraisalId);
  // Towers exist for condo only, project land for LB/L only: each runs just for its own types.
  const {
    data: towersData,
    isError: isTowersError,
    refetch: refetchTowers,
  } = useGetProjectTowers(appraisalId, condo);
  const {
    data: unitsData,
    isError: isUnitsError,
    refetch: refetchUnits,
  } = useGetProjectUnits(appraisalId);
  const { data: pricingData } = useGetProjectPricingAssumptions(appraisalId);
  const {
    data: landData,
    isError: isLandError,
    refetch: refetchLand,
  } = useGetProjectLand(appraisalId, !condo);

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
    // L gets an empty shell (Guid.Empty id) when nothing is saved yet: not a record to reset.
    hasPricing: pricingData != null && pricingData.id !== EMPTY_GUID,
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
        return isUnitsError && unitsData === undefined ? (
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
        // Not gated on the assumption query: the tab handles its failure itself (the Calculated view
        // shows the error with a retry; the Imported view does not need the assumption at all).
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

  // One shell for every type (header, tab bar, scroller in the form-layout look). The project-info
  // tab mounts its own CondoFrame because its fields and ActionBar must share one <form>; every
  // other tab is wrapped here with `body="fill"`, a bounded box that manages its own scrolling.
  return (
    <CondoShellContext.Provider
      value={{
        projectType,
        tabs,
        activeTab,
        onTabChange: id => handleTabChange(id as TabId),
        focus,
        onFocusChange: setFocusOn,
      }}
    >
      {activeTab === 'project-info' ? (
        renderTabContent()
      ) : (
        <CondoFrame body="fill" panelId={`${activeTab}-section`}>
          {renderTabContent()}
        </CondoFrame>
      )}
    </CondoShellContext.Provider>
  );
}
