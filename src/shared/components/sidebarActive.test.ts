import { describe, expect, it } from 'vitest';
import type { NavItem } from '@shared/config/navigationTypes';
import { buildQualifiedHrefs, isDescendantActive, isHrefActive } from './sidebarActive';

const nav = (itemKey: string, href: string, children?: NavItem[]) =>
  ({ itemKey, href, children, name: itemKey, canView: true }) as unknown as NavItem;

describe('isDescendantActive', () => {
  // Users & Access -> User Management (path-less, href '#') -> Menus
  const accessChildren = [
    nav('main.user-management', '#', [nav('main.user-management.menus', '/admin/menus')]),
    nav('main.oauth', '#', [nav('main.oauth.clients', '/admin/oauth-clients')]),
  ];

  it('finds the current page two levels down, under a path-less sub-group', () => {
    expect(isDescendantActive(accessChildren, '/admin/menus', '', new Map())).toBe(true);
    expect(isDescendantActive(accessChildren, '/admin/oauth-clients', '', new Map())).toBe(true);
  });

  it('is false for a page outside the group', () => {
    expect(isDescendantActive(accessChildren, '/admin/logs', '', new Map())).toBe(false);
  });
});

describe('isHrefActive', () => {
  const items = [nav('all', '/tasks'), nav('pma', '/tasks?activityId=int-pma-input')];
  const qualified = buildQualifiedHrefs(items);

  it('lets the item whose params match win over the bare item at the same path', () => {
    expect(
      isHrefActive(
        '/tasks?activityId=int-pma-input',
        '/tasks',
        '?activityId=int-pma-input',
        qualified,
      ),
    ).toBe(true);
    expect(isHrefActive('/tasks', '/tasks', '?activityId=int-pma-input', qualified)).toBe(false);
  });

  it('keeps the bare item lit when no sibling claims the params', () => {
    expect(isHrefActive('/tasks', '/tasks', '', qualified)).toBe(true);
    expect(isHrefActive('/tasks', '/tasks', '?activityId=', qualified)).toBe(true);
  });

  it('ignores params the item does not declare', () => {
    expect(isHrefActive('/appraisals/search', '/appraisals/search', '?q=abc', new Map())).toBe(
      true,
    );
  });
});
