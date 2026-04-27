import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMenuStore } from '@features/menuManagement/store';
import { resolveLabel } from '@features/menuManagement/utils/label';
import { appraisalMenuConditions } from '@shared/config/appraisalMenuConditions';
import { isTerminalStatus } from '@shared/config/navigationTypes';
import type { NavItem, NavItemWithAccess, NavContext } from '@shared/config/navigationTypes';
import type { MenuTreeNode } from '@features/menuManagement/types';

/** Interpolate :basePath and :requestId placeholders in a path string */
function interpolatePath(path: string | null, basePath: string, requestId?: string): string {
  if (!path) return '#';
  if (!basePath) return '#';
  return path.replace(':basePath', basePath).replace(':requestId', requestId ?? '');
}

/** Recursively convert a MenuTreeNode tree into NavItem[] */
function toNavItems(nodes: MenuTreeNode[], lang: string): NavItem[] {
  return nodes.map(node => ({
    itemKey: node.itemKey,
    name: resolveLabel(node.labels, lang),
    href: node.path ?? '#',
    icon: node.iconName,
    iconStyle: node.iconStyle,
    iconColor: node.iconColor ?? undefined,
    canView: true, // backend already filtered for visibility
    canEdit: node.canEdit,
    children: node.children.length > 0 ? toNavItems(node.children, lang) : undefined,
  }));
}

/**
 * Hook that returns the Main navigation tree, resolved to the current language.
 * Reads from useMenuStore (populated by MenuInitializer after login).
 */
export function useNavigation(): NavItem[] {
  const main = useMenuStore(state => state.main);
  const { i18n } = useTranslation();
  const lang = i18n.language;

  return useMemo(() => toNavItems(main, lang), [main, lang]);
}

/**
 * Hook that returns the Appraisal navigation tree filtered by code-side conditions,
 * with :basePath/:requestId placeholders interpolated.
 *
 * Applies:
 * 1. appraisalMenuConditions[itemKey].showWhen(ctx) — hide items that don't match context
 * 2. isTerminalStatus(ctx.status) — force canEdit = false for terminal statuses
 * 3. appraisalMenuConditions[itemKey].forceReadOnly(ctx) — per-item forced read-only
 */
export function useAppraisalNavigation(
  context: NavContext & { basePath?: string; requestId?: string },
): NavItemWithAccess[] {
  const appraisal = useMenuStore(state => state.appraisal);
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const { basePath = '', requestId, isPma, isBlockCondo, status } = context;
  const terminalStatus = isTerminalStatus(status);

  return useMemo(() => {
    const processNode = (node: MenuTreeNode): NavItemWithAccess | null => {
      const condition = appraisalMenuConditions[node.itemKey];

      // Apply showWhen predicate
      if (condition?.showWhen && !condition.showWhen({ isPma, isBlockCondo, status })) {
        return null;
      }

      // Determine canEdit — terminal status or per-item forceReadOnly override backend value
      const forceRO = condition?.forceReadOnly?.({ isPma, isBlockCondo, status }) ?? false;
      const canEdit = !terminalStatus && !forceRO && node.canEdit;

      const href = interpolatePath(node.path, basePath, requestId);

      const children = node.children
        .map(processNode)
        .filter((c): c is NavItemWithAccess => c !== null);

      return {
        itemKey: node.itemKey,
        name: resolveLabel(node.labels, lang),
        href,
        icon: node.iconName,
        iconStyle: node.iconStyle,
        iconColor: node.iconColor ?? undefined,
        canView: true,
        canEdit,
        children: children.length > 0 ? children : undefined,
      };
    };

    return appraisal.map(processNode).filter((n): n is NavItemWithAccess => n !== null);
  }, [appraisal, lang, basePath, requestId, isPma, isBlockCondo, status, terminalStatus]);
}
