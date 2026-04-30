import { useEffect } from 'react';
import { useBreadcrumbExtrasStore } from '@shared/store';
import type { BreadcrumbItem } from '@shared/types';

/**
 * Append page-level dynamic crumbs to the layout-built breadcrumb. Use when the
 * URL alone doesn't carry enough info to label the leaf — e.g. an active tab
 * (from search params) or a fetched record name (e.g. a model's name).
 *
 * Items are cleared when the component unmounts.
 *
 * @example
 *   useBreadcrumbExtras(
 *     [{ label: 'Models', href: pathname + '?tab=models', icon: 'layer-group' }],
 *     [pathname, activeTab],
 *   );
 */
export function useBreadcrumbExtras(items: BreadcrumbItem[], deps: ReadonlyArray<unknown>) {
  useEffect(() => {
    useBreadcrumbExtrasStore.getState().setExtras(items);
    return () => {
      useBreadcrumbExtrasStore.getState().setExtras([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useBreadcrumbExtras;
