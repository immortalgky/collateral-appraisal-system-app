import type { NavItem } from '@shared/config/navigationTypes';

/**
 * Query strings declared by menu items, grouped by path:
 * `/tasks -> ['activityId=admin-finalize', 'activityId=int-pma-input', ...]`.
 *
 * Only items that declare params are collected — they are the ones that can out-rank a bare item
 * at the same path. Derived from the tree, never hard-coded: menu rows live in auth.MenuItems and
 * are editable in /admin/menus, so this has to hold for whatever an admin adds.
 */
export function buildQualifiedHrefs(
  items: NavItem[],
  map: Map<string, string[]> = new Map(),
): Map<string, string[]> {
  for (const item of items) {
    const [path, search] = item.href.split('?');
    if (search) map.set(path, [...(map.get(path) ?? []), search]);
    if (item.children?.length) buildQualifiedHrefs(item.children, map);
  }
  return map;
}

/** Does the current URL carry every param of `search`, with the same values? */
function paramsMatch(search: string, current: URLSearchParams): boolean {
  for (const [key, value] of new URLSearchParams(search)) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

/**
 * Is `href` the menu entry for where the user currently is? Most specific wins.
 *
 * Every param the item declares must be present and equal; params it does NOT declare are ignored.
 * This used to compare the whole query string, so an item went dark the moment its own page put
 * anything in the URL — /appraisals/search unhighlighted itself as soon as the user typed a search
 * term or picked a filter, taking the parent group with it.
 *
 * A bare item (no params) then yields to any item at the same path whose params DO match. That is
 * what keeps "All tasks" (/tasks) dark on /tasks?activityId=X while the item owning that URL lights
 * up, without a notion of which keys are "identifying" — which would have been guesswork, since a
 * bare item would go dark for a key some unrelated sibling happened to declare.
 *
 * Falling back to the bare item rather than to nothing also matches the router: TaskPageDispatcher
 * (router.tsx) treats an empty activityId as falsy and renders All tasks, so /tasks?activityId=
 * now highlights All tasks instead of leaving the whole sidebar dark.
 *
 * A plain function, not a hook: isDescendantActive evaluates it for every item in a subtree.
 */
export function isHrefActive(
  href: string,
  pathname: string,
  search: string,
  qualified: Map<string, string[]>,
): boolean {
  const [path, hrefSearch = ''] = href.split('?');
  if (pathname !== path) return false;

  const current = new URLSearchParams(search);
  if (hrefSearch) return paramsMatch(hrefSearch, current);
  return !(qualified.get(path) ?? []).some(q => paramsMatch(q, current));
}

/**
 * Is any item below `items`, at any depth, the current page? A path-less sub-group (href '#') never
 * matches itself, so its own children must be searched too.
 */
export function isDescendantActive(
  items: NavItem[] | undefined,
  pathname: string,
  search: string,
  qualified: Map<string, string[]>,
): boolean {
  return !!items?.some(
    child =>
      isHrefActive(child.href, pathname, search, qualified) ||
      isDescendantActive(child.children, pathname, search, qualified),
  );
}
