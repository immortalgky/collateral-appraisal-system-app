import { describe, expect, it } from 'vitest';
import type { MenuItemAdminDto } from '../types';
import { visibleMenuIds } from './menuVisibility';

const item = (
  id: string,
  viewPermissionCode: string | null,
  children: MenuItemAdminDto[] = [],
  viewPermissionPrefix: string | null = null,
) => ({ id, viewPermissionCode, viewPermissionPrefix, children }) as unknown as MenuItemAdminDto;

describe('visibleMenuIds', () => {
  it('shows an ungated group only when a child is visible', () => {
    const tree = [item('group', null, [item('a', 'A'), item('b', 'B')])];
    expect([...visibleMenuIds(tree, new Set(['B']))].sort()).toEqual(['b', 'group']);
    expect(visibleMenuIds(tree, new Set(['OTHER'])).size).toBe(0);
  });

  it('keeps a gated parent hiding its whole subtree', () => {
    const tree = [item('group', 'GROUP', [item('a', 'A')])];
    expect(visibleMenuIds(tree, new Set(['A'])).size).toBe(0);
  });

  it('matches a prefix gate and never shows an ungated leaf', () => {
    const tree = [item('wf', null, [], 'WORKFLOW_'), item('leaf', null)];
    expect([...visibleMenuIds(tree, new Set(['WORKFLOW_ADMIN']))]).toEqual(['wf']);
  });
});
