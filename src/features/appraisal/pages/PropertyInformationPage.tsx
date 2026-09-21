import { useEffect } from 'react';
import {
  useLocation,
  useNavigate,
  useOutlet,
  useResolvedPath,
  useSearchParams,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
// Tab state is mirrored to the URL (?tab=xxx) so it survives reload, deep-link,
// and the layout breadcrumb can append the active tab as a structural crumb.
import clsx from 'clsx';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { usePropertyBasePath } from '@/features/appraisal/hooks/usePropertyBasePath';
import { useEnrichedPropertyGroups } from '../hooks/useEnrichedPropertyGroups';
import { useGetAppraisalComparables, useGetLawAndRegulations } from '@features/appraisal/api';
import { useGetGalleryPhotos } from '../api/gallery';
import { useGetPhotoTopics } from '../api/photo';
import Icon from '@shared/components/Icon';
import { useUIStore } from '@shared/store';
import {
  GalleryTab,
  LawsRegulationTab,
  MarketsTab,
  PhotosTab,
  PropertiesTab,
} from '../components/tabs';

type TabId = 'properties' | 'markets' | 'gallery' | 'photos' | 'laws';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  /**
   * Shown beside the label; hidden at zero. Each comes from the same query its tab runs, so the
   * badge costs one request on arrival and opening the tab reads the cache instead of fetching.
   */
  count?: number;
}

const VALID_TABS: TabId[] = ['properties', 'markets', 'gallery', 'photos', 'laws'];

export default function PropertyInformationPage() {
  const { t } = useTranslation('appraisal');
  const isPma = usePropertyBasePath() === 'property-pma';

  // The machinery summary is no longer a tab: it opens from a strip on the Properties tab
  // (see MachinerySummaryStrip), so it sits beside the machines it summarises.
  const appraisalId = useAppraisalId();
  const { groups } = useEnrichedPropertyGroups(appraisalId);

  const propertyCount = groups.reduce((total, g) => total + g.items.length, 0);

  // PMA shows only the Properties tab, so it asks for none of the other tabs' data.
  const countsFor = isPma ? undefined : appraisalId;
  const { data: comparables } = useGetAppraisalComparables(countsFor);
  const { data: gallery } = useGetGalleryPhotos(countsFor);
  const { data: photoTopics } = useGetPhotoTopics(countsFor);
  const { data: laws } = useGetLawAndRegulations(countsFor);
  // Photos placed into the report's topics — what the Photos tab itself reports in its header.
  // The Gallery badge counts every uploaded photo, so the two numbers say different things.
  const topicPhotoCount = photoTopics?.topics?.reduce(
    (sum, topic) => sum + (topic.photoCount ?? 0),
    0,
  );

  const TABS: Tab[] = [
    {
      id: 'properties',
      label: t('propertyInfo.tabs.properties'),
      icon: 'buildings',
      count: propertyCount,
    },
    {
      id: 'markets',
      label: t('propertyInfo.tabs.markets'),
      icon: 'magnifying-glass-chart',
      count: comparables?.length,
    },
    {
      id: 'gallery',
      label: t('propertyInfo.tabs.gallery'),
      icon: 'images',
      count: gallery?.photos?.length,
    },
    { id: 'photos', label: t('propertyInfo.tabs.photos'), icon: 'camera', count: topicPhotoCount },
    { id: 'laws', label: t('propertyInfo.tabs.laws'), icon: 'gavel', count: laws?.items?.length },
  ];
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;
  const isTabAvailable = (id: TabId | null): id is TabId =>
    !!id && VALID_TABS.includes(id) && (!isPma || id === 'properties');
  const activeTab: TabId = isTabAvailable(tabParam) ? tabParam : 'properties';

  // Seed `?tab=properties` on first arrival so the URL is the source of truth
  // (the layout breadcrumb reads `?tab=` to render the active-tab crumb).
  //
  // Both writes merge into the existing query rather than replacing it. This page is now the
  // parent of every property editor, and those editors read `?groupId=` to know which group a
  // new property joins — a bare `setSearchParams({ tab })` here would wipe it out from under
  // them the moment the form opened.
  const navigate = useNavigate();
  useEffect(() => {
    // Links from before the summary moved into the Properties tab still carry ?tab=machinery —
    // send them to the summary itself rather than dropping them on the property list.
    if (!isPma && searchParams.get('tab') === 'machinery') {
      navigate('machinery-summary', { replace: true });
      return;
    }
    if (!isTabAvailable(tabParam)) {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'properties');
          return next;
        },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam, isPma, setSearchParams]);

  // Where this page itself lives, without the editor route a form adds below it.
  const pagePath = useResolvedPath('.').pathname;

  const handleTabChange = (tabId: TabId) => {
    // A form in the split view's panel belongs to the Properties tab. Leaving that tab closes it;
    // otherwise the form, no longer in a panel, would take the whole page. Unsaved edits still
    // get the usual prompt.
    if (editor && tabId !== 'properties') {
      navigate({ pathname: pagePath, search: `?tab=${tabId}` });
      return;
    }
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.set('tab', tabId);
        return next;
      },
      { replace: true },
    );
  };

  // Persisted per browser alongside density and form layout, so the tab reopens the way the
  // user left it instead of snapping back to the default on every reload.
  const viewMode = useUIStore(s => s.propertiesViewMode);
  const setViewMode = useUIStore(s => s.setPropertiesViewMode);

  const visibleTabs = isPma ? TABS.filter(tab => tab.id === 'properties') : TABS;

  /**
   * The property editor, when one is open.
   *
   * In the split view it goes into the right panel so the list stays put; everywhere else it
   * takes the page, which is what it did before it became a child route. A form open on a tab
   * other than Properties is also given the page — the editor is what the URL asked for.
   *
   * Only property forms belong in that panel. Market comparables and laws are children of this
   * route too, but they are opened from their own tabs and never had a list beside them.
   */
  const editor = useOutlet();
  const { pathname } = useLocation();
  const isPropertyForm = !/\/(market-comparable|law-and-regulation)(\/|$)/.test(pathname);
  const editorInPanel =
    !!editor && isPropertyForm && activeTab === 'properties' && viewMode === 'split';
  if (editor && !editorInPanel) return editor;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'properties':
        return (
          <PropertiesTab
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            editorSlot={editorInPanel ? editor : undefined}
          />
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
      {/* Tab navigation — underlined rather than boxed, so the tab strip stops looking like
          another card stacked on top of the cards below it. */}
      <div className="shrink-0 pb-3">
        {/* The strip scrolls when the labels outgrow the width, but the scrollbar itself stays
            hidden: `overflow-x-auto` also turns `overflow-y` into `auto`, and macOS set to
            "always show scrollbars" then paints a track next to a row that never scrolls. */}
        <nav className="flex gap-1 border-b border-gray-200 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={clsx(
                  '-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-primary text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                <Icon
                  name={tab.icon}
                  style="solid"
                  className={clsx('size-3.5', isActive ? 'text-primary' : 'text-gray-400')}
                />
                <span>{tab.label}</span>
                {tab.count != null && tab.count > 0 && (
                  <span
                    className={clsx(
                      'rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                      isActive ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500',
                    )}
                  >
                    {tab.count}
                  </span>
                )}
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
