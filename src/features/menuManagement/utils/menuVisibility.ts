import type { MenuItemAdminDto } from '../types';

function hasCodeWithPrefix(roleCodes: Set<string>, prefix: string): boolean {
  for (const code of roleCodes) if (code.startsWith(prefix)) return true;
  return false;
}

/**
 * Ids of the menu items a holder of `roleCodes` actually sees — mirrors the backend
 * GetMyMenuQueryHandler rule:
 * - a gated item (view code or prefix) needs the permission, and hides its whole subtree
 *   when the role lacks it;
 * - an ungated item (a group) shows only when at least one child does.
 */
export function visibleMenuIds(nodes: MenuItemAdminDto[], roleCodes: Set<string>): Set<string> {
  const visible = new Set<string>();

  const walk = (items: MenuItemAdminDto[]): boolean => {
    let any = false;
    items.forEach(item => {
      const code = item.viewPermissionCode;
      const prefix = item.viewPermissionPrefix;
      const gated = !!code || !!prefix;
      if (gated) {
        const canView =
          (!!code && roleCodes.has(code)) || (!!prefix && hasCodeWithPrefix(roleCodes, prefix));
        if (!canView) return;
        visible.add(item.id);
        walk(item.children ?? []);
        any = true;
      } else if (walk(item.children ?? [])) {
        visible.add(item.id);
        any = true;
      }
    });
    return any;
  };

  walk(nodes);
  return visible;
}
