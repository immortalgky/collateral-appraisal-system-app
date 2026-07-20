import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMenuStore } from '@features/menuManagement/store';
import { resolveLabel } from '@features/menuManagement/utils/label';
import type { MenuTreeNode } from '@features/menuManagement/types';

function findLabel(nodes: MenuTreeNode[], path: string, lang: string): string | undefined {
  for (const node of nodes) {
    if (node.path === path) return resolveLabel(node.labels, lang);
    if (node.children?.length) {
      const found = findLabel(node.children, path, lang);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * The locale-resolved menu label for a given route path, or undefined when the path isn't in the
 * user's menu (not permitted / menu not loaded). Lets a page reuse its sidebar/breadcrumb name as
 * the page title so all three stay identical and switch together on the language toggle.
 */
export function useMenuLabel(path: string): string | undefined {
  const main = useMenuStore(state => state.main);
  const appraisal = useMenuStore(state => state.appraisal);
  const { i18n } = useTranslation();
  const lang = i18n.language;

  return useMemo(
    () => findLabel(main, path, lang) ?? findLabel(appraisal, path, lang),
    [main, appraisal, path, lang],
  );
}
