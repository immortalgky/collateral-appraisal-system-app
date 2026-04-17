import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listMenus } from '../api/menus';
import type { MenuItemAdminDto, MenuScope } from '../types';

const MENU_KEYS = {
  all: ['menus'] as const,
  list: (scope: MenuScope) => ['menus', 'list', scope] as const,
  detail: (id: string) => ['menus', 'detail', id] as const,
};

export { MENU_KEYS };

export function useMenuList(scope: MenuScope) {
  return useQuery<MenuItemAdminDto[]>({
    queryKey: MENU_KEYS.list(scope),
    queryFn: () => listMenus(scope),
  });
}

export function useMenuListQueryClient() {
  return useQueryClient();
}
