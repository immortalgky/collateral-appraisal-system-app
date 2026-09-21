import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMenuStore } from '@features/menuManagement/store';
import type { MenuTreeNode } from '@features/menuManagement/types';
import { resolveLabel } from '@features/menuManagement/utils/label';
import { useBreadcrumbExtrasStore } from '@shared/store';
import type { BreadcrumbItem } from '@shared/types';

interface AppraisalBreadcrumbOptions {
  /** `/tasks/:taskId` or `/appraisals/:appraisalId` — every page of the appraisal hangs off it. */
  basePath: string;
  /** The appraisal's number, the crumb for the appraisal itself. */
  number: string;
  /** Read-only view only: where the user came from, which the first crumb leads back to. */
  returnPath?: string;
}

interface Crumb {
  label: string;
  icon: string;
  /** URL segments the page spans, e.g. 2 for `request/:requestId`. */
  depth?: number;
}

/** Menu paths are stored relative to the appraisal, e.g. `:basePath/property`. */
const MENU_PREFIX = ':basePath/';

/** The tab each container page opens on when the URL names none. */
const DEFAULT_TAB: Record<string, string> = {
  property: 'properties',
  'property-pma': 'properties',
  'block-condo': 'project-info',
  'block-village': 'project-info',
};

/** The sidebar entry whose path matches the most leading segments of the URL. */
function matchMenu(nodes: MenuTreeNode[], rel: string[]) {
  let best: { node: MenuTreeNode; depth: number } | null = null;
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.path?.startsWith(MENU_PREFIX)) {
      const segments = node.path.slice(MENU_PREFIX.length).split('/');
      const fits =
        segments.length <= rel.length &&
        segments.every((segment, i) => segment.startsWith(':') || segment === rel[i]);
      if (fits && (best === null || segments.length > best.depth)) {
        best = { node, depth: segments.length };
      }
    }
    stack.push(...(node.children ?? []));
  }
  return best;
}

/**
 * The breadcrumb for every page of an appraisal, shared by the task and the read-only layouts.
 *
 * Each level uses the words of the thing the user clicked to get there: the page is named as the
 * sidebar menu names it (so an admin renaming a menu entry renames the crumb too), a tab as its
 * tab strip names it, and the record by the page itself through `useBreadcrumbExtras`. The two
 * layouts used to carry a copy each of an English label table, and the copies had drifted apart.
 *
 * Extras are not cleared when the path changes. React runs a page's effects before its layout's,
 * so a layout-side clear wiped out any leaf a page set on its first render — a name already in
 * the query cache arrived and vanished in the same commit. `useBreadcrumbExtras` removes a page's
 * extras when the page unmounts, which is the moment they stop being true.
 */
export function useAppraisalBreadcrumb({
  basePath,
  number,
  returnPath,
}: AppraisalBreadcrumbOptions): BreadcrumbItem[] {
  const { pathname, search } = useLocation();
  const { t, i18n } = useTranslation('appraisal');
  const { t: tBlock } = useTranslation('blockProject');
  const menu = useMenuStore(s => s.appraisal);
  const extras = useBreadcrumbExtrasStore(s => s.extras);
  const lang = i18n.resolvedLanguage ?? i18n.language;

  const items = useMemo(() => {
    // Used when the sidebar does not list a page: hidden for this activity, or never a menu entry.
    const pages: Record<string, Crumb> = {
      request: { label: t('breadcrumb.pages.request'), icon: 'square-info', depth: 2 },
      administration: { label: t('breadcrumb.pages.administration'), icon: 'user-tie' },
      appointment: { label: t('breadcrumb.pages.appointment'), icon: 'calendar-check' },
      'fee-appointment-approval': {
        label: t('breadcrumb.pages.feeAppointmentApproval'),
        icon: 'check-to-slot',
      },
      quotation: { label: t('breadcrumb.pages.quotation'), icon: 'paper-plane', depth: 2 },
      property: { label: t('breadcrumb.pages.property'), icon: 'buildings' },
      'property-pma': { label: t('breadcrumb.pages.propertyPma'), icon: 'buildings' },
      'block-condo': { label: t('breadcrumb.pages.blockCondo'), icon: 'buildings' },
      'block-village': { label: t('breadcrumb.pages.blockVillage'), icon: 'buildings' },
      documents: { label: t('breadcrumb.pages.documents'), icon: 'file-circle-check' },
      'provide-documents': {
        label: t('breadcrumb.pages.provideDocuments'),
        icon: 'file-circle-plus',
      },
      summary: { label: t('breadcrumb.pages.summary'), icon: 'paper-plane' },
      'activity-tracking': {
        label: t('breadcrumb.pages.activityTracking'),
        icon: 'diagram-project',
      },
      '360': { label: t('breadcrumb.pages.summary360'), icon: 'compass' },
    };

    const propertyTabs: Record<string, Crumb> = {
      properties: { label: t('propertyInfo.tabs.properties'), icon: 'buildings' },
      markets: { label: t('propertyInfo.tabs.markets'), icon: 'magnifying-glass-chart' },
      gallery: { label: t('propertyInfo.tabs.gallery'), icon: 'images' },
      photos: { label: t('propertyInfo.tabs.photos'), icon: 'camera' },
      laws: { label: t('propertyInfo.tabs.laws'), icon: 'gavel' },
    };
    const blockTabs: Record<string, Crumb> = {
      'project-info': { label: tBlock('page.tabs.projectInfo'), icon: 'building-columns' },
      'unit-listing': { label: tBlock('page.tabs.unitListing'), icon: 'table-list' },
      towers: { label: tBlock('page.tabs.towers'), icon: 'building' },
      'project-land': { label: tBlock('page.tabs.projectLand'), icon: 'map' },
      models: { label: tBlock('page.tabs.models'), icon: 'layer-group' },
      'unit-price': { label: tBlock('page.tabs.unitPrice'), icon: 'tags' },
      markets: { label: tBlock('page.tabs.markets'), icon: 'magnifying-glass-chart' },
      gallery: { label: tBlock('page.tabs.gallery'), icon: 'images' },
      photos: { label: tBlock('page.tabs.photos'), icon: 'camera' },
      laws: { label: tBlock('page.tabs.laws'), icon: 'gavel' },
    };
    const tabsByContainer: Record<string, Record<string, Crumb>> = {
      property: propertyTabs,
      'property-pma': propertyTabs,
      'block-condo': blockTabs,
      'block-village': blockTabs,
    };

    // The property forms; the page swaps its own name in for this once the property is known.
    const propertyForms: Record<string, string> = {
      land: t('breadcrumb.types.land'),
      building: t('breadcrumb.types.building'),
      condo: t('breadcrumb.types.condo'),
      'land-building': t('breadcrumb.types.landBuilding'),
      machinery: t('breadcrumb.types.machinery'),
      'lease-land': t('breadcrumb.types.leaseLand'),
      'lease-building': t('breadcrumb.types.leaseBuilding'),
      'lease-land-building': t('breadcrumb.types.leaseLandBuilding'),
      'lease-condo': t('breadcrumb.types.leaseCondo'),
    };

    const firstCrumb: BreadcrumbItem = returnPath
      ? {
          label: returnPath.startsWith('/appraisals/list')
            ? t('breadcrumb.appraisalList')
            : t('breadcrumb.appraisalSearch'),
          href: returnPath,
          icon: 'magnifying-glass',
        }
      : { label: t('breadcrumb.tasks'), href: '/tasks', icon: 'list-check' };
    const result: BreadcrumbItem[] = [
      firstCrumb,
      { label: number, href: basePath, icon: 'file-certificate' },
    ];

    if (!pathname.startsWith(basePath)) return result;
    const rel = pathname.slice(basePath.length).split('/').filter(Boolean);
    if (rel.length === 0) return result;

    // A group's pricing analysis lives under /groups but is reached from the Properties tab.
    const isGroupPricing = rel[0] === 'groups' && rel[2] === 'pricing-analysis';
    const pageRel = isGroupPricing ? ['property'] : rel;
    const hit = matchMenu(menu, pageRel);
    const fallback = pages[pageRel[0]];
    if (!hit && !fallback) return result;
    const depth = hit?.depth ?? fallback?.depth ?? 1;
    result.push({
      label: (hit && resolveLabel(hit.node.labels, lang)) || fallback?.label || pageRel[0],
      href: `${basePath}/${pageRel.slice(0, depth).join('/')}`,
      icon: hit?.node.iconName || fallback?.icon,
    });

    const container = pageRel[0];
    const tabs = tabsByContainer[container];
    if (!tabs) return result;
    const pushTab = (id: string) => {
      const tab = tabs[id];
      if (tab) result.push({ ...tab, href: `${basePath}/${container}?tab=${id}` });
    };
    const pushLeaf = (label: string, icon?: string) => result.push({ label, href: pathname, icon });
    const newOf = (what: string) => t('breadcrumb.new', { what });

    if (isGroupPricing) {
      pushTab('properties');
      pushLeaf(t('breadcrumb.pricingAnalysis'), 'chart-mixed');
      return result;
    }
    if (rel.length === 1) {
      pushTab(new URLSearchParams(search).get('tab') ?? DEFAULT_TAB[container]);
      return result;
    }

    const sub = rel[1];
    const isNew = rel[2] === 'new';
    if (propertyForms[sub]) {
      pushTab('properties');
      pushLeaf(isNew ? newOf(propertyForms[sub]) : propertyForms[sub]);
    } else if (sub === 'machinery-summary') {
      pushTab('properties');
      pushLeaf(t('properties.machinerySummary.title'), 'gears');
    } else if (sub === 'market-comparable') {
      pushTab('markets');
      if (isNew) pushLeaf(newOf(t('breadcrumb.things.comparable')));
    } else if (sub === 'law-and-regulation') {
      pushTab('laws');
      if (isNew) pushLeaf(newOf(t('breadcrumb.things.law')));
    } else if (sub === 'tower') {
      pushTab('towers');
      if (isNew) pushLeaf(newOf(t('breadcrumb.things.tower')));
    } else if (sub === 'model') {
      pushTab('models');
      if (isNew) pushLeaf(newOf(t('breadcrumb.things.model')));
      else if (rel[3] === 'pricing-analysis')
        pushLeaf(t('breadcrumb.pricingAnalysis'), 'chart-mixed');
    }
    return result;
  }, [pathname, search, basePath, number, returnPath, menu, lang, t, tBlock]);

  return useMemo(() => {
    const layoutItems = extras[0]?.replacesLast ? items.slice(0, -1) : items;
    const merged = [...layoutItems, ...extras];
    return merged.filter((item, i) => i === 0 || item.label !== merged[i - 1].label);
  }, [items, extras]);
}
